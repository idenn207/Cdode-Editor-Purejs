# Web Code Editor - Phase 2 구현 문서

## Phase 2 개요

Phase 2에서는 실제 텍스트 편집 기능을 구현했습니다. 파일을 열어 내용을 표시하고, 편집하고, 저장할 수 있는 완전한 에디터를 만들었습니다.

---

## Phase 2 구현 목표

✅ **완료된 기능**

- Document 모델 (텍스트 데이터 관리)
- EditorPane 컴포넌트 (텍스트 표시/편집)
- TabBar 컴포넌트 (열린 파일 탭 관리)
- TabController (탭 상태 관리)
- EditorController (편집 로직 관리)
- 기본 텍스트 렌더링
- 커서 및 선택 영역
- 파일 저장 (Ctrl+S)
- 탭 닫기 (수정 확인)
- 수정 표시 (●)

---

## 1. Document 모델

### 파일 위치

`src/models/Document.js`

### 책임

파일의 텍스트 데이터와 편집 상태를 관리합니다.

### 주요 필드

```javascript
{
  file_node: FileNode,        // 연결된 파일 노드
  content: string,            // 전체 텍스트 내용
  lines: string[],            // 줄 단위 배열
  cursor: {                   // 커서 위치
    line: number,
    column: number
  },
  selection: {                // 선택 영역
    start: { line, column },
    end: { line, column }
  },
  is_dirty: boolean,          // 수정 여부
  change_listeners: Function[] // 변경 감지 리스너
}
```

### 주요 메서드

#### getText()

전체 텍스트를 하나의 문자열로 반환합니다.

```javascript
getText() {
  return this.lines.join('\n');
}
```

#### getLine(lineNumber)

특정 줄의 텍스트를 반환합니다.

#### insertText(line, column, text)

지정된 위치에 텍스트를 삽입합니다. 여러 줄 입력도 처리합니다.

**동작:**

1. 현재 줄을 커서 위치에서 분할
2. 삽입할 텍스트를 줄 단위로 분리
3. 줄 배열에 삽입
4. 커서 위치 업데이트
5. is_dirty = true 설정
6. 변경 리스너 호출

#### deleteText(startLine, startCol, endLine, endCol)

지정된 범위의 텍스트를 삭제합니다.

#### moveCursor(line, column)

커서를 지정된 위치로 이동합니다. 범위 검증을 수행합니다.

#### setSelection() / clearSelection()

선택 영역을 설정하거나 해제합니다.

#### onChange(listener)

Document 변경 시 호출될 리스너를 등록합니다.

### 설계 결정

**왜 줄 단위 배열로 관리하는가?**

- 대부분의 편집 작업은 줄 단위로 이루어짐
- 줄 번호 표시가 용이
- 특정 줄만 재렌더링 가능 (성능 최적화)
- 향후 Virtual Scrolling 구현 용이

**왜 is_dirty 플래그가 필요한가?**

- 저장되지 않은 변경사항 추적
- 탭에 수정 표시 (●)
- 탭 닫기 시 확인 다이얼로그 표시

---

## 2. EditorPane 컴포넌트

### 파일 위치

`src/views/components/EditorPane.js`

### 책임

텍스트를 표시하고 편집할 수 있는 UI를 제공합니다.

### HTML 구조

```html
<div class="editor-pane">
  <div class="line-numbers">
    <div class="line-number">1</div>
    <div class="line-number">2</div>
    ...
  </div>
  <div class="editor-content" contenteditable="true" spellcheck="false">
    <div class="code-line">코드 내용...</div>
    <div class="code-line">코드 내용...</div>
    ...
  </div>
</div>
```

### 주요 메서드

#### setDocument(document)

Document 모델을 연결하고 렌더링합니다.

```javascript
setDocument(document) {
  this.document = document;

  if (document) {
    this.#render();

    // 문서 변경 감지
    document.onChange(() => {
      this.#render();
    });
  } else {
    this.#renderEmpty();
  }
}
```

#### #render()

텍스트와 줄 번호를 화면에 렌더링합니다.

#### #renderLineNumbers()

줄 번호를 렌더링합니다.

```javascript
#renderLineNumbers() {
  const lineCount = this.document.getLineCount();
  let html = '';

  for (let i = 0; i < lineCount; i++) {
    html += `<div class="line-number">${i + 1}</div>`;
  }

  this.line_numbers_el.innerHTML = html;
}
```

#### #renderContent()

텍스트 내용을 렌더링합니다.

