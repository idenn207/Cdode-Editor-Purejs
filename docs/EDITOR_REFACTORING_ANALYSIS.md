# EditorPane Refactoring Analysis

**Date**: 2025-11-23
**Purpose**: Document current state, all changes made, and root cause analysis for undo/redo issues

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Changes Made So Far](#changes-made-so-far)
3. [Current Issues](#current-issues)
4. [Root Cause Analysis](#root-cause-analysis)
5. [Conclusions](#conclusions)

---

## 1. Current Architecture

### 1.1 Overview

EditorPane uses a **contenteditable div** approach with the following components:

```
┌─────────────────────────────────────────┐
│  .editor-pane                           │
│  ┌───────────────────────────────────┐ │
│  │ .editor-content-wrapper           │ │
│  │  ┌──────────┐ ┌─────────────────┐│ │
│  │  │.line-    │ │.editor-content  ││ │
│  │  │ numbers  │ │(contenteditable)││ │
│  │  └──────────┘ └─────────────────┘│ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 1.2 Event Flow

**Input Event Chain**:

```
User types
  ↓
input event (line 70)
  ↓
#updateDocumentImmediate() (line 137)
  ↓
#extractText() (line 140) → Extract plain text from DOM
  ↓
Document.content = text (line 145)
Document.lines = text.split('\n') (line 146)
  ↓
emit('content-changed') (line 150)
  ↓
#scheduleDelayedRender() (line 78)
  ↓
[500ms timer]
  ↓
#performRenderWithCursorRestore() (line 209)
  ↓
**LINE 217 - RENDERING COMMENTED OUT**
// this.#renderAllLines();
```

### 1.3 Rendering Architecture

**Two Rendering Modes**:

1. **Full Rendering** (files < 1000 lines):

   - `#renderLineNumbers()` - Creates line number divs
   - `#renderContent()` - **Uses innerHTML to replace entire content**
   - Syntax highlighting via `SyntaxRenderer.renderLine()`

2. **Virtual Scrolling** (files >= 1000 lines):
   - Only renders visible lines + buffer
   - Still uses innerHTML replacement
   - Managed by `VirtualScroller`

**Critical Code - Line 835 in `#renderContent()`**:

```javascript
this.content_el.innerHTML = html; // ← DESTROYS UNDO STACK
this.content_el.contentEditable = 'true';
```

### 1.4 Special Key Handling

All special keys use `execCommand('insertText')` pattern:

| Key               | Handler  | Implementation                                                 |
| ----------------- | -------- | -------------------------------------------------------------- |
| Tab               | Line 391 | `execCommand('insertText', false, '  ')`                       |
| Enter             | Line 429 | `execCommand('insertText', false, '\n' + indent)`              |
| `(`, `{`, `[`     | Line 553 | `execCommand('insertText', false, openBracket + closeBracket)` |
| `"`, `'`, `` ` `` | Line 472 | `execCommand('insertText', false, openQuote + closeQuote)`     |
| Paste             | Line 638 | `execCommand('insertText', false, text)`                       |

**Pattern**: All use `execCommand` to preserve browser's undo stack, then use `setTimeout` to adjust cursor position.

### 1.5 Cursor Management

**Tracking** (`getCursorPosition()`, line 1007):

- Gets browser Selection API range
- Walks up DOM tree to find `.code-line` parent
- Calculates column by counting characters before cursor
- Returns `{line, column}`

**Restoration** (`#restoreCursorPosition()`, line 231):

- Finds target `.code-line` element
- Collects all text nodes (handles syntax highlighting spans)
- Accumulates character offsets to find correct text node
- Sets Range to correct position
- **Handles empty lines** (lines 273-281) by inserting empty text node

---

## 2. Changes Made So Far

### 2.1 Commit 6cd08e7: "chore: Editor 에 Document 요소 활용"

**Intent**: Refactor to use Document model methods instead of direct DOM manipulation

**Changes**:

1. Added `is_programmatic_change` flag (line 38)
2. Added several synchronization methods:
   - `#syncDOMToDocument()` - Extract text from DOM to Document
   - `#syncCursorToDocument()` - Sync cursor to Document.cursor
   - `#syncCursorFromDocument()` - Sync Document.cursor to DOM
   - `#setDOMCursor()` - Set DOM selection

**Problem**:

- Document model **does not have** `insertText()`, `deleteText()`, `replaceText()` methods
- Current Document.js (lines 1-143) only has:
  - `getText()`, `getLine()`, `getLineCount()`
  - `onChange()`, `markAsSaved()`, `isDirty()`
- **The refactoring was incomplete** - Document methods were never implemented

**Result**:

- Code references non-existent methods
- Falls back to direct `lines` array manipulation in `#updateDocumentImmediate()`

### 2.2 Commit 27abdf2: "fix: line number 와 line 미일치 오류 수정"

**Intent**: Fix line number alignment issues in virtual scrolling

**Changes**:

1. Moved `.line-numbers` inside `.editor-content-wrapper`
2. Updated virtual scrolling to use same offset calculation
3. Added cursor synchronization in Document onChange listener

**Problem Solved**: ✅ Line numbers now align correctly with content

### 2.3 Commit efba3be: "fix: tab 버튼 indent 오류 수정"

**Intent**: Fix Tab key not inserting indentation

**Changes**:

1. Changed Tab handler from Document method to `execCommand`
2. Removed call to non-existent `#insertTextAtCursor()` method

**Problem Solved**: ✅ Tab key now works

### 2.4 Current State (Uncommitted)

**Changes**:

1. **Line 217 - Rendering DISABLED**:
   ```javascript
   // this.#renderAllLines();  // COMMENTED OUT
   ```
2. Added debounced rendering with 500ms delay (lines 164-175)
3. Added blur event rendering (lines 111-118)
4. Improved cursor restoration for empty lines (lines 273-281)

**Intent**: Attempt to fix undo/redo by not rendering during typing

**Problems**:

- ❌ Syntax highlighting never appears during typing
- ❌ Spaces/tabs on empty lines don't show (no DOM update)
- ❌ Only renders on blur (clicking away from editor)

---

## 3. Current Issues

### 3.1 Undo/Redo Doesn't Work

**Symptom**: Pressing Ctrl+Z or Ctrl+Y does nothing

**Root Cause**: `innerHTML` replacement destroys browser's undo stack

**Evidence**:

- Line 835: `this.content_el.innerHTML = html;`
- This replaces entire DOM structure
- Browser's undo stack references old (deleted) DOM nodes
- When you press Ctrl+Z, browser can't find the nodes to restore

**Current "Solution"**: Line 217 disables rendering entirely

- Undo/redo would work if rendering were enabled
- But syntax highlighting breaks

### 3.2 Spaces/Tabs on Empty Lines Don't Show

**Symptom**: Press Space or Tab on empty line → nothing visible

**Root Cause**: Rendering is disabled (line 217)

**Flow**:

1. User presses Space on empty line
2. Browser's contenteditable adds space to DOM
3. `input` event fires → `#updateDocumentImmediate()` updates Document.lines
4. `#scheduleDelayedRender()` starts 500ms timer
5. Timer fires → `#performRenderWithCursorRestore()` called
6. **Line 217: Rendering is commented out** → nothing happens
7. Only the Document model is updated, not the visible DOM

**Why It Matters**:

- User types space, sees nothing
- Document.lines has the space, but DOM doesn't show it
- Breaks user experience

### 3.3 Incomplete Document Model Refactoring

**Symptom**: Code references methods that don't exist

**Evidence**:

```javascript
// Line 432 in old version (removed in current):
this.document.insertText(cursor.line, cursor.column, _text);
// ↑ Document.insertText() doesn't exist!
```

**Current State**:

- Document.js only has read methods and state management
- No text editing methods (`insertText`, `deleteText`, `replaceRange`)
- All editing falls back to:
  ```javascript
  this.document.lines = text.split('\n'); // Direct array manipulation
  ```

---

## 4. Root Cause Analysis

### 4.1 The Fundamental Conflict

**Two Incompatible Requirements**:

| Syntax Highlighting                       | Browser Undo/Redo                        |
| ----------------------------------------- | ---------------------------------------- |
| Requires wrapping tokens in `<span>` tags | Requires preserving DOM structure        |
| Requires `innerHTML` replacement          | Cannot use `innerHTML` replacement       |
| Requires frequent re-rendering            | Requires minimal DOM manipulation        |
| Works with any DOM structure              | Requires contenteditable to handle edits |

**Why They Can't Coexist**:

1. **Syntax highlighting** needs this HTML structure:

   ```html
   <div class="code-line">
     <span class="keyword">const</span>
     <span class="variable">x</span> = <span class="number">5</span>;
   </div>
   ```

2. **Browser's undo stack** tracks DOM mutations like:

   ```javascript
   // User types "abc"
   Undo Stack: [
     insertText("a") at TextNode#123,
     insertText("b") at TextNode#123,
     insertText("c") at TextNode#123
   ]
   ```

3. **When you do `innerHTML = newHTML`**:
   - TextNode#123 is deleted
   - New DOM nodes created
   - Undo stack still references TextNode#123
   - Ctrl+Z tries to operate on deleted node → fails silently

### 4.2 Why Previous Attempts Failed

**Attempt 1** (Commit 6cd08e7): Use Document methods

- **Goal**: Make Document the source of truth, update DOM from Document
- **Problem**: Document editing methods were never implemented
- **Result**: Incomplete refactoring, code broken

**Attempt 2** (Current): Disable rendering

- **Goal**: Preserve undo/redo by not touching DOM
- **Problem**: Syntax highlighting disabled, empty line issues
- **Result**: Undo works but no syntax highlighting

**Attempt 3** (Delayed rendering):

- **Goal**: Render after typing stops (500ms debounce)
- **Problem**: Still uses innerHTML, still breaks undo stack
- **Result**: Syntax highlighting delayed, undo still broken when it renders

### 4.3 Browser Limitations

**Documented Behavior** (MDN Web Docs):

> "Setting the value of `innerHTML` removes all of the element's descendants and replaces them with nodes constructed by parsing the HTML given in the string htmlString. This means any event listeners and references to those nodes are lost."

**Undo Stack Implications**:

- Browser's undo stack is internal and not accessible via JavaScript
- No API to "preserve" or "restore" the undo stack
- Once innerHTML is set, the undo stack for that contenteditable is cleared
- This is by design - browser doesn't know how to undo to deleted nodes

### 4.4 Why execCommand Alone Isn't Enough

**Current Pattern**:

```javascript
execCommand('insertText', false, '  '); // Tab key
// ← Adds to undo stack ✅
// ← But then we render...
setTimeout(() => {
  this.content_el.innerHTML = syntaxHighlightedHTML;
  // ← Clears undo stack ❌
}, 500);
```

**The Problem**:

- execCommand preserves undo for the CURRENT DOM
- But when we replace the DOM, that undo history is lost
- Timing doesn't matter - even 500ms delay doesn't help

---

## 5. Conclusions

### 5.1 Why We Need a Custom Solution

**The Incompatibility is Fundamental**:

- Browser's native undo/redo **cannot coexist** with innerHTML-based syntax highlighting
- No amount of clever timing, debouncing, or partial updates can fix this
- We must choose: native undo OR innerHTML-based syntax highlighting

**We Can't Have Both Native Undo AND Syntax Highlighting**

### 5.2 Available Options

| Option                                       | Native Undo | Syntax Highlighting | Complexity | Performance |
| -------------------------------------------- | ----------- | ------------------- | ---------- | ----------- |
| **Option 1**: Character-by-character tagging | ✅          | ✅                  | Very High  | Poor        |
| **Option 2**: Custom HistoryService          | ✅          | ✅                  | Medium     | Good        |
| **Option 3**: Two-layer architecture         | ✅          | ✅                  | High       | Excellent   |
| **Option 4**: Delayed rendering only         | ✅          | ⚠️ Delayed          | Low        | Good        |

### 5.3 Why Option 2 (HistoryService) is Best

**Advantages**:

1. ✅ Works with current architecture (minimal structural changes)
2. ✅ Allows real-time syntax highlighting
3. ✅ Full control over undo/redo behavior
4. ✅ Can extend functionality (undo cursor position, selections, etc.)
5. ✅ Can implement smart merging (multiple chars = one undo)
6. ✅ Proven approach (used by CodeMirror, Ace Editor)

**Implementation Feasibility**:

- Document model already exists - just needs editing methods
- Can record snapshots of `{content, cursor, selection}`
- HistoryService manages stack of snapshots
- On undo/redo: restore snapshot → trigger render
- Keyboard shortcuts via existing KeyBindingManager

**Complexity**:

- Medium - about 200-300 lines of new code
- Well-defined interfaces
- Clear separation of concerns

### 5.4 Next Steps

1. **Design HistoryService** - Architecture and interfaces
2. **Extend Document Model** - Add insertText, deleteText, replaceRange methods
3. **Implement HistoryService** - Snapshot management, undo/redo logic
4. **Refactor EditorPane** - Use Document methods, integrate HistoryService
5. **Enable Rendering** - Uncomment line 217, enable syntax highlighting
6. **Add Keyboard Shortcuts** - Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z

---

## Appendix: Code References

### Key Files

- `src/views/components/EditorPane.js` - Main editor implementation
- `src/models/Document.js` - Document model (needs extension)
- `src/views/renderers/SyntaxRenderer.js` - Syntax highlighting
- `src/utils/KeyBindingManager.js` - Keyboard shortcuts

### Critical Lines in EditorPane.js

- Line 70: Input event handler
- Line 137: `#updateDocumentImmediate()`
- Line 217: **Rendering disabled** (commented out)
- Line 835: `innerHTML` replacement (in `#renderContent()`)
- Line 1007: `getCursorPosition()`
- Line 231: `#restoreCursorPosition()`

### Git Commit History

- `efba3be` - fix: tab 버튼 indent 오류 수정
- `27abdf2` - fix: line number 와 line 미일치 오류 수정
- `6cd08e7` - chore: Editor 에 Document 요소 활용
- `a3f20b8` - fix: 괄호 버그 수정 및 자동완성 가용성 확재
- `35e9e14` - feat: completion bug fix - 1

---

**End of Analysis Document**
