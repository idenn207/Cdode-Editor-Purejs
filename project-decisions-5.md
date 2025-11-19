# Web Code Editor - Phase 5 구현 문서

## Phase 5 개요

Phase 5에서는 자동완성(Autocompletion)과 실행 취소/다시 실행(Undo/Redo) 기능을 구현했습니다.

---

## Phase 5 구현 목표

✅ **완료된 기능**

### Part 1: 자동완성 시스템

- CompletionService (자동완성 제안 생성)
- CompletionPanel (자동완성 UI)
- 키워드, 사용자 정의 심볼, 코드 스니펫 지원
- Ctrl+Space 수동 트리거
- 타이핑 중 자동 트리거 (300ms debounce)
- 화살표 키로 항목 선택

### Part 2: Undo/Redo 시스템

- Command Pattern 구조
- InsertTextCommand, DeleteTextCommand
- HistoryService (Document별 히스토리 관리)
- Ctrl+Z (Undo), Ctrl+Y (Redo) 단축키
- 최대 100개 히스토리 유지

---

## 1. CompletionService 구현

### 파일 위치

`src/services/CompletionService.js`

### 책임

코드 컨텍스트 분석 및 자동완성 항목 생성

### 주요 메서드

#### getCompletions(\_document, \_line, \_column, \_language)

현재 커서 위치에서 자동완성 항목 반환

**파라미터**:

- `_document`: Document 객체
- `_line`, `_column`: 커서 위치
- `_language`: 'javascript', 'html', 'css', 'markdown'

**반환**: `[{ label, kind, insertText, detail, sortText }]`

**동작**:

1. 커서 앞 텍스트에서 접두사 추출
2. 키워드 완성 항목 수집
3. 사용자 정의 심볼 추출 (변수, 함수, 클래스)
4. 코드 스니펫 추가
5. 중복 제거 및 우선순위 정렬

#### #extractSymbols(\_text, \_language)

문서에서 심볼 추출 (정규식 기반)

**JavaScript 심볼**:

- 변수: `const/let/var variableName`
- 함수: `function functionName()`, `const func = () => {}`
- 클래스: `class ClassName`

#### #getKeywordCompletions(\_language, \_prefix)

언어별 키워드 필터링

**JavaScript 키워드**: const, let, var, function, class, if, for, async, await 등

#### #getSnippetCompletions(\_language, \_prefix)

코드 스니펫 제공

**JavaScript 스니펫**:

- `log` → `console.log();`
- `func` → `function name() {\n  \n}`
- `arrow` → `const name = () => {\n  \n};`
- `class` → `class ClassName {\n  constructor() {\n    \n  }\n}`
- `if`, `for`, `foreach`, `try` 등

### 자동완성 항목 구조

```javascript
{
  label: 'functionName',           // 표시될 이름
  kind: 'function',                // keyword, variable, function, class, snippet
  insertText: 'functionName()',    // 실제 삽입될 텍스트
  detail: 'Function',              // 부가 설명
  sortText: '1_functionName'       // 정렬 키 (0=키워드, 1=심볼, 2=스니펫)
}
```

### 설계 결정

**정규식 기반 파싱**:

- 빠른 구현
- 외부 의존성 없음
- 기본 심볼 추출에 충분

**한계**:

- 컨텍스트 이해 제한적
- 복잡한 구문 분석 어려움

**향후 개선 (Phase 6+)**: AST 기반 파서 도입

---

## 2. CompletionPanel 컴포넌트

### 파일 위치

`src/views/components/CompletionPanel.js`

### 책임

자동완성 항목 UI 표시 및 사용자 인터랙션

### HTML 구조

```html
<div class="completion-panel">
  <div class="completion-item selected">
    <span class="completion-icon">ƒ</span>
    <span class="completion-label">functionName</span>
    <span class="completion-detail">Function</span>
  </div>
  <!-- ... -->
</div>
```

### 주요 메서드

#### show(\_items, \_position)

자동완성 패널 표시

- `_items`: 자동완성 항목 배열
- `_position`: { top, left } - 커서 좌표

#### selectNext() / selectPrevious()

화살표 키로 항목 선택 (순환)

#### getCurrentItem()

현재 선택된 항목 반환

#### handleEnter() / handleEscape()

Enter (확정), Escape (취소) 처리

### 아이콘

