/**
 * 파일: src/tests/unit/services/SearchService.test.js
 * 기능: SearchService 단위 테스트
 */

import SearchService from '../../../services/search/SearchService.js';
import { TestRunner, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('SearchService', () => {
  let service;

  runner.beforeEach(() => {
    service = new SearchService();
    service.initialize();
  });

  // 기본 검색
  runner.it('should search plain text', () => {
    const text = 'Hello world\nHello again';
    const results = service.search(text, 'Hello');

    expect(results.length).toBe(2);
    expect(results[0].line).toBe(0);
    expect(results[0].column).toBe(0);
    expect(results[1].line).toBe(1);
  });

  runner.it('should return empty array for no matches', () => {
    const text = 'Hello world';
    const results = service.search(text, 'xyz');
    expect(results.length).toBe(0);
  });

  // 대소문자 구분
  runner.it('should respect case sensitivity', () => {
    const text = 'Hello HELLO hello';
    const results = service.search(text, 'hello', { caseSensitive: true });
    expect(results.length).toBe(1);
  });

  runner.it('should ignore case when caseSensitive is false', () => {
    const text = 'Hello HELLO hello';
    const results = service.search(text, 'hello', { caseSensitive: false });
    expect(results.length).toBe(3);
  });

  // 단어 단위 검색
  runner.it('should search whole word only', () => {
    const text = 'hello helloworld world';
    const results = service.search(text, 'hello', { wholeWord: true });
    expect(results.length).toBe(1);
    expect(results[0].column).toBe(0);
  });

  runner.it('should match partial words when wholeWord is false', () => {
    const text = 'hello helloworld world';
    const results = service.search(text, 'hello', { wholeWord: false });
    expect(results.length).toBe(2);
  });

  // 정규식 검색
  runner.it('should search with regex', () => {
    const text = 'test123 test456';
    const results = service.search(text, 'test\\d+', { regex: true });
    expect(results.length).toBe(2);
  });

  runner.it('should validate regex pattern', () => {
    const valid = service.validateRegex('test\\d+');
    expect(valid.valid).toBe(true);

    const invalid = service.validateRegex('[invalid');
    expect(invalid.valid).toBe(false);
    expect(invalid.error).toBeDefined();
  });

  // 바꾸기
  runner.it('should replace one occurrence', () => {
    const text = 'line1\ntest\nline3';
    const result = { line: 1, column: 0, length: 4 };
    const newText = service.replaceOne(text, result, 'replaced');

    expect(newText).toBe('line1\nreplaced\nline3');
  });

  runner.it('should replace all occurrences', () => {
    const text = 'test test test';
    const result = service.replace(text, 'test', 'replaced');

    expect(result.count).toBe(3);
    expect(result.newText).toBe('replaced replaced replaced');
  });

  runner.it('should replace with regex', () => {
    const text = 'test123 test456';
    const result = service.replace(text, 'test\\d+', 'num', { regex: true });

    expect(result.count).toBe(2);
    expect(result.newText).toBe('num num');
  });

  runner.it('should handle no matches in replace', () => {
    const text = 'hello world';
    const result = service.replace(text, 'xyz', 'replaced');

    expect(result.count).toBe(0);
    expect(result.newText).toBe('hello world');
  });

  // 마지막 검색 정보
  runner.it('should store last search', () => {
    service.search('test', 'query', { caseSensitive: true });
    const last = service.getLastSearch();

    expect(last.query).toBe('query');
    expect(last.options.caseSensitive).toBe(true);
  });

  runner.it('should clear last search', () => {
    service.search('test', 'query');
    service.clearLastSearch();
    expect(service.getLastSearch()).toBe(null);
  });

  // 복잡한 시나리오
  runner.it('should handle multiline text', () => {
    const text = 'line1\nline2\nline3\nline1 again';
    const results = service.search(text, 'line1');

    expect(results.length).toBe(2);
    expect(results[0].line).toBe(0);
    expect(results[1].line).toBe(3);
  });

  runner.it('should handle special characters in plain search', () => {
    const text = 'function() { return; }';
    const results = service.search(text, '()');
    expect(results.length).toBe(1);
  });

  // 검증
  runner.it('should validate parameters', () => {
    expect(() => service.search(null, 'query')).toThrow();
    expect(() => service.search('text', '')).toThrow();
  });

  // 종료
  runner.it('should destroy cleanly', () => {
    service.destroy();
    expect(service.is_initialized).toBe(false);
    expect(service.last_search).toBe(null);
  });
});

runner.run();
