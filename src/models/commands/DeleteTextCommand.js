/**
 * 파일: src/models/commands/DeleteTextCommand.js
 * 기능: 텍스트 삭제 커맨드
 */

import EditCommand from '../EditCommand.js';

export default class DeleteTextCommand extends EditCommand {
  constructor(_document, _startLine, _startCol, _endLine, _endCol) {
    super(_document);
    this.start_line = _startLine;
    this.start_col = _startCol;
    this.end_line = _endLine;
    this.end_col = _endCol;
    this.deleted_text = null;
  }

  execute() {
    this.deleted_text = this.#extractText();

    if (this.start_line === this.end_line) {
      const line = this.document.lines[this.start_line];
      this.document.lines[this.start_line] = line.substring(0, this.start_col) + line.substring(this.end_col);
    } else {
      const firstLine = this.document.lines[this.start_line].substring(0, this.start_col);
      const lastLine = this.document.lines[this.end_line].substring(this.end_col);

      this.document.lines[this.start_line] = firstLine + lastLine;
      this.document.lines.splice(this.start_line + 1, this.end_line - this.start_line);
    }

    this.document.content = this.document.getText();
    this.document.is_dirty = true;
    this.document._notifyChange();
  }

  undo() {
    const currentLine = this.document.lines[this.start_line];
    const before = currentLine.substring(0, this.start_col);
    const after = currentLine.substring(this.start_col);

    const deletedLines = this.deleted_text.split('\n');

    if (deletedLines.length === 1) {
      this.document.lines[this.start_line] = before + this.deleted_text + after;
    } else {
      this.document.lines[this.start_line] = before + deletedLines[0];

      for (let i = 1; i < deletedLines.length - 1; i++) {
        this.document.lines.splice(this.start_line + i, 0, deletedLines[i]);
      }

      const lastLine = deletedLines[deletedLines.length - 1];
      this.document.lines.splice(this.start_line + deletedLines.length - 1, 0, lastLine + after);
    }

    this.document.content = this.document.getText();
    this.document._notifyChange();
  }

  #extractText() {
    if (this.start_line === this.end_line) {
      return this.document.lines[this.start_line].substring(this.start_col, this.end_col);
    }

    let text = this.document.lines[this.start_line].substring(this.start_col) + '\n';

    for (let i = this.start_line + 1; i < this.end_line; i++) {
      text += this.document.lines[i] + '\n';
    }

    text += this.document.lines[this.end_line].substring(0, this.end_col);

    return text;
  }
}