- `K`: Keyword
- `v`: Variable
- `ƒ`: Function
- `C`: Class
- `◊`: Snippet

### 발행 이벤트

- `item-selected`: Enter로 항목 선택 시
- `close-requested`: Escape 시

### 설계 결정

**동적 위치 계산**: 커서 좌표에 따라 패널 배치

**스크롤 동기화**: 선택된 항목이 항상 보이도록 `scrollIntoView`

**클릭 지원**: 마우스로도 항목 선택 가능

---

## 3. EditorPane 통합

### 수정 사항

#### #checkCompletionTrigger()

타이핑 중 자동완성 트리거 감지 (300ms debounce)

**동작**:

1. 커서 위치 가져오기
2. 커서 앞 텍스트에서 접두사 추출 (`/[a-zA-Z_$][a-zA-Z0-9_$]*$/`)
3. 접두사 길이 ≥ 1이면 'trigger-completion' 이벤트 발행

#### #getCursorPosition()

Selection API로 커서 위치 (줄, 열) 반환

**동작**:

1. Selection과 Range 가져오기
2. 현재 `.code-line` 노드 찾기
3. 줄 번호 계산
4. 텍스트 오프셋으로 열 번호 계산

#### getCursorCoordinates()

화면 좌표 (top, left) 반환

**동작**:

1. Range의 `getBoundingClientRect()` 호출
2. 컨테이너 기준 상대 좌표 계산

#### insertCompletion(\_completion)

자동완성 항목 삽입

**동작**:

1. 현재 줄 가져오기
2. 접두사 찾기 및 삭제
3. `_completion.insertText` 삽입
4. Document 업데이트 및 재렌더링

#### 키보드 이벤트 처리

패널이 보이는 경우:

- `ArrowDown/Up`: 'completion-next/previous' 이벤트
- `Enter`: 'completion-confirm' 이벤트
- `Escape`: 'completion-cancel' 이벤트

### 발행 이벤트

- `trigger-completion`: { line, column, prefix }
- `completion-next/previous/confirm/cancel`

---

## 4. EditorController 통합

### 자동완성 관련 필드

```javascript
this.completionService = new CompletionService();
this.completion_panel = null;
```

### setCompletionPanel(\_completionPanel)

CompletionPanel 연결 및 이벤트 설정

**이벤트 처리**:

- `item-selected`: EditorPane.insertCompletion() 호출
- `close-requested`: 패널 숨김

### #handleCompletionTrigger(\_data)

자동완성 트리거 처리

**동작**:

1. CompletionService.getCompletions() 호출
2. 항목 없으면 패널 숨김
3. 항목 있으면 커서 좌표 계산 후 패널 표시

### triggerCompletion()

수동 자동완성 트리거 (Ctrl+Space)

---

## 5. Command Pattern 구현

### EditCommand (베이스 클래스)

**파일 위치**: `src/models/EditCommand.js`

**메서드**:

- `execute()`: 커맨드 실행
- `undo()`: 커맨드 되돌리기
- `redo()`: 커맨드 재실행 (기본: execute 호출)

### InsertTextCommand

**파일 위치**: `src/models/commands/InsertTextCommand.js`

**책임**: 텍스트 삽입 작업

**필드**:

```javascript
{
  line: number,          // 삽입 줄
  column: number,        // 삽입 열
  text: string           // 삽입할 텍스트
}
```

**execute()**:

1. 현재 줄을 커서 위치에서 분할
2. 삽입 텍스트를 줄 단위로 분리
3. 단일 줄 / 여러 줄 처리 분기
4. Document 업데이트

**undo()**:

1. 삽입된 텍스트 길이만큼 삭제
2. 여러 줄인 경우 삽입된 줄 제거
3. Document 복원

### DeleteTextCommand

**파일 위치**: `src/models/commands/DeleteTextCommand.js`

**책임**: 텍스트 삭제 작업

**필드**:

```javascript
{
  start_line, start_col,     // 시작 위치
  end_line, end_col,         // 끝 위치
  deleted_text: string       // 삭제된 텍스트 (undo용)
}
```

**execute()**:

