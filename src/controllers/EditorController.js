/**
 * 파일: src/controllers/EditorController.js
 * 수정: 이벤트 리스너 순서 조정, 디버깅 추가
 */

import CompletionService from '../services/CompletionService.js';
import SearchService from '../services/SearchService.js';
import EventEmitter from '../utils/EventEmitter.js';

export default class EditorController extends EventEmitter {
  constructor(_tabController, _fileSystemService) {
    super();
    this.tabController = _tabController;
    this.fileSystemService = _fileSystemService;
    this.current_document = null;
    this.editorPane = null;

    // 검색 관련
    this.searchService = new SearchService();
    this.search_panel = null;
    this.current_search_results = [];
    this.current_search_index = -1;

    // 자동완성
    this.completionService = new CompletionService();
    this.completion_panel = null;
  }

  /**
   * SearchPanel 설정
   */
  setSearchPanel(_searchPanel) {
    this.search_panel = _searchPanel;

    this.search_panel.on('search-changed', (_query, _options) => {
      this.#performSearch(_query, _options);
    });

    this.search_panel.on('find-next', () => {
      this.#findNext();
    });

    this.search_panel.on('find-previous', () => {
      this.#findPrevious();
    });

    this.search_panel.on('replace-one', (_replacement) => {
      this.#replaceOne(_replacement);
    });

    this.search_panel.on('replace-all', (_query, _replacement, _options) => {
      this.#replaceAll(_query, _replacement, _options);
    });

    this.search_panel.on('close-requested', () => {
      this.editorPane.clearSearchHighlights();
      this.current_search_results = [];
      this.current_search_index = -1;
    });
  }

  /**
   * CompletionPanel 설정
   */
  setCompletionPanel(_completionPanel) {
    this.completion_panel = _completionPanel;
    console.log('[EditorController] CompletionPanel 설정됨');

    this.completion_panel.on('item-selected', (_item) => {
      console.log('[EditorController] 항목 선택됨:', _item.label);
      this.editorPane.insertCompletion(_item);
      this.completion_panel.hide();
      this.editorPane.setCompletionPanelVisible(false);
    });

    this.completion_panel.on('close-requested', () => {
      console.log('[EditorController] 패널 닫기 요청');
      this.completion_panel.hide();
      this.editorPane.setCompletionPanelVisible(false);
    });
  }

  /**
   * EditorPane 설정
   */
  setEditorPane(_editorPane) {
    this.editorPane = _editorPane;
    console.log('[EditorController] EditorPane 설정됨');

    // 내용 변경
    this.editorPane.on('content-changed', ({ document }) => {
      this.emit('content-changed', document);
    });

    // 저장 요청
    this.editorPane.on('save-requested', (_document) => {
      this.saveDocument(_document);
    });

    // 자동완성 트리거
    this.editorPane.on('trigger-completion', (_data) => {
      console.log('[EditorController] trigger-completion 이벤트 수신:', _data);
      this.#handleCompletionTrigger(_data);
    });

    // 자동완성 네비게이션
    this.editorPane.on('completion-next', () => {
      console.log('[EditorController] completion-next');
      if (this.completion_panel) {
        this.completion_panel.selectNext();
      }
    });

    this.editorPane.on('completion-previous', () => {
      console.log('[EditorController] completion-previous');
      if (this.completion_panel) {
        this.completion_panel.selectPrevious();
      }
    });

    this.editorPane.on('completion-confirm', () => {
      console.log('[EditorController] completion-confirm');
      if (this.completion_panel) {
        this.completion_panel.handleEnter();
      }
    });

    this.editorPane.on('completion-cancel', () => {
      console.log('[EditorController] completion-cancel');
      if (this.completion_panel) {
        this.completion_panel.handleEscape();
      }
    });
  }

  /**
   * 자동완성 트리거 처리
   */
  #handleCompletionTrigger(_data) {
    if (!this.current_document || !this.completion_panel) return;

    const { line, column, prefix, contextType, objectName } = _data;
    const language = this.#detectLanguage();

    const items = this.completionService.getCompletions(this.current_document, line, column, language, contextType, objectName);

    if (items.length === 0) {
      this.completion_panel.hide();
      this.editorPane.setCompletionPanelVisible(false);
      return;
    }

    const coords = this.editorPane.getCursorCoordinates();

