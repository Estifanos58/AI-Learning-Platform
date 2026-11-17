'use client';

import React from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { SplitNode } from './workspace-layout-context';

interface SplitContainerProps {
  node: SplitNode;
  children: React.ReactNode[];
}

export function SplitContainer({ node, children }: SplitContainerProps) {
  const { direction } = node;

  return (
    <PanelGroup direction={direction} className="w-full h-full">
      {children.map((child, index) => (
        <React.Fragment key={index}>
          <Panel defaultSize={100 / children.length} minSize={5} className="flex overflow-hidden">
            {child}
          </Panel>
          {index < children.length - 1 && (
            <PanelResizeHandle
              className={`flex items-center justify-center bg-border transition-colors hover:bg-primary/50 relative ${
                direction === 'horizontal' ? 'w-1 cursor-col-resize h-full' : 'h-1 cursor-row-resize w-full'
              } z-10`}
            >
              {/* Optional hit area expansion to make it easier to drag */}
              <div
                className={`absolute ${
                  direction === 'horizontal' ? '-left-1 -right-1 h-full' : '-top-1 -bottom-1 w-full'
                }`}
              />
            </PanelResizeHandle>
          )}
        </React.Fragment>
      ))}
    </PanelGroup>
  );
}
