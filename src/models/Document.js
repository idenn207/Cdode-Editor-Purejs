/**
 * 파일: src/models/Document.js
 * 기능: 문서 모델 (리팩토링 버전)
 * 책임: 텍스트 내용, 커서 위치, 선택 영역 관리
 * 변경사항: BaseModel 상속, 이벤트 통일, 직렬화 구현
 */

import BaseModel from '../core/BaseModel.js';
import TextUtils from '../utils/TextUtils.js';
import ValidationUtils from '../utils/ValidationUtils.js';

export default class Document extends BaseModel {
  constructor(_file_node, _content = '') {
    super();

    // 검증
    ValidationUtils.notNullOrUndefined(_file_node, 'FileNode');
    ValidationUtils.assertString(_content, 'Content');

    // BaseModel의 set 사용
    this.set('file_node', _file_node);
    this.set('content', _content);
    this.set('lines', this.#splitLines(_content));
    this.set('cursor', { line: 0, column: 0 });
    this.set('selection', null);
    this.set('language', this.#detectLanguage());

    // 초기 상태는 dirty가 아님
    this.clearDirty();
  }

  /**
   * 줄 분할
   */
  #splitLines(_text) {
    return TextUtils.splitLines(_text);
  }

  /**
   * 언어 감지
   */
  #detectLanguage() {
    const file_node = this.get('file_node');
    if (!file_node) return 'plaintext';

    const extension = file_node.getExtension();
    const language_map = {
      '.js': 'javascript',
      '.html': 'html',
      '.css': 'css',
      '.md': 'markdown',
    };

    return language_map[extension] || 'plaintext';
  }

  /**
   * 전체 텍스트 가져오기
   */
  getText() {
    return TextUtils.joinLines(this.get('lines'));
  }