    this.completion_panel.show(items, coords);
    this.editorPane.setCompletionPanelVisible(true);
  }

  /**
   * 수동 자동완성 트리거 (Ctrl+Space)
   */
  triggerCompletion() {
    if (!this.editorPane || !this.current_document) return;

    const cursorPos = this.editorPane.getCursorPosition();
    if (!cursorPos) return;

    const currentLine = this.current_document.getLine(cursorPos.line);
    if (!currentLine) return;

    const beforeCursor = currentLine.substring(0, cursorPos.column);

    // 'this.' 패턴
    const thisMatch = beforeCursor.match(/\bthis\.([a-zA-Z_$][a-zA-Z0-9_$]*)$/);

    // 'obj.' 패턴
    const objMatch = beforeCursor.match(/\b([a-z_$][a-zA-Z0-9_$]*)\.([a-zA-Z_$][a-zA-Z0-9_$]*)$/);

    // 일반 식별자
    const prefixMatch = beforeCursor.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);

    let prefix = '';
    let contextType = 'global';
    let objectName = null;

    if (thisMatch) {
      prefix = thisMatch[1];
      contextType = 'this';
    } else if (objMatch) {
      objectName = objMatch[1];
      prefix = objMatch[2];
      contextType = 'object';
    } else if (prefixMatch) {
      prefix = prefixMatch[0];
    }

    this.#handleCompletionTrigger({
      line: cursorPos.line,
      column: cursorPos.column,
      prefix: prefix,
      contextType: contextType,
      objectName: objectName,
    });
  }

  /**
   * 언어 감지
   */
  #detectLanguage() {
    if (!this.current_document || !this.current_document.file_node) {
      return 'plaintext';
    }

    const ext = this.current_document.file_node.getExtension();
    const langMap = {
      '.js': 'javascript',
      '.html': 'html',
      '.css': 'css',
      '.md': 'markdown',
    };

    return langMap[ext] || 'plaintext';
  }

  // 검색 관련 메서드들 (동일)
  showSearch() {
    if (!this.search_panel) return;
    this.search_panel.show();
    this.search_panel.setMode('search');
    this.search_panel.focus();
  }

  showReplace() {
    if (!this.search_panel) return;
    this.search_panel.show();
    this.search_panel.setMode('replace');
    this.search_panel.focus();
  }

  #performSearch(_query, _options) {
    if (!this.current_document || !_query) {
      this.current_search_results = [];
      this.current_search_index = -1;
      this.editorPane.clearSearchHighlights();
      this.search_panel.updateResults([], -1);
      return;
    }

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

  #findNext() {
    if (this.current_search_results.length === 0) return;
    this.current_search_index = (this.current_search_index + 1) % this.current_search_results.length;
    this.editorPane.highlightSearchResults(this.current_search_results, this.current_search_index);
    this.search_panel.updateResults(this.current_search_results, this.current_search_index);
  }

  #findPrevious() {
    if (this.current_search_results.length === 0) return;
    this.current_search_index = (this.current_search_index - 1 + this.current_search_results.length) % this.current_search_results.length;
    this.editorPane.highlightSearchResults(this.current_search_results, this.current_search_index);
    this.search_panel.updateResults(this.current_search_results, this.current_search_index);
  }

  #replaceOne(_replacement) {
    if (!this.current_document || this.current_search_results.length === 0) return;
    if (this.current_search_index < 0) return;

    const result = this.current_search_results[this.current_search_index];
    const oldText = this.current_document.getText();
    const newText = this.searchService.replaceOne(oldText, result, _replacement);

    this.current_document.content = newText;
    this.current_document.lines = newText.split('\n');
    this.current_document.is_dirty = true;

    const lastSearch = this.searchService.getLastSearch();
    if (lastSearch) {
      this.#performSearch(lastSearch.query, lastSearch.options);
    }
  }

  #replaceAll(_query, _replacement, _options) {
    if (!this.current_document || !_query) return;

    const oldText = this.current_document.getText();
    const result = this.searchService.replace(oldText, _query, _replacement, _options);

    if (result.count === 0) {
      alert('바꿀 항목이 없습니다.');
      return;
    }

    this.current_document.content = result.newText;
    this.current_document.lines = result.newText.split('\n');
    this.current_document.is_dirty = true;

    this.current_search_results = [];
    this.current_search_index = -1;
    this.editorPane.clearSearchHighlights();
    this.search_panel.updateResults([], -1);

    this.emit('status-message', `${result.count}개 항목을 바꿨습니다.`);
  }

  // Document 관련
  displayDocument(_document) {
    this.current_document = _document;

    if (this.editorPane) {
      this.editorPane.setDocument(_document);
    }

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
