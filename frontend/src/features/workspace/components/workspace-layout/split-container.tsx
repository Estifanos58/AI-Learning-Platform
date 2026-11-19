'use client';

import React from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { SplitNode, useWorkspaceLayout } from './workspace-layout-context';

interface SplitContainerProps {
  node: SplitNode;
  children: React.ReactNode[];
}

export function SplitContainer({ node, children }: SplitContainerProps) {
  const { direction, id, sizes } = node;
  const { setSplitSizes } = useWorkspaceLayout();

  return (
    <PanelGroup
      direction={direction}
      className="w-full h-full"
      onLayout={(nextSizes) => {
        if (nextSizes.length === children.length) {
          setSplitSizes(id, nextSizes);
        }
      }}
    >
      {children.map((child, index) => {
        const childKey = node.children[index]?.id ?? `${id}-${index}`;
        const defaultSize =
          sizes && sizes.length === children.length
            ? sizes[index]
            : 100 / children.length;
        return (
          <React.Fragment key={childKey}>
            <Panel defaultSize={defaultSize} minSize={5} className="flex overflow-hidden">
              {child}
            </Panel>
            {index < children.length - 1 && (
              <PanelResizeHandle
                className={`flex items-center justify-center bg-border transition-colors hover:bg-primary/50 relative ${
                  direction === 'horizontal' ? 'w-1 cursor-col-resize h-full' : 'h-1 cursor-row-resize w-full'
                } z-10`}
              >
                <div
                  className={`absolute ${
                    direction === 'horizontal' ? '-left-1 -right-1 h-full' : '-top-1 -bottom-1 w-full'
                  }`}
                />
              </PanelResizeHandle>
            )}
          </React.Fragment>
        );
      })}
    </PanelGroup>
  );
}
