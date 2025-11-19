/**
 * 파일: src/tests/unit/services/LinterService.test.js
 * 기능: LinterService 단위 테스트
 */

import { LANGUAGE_JAVASCRIPT } from '../../../constants/Languages.js';
import Document from '../../../models/Document.js';
import FileNode from '../../../models/FileNode.js';
import LinterService, { SEVERITY_ERROR, SEVERITY_INFO, SEVERITY_WARNING } from '../../../services/editor/LinterService.js';
import { TestRunner, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('LinterService', () => {
  let service;
  let document;

  runner.beforeEach(() => {
    service = new LinterService();
    service.initialize();

    const fileNode = new FileNode('test.js', '/test.js', 'file');
    document = new Document(fileNode, '');
  });

  // 초기화
  runner.it('should initialize with rules', () => {
    expect(service.is_initialized).toBe(true);
    expect(service.rules.size).toBeGreaterThan(0);
  });

  // 괄호 검증
  runner.it('should detect unclosed brackets', () => {
    document.setText('function test() {\n  if (true {\n}');
    const errors = service.lint(document, LANGUAGE_JAVASCRIPT);

    const bracketErrors = errors.filter((e) => e.rule === 'unclosed-bracket');
    expect(bracketErrors.length).toBeGreaterThan(0);
  });

  runner.it('should detect mismatched brackets', () => {
    document.setText('function test() {\n  const arr = [1, 2, 3);\n}');
    const errors = service.lint(document, LANGUAGE_JAVASCRIPT);

    const bracketErrors = errors.filter((e) => e.rule === 'unclosed-bracket');
    expect(bracketErrors.length).toBeGreaterThan(0);
  });

  runner.it('should pass for valid brackets', () => {
    document.setText('function test() {\n  const arr = [1, 2, 3];\n}');
    const errors = service.lint(document, LANGUAGE_JAVASCRIPT);

    const bracketErrors = errors.filter((e) => e.rule === 'unclosed-bracket');
    expect(bracketErrors.length).toBe(0);
  });

  // 미정의 변수 검증
  runner.it('should detect undefined variables', () => {
    document.setText('const x = 1;\nconst y = z;');
    const errors = service.lint(document, LANGUAGE_JAVASCRIPT);

    const undefinedErrors = errors.filter((e) => e.rule === 'undefined-variable');
    expect(undefinedErrors.length).toBeGreaterThan(0);
    expect(undefinedErrors[0].message).toContain('z');
  });

  runner.it('should ignore defined variables', () => {
    document.setText('const x = 1;\nconst y = x;');
    const errors = service.lint(document, LANGUAGE_JAVASCRIPT);

    const undefinedErrors = errors.filter((e) => e.rule === 'undefined-variable');
    expect(undefinedErrors.length).toBe(0);
  });

  runner.it('should ignore global variables', () => {
    document.setText('console.log("test");\nwindow.alert("hello");');
    const errors = service.lint(document, LANGUAGE_JAVASCRIPT);

    const undefinedErrors = errors.filter((e) => e.rule === 'undefined-variable');
    expect(undefinedErrors.length).toBe(0);
  });

  // 세미콜론 검증
  runner.it('should detect missing semicolons', () => {
    document.setText('const x = 1\nconst y = 2');
    const errors = service.lint(document, LANGUAGE_JAVASCRIPT);

    const semiErrors = errors.filter((e) => e.rule === 'missing-semicolon');
    expect(semiErrors.length).toBe(2);
  });

  runner.it('should ignore control structures', () => {
    document.setText('if (true) {\n  const x = 1;\n}');
    const errors = service.lint(document, LANGUAGE_JAVASCRIPT);

    const semiErrors = errors.filter((e) => e.rule === 'missing-semicolon' && e.line === 0);
    expect(semiErrors.length).toBe(0);
  });

  // 심각도
  runner.it('should assign correct severity levels', () => {
    document.setText('function test() {\nconst x = z\n');
    const errors = service.lint(document, LANGUAGE_JAVASCRIPT);

    const bracketError = errors.find((e) => e.rule === 'unclosed-bracket');
    expect(bracketError.severity).toBe(SEVERITY_ERROR);

    const undefinedError = errors.find((e) => e.rule === 'undefined-variable');
    expect(undefinedError.severity).toBe(SEVERITY_WARNING);

    const semiError = errors.find((e) => e.rule === 'missing-semicolon');
    expect(semiError.severity).toBe(SEVERITY_INFO);
  });

  // 줄 번호 정렬
  runner.it('should sort errors by line number', () => {
    document.setText('const x = z\nconst y = w\nconst a = b');
    const errors = service.lint(document, LANGUAGE_JAVASCRIPT);

    for (let i = 0; i < errors.length - 1; i++) {
      expect(errors[i].line).toBeLessThanOrEqual(errors[i + 1].line);
    }
  });

  // 규칙 관리
  runner.it('should allow adding custom rules', () => {
    const customRule = {
      name: 'custom-rule',
      check: () => [{ line: 0, column: 0, message: 'Custom error', severity: SEVERITY_ERROR, rule: 'custom-rule' }],
    };

    service.addRule(LANGUAGE_JAVASCRIPT, customRule);
    const errors = service.lint(document, LANGUAGE_JAVASCRIPT);

    expect(errors.some((e) => e.rule === 'custom-rule')).toBe(true);
  });

  runner.it('should allow removing rules', () => {
    const removed = service.removeRule(LANGUAGE_JAVASCRIPT, 'missing-semicolon');
    expect(removed).toBe(true);

    document.setText('const x = 1');
    const errors = service.lint(document, LANGUAGE_JAVASCRIPT);

    expect(errors.some((e) => e.rule === 'missing-semicolon')).toBe(false);
  });

  // 비지원 언어
  runner.it('should return empty for non-JavaScript', () => {
    const errors = service.lint(document, 'unknown');
    expect(errors.length).toBe(0);
  });

  // 검증
  runner.it('should validate parameters', () => {
    expect(() => service.lint(null, LANGUAGE_JAVASCRIPT)).toThrow();
    expect(() => service.lint(document, '')).toThrow();
  });

  // 종료
  runner.it('should destroy cleanly', () => {
    service.destroy();
    expect(service.is_initialized).toBe(false);
    expect(service.rules.size).toBe(0);
  });
});

runner.run();
