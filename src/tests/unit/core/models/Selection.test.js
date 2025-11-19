/**
 * 파일: src/tests/unit/models/Selection.test.js
 * 기능: Selection 모델 단위 테스트
 * 책임: Selection의 모든 기능 검증
 */

import Selection from '../../../models/Selection.js';
import { TestRunner, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('Selection Model', () => {
  let selection;

  runner.beforeEach(() => {
    selection = new Selection({ line: 0, column: 0 }, { line: 1, column: 5 });
  });

  runner.it('should create a selection', () => {
    expect(selection).toBeInstanceOf(Selection);
    expect(selection.getStart().line).toBe(0);
    expect(selection.getEnd().line).toBe(1);
  });

  runner.it('should normalize selection (start < end)', () => {
    const reversed = new Selection({ line: 1, column: 5 }, { line: 0, column: 0 });

    expect(reversed.getStart().line).toBe(0);
    expect(reversed.getEnd().line).toBe(1);
  });

  runner.it('should check if empty', () => {
    const empty = new Selection({ line: 0, column: 0 }, { line: 0, column: 0 });

    expect(empty.isEmpty()).toBe(true);
    expect(selection.isEmpty()).toBe(false);
  });

  runner.it('should check if single line', () => {
    const single = new Selection({ line: 0, column: 0 }, { line: 0, column: 5 });

    expect(single.isSingleLine()).toBe(true);
    expect(selection.isSingleLine()).toBe(false);
  });

  runner.it('should get line count', () => {
    expect(selection.getLineCount()).toBe(2);
  });

  runner.it('should check if contains position', () => {
    expect(selection.contains(0, 5)).toBe(true);
    expect(selection.contains(1, 3)).toBe(true);
    expect(selection.contains(2, 0)).toBe(false);
  });

  runner.it('should check if intersects line', () => {
    expect(selection.intersectsLine(0)).toBe(true);
    expect(selection.intersectsLine(1)).toBe(true);
    expect(selection.intersectsLine(2)).toBe(false);
  });

  runner.it('should check if intersects other selection', () => {
    const other1 = new Selection({ line: 0, column: 5 }, { line: 1, column: 10 });
    expect(selection.intersects(other1)).toBe(true);

    const other2 = new Selection({ line: 2, column: 0 }, { line: 3, column: 0 });
    expect(selection.intersects(other2)).toBe(false);
  });

  runner.it('should expand selection', () => {
    selection.expand(2, 0);

    expect(selection.getEnd().line).toBe(2);
    expect(selection.getEnd().column).toBe(0);
  });

  runner.it('should move selection', () => {
    selection.move(1, 0);

    expect(selection.getStart().line).toBe(1);
    expect(selection.getEnd().line).toBe(2);
  });

  runner.it('should get range info', () => {
    const range = selection.getRange();

    expect(range.is_empty).toBe(false);
    expect(range.is_single_line).toBe(false);
    expect(range.line_count).toBe(2);
  });

  runner.it('should serialize to JSON', () => {
    const json = selection.toJSON();

    expect(json.start.line).toBe(0);
    expect(json.end.line).toBe(1);
  });

  runner.it('should deserialize from JSON', () => {
    const json = {
      start: { line: 2, column: 3 },
      end: { line: 3, column: 4 },
    };

    selection.fromJSON(json);

    expect(selection.getStart().line).toBe(2);
    expect(selection.getEnd().line).toBe(3);
  });

  runner.it('should validate correctly', () => {
    expect(selection.validate()).toBe(true);
  });

  runner.it('should clone selection', () => {
    const cloned = selection.clone();

    expect(cloned.getStart().line).toBe(selection.getStart().line);
    expect(cloned).not.toBe(selection);
  });

  runner.it('should convert to string', () => {
    const str = selection.toString();

    expect(str).toContain('Selection');
    expect(str).toContain('0:0');
    expect(str).toContain('1:5');
  });

  runner.it('should create empty selection', () => {
    const empty = Selection.empty(5, 10);

    expect(empty.isEmpty()).toBe(true);
    expect(empty.getStart().line).toBe(5);
    expect(empty.getStart().column).toBe(10);
  });

  runner.it('should create whole line selection', () => {
    const whole = Selection.wholeLine(2, 20);

    expect(whole.getStart().line).toBe(2);
    expect(whole.getStart().column).toBe(0);
    expect(whole.getEnd().column).toBe(20);
  });

  runner.it('should create word selection', () => {
    const word = Selection.word(1, 5, 10);

    expect(word.isSingleLine()).toBe(true);
    expect(word.getStart().column).toBe(5);
    expect(word.getEnd().column).toBe(10);
  });
});

runner.run();
