/**
 * 파일: src/models/EditorState.js
 * 기능: 에디터 전체 상태 모델
 * 책임: 열린 문서, 활성 문서, 레이아웃 상태 관리
 */

import BaseModel from '../core/BaseModel.js';
import ValidationUtils from '../utils/ValidationUtils.js';
import Document from './Document.js';

export default class EditorState extends BaseModel {
  constructor() {
    super();

    // BaseModel의 set 사용
    this.set('documents', new Map()); // path -> Document
    this.set('active_document_path', null);
    this.set('document_order', []); // 탭 순서
    this.set('split_view_enabled', false);
    this.set('split_view_orientation', 'horizontal'); // 'horizontal' | 'vertical'
    this.set('sidebar_visible', true);
    this.set('sidebar_width', 250);
    this.set('font_size', 14);
    this.set('theme', 'dark');
    this.set('line_wrap', false);

    this.clearDirty();
  }

  /**
   * 문서 추가
   */
  addDocument(_document) {
    ValidationUtils.assertInstanceOf(_document, Document, 'Document');

    const documents = this.get('documents');
    const path = _document.getFilePath();

    if (documents.has(path)) {
      throw new Error(`Document already exists: ${path}`);
    }

    documents.set(path, _document);
    this.set('documents', documents);

    // 탭 순서에 추가
    const order = this.get('document_order');
    order.push(path);
    this.set('document_order', order);

    // 문서 변경 리스너 등록
    _document.on('change', () => {
      this.emit('document-changed', { document: _document });
    });

    this.emit('document-added', { document: _document, path });
  }

  /**
   * 문서 제거
   */
  removeDocument(_path) {
    ValidationUtils.assertString(_path, 'Path');

    const documents = this.get('documents');
    const document = documents.get(_path);

    if (!document) {
      throw new Error(`Document not found: ${_path}`);
    }

    // 활성 문서인 경우 다른 문서로 전환
    if (this.get('active_document_path') === _path) {
      const next_document = this.#findNextDocument(_path);
      this.set('active_document_path', next_document ? next_document.getFilePath() : null);
    }

    // 문서 제거
    documents.delete(_path);
    this.set('documents', documents);

    // 탭 순서에서 제거
    const order = this.get('document_order');
    const index = order.indexOf(_path);
    if (index !== -1) {
      order.splice(index, 1);
      this.set('document_order', order);
    }

    // 이벤트 리스너 제거
    document.removeAllListeners();

    this.emit('document-removed', { path });
  }

  /**
   * 다음 문서 찾기 (탭 순서 기준)
   */
  #findNextDocument(_current_path) {
    const order = this.get('document_order');
    const index = order.indexOf(_current_path);

    if (index === -1 || order.length <= 1) {
      return null;
    }

    // 다음 문서 (또는 이전 문서)
    const next_index = index < order.length - 1 ? index + 1 : index - 1;
    const next_path = order[next_index];

