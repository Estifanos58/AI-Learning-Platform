'use client';

import { ReactNode, useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResizableSidebarProps {
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  position: 'left' | 'right';
  minWidth?: number;
  maxWidth?: number;
}

export function ResizableSidebar({
  children,
  isOpen,
  onToggle,
  width,
  onWidthChange,
  position,
  minWidth = 200,
  maxWidth = 600,
}: ResizableSidebarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      if (position === 'left') {
        const newWidth = e.clientX - rect.left;
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          onWidthChange(newWidth);
        }
      } else {
        const newWidth = rect.right - e.clientX;
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          onWidthChange(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, onWidthChange, position, minWidth, maxWidth]);

  if (!isOpen) {
    return (
      <div
        className={`flex items-center ${position === 'left' ? 'border-r' : 'border-l'} border-border bg-card`}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          title={`${position === 'left' ? 'Show' : 'Show'} sidebar`}
          className="h-full rounded-none px-2 hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          {position === 'left' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex h-full ${position === 'left' ? 'flex-row' : 'flex-row-reverse'} bg-card`}
      style={{ width: `${width}px` }}
    >
      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col h-full relative">
        {children}
      </div>

      {/* Resize Handle Area */}
      <div 
        className={cn(
            "relative flex flex-col items-center justify-center w-2 hover:w-3 transition-all duration-300 ease-out z-50 cursor-col-resize group select-none",
            position === 'left' ? "-mr-1.5" : "-ml-1.5"
        )}
        onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
        }}
      >
        {/* Visual Line */}
        <div className="absolute inset-y-0 w-[1px] bg-border group-hover:bg-primary/50 transition-colors" />
        
        {/* Helper Button (Only shows on hover) */}
        <div 
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute top-1/2 -translate-y-1/2 z-10"
          onMouseDown={(e) => e.stopPropagation()} // Prevent resizing when clicking button
        >
            <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
            title={position === 'left' ? "Hide Sidebar" : "Hide Panel"}
            className="h-6 w-6 rounded-full shadow-sm bg-background border-border p-0 hover:bg-accent hover:text-accent-foreground"
            >
            {position === 'left' ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
        </div>
      </div>
    </div>
  );
}