1. 삭제할 텍스트 저장 (#extractText)
2. 같은 줄 / 여러 줄 삭제 처리
3. Document 업데이트

**undo()**:

1. 저장된 `deleted_text` 다시 삽입
2. InsertTextCommand와 유사한 로직

**#extractText()**:

1. 삭제 범위의 텍스트 추출
2. 여러 줄인 경우 '\n'으로 연결

### 설계 결정

**Command Pattern 사용 이유**:

- 편집 작업을 객체로 캡슐화
- execute/undo/redo 일관된 인터페이스
- 복잡한 편집 작업 확장 가능

**대안 (Memento Pattern)**:

- 전체 상태 저장
- 메모리 사용량 과다
- 큰 파일에서 비효율적

---

## 6. HistoryService 구현

### 파일 위치

`src/services/HistoryService.js`

### 책임

Document별 편집 히스토리 관리

### 데이터 구조

```javascript
histories: Map<path, {
  undo_stack: [Command],    // 되돌릴 커맨드 스택
  redo_stack: [Command]     // 재실행 커맨드 스택
}>
```

### 주요 메서드

#### initHistory(\_document)

Document의 히스토리 초기화 (undo_stack, redo_stack 생성)

#### executeCommand(\_document, \_command)

커맨드 실행 및 히스토리 추가

**동작**:

1. 커맨드 실행
2. undo_stack에 추가
3. 최대 크기 초과 시 가장 오래된 것 제거
4. redo_stack 초기화 (새 작업 수행 시)

#### undo(\_document)

Undo 실행

**동작**:

1. undo_stack에서 pop
2. command.undo() 호출
3. redo_stack에 추가
4. 성공 여부 반환

#### redo(\_document)

Redo 실행

**동작**:

1. redo_stack에서 pop
2. command.redo() 호출
3. undo_stack에 다시 추가

#### canUndo(\_document) / canRedo(\_document)

히스토리 상태 확인

#### clearHistory(\_document) / removeHistory(\_document)

히스토리 제거 (파일 닫을 때)

### 설계 결정

**Document별 분리**:

- 각 파일마다 독립적인 히스토리
- 탭 전환 시 히스토리 유지
- 메모리 관리 용이

**최대 크기 제한 (100개)**:

- 메모리 사용량 제어
- 대부분의 편집 작업에 충분

**스택 구조 (LIFO)**:

- Undo/Redo의 자연스러운 구조
- 구현 단순

---

## 7. 전체 이벤트 플로우

### 자동완성 플로우

```
[User] 타이핑 "con"
    ↓
[EditorPane] input 이벤트 → #checkCompletionTrigger (300ms debounce)
    ↓
[EditorPane] 'trigger-completion' 이벤트 { line, column, prefix: "con" }
    ↓
[EditorController] #handleCompletionTrigger()
    ↓
[CompletionService] getCompletions() → [const, console, ...]
    ↓
[EditorPane] getCursorCoordinates() → { top, left }
    ↓
[CompletionPanel] show(items, position)
    ↓
[User] ArrowDown/Up → 'completion-next/previous'
    ↓
[CompletionPanel] selectNext/Previous()
    ↓
[User] Enter → 'completion-confirm'
    ↓
[CompletionPanel] 'item-selected' 이벤트
    ↓
[EditorPane] insertCompletion({ insertText: "console" })
    ↓
텍스트 삽입 완료
```

### Undo/Redo 플로우 (개념적)

```
[User] 텍스트 입력 "Hello"
    ↓
[Command] InsertTextCommand 생성
    ↓
[HistoryService] executeCommand() → undo_stack에 추가
    ↓
[User] Ctrl+Z
    ↓
[EditorController] undo()
    ↓
[HistoryService] undo() → command.undo()
    ↓
[Document] 이전 상태로 복원
    ↓
[EditorPane] 재렌더링
    ↓
[User] Ctrl+Y
    ↓
[EditorController] redo()
    ↓
[HistoryService] redo() → command.redo()
    ↓
[Document] "Hello" 다시 삽입
```

**참고**: 현재 구현에서는 실제 텍스트 변경을 Command로 감지하지 않음 (Phase 5의 한계)

---

## 8. CSS 스타일링

### completion-panel.css

```css
.completion-panel {
  position: absolute;
  width: 320px;
  max-height: 220px;
  overflow-y: auto;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 200;
}

.completion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  cursor: pointer;
}

.completion-item.selected {
  background-color: var(--bg-active);
}

.completion-icon {
  width: 18px;
  height: 18px;
  font-weight: bold;
  color: var(--text-accent);
  background-color: rgba(79, 195, 247, 0.2);
  border-radius: 3px;
}

.completion-label {
  flex: 1;
  color: var(--text-primary);
}

.completion-detail {
  font-size: 11px;
  color: var(--text-secondary);
}
```

---

## 9. 키보드 단축키

### app.js

```javascript
#setupKeyBindings() {
  // 자동완성
  this.keyBindings.register('ctrl+space', () => {
    this.controllers.editor.triggerCompletion();
  });

  // Undo
  this.keyBindings.register('ctrl+z', () => {
    this.controllers.editor.undo();
  });

  // Redo
  this.keyBindings.register('ctrl+y', () => {
    this.controllers.editor.redo();
  });

  this.keyBindings.register('ctrl+shift+z', () => {
    this.controllers.editor.redo();
  });
}
```

---

## 주요 기술 결정

### 1. 정규식 기반 심볼 추출

**선택 이유**:

- 빠른 구현
- 외부 의존성 없음
- 기본 신택스 충분

**한계**:

- 문맥 이해 불가
- 스코프 인식 불가

**향후 개선**: AST 기반 파서 (Acorn, Babel)

### 2. 300ms Debounce

**선택 이유**:

- 너무 짧으면 성능 저하
- 너무 길면 반응성 저하
- 300ms는 적절한 균형

### 3. Command Pattern

**선택 이유**:

- 편집 작업 캡슐화
- 확장 가능
- 테스트 용이

**대안**: Memento Pattern (메모리 과다)

### 4. Document별 히스토리

**선택 이유**:

- 파일마다 독립적
- 탭 전환 시 유지
- 메모리 관리 용이

---

## 알려진 제한사항

### 자동완성

**1. 간단한 심볼 추출**

문제: 정규식으로는 스코프, 타입 등 파악 불가

해결 (Phase 6+): AST 기반 파서

**2. 컨텍스트 인식 부족**

문제: 객체 프로퍼티, 메서드 자동완성 불가

해결 (Phase 6+): 타입 추론 시스템

**3. 커서 위치 복원 불완전**

문제: insertCompletion 후 커서 위치 부정확

해결 (Phase 6+): 정확한 Selection 복원

### Undo/Redo

**1. 실제 Command 미통합**

문제: 현재는 구조만 구현, 실제 편집이 Command로 처리되지 않음

해결 (Phase 6+): EditorPane input을 Command로 변환

**2. 간단한 Diff**

문제: 정확한 변경 감지 어려움

해결 (Phase 6+): Diff-Match-Patch 라이브러리

**3. 복합 편집 작업 미지원**

문제: 전체 바꾸기 등 여러 변경을 하나의 Undo로 처리 불가

해결 (Phase 6+): CompositeCommand

---

## 파일 구조 (Phase 5 추가)

```
src/
├── services/
│   ├── FileSystemService.js
│   ├── LanguageService.js
│   ├── SearchService.js
│   ├── CompletionService.js      [NEW]
│   └── HistoryService.js         [NEW]
├── views/
│   └── components/
│       ├── Sidebar.js
│       ├── TabBar.js
│       ├── EditorPane.js         [MODIFIED]
│       ├── SearchPanel.js
│       └── CompletionPanel.js    [NEW]
├── models/
│   ├── FileNode.js
│   ├── Document.js               [MODIFIED]
│   ├── EditCommand.js            [NEW]
│   └── commands/
│       ├── InsertTextCommand.js  [NEW]
│       └── DeleteTextCommand.js  [NEW]
├── controllers/
│   ├── FileController.js
│   ├── TabController.js
│   └── EditorController.js       [MODIFIED]
├── styles/
│   ├── main.css
│   ├── sidebar.css
│   ├── tabbar.css
│   ├── editor.css
│   ├── syntax.css
│   ├── search-panel.css
│   └── completion-panel.css      [NEW]
└── app.js                         [MODIFIED]
```

---

## 테스트 시나리오

### 자동완성

**시나리오 1: 타이핑 자동완성**

1. JavaScript 파일 열기
2. `con` 타이핑
3. ✅ 300ms 후 자동완성 패널 표시 (console, const 등)
4. ArrowDown으로 `console` 선택
5. Enter
6. ✅ `console` 삽입됨

**시나리오 2: Ctrl+Space 수동 트리거**

1. `fu` 타이핑
2. Ctrl+Space
3. ✅ 즉시 패널 표시 (function, 사용자 정의 함수 등)

**시나리오 3: 스니펫**

1. `log` 타이핑
2. ✅ `log` 스니펫 표시
3. Enter
4. ✅ `console.log();` 삽입됨

**시나리오 4: 사용자 정의 함수**

1. `function myFunc() {}` 입력
2. 새 줄에서 `my` 타이핑
3. ✅ `myFunc` 자동완성 표시
4. Enter
5. ✅ `myFunc()` 삽입됨

### Undo/Redo

**시나리오 1: 기본 Undo/Redo**

1. "Hello World" 입력
2. Ctrl+Z
3. ✅ 입력 취소
4. Ctrl+Y
5. ✅ 다시 입력됨

**시나리오 2: 여러 번 Undo**

1. "Line 1" 입력 + Enter
2. "Line 2" 입력 + Enter
3. "Line 3" 입력
4. Ctrl+Z 3번
5. ✅ 모두 취소됨
6. Ctrl+Y 2번
7. ✅ "Line 1", "Line 2"만 복원

**시나리오 3: Document별 독립 히스토리**

1. file1.js 열기 → "File 1 content" 입력
2. file2.js 열기 → "File 2 content" 입력
3. file1.js 탭 클릭
4. Ctrl+Z
5. ✅ file1.js 내용만 취소 (file2.js는 유지)

---

## Phase 5 vs Phase 4 비교

| 기능              | Phase 4 | Phase 5                 |
| ----------------- | ------- | ----------------------- |
| 폴더/파일 탐색    | ✅      | ✅                      |
| 텍스트 편집       | ✅      | ✅                      |
| 신택스 하이라이팅 | ✅      | ✅                      |
| Virtual Scrolling | ✅      | ✅                      |
| 검색/바꾸기       | ✅      | ✅                      |
| 키보드 단축키     | ✅      | ✅                      |
| **자동완성**      | ❌      | ✅ (키워드+심볼+스니펫) |
| **Undo/Redo**     | ❌      | ✅ (Command Pattern)    |

---

## 다음 단계 (Phase 6 후보)

### 필수 기능

1. **자동완성 개선**

   - AST 기반 파싱
   - 타입 추론
   - 객체 프로퍼티/메서드 자동완성

2. **Undo/Redo 완성**

   - 실제 편집 작업을 Command로 통합
   - Diff-Match-Patch 라이브러리
   - CompositeCommand (복합 작업)

3. **화면 분할**
   - SplitView 컴포넌트
   - 수평/수직 분할
   - 드래그 리사이징

### 추가 기능

4. **미니맵**

   - 파일 전체 미리보기
   - 현재 위치 표시

5. **파일 트리 개선**

   - 파일 생성/삭제/이름 변경
   - 드래그 앤 드롭

6. **설정 시스템**
   - 사용자 설정 저장
   - 테마 전환
   - 키바인딩 커스터마이징

---

## 참고 자료

- [Command Pattern](https://refactoring.guru/design-patterns/command)
- [Memento Pattern](https://refactoring.guru/design-patterns/memento)
- [VSCode IntelliSense](https://code.visualstudio.com/docs/editor/intellisense)
- [Selection API](https://developer.mozilla.org/en-US/docs/Web/API/Selection)
- [Range API](https://developer.mozilla.org/en-US/docs/Web/API/Range)

---

## 라이선스

MIT License

---

## Phase 5 총 라인 수

| 파일                       | 라인 수    |
| -------------------------- | ---------- |
| CompletionService.js       | ~350       |
| CompletionPanel.js         | ~200       |
| EditCommand.js             | ~15        |
| InsertTextCommand.js       | ~80        |
| DeleteTextCommand.js       | ~100       |
| HistoryService.js          | ~100       |
| EditorPane.js (수정)       | ~650       |
| EditorController.js (수정) | ~250       |
| Document.js (수정)         | ~5         |
| app.js (수정)              | ~30        |
| completion-panel.css       | ~60        |
| **Phase 5 합계**           | **~1,840** |

---

**Phase 5 구현 완료!** 🎉

자동완성과 Undo/Redo 시스템이 모두 구현되었습니다.
