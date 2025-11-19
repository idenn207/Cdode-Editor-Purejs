/**
 * 파일: src/tests/unit/models/Document.test.js
 * 기능: Document 모델 단위 테스트
 * 책임: Document의 모든 기능 검증
 */

import Document from '../../../models/Document.js';
import FileNode from '../../../models/FileNode.js';
import { TestRunner, createMock, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('Document Model', () => {
  let file_node;
  let document;

  runner.beforeEach(() => {
    file_node = new FileNode('test.js', '/test.js', 'file');
    document = new Document(file_node, 'line1\nline2\nline3');
  });

  runner.it('should create a document with content', () => {
    expect(document).toBeInstanceOf(Document);
    expect(document.getText()).toBe('line1\nline2\nline3');
    expect(document.getLineCount()).toBe(3);
  });

  runner.it('should get specific line', () => {
    expect(document.getLine(0)).toBe('line1');
    expect(document.getLine(1)).toBe('line2');
    expect(document.getLine(2)).toBe('line3');
    expect(document.getLine(3)).toBeNull();
  });

  runner.it('should set line', () => {
    document.setLine(1, 'modified');
    expect(document.getLine(1)).toBe('modified');
  });

  runner.it('should get line count', () => {
    expect(document.getLineCount()).toBe(3);
  });

  runner.it('should get line range', () => {
    const range = document.getLineRange(0, 1);
    expect(range).toHaveLength(2);
    expect(range[0]).toBe('line1');
    expect(range[1]).toBe('line2');
  });

  runner.it('should insert text on single line', () => {
    document.insertText(0, 5, 'X');
    expect(document.getLine(0)).toBe('line1X');
  });

  runner.it('should insert multiline text', () => {
    document.insertText(0, 5, '\nnew');
    expect(document.getLineCount()).toBe(4);
    expect(document.getLine(0)).toBe('line1');
    expect(document.getLine(1)).toBe('new');
  });

  runner.it('should delete text on single line', () => {
    document.deleteText(0, 0, 0, 4);
    expect(document.getLine(0)).toBe('1');
  });

  runner.it('should delete multiline text', () => {
    const deleted = document.deleteText(0, 2, 1, 2);
    expect(deleted).toBe('ne1\nli');
    expect(document.getLineCount()).toBe(2);
  });

  runner.it('should manage cursor position', () => {
    document.setCursor(1, 3);
    const cursor = document.getCursor();
    expect(cursor.line).toBe(1);
    expect(cursor.column).toBe(3);
  });

  runner.it('should clamp cursor to valid range', () => {
    document.setCursor(10, 100);
    const cursor = document.getCursor();
    expect(cursor.line).toBe(2); // max line
    expect(cursor.column).toBeLessThan(100);
  });

  runner.it('should emit cursor-moved event', () => {
    const mock = createMock();
    document.on('cursor-moved', mock);

    document.setCursor(1, 5);

    expect(mock.callCount()).toBe(1);
  });

  runner.it('should manage selection', () => {
    const start = { line: 0, column: 0 };
    const end = { line: 1, column: 5 };

    document.setSelection(start, end);

    expect(document.hasSelection()).toBe(true);

    document.clearSelection();
    expect(document.hasSelection()).toBe(false);
  });

  runner.it('should get file information', () => {
    expect(document.getFileName()).toBe('test.js');
    expect(document.getFilePath()).toBe('/test.js');
    expect(document.getLanguage()).toBe('javascript');
  });

  runner.it('should track dirty state', () => {
    expect(document.isDirty()).toBe(false);

    document.insertText(0, 0, 'x');
    expect(document.isDirty()).toBe(true);

    document.clearDirty();
    expect(document.isDirty()).toBe(false);
  });

  runner.it('should emit change events', () => {
    const mock = createMock();
    document.on('change', mock);

    document.insertText(0, 0, 'x');

    expect(mock.callCount()).toBeGreaterThan(0);
  });

  runner.it('should serialize to JSON', () => {
    document.setCursor(1, 2);
    const json = document.toJSON();

    expect(json.content).toBe('line1\nline2\nline3');
    expect(json.cursor.line).toBe(1);
    expect(json.cursor.column).toBe(2);
    expect(json.language).toBe('javascript');
  });

  runner.it('should deserialize from JSON', () => {
    const json = {
      content: 'new content',
      cursor: { line: 0, column: 5 },
      is_dirty: true,
    };

    document.fromJSON(json);

    expect(document.getText()).toBe('new content');
    expect(document.getCursor().line).toBe(0);
    expect(document.getCursor().column).toBe(5);
    expect(document.isDirty()).toBe(true);
  });

  runner.it('should validate correctly', () => {
    expect(document.validate()).toBe(true);
  });

  runner.it('should clone document', () => {
    document.setCursor(1, 2);
    const cloned = document.clone();

    expect(cloned.getText()).toBe(document.getText());
    expect(cloned.getCursor().line).toBe(1);
    expect(cloned).not.toBe(document);
  });

  runner.it('should get statistics', () => {
    const stats = document.getStatistics();

    expect(stats.line_count).toBe(3);
    expect(stats.character_count).toBeGreaterThan(0);
    expect(stats.word_count).toBeGreaterThan(0);
  });

  runner.it('should support onChange listener (legacy)', () => {
    const mock = createMock();
    const listener = document.onChange(mock);

    document.insertText(0, 0, 'x');

    expect(mock.callCount()).toBeGreaterThan(0);

    listener.remove();
  });
});

runner.run();
