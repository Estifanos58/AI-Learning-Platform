import DOMPurify from 'dompurify';
import { defaultSchema } from 'rehype-sanitize';

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const SAFE_DATA_IMAGE_RE = /^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=\s]+$/i;

/**
 * Validates and normalizes URLs against a strict protocol allowlist.
 * Rejects javascript:, vbscript:, data:text/html, and other unsafe protocols.
 */
export function sanitizeUrl(
  rawUrl?: string | null,
  options: { allowDataImage?: boolean } = {},
): string | undefined {
  if (!rawUrl) return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;

  // Strip ASCII control characters / whitespace obfuscation (e.g. "java\nscript:")
  const stripped = trimmed.replace(/[\u0000-\u001F\u007F]+/g, '');
  if (!stripped) return undefined;

  if (options.allowDataImage && SAFE_DATA_IMAGE_RE.test(stripped)) {
    return stripped;
  }

  // Reject protocol-relative URLs (e.g., //evil.example.com/phish)
  if (stripped.startsWith('//')) {
    return undefined;
  }

  // Allow safe relative anchors and same-origin paths
  if (stripped.startsWith('#') || stripped.startsWith('/')) {
    return stripped;
  }

  try {
    const parsed = new URL(stripped, 'https://placeholder.invalid');
    if (parsed.origin === 'https://placeholder.invalid' && !stripped.includes(':')) {
      return stripped;
    }
    if (SAFE_LINK_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
      return stripped;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

const DOCX_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'sub',
  'sup',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'a',
  'img',
  'span',
  'div',
  'hr',
];

const DOCX_ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'colspan', 'rowspan'];

/**
 * Sanitizes HTML generated from DOCX files (e.g., via mammoth.js) using a strict tag,
 * attribute, and URL protocol allowlist.
 */
export function sanitizeDocxHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  const sanitized = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: DOCX_ALLOWED_TAGS,
    ALLOWED_ATTR: DOCX_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'button'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover', 'srcdoc'],
  });

  if (typeof DOMParser === 'undefined') {
    return sanitized;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, 'text/html');

  doc.querySelectorAll('a').forEach((anchor) => {
    const safeHref = sanitizeUrl(anchor.getAttribute('href'));
    if (!safeHref) {
      anchor.removeAttribute('href');
    } else {
      anchor.setAttribute('href', safeHref);
      if (/^https?:/i.test(safeHref)) {
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });

  doc.querySelectorAll('img').forEach((img) => {
    const safeSrc = sanitizeUrl(img.getAttribute('src'), { allowDataImage: true });
    if (!safeSrc) {
      img.remove();
    } else {
      img.setAttribute('src', safeSrc);
    }
  });

  return doc.body.innerHTML;
}

/**
 * Strict rehype-sanitize schema for Markdown & AI message rendering.
 * Allows structural Markdown elements, GFM tables, safe links/images, and syntax-highlight classes.
 */
export const MARKDOWN_SANITIZE_SCHEMA = {
  ...defaultSchema,
  tagNames: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'del',
    's',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'span',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'a',
    'img',
    'hr',
    'input',
  ],
  protocols: {
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https'],
  },
  attributes: {
    ...defaultSchema.attributes,
    a: ['href', 'title'],
    img: ['src', 'alt', 'title'],
    code: [['className', /^language-[a-z0-9_+-]+$/i, /^hljs/]],
    span: [['className', /^hljs-[a-z0-9_-]+$/i]],
    input: [['type', 'checkbox'], 'checked', 'disabled'],
    th: ['align'],
    td: ['align'],
  },
};
