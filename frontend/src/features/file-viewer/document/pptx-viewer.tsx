'use client';

/**
 * PptxViewer – Interactive slide viewer for PPTX / PPT files.
 *
 * Parses the PPTX binary (a ZIP archive containing XML) client-side using
 * JSZip and the browser's built-in DOMParser to extract slide content
 * (title, body text, and embedded images).  Navigation controls let the
 * user move through the slide deck.
 *
 * When a publicUrl is provided the Microsoft Office Online viewer is used
 * as a richer embedded fallback.
 */

import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { FileItem } from '@/src/lib/types';
import { ViewerToolbar } from '../viewer-toolbar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Presentation,
  Loader2,
  AlertCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Maximize2,
} from 'lucide-react';

interface PptxViewerProps {
  file: FileItem;
  /** Object-URL of the PPTX binary */
  src?: string;
  /** Public HTTPS URL – used for the Office Online embed when available */
  publicUrl?: string;
  onDownload?: () => void;
}

interface Slide {
  index: number;
  title: string;
  bullets: string[];
  notes: string;
  imageDataUrls: string[];
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; slides: Slide[] }
  | { status: 'error'; message: string };

// ── XML helpers ────────────────────────────────────────────────────────────
function extractTexts(xmlDoc: Document, tagLocalName: string): string[] {
  const texts: string[] = [];
  const nodes = xmlDoc.getElementsByTagNameNS('*', tagLocalName);
  for (let i = 0; i < nodes.length; i++) {
    const text = nodes[i].textContent?.trim();
    if (text) texts.push(text);
  }
  return texts;
}

function extractSlideTitle(xmlDoc: Document): string {
  // Title placeholder types: 'ctrTitle', 'title'
  const sps = xmlDoc.getElementsByTagNameNS('*', 'sp');
  for (let i = 0; i < sps.length; i++) {
    const sp = sps[i];
    const ph = sp.getElementsByTagNameNS('*', 'ph')[0];
    if (!ph) continue;
    const type = ph.getAttribute('type');
    if (type === 'title' || type === 'ctrTitle') {
      const txBody = sp.getElementsByTagNameNS('*', 'txBody')[0];
      if (txBody) {
        const text = Array.from(txBody.getElementsByTagNameNS('*', 't'))
          .map((n) => n.textContent?.trim())
          .filter(Boolean)
          .join(' ');
        if (text) return text;
      }
    }
  }
  return '';
}

function extractSlideBullets(xmlDoc: Document, title: string): string[] {
  const bullets: string[] = [];
  const sps = xmlDoc.getElementsByTagNameNS('*', 'sp');

  for (let i = 0; i < sps.length; i++) {
    const sp = sps[i];
    const ph = sp.getElementsByTagNameNS('*', 'ph')[0];
    // Skip title placeholder – already extracted
    if (ph) {
      const type = ph.getAttribute('type');
      if (type === 'title' || type === 'ctrTitle') continue;
    }

    const txBody = sp.getElementsByTagNameNS('*', 'txBody')[0];
    if (!txBody) continue;

    const paras = txBody.getElementsByTagNameNS('*', 'p');
    for (let j = 0; j < paras.length; j++) {
      const paraText = Array.from(paras[j].getElementsByTagNameNS('*', 't'))
        .map((n) => n.textContent?.trim())
        .filter(Boolean)
        .join(' ');
      if (paraText && paraText !== title) bullets.push(paraText);
    }
  }

  return bullets;
}

async function extractSlideImages(zip: JSZip, slideXmlPath: string): Promise<string[]> {
  // Find relationships file for this slide
  const slideName = slideXmlPath.split('/').pop() ?? '';
  const relsPath = slideXmlPath.replace(/\/([^/]+)$/, '/_rels/$1.rels');
  const relsFile = zip.file(relsPath);
  if (!relsFile) return [];

  const relsXml = await relsFile.async('text');
  const parser = new DOMParser();
  const relsDoc = parser.parseFromString(relsXml, 'application/xml');
  const relationships = relsDoc.getElementsByTagName('Relationship');
  const imageDataUrls: string[] = [];

  for (let i = 0; i < relationships.length; i++) {
    const rel = relationships[i];
    const type = rel.getAttribute('Type') ?? '';
    const target = rel.getAttribute('Target') ?? '';

    if (!type.includes('/image')) continue;

    // Resolve relative path from slide folder
    const slideDir = slideXmlPath.substring(0, slideXmlPath.lastIndexOf('/'));
    const imagePath = target.startsWith('/')
      ? target.slice(1)
      : `${slideDir}/${target}`.replace(/\/\.\//g, '/');

    const imageFile = zip.file(imagePath);
    if (!imageFile) continue;

    try {
      const imageBytes = await imageFile.async('base64');
      const ext = imagePath.split('.').pop()?.toLowerCase() ?? 'png';
      const mimeMap: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        bmp: 'image/bmp',
        emf: 'image/x-emf',
        wmf: 'image/x-wmf',
      };
      const mime = mimeMap[ext] ?? 'image/png';
      imageDataUrls.push(`data:${mime};base64,${imageBytes}`);
    } catch {
      // Skip unreadable images
    }
  }

  return imageDataUrls;
}

