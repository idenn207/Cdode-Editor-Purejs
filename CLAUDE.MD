# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A VSCode-like web-based code editor built with **pure JavaScript** (no Node.js, no build tools). The editor runs entirely in the browser using HTML5 APIs.

**Tech Stack:**

- Pure JavaScript (ES6 modules)
- HTML5 (no framework)
- CSS (no preprocessor)
- Browser File System Access API

**Supported Languages:** JavaScript, HTML, CSS, Markdown

## Running the Application

Since this is a browser-based application with no build process:

1. **Start a local server** (required due to CORS and ES module restrictions):

   ```bash
   # Python 3
   python -m http.server 8000

   # Python 2
   python -m SimpleHTTPServer 8000

   # Node.js (if available)
   npx serve
   ```

2. **Open in browser**: Navigate to `http://localhost:8000/index.html`

3. **Testing**: Manual testing only - no test framework configured

## Architecture

### Core Pattern: MVC + Observer

The application follows an event-driven MVC architecture with the Observer pattern for component communication:

```
Application (src/app.js)
    ↓
┌─────────────┬─────────────┬─────────────┐
│ Controllers │  Services   │    Views    │
├─────────────┼─────────────┼─────────────┤
│ - Editor    │ - FileSystem│ - Sidebar   │
│ - File      │ - Completion│ - EditorPane│
│ - Tab       │ - Language  │ - TabBar    │
│             │ - Search    │ - Panels    │
└─────────────┴─────────────┴─────────────┘
         ↓           ↓            ↓
    EventEmitter (Observer Pattern)
```

### Component Communication

All components extend `EventEmitter` (src/utils/EventEmitter.js) for loose coupling:

- **Controllers** orchestrate business logic and coordinate between services and views
- **Services** provide specialized functionality (file system, parsing, completion)
- **Views** handle rendering and user interaction
- **Models** represent data (Document, FileNode)

Events are connected in `src/app.js#connectEvents()` - this is the **central wiring** of the application.

### Key Components

**Application Initialization** (`src/app.js`):

- Entry point that wires all components together
- Initializes services → controllers → views in order
- Connects event listeners between components
- Sets up keyboard shortcuts via KeyBindingManager

**EditorController** (`src/controllers/EditorController.js`):

- Central orchestrator for editor functionality
- Manages current document state and editor pane
- Coordinates search, auto-completion, and save operations
- Bridge between TabController and EditorPane

**Document Model** (`src/models/Document.js`):

- Stores file content as array of lines (`lines` array)
- Tracks cursor position, selection, and dirty state
- **Critical**: Does NOT use Rope data structure despite comments elsewhere - uses simple line array
- Notifies listeners on changes via `_notifyChange()`

**VirtualScroller** (`src/views/renderers/VirtualScroller.js`):

- Performance optimization for large files
- Only renders visible lines + buffer
- Uses throttled scroll events (16ms = ~60fps)

**SyntaxRenderer** (`src/views/renderers/SyntaxRenderer.js`):

- Token-based syntax highlighting
- Language-specific rendering via TokenParser

**CompletionService** (`src/services/CompletionService.js`):

- Context-aware auto-completion
- Supports `this.`, `object.`, and general completions
- Parses document to extract symbols (functions, classes, variables)
- Language-specific keyword and snippet completion

## Project Structure

