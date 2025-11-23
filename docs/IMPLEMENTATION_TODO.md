# Implementation TODO List

**Date**: 2025-11-23
**Purpose**: Step-by-step implementation checklist for HistoryService undo/redo

---

## Implementation Order

### ✅ = Completed | 🔄 = In Progress | ⏳ = Pending

---

## Phase 1: Documentation ✅

- [x] Create EDITOR_REFACTORING_ANALYSIS.md
- [x] Create HISTORY_SERVICE_DESIGN.md
- [x] Create IMPLEMENTATION_TODO.md

---

## Phase 2: Core Infrastructure ⏳

### Task 2.1: Create HistoryService.js ⏳

**File**: `src/services/HistoryService.js`

**Subtasks**:

- [ ] Create file with header comment
- [ ] Implement constructor

  - [ ] Initialize `undo_stack = []`
  - [ ] Initialize `redo_stack = []`
  - [ ] Set `max_stack_size = 100`
  - [ ] Set `is_undoing = false`
  - [ ] Set `is_redoing = false`
  - [ ] Set `last_snapshot_time = 0`
  - [ ] Set `merge_timeout = 500`

- [ ] Implement `recordState(_snapshot)` method

  - [ ] Check `is_undoing` / `is_redoing` flags, skip if true
  - [ ] Call `#shouldMerge()` to check if should merge with last
  - [ ] If should merge: call `#mergeSnapshots()` and update last snapshot
  - [ ] If not merge: push snapshot to undo_stack
  - [ ] Enforce max stack size (shift oldest if exceeded)
  - [ ] Clear redo_stack (new edit invalidates redo)
  - [ ] Update `last_snapshot_time`

- [ ] Implement `undo()` method

  - [ ] Check if undo_stack has items, return null if empty
  - [ ] Set `is_undoing = true`
  - [ ] Pop from undo_stack
  - [ ] Push to redo_stack
  - [ ] Set `is_undoing = false`
  - [ ] Return previous state (peek undo_stack, or null if empty)

- [ ] Implement `redo()` method

  - [ ] Check if redo_stack has items, return null if empty
  - [ ] Set `is_redoing = true`
  - [ ] Pop from redo_stack
  - [ ] Push to undo_stack
  - [ ] Set `is_redoing = false`
  - [ ] Return restored state

- [ ] Implement `canUndo()` method

  - [ ] Return `undo_stack.length > 0`

- [ ] Implement `canRedo()` method

  - [ ] Return `redo_stack.length > 0`

- [ ] Implement `clear()` method

  - [ ] Reset undo_stack to []
  - [ ] Reset redo_stack to []

- [ ] Implement `#shouldMerge(_newSnapshot, _lastSnapshot)` private method

  - [ ] Check timestamp difference <= merge_timeout
  - [ ] Check same edit type
  - [ ] For 'insert': check single character added
  - [ ] For 'delete': check single character removed
  - [ ] Return true/false

- [ ] Implement `#mergeSnapshots(_snapshot1, _snapshot2)` private method

  - [ ] Return merged snapshot (newer content, original timestamp)

- [ ] Add `export default HistoryService`

**Testing**:

- [ ] Create test file (optional): `tests/services/HistoryService.test.js`
- [ ] Test recordState adds to stack
- [ ] Test undo/redo operations
- [ ] Test merging logic
- [ ] Test stack size limit

**Estimated Time**: 2 hours

---

### Task 2.2: Extend Document.js with Editing Methods ⏳

**File**: `src/models/Document.js`

**Subtasks**:

- [ ] Add new properties to constructor

  - [ ] `this.history_service = null`
  - [ ] `this.last_edit_type = 'replace'`

- [ ] Implement `setHistoryService(_historyService)` method

  - [ ] Store reference: `this.history_service = _historyService`

- [ ] Implement `getState()` method

  - [ ] Return snapshot object with:
    - [ ] `content: this.getText()`
    - [ ] `cursor: { ...this.cursor }`
    - [ ] `selection: this.selection ? { ...this.selection } : null`
    - [ ] `timestamp: Date.now()`
    - [ ] `type: this.last_edit_type`

- [ ] Implement `setState(_snapshot, _recordHistory = false)` method

  - [ ] Set `this.content = _snapshot.content`
  - [ ] Set `this.lines = this.#splitLines(_snapshot.content)`
  - [ ] Set `this.cursor = { ..._snapshot.cursor }`
  - [ ] Set `this.selection = _snapshot.selection ? { ..._snapshot.selection } : null`
  - [ ] If `_recordHistory && this.history_service`: call `history_service.recordState(this.getState())`
  - [ ] Call `this.#notifyChange()`

