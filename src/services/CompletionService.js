/**
 * 파일: src/services/CompletionService.js
 * 기능: 자동완성 제안 생성
 * 책임: 코드 컨텍스트 분석 및 자동완성 항목 제공
 */

import { LANGUAGE_CSS, LANGUAGE_HTML, LANGUAGE_JAVASCRIPT, LANGUAGE_MARKDOWN } from '../constants/Languages.js';

// 자동완성 항목 종류
export const COMPLETION_KIND_KEYWORD = 'keyword';
export const COMPLETION_KIND_VARIABLE = 'variable';
export const COMPLETION_KIND_FUNCTION = 'function';
export const COMPLETION_KIND_CLASS = 'class';
export const COMPLETION_KIND_SNIPPET = 'snippet';
export const COMPLETION_KIND_PROPERTY = 'property';
export const COMPLETION_KIND_METHOD = 'method';

export default class CompletionService {
  constructor() {
    this.keywords = this.#initializeKeywords();
    this.snippets = this.#initializeSnippets();
  }

  /**
   * 자동완성 항목 가져오기
   * @param {Document} _document - 현재 문서
   * @param {number} _line - 커서 줄 번호
   * @param {number} _column - 커서 열 번호
   * @param {string} _language - 언어
   * @returns {Array} - 자동완성 항목 배열
   */
  getCompletions(_document, _line, _column, _language) {
    if (!_document || _line < 0 || _column < 0) {
      return [];
    }

    // 현재 줄 텍스트
    const currentLine = _document.getLine(_line) || '';

    // 커서 앞 텍스트에서 접두사 추출
    const prefix = this.#extractPrefix(currentLine, _column);

    if (!prefix || prefix.length < 1) {
      return [];
    }

    // 모든 완성 항목 수집
    const completions = [];

    // 1. 키워드
    const keywords = this.#getKeywordCompletions(_language, prefix);
    completions.push(...keywords);

    // 2. 사용자 정의 심볼 (변수, 함수, 클래스)
    const symbols = this.#getSymbolCompletions(_document, _language, prefix);
    completions.push(...symbols);

    // 3. 코드 스니펫
    const snippets = this.#getSnippetCompletions(_language, prefix);
    completions.push(...snippets);

    // 중복 제거 및 정렬
    return this.#sortCompletions(this.#deduplicateCompletions(completions));
  }

  /**
   * 커서 앞의 접두사 추출
   */
  #extractPrefix(_lineText, _column) {
    if (_column === 0) return '';

    const beforeCursor = _lineText.substring(0, _column);

