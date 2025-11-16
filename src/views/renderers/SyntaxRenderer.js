/**
 * 파일: src/views/renderers/SyntaxRenderer.js
 * 기능: 신택스 하이라이팅 렌더링
 * 책임: 토큰을 HTML로 변환하여 색상 적용
 */

import LanguageService from '../../services/LanguageService.js';

export default class SyntaxRenderer {
  constructor() {
    this.language_service = new LanguageService();
  }

  /**
   * 코드를 신택스 하이라이팅된 HTML로 변환
   */
  renderLine(_code, _language) {
    if (!_code || _code === '\n' || _code.trim() === '') {
      return '<br>';
    }

    const tokens = this.language_service.parse(_code, _language);

    let html = '';
    tokens.forEach((_token) => {
      const escaped = this.#escapeHtml(_token.value);
      html += `<span class="token-${_token.type}">${escaped}</span>`;
    });

    return html;
  }

  /**
   * HTML 이스케이프
   */
  #escapeHtml(_text) {
    const div = window.document.createElement('div');
    div.textContent = _text;
    return div.innerHTML;
  }

  /**
   * 여러 줄 렌더링
   */
  renderLines(_lines, _language) {
    return _lines.map((_line) => this.renderLine(_line, _language));
  }
}