async function parsePptx(arrayBuffer: ArrayBuffer): Promise<Slide[]> {
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Collect all slide XML paths in order
  const slideEntries = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/(\d+)/)?.[1] ?? '0', 10);
      const numB = parseInt(b.match(/(\d+)/)?.[1] ?? '0', 10);
      return numA - numB;
    });

  const parser = new DOMParser();
  const slides: Slide[] = [];

  for (let i = 0; i < slideEntries.length; i++) {
    const path = slideEntries[i];
    const xmlText = await zip.files[path].async('text');
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    const title = extractSlideTitle(xmlDoc);
    const bullets = extractSlideBullets(xmlDoc, title);
    const imageDataUrls = await extractSlideImages(zip, path);

    // Speaker notes: PPTX stores notes in ppt/notesSlides/notesSlide{N}.xml
    // The slide number is the same numeric index as the slide file.
    const slideNum = path.match(/(\d+)\.xml$/)?.[1] ?? String(i + 1);
    const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`;
    let notes = '';
    const notesFile = zip.file(notesPath);
    if (notesFile) {
      const notesXml = await notesFile.async('text');
      const notesDoc = parser.parseFromString(notesXml, 'application/xml');
      const noteTexts = extractTexts(notesDoc, 't');
      notes = noteTexts.join(' ').trim();
    }

    slides.push({ index: i, title, bullets, notes, imageDataUrls });
  }

  return slides;
}

// ── Slide card ─────────────────────────────────────────────────────────────
function SlideCard({ slide, total }: { slide: Slide; total: number }) {
  const isEmpty = !slide.title && slide.bullets.length === 0 && slide.imageDataUrls.length === 0;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-border/20 overflow-hidden">
      {/* Slide number badge */}
      <div className="flex items-center justify-between px-4 py-2 bg-orange-500/5 border-b border-border/20 shrink-0">
        <span className="text-xs font-medium text-orange-500">
          Slide {slide.index + 1} of {total}
        </span>
      </div>

      {/* Slide content */}
      <div className="flex-1 overflow-auto p-8 space-y-4">
        {slide.title && (
          <h2 className="text-2xl font-bold leading-tight text-foreground">{slide.title}</h2>
        )}

        {slide.imageDataUrls.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {slide.imageDataUrls.slice(0, 4).map((url, idx) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={idx}
                src={url}
                alt={`Slide ${slide.index + 1} image ${idx + 1}`}
                className="max-h-48 rounded-md border border-border/30 object-contain bg-muted/20"
              />
            ))}
          </div>
        )}

        {slide.bullets.length > 0 && (
          <ul className="space-y-2 text-sm leading-relaxed">
            {slide.bullets.map((bullet, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}

        {isEmpty && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Empty slide
          </div>
        )}
      </div>

      {/* Speaker notes */}
      {slide.notes && (
        <div className="px-4 py-3 bg-muted/30 border-t border-border/20 shrink-0">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Speaker Notes</p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{slide.notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Thumbnail strip ────────────────────────────────────────────────────────
function ThumbnailStrip({
  slides,
  active,
  onSelect,
}: {
  slides: Slide[];
  active: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 overflow-y-auto p-2 w-36 shrink-0 border-r border-border/50 bg-muted/10">
      {slides.map((slide) => (
        <button
          key={slide.index}
          type="button"
          onClick={() => onSelect(slide.index)}
          className={`relative rounded border p-2 text-left transition-all ${
            slide.index === active
              ? 'border-orange-500/60 bg-orange-500/10 ring-1 ring-orange-500/30'
              : 'border-border/50 hover:bg-muted/40'
          }`}
        >
          <span className="text-[10px] font-medium text-muted-foreground block mb-1">
            {slide.index + 1}
          </span>
          {slide.title && (
            <span className="text-[10px] leading-tight line-clamp-2 text-foreground/80 block">
              {slide.title}
            </span>
          )}
          {!slide.title && slide.bullets[0] && (
            <span className="text-[10px] leading-tight line-clamp-2 text-muted-foreground block">
              {slide.bullets[0]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function PptxViewer({ file, src, publicUrl, onDownload }: PptxViewerProps) {
  const [loadedState, setLoadedState] = useState<
    | { status: 'ready'; forSrc: string; slides: Slide[] }
    | { status: 'error'; forSrc: string; message: string }
    | null
  >(null);
  const [slideSelection, setSlideSelection] = useState<{ forSrc: string | undefined; index: number }>({
    forSrc: src,
    index: 0,
  });
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [useOfficeOnline, setUseOfficeOnline] = useState(!!publicUrl);

  const label = file.originalName.toLowerCase().endsWith('.pptx') ? 'PPTX' : 'PPT';

  useEffect(() => {
    if (!src) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();

        if (cancelled) return;

        const slides = await parsePptx(arrayBuffer);

        if (cancelled) return;

        setLoadedState({ status: 'ready', forSrc: src, slides });
      } catch (err) {
        if (!cancelled) {
          setLoadedState({
            status: 'error',
            forSrc: src,
            message: err instanceof Error ? err.message : 'Failed to parse presentation',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  const state: State = !src
    ? { status: 'idle' }
    : loadedState && loadedState.forSrc === src
      ? loadedState
      : { status: 'loading' };

  const currentSlide = slideSelection.forSrc === src ? slideSelection.index : 0;
  const setCurrentSlide = (updater: number | ((prev: number) => number)) => {
    setSlideSelection((prev) => {
      const base = prev.forSrc === src ? prev.index : 0;
      const next = typeof updater === 'function' ? updater(base) : updater;
      return { forSrc: src, index: next };
    });
  };

  const slides = state.status === 'ready' ? state.slides : [];
  const total = slides.length;
  const canPrev = currentSlide > 0;
  const canNext = currentSlide < total - 1;

  const goPrev = () => setCurrentSlide((s) => Math.max(0, s - 1));
  const goNext = () => setCurrentSlide((s) => Math.min(total - 1, s + 1));

  return (
    <div className="h-full flex flex-col bg-card">
      <ViewerToolbar
        file={file}
        badge={label}
        icon={<Presentation className="h-4 w-4 text-orange-500" />}
        onDownload={onDownload}
      >
        <TooltipProvider>
          {state.status === 'ready' && (
            <>
              {/* Slide navigation */}
              <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/50 gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev} disabled={!canPrev}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous slide</TooltipContent>
                </Tooltip>

                <span className="text-xs font-medium px-2 text-muted-foreground select-none w-16 text-center">
                  {currentSlide + 1} / {total}
                </span>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext} disabled={!canNext}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next slide</TooltipContent>
                </Tooltip>
              </div>

              {/* Thumbnail toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showThumbnails ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowThumbnails((t) => !t)}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Slide panel</TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Office Online toggle (when publicUrl available) */}
          {publicUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={useOfficeOnline ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setUseOfficeOnline((v) => !v)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{useOfficeOnline ? 'Switch to extracted view' : 'Switch to Office Online'}</TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </ViewerToolbar>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex">
        {/* Thumbnail panel */}
        {state.status === 'ready' && showThumbnails && (
          <ThumbnailStrip
            slides={slides}
            active={currentSlide}
            onSelect={setCurrentSlide}
          />
        )}

        {/* Main content area */}
        <div className="flex-1 overflow-hidden relative">
          {(state.status === 'idle' || state.status === 'loading') && (
            <div className="h-full flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Parsing presentation…</span>
            </div>
          )}

          {state.status === 'error' && (
            <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="bg-destructive/10 p-4 rounded-full border border-destructive/20">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">Failed to parse presentation</p>
                <p className="text-sm text-muted-foreground">{state.message}</p>
              </div>
              <Button variant="outline" className="gap-2" onClick={onDownload}>
                <Download className="h-4 w-4" />
                Download instead
              </Button>
            </div>
          )}

          {state.status === 'ready' && useOfficeOnline && publicUrl && (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}`}
              title={file.originalName}
              aria-label={`Office presentation viewer: ${file.originalName}`}
              className="w-full h-full border-0"
            />
          )}

          {state.status === 'ready' && (!useOfficeOnline || !publicUrl) && (
            <div className="h-full flex flex-col bg-muted/10 overflow-hidden">
              <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
                <div className="w-full max-w-2xl" style={{ aspectRatio: '16/9', minHeight: '400px' }}>
                  <SlideCard slide={slides[currentSlide]} total={total} />
                </div>
              </div>

              {/* Bottom navigation */}
              <div className="shrink-0 flex items-center justify-center gap-3 py-3 border-t border-border/50 bg-background/60">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev} disabled={!canPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Dot indicators for small decks */}
                {total <= 20 && (
                  <div className="flex gap-1.5">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentSlide(i)}
                        className={`rounded-full transition-all ${
                          i === currentSlide ? 'h-2 w-6 bg-orange-500' : 'h-2 w-2 bg-border hover:bg-muted-foreground'
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                )}

                {total > 20 && (
                  <span className="text-xs text-muted-foreground">
                    {currentSlide + 1} / {total}
                  </span>
                )}

                <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext} disabled={!canNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
