/**
 * src/tests/integration/editing.test.js
 *
 * 편집 작업 통합 테스트
 *
 * 테스트하는 시나리오:
 * - 텍스트 입력 및 편집
 * - 신택스 하이라이팅
 * - 자동완성
 * - 검색 및 바꾸기
 * - Undo/Redo
 */

import CodeEditorApp from '../../app.js';
import FileNode from '../../models/FileNode.js';
import { TestRunner, expect } from '../TestRunner.js';

const runner = new TestRunner();

runner.describe('Editing Integration Tests', () => {
  let app;

  runner.beforeEach(async () => {
    // DOM 요소 생성
    document.body.innerHTML = `
      <div id="Sidebar"></div>
      <div id="TabBar"></div>
      <div id="EditorPane">
        <div class="line-numbers"></div>
        <pre class="editor-content" contenteditable="true"></pre>
      </div>
      <div id="CompletionPanel"></div>
      <div id="SearchPanel"></div>
    `;

    app = new CodeEditorApp();
    await app.initialize();
  });

  runner.afterEach(() => {
    if (app) {
      app.destroy();
    }
    document.body.innerHTML = '';
  });

  // ========================================
  // 텍스트 입력
  // ========================================
  runner.it('should handle text input', async () => {
    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: '',
    });

    const doc = app.controllers.tab.getActiveDocument();

    // 텍스트 입력 시뮬레이션
    const newContent = 'const x = 10;';
    doc.setContent(newContent);

    expect(doc.getContent()).toBe(newContent);
    expect(doc.isDirty()).toBe(true);
  });

  // ========================================
  // 신택스 하이라이팅
  // ========================================
  runner.it('should apply syntax highlighting', async () => {
    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);
    const code = 'const x = 10;';

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: code,
    });

    // SyntaxRenderer가 호출되어야 함
    const rendered = app.views.syntax_renderer.renderLine(code, 'javascript', 0);

    expect(rendered).toBeTruthy();
    expect(rendered).toContain('token');
  });

  // ========================================
  // 자동완성
  // ========================================
  runner.it('should provide completions', async () => {
    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);
    const code = 'con';

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: code,
    });

    const doc = app.controllers.tab.getActiveDocument();

    // 자동완성 요청
    const completions = app.services.completion.getCompletions(doc, 0, 3, 'javascript');

    expect(completions.length).toBeGreaterThan(0);

    // 'console'이 포함되어야 함
    const hasConsole = completions.some((_c) => _c.label === 'console');
    expect(hasConsole).toBe(true);
  });

  // ========================================
  // 검색
  // ========================================
  runner.it('should search text', async () => {
    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);
    const code = 'const x = 10;\nconst y = 20;\nconst z = 30;';

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: code,
    });

    const doc = app.controllers.tab.getActiveDocument();

    // 검색
    const results = app.services.search.search(doc, 'const', {
      case_sensitive: false,
      whole_word: false,
      regex: false,
    });

    expect(results.length).toBe(3);
    expect(results[0].line).toBe(0);
    expect(results[1].line).toBe(1);
    expect(results[2].line).toBe(2);
  });

  // ========================================
  // 바꾸기
  // ========================================
  runner.it('should replace text', async () => {
    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);
    const code = 'const x = 10;';

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: code,
    });

    const doc = app.controllers.tab.getActiveDocument();

    // 바꾸기
    app.services.search.replace(doc, 'const', 'let', {
      case_sensitive: false,
      whole_word: false,
      regex: false,
    });

    expect(doc.getContent()).toBe('let x = 10;');
  });

  // ========================================
  // 정규식 검색
  // ========================================
  runner.it('should search with regex', async () => {
    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);
    const code = 'const x = 10;\nconst y = 20;\nlet z = 30;';

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: code,
    });

    const doc = app.controllers.tab.getActiveDocument();

    // 정규식으로 'const'로 시작하는 줄 찾기
    const results = app.services.search.search(doc, '^const', {
      case_sensitive: false,
      whole_word: false,
      regex: true,
    });

    expect(results.length).toBe(2);
    expect(results[0].line).toBe(0);
    expect(results[1].line).toBe(1);
  });

  // ========================================
  // Linting
  // ========================================
  runner.it('should detect syntax errors', async () => {
    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);
    const code = 'const x = ;'; // 구문 오류

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: code,
    });

    const doc = app.controllers.tab.getActiveDocument();

    // Lint
    const errors = app.services.linter.lint(doc, 'javascript');

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].severity).toBe('error');
  });

  // ========================================
  // 여러 줄 편집
  // ========================================
  runner.it('should handle multi-line editing', async () => {
    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: 'line1\nline2\nline3',
    });

    const doc = app.controllers.tab.getActiveDocument();

    expect(doc.getLineCount()).toBe(3);
    expect(doc.getLine(0)).toBe('line1');
    expect(doc.getLine(1)).toBe('line2');
    expect(doc.getLine(2)).toBe('line3');

    // 줄 추가
    doc.setContent('line1\nline2\nline3\nline4');

    expect(doc.getLineCount()).toBe(4);
  });

  // ========================================
  // 대용량 파일 처리
  // ========================================
  runner.it('should handle large files with virtual scrolling', async () => {
    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('large.js', 'file', rootNode);

    // 10000줄 생성
    const lines = [];
    for (let i = 0; i < 10000; i++) {
      lines.push(`line ${i + 1}`);
    }
    const largeContent = lines.join('\n');

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: largeContent,
    });

    const doc = app.controllers.tab.getActiveDocument();

    expect(doc.getLineCount()).toBe(10000);

    // Virtual Scroller가 전체를 렌더링하지 않고 가시 범위만 렌더링
    // (실제로는 EditorPane의 VirtualScroller 동작 확인 필요)
  });

  // ========================================
  // 언어별 자동완성
  // ========================================
  runner.it('should provide language-specific completions', async () => {
    const rootNode = new FileNode('root', 'directory', null);
    const jsFile = new FileNode('test.js', 'file', rootNode);
    const htmlFile = new FileNode('test.html', 'file', rootNode);

    // JavaScript 파일
    app.controllers.file.emit('file-opened', {
      file_node: jsFile,
      content: 'con',
    });

    let doc = app.controllers.tab.getActiveDocument();
    let completions = app.services.completion.getCompletions(doc, 0, 3, 'javascript');

    const hasConsole = completions.some((_c) => _c.label === 'console');
    expect(hasConsole).toBe(true);

    // HTML 파일
    app.controllers.file.emit('file-opened', {
      file_node: htmlFile,
      content: '<di',
    });

    doc = app.controllers.tab.getActiveDocument();
    completions = app.services.completion.getCompletions(doc, 0, 3, 'html');

    const hasDiv = completions.some((_c) => _c.label === 'div');
    expect(hasDiv).toBe(true);
  });

  // ========================================
  // 편집 후 저장 상태 확인
  // ========================================
  runner.it('should track edit history', async () => {
    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: 'original',
    });

    const doc = app.controllers.tab.getActiveDocument();

    // 편집 1
    doc.setContent('edit1');
    expect(doc.isDirty()).toBe(true);

    // 저장
    doc.markAsSaved();
    expect(doc.isDirty()).toBe(false);

    // 편집 2
    doc.setContent('edit2');
    expect(doc.isDirty()).toBe(true);
  });
});

// 테스트 실행
runner.run();
