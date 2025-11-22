/**
 * 파일: src/views/renderers/SyntaxRenderer.js
 * 기능: 구문 강조 렌더링
 * 책임: 코드 텍스트를 HTML로 변환 (구문 강조)
 */

export default class SyntaxRenderer {
  constructor(_languageService = null) {
    this.language_service = _languageService;
    this.cache = new Map();
  }

  /**
   * 텍스트 렌더링 (구문 강조)
   * @param {string} _text - 원본 텍스트
   * @param {string} _language - 언어 (javascript, html, css, markdown)
   * @returns {string} HTML 문자열
   */
  render(_text, _language = 'plaintext') {
    if (!_text) return '';

    // 캐시 확인
    const cache_key = `${_language}:${_text}`;
    if (this.cache.has(cache_key)) {
      return this.cache.get(cache_key);
    }

    let html = '';

    try {
      // 언어별 렌더링
      switch (_language) {
        case 'javascript':
          html = this.#renderJavaScript(_text);
          break;
        case 'html':
          html = this.#renderHTML(_text);
          break;
        case 'css':
          html = this.#renderCSS(_text);
          break;
        case 'markdown':
          html = this.#renderMarkdown(_text);
          break;
        default:
          html = this.#renderPlainText(_text);
      }

      // 캐시 저장 (최대 100개)
      if (this.cache.size >= 100) {
        const first_key = this.cache.keys().next().value;
        this.cache.delete(first_key);
      }
      this.cache.set(cache_key, html);
    } catch (error) {
      console.error('Syntax rendering error:', error);
      html = this.#renderPlainText(_text);
    }

    return html;
  }

  /**
   * JavaScript 렌더링
   */
  #renderJavaScript(_text) {
    // 간단한 구문 강조 (토큰화 없이)
    let html = this.#escapeHTML(_text);

    // 키워드
    const keywords = /\b(function|const|let|var|if|else|for|while|return|class|export|import|async|await)\b/g;
    html = html.replace(keywords, '<span class="keyword">$1</span>');

    // 문자열
    const strings = /(['"`])((?:\\.|(?!\1).)*?)\1/g;
    html = html.replace(strings, '<span class="string">$1$2$1</span>');

    // 주석
    const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
    html = html.replace(comments, '<span class="comment">$1</span>');

    // 숫자
    const numbers = /\b(\d+)\b/g;
    html = html.replace(numbers, '<span class="number">$1</span>');

    return html;
  }

  /**
   * HTML 렌더링
   */
  #renderHTML(_text) {
    let html = this.#escapeHTML(_text);

    // 태그
    html = html.replace(/(&lt;\/?[\w-]+)/g, '<span class="tag">$1</span>');
    html = html.replace(/(&gt;)/g, '<span class="tag">$1</span>');

    // 속성
    html = html.replace(/([\w-]+)=/g, '<span class="attribute">$1</span>=');

    // 문자열
    html = html.replace(/=(['"`])(.*?)\1/g, '=<span class="string">$1$2$1</span>');

    return html;
  }

  /**
   * CSS 렌더링
   */
  #renderCSS(_text) {
    let html = this.#escapeHTML(_text);

    // 선택자
    html = html.replace(/^([\w\-#.[\]:]+)\s*\{/gm, '<span class="selector">$1</span> {');

    // 속성
    html = html.replace(/([\w-]+)\s*:/g, '<span class="property">$1</span>:');

    // 값
    html = html.replace(/:\s*([^;]+);/g, ': <span class="value">$1</span>;');

    // 주석
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');

    return html;
  }

  /**
   * Markdown 렌더링
   */
  #renderMarkdown(_text) {
    let html = this.#escapeHTML(_text);

    // 헤더
    html = html.replace(/^(#{1,6})\s+(.+)$/gm, '<span class="header">$1 $2</span>');

    // 볼드
    html = html.replace(/\*\*(.+?)\*\*/g, '<span class="bold">**$1**</span>');

    // 이탤릭
    html = html.replace(/\*(.+?)\*/g, '<span class="italic">*$1*</span>');

    // 코드
    html = html.replace(/`(.+?)`/g, '<span class="code">`$1`</span>');

    // 링크
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<span class="link">[$1]($2)</span>');

    return html;
  }

  /**
   * 평문 렌더링
   */
  #renderPlainText(_text) {
    return this.#escapeHTML(_text);
  }

  /**
   * HTML 이스케이프
   */
  #escapeHTML(_text) {
    return _text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  /**
   * 캐시 초기화
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 렌더러 파괴
   */
  destroy() {
    this.clearCache();
    this.language_service = null;
  }
}
