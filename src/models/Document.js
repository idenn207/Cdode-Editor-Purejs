/**
 * 파일: src/models/Document.js
 * 기능: 파일의 내용과 상태를 관리하는 모델
 * 책임:
 * - 텍스트 내용 저장 및 관리
 * - Dirty 상태 추적
 * - 변경 이벤트 발행
 */

import BaseModel from '../core/BaseModel.js';
import ValidationUtils from '../utils/ValidationUtils.js';

export default class Document extends BaseModel {
  constructor(_fileNode, _content = '') {
    super();

    ValidationUtils.assertNonNull(_fileNode, 'FileNode');
    ValidationUtils.assertString(_content, 'Content');

    this.file_node = _fileNode;
    this.set('content', _content);
    this.set('is_dirty', false);
    this.set('language', this.#detectLanguage());

    // 하위 호환성을 위한 리스너 배열
    this.change_listeners = [];
  }

  /**
   * 언어 감지 (private)
   */
  #detectLanguage() {
    const ext = this.file_node.getExtension();
    const EXTENSION_MAP = {
      '.js': 'javascript',
      '.html': 'html',
      '.css': 'css',
      '.md': 'markdown',
      '.json': 'json',
      '.txt': 'plaintext',
    };
    return EXTENSION_MAP[ext] || 'plaintext';
  }

  /**
   * 전체 내용 가져오기
   * @returns {string}
   */
  getContent() {
    return this.get('content');
  }

  /**
   * 내용 설정
   * @param {string} _content
   */
  setContent(_content) {
    ValidationUtils.assertString(_content, 'Content');

    if (this.get('content') !== _content) {
      this.set('content', _content);
      this.setDirty(true);

      // 하위 호환성: change_listeners 호출
      this.change_listeners.forEach((_listener) => {
        _listener();
      });
    }
  }

  /**
   * 특정 줄 가져오기
   * @param {number} _lineNumber
   * @returns {string}
   */
  getLine(_lineNumber) {
    ValidationUtils.assertInteger(_lineNumber, 'LineNumber');
    ValidationUtils.assertState(_lineNumber >= 0, 'Line number must be non-negative');

    const lines = this.getLines();
    return lines[_lineNumber] || '';
  }

  /**
   * 모든 줄 가져오기
   * @returns {string[]}
   */
  getLines() {
    return this.get('content').split('\n');
  }

  /**
   * 줄 수 가져오기
   * @returns {number}
   */
  getLineCount() {
    return this.getLines().length;
  }

  /**
   * 텍스트 삽입
   * @param {number} _line
   * @param {number} _column
   * @param {string} _text
   */
  insertText(_line, _column, _text) {
    ValidationUtils.assertInteger(_line, 'Line');
    ValidationUtils.assertInteger(_column, 'Column');
    ValidationUtils.assertString(_text, 'Text');

    const lines = this.getLines();

    if (_line < 0 || _line >= lines.length) {
      throw new Error(`Line ${_line} out of range`);
    }

    const line = lines[_line];
    const before = line.substring(0, _column);
    const after = line.substring(_column);

    lines[_line] = before + _text + after;

    this.setContent(lines.join('\n'));
  }

  /**
   * 텍스트 삭제
   * @param {number} _line
   * @param {number} _column
   * @param {number} _length
   */
  deleteText(_line, _column, _length) {
    ValidationUtils.assertInteger(_line, 'Line');
    ValidationUtils.assertInteger(_column, 'Column');
    ValidationUtils.assertInteger(_length, 'Length');

    const lines = this.getLines();

    if (_line < 0 || _line >= lines.length) {
      throw new Error(`Line ${_line} out of range`);
    }

    const line = lines[_line];
    const before = line.substring(0, _column);
    const after = line.substring(_column + _length);

    lines[_line] = before + after;

    this.setContent(lines.join('\n'));
  }

  /**
   * 범위 삭제
   * @param {number} _startLine
   * @param {number} _startColumn
   * @param {number} _endLine
   * @param {number} _endColumn
   */
  deleteRange(_startLine, _startColumn, _endLine, _endColumn) {
    ValidationUtils.assertInteger(_startLine, 'StartLine');
    ValidationUtils.assertInteger(_startColumn, 'StartColumn');
    ValidationUtils.assertInteger(_endLine, 'EndLine');
    ValidationUtils.assertInteger(_endColumn, 'EndColumn');

    const lines = this.getLines();

    if (_startLine === _endLine) {
      // 같은 줄 내에서 삭제
      this.deleteText(_startLine, _startColumn, _endColumn - _startColumn);
    } else {
      // 여러 줄에 걸쳐 삭제
      const startLine = lines[_startLine].substring(0, _startColumn);
      const endLine = lines[_endLine].substring(_endColumn);

      lines.splice(_startLine, _endLine - _startLine + 1, startLine + endLine);

      this.setContent(lines.join('\n'));
    }
  }

  /**
   * Dirty 상태 확인
   * @returns {boolean}
   */
  isDirty() {
    return this.get('is_dirty');
  }

  /**
   * Dirty 상태 설정
   * @param {boolean} _dirty
   */
  setDirty(_dirty) {
    ValidationUtils.assertBoolean(_dirty, 'Dirty');
    this.set('is_dirty', _dirty);
  }

  /**
   * 저장됨으로 표시
   */
  markAsSaved() {
    this.setDirty(false);
    this.emit('saved');
  }

  /**
   * 언어 가져오기
   * @returns {string}
   */
  getLanguage() {
    return this.get('language');
  }

  /**
   * FileNode 가져오기
   * @returns {FileNode}
   */
  getFileNode() {
    return this.file_node;
  }

  /**
   * 파일 이름 가져오기
   * @returns {string}
   */
  getFileName() {
    return this.file_node.name;
  }

  /**
   * 파일 경로 가져오기
   * @returns {string}
   */
  getFilePath() {
    return this.file_node.getPath();
  }

  /**
   * 변경 리스너 등록 (하위 호환성)
   * @param {Function} _listener
   */
  onChange(_listener) {
    ValidationUtils.assertFunction(_listener, 'Listener');
    this.change_listeners.push(_listener);

    // EventEmitter도 함께 등록
    this.on('change', _listener);
  }

  /**
   * JSON 직렬화
   * @returns {Object}
   */
  toJSON() {
    return {
      file_path: this.getFilePath(),
      file_name: this.getFileName(),
      content: this.getContent(),
      is_dirty: this.isDirty(),
      language: this.getLanguage(),
    };
  }

  /**
   * JSON 역직렬화
   * @param {Object} _json
   * @param {FileNode} _fileNode
   * @returns {Document}
   */
  static fromJSON(_json, _fileNode) {
    ValidationUtils.assertNonNull(_json, 'JSON');
    ValidationUtils.assertNonNull(_fileNode, 'FileNode');

    const doc = new Document(_fileNode, _json.content);
    doc.setDirty(_json.is_dirty || false);
    return doc;
  }

  /**
   * 모델 파괴
   */
  destroy() {
    this.change_listeners = [];
    this.file_node = null;
    super.destroy();
  }
}