- [ ] Implement `insertText(_line, _column, _text)` method

  - [ ] Get current line text
  - [ ] Split into before/after cursor
  - [ ] Split inserted text by '\n'
  - [ ] **If single line**:
    - [ ] Update line: `before + _text + after`
    - [ ] Update cursor: `{line: _line, column: _column + _text.length}`
  - [ ] **If multi-line**:
    - [ ] Update first line: `before + insertLines[0]`
    - [ ] Insert middle lines
    - [ ] Insert last line: `lastLine + after`
    - [ ] Update cursor to end of last inserted line
  - [ ] Update `this.content = this.lines.join('\n')`
  - [ ] Set `this.is_dirty = true`
  - [ ] Set `this.last_edit_type = 'insert'`
  - [ ] If history_service: call `recordState(this.getState())`
  - [ ] Call `this.#notifyChange()`

- [ ] Implement `deleteText(_startLine, _startCol, _endLine, _endCol)` method

  - [ ] **If single line deletion**:
    - [ ] Update line: `line.substring(0, _startCol) + line.substring(_endCol)`
  - [ ] **If multi-line deletion**:
    - [ ] Get first line prefix: `lines[_startLine].substring(0, _startCol)`
    - [ ] Get last line suffix: `lines[_endLine].substring(_endCol)`
    - [ ] Splice lines: replace range with `prefix + suffix`
  - [ ] Update cursor: `{line: _startLine, column: _startCol}`
  - [ ] Update `this.content`
  - [ ] Set `this.is_dirty = true`
  - [ ] Set `this.last_edit_type = 'delete'`
  - [ ] If history_service: call `recordState(this.getState())`
  - [ ] Call `this.#notifyChange()`

- [ ] Implement `replaceRange(_startLine, _startCol, _endLine, _endCol, _newText)` method

  - [ ] Set `this.last_edit_type = 'replace'`
  - [ ] Call `this.deleteText(_startLine, _startCol, _endLine, _endCol)`
  - [ ] Call `this.insertText(_startLine, _startCol, _newText)`

- [ ] Update existing commented-out methods
  - [ ] Remove or uncomment old `insertText`, `deleteText`, `moveCursor` methods (lines 47-130)
  - [ ] Ensure no conflicts with new implementations

**Testing**:

- [ ] Test insertText with single-line text
- [ ] Test insertText with multi-line text
- [ ] Test deleteText single line
- [ ] Test deleteText multi-line
- [ ] Test replaceRange
- [ ] Test getState/setState
- [ ] Test history recording

**Estimated Time**: 3 hours

---

## Phase 3: EditorPane Integration ⏳

### Task 3.1: Setup and Initialization ⏳

**File**: `src/views/components/EditorPane.js`

**Subtasks**:

- [ ] Add HistoryService import at top

  ```javascript
  import HistoryService from '../../services/HistoryService.js';
  ```

- [ ] Add property to constructor (line ~38)

  ```javascript
  this.history_service = new HistoryService();
  ```

- [ ] Connect HistoryService when document is set (in `setDocument()`, line ~651)
  ```javascript
  if (_document) {
    _document.setHistoryService(this.history_service);
    this.history_service.clear(); // Clear history for new file
    // ... existing code
  }
  ```

**Estimated Time**: 30 minutes

---

### Task 3.2: Enable Rendering ⏳

**File**: `src/views/components/EditorPane.js`

**Subtasks**:

- [ ] Uncomment line 217 in `#performRenderWithCursorRestore()`

  ```javascript
  // Before:
  // this.#renderAllLines();

  // After:
  this.#renderAllLines();
  ```

- [ ] Test that syntax highlighting appears

**Estimated Time**: 5 minutes

---

### Task 3.3: Refactor Normal Typing Keys ⏳

**File**: `src/views/components/EditorPane.js` → `#handleKeyDown()` method

**Subtasks**:

- [ ] Add handler for normal typing keys (before special key checks, line ~307)

  ```javascript
  #handleKeyDown(_e) {
    // Handle normal typing keys (single character, no modifiers)
    if (_e.key.length === 1 && !_e.ctrlKey && !_e.metaKey && !_e.altKey) {
      // Skip if composing (Korean/Chinese/Japanese input)
      if (this.is_composing) return;

      // Skip if completion panel is visible (let it handle the key)
      if (this.completion_panel_visible) return;

      _e.preventDefault();
      const cursorPos = this.getCursorPosition();
      if (!cursorPos) return;

      // Use Document method instead of execCommand
      this.document.insertText(cursorPos.line, cursorPos.column, _e.key);
      return;
    }

    // ... existing special key handling
  }
  ```

