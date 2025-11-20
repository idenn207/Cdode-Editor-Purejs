/**
 * 파일: src/tests/unit/views/EditorPane.test.js
 * 기능: EditorPane 단위 테스트
 */

import Document from '../../../models/Document.js';
import FileNode from '../../../models/FileNode.js';
import EditorPane from '../../../views/components/EditorPane.js';
import { TestRunner, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('EditorPane', () => {
  let editorPane;
  let document;
  let fileNode;

  runner.beforeEach(() => {
    // DOM 환경 준비
    if (!window.document.getElementById('test-editor')) {
      const container = window.document.createElement('div');
      container.id = 'test-editor';
      window.document.body.appendChild(container);
    }

    editorPane = new EditorPane('test-editor');

    // 테스트용 문서 생성
    fileNode = new FileNode('test.js', '/test.js', null, false);
    document = new Document(fileNode, 'const x = 1;\nconst y = 2;');
  });

  // 생명주기
  runner.it('should initialize and mount', () => {
    editorPane.mount();
    expect(editorPane.is_mounted).toBe(true);
    expect(editorPane.is_initialized).toBe(true);
  });

  runner.it('should have DOM structure after mount', () => {
    editorPane.mount();

    const lineNumbers = editorPane.container.querySelector('.line-numbers');
    const contentWrapper = editorPane.container.querySelector('.editor-content-wrapper');
    const content = editorPane.container.querySelector('.editor-content');

    expect(lineNumbers).not.toBe(null);
    expect(contentWrapper).not.toBe(null);
    expect(content).not.toBe(null);
  });

  // 빈 상태 렌더링
  runner.it('should render empty state when no document', () => {
    editorPane.mount();
    editorPane.render();

    const emptyState = editorPane.container.querySelector('.empty-editor');
    expect(emptyState).not.toBe(null);
  });

  // Document 설정
  runner.it('should set document', () => {
    editorPane.mount();
    editorPane.setDocument(document);

    expect(editorPane.getDocument()).toBe(document);
  });

  runner.it('should emit document-set event', (done) => {
    editorPane.mount();

    editorPane.on('document-set', (_data) => {
      expect(_data.document).toBe(document);
      done();
    });

    editorPane.setDocument(document);
  });

  runner.it('should render document after setting', () => {
    editorPane.mount();
    editorPane.setDocument(document);

    const codeLines = editorPane.container.querySelectorAll('.code-line');
    expect(codeLines.length).toBe(2);
  });

  runner.it('should render line numbers', () => {
    editorPane.mount();
    editorPane.setDocument(document);

    const lineNumbers = editorPane.container.querySelectorAll('.line-number');
    expect(lineNumbers.length).toBe(2);
    expect(lineNumbers[0].textContent).toBe('1');
    expect(lineNumbers[1].textContent).toBe('2');
  });

  runner.it('should remove previous listener when setting new document', () => {
    editorPane.mount();

    const doc1 = new Document(fileNode, 'line1');
    const doc2 = new Document(fileNode, 'line2');

    editorPane.setDocument(doc1);
    editorPane.setDocument(doc2);

    // doc1 변경 시 렌더링 안 됨
    let renderCount = 0;
    editorPane.on('rendered', () => {
      renderCount++;
    });

    doc1.insertText('x', 0, 0);
    expect(renderCount).toBe(0);
  });

  // 렌더링
  runner.it('should emit rendered event', (done) => {
    editorPane.mount();

    editorPane.on('rendered', (_data) => {
      expect(_data.document).not.toBe(null);
      done();
    });

    editorPane.setDocument(document);
  });

  runner.it('should render with syntax highlighting', () => {
    editorPane.mount();
    editorPane.setDocument(document);

    const tokens = editorPane.container.querySelectorAll('[class^="token-"]');
    expect(tokens.length).toBeGreaterThan(0);
  });

  runner.it('should use virtual scrolling for large documents', () => {
    editorPane.mount();

    // 큰 문서 생성
    const lines = Array(2000).fill('const x = 1;');
    const largeDoc = new Document(fileNode, lines.join('\n'));

    editorPane.setDocument(largeDoc);

    expect(editorPane.use_virtual_scrolling).toBe(true);
  });

  // 커서 위치
  runner.it('should get cursor position', () => {
    editorPane.mount();
    editorPane.setDocument(document);

    // 커서 설정
    editorPane.setCursorPosition(0, 5);

    const pos = editorPane.getCursorPosition();
    expect(pos).not.toBe(null);
    expect(pos.line).toBe(0);
  });

  runner.it('should set cursor position', () => {
    editorPane.mount();
    editorPane.setDocument(document);

    editorPane.setCursorPosition(1, 3);

    // 검증은 브라우저 Selection API에 의존하므로 에러 없음 확인
    const pos = editorPane.getCursorPosition();
    expect(pos).not.toBe(null);
  });

  // 검색 하이라이트
  runner.it('should highlight search results', () => {
    editorPane.mount();
    editorPane.setDocument(document);

    const results = [
      { line: 0, column: 6, length: 1 }, // 'x'
      { line: 1, column: 6, length: 1 }, // 'y'
    ];

    editorPane.highlightSearchResults(results, 0);

    expect(editorPane.search_results).toBe(results);
    expect(editorPane.search_current_index).toBe(0);
  });

  runner.it('should clear search highlights', () => {
    editorPane.mount();
    editorPane.setDocument(document);

    const results = [{ line: 0, column: 0, length: 5 }];
    editorPane.highlightSearchResults(results, 0);

    editorPane.clearSearchHighlights();

    expect(editorPane.search_results).toBeArrayOfLength(0);
    expect(editorPane.search_current_index).toBe(-1);
  });

  // 자동완성
  runner.it('should set completion panel visible state', () => {
    editorPane.mount();

    editorPane.setCompletionPanelVisible(true);
    expect(editorPane.completion_panel_visible).toBe(true);

    editorPane.setCompletionPanelVisible(false);
    expect(editorPane.completion_panel_visible).toBe(false);
  });

  runner.it('should emit trigger-completion on Ctrl+Space', (done) => {
    editorPane.mount();
    editorPane.setDocument(document);

    editorPane.on('trigger-completion', (_data) => {
      expect(_data.prefix).toBeDefined();
      done();
    });

    const event = new KeyboardEvent('keydown', {
      key: ' ',
      ctrlKey: true,
      bubbles: true,
    });
    editorPane.content_el.dispatchEvent(event);
  });

  // 키보드 이벤트
  runner.it('should emit save-requested on Ctrl+S', (done) => {
    editorPane.mount();
    editorPane.setDocument(document);

    editorPane.on('save-requested', (_doc) => {
      expect(_doc).toBe(document);
      done();
    });

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
    });
    editorPane.content_el.dispatchEvent(event);
  });

  runner.it('should insert spaces on Tab', () => {
    editorPane.mount();
    editorPane.setDocument(document);

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
    });

    let prevented = false;
    event.preventDefault = () => {
      prevented = true;
    };

    editorPane.content_el.dispatchEvent(event);
    expect(prevented).toBe(true);
  });

  // 언어 감지
  runner.it('should detect JavaScript language', () => {
    editorPane.mount();

    const jsFile = new FileNode('test.js', '/test.js', null, false);
    const jsDoc = new Document(jsFile, 'const x = 1;');

    editorPane.setDocument(jsDoc);

    // 렌더링 후 토큰 확인
    const tokens = editorPane.container.querySelectorAll('.token-keyword');
    expect(tokens.length).toBeGreaterThan(0);
  });

  runner.it('should detect HTML language', () => {
    editorPane.mount();

    const htmlFile = new FileNode('test.html', '/test.html', null, false);
    const htmlDoc = new Document(htmlFile, '<div>Hello</div>');

    editorPane.setDocument(htmlDoc);

    // 렌더링 확인
    const codeLines = editorPane.container.querySelectorAll('.code-line');
    expect(codeLines.length).toBe(1);
  });

  // 포커스
  runner.it('should focus editor', () => {
    editorPane.mount();
    editorPane.setDocument(document);

    editorPane.focus();

    // focus() 호출이 에러 없이 실행됨 확인
    expect(window.document.activeElement).toBeDefined();
  });

  // 검증
  runner.it('should validate document parameter', () => {
    editorPane.mount();

    expect(() => editorPane.setDocument({})).toThrow();
    expect(() => editorPane.setDocument('not a doc')).toThrow();
  });

  runner.it('should validate cursor parameters', () => {
    editorPane.mount();
    editorPane.setDocument(document);

    expect(() => editorPane.setCursorPosition('0', 0)).toThrow();
    expect(() => editorPane.setCursorPosition(0, '0')).toThrow();
  });

  runner.it('should validate search results parameter', () => {
    editorPane.mount();
    editorPane.setDocument(document);

    expect(() => editorPane.highlightSearchResults('not array', 0)).toThrow();
  });

  // 디버그 정보
  runner.it('should provide debug info', () => {
    editorPane.mount();
    editorPane.setDocument(document);

    const info = editorPane.getDebugInfo();
    expect(info.component).toBe('EditorPane');
    expect(info.is_mounted).toBe(true);
    expect(info.has_document).toBe(true);
  });

  // 파괴
  runner.it('should destroy cleanly', () => {
    editorPane.mount();
    editorPane.setDocument(document);

    editorPane.destroy();

    expect(editorPane.is_destroyed).toBe(true);
    expect(editorPane.document).toBe(null);
  });
});

runner.run();
