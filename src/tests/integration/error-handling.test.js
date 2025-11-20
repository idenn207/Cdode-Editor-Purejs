/**
 * src/tests/integration/error-handling.test.js
 *
 * 에러 처리 통합 테스트
 *
 * 테스트하는 시나리오:
 * - 파일 시스템 에러
 * - 잘못된 파라미터 에러
 * - 상태 에러
 * - 에러 복구
 */

import CodeEditorApp from '../../app.js';
import FileNode from '../../models/FileNode.js';
import { TestRunner, createMock, expect } from '../TestRunner.js';

const runner = new TestRunner();

runner.describe('Error Handling Integration Tests', () => {
  let app;

  runner.beforeEach(async () => {
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
  // 초기화 전 start 호출 에러
  // ========================================
  runner.it('should throw error when starting before initialization', async () => {
    let errorCaught = false;

    try {
      await app.start();
    } catch (error) {
      errorCaught = true;
      expect(error.message).toContain('initialized');
    }

    expect(errorCaught).toBe(true);
  });

  // ========================================
  // 중복 start 에러
  // ========================================
  runner.it('should throw error when starting twice', async () => {
    await app.initialize();

    // Mock selectDirectory to avoid browser API call
    app.controllers.file.selectDirectory = createMock().mockResolvedValue(true);

    await app.start();

    let errorCaught = false;
    try {
      await app.start();
    } catch (error) {
      errorCaught = true;
      expect(error.message).toContain('already running');
    }

    expect(errorCaught).toBe(true);
  });

  // ========================================
  // 실행 중이 아닐 때 stop 에러
  // ========================================
  runner.it('should throw error when stopping while not running', async () => {
    await app.initialize();

    let errorCaught = false;
    try {
      app.stop();
    } catch (error) {
      errorCaught = true;
      expect(error.message).toContain('not running');
    }

    expect(errorCaught).toBe(true);
  });

  // ========================================
  // 잘못된 FileNode로 파일 열기
  // ========================================
  runner.it('should handle error when opening invalid file', async () => {
    await app.initialize();

    let errorCaught = false;
    try {
      await app.controllers.file.openFile(null);
    } catch (error) {
      errorCaught = true;
      expect(error.message).toContain('FileNode');
    }

    expect(errorCaught).toBe(true);
  });

  // ========================================
  // 디렉토리를 파일로 열기 시도
  // ========================================
  runner.it('should reject opening directory as file', async () => {
    await app.initialize();

    const dirNode = new FileNode('folder', 'directory', null);

    let errorCaught = false;
    try {
      await app.controllers.file.openFile(dirNode);
    } catch (error) {
      errorCaught = true;
      expect(error.message).toContain('directory');
    }

    expect(errorCaught).toBe(true);
  });

  // ========================================
  // null Document 활성화 에러
  // ========================================
  runner.it('should reject null document activation', async () => {
    await app.initialize();

    let errorCaught = false;
    try {
      app.controllers.tab.activateDocument(null);
    } catch (error) {
      errorCaught = true;
      expect(error.message).toContain('Document');
    }

    expect(errorCaught).toBe(true);
  });

  // ========================================
  // 잘못된 타입의 자동완성 요청
  // ========================================
  runner.it('should handle invalid completion request', async () => {
    await app.initialize();

    let errorCaught = false;
    try {
      app.services.completion.getCompletions(null, 0, 0, 'javascript');
    } catch (error) {
      errorCaught = true;
      expect(error.message).toContain('Document');
    }

    expect(errorCaught).toBe(true);
  });

  // ========================================
  // 잘못된 검색 옵션
  // ========================================
  runner.it('should validate search options', async () => {
    await app.initialize();

    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: 'test',
    });

    const doc = app.controllers.tab.getActiveDocument();

    let errorCaught = false;
    try {
      // 잘못된 옵션 타입
      app.services.search.search(doc, 'test', 'invalid-options');
    } catch (error) {
      errorCaught = true;
    }

    expect(errorCaught).toBe(true);
  });

  // ========================================
  // 잘못된 정규식 검색
  // ========================================
  runner.it('should handle invalid regex', async () => {
    await app.initialize();

    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: 'test',
    });

    const doc = app.controllers.tab.getActiveDocument();

    let errorCaught = false;
    try {
      app.services.search.search(doc, '[invalid(', {
        regex: true,
      });
    } catch (error) {
      errorCaught = true;
    }

    expect(errorCaught).toBe(true);
  });

  // ========================================
  // 파일 범위 밖 줄 접근
  // ========================================
  runner.it('should handle out of range line access', async () => {
    await app.initialize();

    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: 'line1\nline2',
    });

    const doc = app.controllers.tab.getActiveDocument();

    let errorCaught = false;
    try {
      doc.getLine(10); // 존재하지 않는 줄
    } catch (error) {
      errorCaught = true;
    }

    expect(errorCaught).toBe(true);
  });

  // ========================================
  // Dirty 파일 닫기 시 사용자 취소
  // ========================================
  runner.it('should cancel close when user rejects', async () => {
    await app.initialize();

    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: 'original',
    });

    const doc = app.controllers.tab.getActiveDocument();
    doc.setContent('modified');

    // Mock window.confirm - 사용자가 취소
    const originalConfirm = window.confirm;
    window.confirm = createMock().mockReturnValue(false);

    app.controllers.tab.closeDocument(doc);

    // 파일이 여전히 열려 있어야 함
    expect(app.controllers.tab.getDocumentCount()).toBe(1);

    window.confirm = originalConfirm;
  });

  // ========================================
  // 에러 후 복구
  // ========================================
  runner.it('should recover after error', async () => {
    await app.initialize();

    // 에러 발생
    try {
      await app.controllers.file.openFile(null);
    } catch (error) {
      // 에러 발생 확인
    }

    // 정상 작업 계속 가능
    const rootNode = new FileNode('root', 'directory', null);
    const fileNode = new FileNode('test.js', 'file', rootNode);

    app.controllers.file.emit('file-opened', {
      file_node: fileNode,
      content: 'test',
    });

    expect(app.controllers.tab.getDocumentCount()).toBe(1);
  });

  // ========================================
  // 전역 에러 핸들러
  // ========================================
  runner.it('should catch unhandled promise rejections', async () => {
    await app.initialize();

    let errorHandled = false;

    // 테스트용 에러 핸들러
    const testHandler = (_event) => {
      errorHandled = true;
      _event.preventDefault();
    };

    window.addEventListener('unhandledrejection', testHandler);

    // Unhandled rejection 발생
    Promise.reject(new Error('Test error'));

    // 이벤트 루프 대기
    await new Promise((_resolve) => setTimeout(_resolve, 10));

    expect(errorHandled).toBe(true);

    window.removeEventListener('unhandledrejection', testHandler);
  });

  // ========================================
  // 컴포넌트 destroy 후 접근 에러
  // ========================================
  runner.it('should reject operations after destroy', async () => {
    await app.initialize();

    app.destroy();

    let errorCaught = false;
    try {
      await app.start();
    } catch (error) {
      errorCaught = true;
    }

    expect(errorCaught).toBe(true);
  });

  // ========================================
  // 여러 에러 동시 발생
  // ========================================
  runner.it('should handle multiple errors gracefully', async () => {
    await app.initialize();

    const errors = [];

    // 여러 잘못된 작업 시도
    try {
      await app.controllers.file.openFile(null);
    } catch (error) {
      errors.push(error);
    }

    try {
      app.controllers.tab.activateDocument(null);
    } catch (error) {
      errors.push(error);
    }

    try {
      app.services.completion.getCompletions(null, 0, 0, 'javascript');
    } catch (error) {
      errors.push(error);
    }

    expect(errors.length).toBe(3);

    // 애플리케이션은 여전히 정상 작동해야 함
    expect(app.is_initialized).toBe(true);
  });
});

// 테스트 실행
runner.run();
