/**
 * 파일: src/controllers/EditorController.js
 * 기능: 에디터 로직 제어
 * 책임: Document와 UI 컴포넌트 간 조율
 */

import SearchService from '../services/SearchService.js';
import EventEmitter from '../utils/EventEmitter.js';

export default class EditorController extends EventEmitter {
  constructor(_tabController, _fileSystemService) {
    super();
    this.tabController = _tabController;
    this.fileSystemService = _fileSystemService;
    this.current_document = null;
    this.editorPane = null;

    // 검색 관련 추가
    this.searchService = new SearchService();
    this.search_panel = null;
    this.current_search_results = [];
    this.current_search_index = -1;
  }

  /**
   * SearchPanel 설정
   */
  setSearchPanel(_searchPanel) {
    this.search_panel = _searchPanel;

    // 검색어 변경
    this.search_panel.on('search-changed', (_query, _options) => {
      this.#performSearch(_query, _options);
    });

    // 다음 찾기
    this.search_panel.on('find-next', () => {
      this.#findNext();
    });

    // 이전 찾기
    this.search_panel.on('find-previous', () => {
      this.#findPrevious();
    });

    // 하나 바꾸기
    this.search_panel.on('replace-one', (_replacement) => {
      this.#replaceOne(_replacement);
    });

    // 전체 바꾸기
    this.search_panel.on('replace-all', (_query, _replacement, _options) => {
      this.#replaceAll(_query, _replacement, _options);
    });

    // 패널 닫기
    this.search_panel.on('close-requested', () => {
      this.editorPane.clearSearchHighlights();
      this.current_search_results = [];
      this.current_search_index = -1;
    });
  }

  /**
   * 검색 패널 표시
   */
  showSearch() {
    if (!this.search_panel) return;

    this.search_panel.show();
    this.search_panel.setMode('search');
    this.search_panel.focus();
  }

  /**
   * 바꾸기 패널 표시
   */
  showReplace() {
    if (!this.search_panel) return;

    this.search_panel.show();
    this.search_panel.setMode('replace');
    this.search_panel.focus();
  }

  /**
   * 검색 수행
   */
  #performSearch(_query, _options) {
    if (!this.current_document || !_query) {
      this.current_search_results = [];
      this.current_search_index = -1;
      this.editorPane.clearSearchHighlights();
      this.search_panel.updateResults([], -1);
      return;
    }

    // 정규식 검증
    if (_options.regex) {
      const validation = this.searchService.validateRegex(_query);
      if (!validation.valid) {
        console.error('잘못된 정규식:', validation.error);
        this.current_search_results = [];
        this.current_search_index = -1;
        this.editorPane.clearSearchHighlights();
        this.search_panel.updateResults([], -1);
        return;
      }
    }

    const text = this.current_document.getText();
    this.current_search_results = this.searchService.search(text, _query, _options);

    if (this.current_search_results.length > 0) {
      this.current_search_index = 0;
    } else {
      this.current_search_index = -1;
    }

    this.editorPane.highlightSearchResults(this.current_search_results, this.current_search_index);
    this.search_panel.updateResults(this.current_search_results, this.current_search_index);
  }

  /**
   * 다음 찾기
   */
  #findNext() {
    if (this.current_search_results.length === 0) return;

    this.current_search_index = (this.current_search_index + 1) % this.current_search_results.length;

    this.editorPane.highlightSearchResults(this.current_search_results, this.current_search_index);
    this.search_panel.updateResults(this.current_search_results, this.current_search_index);
  }

  /**
   * 이전 찾기
   */
  #findPrevious() {
    if (this.current_search_results.length === 0) return;

    this.current_search_index = (this.current_search_index - 1 + this.current_search_results.length) % this.current_search_results.length;

    this.editorPane.highlightSearchResults(this.current_search_results, this.current_search_index);
    this.search_panel.updateResults(this.current_search_results, this.current_search_index);
  }

  /**
   * 하나 바꾸기
   */
  #replaceOne(_replacement) {
    if (!this.current_document || this.current_search_results.length === 0) return;
    if (this.current_search_index < 0) return;

    const result = this.current_search_results[this.current_search_index];
    const oldText = this.current_document.getText();
    const newText = this.searchService.replaceOne(oldText, result, _replacement);

    // Document 업데이트
    this.current_document.content = newText;
    this.current_document.lines = newText.split('\n');
    this.current_document.is_dirty = true;

    // 검색 다시 수행 (인덱스 변경됨)
    const lastSearch = this.searchService.getLastSearch();
    if (lastSearch) {
      this.#performSearch(lastSearch.query, lastSearch.options);
    }
  }

  /**
   * 전체 바꾸기
   */
  #replaceAll(_query, _replacement, _options) {
    if (!this.current_document || !_query) return;

    const oldText = this.current_document.getText();
    const result = this.searchService.replace(oldText, _query, _replacement, _options);

    if (result.count === 0) {
      alert('바꿀 항목이 없습니다.');
      return;
    }

    // Document 업데이트
    this.current_document.content = result.newText;
    this.current_document.lines = result.newText.split('\n');
    this.current_document.is_dirty = true;

    // 검색 결과 초기화
    this.current_search_results = [];
    this.current_search_index = -1;
    this.editorPane.clearSearchHighlights();
    this.search_panel.updateResults([], -1);

    this.emit('status-message', `${result.count}개 항목을 바꿨습니다.`);
  }

  // 기존 메서드들...
  setEditorPane(_editorPane) {
    this.editorPane = _editorPane;

    this.editorPane.on('content-changed', ({ document }) => {
      this.emit('content-changed', document);
    });

    this.editorPane.on('save-requested', (_document) => {
      this.saveDocument(_document);
    });
  }

  displayDocument(_document) {
    this.current_document = _document;

    if (this.editorPane) {
      this.editorPane.setDocument(_document);
    }

    // 검색 결과 초기화
    this.current_search_results = [];
    this.current_search_index = -1;

    this.emit('document-displayed', _document);
  }

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

  async saveAllDocuments() {
    const documents = this.tabController.getAllDocuments();
    const dirtyDocs = documents.filter((_doc) => _doc.isDirty());

    for (const doc of dirtyDocs) {
      await this.saveDocument(doc);
    }
  }

  getCurrentDocument() {
    return this.current_document;
  }

  focus() {
    if (this.editorPane) {
      this.editorPane.focus();
    }
  }
}