    // 단어 경계까지 역방향 추출
    const match = beforeCursor.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);

    return match ? match[0] : '';
  }

  /**
   * 키워드 자동완성
   */
  #getKeywordCompletions(_language, _prefix) {
    const languageKeywords = this.keywords[_language] || [];

    return languageKeywords
      .filter((_kw) => _kw.toLowerCase().startsWith(_prefix.toLowerCase()))
      .map((_kw) => ({
        label: _kw,
        kind: COMPLETION_KIND_KEYWORD,
        insertText: _kw,
        detail: 'Keyword',
        sortText: `0_${_kw}`, // 키워드 우선순위 높음
      }));
  }

  /**
   * 심볼 자동완성 (변수, 함수, 클래스)
   */
  #getSymbolCompletions(_document, _language, _prefix) {
    const text = _document.getText();
    const symbols = this.#extractSymbols(text, _language);

    return symbols
      .filter((_sym) => _sym.name.toLowerCase().startsWith(_prefix.toLowerCase()))
      .map((_sym) => ({
        label: _sym.name,
        kind: _sym.kind,
        insertText: _sym.insertText || _sym.name,
        detail: this.#getKindLabel(_sym.kind),
        sortText: `1_${_sym.name}`, // 심볼은 중간 우선순위
      }));
  }

  /**
   * 스니펫 자동완성
   */
  #getSnippetCompletions(_language, _prefix) {
    const languageSnippets = this.snippets[_language] || [];

    return languageSnippets
      .filter((_snip) => _snip.prefix.toLowerCase().startsWith(_prefix.toLowerCase()))
      .map((_snip) => ({
        label: _snip.prefix,
        kind: COMPLETION_KIND_SNIPPET,
        insertText: _snip.body,
        detail: _snip.description,
        sortText: `2_${_snip.prefix}`, // 스니펫은 낮은 우선순위
      }));
  }

  /**
   * 문서에서 심볼 추출
   */
  #extractSymbols(_text, _language) {
    const symbols = [];

    if (_language === LANGUAGE_JAVASCRIPT) {
      // 변수 (const, let, var)
      const varPattern = /\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
      let match;
      while ((match = varPattern.exec(_text)) !== null) {
        symbols.push({
          name: match[1],
          kind: COMPLETION_KIND_VARIABLE,
        });
      }

      // 함수 (function declarations)
      const funcPattern = /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
      while ((match = funcPattern.exec(_text)) !== null) {
        symbols.push({
          name: match[1],
          kind: COMPLETION_KIND_FUNCTION,
          insertText: `${match[1]}()`,
        });
      }

      // 클래스
      const classPattern = /\bclass\s+([A-Z][a-zA-Z0-9_]*)/g;
      while ((match = classPattern.exec(_text)) !== null) {
        symbols.push({
          name: match[1],
          kind: COMPLETION_KIND_CLASS,
        });
      }

      // 화살표 함수 (const funcName = () => {})
      const arrowPattern = /\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g;
      while ((match = arrowPattern.exec(_text)) !== null) {
        symbols.push({
          name: match[1],
          kind: COMPLETION_KIND_FUNCTION,
          insertText: `${match[1]}()`,
        });
      }
    }

    return symbols;
  }

  /**
   * 중복 제거
   */
  #deduplicateCompletions(_completions) {
    const seen = new Set();
    return _completions.filter((_comp) => {
      if (seen.has(_comp.label)) {
        return false;
      }
      seen.add(_comp.label);
      return true;
    });
  }

  /**
   * 정렬 (sortText 기준)
   */
  #sortCompletions(_completions) {
    return _completions.sort((_a, _b) => {
      return _a.sortText.localeCompare(_b.sortText);
    });
  }

  /**
   * Kind 라벨 반환
   */
  #getKindLabel(_kind) {
    const labels = {
      [COMPLETION_KIND_KEYWORD]: 'Keyword',
      [COMPLETION_KIND_VARIABLE]: 'Variable',
      [COMPLETION_KIND_FUNCTION]: 'Function',
      [COMPLETION_KIND_CLASS]: 'Class',
      [COMPLETION_KIND_SNIPPET]: 'Snippet',
      [COMPLETION_KIND_PROPERTY]: 'Property',
      [COMPLETION_KIND_METHOD]: 'Method',
    };
    return labels[_kind] || '';
  }

  /**
   * 언어별 키워드 초기화
   */
  #initializeKeywords() {
    return {
      [LANGUAGE_JAVASCRIPT]: [
        'await',
        'break',
        'case',
        'catch',
        'class',
        'const',
        'continue',
        'debugger',
        'default',
        'delete',
        'do',
        'else',
        'export',
        'extends',
        'finally',
        'for',
        'function',
        'if',
        'import',
        'in',
        'instanceof',
        'let',
        'new',
        'return',
        'super',
        'switch',
        'this',
        'throw',
        'try',
        'typeof',
        'var',
        'void',
        'while',
        'with',
        'yield',
        'async',
        'of',
        'static',
        'get',
        'set',
        'true',
        'false',
        'null',
        'undefined',
      ],
      [LANGUAGE_HTML]: [
        'div',
        'span',
        'p',
        'a',
        'img',
        'ul',
        'ol',
        'li',
        'table',
        'tr',
        'td',
        'form',
        'input',
        'button',
        'select',
        'option',
        'textarea',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'header',
        'footer',
        'nav',
        'section',
        'article',
        'aside',
        'main',
      ],
      [LANGUAGE_CSS]: [
        'color',
        'background',
        'background-color',
        'border',
        'margin',
        'padding',
        'width',
        'height',
        'display',
        'position',
        'top',
        'left',
        'right',
        'bottom',
        'font-size',
        'font-family',
        'font-weight',
        'text-align',
        'flex',
        'grid',
      ],
      [LANGUAGE_MARKDOWN]: [],
    };
  }

  /**
   * 언어별 스니펫 초기화
   */
  #initializeSnippets() {
    return {
      [LANGUAGE_JAVASCRIPT]: [
        {
          prefix: 'log',
          body: 'console.log();',
          description: 'Console log',
        },
        {
          prefix: 'func',
          body: 'function name() {\n  \n}',
          description: 'Function declaration',
        },
        {
          prefix: 'arrow',
          body: 'const name = () => {\n  \n};',
          description: 'Arrow function',
        },
        {
          prefix: 'class',
          body: 'class ClassName {\n  constructor() {\n    \n  }\n}',
          description: 'Class declaration',
        },
        {
          prefix: 'if',
          body: 'if (condition) {\n  \n}',
          description: 'If statement',
        },
        {
          prefix: 'for',
          body: 'for (let i = 0; i < length; i++) {\n  \n}',
          description: 'For loop',
        },
        {
          prefix: 'foreach',
          body: 'array.forEach((item) => {\n  \n});',
          description: 'ForEach loop',
        },
        {
          prefix: 'try',
          body: 'try {\n  \n} catch (error) {\n  \n}',
          description: 'Try-catch block',
        },
      ],
      [LANGUAGE_HTML]: [
        {
          prefix: 'html5',
          body: '<!DOCTYPE html>\n<html lang="ko">\n<head>\n  <meta charset="UTF-8">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>',
          description: 'HTML5 template',
        },
        {
          prefix: 'div',
          body: '<div></div>',
          description: 'Div element',
        },
      ],
      [LANGUAGE_CSS]: [],
      [LANGUAGE_MARKDOWN]: [],
    };
  }
}