**Estimated Time**: 30 minutes

---

### Task 3.4: Refactor Backspace/Delete Keys ⏳

**File**: `src/views/components/EditorPane.js` → `#handleKeyDown()` method

**Subtasks**:

- [ ] Add Backspace handler (before Tab key check)

  ```javascript
  if (_e.key === 'Backspace' && !this.completion_panel_visible) {
    _e.preventDefault();
    const cursorPos = this.getCursorPosition();
    if (!cursorPos) return;

    const currentLine = this.document.getLine(cursorPos.line);

    if (cursorPos.column > 0) {
      // Delete character before cursor
      this.document.deleteText(cursorPos.line, cursorPos.column - 1, cursorPos.line, cursorPos.column);
    } else if (cursorPos.line > 0) {
      // Delete newline (merge with previous line)
      const prevLine = this.document.getLine(cursorPos.line - 1);
      this.document.deleteText(cursorPos.line - 1, prevLine.length, cursorPos.line, 0);
    }
    return;
  }

  if (_e.key === 'Delete' && !this.completion_panel_visible) {
    _e.preventDefault();
    const cursorPos = this.getCursorPosition();
    if (!cursorPos) return;

    const currentLine = this.document.getLine(cursorPos.line);

    if (cursorPos.column < currentLine.length) {
      // Delete character after cursor
      this.document.deleteText(cursorPos.line, cursorPos.column, cursorPos.line, cursorPos.column + 1);
    } else if (cursorPos.line < this.document.getLineCount() - 1) {
      // Delete newline (merge with next line)
      this.document.deleteText(cursorPos.line, cursorPos.column, cursorPos.line + 1, 0);
    }
    return;
  }
  ```

**Estimated Time**: 45 minutes

---

### Task 3.5: Refactor Tab Key ⏳

**File**: `src/views/components/EditorPane.js` → Line ~391

**Subtasks**:

- [ ] Replace execCommand with Document.insertText

  ```javascript
  // Before:
  if (_e.key === 'Tab' && !this.completion_panel_visible) {
    _e.preventDefault();
    window.document.execCommand('insertText', false, '  ');
    // execCommand는 자동으로 input 이벤트를 발생시키므로 별도 렌더링 불필요
    return;
  }

  // After:
  if (_e.key === 'Tab' && !this.completion_panel_visible) {
    _e.preventDefault();
    const cursorPos = this.getCursorPosition();
    if (!cursorPos) return;

    this.document.insertText(cursorPos.line, cursorPos.column, '  ');
    return;
  }
  ```

**Estimated Time**: 10 minutes

---

### Task 3.6: Refactor Enter Key ⏳

**File**: `src/views/components/EditorPane.js` → `#handleEnterKey()` method (line ~400)

**Subtasks**:

- [ ] Replace all `execCommand` calls with `Document.insertText`
- [ ] Update simple Enter case

  ```javascript
  // Before:
  window.document.execCommand('insertText', false, '\n' + currentIndent);

  // After:
  this.document.insertText(cursorPos.line, cursorPos.column, '\n' + currentIndent);
  ```

- [ ] Update bracket-pair Enter case (lines ~440-450)

  ```javascript
  // Before:
  window.document.execCommand('insertText', false, '\n' + newIndent);
  // ... setTimeout ...
  window.document.execCommand('insertText', false, '\n' + currentIndent);

  // After:
  const text = '\n' + newIndent + '\n' + currentIndent;
  this.document.insertText(cursorPos.line, cursorPos.column, text);

  // Then restore cursor to middle line
  setTimeout(() => {
    this.document.cursor = {
      line: cursorPos.line + 1,
      column: newIndent.length,
    };
    this.#performRenderWithCursorRestore();
  }, 0);
  ```

- [ ] Update bracket-open Enter case

**Estimated Time**: 1 hour

---

### Task 3.7: Refactor Auto-Quote Handler ⏳

**File**: `src/views/components/EditorPane.js` → `#handleAutoCloseQuote()` method (line ~472)

**Subtasks**:

