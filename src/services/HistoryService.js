/**
 * 파일: src/services/HistoryService.js
 * 기능: Undo/Redo 히스토리 관리
 * 책임: 문서 상태 스냅샷 저장, undo/redo 스택 관리, 스마트 병합
 */

export default class HistoryService {
  constructor() {
    this.undo_stack = []; // Array of snapshots (oldest to newest)
    this.redo_stack = []; // Array of snapshots (most recent to oldest)
    this.max_stack_size = 100; // Limit memory usage
    this.is_undoing = false; // Flag to prevent recording during undo
    this.is_redoing = false; // Flag to prevent recording during redo
    this.last_snapshot_time = 0; // For merge detection
    this.merge_timeout = 500; // ms - merge if within this time
  }

  /**
   * Record a new state to undo stack
   * @param {Object} _snapshot - State snapshot {content, cursor, selection, timestamp, type}
   */
  recordState(_snapshot) {
    // Skip if undoing/redoing (prevent loops)
    if (this.is_undoing || this.is_redoing) return;

    // Check if should merge with last snapshot
    if (this.undo_stack.length > 0) {
      const last = this.undo_stack[this.undo_stack.length - 1];
      if (this.#shouldMerge(_snapshot, last)) {
        // Merge: update last snapshot instead of adding new one
        this.undo_stack[this.undo_stack.length - 1] = this.#mergeSnapshots(last, _snapshot);
        this.last_snapshot_time = _snapshot.timestamp;
        return;
      }
    }

    // Add new snapshot
    this.undo_stack.push(_snapshot);

    // Limit stack size (remove oldest if exceeded)
    if (this.undo_stack.length > this.max_stack_size) {
      this.undo_stack.shift();
    }

    // Clear redo stack (new edit invalidates redo history)
    this.redo_stack = [];

    this.last_snapshot_time = _snapshot.timestamp;
  }

  /**
   * Undo last operation
   * @returns {Object | null} - Previous state, or null if nothing to undo
   */
  undo() {
    if (this.undo_stack.length === 0) return null;

    this.is_undoing = true;

    // Pop current state from undo stack
    const current_snapshot = this.undo_stack.pop();

    // Push to redo stack
    this.redo_stack.push(current_snapshot);

    this.is_undoing = false;

    // Return previous state (top of undo stack, or null if empty)
    return this.undo_stack.length > 0 ? this.undo_stack[this.undo_stack.length - 1] : null;
  }

  /**
   * Redo last undone operation
   * @returns {Object | null} - Next state, or null if nothing to redo
   */
  redo() {
    if (this.redo_stack.length === 0) return null;

    this.is_redoing = true;

    // Pop from redo stack
    const snapshot = this.redo_stack.pop();

    // Push back to undo stack
    this.undo_stack.push(snapshot);

    this.is_redoing = false;

    return snapshot;
  }

  /**
   * Check if undo is available
   * @returns {boolean}
   */
  canUndo() {
    return this.undo_stack.length > 0;
  }

  /**
   * Check if redo is available
   * @returns {boolean}
   */
  canRedo() {
    return this.redo_stack.length > 0;
  }

  /**
   * Clear all history
   */
  clear() {
    this.undo_stack = [];
    this.redo_stack = [];
    this.last_snapshot_time = 0;
  }

  /**
   * Check if two snapshots should be merged
   * @private
   * @param {Object} _newSnapshot - New snapshot
   * @param {Object} _lastSnapshot - Last snapshot in stack
   * @returns {boolean}
   */
  #shouldMerge(_newSnapshot, _lastSnapshot) {
    // Don't merge if too much time passed
    if (_newSnapshot.timestamp - _lastSnapshot.timestamp > this.merge_timeout) {
      return false;
    }

    // Only merge same type of edits
    if (_newSnapshot.type !== _lastSnapshot.type) {
      return false;
    }

    // Only merge single-character insertions
    if (_newSnapshot.type === 'insert') {
      const newChars = _newSnapshot.content.length - _lastSnapshot.content.length;
      return newChars === 1;
    }

    // Only merge single-character deletions
    if (_newSnapshot.type === 'delete') {
      const deletedChars = _lastSnapshot.content.length - _newSnapshot.content.length;
      return deletedChars === 1;
    }

    return false;
  }

  /**
   * Merge two snapshots (for consecutive char edits)
   * @private
   * @param {Object} _snapshot1 - First snapshot
   * @param {Object} _snapshot2 - Second snapshot
   * @returns {Object} - Merged snapshot
   */
  #mergeSnapshots(_snapshot1, _snapshot2) {
    // Return the newer snapshot with merged content
    // Keep cursor position from newer snapshot
    // Keep original timestamp for merge window
    return {
      ..._snapshot2,
      timestamp: _snapshot1.timestamp,
    };
  }
}

