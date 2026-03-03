'use client';

import { FileItem } from '@/src/lib/types';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Share2, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  MoreHorizontal,
  FileText,
  Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PdfToolbarProps {
  file: FileItem;
}

export function PdfToolbar({ file }: PdfToolbarProps) {
  return (
    <div className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 gap-4 sticky top-0 z-10 transition-all">
      {/* File Info */}
      <div className="min-w-0 flex items-center gap-3 flex-1">
        <div className="bg-red-500/10 p-1.5 rounded-lg border border-red-500/20">
            <FileText className="h-4 w-4 text-red-500" />
        </div>
        <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-semibold truncate leading-none mb-1">{file.originalName}</h2>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="font-medium">PDF</span>
                <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                <span>{(file.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    Updated 2m ago
                </span>
            </div>
        </div>
      </div>

      {/* Toolbar Actions */}
      <div className="flex items-center gap-1">
        <TooltipProvider>
            {/* Zoom Controls Group */}
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/50 mr-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-background text-muted-foreground hover:text-foreground">
                            <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom Out</TooltipContent>
                </Tooltip>
                
                <span className="text-xs font-medium w-12 text-center text-muted-foreground select-none">100%</span>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-background text-muted-foreground hover:text-foreground">
                            <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom In</TooltipContent>
                </Tooltip>
            </div>

            <Separator orientation="vertical" className="h-6 mx-1 bg-border/50 hidden sm:block" />

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:flex">
                        <Search className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Search in Document</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Share2 className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Share</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Download className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>More Options</TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