- [ ] Replace execCommand with Document.insertText

  ```javascript
  #handleAutoCloseQuote(_openQuote) {
    const closeQuote = { '"': '"', "'": "'", '`': '`' }[_openQuote];
    const cursorPos = this.getCursorPosition();

    if (!cursorPos) {
      this.document.insertText(0, 0, _openQuote);
      return;
    }

    const currentLine = this.document.getLine(cursorPos.line);
    const afterCursor = currentLine.substring(cursorPos.column);

    if (!afterCursor || /^[\s"'`]/.test(afterCursor)) {
      // Insert both quotes
      this.document.insertText(cursorPos.line, cursorPos.column, _openQuote + closeQuote);

      // Move cursor between quotes
      setTimeout(() => {
        this.document.cursor = {
          line: cursorPos.line,
          column: cursorPos.column + 1
        };
        this.#performRenderWithCursorRestore();
      }, 0);
    } else {
      // Just insert opening quote
      this.document.insertText(cursorPos.line, cursorPos.column, _openQuote);
    }
  }
  ```

**Estimated Time**: 30 minutes

---

### Task 3.8: Refactor Auto-Bracket Handler ⏳

**File**: `src/views/components/EditorPane.js` → `#handleAutoCloseBracket()` method (line ~553)

**Subtasks**:

- [ ] Replace execCommand with Document.insertText (similar pattern to auto-quote)
- [ ] Update cursor movement logic

**Estimated Time**: 30 minutes

---

### Task 3.9: Refactor Paste Handler ⏳

**File**: `src/views/components/EditorPane.js` → `#handlePaste()` method (line ~634)

**Subtasks**:

- [ ] Replace execCommand with Document.insertText

  ```javascript
  #handlePaste(_e) {
    _e.preventDefault();
    const text = _e.clipboardData.getData('text/plain');
    if (!text) return;

    const cursorPos = this.getCursorPosition();
    if (!cursorPos) return;

    this.document.insertText(cursorPos.line, cursorPos.column, text);
  }
  ```

**Estimated Time**: 15 minutes

---

### Task 3.10: Update Completion Insertion ⏳

**File**: `src/views/components/EditorPane.js` → `insertCompletion()` method (line ~887)

**Subtasks**:

- [ ] Replace manual DOM manipulation with Document methods

  ```javascript
  insertCompletion(_completion) {
    if (!this.document) return;

    const cursorPos = this.getCursorPosition();
    if (!cursorPos) return;

    const currentLine = this.document.getLine(cursorPos.line);
    if (!currentLine) return;

    const beforeCursor = currentLine.substring(0, cursorPos.column);

    // Find prefix to replace
    const thisMatch = beforeCursor.match(/\bthis\.([a-zA-Z_$][a-zA-Z0-9_$]*)$/);
    const objMatch = beforeCursor.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\.([a-zA-Z_$][a-zA-Z0-9_$]*)$/);
    const prefixMatch = beforeCursor.match(/[a-zA-Z_$][a-zA-Z0-9_$]*$/);

    let prefix = '';
    if (thisMatch) {
      prefix = thisMatch[1];
    } else if (objMatch) {
      prefix = objMatch[1];
    } else if (prefixMatch) {
      prefix = prefixMatch[0];
    }

    // Delete prefix, insert completion
    if (prefix.length > 0) {
      this.document.replaceRange(
        cursorPos.line,
        cursorPos.column - prefix.length,
        cursorPos.line,
        cursorPos.column,
        _completion.insertText
      );
    } else {
      this.document.insertText(
        cursorPos.line,
        cursorPos.column,
        _completion.insertText
      );
    }
  }
  ```

**Estimated Time**: 30 minutes

---

## Phase 4: Keyboard Shortcuts ⏳

### Task 4.1: Add Undo/Redo Shortcuts ⏳

**File**: `src/app.js` → `setupKeyBindings()` method

**Subtasks**:

- [ ] Add HistoryService import

  ```javascript
  import HistoryService from './services/HistoryService.js';
  ```

- [ ] Create HistoryService instance (in constructor or initialize)

  ```javascript
  this.history_service = new HistoryService();
  ```

- [ ] Add Ctrl+Z (Undo) shortcut

  ```javascript
  this.keyBindings.register('ctrl+z', () => {
    if (!this.history_service.canUndo()) return;

    const snapshot = this.history_service.undo();
    if (snapshot) {
      const currentDoc = this.editorController.getCurrentDocument();
      if (currentDoc) {
        currentDoc.setState(snapshot, false); // false = don't record to history
      }
    }
  });
  ```

