import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

/**
 * 安全地将 Markdown 渲染为 HTML，使用 DOMPurify 消毒防止 XSS。
 * @param {string} md - Markdown 原文
 * @returns {string} 消毒后的 HTML
 */
export function renderMarkdown(md) {
  if (!md) return ''
  const rawHtml = marked.parse(md, { breaks: true })
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'blockquote', 'code', 'pre',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'img', 'strong', 'em', 'del', 's', 'b', 'i',
      'div', 'span', 'input', 'checkbox'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel', 'checked', 'disabled', 'type'],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * 验证 URL 是否使用安全的协议（http/https），防止 javascript: 等注入。
 * @param {string} url
 * @returns {string} 安全的 URL，不安全时返回空字符串
 */
export function safeUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  // 允许mailto和tel
  if (/^mailto:/i.test(trimmed)) return trimmed
  if (/^tel:/i.test(trimmed)) return trimmed
  return ''
}
