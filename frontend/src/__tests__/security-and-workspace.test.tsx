import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { sanitizeDocxHtml, sanitizeUrl } from '@/src/lib/security/sanitize';
import { AiMessageRenderer } from '@/src/features/workspace/chat/ai-message-renderer';
import {
  WORKSPACE_LAYOUT_STORAGE_KEY,
  layoutReducer,
  loadPersistedWorkspaceLayout,
  savePersistedWorkspaceLayout,
} from '@/src/features/workspace/components/workspace-layout/workspace-layout-context';
import {
  WORKSPACE_PREFS_STORAGE_KEY,
  loadWorkspacePrefs,
} from '@/src/features/workspace/workspace-context';
import { COOKIE_SESSION_SENTINEL, isRealBearerToken } from '@/src/lib/api/core/csrf';
import { executeRequest } from '@/src/lib/api/core/http';
import { getServerApiBaseUrl, buildRequestUrl } from '@/src/lib/api/core/config';
import { gatewayServerGet } from '@/src/lib/api/server';

describe('Security sanitization (DOCX HTML & URL protocols)', () => {
  it('strips scripts, event handlers, iframes, and javascript: URLs from DOCX HTML', () => {
    const malicious = `
      <h1>Course Notes</h1>
      <p>Safe paragraph</p>
      <script>alert('xss')</script>
      <img src="x" onerror="alert(1)" />
      <iframe src="https://evil.test"></iframe>
      <a href="javascript:alert(document.cookie)">Click me</a>
      <a href="https://example.org/docs">Valid link</a>
    `;

    const clean = sanitizeDocxHtml(malicious);

    expect(clean).toContain('<h1>Course Notes</h1>');
    expect(clean).toContain('<p>Safe paragraph</p>');
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('<iframe');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('href="https://example.org/docs"');
    expect(clean).toContain('rel="noopener noreferrer"');
  });

  it('rejects unsafe URL protocols and allows safe protocols', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeUrl('java\nscript:alert(1)')).toBeUndefined();
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBeUndefined();
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(sanitizeUrl('//evil.example.com/phish')).toBeUndefined();

    expect(sanitizeUrl('https://docs.example.com/guide')).toBe('https://docs.example.com/guide');
    expect(sanitizeUrl('mailto:help@example.com')).toBe('mailto:help@example.com');
    expect(sanitizeUrl('#section-1')).toBe('#section-1');
    expect(sanitizeUrl('data:image/png;base64,AAAA', { allowDataImage: true })).toBe('data:image/png;base64,AAAA');
  });
});

describe('AI Message Renderer (safe Markdown, code highlighting, tables, citations)', () => {
  it('renders Markdown tables, code blocks, citations, and strips raw XSS HTML', () => {
    const md = [
      '## Summary',
      '',
      '| Concept | Complexity |',
      '| --- | --- |',
      '| Binary Search | O(log n) |',
      '',
      '```python',
      'def search(arr, target):',
      '    return target in arr',
      '```',
      '',
      '[Bad](javascript:alert(1)) <script>alert("xss")</script>',
    ].join('\n');

    const { container } = render(
      <AiMessageRenderer
        content={md}
        citations={[
          { id: 'c1', fileName: 'algorithms.pdf', pageNumber: 12, snippet: 'Binary search divides the array.' },
        ]}
      />,
    );

    expect(screen.getByText('Summary')).toBeTruthy();
    expect(screen.getByText('Binary Search')).toBeTruthy();
    expect(screen.getByText('O(log n)')).toBeTruthy();
    expect(screen.getByText('python')).toBeTruthy();
    expect(screen.getByTestId('ai-citations')).toBeTruthy();
    expect(screen.getByText('algorithms.pdf')).toBeTruthy();
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('javascript:');
  });
});