- [ ] Add Ctrl+Y (Redo) shortcut

  ```javascript
  this.keyBindings.register('ctrl+y', () => {
    if (!this.history_service.canRedo()) return;

    const snapshot = this.history_service.redo();
    if (snapshot) {
      const currentDoc = this.editorController.getCurrentDocument();
      if (currentDoc) {
        currentDoc.setState(snapshot, false);
      }
    }
  });
  ```

- [ ] Add Ctrl+Shift+Z (Alternative Redo) shortcut

  ```javascript
  this.keyBindings.register('ctrl+shift+z', () => {
    if (!this.history_service.canRedo()) return;

    const snapshot = this.history_service.redo();
    if (snapshot) {
      const currentDoc = this.editorController.getCurrentDocument();
      if (currentDoc) {
        currentDoc.setState(snapshot, false);
      }
    }
  });
  ```

- [ ] Connect HistoryService to Document when file opens
  ```javascript
  // In connectEvents() or appropriate place:
  this.tabController.on('document-opened', (_document) => {
    _document.setHistoryService(this.history_service);
    this.history_service.clear(); // Clear history for new file
  });
  ```

**Estimated Time**: 1 hour

---

## Phase 5: Testing and Validation ⏳

### Task 5.1: Basic Functionality Tests ⏳

**Manual Testing Checklist**:

- [ ] Test typing single characters

  - [ ] Type "hello" → verify appears with syntax highlighting
  - [ ] Press Ctrl+Z → verify "hello" disappears (merged undo)
  - [ ] Press Ctrl+Y → verify "hello" reappears

- [ ] Test typing with delay

  - [ ] Type "hello"
  - [ ] Wait 1 second
  - [ ] Type "world"
  - [ ] Press Ctrl+Z → verify only "world" disappears
  - [ ] Press Ctrl+Z again → verify "hello" disappears

- [ ] Test Backspace/Delete

  - [ ] Type "hello"
  - [ ] Press Backspace 2 times → "hel"
  - [ ] Press Ctrl+Z → verify "hello" returns
  - [ ] Move cursor to middle
  - [ ] Press Delete → verify character deleted
  - [ ] Press Ctrl+Z → verify character restored

- [ ] Test Tab key

  - [ ] Press Tab → verify 2 spaces inserted
  - [ ] Verify syntax highlighting updates
  - [ ] Press Ctrl+Z → verify spaces removed

- [ ] Test Enter key
  - [ ] Type "function test() {"
  - [ ] Press Enter → verify indentation added
  - [ ] Verify cursor between braces
  - [ ] Press Ctrl+Z → verify newlines removed

**Estimated Time**: 1 hour

---

### Task 5.2: Edge Case Tests ⏳

**Manual Testing Checklist**:

- [ ] Test empty line space/tab insertion

  - [ ] Open new file
  - [ ] Press Space → verify space appears
  - [ ] Press Tab → verify 2 spaces appear
  - [ ] Press Ctrl+Z → verify spaces removed

- [ ] Test multi-line paste

  - [ ] Copy multi-line text
  - [ ] Paste into editor
  - [ ] Verify syntax highlighting
  - [ ] Press Ctrl+Z → verify paste undone

- [ ] Test auto-bracket/quote

  - [ ] Type `(` → verify `)` auto-inserted
  - [ ] Type `"` → verify `"` auto-inserted
  - [ ] Verify cursor between pairs
  - [ ] Press Ctrl+Z → verify both characters removed

- [ ] Test completion insertion

  - [ ] Type `this.` → verify completion panel
  - [ ] Select completion → verify inserted
  - [ ] Press Ctrl+Z → verify completion removed, prefix restored

- [ ] Test Korean/Chinese/Japanese input (if applicable)
  - [ ] Switch to IME input
  - [ ] Type characters
  - [ ] Verify composition works
  - [ ] Verify undo works after composition

**Estimated Time**: 1.5 hours

---

### Task 5.3: Performance Tests ⏳

**Manual Testing Checklist**:

- [ ] Test with large file (1000+ lines)

  - [ ] Open large file
  - [ ] Type characters → verify no lag
  - [ ] Verify syntax highlighting updates
  - [ ] Press Ctrl+Z → verify undo works

- [ ] Test many undo operations

  - [ ] Type 100+ characters
  - [ ] Press Ctrl+Z 50 times
  - [ ] Verify no memory issues
  - [ ] Verify undo stack limit enforced (max 100)

