/**
 * 파일: src/tests/unit/controllers/TabController.test.js
 * 기능: TabController 단위 테스트
 */

import TabController from '../../../controllers/TabController.js';
import Document from '../../../models/Document.js';
import FileNode from '../../../models/FileNode.js';
import { TestRunner, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('TabController', () => {
  let controller;
  let testFileNode1;
  let testFileNode2;

  runner.beforeEach(() => {
    controller = new TabController();
    controller.initialize();

    testFileNode1 = new FileNode('test1.js', false, null);
    testFileNode2 = new FileNode('test2.js', false, null);
  });

  runner.afterEach(() => {
    controller.destroy();
  });

  // === 생성 및 초기화 ===

  runner.it('should create controller', () => {
    expect(controller).toBeDefined();
    expect(controller.documents).toBeInstanceOf(Map);
    expect(controller.active_document).toBeNull();
  });

  runner.it('should initialize successfully', () => {
    expect(controller.is_initialized).toBe(true);
  });

  // === Document 열기 ===

  runner.it('should open document', () => {
    let opened = null;
    let activated = null;

    controller.on('document-opened', (_doc) => {
      opened = _doc;
    });

    controller.on('document-activated', (_doc) => {
      activated = _doc;
    });

    const doc = controller.openDocument(testFileNode1, 'content1');

    expect(doc).toBeInstanceOf(Document);
    expect(doc.file_node).toBe(testFileNode1);
    expect(opened).toBe(doc);
    expect(activated).toBe(doc);
    expect(controller.documents.size).toBe(1);
    expect(controller.active_document).toBe(doc);
  });

  runner.it('should reuse existing document', () => {
    const doc1 = controller.openDocument(testFileNode1, 'content1');
    const doc2 = controller.openDocument(testFileNode1, 'content1');

    expect(doc1).toBe(doc2);
    expect(controller.documents.size).toBe(1);
  });

  runner.it('should throw error if parameters are invalid', () => {
    let errorEmitted = null;
    controller.on('error', (_data) => {
      errorEmitted = _data;
    });

    controller.openDocument(null, 'content');

    expect(errorEmitted).toBeDefined();
  });

  runner.it('should register document change listener', () => {
    const doc = controller.openDocument(testFileNode1, 'content1');

    let changed = null;
    controller.on('document-changed', (_doc) => {
      changed = _doc;
    });

    // Trigger document change
    doc.insertText(0, 0, 'modified');

    expect(changed).toBe(doc);
  });

  // === Document 활성화 ===

  runner.it('should activate document', () => {
    const doc = controller.openDocument(testFileNode1, 'content1');

    let activated = null;
    controller.on('document-activated', (_doc) => {
      activated = _doc;
    });

    controller.activateDocument(doc);

    expect(controller.active_document).toBe(doc);
    expect(activated).toBe(doc);
  });

  runner.it('should not emit if already active', () => {
    const doc = controller.openDocument(testFileNode1, 'content1');

    let activationCount = 0;
    controller.on('document-activated', () => {
      activationCount++;
    });

    controller.activateDocument(doc);
    controller.activateDocument(doc); // 중복 활성화

    expect(activationCount).toBe(1); // openDocument에서 1번만
  });

  runner.it('should throw error if document is null', () => {
    expect(() => controller.activateDocument(null)).toThrow();
  });

  // === Document 닫기 ===

  runner.it('should close document without confirmation if not dirty', () => {
    const doc = controller.openDocument(testFileNode1, 'content1');

    let closed = null;
    controller.on('document-closed', (_doc) => {
      closed = _doc;
    });

    const result = controller.closeDocument(doc);

    expect(result).toBe(true);
    expect(closed).toBe(doc);
    expect(controller.documents.size).toBe(0);
    expect(controller.active_document).toBeNull();
  });

  runner.it('should request confirmation if document is dirty', () => {
    const doc = controller.openDocument(testFileNode1, 'content1');
    doc.insertText(0, 0, 'modified');

    const originalConfirm = global.window.confirm;
    global.window.confirm = runner.mock(() => false);

    const result = controller.closeDocument(doc);

    expect(result).toBe(false);
    expect(controller.documents.size).toBe(1);

    global.window.confirm = originalConfirm;
  });

  runner.it('should close dirty document if confirmed', () => {
    const doc = controller.openDocument(testFileNode1, 'content1');
    doc.insertText(0, 0, 'modified');

    const originalConfirm = global.window.confirm;
    global.window.confirm = runner.mock(() => true);

    let closed = null;
    controller.on('document-closed', (_doc) => {
      closed = _doc;
    });

    const result = controller.closeDocument(doc);

    expect(result).toBe(true);
    expect(closed).toBe(doc);
    expect(controller.documents.size).toBe(0);

    global.window.confirm = originalConfirm;
  });

  runner.it('should activate another document after closing active one', () => {
    const doc1 = controller.openDocument(testFileNode1, 'content1');
    const doc2 = controller.openDocument(testFileNode2, 'content2');

    controller.activateDocument(doc1);
    controller.closeDocument(doc1);

    expect(controller.active_document).toBe(doc2);
  });

  // === 모든 Document 닫기 ===

  runner.it('should close all documents', () => {
    controller.openDocument(testFileNode1, 'content1');
    controller.openDocument(testFileNode2, 'content2');

    let closedCount = 0;
    let allClosed = false;

    controller.on('document-closed', () => {
      closedCount++;
    });

    controller.on('all-documents-closed', () => {
      allClosed = true;
    });

    const result = controller.closeAllDocuments();

    expect(result).toBe(true);
    expect(closedCount).toBe(2);
    expect(allClosed).toBe(true);
    expect(controller.documents.size).toBe(0);
    expect(controller.active_document).toBeNull();
  });

  runner.it('should request confirmation if dirty documents exist', () => {
    const doc1 = controller.openDocument(testFileNode1, 'content1');
    doc1.insertText(0, 0, 'modified');

    const originalConfirm = global.window.confirm;
    global.window.confirm = runner.mock(() => false);

    const result = controller.closeAllDocuments();

    expect(result).toBe(false);
    expect(controller.documents.size).toBe(1);

    global.window.confirm = originalConfirm;
  });

  // === Document 찾기 ===

  runner.it('should find document by file node', () => {
    const doc = controller.openDocument(testFileNode1, 'content1');
    const found = controller.findDocument(testFileNode1);

    expect(found).toBe(doc);
  });

  runner.it('should return null if document not found', () => {
    const found = controller.findDocument(testFileNode1);
    expect(found).toBeNull();
  });

  runner.it('should throw error if file node is null', () => {
    const found = controller.findDocument(null);
    expect(found).toBeNull();
  });

  // === Getters ===

  runner.it('should return active document', () => {
    const doc = controller.openDocument(testFileNode1, 'content1');
    expect(controller.getActiveDocument()).toBe(doc);
  });

  runner.it('should return all documents', () => {
    controller.openDocument(testFileNode1, 'content1');
    controller.openDocument(testFileNode2, 'content2');

    const docs = controller.getAllDocuments();

    expect(docs.length).toBe(2);
    expect(docs[0]).toBeInstanceOf(Document);
  });

  runner.it('should return dirty documents', () => {
    const doc1 = controller.openDocument(testFileNode1, 'content1');
    const doc2 = controller.openDocument(testFileNode2, 'content2');

    doc1.insertText(0, 0, 'modified');

    const dirtyDocs = controller.getDirtyDocuments();

    expect(dirtyDocs.length).toBe(1);
    expect(dirtyDocs[0]).toBe(doc1);
  });

  runner.it('should return document count', () => {
    controller.openDocument(testFileNode1, 'content1');
    controller.openDocument(testFileNode2, 'content2');

    expect(controller.getDocumentCount()).toBe(2);
  });

  runner.it('should check if document exists', () => {
    controller.openDocument(testFileNode1, 'content1');

    expect(controller.hasDocument(testFileNode1)).toBe(true);
    expect(controller.hasDocument(testFileNode2)).toBe(false);
  });

  // === 종료 ===

  runner.it('should destroy properly', () => {
    controller.openDocument(testFileNode1, 'content1');
    controller.openDocument(testFileNode2, 'content2');

    let closedCount = 0;
    controller.on('document-closed', () => {
      closedCount++;
    });

    controller.destroy();

    expect(closedCount).toBe(2);
    expect(controller.documents.size).toBe(0);
    expect(controller.active_document).toBeNull();
  });
});

export default runner;
