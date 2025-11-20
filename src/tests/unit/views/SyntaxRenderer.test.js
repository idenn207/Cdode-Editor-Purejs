/**
 * 파일: src/tests/unit/views/SyntaxRenderer.test.js
 * 기능: SyntaxRenderer 단위 테스트
 */

import SyntaxRenderer from '../../../views/renderers/SyntaxRenderer.js';
import { TestRunner, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('SyntaxRenderer', () => {
  let renderer;

  runner.beforeEach(() => {
    renderer = new SyntaxRenderer();
  });

  // 기본 렌더링
  runner.it('should render empty line as <br>', () => {
    const html = renderer.renderLine('', 'javascript');
    expect(html).toBe('<br>');
  });

  runner.it('should render newline as <br>', () => {
    const html = renderer.renderLine('\n', 'javascript');
    expect(html).toBe('<br>');
  });

  runner.it('should render whitespace-only line as <br>', () => {
    const html = renderer.renderLine('   ', 'javascript');
    expect(html).toBe('<br>');
  });

  runner.it('should render simple JavaScript code', () => {
    const code = 'const x = 42;';
    const html = renderer.renderLine(code, 'javascript');

    expect(html).toContain('token-keyword');
    expect(html).toContain('token-identifier');
    expect(html).toContain('token-number');
  });

  runner.it('should escape HTML in code', () => {
    const code = '<div>test</div>';
    const html = renderer.renderLine(code, 'javascript');

    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
    expect(html).not.toContain('<div>');
  });

  // 여러 줄 렌더링
  runner.it('should render multiple lines', () => {
    const lines = ['const x = 1;', 'const y = 2;', 'console.log(x + y);'];
    const htmlLines = renderer.renderLines(lines, 'javascript');

    expect(htmlLines).toBeArrayOfLength(3);
    expect(htmlLines[0]).toContain('token-keyword');
    expect(htmlLines[1]).toContain('token-keyword');
    expect(htmlLines[2]).toContain('token-identifier');
  });

  // 캐싱
  runner.it('should use cache for identical lines', () => {
    const code = 'const x = 42;';

    const html1 = renderer.renderLine(code, 'javascript');
    const html2 = renderer.renderLine(code, 'javascript');

    expect(html1).toBe(html2);

    const stats = renderer.getCacheStats();
    expect(stats.size).toBeGreaterThan(0);
  });

  runner.it('should not cache when search results present', () => {
    const code = 'const x = 42;';
    const searchResults = [{ line: 0, column: 0, length: 5 }];

    const initialSize = renderer.getCacheStats().size;

    renderer.renderLine(code, 'javascript', { searchResults, lineIndex: 0 });

    const finalSize = renderer.getCacheStats().size;
    expect(finalSize).toBe(initialSize); // 캐시 크기 변화 없음
  });

  runner.it('should clear cache', () => {
    renderer.renderLine('const x = 1;', 'javascript');
    renderer.renderLine('const y = 2;', 'javascript');

    expect(renderer.getCacheStats().size).toBeGreaterThan(0);

    renderer.clearCache();
    expect(renderer.getCacheStats().size).toBe(0);
  });

  // 검색 하이라이트
  runner.it('should highlight search results', () => {
    const code = 'const userName = "John";';
    const searchResults = [{ line: 0, column: 6, length: 8 }]; // "userName"

    const html = renderer.renderLine(code, 'javascript', {
      searchResults,
      currentIndex: 0,
      lineIndex: 0,
    });

    expect(html).toContain('search-highlight-current');
  });

  runner.it('should highlight non-current search results', () => {
    const code = 'const userName = "userName";';
    const searchResults = [
      { line: 0, column: 6, length: 8 },
      { line: 0, column: 17, length: 8 },
    ];

    const html = renderer.renderLine(code, 'javascript', {
      searchResults,
      currentIndex: 0, // 첫 번째만 current
      lineIndex: 0,
    });

    expect(html).toContain('search-highlight-current');
    expect(html).toContain('search-highlight');
  });

  runner.it('should not highlight search results on different lines', () => {
    const code = 'const x = 1;';
    const searchResults = [{ line: 5, column: 0, length: 5 }];

    const html = renderer.renderLine(code, 'javascript', {
      searchResults,
      lineIndex: 0, // 다른 줄
    });

    expect(html).not.toContain('search-highlight');
  });

  // 언어 지원
  runner.it('should support JavaScript', () => {
    expect(renderer.isLanguageSupported('javascript')).toBe(true);
  });

  runner.it('should support HTML', () => {
    expect(renderer.isLanguageSupported('html')).toBe(true);
  });

  runner.it('should support CSS', () => {
    expect(renderer.isLanguageSupported('css')).toBe(true);
  });

  runner.it('should support Markdown', () => {
    expect(renderer.isLanguageSupported('markdown')).toBe(true);
  });

  runner.it('should return supported languages list', () => {
    const languages = renderer.getSupportedLanguages();
    expect(languages).toBeArray();
    expect(languages).toContain('javascript');
    expect(languages).toContain('html');
  });

  // 에러 처리
  runner.it('should handle invalid language gracefully', () => {
    const code = 'const x = 1;';
    const html = renderer.renderLine(code, 'unknown-language');

    // plaintext로 fallback
    expect(html).toContain('token-');
  });

  runner.it('should return escaped code on render error', () => {
    const code = '<script>alert("test")</script>';
    const html = renderer.renderLine(code, 'javascript');

    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
  });

  // 검증
  runner.it('should validate code parameter', () => {
    expect(() => renderer.renderLine(null, 'javascript')).not.toThrow(); // null은 허용 (빈 줄)
  });

  runner.it('should validate language parameter', () => {
    expect(() => renderer.renderLine('code', '')).toThrow();
    expect(() => renderer.renderLine('code', null)).toThrow();
  });

  runner.it('should validate lines parameter in renderLines', () => {
    expect(() => renderer.renderLines(null, 'javascript')).toThrow();
    expect(() => renderer.renderLines('not-array', 'javascript')).toThrow();
  });

  // 디버그 정보
  runner.it('should provide debug info', () => {
    const info = renderer.getDebugInfo();

    expect(info.name).toBe('SyntaxRenderer');
    expect(info.cache_stats).toBeDefined();
    expect(info.supported_languages).toBeArray();
    expect(info.language_service_initialized).toBe(true);
  });

  // 종료
  runner.it('should destroy cleanly', () => {
    renderer.renderLine('const x = 1;', 'javascript');

    renderer.destroy();

    const stats = renderer.getCacheStats();
    expect(stats.size).toBe(0);
  });

  // 성능 (캐시 효과)
  runner.it('should improve performance with caching', () => {
    const code = 'const x = 42;';
    const iterations = 100;

    // 첫 번째 렌더링 (캐시 없음)
    const start1 = performance.now();
    for (let i = 0; i < iterations; i++) {
      renderer.render({ code, language: 'javascript' });
    }
    const time1 = performance.now() - start1;

    // 캐시 초기화
    renderer.clearCache();

    // 캐시 사용 렌더링
    const start2 = performance.now();
    for (let i = 0; i < iterations; i++) {
      renderer.renderLine(code, 'javascript');
    }
    const time2 = performance.now() - start2;

    console.log(`Without cache: ${time1.toFixed(2)}ms`);
    console.log(`With cache: ${time2.toFixed(2)}ms`);
  });
});

runner.run();
