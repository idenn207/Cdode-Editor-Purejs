/**
 * 파일: src/tests/unit/services/CompletionService.test.js
 * 기능: CompletionService 단위 테스트
 */

import { LANGUAGE_JAVASCRIPT } from '../../../constants/Languages.js';
import Document from '../../../models/Document.js';
import FileNode from '../../../models/FileNode.js';
import CompletionService from '../../../services/editor/CompletionService.js';
import { TestRunner, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('CompletionService', () => {
  let service;
  let document;

  runner.beforeEach(() => {
    service = new CompletionService();
    service.initialize();

    const fileNode = new FileNode('test.js', '/test.js', 'file');
    document = new Document(fileNode, 'const myVar = 123;\nfunction myFunc() {}');
  });

  // 초기화
  runner.it('should initialize with keywords and snippets', () => {
    expect(service.is_initialized).toBe(true);
    expect(service.keywords_cache.size).toBeGreaterThan(0);
    expect(service.snippets_cache.size).toBeGreaterThan(0);
  });

  // 키워드 자동완성
  runner.it('should suggest JavaScript keywords', () => {
    const completions = service.getCompletions(document, 0, 0, LANGUAGE_JAVASCRIPT);
    const keywords = completions.filter((c) => c.kind === 'keyword');
    expect(keywords.length).toBeGreaterThan(0);
  });

  runner.it('should filter keywords by prefix', () => {
    document.setText('con');
    const completions = service.getCompletions(document, 0, 3, LANGUAGE_JAVASCRIPT);
    const filtered = completions.filter((c) => c.label.startsWith('con'));
    expect(filtered.length).toBeGreaterThan(0);
  });

  // 심볼 자동완성
  runner.it('should suggest user-defined symbols', () => {
    const completions = service.getCompletions(document, 1, 20, LANGUAGE_JAVASCRIPT);
    const symbols = completions.filter((c) => c.kind === 'variable');

    expect(symbols.some((s) => s.label === 'myVar')).toBe(true);
    expect(symbols.some((s) => s.label === 'myFunc')).toBe(true);
  });

  runner.it('should not suggest symbols from current line', () => {
    const completions = service.getCompletions(document, 0, 10, LANGUAGE_JAVASCRIPT);
    const symbols = completions.filter((c) => c.kind === 'variable' && c.label === 'myVar');
    expect(symbols.length).toBe(0);
  });

  // this. 멤버 자동완성
  runner.it('should suggest class members for this.', () => {
    const classCode = 'class MyClass {\n  constructor() {\n    this.prop = 1;\n  }\n  myMethod() {}\n}';
    document.setText(classCode);

    const completions = service.getCompletions(document, 2, 10, LANGUAGE_JAVASCRIPT, true);
    expect(completions.some((c) => c.label === 'prop')).toBe(true);
    expect(completions.some((c) => c.label === 'myMethod()')).toBe(true);
  });

  runner.it('should return empty for this. outside class', () => {
    const completions = service.getCompletions(document, 0, 0, LANGUAGE_JAVASCRIPT, true);
    expect(completions.length).toBe(0);
  });

  // 스니펫 자동완성
  runner.it('should suggest code snippets', () => {
    document.setText('lo');
    const completions = service.getCompletions(document, 0, 2, LANGUAGE_JAVASCRIPT);
    const snippets = completions.filter((c) => c.kind === 'snippet');
    expect(snippets.some((s) => s.label === 'log')).toBe(true);
  });

  // 중복 제거
  runner.it('should deduplicate completions', () => {
    document.setText('const test = 1;\nconst test = 2;');
    const completions = service.getCompletions(document, 1, 10, LANGUAGE_JAVASCRIPT);
    const testVars = completions.filter((c) => c.label === 'test');
    expect(testVars.length).toBe(1);
  });

  // 정렬
  runner.it('should sort completions by score', () => {
    const completions = service.getCompletions(document, 1, 0, LANGUAGE_JAVASCRIPT);

    // 점수가 높은 순으로 정렬되어야 함
    for (let i = 0; i < completions.length - 1; i++) {
      expect(completions[i].score).toBeGreaterThanOrEqual(completions[i + 1].score);
    }
  });

  // 빈 결과
  runner.it('should return empty for short prefix', () => {
    document.setText('');
    const completions = service.getCompletions(document, 0, 0, LANGUAGE_JAVASCRIPT);
    expect(completions.length).toBe(0);
  });

  runner.it('should return empty for non-JavaScript', () => {
    const completions = service.getCompletions(document, 0, 0, 'unknown');
    expect(completions.length).toBe(0);
  });

  // 검증
  runner.it('should validate parameters', () => {
    expect(() => service.getCompletions(null, 0, 0, LANGUAGE_JAVASCRIPT)).toThrow();
    expect(() => service.getCompletions(document, -1, 0, LANGUAGE_JAVASCRIPT)).toThrow();
    expect(() => service.getCompletions(document, 0, 0, '')).toThrow();
  });

  // 종료
  runner.it('should destroy cleanly', () => {
    service.destroy();
    expect(service.is_initialized).toBe(false);
    expect(service.keywords_cache.size).toBe(0);
  });
});

runner.run();
