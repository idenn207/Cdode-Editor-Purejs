/**
 * 파일: src/services/editor/LinterService.js
 * 기능: 코드 오류 검증
 * 책임: JavaScript 기본 문법 오류 감지
 */

import { LANGUAGE_JAVASCRIPT } from '../../constants/Languages.js';
import BaseService from '../../core/BaseService.js';

/**
 * 에러 심각도
 */
export const SEVERITY_ERROR = 'error';
export const SEVERITY_WARNING = 'warning';
export const SEVERITY_INFO = 'info';

export default class LinterService extends BaseService {
  constructor() {
    super();
    this.rules = new Map();
  }

  /**
   * 초기화
   */
  initialize() {
    this.#initializeRules();
    this.is_initialized = true;
  }

  /**
   * 문서 검증
   */
  lint(_document, _language) {
    this.validateRequired(_document, 'document');
    this.validateNonEmptyString(_language, 'language');

    try {
      if (_language !== LANGUAGE_JAVASCRIPT) {
        return [];
      }

      const text = _document.getText();
      const lines = text.split('\n');
      const errors = [];

      // 각 규칙 실행
      const rules = this.rules.get(_language) || [];
      for (const rule of rules) {
        const rule_errors = rule.check(lines, text);
        errors.push(...rule_errors);
      }

      // 줄 번호 순 정렬
      errors.sort((a, b) => a.line - b.line);

      return errors;
    } catch (error) {
      this.handleError(error, 'lint');
      return [];
    }
  }

  /**
   * 규칙 초기화 (private)
   */
  #initializeRules() {
    const js_rules = [
      {
        name: 'unclosed-bracket',
        check: this.#checkUnclosedBrackets.bind(this),
      },
      {
        name: 'undefined-variable',
        check: this.#checkUndefinedVariables.bind(this),
      },
      {
        name: 'missing-semicolon',
        check: this.#checkMissingSemicolons.bind(this),
      },
    ];

    this.rules.set(LANGUAGE_JAVASCRIPT, js_rules);
  }

  /**
   * 괄호 짝 검증 (private)
   */
  #checkUnclosedBrackets(_lines, _text) {
    const errors = [];
    const stack = [];
    const pairs = {
      '(': ')',
      '[': ']',
      '{': '}',
    };
    const open_brackets = Object.keys(pairs);
    const close_brackets = Object.values(pairs);

    for (let line_num = 0; line_num < _lines.length; line_num++) {
      const line = _lines[line_num];

      for (let col = 0; col < line.length; col++) {
        const char = line[col];

        if (open_brackets.includes(char)) {
          stack.push({ char, line: line_num, column: col });
        } else if (close_brackets.includes(char)) {
          if (stack.length === 0) {
            errors.push({
              line: line_num,
              column: col,
              message: `Unexpected closing bracket '${char}'`,
              severity: SEVERITY_ERROR,
              rule: 'unclosed-bracket',
            });
            continue;
          }

          const last = stack[stack.length - 1];
          if (pairs[last.char] === char) {
            stack.pop();
          } else {
            errors.push({
              line: line_num,
              column: col,
              message: `Mismatched bracket: expected '${pairs[last.char]}' but found '${char}'`,
              severity: SEVERITY_ERROR,
              rule: 'unclosed-bracket',
            });
          }
        }
      }
    }

    // 열린 괄호만 있는 경우
    for (const unclosed of stack) {
      errors.push({
        line: unclosed.line,
        column: unclosed.column,
        message: `Unclosed bracket '${unclosed.char}'`,
        severity: SEVERITY_ERROR,
        rule: 'unclosed-bracket',
      });
    }

    return errors;
  }

  /**
   * 미정의 변수 검증 (private)
   */
  #checkUndefinedVariables(_lines, _text) {
    const errors = [];
    const defined = new Set(['console', 'window', 'document', 'Math', 'JSON', 'Object', 'Array']);

    // 선언된 변수 수집
    const var_pattern = /\b(?:const|let|var|function|class)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let match;
    while ((match = var_pattern.exec(_text)) !== null) {
      defined.add(match[1]);
    }

    // 함수 파라미터 수집
    const param_pattern = /function\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(([^)]*)\)/g;
    while ((match = param_pattern.exec(_text)) !== null) {
      const params = match[1].split(',').map((p) => p.trim());
      for (const param of params) {
        if (param) {
          const param_name = param.split('=')[0].trim();
          defined.add(param_name);
        }
      }
    }

    // 사용된 변수 확인
    for (let line_num = 0; line_num < _lines.length; line_num++) {
      const line = _lines[line_num];

      // 변수 사용 패턴
      const usage_pattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\(|\.|\[|;|,|\)|}|$)/g;
      while ((match = usage_pattern.exec(line)) !== null) {
        const var_name = match[1];

        // 키워드는 제외
        const keywords = ['if', 'else', 'for', 'while', 'return', 'import', 'export', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'super'];
        if (keywords.includes(var_name)) continue;

        if (!defined.has(var_name)) {
          errors.push({
            line: line_num,
            column: match.index,
            message: `'${var_name}' is not defined`,
            severity: SEVERITY_WARNING,
            rule: 'undefined-variable',
          });
        }
      }
    }

    return errors;
  }

  /**
   * 세미콜론 누락 검증 (private)
   */
  #checkMissingSemicolons(_lines, _text) {
    const errors = [];

    for (let line_num = 0; line_num < _lines.length; line_num++) {
      const line = _lines[line_num].trim();

      // 빈 줄, 주석, 블록 시작/끝은 제외
      if (!line || line.startsWith('//') || line.startsWith('/*') || line.endsWith('{') || line.endsWith('}')) {
        continue;
      }

      // 제어문은 제외
      if (/^(if|else|for|while|function|class|try|catch)\b/.test(line)) {
        continue;
      }

      // 세미콜론 누락 확인
      if (!line.endsWith(';') && !line.endsWith(',') && !line.endsWith(')')) {
        errors.push({
          line: line_num,
          column: line.length,
          message: 'Missing semicolon',
          severity: SEVERITY_INFO,
          rule: 'missing-semicolon',
        });
      }
    }

    return errors;
  }

  /**
   * 규칙 추가 (확장성)
   */
  addRule(_language, _rule) {
    this.validateNonEmptyString(_language, 'language');
    this.validateRequired(_rule, 'rule');
    this.validateRequired(_rule.name, 'rule.name');
    this.validateFunction(_rule.check, 'rule.check');

    if (!this.rules.has(_language)) {
      this.rules.set(_language, []);
    }

    this.rules.get(_language).push(_rule);
  }

  /**
   * 규칙 제거
   */
  removeRule(_language, _ruleName) {
    this.validateNonEmptyString(_language, 'language');
    this.validateNonEmptyString(_ruleName, 'ruleName');

    if (!this.rules.has(_language)) return false;

    const rules = this.rules.get(_language);
    const index = rules.findIndex((r) => r.name === _ruleName);

    if (index !== -1) {
      rules.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * 서비스 종료
   */
  destroy() {
    this.rules.clear();
    this.is_initialized = false;
    super.destroy();
  }
}