```javascript
#renderContent() {
  const lines = this.document.lines;
  let html = '';

  lines.forEach((line) => {
    const displayLine = line || '\n';
    html += `<div class="code-line">${this.#escapeHtml(displayLine)}</div>`;
  });

  this.content_el.innerHTML = html;
  this.content_el.contentEditable = 'true';
  this.content_el.focus();
}
```

#### #handleInput(e)

사용자 입력을 처리하고 Document에 동기화합니다.

```javascript
#handleInput(e) {
  if (!this.document) return;

  // contentEditable의 내용을 Document에 동기화
  const text = this.content_el.innerText;
  this.document.content = text;
  this.document.lines = text.split('\n');
  this.document.is_dirty = true;

  this.emit('content-changed', {
    document: this.document,
    text: text
  });
}
```

#### #handleKeyDown(e)

특수 키를 처리합니다.

**Tab 키:**

```javascript
if (e.key === 'Tab') {
  e.preventDefault();
  document.execCommand('insertText', false, '  '); // 2칸 들여쓰기
  return;
}
```

**Ctrl+S:**

```javascript
if (e.ctrlKey && e.key === 's') {
  e.preventDefault();
  this.emit('save-requested', this.document);
  return;
}
```

### 발행 이벤트

- **'content-changed'**: 텍스트 변경 시
- **'save-requested'**: Ctrl+S 입력 시
- **'cursor-moved'**: 커서 이동 시
- **'focus'**: 에디터 포커스 시

### 설계 결정

**왜 contenteditable을 사용하는가?**

- 브라우저의 기본 텍스트 편집 기능 활용
- 키보드 입력, 복사/붙여넣기, 실행 취소 자동 지원
- 접근성 (스크린 리더) 자동 지원
- 구현 복잡도 감소

**단점:**

- 커서 위치 복원 어려움
- DOM 구조 제어 제한
- 성능 최적화 제한

**왜 줄 번호를 별도 div로 분리하는가?**

- 스크롤 동기화
- 선택 불가능하게 설정 (user-select: none)
- 독립적인 스타일링

---

## 3. TabBar 컴포넌트

### 파일 위치

`src/views/components/TabBar.js`

### 책임

열린 파일들을 탭으로 표시하고 관리합니다.

### 주요 필드

```javascript
{
  container: HTMLElement,     // TabBar 컨테이너
  tabs: Array<{              // 탭 목록
    document: Document,
    element: HTMLElement
  }>,
  active_tab: Document       // 활성 탭
}
```

### 주요 메서드

#### addTab(document)

새 탭을 추가합니다. 이미 존재하면 활성화만 합니다.

```javascript
addTab(document) {
  // 중복 확인
  const existing = this.tabs.find(tab => tab.document === document);
  if (existing) {
    this.setActiveTab(document);
    return;
  }

  // 새 탭 생성
  const tab = { document, element: null };
  this.tabs.push(tab);
  this.#renderTabs();
  this.setActiveTab(document);
}
```

#### removeTab(document)

탭을 제거합니다. 활성 탭이 제거되면 다른 탭을 활성화합니다.

```javascript
removeTab(document) {
  const index = this.tabs.findIndex(tab => tab.document === document);
  if (index === -1) return;

  const wasActive = this.active_tab === document;
  this.tabs.splice(index, 1);

  if (wasActive && this.tabs.length > 0) {
    const newIndex = Math.min(index, this.tabs.length - 1);
    this.setActiveTab(this.tabs[newIndex].document);
  } else if (this.tabs.length === 0) {
    this.active_tab = null;
    this.emit('no-tabs');
  }

  this.#renderTabs();
}
```

#### setActiveTab(document)

활성 탭을 변경합니다.

#### #createTabElement(document)

탭 HTML 엘리먼트를 생성합니다.

```javascript
#createTabElement(document) {
  const div = document.createElement('div');
  div.className = 'tab';

  if (document === this.active_tab) {
    div.classList.add('active');
  }

  // 수정 표시
  const dirtyIndicator = document.isDirty() ? '● ' : '';

  // 파일 아이콘
  const icon = this.#getFileIcon(document.file_node);

  div.innerHTML = `
    <span class="tab-icon">${icon}</span>
    <span class="tab-label">${dirtyIndicator}${document.file_node.name}</span>
    <button class="tab-close" aria-label="Close">×</button>
  `;

  // 이벤트 리스너 연결...

  return div;
}
```

### 탭 구조

```
┌─────────────────────────┐
│ 📜 ● app.js        ×    │ ← 수정됨
├─────────────────────────┤
│ 🌐 index.html      ×    │ ← 저장됨
├─────────────────────────┤
│ 🎨 main.css        ×    │ ← 활성 탭 (강조)
└─────────────────────────┘
```

### 발행 이벤트

- **'tab-activated'**: 탭 클릭 시
- **'tab-close-requested'**: × 버튼 클릭 시
- **'no-tabs'**: 모든 탭 닫힌 경우

### 설계 결정

**왜 tabs 배열에 element를 함께 저장하는가?**

- DOM 조회 최소화 (성능)
- document ↔ element 매핑 유지

**왜 닫기 버튼을 호버 시 표시하는가?**

- VSCode 스타일 일관성
- UI 깔끔함 (평소에는 숨김)

---

## 4. TabController

### 파일 위치

`src/controllers/TabController.js`

### 책임

Document 객체들의 생명주기를 관리합니다.

### 주요 필드

```javascript
{
  documents: Map<string, Document>, // 파일경로 → Document
  active_document: Document          // 현재 활성 Document
}
```

### 주요 메서드

#### openDocument(fileNode, content)

파일을 열고 Document를 생성합니다.

```javascript
openDocument(fileNode, content) {
  const path = fileNode.getFullPath();

  // 중복 확인
  if (this.documents.has(path)) {
    const doc = this.documents.get(path);
    this.activateDocument(doc);
    return doc;
  }

  // 새 Document 생성
  const doc = new Document(fileNode, content);
  this.documents.set(path, doc);

  // Document 변경 감지
  doc.onChange((changedDoc) => {
    this.emit('document-changed', changedDoc);
  });

  this.activateDocument(doc);
  this.emit('document-opened', doc);

  return doc;
}
```

#### activateDocument(document)

Document를 활성화합니다.

#### closeDocument(document)

Document를 닫습니다. 수정된 경우 확인합니다.

```javascript
closeDocument(document) {
  // 수정된 문서는 확인 필요
  if (document.isDirty()) {
    const confirmed = confirm(
      `${document.file_node.name} 파일이 수정되었습니다. ` +
      `저장하지 않고 닫으시겠습니까?`
    );
    if (!confirmed) {
      return false;
    }
  }

  const path = document.file_node.getFullPath();
  this.documents.delete(path);

  if (this.active_document === document) {
    this.active_document = null;
  }

  this.emit('document-closed', document);
  return true;
}
```

### 발행 이벤트

- **'document-opened'**: 새 Document 생성
- **'document-activated'**: Document 활성화
- **'document-changed'**: Document 내용 변경
- **'document-closed'**: Document 닫힘

### 설계 결정

**왜 Map을 사용하는가?**

- 파일 경로를 키로 사용 → 중복 방지
- O(1) 조회 성능
- 명시적인 키-값 관계

**왜 Document.onChange를 TabController에서 처리하는가?**

- Document는 자신의 변경을 모름
- TabController가 모든 Document 관리
- TabBar 업데이트를 위해 변경 감지 필요

---

## 5. EditorController

### 파일 위치

`src/controllers/EditorController.js`

### 책임

편집 관련 전체 로직을 조율합니다.

### 주요 필드

```javascript
{
  tabController: TabController,
  fileSystemService: FileSystemService,
  editorPane: EditorPane,
  current_document: Document
}
```

### 주요 메서드

#### setEditorPane(editorPane)

EditorPane을 연결하고 이벤트를 설정합니다.

```javascript
setEditorPane(editorPane) {
  this.editorPane = editorPane;

  // EditorPane 이벤트 연결
  this.editorPane.on('content-changed', ({ document }) => {
    this.emit('content-changed', document);
  });

  this.editorPane.on('save-requested', (document) => {
    this.saveDocument(document);
  });
}
```

#### displayDocument(document)

Document를 EditorPane에 표시합니다.

```javascript
displayDocument(document) {
  this.current_document = document;

  if (this.editorPane) {
    this.editorPane.setDocument(document);
  }

  this.emit('document-displayed', document);
}
```

#### saveDocument(document)

Document를 파일에 저장합니다.

```javascript
async saveDocument(document) {
  if (!document) return;

  try {
    const content = document.getText();
    await this.fileSystemService.writeFile(document.file_node, content);

    document.markAsSaved();

    this.emit('document-saved', document);
    this.emit('status-message', `${document.file_node.name} 저장됨`);

  } catch (error) {
    console.error('저장 실패:', error);
    this.emit('error', {
      message: `저장 실패: ${document.file_node.name}`,
      error
    });
  }
}
```

### 발행 이벤트

- **'document-displayed'**: Document 표시
- **'document-saved'**: Document 저장
- **'content-changed'**: 내용 변경
- **'status-message'**: 상태바 메시지
- **'error'**: 오류 발생

### 설계 결정

**왜 EditorController가 필요한가?**

- TabController, FileSystemService, EditorPane를 연결
- SRP(단일 책임 원칙) 준수
- 편집 관련 로직 집중화

**왜 saveDocument를 EditorController에서 처리하는가?**

- Document는 파일 저장 방법을 모름
- FileSystemService 접근 필요
- 저장 후 상태 업데이트 (markAsSaved) 조율

---

## 6. 스타일링

### tabbar.css

```css
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: var(--bg-tertiary);
  border-right: 1px solid var(--border-color);
  cursor: pointer;
  min-width: 120px;
  max-width: 200px;
}

