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
