/**
 * 파일: src/models/commands/InsertTextCommand.js
 * 기능: 텍스트 삽입 커맨드
 */

import EditCommand from '../EditCommand.js';

export default class InsertTextCommand extends EditCommand {
  constructor(_document, _line, _column, _text) {
    super(_document);
    this.line = _line;
    this.column = _column;
    this.text = _text;
  }

  execute() {
    const currentLine = this.document.lines[this.line] || '';
    const before = currentLine.substring(0, this.column);
    const after = currentLine.substring(this.column);

    const insertLines = this.text.split('\n');

    if (insertLines.length === 1) {
      this.document.lines[this.line] = before + this.text + after;
    } else {
      this.document.lines[this.line] = before + insertLines[0];

      for (let i = 1; i < insertLines.length - 1; i++) {
        this.document.lines.splice(this.line + i, 0, insertLines[i]);
      }

      const lastLine = insertLines[insertLines.length - 1];
      this.document.lines.splice(this.line + insertLines.length - 1, 0, lastLine + after);
    }

    this.document.content = this.document.getText();
    this.document.is_dirty = true;
    this.document._notifyChange();
  }

  undo() {
    const insertLines = this.text.split('\n');

    if (insertLines.length === 1) {
      const line = this.document.lines[this.line];
      this.document.lines[this.line] = line.substring(0, this.column) + line.substring(this.column + this.text.length);
    } else {
      const firstLine = this.document.lines[this.line];
      const lastLineIndex = this.line + insertLines.length - 1;
      const lastLine = this.document.lines[lastLineIndex];

      this.document.lines[this.line] = firstLine.substring(0, this.column) + lastLine.substring(insertLines[insertLines.length - 1].length);

      this.document.lines.splice(this.line + 1, insertLines.length - 1);
    }

    this.document.content = this.document.getText();
    this.document._notifyChange();
  }
}