    return this.getDocument(next_path);
  }

  /**
   * 문서 가져오기
   */
  getDocument(_path) {
    ValidationUtils.assertString(_path, 'Path');
    const documents = this.get('documents');
    return documents.get(_path) || null;
  }

  /**
   * 모든 문서 가져오기
   */
  getAllDocuments() {
    const documents = this.get('documents');
    return Array.from(documents.values());
  }

  /**
   * 문서 개수
   */
  getDocumentCount() {
    return this.get('documents').size;
  }

  /**
   * 문서 존재 여부
   */
  hasDocument(_path) {
    ValidationUtils.assertString(_path, 'Path');
    return this.get('documents').has(_path);
  }

  /**
   * 활성 문서 가져오기
   */
  getActiveDocument() {
    const path = this.get('active_document_path');
    return path ? this.getDocument(path) : null;
  }

  /**
   * 활성 문서 설정
   */
  setActiveDocument(_path) {
    if (_path !== null) {
      ValidationUtils.assertString(_path, 'Path');

      if (!this.hasDocument(_path)) {
        throw new Error(`Document not found: ${_path}`);
      }
    }

    const old_path = this.get('active_document_path');
    this.set('active_document_path', _path);

    this.emit('active-document-changed', {
      old_path,
      new_path: _path,
      document: _path ? this.getDocument(_path) : null,
    });
  }

  /**
   * 문서 순서 가져오기
   */
  getDocumentOrder() {
    return [...this.get('document_order')];
  }

  /**
   * 문서 순서 변경
   */
  reorderDocuments(_from_index, _to_index) {
    ValidationUtils.assertInteger(_from_index, 'From index');
    ValidationUtils.assertInteger(_to_index, 'To index');

    const order = this.get('document_order');

    if (_from_index < 0 || _from_index >= order.length) {
      throw new Error(`Invalid from index: ${_from_index}`);
    }

    if (_to_index < 0 || _to_index >= order.length) {
      throw new Error(`Invalid to index: ${_to_index}`);
    }

    const [item] = order.splice(_from_index, 1);
    order.splice(_to_index, 0, item);
    this.set('document_order', order);

    this.emit('documents-reordered', { from: _from_index, to: _to_index });
  }

  /**
   * 수정된 문서 목록
   */
  getDirtyDocuments() {
    return this.getAllDocuments().filter((_doc) => _doc.isDirty());
  }

  /**
   * 수정된 문서 존재 여부
   */
  hasDirtyDocuments() {
    return this.getDirtyDocuments().length > 0;
  }

  /**
   * Split View 활성화 여부
   */
  isSplitViewEnabled() {
    return this.get('split_view_enabled');
  }

  /**
   * Split View 설정
   */
  setSplitViewEnabled(_enabled) {
    ValidationUtils.assertBoolean(_enabled, 'Enabled');
    this.set('split_view_enabled', _enabled);
    this.emit('split-view-changed', { enabled: _enabled });
  }

  /**
   * Split View 방향 가져오기
   */
  getSplitViewOrientation() {
    return this.get('split_view_orientation');
  }

  /**
   * Split View 방향 설정
   */
  setSplitViewOrientation(_orientation) {
    ValidationUtils.assertContains(['horizontal', 'vertical'], _orientation, 'Orientation');
    this.set('split_view_orientation', _orientation);
    this.emit('split-view-orientation-changed', { orientation: _orientation });
  }

  /**
   * Sidebar 표시 여부
   */
  isSidebarVisible() {
    return this.get('sidebar_visible');
  }

  /**
   * Sidebar 표시 설정
   */
  setSidebarVisible(_visible) {
    ValidationUtils.assertBoolean(_visible, 'Visible');
    this.set('sidebar_visible', _visible);
    this.emit('sidebar-visibility-changed', { visible: _visible });
  }

  /**
   * Sidebar 너비 가져오기
   */
  getSidebarWidth() {
    return this.get('sidebar_width');
  }

  /**
   * Sidebar 너비 설정
   */
  setSidebarWidth(_width) {
    ValidationUtils.assertNumber(_width, 'Width');
    ValidationUtils.assertInRange(_width, 100, 800, 'Width');
    this.set('sidebar_width', _width);
    this.emit('sidebar-width-changed', { width: _width });
  }

  /**
   * 폰트 크기 가져오기
   */
  getFontSize() {
    return this.get('font_size');
  }

  /**
   * 폰트 크기 설정
   */
  setFontSize(_size) {
    ValidationUtils.assertNumber(_size, 'Font size');
    ValidationUtils.assertInRange(_size, 8, 32, 'Font size');
    this.set('font_size', _size);
    this.emit('font-size-changed', { size: _size });
  }

  /**
   * 테마 가져오기
   */
  getTheme() {
    return this.get('theme');
  }

  /**
   * 테마 설정
   */
  setTheme(_theme) {
    ValidationUtils.assertContains(['light', 'dark'], _theme, 'Theme');
    this.set('theme', _theme);
    this.emit('theme-changed', { theme: _theme });
  }

  /**
   * 줄 바꿈 여부
   */
  isLineWrapEnabled() {
    return this.get('line_wrap');
  }

  /**
   * 줄 바꿈 설정
   */
  setLineWrapEnabled(_enabled) {
    ValidationUtils.assertBoolean(_enabled, 'Enabled');
    this.set('line_wrap', _enabled);
    this.emit('line-wrap-changed', { enabled: _enabled });
  }

  /**
   * 모든 문서 닫기
   */
  closeAllDocuments() {
    const paths = this.getDocumentOrder();
    paths.forEach((_path) => {
      this.removeDocument(_path);
    });
    this.emit('all-documents-closed');
  }

  /**
   * 수정되지 않은 문서 모두 닫기
   */
  closeCleanDocuments() {
    const clean_documents = this.getAllDocuments().filter((_doc) => !_doc.isDirty());
    clean_documents.forEach((_doc) => {
      this.removeDocument(_doc.getFilePath());
    });
  }

  /**
   * JSON 직렬화
   */
  toJSON() {
    return {
      active_document_path: this.get('active_document_path'),
      document_order: this.getDocumentOrder(),
      split_view_enabled: this.isSplitViewEnabled(),
      split_view_orientation: this.getSplitViewOrientation(),
      sidebar_visible: this.isSidebarVisible(),
      sidebar_width: this.getSidebarWidth(),
      font_size: this.getFontSize(),
      theme: this.getTheme(),
      line_wrap: this.isLineWrapEnabled(),
    };
  }

  /**
   * JSON 역직렬화
   */
  fromJSON(_json) {
    ValidationUtils.assertObject(_json, 'JSON');

    if (_json.active_document_path !== undefined) {
      this.set('active_document_path', _json.active_document_path);
    }

    if (_json.document_order) {
      this.set('document_order', _json.document_order);
    }

    if (_json.split_view_enabled !== undefined) {
      this.setSplitViewEnabled(_json.split_view_enabled);
    }

    if (_json.split_view_orientation) {
      this.setSplitViewOrientation(_json.split_view_orientation);
    }

    if (_json.sidebar_visible !== undefined) {
      this.setSidebarVisible(_json.sidebar_visible);
    }

    if (_json.sidebar_width !== undefined) {
      this.setSidebarWidth(_json.sidebar_width);
    }

    if (_json.font_size !== undefined) {
      this.setFontSize(_json.font_size);
    }

    if (_json.theme) {
      this.setTheme(_json.theme);
    }

    if (_json.line_wrap !== undefined) {
      this.setLineWrapEnabled(_json.line_wrap);
    }
  }

  /**
   * 검증
   */
  validate() {
    try {
      const documents = this.get('documents');
      const active_path = this.get('active_document_path');

      if (active_path !== null && !documents.has(active_path)) {
        throw new Error('Active document not found in documents');
      }

      const order = this.get('document_order');
      if (order.length !== documents.size) {
        throw new Error('Document order size mismatch');
      }

      return true;
    } catch (error) {
      console.error('EditorState validation failed:', error);
      return false;
    }
  }

  /**
   * 상태 통계
   */
  getStatistics() {
    const all_documents = this.getAllDocuments();
    const dirty_documents = this.getDirtyDocuments();

    return {
      total_documents: this.getDocumentCount(),
      dirty_documents: dirty_documents.length,
      clean_documents: all_documents.length - dirty_documents.length,
      has_active_document: this.getActiveDocument() !== null,
      split_view_enabled: this.isSplitViewEnabled(),
      sidebar_visible: this.isSidebarVisible(),
    };
  }

  /**
   * 디버그 정보
   */
  getDebugInfo() {
    return {
      ...super.getDebugInfo(),
      ...this.getStatistics(),
      active_path: this.get('active_document_path'),
      document_paths: this.getDocumentOrder(),
    };
  }
}