- [ ] Test rapid typing
  - [ ] Type very fast (10+ chars/second)
  - [ ] Verify syntax highlighting keeps up
  - [ ] Verify merging works (consecutive chars = 1 undo)

**Estimated Time**: 1 hour

---

### Task 5.4: Integration Tests ⏳

**Manual Testing Checklist**:

- [ ] Test file save/load

  - [ ] Type text
  - [ ] Save file (Ctrl+S)
  - [ ] Verify undo still works after save
  - [ ] Close and reopen file
  - [ ] Verify undo history cleared for new file

- [ ] Test tab switching

  - [ ] Open multiple tabs
  - [ ] Type in tab 1
  - [ ] Switch to tab 2, type
  - [ ] Switch back to tab 1
  - [ ] Press Ctrl+Z → verify undoes tab 1 edits, not tab 2

- [ ] Test search/replace (if implemented)
  - [ ] Type text
  - [ ] Use search/replace
  - [ ] Press Ctrl+Z → verify replace undone

**Estimated Time**: 1 hour

---

## Phase 6: Bug Fixes and Polish ⏳

### Task 6.1: Fix Any Discovered Bugs ⏳

**Subtasks**:

- [ ] Fix cursor restoration issues (if any)
- [ ] Fix merging logic bugs (if any)
- [ ] Fix rendering performance issues (if any)
- [ ] Fix IME input compatibility issues (if any)

**Estimated Time**: Variable (2-4 hours)

---

### Task 6.2: Code Cleanup ⏳

**Subtasks**:

- [ ] Remove old commented-out code

  - [ ] Remove commented Document methods in Document.js (lines 47-130)
  - [ ] Remove any other dead code

- [ ] Add JSDoc comments to new methods

  - [ ] Document HistoryService methods
  - [ ] Document Document editing methods
  - [ ] Document EditorPane changes

- [ ] Update CLAUDE.md with architecture changes
  - [ ] Document HistoryService
  - [ ] Document Document editing methods
  - [ ] Update data flow diagrams

**Estimated Time**: 2 hours

---

### Task 6.3: Final Validation ⏳

**Checklist**:

- [ ] All features work correctly

  - [ ] ✅ Undo/Redo works (Ctrl+Z, Ctrl+Y)
  - [ ] ✅ Real-time syntax highlighting enabled
  - [ ] ✅ Spaces/tabs work on empty lines
  - [ ] ✅ Auto-bracket/quote features preserved
  - [ ] ✅ Cursor position restored on undo/redo
  - [ ] ✅ No performance issues

- [ ] Code quality

  - [ ] ✅ No console errors
  - [ ] ✅ No memory leaks
  - [ ] ✅ Code follows project conventions
  - [ ] ✅ Documentation updated

- [ ] User experience
  - [ ] ✅ Typing feels natural
  - [ ] ✅ Undo behavior is intuitive
  - [ ] ✅ Syntax highlighting is smooth
  - [ ] ✅ No visual glitches

**Estimated Time**: 1 hour

---

## Total Estimated Time

- **Phase 1 (Documentation)**: ✅ Completed
- **Phase 2 (Core Infrastructure)**: 5 hours
- **Phase 3 (EditorPane Integration)**: 5 hours
- **Phase 4 (Keyboard Shortcuts)**: 1 hour
- **Phase 5 (Testing)**: 4.5 hours
- **Phase 6 (Polish)**: 5 hours

**Total**: ~20.5 hours of development + testing

---

## Dependencies

**Before Starting Phase 2**:

- ✅ All documentation complete

**Before Starting Phase 3**:

- ⏳ HistoryService.js implemented and tested
- ⏳ Document.js extended with editing methods

**Before Starting Phase 4**:

- ⏳ EditorPane fully refactored
- ⏳ All text input uses Document methods

**Before Starting Phase 5**:

- ⏳ Keyboard shortcuts implemented
- ⏳ All components integrated

---

## Success Criteria

**Must Have**:

1. ✅ Ctrl+Z undoes last edit
2. ✅ Ctrl+Y redoes last undo
3. ✅ Syntax highlighting works in real-time
4. ✅ Spaces/tabs visible on empty lines
5. ✅ No console errors
6. ✅ Cursor restores to correct position on undo/redo

**Nice to Have**:

1. ✅ Consecutive character edits merge into single undo step
2. ✅ Undo stack limited to 100 entries (memory management)
3. ✅ Performance: no lag during typing
4. ✅ Unit tests for HistoryService and Document

---

**End of Implementation TODO**
