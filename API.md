# CodeEditor API Documentation

## 목차

1. [애플리케이션](#애플리케이션)
2. [Controllers](#controllers)
3. [Services](#services)
4. [Models](#models)
5. [Views](#views)
6. [이벤트](#이벤트)

---

## 애플리케이션

### CodeEditorApp

메인 애플리케이션 클래스

#### 생성자

```javascript
const app = new CodeEditorApp();
```

#### 메서드

##### `initialize(): Promise<void>`

모든 서비스, 컨트롤러, 뷰를 초기화합니다.

```javascript
await app.initialize();
```

##### `start(): Promise<void>`

애플리케이션을 시작하고 디렉토리 선택 프롬프트를 표시합니다.

```javascript
await app.start();
```

**조건:** `initialize()`가 먼저 호출되어야 합니다.

##### `stop(): void`

애플리케이션을 정지합니다. 수정된 파일이 있으면 확인 프롬프트를 표시합니다.

```javascript
app.stop();
```

##### `destroy(): void`

애플리케이션을 종료하고 모든 리소스를 해제합니다.

```javascript
app.destroy();
```

##### `getDebugInfo(): Object`

디버그 정보를 반환합니다.

```javascript
const info = app.getDebugInfo();
console.log(info);
// {
//   is_initialized: true,
//   is_running: true,
//   active_document: 'test.js',
//   document_count: 3,
//   dirty_count: 1
// }
```

---

## Controllers

### EditorController

텍스트 편집 관련 작업을 관리합니다.

#### 생성자

```javascript
const editorController = new EditorController(_tabController, _fileSystemService);
```

#### 메서드

##### `setEditorPane(_editorPane): void`

EditorPane을 설정합니다.

```javascript
editorController.setEditorPane(editorPane);
```

##### `displayDocument(_document): void`

Document를 화면에 표시합니다.

```javascript
editorController.displayDocument(document);
```

##### `saveCurrentDocument(): Promise<void>`

현재 활성 Document를 저장합니다.

```javascript
await editorController.saveCurrentDocument();
```

##### `saveAllDocuments(): Promise<void>`

모든 수정된 Document를 저장합니다.

```javascript
await editorController.saveAllDocuments();
```

#### 이벤트

- `document-displayed`: Document가 표시될 때 발생
- `document-saved`: Document가 저장될 때 발생

---

### FileController

파일 시스템 작업을 관리합니다.

#### 생성자

```javascript
const fileController = new FileController(_fileSystemService);
```

#### 메서드

##### `selectDirectory(): Promise<void>`

디렉토리 선택 다이얼로그를 표시합니다.

```javascript
await fileController.selectDirectory();
```

##### `openFile(_fileNode): Promise<void>`

파일을 엽니다.

```javascript
await fileController.openFile(fileNode);
```

**파라미터:**

- `_fileNode` (FileNode): 열 파일 노드

##### `saveFile(_fileNode, _content): Promise<void>`

파일을 저장합니다.

```javascript
await fileController.saveFile(fileNode, content);
```

**파라미터:**

- `_fileNode` (FileNode): 저장할 파일 노드
- `_content` (string): 저장할 내용

##### `createFile(_parentNode, _fileName): Promise<FileNode>`

새 파일을 생성합니다.

```javascript
const newFile = await fileController.createFile(parentNode, 'new-file.js');
```

##### `deleteFile(_fileNode): Promise<void>`

파일을 삭제합니다.

```javascript
await fileController.deleteFile(fileNode);
```

##### `renameFile(_fileNode, _newName): Promise<void>`

파일 이름을 변경합니다.

```javascript
await fileController.renameFile(fileNode, 'renamed.js');
```

#### 이벤트

- `directory-selected`: 디렉토리가 선택될 때 발생
- `file-opened`: 파일이 열릴 때 발생
- `file-saved`: 파일이 저장될 때 발생

---

### TabController

탭 및 Document 관리를 담당합니다.

#### 생성자

```javascript
const tabController = new TabController();
```

#### 메서드

##### `openDocument(_fileNode, _content): Document`

새 Document를 열거나 기존 Document를 반환합니다.

```javascript
const document = tabController.openDocument(fileNode, content);
```

**파라미터:**

- `_fileNode` (FileNode): 파일 노드
- `_content` (string): 파일 내용

**반환:** Document 인스턴스

##### `activateDocument(_document): void`

Document를 활성화합니다.

```javascript
tabController.activateDocument(document);
```

##### `closeDocument(_document): void`

Document를 닫습니다. Dirty 상태면 확인 프롬프트를 표시합니다.

```javascript
tabController.closeDocument(document);
```

##### `closeAllDocuments(): void`

모든 Document를 닫습니다.

```javascript
tabController.closeAllDocuments();
```

##### `getActiveDocument(): Document | null`

현재 활성 Document를 반환합니다.

```javascript
const activeDoc = tabController.getActiveDocument();
```

##### `getAllDocuments(): Document[]`

모든 Document 배열을 반환합니다.

```javascript
const docs = tabController.getAllDocuments();
```

##### `getDirtyDocuments(): Document[]`

수정된 Document 배열을 반환합니다.

```javascript
const dirtyDocs = tabController.getDirtyDocuments();
```

##### `findDocumentByFileNode(_fileNode): Document | null`

FileNode로 Document를 찾습니다.

```javascript
const doc = tabController.findDocumentByFileNode(fileNode);
```

#### 이벤트

- `document-opened`: Document가 열릴 때 발생
- `document-activated`: Document가 활성화될 때 발생
- `document-closed`: Document가 닫힐 때 발생
- `document-changed`: Document 내용이 변경될 때 발생

---

## Services

### FileSystemService

파일 시스템 API와 상호작용합니다.

#### 메서드

##### `selectDirectory(): Promise<FileSystemDirectoryHandle>`

디렉토리 선택 다이얼로그를 표시합니다.

```javascript
const dirHandle = await fileSystemService.selectDirectory();
```

##### `readFile(_handle): Promise<string>`

파일 내용을 읽습니다.

```javascript
const content = await fileSystemService.readFile(fileHandle);
```

##### `writeFile(_handle, _content): Promise<void>`

파일에 내용을 씁니다.

```javascript
await fileSystemService.writeFile(fileHandle, content);
```

---

### CompletionService

자동완성 제안을 제공합니다.

#### 메서드

##### `getCompletions(_document, _line, _column, _language): CompletionItem[]`

자동완성 항목을 반환합니다.

```javascript
const completions = completionService.getCompletions(document, 0, 10, 'javascript');
```

**파라미터:**

- `_document` (Document): 대상 문서
- `_line` (number): 줄 번호
- `_column` (number): 열 번호
- `_language` (string): 언어 ID

**반환:** CompletionItem 배열

```javascript
[
  {
    label: 'console',
    kind: 'keyword',
    insertText: 'console',
    detail: 'JavaScript keyword',
  },
];
```

---

### LinterService

코드 검증을 수행합니다.

#### 메서드

##### `lint(_document, _language): LintError[]`

코드를 검증하고 오류 목록을 반환합니다.

```javascript
const errors = linterService.lint(document, 'javascript');
```

**반환:** LintError 배열

```javascript
[
  {
    line: 0,
    column: 10,
    message: 'Unexpected token',
    severity: 'error',
    rule: 'syntax-error',
  },
];
```

---

### SearchService

텍스트 검색 및 바꾸기를 수행합니다.

#### 메서드

##### `search(_document, _query, _options): SearchResult[]`

텍스트를 검색합니다.

```javascript
const results = searchService.search(document, 'console', {
  case_sensitive: false,
  whole_word: false,
  regex: false,
});
```

**옵션:**

- `case_sensitive` (boolean): 대소문자 구분
- `whole_word` (boolean): 전체 단어 매칭
- `regex` (boolean): 정규식 사용

**반환:** SearchResult 배열

```javascript
[
  {
    line: 0,
    column: 0,
    length: 7,
    match: 'console',
  },
];
```

##### `replace(_document, _query, _replacement, _options): number`

텍스트를 바꿉니다.

```javascript
const count = searchService.replace(document, 'var', 'let', options);
```

**반환:** 바뀐 항목 수

---

## Models

### Document

파일 내용을 나타냅니다.

#### 생성자

```javascript
const document = new Document(_fileNode, _content);
```

#### 메서드

##### `getContent(): string`

전체 내용을 반환합니다.

```javascript
const content = document.getContent();
```

##### `setContent(_content): void`

내용을 설정합니다.

```javascript
document.setContent('new content');
```

##### `getLine(_lineNumber): string`

특정 줄을 반환합니다.

```javascript
const line = document.getLine(0);
```

##### `getLineCount(): number`

전체 줄 수를 반환합니다.

```javascript
const count = document.getLineCount();
```

##### `isDirty(): boolean`

수정 여부를 반환합니다.

```javascript
if (document.isDirty()) {
  // 저장 필요
}
```

##### `markAsSaved(): void`

저장됨으로 표시합니다.

```javascript
document.markAsSaved();
```

---

### FileNode

파일 트리의 노드를 나타냅니다.

#### 생성자

```javascript
const node = new FileNode(_name, _type, _parent);
```

**파라미터:**

- `_name` (string): 파일/디렉토리 이름
- `_type` ('file' | 'directory'): 노드 타입
- `_parent` (FileNode | null): 부모 노드

#### 메서드

##### `getName(): string`

노드 이름을 반환합니다.

```javascript
const name = node.getName();
```

##### `getPath(): string`

전체 경로를 반환합니다.

```javascript
const path = node.getPath(); // '/root/src/app.js'
```

##### `isDirectory(): boolean`

디렉토리 여부를 반환합니다.

```javascript
if (node.isDirectory()) {
  // 디렉토리 처리
}
```

##### `getChildren(): FileNode[]`

자식 노드 배열을 반환합니다.

```javascript
const children = node.getChildren();
```

##### `addChild(_child): void`

자식 노드를 추가합니다.

```javascript
node.addChild(childNode);
```

---

## Views

### EditorPane

텍스트 편집기 뷰입니다.

#### 메서드

##### `setDocument(_document): void`

Document를 설정하고 표시합니다.

```javascript
editorPane.setDocument(document);
```

##### `clear(): void`

에디터를 비웁니다.

```javascript
editorPane.clear();
```

##### `getCursorPosition(): {line: number, column: number}`

현재 커서 위치를 반환합니다.

```javascript
const pos = editorPane.getCursorPosition();
```

---

### Sidebar

파일 트리를 표시합니다.

#### 메서드

##### `setRootNode(_rootNode): void`

루트 노드를 설정합니다.

```javascript
sidebar.setRootNode(rootNode);
```

##### `expandAll(): void`

모든 디렉토리를 펼칩니다.

```javascript
sidebar.expandAll();
```

##### `collapseAll(): void`

모든 디렉토리를 접습니다.

```javascript
sidebar.collapseAll();
```

---

### TabBar

열린 Document 탭을 표시합니다.

#### 메서드

##### `addTab(_document): void`

탭을 추가합니다.

```javascript
tabBar.addTab(document);
```

##### `removeTab(_document): void`

탭을 제거합니다.

```javascript
tabBar.removeTab(document);
```

##### `setActiveTab(_document): void`

활성 탭을 설정합니다.

```javascript
tabBar.setActiveTab(document);
```

---

## 이벤트

### 이벤트 구독

```javascript
component.on('event-name', (_event) => {
  // 이벤트 처리
});
```

### 이벤트 발행

```javascript
component.emit('event-name', { data: 'value' });
```

### 주요 이벤트 흐름

```
사용자 액션
  ↓
View (이벤트 발행)
  ↓
Controller (처리)
  ↓
Service (비즈니스 로직)
  ↓
Model (데이터 변경)
  ↓
Controller (이벤트 발행)
  ↓
View (UI 업데이트)
```

---

## 예제

### 1. 기본 사용

```javascript
const app = new CodeEditorApp();

await app.initialize();
await app.start(); // 디렉토리 선택 프롬프트
```

### 2. 파일 열기

```javascript
// FileController를 통한 파일 열기
await app.controllers.file.openFile(fileNode);

// 또는 이벤트 발행
app.controllers.file.emit('file-opened', {
  file_node: fileNode,
  content: 'file content',
});
```

### 3. Document 편집

```javascript
const doc = app.controllers.tab.getActiveDocument();
doc.setContent('new content');
```

### 4. 저장

```javascript
await app.controllers.editor.saveCurrentDocument();
```

### 5. 검색

```javascript
const results = app.services.search.search(document, 'function', {
  case_sensitive: false,
  regex: false,
});
```

---

## 타입 정의

### CompletionItem

```typescript
interface CompletionItem {
  label: string; // 표시 텍스트
  kind: string; // 'keyword' | 'function' | 'variable' | ...
  insertText: string; // 삽입할 텍스트
  detail?: string; // 상세 설명
}
```

### SearchResult

```typescript
interface SearchResult {
  line: number; // 줄 번호
  column: number; // 열 번호
  length: number; // 매칭 길이
  match: string; // 매칭된 텍스트
}
```

### LintError

```typescript
interface LintError {
  line: number; // 줄 번호
  column: number; // 열 번호
  message: string; // 오류 메시지
  severity: 'error' | 'warning'; // 심각도
  rule: string; // 규칙 ID
}
```

---

## 라이센스

MIT License
