'use client';

import React from 'react';
import { useWorkspaceLayout, LayoutNode, PaneNode, SplitNode } from './workspace-layout-context';
import { SplitContainer } from './split-container';
import { Pane } from './pane';

export function WorkspaceRoot() {
  const { layoutTree, isWorkspaceFullscreen } = useWorkspaceLayout();

  const renderNode = (node: LayoutNode): React.ReactNode => {
    if (node.type === 'pane') {
      return <Pane key={node.id} node={node as PaneNode} />;
    } else if (node.type === 'split') {
      const splitNode = node as SplitNode;
      return (
        <SplitContainer key={splitNode.id} node={splitNode}>
          {splitNode.children.map(renderNode)}
        </SplitContainer>
      );
    }
    return null;
  };

  return (
    <div className={`w-full h-full flex flex-col bg-background overflow-hidden relative ${isWorkspaceFullscreen ? 'fixed inset-0 z-[9999]' : ''}`}>
      {renderNode(layoutTree)}
    </div>
  );
}
