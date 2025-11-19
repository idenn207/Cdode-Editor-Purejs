/**
 * 파일: src/services/editor/CompletionService.js
 * 기능: 코드 자동완성
 * 책임: 키워드, 심볼, 스니펫 제공
 */

import { LANGUAGE_CSS, LANGUAGE_HTML, LANGUAGE_JAVASCRIPT } from '../../constants/Languages.js';
import BaseService from '../../core/BaseService.js';

export default class CompletionService extends BaseService {
  constructor() {
    super();
    this.keywords_cache = new Map();
    this.snippets_cache = new Map();
  }

  /**
   * 초기화
   */
  initialize() {
    this.#initializeKeywords();
    this.#initializeSnippets();
    this.is_initialized = true;
  }

  /**
   * 자동완성 항목 가져오기
   */
  getCompletions(_document, _line, _column, _language, _isThisDot = false) {
    this.validateRequired(_document, 'document');
    this.validateNonNegativeNumber(_line, 'line');
    this.validateNonNegativeNumber(_column, 'column');
    this.validateNonEmptyString(_language, 'language');

    try {
      const current_line = _document.getLine(_line) || '';
      const prefix = this.#extractPrefix(current_line, _column);

      // 'this.' 패턴인 경우
      if (_isThisDot) {
        return this.#getThisMemberCompletions(_document, _language, prefix, _line);
      }

      if (!prefix || prefix.length < 1) {
        return [];
      }

      const completions = [];

      // 1. 키워드
      const keywords = this.#getKeywordCompletions(_language, prefix);
      completions.push(...keywords);

      // 2. 사용자 정의 심볼
      const symbols = this.#getSymbolCompletions(_document, _language, prefix, _line);
      completions.push(...symbols);

      // 3. 코드 스니펫
      const snippets = this.#getSnippetCompletions(_language, prefix);
      completions.push(...snippets);

      return this.#sortCompletions(this.#deduplicateCompletions(completions));
    } catch (error) {
      this.handleError(error, 'getCompletions');
      return [];
    }
  }