.tab.active {
  background-color: var(--bg-primary);
  border-bottom: 2px solid var(--focus-border);
}

.tab-close {
  opacity: 0;
  transition: opacity 0.1s;
}

.tab:hover .tab-close {
  opacity: 1;
}
```

**설계 결정:**

- 비활성 탭: 어두운 배경
- 활성 탭: 밝은 배경 + 파란색 하단 테두리
- 닫기 버튼: 호버 시에만 표시

### editor.css

```css
.editor-pane {
  display: flex;
  height: 100%;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.line-numbers {
  background-color: var(--bg-primary);
  color: var(--text-secondary);
  padding: 10px 8px;
  text-align: right;
  user-select: none;
  border-right: 1px solid var(--border-color);
  min-width: 50px;
}

.editor-content {
  flex: 1;
  padding: 10px 16px;
  outline: none;
  overflow-y: auto;
  white-space: pre;
  tab-size: 2;
}
```

**설계 결정:**

- 고정폭 폰트 (Consolas 등)
- line-height: 1.6 (가독성)
- tab-size: 2 (2칸 들여쓰기)
- white-space: pre (공백 유지)

---

## 7. app.js 통합

### 초기화 순서

```javascript
async initialize() {
  // 1. Services 초기화
  this.services.fileSystem = new FileSystemService();

  // 2. Controllers 초기화
  this.controllers.file = new FileController(this.services.fileSystem);
  this.controllers.tab = new TabController();
  this.controllers.editor = new EditorController(
    this.controllers.tab,
    this.services.fileSystem
  );

  // 3. Views 초기화
  this.views.sidebar = new Sidebar('Sidebar');
  this.views.tabBar = new TabBar('TabBar');
  this.views.editorPane = new EditorPane('EditorContainer');

  // 4. EditorController에 EditorPane 연결
  this.controllers.editor.setEditorPane(this.views.editorPane);

  // 5. 이벤트 연결
  this.#connectEvents();

  // 6. 스타일 로드
  await this.#loadStyles();
}
```

### 이벤트 연결

#### Sidebar 이벤트

```javascript
// 파일 선택
this.views.sidebar.on('file-selected', async (fileNode) => {
  await this.#openFile(fileNode);
});
```

#### FileController 이벤트

```javascript
// 파일 열림
this.controllers.file.on('file-opened', (data) => {
  const { node, content } = data;
  const document = this.controllers.tab.openDocument(node, content);
  this.views.tabBar.addTab(document);
});
```

#### TabController 이벤트

```javascript
// Document 활성화
this.controllers.tab.on('document-activated', (document) => {
  this.controllers.editor.displayDocument(document);
  this.views.tabBar.setActiveTab(document);
});

// Document 변경
this.controllers.tab.on('document-changed', (document) => {
  this.views.tabBar.updateTab(document);
});

// Document 닫힘
this.controllers.tab.on('document-closed', (document) => {
  this.views.tabBar.removeTab(document);
});
```

#### TabBar 이벤트

```javascript
// 탭 활성화
this.views.tabBar.on('tab-activated', (document) => {
  this.controllers.tab.activateDocument(document);
});

// 탭 닫기 요청
this.views.tabBar.on('tab-close-requested', (document) => {
  this.controllers.tab.closeDocument(document);
});
```

#### EditorController 이벤트

```javascript
// Document 저장됨
this.controllers.editor.on('document-saved', (document) => {
  console.log('저장됨:', document.file_node.name);
  this.views.tabBar.updateTab(document);
});
```

---

## 전체 이벤트 플로우

### 1. 파일 열기

```
[User] Sidebar에서 파일 클릭
    ↓
[Sidebar] 'file-selected' 이벤트 발행
    ↓
[app.js] #openFile() 호출
    ↓
[FileController] openFile() 실행
    ↓
[FileSystemService] readFile() → 파일 내용 읽기
    ↓
[FileController] 'file-opened' 이벤트 발행
    ↓
[app.js] 이벤트 핸들러
    ↓
[TabController] openDocument() → Document 생성
    ↓
[TabBar] addTab() → 탭 UI 추가
    ↓
[TabController] 'document-activated' 이벤트 발행
    ↓
[app.js] 이벤트 핸들러
    ↓
[EditorController] displayDocument()
    ↓
[EditorPane] setDocument() → 텍스트 렌더링
```

### 2. 텍스트 편집

```
[User] 키보드 입력
    ↓
[EditorPane] 'input' 이벤트 처리
    ↓
[EditorPane] #handleInput()
    ↓
[Document] lines 배열 업데이트, is_dirty = true
    ↓
[Document] #notifyChange() 호출
    ↓
[TabController] 'document-changed' 이벤트 수신
    ↓
[app.js] 이벤트 핸들러
    ↓
[TabBar] updateTab() → 탭에 ● 표시
```

### 3. 파일 저장

```
[User] Ctrl+S 입력
    ↓
[EditorPane] #handleKeyDown()
    ↓
[EditorPane] 'save-requested' 이벤트 발행
    ↓
[EditorController] saveDocument()
    ↓
[FileSystemService] writeFile() → 파일에 쓰기
    ↓
[Document] markAsSaved() → is_dirty = false
    ↓
[EditorController] 'document-saved' 이벤트 발행
    ↓
[app.js] 이벤트 핸들러
    ↓
[TabBar] updateTab() → ● 제거
```

### 4. 탭 닫기

```
[User] × 버튼 클릭
    ↓
[TabBar] #createTabElement() 내 이벤트 리스너
    ↓
[TabBar] 'tab-close-requested' 이벤트 발행
    ↓
[app.js] 이벤트 핸들러
    ↓
[TabController] closeDocument()
    ↓
[Document] isDirty() 확인
    ↓ (수정된 경우)
[Browser] confirm() 다이얼로그 표시
    ↓ (확인)
[TabController] documents.delete()
    ↓
[TabController] 'document-closed' 이벤트 발행
    ↓
[app.js] 이벤트 핸들러
    ↓
[TabBar] removeTab() → 탭 제거
```

---

## 주요 기술 결정

### 1. contenteditable 사용

**장점:**

- 브라우저의 기본 텍스트 편집 기능 활용
- 키보드 입력, 선택, 복사/붙여넣기 자동 지원
- 접근성 (스크린 리더 등) 자동 지원
- 구현 복잡도 감소

**단점:**

- 커서 위치 복원 어려움
- DOM 구조 제어 제한
- 성능 최적화 제한
- 크로스 브라우저 일관성 부족

**대안:**

- textarea 사용 (단순하지만 기능 제한)
- 완전 커스텀 렌더링 (복잡하지만 완전한 제어)

**결론:** Phase 2에서는 빠른 구현을 위해 contenteditable 사용. Phase 3에서 Virtual DOM 패턴으로 개선 예정.

### 2. Document 모델 분리

**이유:**

- contenteditable DOM과 데이터 분리 (MVC 패턴)
- 정확한 상태 관리
- 향후 Undo/Redo 구현 용이
- 테스트 용이성

**대안:**

- DOM을 직접 데이터 소스로 사용 (간단하지만 복잡해짐)

**결론:** 데이터와 뷰 분리로 유지보수성 향상.

### 3. Map 기반 Document 관리

**이유:**

- 파일 경로를 키로 사용하여 중복 방지
- O(1) 조회 성능
- 명시적인 키-값 관계
- Set보다 직관적

**대안:**

- Array 사용 (find 필요, O(n))
- Set 사용 (키-값 매핑 어려움)

**결론:** Map이 가장 적합.

### 4. Observer 패턴 (EventEmitter)

**이유:**

- 컴포넌트 간 느슨한 결합
- 확장성 (새 리스너 추가 용이)
- 단방향 데이터 흐름
- 테스트 용이성

**대안:**

- 직접 메서드 호출 (결합도 증가)
- Pub/Sub 라이브러리 (의존성 추가)

**결론:** 자체 EventEmitter로 충분.

### 5. 줄 단위 배열 관리

**이유:**

- 대부분의 편집 작업은 줄 단위
- 줄 번호 표시 용이
- 특정 줄만 재렌더링 가능
- Virtual Scrolling 준비

**대안:**

- 단일 문자열 (간단하지만 성능 문제)
- Rope 구조 (복잡하지만 성능 우수)

**결론:** Phase 2에서는 배열 사용. Phase 3에서 Rope 도입 검토.

---

## 코딩 컨벤션 준수

### 네이밍

```javascript
// Variable, Function, Method: camelCase
const editorPane = new EditorPane();
function handleInput() { }

// Class: PascalCase
class TabController { }

// Field: snake_case
this.file_node = fileNode;

// Private Field: _snake_case
this._events = {};

// Private Method: #camelCase
#renderContent() { }

// Constant: SCREAMING_SNAKE_CASE
const FILE_NODE_TYPE_FILE = 'file';

// HTML id: PascalCase
<div id="EditorContainer"></div>

// HTML class: kebab-case
<div class="editor-pane"></div>
```

### 객체 초기화 패턴

```javascript
// Good ✅
const services = {
  fileSystem: null,
};
services.fileSystem = new FileSystemService();

// Bad ❌
const services = [];
services.push(new FileSystemService());
```

### import/export

```javascript
// export default만 사용
export default class Document {}

// import
import Document from './models/Document.js';
```

---

## 성능 고려사항

### 현재 제한사항

1. **전체 재렌더링**

   - Document 변경 시 모든 줄 재렌더링
   - 대용량 파일(10,000줄 이상) 느림

2. **커서 위치 복원**

   - innerHTML 변경 시 커서 위치 손실
   - 사용자 경험 저하

3. **메모리**
   - 모든 파일을 메모리에 유지
   - 많은 파일 열면 메모리 부족 가능

### Phase 3 개선 계획

1. **Virtual Scrolling**

   - 화면에 보이는 줄만 렌더링
   - 수천 줄 파일도 부드럽게 스크롤

2. **Incremental Rendering**

   - 변경된 줄만 재렌더링
   - DOM 조작 최소화

3. **Rope Data Structure**

   - 대용량 텍스트 효율적 관리
   - 삽입/삭제 O(log n)

4. **Web Worker**
   - 파싱, 하이라이팅을 별도 스레드에서 실행
   - 메인 스레드 차단 방지

---

## 알려진 이슈

### 1. 커서 위치 복원 불완전

**증상:**

- 텍스트 입력 시 커서가 때때로 잘못된 위치로 이동
- 특히 여러 줄 입력 시 발생

**원인:**

- contenteditable의 innerHTML 변경 시 Selection 손실

**해결 방법 (Phase 3):**

- Virtual DOM 패턴 도입
- 변경된 부분만 DOM 업데이트
- Selection API로 정확한 위치 복원

### 2. 대용량 파일 성능

**증상:**

- 10,000줄 이상 파일 편집 시 느려짐
- 스크롤 버벅임

**원인:**

- 모든 줄을 DOM에 렌더링
- 전체 재렌더링

**해결 방법 (Phase 3):**

- Virtual Scrolling 구현
- Incremental Rendering

### 3. 외부 파일 수정 감지 안됨

**증상:**

- 에디터 외부에서 파일 수정 시 감지 못함
- 저장 시 덮어쓰기 가능

**원인:**

- 파일 감시 기능 없음

**해결 방법 (Phase 3):**

- File System Observer API 사용
- 주기적 파일 체크섬 비교

---

## Phase 2 vs Phase 1 비교

| 기능        | Phase 1   | Phase 2   |
| ----------- | --------- | --------- |
| 폴더 열기   | ✅        | ✅        |
| 파일 트리   | ✅        | ✅        |
| 파일 읽기   | ✅        | ✅        |
| 파일 표시   | ❌ 콘솔만 | ✅ 에디터 |
| 텍스트 편집 | ❌        | ✅        |
| 파일 저장   | ❌        | ✅ Ctrl+S |
| 탭 기능     | ❌        | ✅        |
| 수정 표시   | ❌        | ✅ ●      |
| 줄 번호     | ❌        | ✅        |
| 들여쓰기    | ❌        | ✅ Tab 키 |

---

## 다음 단계 (Phase 3)

### 필수 기능

1. **신택스 하이라이팅**

   - ParserService 구현
   - 언어별 토큰 파싱 (JS, HTML, CSS, MD)
   - 색상 적용
   - Themes.js 활용

2. **커서 정확도 개선**

   - Virtual DOM 패턴 도입
   - Selection API 정확한 사용
   - 커서 위치 완벽 복원

3. **성능 최적화**
   - Virtual Scrolling
   - Incremental Rendering
   - Debounce 적용

### 추가 기능

4. **자동완성**

   - 키워드 자동완성
   - 파일 경로 자동완성
   - 스니펫

5. **코드 오류 표시**

   - LinterService
   - 실시간 오류 감지
   - 에러 마커 표시

6. **검색/바꾸기**
   - Ctrl+F: 검색
   - Ctrl+H: 바꾸기
   - 정규식 지원

---

## 테스트 방법

### 1. 기본 기능 테스트

```bash
# 로컬 서버 실행
python -m http.server 8000

# 브라우저 접속
http://localhost:8000
```

### 2. 테스트 시나리오

#### 시나리오 1: 파일 열기

1. 📁 버튼 클릭
2. 테스트 프로젝트 폴더 선택
3. .js 파일 클릭
4. ✅ 에디터에 내용 표시되어야 함
5. ✅ 탭바에 탭 추가되어야 함

#### 시나리오 2: 텍스트 편집

1. 에디터에 텍스트 입력
2. ✅ 즉시 반영되어야 함
3. ✅ 탭에 ● 표시되어야 함

#### 시나리오 3: 파일 저장

1. Ctrl+S 입력
2. ✅ "파일명 저장됨" 콘솔 메시지
3. ✅ 탭에서 ● 제거되어야 함
4. ✅ 실제 파일 변경 확인

#### 시나리오 4: 탭 전환

1. 여러 파일 열기
2. 탭 클릭하여 전환
3. ✅ 각 파일 내용 정확히 표시되어야 함

#### 시나리오 5: 탭 닫기

1. 수정된 파일의 × 버튼 클릭
2. ✅ 확인 다이얼로그 표시되어야 함
3. "취소" 클릭
4. ✅ 탭 유지되어야 함
5. 다시 × 버튼 클릭, "확인" 클릭
6. ✅ 탭 제거되어야 함

#### 시나리오 6: 줄 번호

1. 여러 줄 입력
2. ✅ 왼쪽에 줄 번호 표시되어야 함
3. 스크롤
4. ✅ 줄 번호도 함께 스크롤되어야 함

#### 시나리오 7: Tab 키

1. Tab 키 입력
2. ✅ 2칸 공백 삽입되어야 함
3. ✅ 포커스가 다른 곳으로 이동하지 않아야 함

---

## 파일 구조

```
index.html
src/
├── app.js                          # 애플리케이션 진입점
├── controllers/
│   ├── EditorController.js        # [NEW] 편집 로직 관리
│   ├── FileController.js          # 파일 작업 관리
│   └── TabController.js           # [NEW] 탭 상태 관리
├── models/
│   ├── Document.js                # [NEW] 문서 모델
│   └── FileNode.js                # 파일 트리 노드
├── services/
│   └── FileSystemService.js       # 파일 시스템 접근
├── views/
│   └── components/
│       ├── EditorPane.js          # [NEW] 텍스트 에디터 UI
│       ├── Sidebar.js             # 파일 탐색기
│       └── TabBar.js              # [NEW] 탭바
├── utils/
│   └── EventEmitter.js            # Observer 패턴
└── styles/
    ├── main.css                   # 전역 스타일
    ├── sidebar.css                # 사이드바 스타일
    ├── tabbar.css                 # [NEW] 탭바 스타일
    └── editor.css                 # [NEW] 에디터 스타일
```

**[NEW]**: Phase 2에서 새로 추가된 파일

---

## 총 라인 수

| 파일                | 라인 수  |
| ------------------- | -------- |
| Document.js         | ~180     |
| EditorPane.js       | ~160     |
| TabBar.js           | ~120     |
| TabController.js    | ~100     |
| EditorController.js | ~80      |
| app.js              | ~100     |
| tabbar.css          | ~60      |
| editor.css          | ~50      |
| **Phase 2 합계**    | **~850** |

---

## 참고 자료

- [contenteditable MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable)
- [Selection API](https://developer.mozilla.org/en-US/docs/Web/API/Selection)
- [Range API](https://developer.mozilla.org/en-US/docs/Web/API/Range)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [VSCode Architecture](https://github.com/microsoft/vscode)
- [Observer Pattern](https://refactoring.guru/design-patterns/observer)

---

## 라이선스

MIT License

# Web Code Editor - Phase 2 구현 문서

## 프로젝트 개요

VSCode와 유사한 웹 기반 코드 에디터를 순수 JavaScript로 구현하는 프로젝트의 Phase 2 구현 완료 문서입니다.

### Phase 2 목표

- ✅ Document 모델 구현
- ✅ EditorPane 컴포넌트 (텍스트 편집)
- ✅ TabBar 컴포넌트 (탭 관리)
- ✅ TabController (탭 상태 관리)
- ✅ EditorController (편집 로직)
- ✅ 파일 저장 기능 (Ctrl+S)
- ✅ 탭 닫기 및 수정 표시
- ✅ 무한 루프 버그 수정
- ✅ 매개변수 명명 규칙 통일

---

## Phase 2 구현 내용

### 1. Document 모델 (src/models/Document.js)

**기능:** 편집 중인 파일의 텍스트 데이터 및 상태 관리

**주요 속성:**

```javascript
class Document {
  file_node: FileNode;        // 파일 노드 참조
  content: string;            // 전체 텍스트
  lines: string[];            // 줄 단위 배열
  cursor: {line, column};     // 커서 위치
  selection: Object;          // 선택 영역
  is_dirty: boolean;          // 수정 여부
  change_listeners: Array;    // 변경 리스너
}
```

**주요 메서드:**

- `getText()`: 전체 텍스트 반환
- `getLine(_lineNumber)`: 특정 줄 반환
- `insertText(_line, _column, _text)`: 텍스트 삽입
- `deleteText(_startLine, _startCol, _endLine, _endCol)`: 텍스트 삭제
- `moveCursor(_line, _column)`: 커서 이동
- `setSelection()` / `clearSelection()`: 선택 영역 관리
- `onChange(_listener)`: 변경 리스너 등록
- `markAsSaved()` / `isDirty()`: 저장 상태 관리

**설계 이유:** contenteditable만으로는 텍스트 구조를 정확히 관리하기 어렵기 때문에 별도의 데이터 모델 필요

---

### 2. EditorPane 컴포넌트 (src/views/components/EditorPane.js)

**기능:** 실제 텍스트 편집이 이루어지는 UI 컴포넌트

**구조:**

```html
<div class="editor-pane">
  <div class="line-numbers"></div>
  <!-- 줄 번호 -->
  <div class="editor-content"></div>
  <!-- contenteditable -->
</div>
```

**주요 메서드:**

- `setDocument(_document)`: Document 연결 및 렌더링
- `#render()`: 전체 렌더링 (줄 번호 + 텍스트)
- `#renderLineNumbers()`: 줄 번호 표시
- `#renderContent()`: 텍스트 렌더링
- `#handleInput(_e)`: 키보드 입력 처리
- `#handleKeyDown(_e)`: 특수 키 처리 (Tab, Ctrl+S)

**특수 기능:**

- Tab키: 2칸 들여쓰기
- Ctrl+S: 파일 저장 요청
- `is_rendering` 플래그: 렌더링 중 재귀 방지
- `change_listener` 저장: onChange 리스너 중복 방지

**발행 이벤트:**

- 'content-changed': 내용 변경 시
- 'save-requested': Ctrl+S 입력 시
- 'cursor-moved': 커서 이동 시

---

### 3. TabBar 컴포넌트 (src/views/components/TabBar.js)

**기능:** 열린 파일들을 탭으로 표시하고 관리

**탭 구조:**

```
[아이콘] [●] 파일명 [×]
  📜    dirty  app.js  close
```

**주요 메서드:**

- `addTab(_document)`: 새 탭 추가 (중복 방지)
- `removeTab(_document)`: 탭 제거
- `setActiveTab(_document)`: 활성 탭 전환 (중복 방지)
- `updateTab(_document)`: 탭 갱신 (수정 표시)
- `#createTabElement(_document)`: 탭 HTML 생성
- `#renderTabs()`: 모든 탭 렌더링

**발행 이벤트:**

- 'tab-activated': 탭 클릭 시
- 'tab-close-requested': × 버튼 클릭 시
- 'no-tabs': 모든 탭 닫힌 경우

**중요 수정:**

- 중복 활성화 방지 (`if (this.active_tab === _document) return;`)
- DOM 사용 시 `window.document` 명시

---

### 4. TabController (src/controllers/TabController.js)

**기능:** Document 객체들의 생명주기 관리

**데이터 구조:**

```javascript
documents: Map<path, Document>  // 파일 경로 → Document
active_document: Document       // 현재 활성 Document
```

**주요 메서드:**

- `openDocument(_fileNode, _content)`: Document 생성 및 등록
- `activateDocument(_document)`: Document 활성화 (중복 방지)
- `closeDocument(_document)`: Document 닫기 (수정 확인)
- `closeAllDocuments()`: 모든 Document 닫기
- `findDocument(_fileNode)`: 특정 파일의 Document 찾기

**발행 이벤트:**

- 'document-opened': 새 Document 생성
- 'document-activated': Document 전환
- 'document-changed': Document 내용 변경
- 'document-closed': Document 닫힘

**설계 이유:**

- Map 사용으로 파일 경로 기반 중복 방지
- Document 생명주기를 TabBar와 분리하여 SRP 준수

---

### 5. EditorController (src/controllers/EditorController.js)

**기능:** TabController, FileSystemService, EditorPane을 연결하는 중간 관리자

**주요 메서드:**

- `setEditorPane(_editorPane)`: EditorPane 연결
- `displayDocument(_document)`: Document를 EditorPane에 표시
- `saveDocument(_document)`: Document를 파일에 저장
- `saveAllDocuments()`: 모든 수정된 파일 저장

**발행 이벤트:**

- 'document-displayed': Document 표시됨
- 'document-saved': Document 저장됨
- 'content-changed': 내용 변경
- 'status-message': 상태바 메시지
- 'error': 오류 발생

**설계 이유:** Controller 간 책임 분리 및 조율

---

## 이벤트 플로우

### 파일 열기

```
Sidebar 클릭 → FileController → TabController.openDocument()
→ Document 생성 → activateDocument() → EditorController.displayDocument()
→ EditorPane.setDocument() → TabBar.addTab() → setActiveTab()
→ TabController.activateDocument() (중복 방지로 return)
```

### 파일 저장

```
Ctrl+S → EditorPane → EditorController.saveDocument()
→ FileSystemService.writeFile() → Document.markAsSaved()
→ TabBar.updateTab() (● 제거)
```

---

## 버그 수정

### 1. EditorPane 무한 재귀

- **원인:** onChange 리스너 중복 + 렌더링 중 input 이벤트
- **해결:** `is_rendering` 플래그, `change_listener` 저장

### 2. TabBar ↔ TabController 순환 이벤트

- **원인:** 상태 변경 시 항상 이벤트 발행
- **해결:** 중복 체크 (`if (active === new) return`)

### 3. document 매개변수 충돌

- **원인:** 전역 `document` 객체와 매개변수명 충돌
- **해결:** 모든 매개변수 `_접두사`, DOM 사용 시 `window.document`

---

## 코딩 컨벤션

- Parameter: `_camelCase` (NEW!)
- DOM 접근: `window.document` 명시

**Phase 2 완료!** 🎉
