/**
 * 파일: src/tests/unit/models/EditorState.test.js
 * 기능: EditorState 모델 단위 테스트
 * 책임: EditorState의 모든 기능 검증
 */

import Document from '../../../models/Document.js';
import EditorState from '../../../models/EditorState.js';
import FileNode from '../../../models/FileNode.js';
import { TestRunner, createMock, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('EditorState Model', () => {
  let state;
  let doc1;
  let doc2;

  runner.beforeEach(() => {
    state = new EditorState();

    const file1 = new FileNode('file1.js', '/file1.js', 'file');
    const file2 = new FileNode('file2.js', '/file2.js', 'file');

    doc1 = new Document(file1, 'content1');
    doc2 = new Document(file2, 'content2');
  });

  runner.it('should create empty editor state', () => {
    expect(state.getDocumentCount()).toBe(0);
    expect(state.getActiveDocument()).toBeNull();
  });

  runner.it('should add document', () => {
    state.addDocument(doc1);

    expect(state.getDocumentCount()).toBe(1);
    expect(state.hasDocument('/file1.js')).toBe(true);
  });

  runner.it('should not add duplicate document', () => {
    state.addDocument(doc1);

    expect(() => {
      state.addDocument(doc1);
    }).toThrow();
  });

  runner.it('should remove document', () => {
    state.addDocument(doc1);
    state.removeDocument('/file1.js');

    expect(state.getDocumentCount()).toBe(0);
    expect(state.hasDocument('/file1.js')).toBe(false);
  });

  runner.it('should get document by path', () => {
    state.addDocument(doc1);

    const retrieved = state.getDocument('/file1.js');

    expect(retrieved).toBe(doc1);
  });

  runner.it('should get all documents', () => {
    state.addDocument(doc1);
    state.addDocument(doc2);

    const all = state.getAllDocuments();

    expect(all).toHaveLength(2);
    expect(all).toContain(doc1);
    expect(all).toContain(doc2);
  });

  runner.it('should set active document', () => {
    state.addDocument(doc1);
    state.setActiveDocument('/file1.js');

    expect(state.getActiveDocument()).toBe(doc1);
  });

  runner.it('should auto-switch active when removing active document', () => {
    state.addDocument(doc1);
    state.addDocument(doc2);
    state.setActiveDocument('/file1.js');

    state.removeDocument('/file1.js');

    expect(state.getActiveDocument()).toBe(doc2);
  });

  runner.it('should manage document order', () => {
    state.addDocument(doc1);
    state.addDocument(doc2);

    const order = state.getDocumentOrder();

    expect(order).toHaveLength(2);
    expect(order[0]).toBe('/file1.js');
    expect(order[1]).toBe('/file2.js');
  });

  runner.it('should reorder documents', () => {
    state.addDocument(doc1);
    state.addDocument(doc2);

    state.reorderDocuments(0, 1);

    const order = state.getDocumentOrder();
    expect(order[0]).toBe('/file2.js');
    expect(order[1]).toBe('/file1.js');
  });

  runner.it('should get dirty documents', () => {
    state.addDocument(doc1);
    state.addDocument(doc2);

    doc1.setDirty(true);

    const dirty = state.getDirtyDocuments();

    expect(dirty).toHaveLength(1);
    expect(dirty[0]).toBe(doc1);
  });

  runner.it('should check if has dirty documents', () => {
    state.addDocument(doc1);

    expect(state.hasDirtyDocuments()).toBe(false);

    doc1.setDirty(true);
    expect(state.hasDirtyDocuments()).toBe(true);
  });

  runner.it('should manage split view', () => {
    expect(state.isSplitViewEnabled()).toBe(false);

    state.setSplitViewEnabled(true);
    expect(state.isSplitViewEnabled()).toBe(true);
  });

  runner.it('should set split view orientation', () => {
    expect(state.getSplitViewOrientation()).toBe('horizontal');

    state.setSplitViewOrientation('vertical');
    expect(state.getSplitViewOrientation()).toBe('vertical');
  });

  runner.it('should manage sidebar visibility', () => {
    expect(state.isSidebarVisible()).toBe(true);

    state.setSidebarVisible(false);
    expect(state.isSidebarVisible()).toBe(false);
  });

  runner.it('should manage sidebar width', () => {
    expect(state.getSidebarWidth()).toBe(250);

    state.setSidebarWidth(300);
    expect(state.getSidebarWidth()).toBe(300);
  });

  runner.it('should manage font size', () => {
    expect(state.getFontSize()).toBe(14);

    state.setFontSize(16);
    expect(state.getFontSize()).toBe(16);
  });

  runner.it('should manage theme', () => {
    expect(state.getTheme()).toBe('dark');

    state.setTheme('light');
    expect(state.getTheme()).toBe('light');
  });

  runner.it('should manage line wrap', () => {
    expect(state.isLineWrapEnabled()).toBe(false);

    state.setLineWrapEnabled(true);
    expect(state.isLineWrapEnabled()).toBe(true);
  });

  runner.it('should close all documents', () => {
    state.addDocument(doc1);
    state.addDocument(doc2);

    state.closeAllDocuments();

    expect(state.getDocumentCount()).toBe(0);
  });

  runner.it('should close clean documents only', () => {
    state.addDocument(doc1);
    state.addDocument(doc2);

    doc1.setDirty(true);

    state.closeCleanDocuments();

    expect(state.getDocumentCount()).toBe(1);
    expect(state.hasDocument('/file1.js')).toBe(true);
  });

  runner.it('should serialize to JSON', () => {
    state.addDocument(doc1);
    state.setActiveDocument('/file1.js');
    state.setSidebarWidth(300);

    const json = state.toJSON();

    expect(json.active_document_path).toBe('/file1.js');
    expect(json.sidebar_width).toBe(300);
  });

  runner.it('should deserialize from JSON', () => {
    const json = {
      sidebar_width: 350,
      font_size: 18,
      theme: 'light',
      line_wrap: true,
    };

    state.fromJSON(json);

    expect(state.getSidebarWidth()).toBe(350);
    expect(state.getFontSize()).toBe(18);
    expect(state.getTheme()).toBe('light');
    expect(state.isLineWrapEnabled()).toBe(true);
  });

  runner.it('should validate correctly', () => {
    state.addDocument(doc1);
    state.setActiveDocument('/file1.js');

    expect(state.validate()).toBe(true);
  });

  runner.it('should get statistics', () => {
    state.addDocument(doc1);
    state.addDocument(doc2);
    doc1.setDirty(true);

    const stats = state.getStatistics();

    expect(stats.total_documents).toBe(2);
    expect(stats.dirty_documents).toBe(1);
    expect(stats.clean_documents).toBe(1);
  });

  runner.it('should emit events on changes', () => {
    const mock = createMock();
    state.on('document-added', mock);

    state.addDocument(doc1);

    expect(mock.callCount()).toBe(1);
  });
});

runner.run();