  /**
   * 접두사 추출 (private)
   */
  #extractPrefix(_line, _column) {
    const before_cursor = _line.substring(0, _column);
    const match = before_cursor.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);
    return match ? match[0] : '';
  }

  /**
   * 키워드 자동완성 (private)
   */
  #getKeywordCompletions(_language, _prefix) {
    const keywords = this.keywords_cache.get(_language) || [];
    const prefix_lower = _prefix.toLowerCase();

    return keywords
      .filter((_kw) => _kw.label.toLowerCase().startsWith(prefix_lower))
      .map((_kw) => ({
        ..._kw,
        score: 1,
      }));
  }

  /**
   * 심볼 자동완성 (private)
   */
  #getSymbolCompletions(_document, _language, _prefix, _currentLine) {
    if (_language !== LANGUAGE_JAVASCRIPT) return [];

    const text = _document.getText();
    const lines = text.split('\n');
    const symbols = new Set();

    // 변수, 함수, 클래스 추출
    for (let i = 0; i < lines.length; i++) {
      if (i === _currentLine) continue; // 현재 줄 제외

      const line = lines[i];

      // 변수 선언
      const var_pattern = /\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
      let match;
      while ((match = var_pattern.exec(line)) !== null) {
        if (match[1].startsWith(_prefix)) {
          symbols.add(match[1]);
        }
      }

      // 함수 선언
      const func_pattern = /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
      while ((match = func_pattern.exec(line)) !== null) {
        if (match[1].startsWith(_prefix)) {
          symbols.add(match[1]);
        }
      }

      // 클래스 선언
      const class_pattern = /\bclass\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
      while ((match = class_pattern.exec(line)) !== null) {
        if (match[1].startsWith(_prefix)) {
          symbols.add(match[1]);
        }
      }
    }

    return Array.from(symbols).map((_symbol) => ({
      label: _symbol,
      kind: 'variable',
      detail: 'user-defined',
      score: 2,
    }));
  }

  /**
   * this 멤버 자동완성 (private)
   */
  #getThisMemberCompletions(_document, _language, _prefix, _currentLine) {
    if (_language !== LANGUAGE_JAVASCRIPT) return [];

    const text = _document.getText();
    const lines = text.split('\n');
    const scope_text = lines.slice(0, _currentLine + 1).join('\n');

    const members = [];
    const seen = new Set();

    // 현재 클래스 찾기
    const class_match = scope_text.match(/class\s+([A-Z][a-zA-Z0-9_]*)\s*{/);
    if (!class_match) return [];

    // 1. this.property = value
    const property_pattern = /\bthis\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
    let match;
    while ((match = property_pattern.exec(text)) !== null) {
      const member_name = match[1];
      if (member_name.startsWith(_prefix) && !seen.has(member_name)) {
        seen.add(member_name);
        members.push({
          label: member_name,
          kind: 'property',
          detail: 'member',
          score: 3,
        });
      }
    }

    // 2. 메서드 정의
    const method_pattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*{/g;
    while ((match = method_pattern.exec(text)) !== null) {
      const method_name = match[1];
      if (method_name.startsWith(_prefix) && !seen.has(method_name) && method_name !== 'constructor') {
        seen.add(method_name);
        members.push({
          label: method_name + '()',
          kind: 'method',
          detail: 'member method',
          score: 3,
        });
      }
    }

    return members;
  }

  /**
   * 스니펫 자동완성 (private)
   */
  #getSnippetCompletions(_language, _prefix) {
    const snippets = this.snippets_cache.get(_language) || [];
    const prefix_lower = _prefix.toLowerCase();

    return snippets
      .filter((_snip) => _snip.label.toLowerCase().startsWith(prefix_lower))
      .map((_snip) => ({
        ..._snip,
        score: 0,
      }));
  }

  /**
   * 중복 제거 (private)
   */
  #deduplicateCompletions(_completions) {
    const seen = new Map();

    for (const comp of _completions) {
      if (!seen.has(comp.label) || seen.get(comp.label).score < comp.score) {
        seen.set(comp.label, comp);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * 정렬 (private)
   */
  #sortCompletions(_completions) {
    return _completions.sort((a, b) => {
      // 점수가 높은 순
      if (b.score !== a.score) return b.score - a.score;
      // 알파벳 순
      return a.label.localeCompare(b.label);
    });
  }

  /**
   * 키워드 초기화 (private)
   */
  #initializeKeywords() {
    // JavaScript 키워드
    this.keywords_cache.set(LANGUAGE_JAVASCRIPT, [
      { label: 'const', kind: 'keyword', detail: 'variable declaration' },
      { label: 'let', kind: 'keyword', detail: 'variable declaration' },
      { label: 'var', kind: 'keyword', detail: 'variable declaration' },
      { label: 'function', kind: 'keyword', detail: 'function declaration' },
      { label: 'class', kind: 'keyword', detail: 'class declaration' },
      { label: 'if', kind: 'keyword', detail: 'conditional' },
      { label: 'else', kind: 'keyword', detail: 'conditional' },
      { label: 'for', kind: 'keyword', detail: 'loop' },
      { label: 'while', kind: 'keyword', detail: 'loop' },
      { label: 'return', kind: 'keyword', detail: 'return statement' },
      { label: 'import', kind: 'keyword', detail: 'module import' },
      { label: 'export', kind: 'keyword', detail: 'module export' },
      { label: 'async', kind: 'keyword', detail: 'async function' },
      { label: 'await', kind: 'keyword', detail: 'await promise' },
      { label: 'try', kind: 'keyword', detail: 'error handling' },
      { label: 'catch', kind: 'keyword', detail: 'error handling' },
      { label: 'throw', kind: 'keyword', detail: 'throw error' },
      { label: 'new', kind: 'keyword', detail: 'instantiate' },
      { label: 'this', kind: 'keyword', detail: 'current context' },
      { label: 'super', kind: 'keyword', detail: 'parent class' },
    ]);

    // HTML 키워드
    this.keywords_cache.set(LANGUAGE_HTML, [
      { label: 'div', kind: 'tag', detail: 'HTML element' },
      { label: 'span', kind: 'tag', detail: 'HTML element' },
      { label: 'a', kind: 'tag', detail: 'anchor' },
      { label: 'button', kind: 'tag', detail: 'button element' },
      { label: 'input', kind: 'tag', detail: 'input element' },
      { label: 'form', kind: 'tag', detail: 'form element' },
      { label: 'table', kind: 'tag', detail: 'table element' },
      { label: 'ul', kind: 'tag', detail: 'unordered list' },
      { label: 'li', kind: 'tag', detail: 'list item' },
      { label: 'img', kind: 'tag', detail: 'image element' },
    ]);

    // CSS 키워드
    this.keywords_cache.set(LANGUAGE_CSS, [
      { label: 'display', kind: 'property', detail: 'CSS property' },
      { label: 'position', kind: 'property', detail: 'CSS property' },
      { label: 'color', kind: 'property', detail: 'CSS property' },
      { label: 'background', kind: 'property', detail: 'CSS property' },
      { label: 'margin', kind: 'property', detail: 'CSS property' },
      { label: 'padding', kind: 'property', detail: 'CSS property' },
      { label: 'border', kind: 'property', detail: 'CSS property' },
      { label: 'width', kind: 'property', detail: 'CSS property' },
      { label: 'height', kind: 'property', detail: 'CSS property' },
      { label: 'flex', kind: 'property', detail: 'flexbox property' },
    ]);
  }

  /**
   * 스니펫 초기화 (private)
   */
  #initializeSnippets() {
    // JavaScript 스니펫
    this.snippets_cache.set(LANGUAGE_JAVASCRIPT, [
      {
        label: 'log',
        kind: 'snippet',
        detail: 'console.log()',
        insertText: 'console.log($1);',
      },
      {
        label: 'fun',
        kind: 'snippet',
        detail: 'function declaration',
        insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
      },
      {
        label: 'afun',
        kind: 'snippet',
        detail: 'async function',
        insertText: 'async function ${1:name}(${2:params}) {\n\t$0\n}',
      },
      {
        label: 'cl',
        kind: 'snippet',
        detail: 'class declaration',
        insertText: 'class ${1:Name} {\n\tconstructor(${2:params}) {\n\t\t$0\n\t}\n}',
      },
    ]);

    // HTML 스니펫
    this.snippets_cache.set(LANGUAGE_HTML, [
      {
        label: 'html',
        kind: 'snippet',
        detail: 'HTML boilerplate',
        insertText: '<!DOCTYPE html>\n<html>\n<head>\n\t<title>$1</title>\n</head>\n<body>\n\t$0\n</body>\n</html>',
      },
    ]);

    // CSS 스니펫
    this.snippets_cache.set(LANGUAGE_CSS, [
      {
        label: 'flex',
        kind: 'snippet',
        detail: 'flexbox container',
        insertText: 'display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};',
      },
    ]);
  }

  /**
   * 서비스 종료
   */
  destroy() {
    this.keywords_cache.clear();
    this.snippets_cache.clear();
    this.is_initialized = false;
    super.destroy();
  }
}
