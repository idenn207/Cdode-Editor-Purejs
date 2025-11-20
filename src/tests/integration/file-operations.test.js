/**
 * src/tests/integration/file-operations.test.js
 *
 * 파일 작업 통합 테스트
 *
 * 테스트하는 시나리오:
 * - 디렉토리 선택 → 파일 열기 → 편집 → 저장 → 닫기
 * - 여러 파일 동시 열기 및 전환
 * - Dirty 상태 관리
 */

import CodeEditorApp from '../../app.js';
import FileNode from '../../models/FileNode.js';
import { TestRunner, createMock, expect } from '../TestRunner.js';

const runner = new TestRunner();

runner.describe('File Operations Integration Tests', () => {
  let app;
  let mockFileSystem;

  runner.beforeEach(() => {
    // Mock FileSystem API
    mockFileSystem = {
      showDirectoryPicker: createMock().mockResolvedValue({
        kind: 'directory',
        name: 'test-project',
        entries: createMock().mockReturnValue([]),
      }),
      requestPermission: createMock().mockResolvedValue('granted'),
      getFile: createMock().mockResolvedValue({
        text: createMock().mockResolvedValue('console.log("test");'),
      }),
      writeFile: createMock().mockResolvedValue(undefined),
    };

    // DOM 요소 생성
    document.body.innerHTML = `
      <div id="Sidebar"></div>
      <div id="TabBar"></div>
      <div id="EditorPane"></div>
      <div id="CompletionPanel"></div>
      <div id="SearchPanel"></div>
    `;

    app = new CodeEditorApp();
  });

  runner.afterEach(() => {
    if (app) {
      app.destroy();
    }
    document.body.innerHTML = '';
  });

  // ========================================
  // 기본 초기화
  // ========================================
  runner.it('should initialize all components', async () => {
    await app.initialize();

    expect(app.is_initialized).toBe(true);
    expect(app.services.file_system).toBeTruthy();
    expect(app.services.completion).toBeTruthy();
    expect(app.views.sidebar).toBeTruthy();
    expect(app.views.editor_pane).toBeTruthy();
    expect(app.controllers.editor).toBeTruthy();
  });

  // ========================================
  // 디렉토리 선택 및 파일 트리 렌더링
  // ========================================
  runner.it('should select directory and render file tree', async () => {
    await app.initialize();

    // Mock root node
    const rootNode = new FileNode('root', 'directory', null);
    const file1 = new FileNode('test.js', 'file', rootNode);
    const file2 = new FileNode('utils.js', 'file', rootNode);
    rootNode.addChild(file1);
    rootNode.addChild(file2);

    app.controllers.file.emit('directory-selected', { root_node: rootNode });

    expect(app.views.sidebar.getRootNode()).toBe(rootNode);
  });

  // ========================================
  // 파일 열기
  // ========================================
  runner.it('should open file and display in editor', async () => {
    await app.initialize();

    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);
    const content = 'console.log("test");';

    // 파일 열기 이벤트 발생
    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: content,
    });

    // Document가 생성되고 활성화되었는지 확인
    const activeDoc = app.controllers.tab.getActiveDocument();
    expect(activeDoc).toBeTruthy();
    expect(activeDoc.getFileNode()).toBe(fileNode);
    expect(activeDoc.getContent()).toBe(content);

    // 탭바에 탭이 추가되었는지 확인
    const tabs = app.views.tab_bar.getTabs();
    expect(tabs.length).toBe(1);
    expect(tabs[0]).toBe(activeDoc);
  });

  // ========================================
  // 여러 파일 열기
  // ========================================
  runner.it('should open multiple files and switch between them', async () => {
    await app.initialize();

    const rootNode = new FileNode('root', 'directory', null);
    const file1 = new FileNode('file1.js', 'file', rootNode);
    const file2 = new FileNode('file2.js', 'file', rootNode);

    // 첫 번째 파일 열기
    app.controllers.file.emit('file-opened', {
      file_node: file1,
      content: 'console.log("file1");',
    });

    // 두 번째 파일 열기
    app.controllers.file.emit('file-opened', {
      file_node: file2,
      content: 'console.log("file2");',
    });

    // 2개의 탭이 있어야 함
    expect(app.controllers.tab.getDocumentCount()).toBe(2);
    expect(app.views.tab_bar.getTabs().length).toBe(2);

    // 현재 활성 문서는 file2
    let activeDoc = app.controllers.tab.getActiveDocument();
    expect(activeDoc.getFileNode()).toBe(file2);

    // file1로 전환
    const doc1 = app.controllers.tab.findDocumentByFileNode(file1);
    app.controllers.tab.activateDocument(doc1);

    activeDoc = app.controllers.tab.getActiveDocument();
    expect(activeDoc.getFileNode()).toBe(file1);
  });

  // ========================================
  // 파일 편집 및 Dirty 상태
  // ========================================
  runner.it('should mark document as dirty when edited', async () => {
    await app.initialize();

    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: 'original content',
    });

    const doc = app.controllers.tab.getActiveDocument();
    expect(doc.isDirty()).toBe(false);

    // 내용 변경
    doc.setContent('modified content');

    expect(doc.isDirty()).toBe(true);

    // Dirty 문서 목록에 포함되어야 함
    const dirtyDocs = app.controllers.tab.getDirtyDocuments();
    expect(dirtyDocs.length).toBe(1);
    expect(dirtyDocs[0]).toBe(doc);
  });

  // ========================================
  // 파일 저장
  // ========================================
  runner.it('should save file and clear dirty flag', async () => {
    await app.initialize();

    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: 'original',
    });

    const doc = app.controllers.tab.getActiveDocument();
    doc.setContent('modified');

    expect(doc.isDirty()).toBe(true);

    // 저장
    doc.markAsSaved();

    expect(doc.isDirty()).toBe(false);
    expect(app.controllers.tab.getDirtyDocuments().length).toBe(0);
  });

  // ========================================
  // 파일 닫기
  // ========================================
  runner.it('should close file and remove tab', async () => {
    await app.initialize();

    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: 'test',
    });

    const doc = app.controllers.tab.getActiveDocument();
    expect(app.controllers.tab.getDocumentCount()).toBe(1);

    // 파일 닫기
    app.controllers.tab.closeDocument(doc);

    expect(app.controllers.tab.getDocumentCount()).toBe(0);
    expect(app.views.tab_bar.getTabs().length).toBe(0);
  });

  // ========================================
  // Dirty 파일 닫기 확인
  // ========================================
  runner.it('should prompt when closing dirty file', async () => {
    await app.initialize();

    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: 'original',
    });

    const doc = app.controllers.tab.getActiveDocument();
    doc.setContent('modified');

    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = createMock().mockReturnValue(false); // 취소

    app.controllers.tab.closeDocument(doc);

    // 여전히 열려 있어야 함
    expect(app.controllers.tab.getDocumentCount()).toBe(1);

    // confirm 호출 확인
    expect(window.confirm).toHaveBeenCalled();

    window.confirm = originalConfirm;
  });

  // ========================================
  // 모든 파일 닫기
  // ========================================
  runner.it('should close all files', async () => {
    await app.initialize();

    const rootNode = new FileNode('root', 'directory', null);
    const file1 = new FileNode('file1.js', 'file', rootNode);
    const file2 = new FileNode('file2.js', 'file', rootNode);

    app.controllers.file.emit('file-opened', {
      file_node: file1,
      content: 'content1',
    });

    app.controllers.file.emit('file-opened', {
      file_node: file2,
      content: 'content2',
    });

    expect(app.controllers.tab.getDocumentCount()).toBe(2);

    // Mock confirm
    const originalConfirm = window.confirm;
    window.confirm = createMock().mockReturnValue(true);

    app.controllers.tab.closeAllDocuments();

    expect(app.controllers.tab.getDocumentCount()).toBe(0);
    expect(app.views.tab_bar.getTabs().length).toBe(0);

    window.confirm = originalConfirm;
  });

  // ========================================
  // 애플리케이션 정지
  // ========================================
  runner.it('should stop application', async () => {
    await app.initialize();
    app.is_running = true; // start() 없이 수동 설정

    app.stop();

    expect(app.is_running).toBe(false);
  });

  // ========================================
  // 애플리케이션 종료
  // ========================================
  runner.it('should destroy application and cleanup resources', async () => {
    await app.initialize();

    app.destroy();

    expect(app.is_initialized).toBe(false);
  });

  // ========================================
  // 디버그 정보
  // ========================================
  runner.it('should provide debug information', async () => {
    await app.initialize();

    const debugInfo = app.getDebugInfo();

    expect(debugInfo.is_initialized).toBe(true);
    expect(debugInfo.services).toContain('file_system');
    expect(debugInfo.views).toContain('editor_pane');
    expect(debugInfo.controllers).toContain('editor');
  });
});

// 테스트 실행
runner.run();
