/**
 * 파일: src/models/Document.js
 * 기능: 문서 모델
 * 책임: 텍스트 내용, 커서 위치, 선택 영역 관리
 */

export default class Document {
  constructor(_fileNode, _content = '') {
    this.file_node = _fileNode;
    this.content = _content;
    this.lines = this.#splitLines(_content);

    this.cursor = { line: 0, column: 0 };
    this.selection = null;
    this.is_dirty = false;
    this.change_listeners = [];

    // NEW: History service integration
    this.history_service = null;
    this.last_edit_type = 'replace';
  }

  #splitLines(_text) {
    if (_text === '') return [''];
    const lines = _text.split('\n');
    return lines;
  }

  #notifyChange() {
    console.log('Document changed');
    this.change_listeners.forEach((_listener) => {
      _listener(this);
    });
  }

  getText() {
    return this.lines.join('\n');
  }

  getLine(_lineNumber) {
    if (_lineNumber < 0 || _lineNumber >= this.lines.length) {
      return null;
    }
    return this.lines[_lineNumber];
  }

  getLineCount() {
    return this.lines.length;
  }

  onChange(_listener) {
    this.change_listeners.push(_listener);
  }

  markAsSaved() {
    this.is_dirty = false;
  }

  isDirty() {
    return this.is_dirty;
  }

  /**
   * Set history service for undo/redo
   * @param {HistoryService} _historyService
   */
  setHistoryService(_historyService) {
    this.history_service = _historyService;
  }

  /**
   * Get current document state as snapshot
   * @returns {Object} Snapshot with content, cursor, selection, timestamp, type
   */
  getState() {
    return {
      content: this.getText(),
      cursor: { ...this.cursor },
      selection: this.selection ? { ...this.selection } : null,
      timestamp: Date.now(),
      type: this.last_edit_type || 'replace',
    };
  }

  /**
   * Restore document from snapshot
   * @param {Object} _snapshot - State snapshot
   * @param {boolean} _recordHistory - Whether to record this change to history
   */
  setState(_snapshot, _recordHistory = false) {
    this.content = _snapshot.content;
    this.lines = this.#splitLines(_snapshot.content);
    this.cursor = { ..._snapshot.cursor };
    this.selection = _snapshot.selection ? { ..._snapshot.selection } : null;

    if (_recordHistory && this.history_service) {
      this.history_service.recordState(this.getState());
    }

    this.#notifyChange();
  }

  /**
   * Insert text at position
   * @param {number} _line - Line number (0-indexed)
   * @param {number} _column - Column number (0-indexed)
   * @param {string} _text - Text to insert (can contain \n)
   */
  insertText(_line, _column, _text) {
    const currentLine = this.lines[_line] || '';
    const before = currentLine.substring(0, _column);
    const after = currentLine.substring(_column);

    const insertLines = _text.split('\n');

    if (insertLines.length === 1) {
      // Single line insertion
      this.lines[_line] = before + _text + after;
      this.cursor = { line: _line, column: _column + _text.length };
    } else {
      // Multi-line insertion
      this.lines[_line] = before + insertLines[0];

      for (let i = 1; i < insertLines.length - 1; i++) {
        this.lines.splice(_line + i, 0, insertLines[i]);
      }

      const lastLine = insertLines[insertLines.length - 1];
      this.lines.splice(_line + insertLines.length - 1, 0, lastLine + after);

      this.cursor = {
        line: _line + insertLines.length - 1,
        column: lastLine.length,
      };
    }

    this.content = this.lines.join('\n');
    this.is_dirty = true;
    this.last_edit_type = 'insert';

    // Record to history
    if (this.history_service) {
      this.history_service.recordState(this.getState());
    }

    this.#notifyChange();
  }

  /**
   * Delete text in range
   * @param {number} _startLine
   * @param {number} _startCol
   * @param {number} _endLine
   * @param {number} _endCol
   */
  deleteText(_startLine, _startCol, _endLine, _endCol) {
    if (_startLine === _endLine) {
      // Single line deletion
      const line = this.lines[_startLine];
      this.lines[_startLine] = line.substring(0, _startCol) + line.substring(_endCol);
    } else {
      // Multi-line deletion
      const firstLine = this.lines[_startLine].substring(0, _startCol);
      const lastLine = this.lines[_endLine].substring(_endCol);

      this.lines.splice(_startLine, _endLine - _startLine + 1, firstLine + lastLine);
    }

    this.cursor = { line: _startLine, column: _startCol };
    this.content = this.lines.join('\n');
    this.is_dirty = true;
    this.last_edit_type = 'delete';

    // Record to history
    if (this.history_service) {
      this.history_service.recordState(this.getState());
    }

    this.#notifyChange();
  }

  /**
   * Replace range with new text
   * @param {number} _startLine
   * @param {number} _startCol
   * @param {number} _endLine
   * @param {number} _endCol
   * @param {string} _newText
   */
  replaceRange(_startLine, _startCol, _endLine, _endCol, _newText) {
    this.last_edit_type = 'replace';
    this.deleteText(_startLine, _startCol, _endLine, _endCol);
    this.insertText(_startLine, _startCol, _newText);
  }
}
