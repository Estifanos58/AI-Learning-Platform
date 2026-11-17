'use client';

import { FileItem } from '@/src/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface PdfPageViewportProps {
  file: FileItem;
}

export function PdfPageViewport({ file }: PdfPageViewportProps) {
  return (
    <div className="w-full max-w-3xl mx-auto bg-white shadow-2xl rounded-sm min-h-[800px] relative flex flex-col items-center p-12 lg:p-16 border border-border/10">
      {/* Simulated Page Content */}
      <div className="w-full space-y-8 animate-in fade-in duration-700">
        {/* Header */}
        <div className="space-y-4 text-center pb-8 border-b border-gray-100">
            <h1 className="text-3xl font-serif font-bold text-gray-900">{file.originalName.replace('.pdf', '')}</h1>
            <p className="text-sm text-gray-500 font-mono uppercase tracking-widest">Confidential Document</p>
        </div>

        {/* Body Text Mockup */}
        <div className="space-y-3">
            <Skeleton className="h-4 w-full bg-gray-100" />
            <Skeleton className="h-4 w-[90%] bg-gray-100" />
            <Skeleton className="h-4 w-[95%] bg-gray-100" />
        </div>
        
        <div className="space-y-3">
            <Skeleton className="h-4 w-[85%] bg-gray-100" />
            <Skeleton className="h-4 w-full bg-gray-100" />
            <Skeleton className="h-4 w-[92%] bg-gray-100" />
        </div>

        {/* Image Placeholder */}
        <div className="py-6">
            <Skeleton className="h-48 w-full rounded-md bg-gray-50" />
            <div className="flex justify-center mt-2">
                <Skeleton className="h-3 w-32 bg-gray-100" />
            </div>
        </div>

        <div className="space-y-3">
            <Skeleton className="h-4 w-full bg-gray-100" />
            <Skeleton className="h-4 w-[98%] bg-gray-100" />
            <Skeleton className="h-4 w-[88%] bg-gray-100" />
            <Skeleton className="h-4 w-full bg-gray-100" />
        </div>
      </div>

      {/* Page Number */}
      <div className="absolute bottom-8 text-xs text-gray-400 font-medium">Page 1 of 12</div>
    </div>
  );
}
