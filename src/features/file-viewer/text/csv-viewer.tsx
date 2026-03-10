'use client';

import { useMemo, useState } from 'react';
import { FileItem } from '@/src/lib/types';
import { ViewerToolbar } from '../viewer-toolbar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table2 } from 'lucide-react';

interface CsvViewerProps {
  file: FileItem;
  textContent: string;
  onDownload?: () => void;
}

function parseCsv(content: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      row.push(current);
      current = '';
      continue;
    }

    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && next === '\n') i++;
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

export function CsvViewer({ file, textContent, onDownload }: CsvViewerProps) {
  const [mode, setMode] = useState<'table' | 'raw'>('table');
  const [delimiter, setDelimiter] = useState(',' as ',' | ';' | '\t');
  const [hasHeader, setHasHeader] = useState(true);

  const rows = useMemo(() => parseCsv(textContent, delimiter), [textContent, delimiter]);
  const header = hasHeader ? rows[0] ?? [] : [];
  const dataRows = hasHeader ? rows.slice(1) : rows;

  return (
    <div className="h-full flex flex-col bg-card">
      <ViewerToolbar
        file={file}
        badge="CSV"
        icon={<Table2 className="h-4 w-4 text-emerald-500" />}
        onDownload={onDownload}
      >
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant={mode === 'table' ? 'secondary' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setMode('table')}>Table</Button>
          <Button type="button" size="sm" variant={mode === 'raw' ? 'secondary' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setMode('raw')}>Raw</Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setHasHeader((value) => !value)}>
            Header: {hasHeader ? 'On' : 'Off'}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDelimiter((d) => (d === ',' ? ';' : d === ';' ? '\t' : ','))}>
            Delim: {delimiter === '\t' ? 'Tab' : delimiter}
          </Button>
        </div>
      </ViewerToolbar>

      <ScrollArea className="flex-1 bg-muted/20">
        {mode === 'raw' ? (
          <div className="p-6">
            <pre className="font-mono text-sm whitespace-pre-wrap wrap-break-word">{textContent}</pre>
          </div>
        ) : (
          <div className="p-4 min-w-max">
            <table className="w-full text-sm border-collapse bg-background rounded-lg overflow-hidden">
              {hasHeader && header.length > 0 ? (
                <thead>
                  <tr className="bg-muted/60">
                    {header.map((value, index) => (
                      <th key={index} className="px-3 py-2 border border-border text-left font-medium">{value}</th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {dataRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((value, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-2 border border-border/70 align-top">{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
