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
    tabController.on('document:activated', (_document) => {
      this.displayDocument(_document);
    });

    tabController.on('document:closed', (_document) => {
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

    // EditorPane 이벤트 구독
    _editorPane.on('content:changed', (_event) => {
      if (this.current_document) {
        this.current_document.setContent(_event.content);
      }
    });

    _editorPane.on('request:save', () => {
      this.saveCurrentDocument();
    });
  }

  /**
   * Document 표시
   * @param {Document} _document
   */
  displayDocument(_document) {
    try {
      ValidationUtils.assertNonNull(_document, 'Document');

      if (!this.editor_pane) {
        throw new Error('EditorPane이 설정되지 않았습니다');
      }

      this.current_document = _document;
      this.editor_pane.setDocument(_document);

      this.emit('document:displayed', _document);
    } catch (error) {
      this.handleError(error, 'displayDocument');
    }
  }

  /**
   * 현재 Document 저장
   */
  async saveCurrentDocument() {
    if (!this.current_document) {
      console.warn('저장할 Document가 없습니다');
      return;
    }

    await this.saveDocument(this.current_document);
  }

  /**
   * Document 저장
   * @param {Document} _document
   */
  async saveDocument(_document) {
    try {
      ValidationUtils.assertNonNull(_document, 'Document');

      const fileSystemService = this.getService('fileSystemService');

      await fileSystemService.writeFile(_document.file_node, _document.getContent());

      _document.markAsSaved();

      this.emit('document:saved', _document);
      this.emit('status:message', {
        message: `"${_document.file_node.name}" 저장됨`,
        type: 'success',
      });
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
      const dirtyDocs = tabController.getDirtyDocuments();

      if (dirtyDocs.length === 0) {
        this.emit('status:message', {
          message: '저장할 파일이 없습니다',
          type: 'info',
        });
        return;
      }

      let savedCount = 0;
      const errors = [];

      for (const doc of dirtyDocs) {
        try {
          await this.saveDocument(doc);
          savedCount++;
        } catch (error) {
          errors.push({
            file: doc.file_node.name,
            error,
          });
        }
      }

      if (errors.length === 0) {
        this.emit('status:message', {
          message: `${savedCount}개 파일 저장 완료`,
          type: 'success',
        });
      } else {
        this.emit('status:message', {
          message: `${savedCount}개 파일 저장, ${errors.length}개 실패`,
          type: 'warning',
        });
      }
    } catch (error) {
      this.handleError(error, 'saveAllDocuments');
    }
  }

  /**
   * 현재 Document 가져오기
   * @returns {Document|null}
   */
  getCurrentDocument() {
    return this.current_document;
  }

  /**
   * EditorPane 가져오기
   * @returns {EditorPane|null}
   */
  getEditorPane() {
    return this.editor_pane;
  }

  /**
   * 컨트롤러 파괴
   */
  destroy() {
    this.editor_pane = null;
    this.current_document = null;

    super.destroy();
  }
}
