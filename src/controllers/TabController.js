/**
 * 파일: src/controllers/TabController.js
 * 기능: 탭 관리 로직
 * 책임: 열린 Document 관리, 탭 전환, 닫기 처리
 */

import Document from '../models/Document.js';
import EventEmitter from '../utils/EventEmitter.js';

export default class TabController extends EventEmitter {
  constructor() {
    super();
    this.documents = new Map();
    this.active_document = null;
  }

  /**
   * 파일 열기 (새 Document 생성)
   */
  openDocument(_fileNode, _content) {
    const path = _fileNode.getFullPath();

    // 이미 열린 문서인지 확인
    if (this.documents.has(path)) {
      const doc = this.documents.get(path);
      this.activateDocument(doc);
      return doc;
    }

    // 새 Document 생성
    const doc = new Document(_fileNode, _content);
    this.documents.set(path, doc);

    // Document 변경 감지
    doc.onChange((_changedDoc) => {
      this.emit('document-changed', _changedDoc);
    });

    this.activateDocument(doc);
    this.emit('document-opened', doc);

    return doc;
  }

  /**
   * Document 활성화
   */
  activateDocument(_document) {
    // 이미 활성화된 Document면 스킵 (무한 루프 방지)
    if (this.active_document === _document) {
      return;
    }

    this.active_document = _document;
    this.emit('document-activated', _document);
  }

  /**
   * Document 닫기
   */
  closeDocument(_document) {
    // 수정된 문서는 확인 필요
    if (_document.isDirty()) {
      const confirmed = confirm(`${_document.file_node.name} 파일이 수정되었습니다. 저장하지 않고 닫으시겠습니까?`);
      if (!confirmed) {
        return false;
      }
    }

    const path = _document.file_node.getFullPath();
    this.documents.delete(path);

    if (this.active_document === _document) {
      this.active_document = null;
    }

    this.emit('document-closed', _document);
    return true;
  }

  /**
   * 모든 Document 닫기
   */
  closeAllDocuments() {
    const docs = Array.from(this.documents.values());

    for (const doc of docs) {
      if (!this.closeDocument(doc)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 활성 Document 반환
   */
  getActiveDocument() {
    return this.active_document;
  }

  /**
   * 모든 Document 반환
   */
  getAllDocuments() {
    return Array.from(this.documents.values());
  }

  /**
   * 특정 파일의 Document 찾기
   */
  findDocument(_fileNode) {
    const path = _fileNode.getFullPath();
    return this.documents.get(path) || null;
  }

  /**
   * 열린 Document 개수
   */
  getDocumentCount() {
    return this.documents.size;
  }
}
