/**
 * 파일: src/services/CompletionService.js
 * 기능: 자동완성 제안 생성
 * 책임: 코드 컨텍스트 분석 및 자동완성 항목 제공
 */
import { LANGUAGE_CSS, LANGUAGE_HTML, LANGUAGE_JAVASCRIPT, LANGUAGE_MARKDOWN } from '../constants/Languages.js';

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
   * 자동완성 항목 가져오기 - 수정됨
   */
  getCompletions(_document, _line, _column, _language, _contextType = 'normal', _objectName = null) {
    if (!_document || _line < 0 || _column < 0) {
      return [];
    }

    const currentLine = _document.getLine(_line) || '';
    const prefix = this.#extractPrefix(currentLine, _column);

    // 'this.' 패턴
    if (_contextType === 'this') {
      return this.#getThisMemberCompletions(_document, _language, prefix, _line);
    }

    // 'obj.' 패턴
    if (_contextType === 'object' && _objectName) {
      return this.#getObjectMemberCompletions(_document, _language, prefix, _objectName, _line);
    }

    // 일반 자동완성
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

    return this.#sortCompletions(this.#deduplicateCompletions(completions), prefix);
  }

  /**
   * 객체 멤버 자동완성 - 새로 추가
   */
  #getObjectMemberCompletions(_document, _language, _prefix, _objectName, _currentLine) {
    if (_language !== LANGUAGE_JAVASCRIPT) return [];

    const text = _document.getText();
    const lines = text.split('\n');
    const scopeText = lines.slice(0, _currentLine + 1).join('\n');

    const members = [];
    const seen = new Set();

    // 객체 리터럴 찾기: const obj = { prop: value, method() {} }
    const objLiteralPattern = new RegExp(`\\b${_objectName}\\s*=\\s*\\{([^}]+)\\}`, 'g');

    let match;
    while ((match = objLiteralPattern.exec(scopeText)) !== null) {
      const objBody = match[1];

      // 프로퍼티 추출: prop: value
      const propPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g;
      let propMatch;
      while ((propMatch = propPattern.exec(objBody)) !== null) {
        const name = propMatch[1];
        if (!seen.has(name) && name.toLowerCase().startsWith(_prefix.toLowerCase())) {
          members.push({
            label: name,
            kind: COMPLETION_KIND_PROPERTY,
            insertText: name,
            detail: 'Property',
            sortText: `1_${name}`,
          });
          seen.add(name);
        }
      }

      // 메서드 추출: method() {}
      const methodPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/g;
      let methodMatch;
      while ((methodMatch = methodPattern.exec(objBody)) !== null) {
        const name = methodMatch[1];
        if (!seen.has(name) && name.toLowerCase().startsWith(_prefix.toLowerCase())) {
          members.push({
            label: name,
            kind: COMPLETION_KIND_METHOD,
            insertText: `${name}()`,
            detail: 'Method',
            sortText: `2_${name}`,
          });
          seen.add(name);
        }
      }
    }

    // obj.prop = value 패턴
    const dotPropPattern = new RegExp(`\\b${_objectName}\\.([a-zA-Z_$][a-zA-Z0-9_$]*)`, 'g');

    while ((match = dotPropPattern.exec(scopeText)) !== null) {
      const name = match[1];
      if (!seen.has(name) && name.toLowerCase().startsWith(_prefix.toLowerCase())) {
        members.push({
          label: name,
          kind: COMPLETION_KIND_PROPERTY,
          insertText: name,
          detail: 'Property',
          sortText: `1_${name}`,
        });
        seen.add(name);
      }
    }

    return members;
  }

  /**
   * this 멤버 자동완성
   */
  #getThisMemberCompletions(_document, _language, _prefix, _currentLine) {
    if (_language !== LANGUAGE_JAVASCRIPT) return [];

    const text = _document.getText();
    const lines = text.split('\n');
    const scopeText = lines.slice(0, _currentLine + 1).join('\n');

    const members = [];
    const seen = new Set();

    // 현재 클래스 찾기
    const classMatch = scopeText.match(/class\s+([A-Z][a-zA-Z0-9_]*)\s*{/);
    if (!classMatch) return [];

    // this.property = value
    const propertyPattern = /\bthis\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
    let match;
    while ((match = propertyPattern.exec(scopeText)) !== null) {
      const name = match[1];
      if (!seen.has(name) && name.toLowerCase().startsWith(_prefix.toLowerCase())) {
        members.push({
          label: name,
          kind: COMPLETION_KIND_PROPERTY,
          insertText: name,
          detail: 'Property',
          sortText: `1_${name}`,
        });
        seen.add(name);
      }
    }

    // 메서드 (class 내부)
    const methodPattern = /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/gm;
    while ((match = methodPattern.exec(scopeText)) !== null) {
      const name = match[1];
      if (!this.#isKeyword(name) && !seen.has(name) && name.toLowerCase().startsWith(_prefix.toLowerCase())) {
        members.push({
          label: name,
          kind: COMPLETION_KIND_METHOD,
          insertText: `${name}()`,
          detail: 'Method',
          sortText: `2_${name}`,
        });
        seen.add(name);
      }
    }

    return members;
  }

  /**
   * 정렬 - 수정됨
   */
  #sortCompletions(_completions, _prefix) {
    return _completions.sort((_a, _b) => {
      // 정확히 일치하는 항목 우선
      const aExact = _a.label === _prefix ? -1 : 0;
      const bExact = _b.label === _prefix ? -1 : 0;

      if (aExact !== bExact) return aExact - bExact;

      // sortText로 정렬
      return _a.sortText.localeCompare(_b.sortText);
    });
  }

  /**
   * 심볼 자동완성
   */
  #getSymbolCompletions(_document, _language, _prefix, _currentLine) {
    const text = _document.getText();
    const lines = text.split('\n');
    const scopeText = lines.slice(0, _currentLine + 1).join('\n');

    const symbols = [];
    const seen = new Set();

    if (_language === LANGUAGE_JAVASCRIPT) {
      // 1. 변수 (우선순위 1)
      const varPattern = /\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
      let match;
      while ((match = varPattern.exec(scopeText)) !== null) {
        const name = match[1];
        if (!seen.has(name) && name.toLowerCase().startsWith(_prefix.toLowerCase())) {
          const isExactMatch = name === _prefix;
          symbols.push({
            name: name,
            kind: COMPLETION_KIND_VARIABLE,
            sortText: isExactMatch ? `0_${name}` : `1_${name}`,
          });
          seen.add(name);
        }
      }

      // 2. 함수 (우선순위 2)
      const funcPattern = /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
      while ((match = funcPattern.exec(scopeText)) !== null) {
        const name = match[1];
        if (!seen.has(name) && name.toLowerCase().startsWith(_prefix.toLowerCase())) {
          const isExactMatch = name === _prefix;
          symbols.push({
            name: name,
            kind: COMPLETION_KIND_FUNCTION,
            insertText: `${name}()`,
            sortText: isExactMatch ? `0_${name}` : `2_${name}`,
          });
          seen.add(name);
        }
      }

      // 3. 클래스 (우선순위 3)
      const classPattern = /\bclass\s+([A-Z][a-zA-Z0-9_]*)/g;
      while ((match = classPattern.exec(scopeText)) !== null) {
        const name = match[1];
        if (!seen.has(name) && name.toLowerCase().startsWith(_prefix.toLowerCase())) {
          const isExactMatch = name === _prefix;
          symbols.push({
            name: name,
            kind: COMPLETION_KIND_CLASS,
            sortText: isExactMatch ? `0_${name}` : `3_${name}`,
          });
          seen.add(name);
        }
      }

      // 4. 화살표 함수
      const arrowPattern = /\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g;
      while ((match = arrowPattern.exec(scopeText)) !== null) {
        const name = match[1];
        if (!seen.has(name) && name.toLowerCase().startsWith(_prefix.toLowerCase())) {
          const isExactMatch = name === _prefix;
          symbols.push({
            name: name,
            kind: COMPLETION_KIND_FUNCTION,
            insertText: `${name}()`,
            sortText: isExactMatch ? `0_${name}` : `2_${name}`,
          });
          seen.add(name);
        }
      }
    }

    return symbols.map((_sym) => ({
      label: _sym.name,
      kind: _sym.kind,
      insertText: _sym.insertText || _sym.name,
      detail: this.#getKindLabel(_sym.kind),
      sortText: _sym.sortText,
    }));
  }

  /**
   * 커서 앞의 접두사 추출
   */
  #extractPrefix(_lineText, _column) {
    if (_column === 0) return '';

    const beforeCursor = _lineText.substring(0, _column);
    const match = beforeCursor.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);

    return match ? match[0] : '';
  }

  /**
   * 키워드 확인
   */
  #isKeyword(_name) {
    const jsKeywords = this.keywords[LANGUAGE_JAVASCRIPT] || [];
    return jsKeywords.includes(_name);
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
        sortText: `3_${_kw}`, // 우선순위 낮춤
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
        sortText: `4_${_snip.prefix}`, // 우선순위 낮춤
      }));
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

  #initializeSnippets() {
    return {
      [LANGUAGE_JAVASCRIPT]: [
        { prefix: 'log', body: 'console.log();', description: 'Console log' },
        { prefix: 'func', body: 'function name() {\n  \n}', description: 'Function declaration' },
        { prefix: 'arrow', body: 'const name = () => {\n  \n};', description: 'Arrow function' },
        { prefix: 'class', body: 'class ClassName {\n  constructor() {\n    \n  }\n}', description: 'Class declaration' },
        { prefix: 'if', body: 'if (condition) {\n  \n}', description: 'If statement' },
        { prefix: 'for', body: 'for (let i = 0; i < length; i++) {\n  \n}', description: 'For loop' },
        { prefix: 'foreach', body: 'array.forEach((item) => {\n  \n});', description: 'ForEach loop' },
        { prefix: 'try', body: 'try {\n  \n} catch (error) {\n  \n}', description: 'Try-catch block' },
      ],
      [LANGUAGE_HTML]: [
        {
          prefix: 'html5',
          body: '<!DOCTYPE html>\n<html lang="ko">\n<head>\n  <meta charset="UTF-8">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>',
          description: 'HTML5 template',
        },
        { prefix: 'div', body: '<div></div>', description: 'Div element' },
      ],
      [LANGUAGE_CSS]: [],
      [LANGUAGE_MARKDOWN]: [],
    };
  }
}
