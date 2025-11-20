/**
 * 파일: src/tests/unit/controllers/EditorController.test.js
 * 기능: EditorController 단위 테스트
 */

import EditorController from '../../../controllers/EditorController.js';
import TabController from '../../../controllers/TabController.js';
import Document from '../../../models/Document.js';
import FileNode from '../../../models/FileNode.js';
import { TestRunner, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('EditorController', () => {
  let controller;
  let tabController;
  let fileSystemService;
  let mockEditorPane;
  let testDocument;
  let testFileNode;

  runner.beforeEach(() => {
    // Mock FileSystemService
    fileSystemService = {
      writeFile: runner.mock(async () => {}),
      readFile: runner.mock(async () => 'test content'),
      on: runner.mock(() => {}),
    };

    tabController = new TabController();
    tabController.initialize();

    controller = new EditorController(tabController, fileSystemService);
    controller.initialize();

    // Mock EditorPane
    mockEditorPane = {
      setDocument: runner.mock(() => {}),
      clear: runner.mock(() => {}),
      on: runner.mock(() => {}),
      destroy: runner.mock(() => {}),
    };

    // Test data
    testFileNode = new FileNode('test.js', false, null);
    testDocument = new Document(testFileNode, 'console.log("test");');
  });

  runner.afterEach(() => {
    controller.destroy();
  });

  // === 생성 및 초기화 ===

  runner.it('should create with required dependencies', () => {
    expect(controller).toBeDefined();
    expect(controller.getService('tabController')).toBe(tabController);
    expect(controller.getService('fileSystemService')).toBe(fileSystemService);
  });

  runner.it('should throw error if dependencies are missing', () => {
    expect(() => new EditorController(null, fileSystemService)).toThrow();
    expect(() => new EditorController(tabController, null)).toThrow();
  });

  runner.it('should initialize successfully', () => {
    expect(controller.is_initialized).toBe(true);
  });

  // === EditorPane 설정 ===

  runner.it('should set editor pane', () => {
    controller.setEditorPane(mockEditorPane);
    expect(controller.getEditorPane()).toBe(mockEditorPane);
    expect(mockEditorPane.on).toHaveBeenCalled();
  });

  runner.it('should throw error if editor pane is null', () => {
    expect(() => controller.setEditorPane(null)).toThrow();
  });

  runner.it('should register editor pane events', () => {
    controller.setEditorPane(mockEditorPane);
    expect(mockEditorPane.on.mock.calls.length).toBeGreaterThan(0);
  });

  // === Document 표시 ===

  runner.it('should display document', () => {
    controller.setEditorPane(mockEditorPane);

    let displayed = null;
    controller.on('document-displayed', (_doc) => {
      displayed = _doc;
    });

    controller.displayDocument(testDocument);

    expect(controller.getCurrentDocument()).toBe(testDocument);
    expect(mockEditorPane.setDocument).toHaveBeenCalledWith(testDocument);
    expect(displayed).toBe(testDocument);
  });

  runner.it('should throw error if document is null', () => {
    expect(() => controller.displayDocument(null)).toThrow();
  });

  runner.it('should handle display error gracefully', () => {
    mockEditorPane.setDocument = runner.mock(() => {
      throw new Error('Display failed');
    });

    controller.setEditorPane(mockEditorPane);

    let errorEmitted = null;
    controller.on('error', (_data) => {
      errorEmitted = _data;
    });

    controller.displayDocument(testDocument);

    expect(errorEmitted).toBeDefined();
    expect(errorEmitted.message).toContain('표시 실패');
  });

  // === Document 저장 ===

  runner.it('should save document', async () => {
    let saved = null;
    let statusMessage = null;

    controller.on('document-saved', (_doc) => {
      saved = _doc;
    });

    controller.on('status-message', (_msg) => {
      statusMessage = _msg;
    });

    await controller.saveDocument(testDocument);

    expect(fileSystemService.writeFile).toHaveBeenCalledWith(testFileNode, testDocument.getText());
    expect(testDocument.isDirty()).toBe(false);
    expect(saved).toBe(testDocument);
    expect(statusMessage).toContain('저장됨');
  });

  runner.it('should throw error if document is null', async () => {
    await expect(controller.saveDocument(null)).rejects.toThrow();
  });

  runner.it('should handle save error', async () => {
    fileSystemService.writeFile = runner.mock(async () => {
      throw new Error('Write failed');
    });

    let errorEmitted = null;
    controller.on('error', (_data) => {
      errorEmitted = _data;
    });

    await controller.saveDocument(testDocument);

    expect(errorEmitted).toBeDefined();
    expect(errorEmitted.message).toContain('저장 실패');
  });

  // === 모든 Document 저장 ===

  runner.it('should save all dirty documents', async () => {
    const doc1 = new Document(new FileNode('file1.js', false, null), 'content1');
    const doc2 = new Document(new FileNode('file2.js', false, null), 'content2');

    doc1.insertText(0, 0, 'modified');
    doc2.insertText(0, 0, 'modified');

    tabController.documents.set('/file1.js', doc1);
    tabController.documents.set('/file2.js', doc2);

    let statusMessage = null;
    controller.on('status-message', (_msg) => {
      statusMessage = _msg;
    });

    await controller.saveAllDocuments();

    expect(fileSystemService.writeFile).toHaveBeenCalledTimes(2);
    expect(statusMessage).toContain('2개 파일 저장됨');
  });

  runner.it('should skip if no dirty documents', async () => {
    let statusMessage = null;
    controller.on('status-message', (_msg) => {
      statusMessage = _msg;
    });

    await controller.saveAllDocuments();

    expect(statusMessage).toContain('저장할 파일이 없습니다');
    expect(fileSystemService.writeFile).not.toHaveBeenCalled();
  });

  // === TabController 이벤트 처리 ===

  runner.it('should handle document-activated event', () => {
    controller.setEditorPane(mockEditorPane);

    tabController.emit('document-activated', testDocument);

    expect(mockEditorPane.setDocument).toHaveBeenCalledWith(testDocument);
    expect(controller.getCurrentDocument()).toBe(testDocument);
  });

  runner.it('should clear editor when document is closed', () => {
    controller.setEditorPane(mockEditorPane);
    controller.displayDocument(testDocument);

    tabController.emit('document-closed', testDocument);

    expect(mockEditorPane.clear).toHaveBeenCalled();
    expect(controller.getCurrentDocument()).toBeNull();
  });

  // === Getters ===

  runner.it('should return current document', () => {
    controller.displayDocument(testDocument);
    expect(controller.getCurrentDocument()).toBe(testDocument);
  });

  runner.it('should return editor pane', () => {
    controller.setEditorPane(mockEditorPane);
    expect(controller.getEditorPane()).toBe(mockEditorPane);
  });

  // === 종료 ===

  runner.it('should destroy properly', () => {
    controller.setEditorPane(mockEditorPane);
    controller.displayDocument(testDocument);

    controller.destroy();

    expect(mockEditorPane.destroy).toHaveBeenCalled();
    expect(controller.getEditorPane()).toBeNull();
    expect(controller.getCurrentDocument()).toBeNull();
  });
});

export default runner;
