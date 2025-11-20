/**
 * 파일: src/controllers/TabController.js
 * 기능: Document 객체들의 생명주기 관리
 * 책임:
 * - Document 생성, 활성화, 닫기
 * - Document 상태 추적 (dirty, active)
 * - Document 이벤트 중계
 */

import BaseController from '../core/BaseController.js';
import Document from '../models/Document.js';
import ValidationUtils from '../utils/ValidationUtils.js';

export default class TabController extends BaseController {
  constructor() {
    super();

    // 파일 경로 → Document 매핑
    this.documents = new Map();

    // 현재 활성 Document
    this.active_document = null;
  }

  /**
   * 컨트롤러 초기화
   */
  initialize() {
    super.initialize();
  }

  /**
   * Document 열기 (또는 기존 것 활성화)
   * @param {FileNode} _fileNode - 파일 노드
   * @param {string} _content - 파일 내용
   * @returns {Document}
   */
  openDocument(_fileNode, _content) {
    try {
      ValidationUtils.assertNonNull(_fileNode, 'FileNode');
      ValidationUtils.assertString(_content, 'Content');

      const path = _fileNode.getPath();

      // 이미 열린 Document가 있으면 활성화만
      if (this.documents.has(path)) {
        const existingDoc = this.documents.get(path);
        this.activateDocument(existingDoc);
        return existingDoc;
      }

      // 새 Document 생성
      const document = new Document(_fileNode, _content);

      // Document 변경 리스너 등록
      document.onChange(() => {
        this.emit('document-changed', document);
      });

      // Map에 저장
      this.documents.set(path, document);

      this.emit('document-opened', document);

      // 자동 활성화
      this.activateDocument(document);

      return document;
    } catch (error) {
      this.handleError(error, 'openDocument');
      this.emit('error', {
        message: `Document 열기 실패: ${_fileNode?.name || '알 수 없는 파일'}`,
        error,
      });
      return null;
    }
  }

  /**
   * Document 활성화
   * @param {Document} _document - 활성화할 Document
   */
  activateDocument(_document) {
    try {
      ValidationUtils.assertNonNull(_document, 'Document');

      // 중복 활성화 방지
      if (this.active_document === _document) {
        return;
      }

      this.active_document = _document;

      this.emit('document-activated', _document);
    } catch (error) {
      this.handleError(error, 'activateDocument');
    }
  }

  /**
   * Document 닫기
   * @param {Document} _document - 닫을 Document
   * @returns {boolean} 닫기 성공 여부
   */
  closeDocument(_document) {
    try {
      ValidationUtils.assertNonNull(_document, 'Document');

      // 수정된 내용이 있으면 확인
      if (_document.isDirty()) {
        const confirmed = window.confirm(`"${_document.file_node.name}"에 저장하지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?`);

        if (!confirmed) {
          return false;
        }
      }

      const path = _document.file_node.getPath();

      // Map에서 제거
      this.documents.delete(path);

      // 활성 Document였다면 null로 설정
      if (this.active_document === _document) {
        this.active_document = null;

        // 다른 Document가 있으면 그것을 활성화
        const remainingDocs = Array.from(this.documents.values());
        if (remainingDocs.length > 0) {
          this.activateDocument(remainingDocs[0]);
        }
      }

      this.emit('document-closed', _document);

      return true;
    } catch (error) {
      this.handleError(error, 'closeDocument');
      return false;
    }
  }

  /**
   * 모든 Document 닫기
   * @returns {boolean} 모든 Document 닫기 성공 여부
   */
  closeAllDocuments() {
    try {
      const documents = Array.from(this.documents.values());

      // 수정된 Document가 있는지 확인
      const dirtyDocs = documents.filter((_doc) => _doc.isDirty());

      if (dirtyDocs.length > 0) {
        const confirmed = window.confirm(`${dirtyDocs.length}개의 파일에 저장하지 않은 변경사항이 있습니다. 정말 모두 닫으시겠습니까?`);

        if (!confirmed) {
          return false;
        }
      }

      // 모든 Document 닫기
      for (const document of documents) {
        const path = document.file_node.getPath();
        this.documents.delete(path);
        this.emit('document-closed', document);
      }

      this.active_document = null;

      this.emit('all-documents-closed');

      return true;
    } catch (error) {
      this.handleError(error, 'closeAllDocuments');
      return false;
    }
  }

  /**
   * 특정 파일의 Document 찾기
   * @param {FileNode} _fileNode - 파일 노드
   * @returns {Document|null}
   */
  findDocument(_fileNode) {
    try {
      ValidationUtils.assertNonNull(_fileNode, 'FileNode');

      const path = _fileNode.getPath();
      return this.documents.get(path) || null;
    } catch (error) {
      this.handleError(error, 'findDocument');
      return null;
    }
  }

  /**
   * 현재 활성 Document 반환
   * @returns {Document|null}
   */
  getActiveDocument() {
    return this.active_document;
  }

  /**
   * 모든 Document 반환
   * @returns {Document[]}
   */
  getAllDocuments() {
    return Array.from(this.documents.values());
  }

  /**
   * 수정된 Document 목록 반환
   * @returns {Document[]}
   */
  getDirtyDocuments() {
    return this.getAllDocuments().filter((_doc) => _doc.isDirty());
  }

  /**
   * 열린 Document 개수
   * @returns {number}
   */
  getDocumentCount() {
    return this.documents.size;
  }

  /**
   * Document가 열려있는지 확인
   * @param {FileNode} _fileNode - 파일 노드
   * @returns {boolean}
   */
  hasDocument(_fileNode) {
    try {
      ValidationUtils.assertNonNull(_fileNode, 'FileNode');

      const path = _fileNode.getPath();
      return this.documents.has(path);
    } catch (error) {
      return false;
    }
  }

  /**
   * 컨트롤러 종료
   */
  destroy() {
    // 모든 Document 강제 닫기
    for (const document of this.documents.values()) {
      this.emit('document-closed', document);
    }

    this.documents.clear();
    this.active_document = null;

    super.destroy();
  }
}
