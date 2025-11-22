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

  insertText(_line, _column, _text) {
    const currentLine = this.lines[_line];
    const before = currentLine.substring(0, _column);
    const after = currentLine.substring(_column);

    const insertLines = _text.split('\n');

    if (insertLines.length === 1) {
      this.lines[_line] = before + _text + after;
      this.cursor = { line: _line, column: _column + _text.length };
    } else {
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

    this.is_dirty = true;
    this.#notifyChange();
  }

  deleteText(_startLine, _startCol, _endLine, _endCol) {
    if (_startLine === _endLine) {
      const line = this.lines[_startLine];
      this.lines[_startLine] = line.substring(0, _startCol) + line.substring(_endCol);
    } else {
      const firstLine = this.lines[_startLine].substring(0, _startCol);
      const lastLine = this.lines[_endLine].substring(_endCol);

      this.lines.splice(_startLine, _endLine - _startLine + 1, firstLine + lastLine);
    }

    this.cursor = { line: _startLine, column: _startCol };
    this.is_dirty = true;
    this.#notifyChange();
  }

  moveCursor(_line, _column) {
    _line = Math.max(0, Math.min(_line, this.lines.length - 1));
    const maxCol = this.lines[_line].length;
    _column = Math.max(0, Math.min(_column, maxCol));

    this.cursor = { line: _line, column: _column };
  }

  setSelection(_startLine, _startCol, _endLine, _endCol) {
    this.selection = {
      start: { line: _startLine, column: _startCol },
      end: { line: _endLine, column: _endCol },
    };
  }

  clearSelection() {
    this.selection = null;
  }

  getSelectedText() {
    if (!this.selection) return '';

    const { start, end } = this.selection;

    if (start.line === end.line) {
      return this.lines[start.line].substring(start.column, end.column);
    }

    let text = this.lines[start.line].substring(start.column) + '\n';

    for (let i = start.line + 1; i < end.line; i++) {
      text += this.lines[i] + '\n';
    }

    text += this.lines[end.line].substring(0, end.column);

    return text;
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
}
