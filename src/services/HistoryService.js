/**
 * 파일: src/services/HistoryService.js
 * 기능: 편집 히스토리 관리
 * 책임: Document별 undo/redo 스택 관리
 */

export default class HistoryService {
  constructor() {
    this.histories = new Map();
    this.max_history_size = 100;
  }

  initHistory(_document) {
    const path = _document.file_node.getFullPath();

    if (!this.histories.has(path)) {
      this.histories.set(path, {
        undo_stack: [],
        redo_stack: [],
      });
    }
  }

  executeCommand(_document, _command) {
    const path = _document.file_node.getFullPath();
    let history = this.histories.get(path);

    if (!history) {
      this.initHistory(_document);
      history = this.histories.get(path);
    }

    _command.execute();

    history.undo_stack.push(_command);

    if (history.undo_stack.length > this.max_history_size) {
      history.undo_stack.shift();
    }

    history.redo_stack = [];
  }

  undo(_document) {
    const path = _document.file_node.getFullPath();
    const history = this.histories.get(path);

    if (!history || history.undo_stack.length === 0) {
      return false;
    }

    const command = history.undo_stack.pop();
    command.undo();

    history.redo_stack.push(command);

    return true;
  }

  redo(_document) {
    const path = _document.file_node.getFullPath();
    const history = this.histories.get(path);

    if (!history || history.redo_stack.length === 0) {
      return false;
    }

    const command = history.redo_stack.pop();
    command.redo();

    history.undo_stack.push(command);

    return true;
  }

  canUndo(_document) {
    const path = _document.file_node.getFullPath();
    const history = this.histories.get(path);
    return history && history.undo_stack.length > 0;
  }

  canRedo(_document) {
    const path = _document.file_node.getFullPath();
    const history = this.histories.get(path);
    return history && history.redo_stack.length > 0;
  }

  clearHistory(_document) {
    const path = _document.file_node.getFullPath();
    this.histories.delete(path);
  }

  removeHistory(_document) {
    const path = _document.file_node.getFullPath();
    this.histories.delete(path);
  }
}
