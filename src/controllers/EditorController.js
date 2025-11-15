/**
 * 파일: src/controllers/EditorController.js
 * 기능: 에디터 로직 제어
 * 책임: Document와 UI 컴포넌트 간 조율
 */

import EventEmitter from '../utils/EventEmitter.js';

export default class EditorController extends EventEmitter {
  constructor(_tabController, _fileSystemService) {
    super();
    this.tabController = _tabController;
    this.fileSystemService = _fileSystemService;
    this.current_document = null;
  }

  /**
   * EditorPane 설정
   */
  setEditorPane(_editorPane) {
    this.editorPane = _editorPane;

    // EditorPane 이벤트 연결
    this.editorPane.on('content-changed', ({ document }) => {
      this.emit('content-changed', document);
    });

    this.editorPane.on('save-requested', (_document) => {
      this.saveDocument(_document);
    });
  }

  /**
   * Document 표시
   */
  displayDocument(_document) {
    this.current_document = _document;

    if (this.editorPane) {
      this.editorPane.setDocument(_document);
    }

    this.emit('document-displayed', _document);
  }

  /**
   * Document 저장
   */
  async saveDocument(_document) {
    if (!_document) return;

    try {
      const content = _document.getText();
      await this.fileSystemService.writeFile(_document.file_node, content);

      _document.markAsSaved();

      this.emit('document-saved', _document);
      this.emit('status-message', `${_document.file_node.name} 저장됨`);
    } catch (error) {
      console.error('저장 실패:', error);
      this.emit('error', {
        message: `저장 실패: ${_document.file_node.name}`,
        error,
      });
    }
  }

  /**
   * 모든 Document 저장
   */
  async saveAllDocuments() {
    const documents = this.tabController.getAllDocuments();
    const dirtyDocs = documents.filter((_doc) => _doc.isDirty());

    for (const doc of dirtyDocs) {
      await this.saveDocument(doc);
    }
  }

  /**
   * 현재 Document 반환
   */
  getCurrentDocument() {
    return this.current_document;
  }

  /**
   * 에디터 포커스
   */
  focus() {
    if (this.editorPane) {
      this.editorPane.focus();
    }
  }
}
