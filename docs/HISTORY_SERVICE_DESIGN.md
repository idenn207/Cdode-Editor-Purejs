# HistoryService Design Document

**Date**: 2025-11-23
**Purpose**: Design custom undo/redo system with Document model integration

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Design](#component-design)
3. [Data Structures](#data-structures)
4. [API Specifications](#api-specifications)
5. [Integration Points](#integration-points)
6. [Implementation Strategy](#implementation-strategy)

---

## 1. Architecture Overview

### 1.1 System Diagram

```
┌──────────────────────────────────────────────────────────┐
│                      EditorPane                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ User Input (keydown, input, paste)                 │  │
│  └────────────┬───────────────────────────────────────┘  │
│               ↓                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Document.insertText() / deleteText() etc.          │  │
│  └────────────┬───────────────────────────────────────┘  │
│               ↓                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ HistoryService.recordState()                       │  │
│  │  - Creates snapshot {content, cursor, selection}   │  │
│  │  - Pushes to undo stack                            │  │
│  │  - Clears redo stack                               │  │
│  └────────────┬───────────────────────────────────────┘  │
│               ↓                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ #performRenderWithCursorRestore()                  │  │
│  │  - Renders with syntax highlighting                │  │
│  │  - innerHTML replacement OK (we have snapshots!)   │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

User presses Ctrl+Z
       ↓
┌──────────────────────────────────────────────────────────┐
│  HistoryService.undo()                                   │
│  - Pops from undo stack                                  │
│  - Pushes current state to redo stack                    │
│  - Returns previous snapshot                             │
└──────────────┬───────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────┐
│  Document.setState(snapshot)                             │
│  - Restores content, cursor, selection                   │
│  - Does NOT record to history (avoid infinite loop)      │
└──────────────┬───────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────┐
│  EditorPane.#performRenderWithCursorRestore()            │
│  - Re-renders with restored state                        │
│  - Syntax highlighting applied                           │
└──────────────────────────────────────────────────────────┘
```

### 1.2 Design Principles

1. **Snapshot-based** - Store full document state, not incremental diffs

   - Simpler implementation
   - Easier to debug
   - No complex merging logic
   - Acceptable memory usage (text is small)

2. **Document-centric** - Document model is source of truth

   - EditorPane delegates all editing to Document
   - Document notifies HistoryService of changes
   - EditorPane only handles rendering and user input

3. **Smart merging** - Consecutive character insertions merge into single undo step

   - Typing "hello" = 1 undo step, not 5
   - Improves user experience
   - Reduces memory usage

4. **Cursor restoration** - Undo/redo restores cursor and selection
   - Not just content
   - Provides natural editing flow

---

## 2. Component Design

### 2.1 HistoryService

**Responsibility**: Manage undo/redo stacks and state snapshots

**File**: `src/services/HistoryService.js`

**Class Structure**:

```javascript
export default class HistoryService {
  constructor() {
    this.undo_stack = [];          // Array of snapshots
    this.redo_stack = [];          // Array of snapshots
    this.max_stack_size = 100;     // Limit memory usage
    this.is_undoing = false;       // Flag to prevent recording during undo
    this.is_redoing = false;       // Flag to prevent recording during redo
    this.last_snapshot_time = 0;   // For merge detection
    this.merge_timeout = 500;      // ms - merge if within this time
  }

  recordState(_snapshot) { ... }
  undo() { ... }
  redo() { ... }
  canUndo() { ... }
  canRedo() { ... }
  clear() { ... }

  #shouldMerge(_newSnapshot, _lastSnapshot) { ... }
  #mergeSnapshots(_snapshot1, _snapshot2) { ... }
}
```

**Snapshot Format**:

```javascript
{
  content: string,           // Full document text
  cursor: {                  // Cursor position
    line: number,
    column: number
  },
  selection: {               // Selection range (null if no selection)
    start: {line, column},
    end: {line, column}
  } | null,
  timestamp: number,         // Date.now() for merge detection
  type: 'insert' | 'delete' | 'replace'  // For smart merging
}
```

### 2.2 Document Model Extension

**Responsibility**: Provide editing methods and state management

**File**: `src/models/Document.js` (extend existing)

**New Methods**:

```javascript
class Document {
  // Existing properties
  constructor(_fileNode, _content = '') {
    this.file_node = _fileNode;
    this.content = _content;
    this.lines = this.#splitLines(_content);
    this.cursor = { line: 0, column: 0 };
    this.selection = null;
    this.is_dirty = false;
    this.change_listeners = [];
    this.history_service = null;  // NEW: Reference to HistoryService
  }

  // NEW: Editing methods
  insertText(_line, _column, _text) {
    // Insert text at position
    // Update this.lines
    // Update this.content
    // Update cursor position
    // Record to history
    // Notify listeners
  }

  deleteText(_startLine, _startCol, _endLine, _endCol) {
    // Delete text in range
    // Similar to insertText
  }

  replaceRange(_startLine, _startCol, _endLine, _endCol, _newText) {
    // Replace range with new text
    // Convenience method (delete + insert)
  }

  // NEW: State management for undo/redo
  getState() {
    return {
      content: this.getText(),
      cursor: { ...this.cursor },
      selection: this.selection ? { ...this.selection } : null,
      timestamp: Date.now(),
      type: this.last_edit_type || 'replace'
    };
  }

  setState(_snapshot, _recordHistory = false) {
    // Restore document from snapshot
    this.content = _snapshot.content;
    this.lines = this.#splitLines(_snapshot.content);
    this.cursor = { ..._snapshot.cursor };
    this.selection = _snapshot.selection ? { ..._snapshot.selection } : null;

    if (_recordHistory && this.history_service) {
      this.history_service.recordState(this.getState());
    }

    this.#notifyChange();
  }

  // NEW: Set history service
  setHistoryService(_historyService) {
    this.history_service = _historyService;
  }

  // Existing methods remain unchanged
  getText() { ... }
  getLine(_lineNumber) { ... }
  getLineCount() { ... }
  onChange(_listener) { ... }
  markAsSaved() { ... }
  isDirty() { ... }
}
```

### 2.3 EditorPane Integration

**Responsibility**: Handle user input, delegate to Document, render results

**File**: `src/views/components/EditorPane.js` (major refactor)

**Key Changes**:

1. **Remove all `execCommand` usage**
2. **Use Document methods for all edits**
3. **Integrate HistoryService**
4. **Enable rendering** (uncomment line 217)

**New Flow**:

```javascript
// OLD (current):
handleKeyDown('a') {
  execCommand('insertText', false, 'a');
  // ← Adds to browser undo stack
  // ← Then we render and destroy that stack
}

// NEW (with HistoryService):
handleKeyDown('a') {
  const cursor = this.getCursorPosition();
  this.document.insertText(cursor.line, cursor.column, 'a');
  // ↓
  // Document.insertText() calls:
  //   - Update this.lines
  //   - this.history_service.recordState(this.getState())
  //   - this.#notifyChange()
  // ↓
  // onChange listener calls:
  //   - this.#performRenderWithCursorRestore()
  //   - innerHTML replacement (OK now!)
}
```

---

## 3. Data Structures

### 3.1 Snapshot Structure

```javascript
interface Snapshot {
  content: string; // Full document text (all lines joined)
  cursor: {
    // Current cursor position
    line: number, // 0-indexed line number
    column: number, // 0-indexed column (character offset)
  };
  selection: {
    // Selection range (null if collapsed)
    start: {
      line: number,
      column: number,
    },
    end: {
      line: number,
      column: number,
    },
  } | null;
  timestamp: number; // Date.now() - for merge detection
  type: 'insert' | 'delete' | 'replace'; // Edit type for merging
}
```

**Memory Calculation**:

- Average file: 500 lines × 50 chars = 25 KB
- Snapshot overhead: ~100 bytes
- Max 100 snapshots = ~2.5 MB
- Acceptable for browser memory

### 3.2 History Stacks

```javascript
class HistoryService {
  undo_stack: Snapshot[]; // [oldest ... newest]
  redo_stack: Snapshot[]; // [most recent redo ... oldest redo]
}
```

**Stack Operations**:

```
Initial state: undo=[], redo=[]

User types "hello" (5 edit operations, merged to 1):
  undo=[snapshot0], redo=[]

User types " world" (merged):
  undo=[snapshot0, snapshot1], redo=[]

User presses Ctrl+Z:
  undo=[snapshot0]
  redo=[snapshot1]
  (restore snapshot0)

User presses Ctrl+Z again:
  undo=[]
  redo=[snapshot0, snapshot1]
  (restore initial empty state)

User presses Ctrl+Y:
  undo=[snapshot0]
  redo=[snapshot1]
  (restore snapshot0)
```

---

## 4. API Specifications

### 4.1 HistoryService API

```javascript
class HistoryService {
  /**
   * Record a new state to undo stack
   * @param {Snapshot} _snapshot - State to record
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
        return;
      }
    }

    // Add new snapshot
    this.undo_stack.push(_snapshot);

    // Limit stack size
    if (this.undo_stack.length > this.max_stack_size) {
      this.undo_stack.shift(); // Remove oldest
    }

    // Clear redo stack (new edit invalidates redo history)
    this.redo_stack = [];

    this.last_snapshot_time = _snapshot.timestamp;
  }

  /**
   * Undo last operation
   * @returns {Snapshot | null} - Previous state, or null if nothing to undo
   */
  undo() {
    if (this.undo_stack.length === 0) return null;

    this.is_undoing = true;

    // Pop from undo stack
    const snapshot = this.undo_stack.pop();

    // Push to redo stack
    this.redo_stack.push(snapshot);

    this.is_undoing = false;

    // Return previous state (top of undo stack, or null)
    return this.undo_stack.length > 0 ? this.undo_stack[this.undo_stack.length - 1] : null;
  }

  /**
   * Redo last undone operation
   * @returns {Snapshot | null} - Next state, or null if nothing to redo
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
  }

  /**
   * Check if two snapshots should be merged
   * @private
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
   */
  #mergeSnapshots(_snapshot1, _snapshot2) {
    // Return the newer snapshot with merged content
    // Keep cursor position from newer snapshot
    return {
      ..._snapshot2,
      timestamp: _snapshot1.timestamp, // Keep original time for merge window
    };
  }
}
```

### 4.2 Document API Extensions

```javascript
class Document {
  /**
   * Insert text at position
   * @param {number} _line - Line number (0-indexed)
   * @param {number} _column - Column number (0-indexed)
   * @param {string} _text - Text to insert (can contain \n)
   */
  insertText(_line, _column, _text) {
    const currentLine = this.lines[_line] || '';
    const before = currentLine.substring(0, _column);
    const after = currentLine.substring(_column);

    const insertLines = _text.split('\n');

    if (insertLines.length === 1) {
      // Single line insertion
      this.lines[_line] = before + _text + after;
      this.cursor = { line: _line, column: _column + _text.length };
    } else {
      // Multi-line insertion
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

    this.content = this.lines.join('\n');
    this.is_dirty = true;
    this.last_edit_type = 'insert';

    // Record to history
    if (this.history_service) {
      this.history_service.recordState(this.getState());
    }

    this.#notifyChange();
  }

  /**
   * Delete text in range
   * @param {number} _startLine
   * @param {number} _startCol
   * @param {number} _endLine
   * @param {number} _endCol
   */
  deleteText(_startLine, _startCol, _endLine, _endCol) {
    if (_startLine === _endLine) {
      // Single line deletion
      const line = this.lines[_startLine];
      this.lines[_startLine] = line.substring(0, _startCol) + line.substring(_endCol);
    } else {
      // Multi-line deletion
      const firstLine = this.lines[_startLine].substring(0, _startCol);
      const lastLine = this.lines[_endLine].substring(_endCol);

      this.lines.splice(_startLine, _endLine - _startLine + 1, firstLine + lastLine);
    }

    this.cursor = { line: _startLine, column: _startCol };
    this.content = this.lines.join('\n');
    this.is_dirty = true;
    this.last_edit_type = 'delete';

    // Record to history
    if (this.history_service) {
      this.history_service.recordState(this.getState());
    }

    this.#notifyChange();
  }

  /**
   * Replace range with new text
   * @param {number} _startLine
   * @param {number} _startCol
   * @param {number} _endLine
   * @param {number} _endCol
   * @param {string} _newText
   */
  replaceRange(_startLine, _startCol, _endLine, _endCol, _newText) {
    this.last_edit_type = 'replace';
    this.deleteText(_startLine, _startCol, _endLine, _endCol);
    this.insertText(_startLine, _startCol, _newText);
  }
}
```

---

## 5. Integration Points

### 5.1 Application Initialization (app.js)

```javascript
// In src/app.js#initialize()

// Create HistoryService
this.history_service = new HistoryService();

// Connect to Document when file is opened
this.tabController.on('document-opened', (_document) => {
  _document.setHistoryService(this.history_service);
  this.history_service.clear(); // Clear history for new file
});

// Add keyboard shortcuts
this.keyBindings.register('ctrl+z', () => {
  if (this.history_service.canUndo()) {
    const snapshot = this.history_service.undo();
    if (snapshot) {
      const currentDoc = this.editorController.getCurrentDocument();
      currentDoc.setState(snapshot, false); // false = don't record
    }
  }
});

this.keyBindings.register('ctrl+y', () => {
  if (this.history_service.canRedo()) {
    const snapshot = this.history_service.redo();
    if (snapshot) {
      const currentDoc = this.editorController.getCurrentDocument();
      currentDoc.setState(snapshot, false);
    }
  }
});

this.keyBindings.register('ctrl+shift+z', () => {
  // Alternative redo shortcut
  if (this.history_service.canRedo()) {
    const snapshot = this.history_service.redo();
    if (snapshot) {
      const currentDoc = this.editorController.getCurrentDocument();
      currentDoc.setState(snapshot, false);
    }
  }
});
```

### 5.2 EditorPane Refactoring

**Key Changes**:

1. **Remove execCommand pattern**:

   ```javascript
   // OLD:
   handleKeyDown('a') {
     execCommand('insertText', false, 'a');
   }

   // NEW:
   handleKeyDown('a') {
     const cursor = this.getCursorPosition();
     this.document.insertText(cursor.line, cursor.column, 'a');
   }
   ```

2. **Enable rendering**:

   ```javascript
   // Line 217 - UNCOMMENT:
   this.#renderAllLines();
   ```

3. **Prevent default for all typing keys**:

   ```javascript
   handleKeyDown(_e) {
     // For typing keys, prevent default and use Document methods
     if (_e.key.length === 1 && !_e.ctrlKey && !_e.metaKey) {
       _e.preventDefault();
       const cursor = this.getCursorPosition();
       this.document.insertText(cursor.line, cursor.column, _e.key);
       return;
     }

     // ... rest of special key handling
   }
   ```

4. **Handle Backspace/Delete**:

   ```javascript
   handleKeyDown(_e) {
     if (_e.key === 'Backspace') {
       _e.preventDefault();
       const cursor = this.getCursorPosition();
       if (cursor.column > 0) {
         this.document.deleteText(cursor.line, cursor.column - 1, cursor.line, cursor.column);
       } else if (cursor.line > 0) {
         const prevLineLength = this.document.getLine(cursor.line - 1).length;
         this.document.deleteText(cursor.line - 1, prevLineLength, cursor.line, 0);
       }
       return;
     }

     if (_e.key === 'Delete') {
       _e.preventDefault();
       const cursor = this.getCursorPosition();
       const currentLine = this.document.getLine(cursor.line);
       if (cursor.column < currentLine.length) {
         this.document.deleteText(cursor.line, cursor.column, cursor.line, cursor.column + 1);
       } else if (cursor.line < this.document.getLineCount() - 1) {
         this.document.deleteText(cursor.line, cursor.column, cursor.line + 1, 0);
       }
       return;
     }
   }
   ```

---

## 6. Implementation Strategy

### 6.1 Phase 1: Core Infrastructure

**Tasks**:

1. Create `HistoryService.js` with full implementation
2. Extend `Document.js` with editing methods
3. Add unit tests for both (optional but recommended)

**Validation**:

- HistoryService can record/undo/redo snapshots
- Document methods correctly modify lines array
- Cursor positions update correctly

### 6.2 Phase 2: EditorPane Integration

**Tasks**:

1. Add HistoryService reference to EditorPane
2. Refactor Tab key handler to use Document.insertText()
3. Refactor Enter key handler to use Document.insertText()
4. Refactor auto-bracket/quote to use Document methods
5. Add typing key handler (prevent default, use Document.insertText())
6. Add Backspace/Delete handlers (use Document.deleteText())
7. Uncomment line 217 to enable rendering

**Validation**:

- Typing updates editor correctly
- Syntax highlighting appears in real-time
- Special keys (Tab, Enter, brackets) work

### 6.3 Phase 3: Undo/Redo Implementation

**Tasks**:

1. Add keyboard shortcuts in app.js (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
2. Connect Document to HistoryService on file open
3. Test undo/redo with various scenarios:
   - Typing text
   - Deleting text
   - Multi-line edits
   - Cursor position restoration

**Validation**:

- Ctrl+Z undoes last edit
- Ctrl+Y redoes
- Cursor restores to correct position
- Syntax highlighting updates correctly

### 6.4 Phase 4: Edge Cases and Polish

**Tasks**:

1. Handle selections (delete selection before insert)
2. Handle paste (replace selection)
3. Handle cut (delete selection, copy to clipboard)
4. Handle Korean/Chinese/Japanese IME input
5. Test with large files
6. Test memory usage (100+ undo operations)

**Validation**:

- All edge cases work
- No memory leaks
- Performance acceptable

---

## 7. Testing Strategy

### 7.1 Unit Tests (Optional)

**HistoryService**:

- Test recordState()
- Test undo()/redo()
- Test merging logic
- Test stack size limits

**Document**:

- Test insertText() single/multi-line
- Test deleteText() single/multi-line
- Test replaceRange()
- Test getState()/setState()

### 7.2 Integration Tests

**Manual Testing Scenarios**:

1. Type "hello world" → Undo → Should remove all at once (merged)
2. Type "hello", wait 1s, type "world" → Undo → Should remove "world" only
3. Type text, press Enter, type more → Undo → Should remove line
4. Select text, delete → Undo → Should restore text and selection
5. Type, undo, type again → Redo stack should clear
6. Undo to beginning → Redo → Should restore all edits in order
7. Type 100+ edits → Check memory usage, oldest should be removed

---

## 8. Potential Issues and Mitigations

### 8.1 Memory Usage

**Issue**: Storing full snapshots uses memory

**Mitigation**:

- Limit stack to 100 entries (2.5 MB max)
- Merge consecutive char edits (reduces snapshot count)
- Clear history when switching files
- Use weak references if needed (advanced)

### 8.2 Performance

**Issue**: Rendering on every edit might be slow

**Mitigation**:

- Current rendering is already optimized (VirtualScroller for large files)
- Syntax highlighting is fast (token-based)
- Can add throttling if needed
- Profile and optimize bottlenecks

### 8.3 Cursor Restoration Accuracy

**Issue**: Cursor might not restore to exact position after innerHTML replacement

**Mitigation**:

- Use existing `#restoreCursorPosition()` (already handles syntax highlighting spans)
- Store cursor in snapshot (line, column)
- Test thoroughly with various scenarios

### 8.4 IME Input (Korean/Chinese/Japanese)

**Issue**: Composition events might conflict with custom input handling

**Mitigation**:

- Keep existing composition event handlers
- Don't prevent default during composition
- Only use Document methods after composition ends

---

**End of Design Document**