describe('Cookie-based auth & CSRF header injection', () => {
  beforeEach(() => {
    document.cookie = 'app_csrf_token=csrf-test-token-abc; Path=/';
  });

  it('treats COOKIE_SESSION_SENTINEL as non-bearer and injects X-CSRF-Token with credentials include', async () => {
    expect(isRealBearerToken(COOKIE_SESSION_SENTINEL)).toBe(false);
    expect(isRealBearerToken('eyJ.real.jwt')).toBe(true);

    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    await executeRequest('/chat/messages', {
      method: 'POST',
      token: COOKIE_SESSION_SENTINEL,
      body: { content: 'Hello' },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init.credentials).toBe('include');
    expect(init.headers['X-CSRF-Token']).toBe('csrf-test-token-abc');
    expect(init.headers.Authorization).toBeUndefined();

    vi.unstubAllGlobals();
  });
});

describe('Workspace layout & preferences persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists and restores tabs, split panes, and split ratios safely', () => {
    let state = layoutReducer(
      {
        layoutTree: { type: 'pane', id: 'root-pane', tabs: [] },
        activePaneId: 'root-pane',
        isWorkspaceFullscreen: false,
      },
      { type: 'OPEN_TAB', tab: { id: 'file-1', title: 'Lecture 1.pdf', type: 'file' } },
    );

    state = layoutReducer(state, { type: 'SPLIT_PANE', paneId: 'root-pane', direction: 'horizontal' });
    expect(state.layoutTree.type).toBe('split');
    const splitId = state.layoutTree.type === 'split' ? state.layoutTree.id : '';
    state = layoutReducer(state, { type: 'SET_SPLIT_SIZES', splitId, sizes: [65, 35] });

    savePersistedWorkspaceLayout(state);

    const restored = loadPersistedWorkspaceLayout();
    expect(restored).not.toBeNull();
    expect(restored?.layoutTree.type).toBe('split');
    if (restored?.layoutTree.type === 'split') {
      expect(restored.layoutTree.sizes).toEqual([65, 35]);
    }
  });

  it('ignores corrupted workspace layout JSON cleanly', () => {
    window.localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, '{invalid-json');
    expect(loadPersistedWorkspaceLayout()).toBeNull();
  });

  it('clamps persisted sidebar widths within safe bounds', () => {
    window.localStorage.setItem(
      WORKSPACE_PREFS_STORAGE_KEY,
      JSON.stringify({
        sidebarOpen: false,
        chatPanelOpen: true,
        leftSidebarWidth: 9999,
        rightSidebarWidth: 10,
        preferredAiModelId: 'model-gpt',
      }),
    );

    const prefs = loadWorkspacePrefs();
    expect(prefs.sidebarOpen).toBe(false);
    expect(prefs.leftSidebarWidth).toBe(500);
    expect(prefs.rightSidebarWidth).toBe(220);
    expect(prefs.preferredAiModelId).toBe('model-gpt');
  });
});

describe('Server API configuration & gateway fallback', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it('respects INTERNAL_API_URL for server-side base URL', () => {
    process.env.INTERNAL_API_URL = 'http://api-gateway:8080/api';
    expect(getServerApiBaseUrl()).toBe('http://api-gateway:8080/api');

    process.env.INTERNAL_API_URL = 'http://internal-gateway:8080';
    expect(getServerApiBaseUrl()).toBe('http://internal-gateway:8080/api');
  });

  it('falls back to API_BASE_URL when INTERNAL_API_URL is unset', () => {
    delete process.env.INTERNAL_API_URL;
    delete process.env.API_GATEWAY_INTERNAL_URL;
    expect(getServerApiBaseUrl()).toBe('http://localhost:8080/api');
  });

  it('buildRequestUrl normalizes paths and handles custom base URLs', () => {
    expect(buildRequestUrl('/profile/me', 'http://api-gateway:8080/api')).toBe('http://api-gateway:8080/api/profile/me');
    expect(buildRequestUrl('https://other-domain.test/api/health')).toBe('https://other-domain.test/api/health');
  });

  it('gatewayServerGet handles connection errors gracefully and returns null', async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    vi.stubGlobal('fetch', fetchSpy);

    const result = await gatewayServerGet('/profile/me', { token: 'mock-token' });
    expect(result).toBeNull();

    vi.unstubAllGlobals();
  });

  it('gatewayServerGet succeeds when fallback succeeds', async () => {
    delete process.env.INTERNAL_API_URL;
    const fetchSpy = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED')) // primary localhost fails
      .mockResolvedValueOnce(new Response(JSON.stringify({ firstName: 'Alice', lastName: 'Smith' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })); // fallback succeeds
    vi.stubGlobal('fetch', fetchSpy);

    const result = await gatewayServerGet<{ firstName: string; lastName: string }>('/profile/me', { token: 'mock-token' });
    expect(result).toEqual({ firstName: 'Alice', lastName: 'Smith' });

    vi.unstubAllGlobals();
  });
});
