/**
 * 파일: src/controllers/EditorController.js
 * 기능: 편집 로직 관리 및 TabController-EditorPane 연결
 * 책임:
 * - Document를 EditorPane에 표시
 * - Document 저장
 * - 편집 관련 이벤트 조율
 */

import BaseController from '../core/BaseController.js';
import ValidationUtils from '../utils/ValidationUtils.js';

export default class EditorController extends BaseController {
  constructor(_tabController, _fileSystemService) {
    super();

    ValidationUtils.assertNonNull(_tabController, 'TabController');
    ValidationUtils.assertNonNull(_fileSystemService, 'FileSystemService');

    this.registerService('tabController', _tabController);
    this.registerService('fileSystemService', _fileSystemService);

    this.editor_pane = null;
    this.current_document = null;
  }

  /**
   * 컨트롤러 초기화
   */
  initialize() {
    super.initialize();

    const tabController = this.getService('tabController');

    // TabController 이벤트 구독
    tabController.on('document-activated', (_document) => {
      this.displayDocument(_document);
    });

    tabController.on('document-closed', (_document) => {
      if (this.current_document === _document) {
        this.current_document = null;
        if (this.editor_pane) {
          this.editor_pane.clear();
        }
      }
    });
  }

  /**
   * EditorPane 설정
   * @param {EditorPane} _editorPane - 에디터 뷰
   */
  setEditorPane(_editorPane) {
    ValidationUtils.assertNonNull(_editorPane, 'EditorPane');

    this.editor_pane = _editorPane;
    this.registerView('editorPane', _editorPane);

    // EditorPane 이벤트 연결
    this.editor_pane.on('content-changed', ({ document: _document }) => {
      this.emit('content-changed', _document);
    });

    this.editor_pane.on('save-requested', (_document) => {
      this.saveDocument(_document);
    });

    this.editor_pane.on('cursor-moved', (_data) => {
      this.emit('cursor-moved', _data);
    });
  }

  /**
   * Document를 EditorPane에 표시
   * @param {Document} _document - 표시할 Document
   */
  displayDocument(_document) {
    try {
      ValidationUtils.assertNonNull(_document, 'Document');

      this.current_document = _document;

      if (this.editor_pane) {
        this.editor_pane.setDocument(_document);
      }

      this.emit('document-displayed', _document);
    } catch (error) {
      this.handleError(error, 'displayDocument');
      this.emit('error', {
        message: 'Document 표시 실패',
        error,
      });
    }
  }

  /**
   * Document를 파일에 저장
   * @param {Document} _document - 저장할 Document
   */
  async saveDocument(_document) {
    try {
      ValidationUtils.assertNonNull(_document, 'Document');

      const fileSystemService = this.getService('fileSystemService');
      const content = _document.getText();

      await fileSystemService.writeFile(_document.file_node, content);

      _document.markAsSaved();

      this.emit('document-saved', _document);
      this.emit('status-message', `${_document.file_node.name} 저장됨`);
    } catch (error) {
      this.handleError(error, 'saveDocument');
      this.emit('error', {
        message: `저장 실패: ${_document?.file_node?.name || '알 수 없는 파일'}`,
        error,
      });
    }
  }

  /**
   * 모든 수정된 Document 저장
   */
  async saveAllDocuments() {
    try {
      const tabController = this.getService('tabController');
      const documents = Array.from(tabController.documents.values());
      const dirtyDocuments = documents.filter((_doc) => _doc.isDirty());

      if (dirtyDocuments.length === 0) {
        this.emit('status-message', '저장할 파일이 없습니다');
        return;
      }

      const promises = dirtyDocuments.map((_doc) => this.saveDocument(_doc));
      await Promise.all(promises);

      this.emit('status-message', `${dirtyDocuments.length}개 파일 저장됨`);
    } catch (error) {
      this.handleError(error, 'saveAllDocuments');
      this.emit('error', {
        message: '일괄 저장 실패',
        error,
      });
    }
  }

  /**
   * 현재 활성 Document 반환
   * @returns {Document|null}
   */
  getCurrentDocument() {
    return this.current_document;
  }

  /**
   * EditorPane 반환
   * @returns {EditorPane|null}
   */
  getEditorPane() {
    return this.editor_pane;
  }

  /**
   * 컨트롤러 종료
   */
  destroy() {
    if (this.editor_pane) {
      this.editor_pane.destroy();
      this.editor_pane = null;
    }

    this.current_document = null;

    super.destroy();
  }
}
