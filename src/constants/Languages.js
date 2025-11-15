/**
 * 파일: src/constants/Languages.js
 * 기능: 지원 언어 정의
 * 책임: 파일 확장자별 언어 매핑
 */

export const LANGUAGE_JAVASCRIPT = 'javascript';
export const LANGUAGE_HTML = 'html';
export const LANGUAGE_CSS = 'css';
export const LANGUAGE_MARKDOWN = 'markdown';

export const EXTENSION_MAP = {
  '.js': LANGUAGE_JAVASCRIPT,
  '.html': LANGUAGE_HTML,
  '.css': LANGUAGE_CSS,
  '.md': LANGUAGE_MARKDOWN,
};

export const LANGUAGE_CONFIG = {
  [LANGUAGE_JAVASCRIPT]: {
    name: 'JavaScript',
    extensions: ['.js'],
    comment_single: '//',
    comment_multi_start: '/*',
    comment_multi_end: '*/',
    auto_close_brackets: true,
    auto_close_tags: false,
  },
  [LANGUAGE_HTML]: {
    name: 'HTML',
    extensions: ['.html'],
    comment_single: null,
    comment_multi_start: '<!--',
    comment_multi_end: '-->',
    auto_close_brackets: true,
    auto_close_tags: true,
  },
  [LANGUAGE_CSS]: {
    name: 'CSS',
    extensions: ['.css'],
    comment_single: null,
    comment_multi_start: '/*',
    comment_multi_end: '*/',
    auto_close_brackets: true,
    auto_close_tags: false,
  },
  [LANGUAGE_MARKDOWN]: {
    name: 'Markdown',
    extensions: ['.md'],
    comment_single: null,
    comment_multi_start: null,
    comment_multi_end: null,
    auto_close_brackets: false,
    auto_close_tags: false,
  },
};
