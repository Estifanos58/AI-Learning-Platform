'use client';

/**
 * SpreadsheetViewer – Interactive viewer for XLSX / XLS files.
 *
 * Uses read-excel-file to parse the workbook client-side and renders
 * the data as a sortable, scrollable table with sheet switching.
 */

import { useEffect, useState } from 'react';
import readXlsxFile, { readSheetNames } from 'read-excel-file/browser';
import { FileItem } from '@/src/lib/types';
import { ViewerToolbar } from '../viewer-toolbar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Loader2, AlertCircle, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface SpreadsheetViewerProps {
  file: FileItem;
  /** Object-URL of the XLSX binary */
  src?: string;
  onDownload?: () => void;
}

type CellValue = string | number | boolean | Date | null;

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; sheets: string[]; rows: CellValue[][] }
  | { status: 'error'; message: string };

function formatCell(value: CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

export function SpreadsheetViewer({ file, src, onDownload }: SpreadsheetViewerProps) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [activeSheet, setActiveSheet] = useState(0);

  // Re-load rows when the active sheet changes
  useEffect(() => {
    if (!src) {
      setState({ status: 'idle' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      try {
        const response = await fetch(src);
        const blob = await response.blob();

        if (cancelled) return;

        const sheetNames = await readSheetNames(blob);
        const sheetName = sheetNames[activeSheet] ?? sheetNames[0];
        const rows = await readXlsxFile(blob, { sheet: sheetName });

        if (cancelled) return;

        setState({ status: 'ready', sheets: sheetNames, rows: rows as CellValue[][] });
      } catch (err) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to read spreadsheet',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src, activeSheet]);

  const label = file.originalName.toLowerCase().endsWith('.xlsx') ? 'XLSX' : 'XLS';

  const header = state.status === 'ready' ? state.rows[0] ?? [] : [];
  const dataRows = state.status === 'ready' ? state.rows.slice(1) : [];
  const sheets = state.status === 'ready' ? state.sheets : [];

  return (
    <div className="h-full flex flex-col bg-card">
      <ViewerToolbar
        file={file}
        badge={label}
        icon={<FileSpreadsheet className="h-4 w-4 text-green-500" />}
        onDownload={onDownload}
      >
        {/* Sheet navigation */}
        {sheets.length > 1 && (
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border border-border/50">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={activeSheet === 0}
              onClick={() => setActiveSheet((s) => s - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium px-1 text-muted-foreground select-none min-w-[80px] text-center truncate max-w-[120px]">
              {sheets[activeSheet]}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={activeSheet >= sheets.length - 1}
              onClick={() => setActiveSheet((s) => s + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </ViewerToolbar>

      {/* Sheet tabs for quick navigation */}
      {state.status === 'ready' && sheets.length > 1 && (
        <div className="flex gap-1 px-4 py-2 border-b border-border/50 bg-background/60 overflow-x-auto shrink-0">
          {sheets.map((name, index) => (
            <button
              key={name}
              type="button"
              onClick={() => setActiveSheet(index)}
              className={`shrink-0 text-xs px-3 py-1 rounded border transition-colors ${
                index === activeSheet
                  ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 font-medium'
                  : 'border-border/50 text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {(state.status === 'idle' || state.status === 'loading') && (
          <div className="h-full flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Reading spreadsheet…</span>
          </div>
        )}

        {state.status === 'error' && (
          <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="bg-destructive/10 p-4 rounded-full border border-destructive/20">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Failed to read spreadsheet</p>
              <p className="text-sm text-muted-foreground">{state.message}</p>
            </div>
            <Button variant="outline" className="gap-2" onClick={onDownload}>
              <Download className="h-4 w-4" />
              Download instead
            </Button>
          </div>
        )}

        {state.status === 'ready' && (
          <ScrollArea className="h-full">
            <div className="p-4 min-w-max">
              {dataRows.length === 0 && header.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                  This sheet is empty
                </div>
              ) : (
                <table className="text-sm border-collapse bg-background rounded-lg overflow-hidden">
                  {header.length > 0 && (
                    <thead>
                      <tr className="bg-muted/60">
                        <th className="px-3 py-2 border border-border text-left font-medium text-muted-foreground w-10 select-none">#</th>
                        {header.map((cell, colIndex) => (
                          <th key={colIndex} className="px-3 py-2 border border-border text-left font-semibold min-w-[100px]">
                            {formatCell(cell)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {dataRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-1.5 border border-border/70 text-muted-foreground text-xs select-none text-right">
                          {rowIndex + 1}
                        </td>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-3 py-1.5 border border-border/70 align-top whitespace-nowrap">
                            {cell instanceof Date ? (
                              <span className="text-blue-500">{formatCell(cell)}</span>
                            ) : typeof cell === 'number' ? (
                              <span className="font-mono text-right block">{formatCell(cell)}</span>
                            ) : typeof cell === 'boolean' ? (
                              <span className={cell ? 'text-green-500' : 'text-muted-foreground'}>{cell ? 'TRUE' : 'FALSE'}</span>
                            ) : (
                              formatCell(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border/50 bg-background/60">
              {dataRows.length} rows · {header.length} columns
              {sheets.length > 1 && ` · Sheet ${activeSheet + 1} of ${sheets.length}`}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