  /**
   * 전체 텍스트 설정
   */
  setText(_text) {
    ValidationUtils.assertString(_text, 'Text');

    this.set('content', _text);
    this.set('lines', this.#splitLines(_text));
    this.emit('text-changed', { text: _text });
  }

  /**
   * 특정 줄 가져오기
   */
  getLine(_line_index) {
    ValidationUtils.assertInteger(_line_index, 'Line index');

    const lines = this.get('lines');
    if (_line_index < 0 || _line_index >= lines.length) {
      return null;
    }
    return lines[_line_index];
  }

  /**
   * 특정 줄 설정
   */
  setLine(_line_index, _text) {
    ValidationUtils.assertInteger(_line_index, 'Line index');
    ValidationUtils.assertString(_text, 'Text');

    const lines = this.get('lines');
    if (_line_index < 0 || _line_index >= lines.length) {
      throw new Error(`Line index out of range: ${_line_index}`);
    }

    lines[_line_index] = _text;
    this.set('lines', lines);
    this.emit('line-changed', { line: _line_index, text: _text });
  }

  /**
   * 줄 개수
   */
  getLineCount() {
    return this.get('lines').length;
  }

  /**
   * 줄 범위 가져오기
   */
  getLineRange(_start_line, _end_line) {
    ValidationUtils.assertInteger(_start_line, 'Start line');
    ValidationUtils.assertInteger(_end_line, 'End line');

    const lines = this.get('lines');
    return lines.slice(_start_line, _end_line + 1);
  }

  /**
   * 텍스트 삽입
   */
  insertText(_line, _column, _text) {
    ValidationUtils.assertInteger(_line, 'Line');
    ValidationUtils.assertInteger(_column, 'Column');
    ValidationUtils.assertString(_text, 'Text');

    const lines = this.get('lines');
    const current_line = lines[_line] || '';

    const new_text = TextUtils.insert(TextUtils.joinLines(lines), _line, _column, _text);

    this.setText(new_text);

    // 커서 위치 업데이트
    const insert_lines = TextUtils.splitLines(_text);
    if (insert_lines.length === 1) {
      this.setCursor(_line, _column + _text.length);
    } else {
      const last_line_length = insert_lines[insert_lines.length - 1].length;
      this.setCursor(_line + insert_lines.length - 1, last_line_length);
    }

    this.emit('text-inserted', {
      line: _line,
      column: _column,
      text: _text,
    });
  }

  /**
   * 텍스트 삭제
   */
  deleteText(_start_line, _start_col, _end_line, _end_col) {
    ValidationUtils.assertInteger(_start_line, 'Start line');
    ValidationUtils.assertInteger(_start_col, 'Start column');
    ValidationUtils.assertInteger(_end_line, 'End line');
    ValidationUtils.assertInteger(_end_col, 'End column');

    const lines = this.get('lines');
    const deleted_text = TextUtils.extractRange(TextUtils.joinLines(lines), _start_line, _start_col, _end_line, _end_col);

    const new_text = TextUtils.delete(TextUtils.joinLines(lines), _start_line, _start_col, _end_line, _end_col);

    this.setText(new_text);
    this.setCursor(_start_line, _start_col);

    this.emit('text-deleted', {
      start_line: _start_line,
      start_col: _start_col,
      end_line: _end_line,
      end_col: _end_col,
      deleted_text: deleted_text,
    });

    return deleted_text;
  }

  /**
   * 커서 위치 가져오기
   */
  getCursor() {
    return { ...this.get('cursor') };
  }

  /**
   * 커서 위치 설정
   */
  setCursor(_line, _column) {
    ValidationUtils.assertInteger(_line, 'Line');
    ValidationUtils.assertInteger(_column, 'Column');

    const lines = this.get('lines');
    const max_line = Math.max(0, lines.length - 1);
    const clamped_line = Math.max(0, Math.min(_line, max_line));

    const current_line = lines[clamped_line] || '';
    const clamped_column = Math.max(0, Math.min(_column, current_line.length));

    const old_cursor = this.get('cursor');
    const new_cursor = { line: clamped_line, column: clamped_column };

    this.set('cursor', new_cursor);
    this.emit('cursor-moved', {
      old_cursor: old_cursor,
      new_cursor: new_cursor,
    });
  }

  /**
   * 선택 영역 가져오기
   */
  getSelection() {
    const selection = this.get('selection');
    return selection ? { ...selection } : null;
  }

  /**
   * 선택 영역 설정
   */
  setSelection(_start, _end) {
    ValidationUtils.assertObject(_start, 'Start');
    ValidationUtils.assertObject(_end, 'End');

    const selection = {
      start: { ...start },
      end: { ...end },
    };

    this.set('selection', selection);
    this.emit('selection-changed', { selection });
  }

  /**
   * 선택 영역 해제
   */
  clearSelection() {
    this.set('selection', null);
    this.emit('selection-cleared');
  }

  /**
   * 선택 영역 존재 여부
   */
  hasSelection() {
    return this.get('selection') !== null;
  }

  /**
   * 선택된 텍스트 가져오기
   */
  getSelectedText() {
    const selection = this.getSelection();
    if (!selection) return '';

    return TextUtils.extractRange(this.getText(), selection.start.line, selection.start.column, selection.end.line, selection.end.column);
  }

  /**
   * FileNode 가져오기
   */
  getFileNode() {
    return this.get('file_node');
  }

  /**
   * 언어 가져오기
   */
  getLanguage() {
    return this.get('language');
  }

  /**
   * 파일 이름 가져오기
   */
  getFileName() {
    const file_node = this.getFileNode();
    return file_node ? file_node.name : 'Untitled';
  }

  /**
   * 파일 경로 가져오기
   */
  getFilePath() {
    const file_node = this.getFileNode();
    return file_node ? file_node.path : '';
  }

  /**
   * 변경 리스너 등록 (하위 호환성)
   */
  onChange(_listener) {
    ValidationUtils.assertFunction(_listener, 'Listener');
    this.on('change', _listener);

    // 리스너 제거 함수 반환
    return {
      remove: () => this.off('change', _listener),
    };
  }

  /**
   * JSON 직렬화
   */
  toJSON() {
    return {
      file_path: this.getFilePath(),
      content: this.getText(),
      cursor: this.getCursor(),
      selection: this.getSelection(),
      is_dirty: this.isDirty(),
      language: this.getLanguage(),
    };
  }

  /**
   * JSON 역직렬화
   */
  fromJSON(_json) {
    ValidationUtils.assertObject(_json, 'JSON');

    if (_json.content !== undefined) {
      this.setText(_json.content);
    }

    if (_json.cursor) {
      this.setCursor(_json.cursor.line, _json.cursor.column);
    }

    if (_json.selection) {
      this.setSelection(_json.selection.start, _json.selection.end);
    } else {
      this.clearSelection();
    }

    if (_json.is_dirty !== undefined) {
      this.setDirty(_json.is_dirty);
    }
  }

  /**
   * 검증
   */
  validate() {
    try {
      ValidationUtils.notNullOrUndefined(this.get('file_node'), 'FileNode');
      ValidationUtils.assertArray(this.get('lines'), 'Lines');
      ValidationUtils.assertObject(this.get('cursor'), 'Cursor');

      const cursor = this.get('cursor');
      ValidationUtils.assertInteger(cursor.line, 'Cursor line');
      ValidationUtils.assertInteger(cursor.column, 'Cursor column');

      return true;
    } catch (error) {
      console.error('Document validation failed:', error);
      return false;
    }
  }

  /**
   * 복제
   */
  clone() {
    const cloned = new Document(this.getFileNode(), this.getText());
    cloned.setCursor(this.getCursor().line, this.getCursor().column);

    const selection = this.getSelection();
    if (selection) {
      cloned.setSelection(selection.start, selection.end);
    }

    cloned.setDirty(this.isDirty());

    return cloned;
  }

  /**
   * 통계 정보
   */
  getStatistics() {
    const text = this.getText();
    return {
      line_count: this.getLineCount(),
      character_count: TextUtils.countCharacters(text),
      word_count: TextUtils.countWords(text),
      character_count_no_spaces: TextUtils.countCharactersWithoutSpaces(text),
    };
  }
}
