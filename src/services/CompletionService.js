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
export const COMPLETION_KIND_IMPORT = 'import';

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
    /** @description 빈 prefix 도 자동완성 패널 활성화 */
    // if (!prefix || prefix.length < 1) {
    //   return [];
    // }

    const completions = [];

    // 1. Import 항목
    const imports = this.#getImportCompletions(_document, _language, prefix);
    completions.push(...imports);

    // 2. 키워드
    const keywords = this.#getKeywordCompletions(_language, prefix);
    completions.push(...keywords);

    // 3. 사용자 정의 심볼
    const symbols = this.#getSymbolCompletions(_document, _language, prefix, _line);
    completions.push(...symbols);

    // 4. 코드 스니펫
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

    const members = [];
    const seen = new Set();

    // 객체 리터럴 찾기: const obj = { prop: value, method() {} }
    const objLiteralPattern = new RegExp(`\\b${_objectName}\\s*=\\s*\\{([^}]+)\\}`, 'g');

    let match;
    while ((match = objLiteralPattern.exec(text)) !== null) {
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

    while ((match = dotPropPattern.exec(text)) !== null) {
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
    const classMatch = scopeText.match(/\bclass\s+([a-zA-Z_$][\w$]*)\s*(?:extends\s+([a-zA-Z_$][\w$]*))?\s*\{/g);
    if (!classMatch) return [];
    const nowClass = classMatch[classMatch.length - 1].split(' ')[1];
    const classText = this.#extractClassDefinition(text, nowClass);

    // this.property = value
    const propertyPattern = /\bthis\.([a-zA-Z_#$][a-zA-Z0-9_$]*)\s*=/g;
    let match;
    while ((match = propertyPattern.exec(classText)) !== null) {
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
    const methodPattern = /^\s*([a-zA-Z_#$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/gm;
    while ((match = methodPattern.exec(classText)) !== null) {
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

    const symbols = [];
    const seen = new Set();

    if (_language === LANGUAGE_JAVASCRIPT) {
      // 1. 변수 (우선순위 1)
      const varPattern = /\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
      let match;
      while ((match = varPattern.exec(text)) !== null) {
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
      while ((match = funcPattern.exec(text)) !== null) {
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
      while ((match = classPattern.exec(text)) !== null) {
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
      while ((match = arrowPattern.exec(text)) !== null) {
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
   * 클래스 블록 추출
   */
  #extractClassDefinition(text, className) {
    const regex = new RegExp(`class\\s+${className}\\s*(?:extends\\s+[a-zA-Z_$][\\w$]*)?\\s*\\{`, 'g');

    const match = regex.exec(text);
    if (!match) return null;

    let depth = 0;
    let start = match.index;
    let inString = false;
    let stringChar = '';
    let escaped = false;

    for (let i = match.index; i < text.length; i++) {
      const char = text[i];
      const prevChar = i > 0 ? text[i - 1] : '';

      // 문자열 처리
      if ((char === '"' || char === "'" || char === '`') && !escaped) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      escaped = char === '\\' && !escaped;

      // 문자열 내부가 아닐 때만 중괄호 카운팅
      if (!inString) {
        if (char === '{') depth++;
        if (char === '}') {
          depth--;
          if (depth === 0) {
            return text.substring(start, i + 1);
          }
        }
      }
    }

    return null;
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
   * import 자동완성
   */
  #getImportCompletions(_document, _language, _prefix) {
    if (_language !== LANGUAGE_JAVASCRIPT) return [];

    const text = _document.getText();
    const imports = [];
    const seen = new Set();

    // 1. Named imports: import { foo, bar } from 'module'
    const namedImportPattern = /import\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"]/g;
    let match;
    while ((match = namedImportPattern.exec(text)) !== null) {
      const importList = match[1];
      // 각 import 항목 파싱 (쉼표로 구분)
      const items = importList.split(',').map((_item) => _item.trim());

      items.forEach((_item) => {
        // "as" 별칭 처리: import { foo as bar }
        const asMatch = _item.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
        let name;

        if (asMatch) {
          name = asMatch[2]; // 별칭 사용
        } else {
          name = _item.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/)?.[0];
        }

        if (name && !seen.has(name) && name.toLowerCase().startsWith(_prefix.toLowerCase())) {
          imports.push({
            label: name,
            kind: COMPLETION_KIND_IMPORT,
            insertText: name,
            detail: 'Import',
            sortText: `0_${name}`, // 높은 우선순위
          });
          seen.add(name);
        }
      });
    }

    // 2. Default imports: import foo from 'module'
    const defaultImportPattern = /import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s+['"][^'"]+['"]/g;
    while ((match = defaultImportPattern.exec(text)) !== null) {
      const name = match[1];
      if (!seen.has(name) && name.toLowerCase().startsWith(_prefix.toLowerCase())) {
        imports.push({
          label: name,
          kind: COMPLETION_KIND_IMPORT,
          insertText: name,
          detail: 'Import (default)',
          sortText: `0_${name}`,
        });
        seen.add(name);
      }
    }

    // 3. Namespace imports: import * as foo from 'module'
    const namespaceImportPattern = /import\s+\*\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s+['"][^'"]+['"]/g;
    while ((match = namespaceImportPattern.exec(text)) !== null) {
      const name = match[1];
      if (!seen.has(name) && name.toLowerCase().startsWith(_prefix.toLowerCase())) {
        imports.push({
          label: name,
          kind: COMPLETION_KIND_IMPORT,
          insertText: name,
          detail: 'Import (namespace)',
          sortText: `0_${name}`,
        });
        seen.add(name);
      }
    }

    // 4. Mixed imports: import foo, { bar, baz } from 'module'
    const mixedImportPattern = /import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*,\s*\{([^}]+)\}\s+from\s+['"][^'"]+['"]/g;
    while ((match = mixedImportPattern.exec(text)) !== null) {
      // Default import
      const defaultName = match[1];
      if (!seen.has(defaultName) && defaultName.toLowerCase().startsWith(_prefix.toLowerCase())) {
        imports.push({
          label: defaultName,
          kind: COMPLETION_KIND_IMPORT,
          insertText: defaultName,
          detail: 'Import (default)',
          sortText: `0_${defaultName}`,
        });
        seen.add(defaultName);
      }

      // Named imports
      const namedList = match[2];
      const items = namedList.split(',').map((_item) => _item.trim());

      items.forEach((_item) => {
        const asMatch = _item.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
        let name;

        if (asMatch) {
          name = asMatch[2];
        } else {
          name = _item.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/)?.[0];
        }

        if (name && !seen.has(name) && name.toLowerCase().startsWith(_prefix.toLowerCase())) {
          imports.push({
            label: name,
            kind: COMPLETION_KIND_IMPORT,
            insertText: name,
            detail: 'Import',
            sortText: `0_${name}`,
          });
          seen.add(name);
        }
      });
    }

    return imports;
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
      [COMPLETION_KIND_IMPORT]: 'Import',
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