```
index.html                 # Entry point
src/
├── app.js                 # Application initialization and wiring
├── controllers/           # Business logic orchestration
│   ├── EditorController.js   # Editor operations coordinator
│   ├── FileController.js     # File operations
│   └── TabController.js      # Tab/document management
├── services/              # Specialized functionality
│   ├── FileSystemService.js  # Browser File System API wrapper
│   ├── CompletionService.js  # Auto-completion logic
│   ├── LanguageService.js    # Language detection
│   └── SearchService.js      # Find/replace functionality
├── views/                 # UI components
│   ├── components/           # Interactive UI elements
│   │   ├── EditorPane.js        # Main editor area
│   │   ├── Sidebar.js           # File tree
│   │   ├── TabBar.js            # Tab management UI
│   │   ├── SearchPanel.js       # Find/replace panel
│   │   └── CompletionPanel.js   # Auto-complete dropdown
│   └── renderers/            # Rendering engines
│       ├── VirtualScroller.js   # Virtual scrolling
│       └── SyntaxRenderer.js    # Syntax highlighting
├── models/                # Data structures
│   ├── Document.js           # File content & cursor state
│   └── FileNode.js           # File tree node
├── utils/                 # Shared utilities
│   ├── EventEmitter.js       # Observer pattern implementation
│   ├── KeyBindingManager.js  # Keyboard shortcuts
│   ├── TokenParser.js        # Lexical analysis for syntax
│   └── Debounce.js          # Performance utilities
├── constants/             # Static data
│   ├── Languages.js          # Language definitions
│   └── Themes.js             # Color themes
└── styles/                # CSS files (loaded dynamically)
```

## Code Conventions

**CRITICAL - Follow these strictly:**

### Naming Conventions

- Variables/Functions: `camelCase`
- Classes: `PascalCase`
- Class Fields: `snake_case`
- Private Fields: `_snake_case` (prefix with underscore)
- Private Methods: `#camelCase` (JavaScript private)
- Parameters: `_camelCase` (prefix with underscore)
- Constants: `SCREAMING_SNAKE_CASE`
- HTML id: `PascalCase`
- HTML class: `kebab-case`

### Code Style

- **File headers**: Every file must have a comment with path, purpose, and responsibility
- **Imports**: Use ES6 `import/export` pattern
- **Exports**: Use `export default` for main class/function
- **Object access**: Use dot notation `object.property` not bracket notation
- **Enums**: Use string union pattern `const TYPE = 'foo' | 'bar'`
- **Initialization**: Use object pattern, not array pattern:

  ```javascript
  // CORRECT
  const systems = { foo: null, bar: null };
  systems.foo = new FooSystem();

  // WRONG
  const systems = [];
  systems.push(new FooSystem());
  ```

### Design Patterns Used

- **Observer Pattern**: EventEmitter for component communication
- **Command Pattern**: KeyBindingManager for keyboard shortcuts
- **Strategy Pattern**: Different renderers for different languages
- **Virtual DOM Pattern**: VirtualScroller for performance

## Common Tasks

### Adding a New Language

1. Add language constant in `src/constants/Languages.js`
2. Add token patterns in `src/utils/TokenParser.js#getTokenPatterns()`
3. Add keywords in `src/services/CompletionService.js#initializeKeywords()`
4. Add file extension mapping in `src/services/LanguageService.js#detectLanguage()`

### Adding a New Keyboard Shortcut

Add to `src/app.js#setupKeyBindings()`:

```javascript
this.keyBindings.register('ctrl+key', () => {
  // action
});
```

### Debugging Event Flow

1. Check `src/app.js#connectEvents()` for event wiring
2. Add console.log in EventEmitter.emit() to trace all events
3. Events follow pattern: `component.emit('event-name', data)` → `other.on('event-name', handler)`

### Working with Documents

- Documents are managed by TabController (`src/controllers/TabController.js`)
- Content is stored as line array in Document model (`document.lines`)
- Changes trigger `content-changed` event to EditorController
- Dirty state (`is_dirty`) tracks unsaved changes

## Important Notes

- **No build process**: Changes are immediately visible on browser refresh
- **CORS restrictions**: Must run from local server, not `file://`
- **Browser compatibility**: Requires File System Access API (Chromium-based browsers)
- **Performance**: VirtualScroller handles files up to ~10k lines efficiently
- **State management**: No global state - all state in controllers/models
- **CSS loading**: Styles loaded dynamically in `app.js#loadStyles()`

## Reference Documentation

Detailed implementation decisions and design rationale are in:

- `project-decisions-1.md` through `project-decisions-5.md`
- `project-decisions-5-bug-fix-1.md` (recent completion feature fixes)
