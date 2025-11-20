# CodeEditor 아키텍처 문서

## 목차

1. [전체 구조](#전체-구조)
2. [레이어 아키텍처](#레이어-아키텍처)
3. [디자인 패턴](#디자인-패턴)
4. [컴포넌트 상세](#컴포넌트-상세)
5. [데이터 흐름](#데이터-흐름)
6. [확장 포인트](#확장-포인트)

---

## 전체 구조

```
┌─────────────────────────────────────────┐
│          CodeEditorApp                  │
│  (애플리케이션 오케스트레이터)            │
└─────────────────────────────────────────┘
           │
           ├─────────────┬─────────────┬─────────────┐
           │             │             │             │
      ┌────▼────┐   ┌───▼────┐   ┌───▼────┐   ┌───▼────┐
      │Controllers│  │Services│  │ Models │  │  Views │
      └────┬────┘   └───┬────┘   └───┬────┘   └───┬────┘
           │             │             │             │
    ┌──────┴──────┐ ┌───┴────┐   ┌───┴────┐   ┌───┴────┐
    │EditorCtrl   │ │FileSys │   │Document│   │EditorP │
    │FileCtrl     │ │Complet │   │FileNode│   │Sidebar │
    │TabCtrl      │ │Linter  │   │Selecti │   │TabBar  │
    └─────────────┘ │Search  │   │EditorSt│   └────────┘
                    └────────┘   └────────┘
```

---

## 레이어 아키텍처

### 1. Core Layer (기반 계층)

**위치:** `src/core/`

**역할:** 모든 컴포넌트가 상속받는 추상 클래스 제공

**구성 요소:**

- `BaseComponent` - UI 컴포넌트 추상 클래스
- `BaseController` - 컨트롤러 추상 클래스
- `BaseService` - 서비스 추상 클래스
- `BaseModel` - 모델 추상 클래스
- `BaseRenderer` - 렌더러 추상 클래스

**특징:**

- 생명주기 관리 (initialize, mount, unmount, destroy)
- 이벤트 발행/구독 (EventEmitter)
- 검증 및 에러 처리
- 상태 추적

---

### 2. Model Layer (데이터 계층)

**위치:** `src/models/`

**역할:** 애플리케이션 데이터 구조 정의

**구성 요소:**

```
models/
├── Document.js        # 파일 내용 및 상태
├── FileNode.js        # 파일 트리 노드
├── Selection.js       # 텍스트 선택 영역
└── EditorState.js     # 에디터 상태
```

**책임:**

- 데이터 저장 및 관리
- 데이터 검증
- 변경 감지 및 이벤트 발행
- 직렬화/역직렬화

**주요 특징:**

- `Document`: Dirty 상태 추적, 줄 단위 접근
- `FileNode`: 트리 구조, 경로 관리, 순회 기능
- `Selection`: 선택 영역 정규화, 비교
- `EditorState`: 커서 위치, 스크롤 위치, 설정

---

### 3. Service Layer (비즈니스 로직 계층)

**위치:** `src/services/`

**역할:** 비즈니스 로직 및 외부 API 상호작용

**구성 요소:**

```
services/
├── file/
│   ├── FileSystemService.js    # File System Access API
│   └── FileCacheService.js     # 파일 캐싱
├── editor/
│   ├── CompletionService.js    # 자동완성
│   └── LinterService.js        # 코드 검증
├── search/
│   └── SearchService.js        # 검색/바꾸기
└── language/
    └── LanguageService.js      # 언어별 토큰화
```

**책임:**

- 파일 읽기/쓰기 (FileSystemService)
- 자동완성 제안 (CompletionService)
- 코드 검증 (LinterService)
- 텍스트 검색/바꾸기 (SearchService)
- 언어별 토큰화 (LanguageService)

**특징:**

- 상태 비저장 (Stateless)
- 재사용 가능
- 검증 강화

---

### 4. View Layer (표현 계층)

**위치:** `src/views/`

**역할:** UI 렌더링 및 사용자 입력 처리

**구성 요소:**

```
views/
├── components/
│   ├── Sidebar.js           # 파일 트리
│   ├── TabBar.js            # 탭 바
│   ├── EditorPane.js        # 메인 에디터
│   ├── CompletionPanel.js   # 자동완성 패널
│   └── SearchPanel.js       # 검색 패널
└── renderers/
    ├── SyntaxRenderer.js    # 신택스 하이라이팅
    └── VirtualScroller.js   # 가상 스크롤
```

**책임:**

- DOM 조작
- 사용자 입력 처리
- 이벤트 발행
- 렌더링 최적화

**특징:**

- `Sidebar`: 파일 트리 렌더링, 확장/축소
- `TabBar`: 탭 관리, 드래그 앤 드롭
- `EditorPane`: 텍스트 편집, 커서 관리
- `CompletionPanel`: 자동완성 UI
- `SearchPanel`: 검색/바꾸기 UI

---

### 5. Controller Layer (제어 계층)

**위치:** `src/controllers/`

**역할:** View와 Model 연결, 애플리케이션 흐름 제어

**구성 요소:**

```
controllers/
├── EditorController.js    # 편집 작업 조율
├── FileController.js      # 파일 작업 관리
└── TabController.js       # 탭/Document 관리
```

**책임:**

- 사용자 액션 처리
- Service 호출
- View 업데이트
- 이벤트 중계

**특징:**

- `EditorController`: Document 표시, 저장
- `FileController`: 파일 열기, 저장, 생성, 삭제
- `TabController`: Document 열기, 닫기, 전환

---

## 디자인 패턴

### 1. MVC Pattern

```
┌────────┐         ┌────────────┐         ┌───────┐
│  View  │────────>│ Controller │────────>│ Model │
│(UI)    │<────────│ (Logic)    │<────────│(Data) │
└────────┘         └────────────┘         └───────┘
    ↑                                          │
    └──────────────────────────────────────────┘
              (이벤트 / 데이터 변경)
```

**적용 사례:**

- View: `EditorPane`, `Sidebar`, `TabBar`
- Controller: `EditorController`, `FileController`, `TabController`
- Model: `Document`, `FileNode`, `EditorState`

---

### 2. Observer Pattern

**구현:** EventEmitter (BaseComponent 내장)

```javascript
// 이벤트 발행
component.emit('file-opened', { file_node, content });

// 이벤트 구독
component.on('file-opened', (_event) => {
  // 처리
});
```

**적용 사례:**

- Document 변경 → TabController 알림
- TabController → TabBar, EditorPane 업데이트
- FileController → Sidebar 업데이트

---

### 3. Strategy Pattern

**적용:** 언어별 처리

```javascript
class LanguageService {
  getTokenizer(_language) {
    switch (_language) {
      case 'javascript':
        return new JavaScriptTokenizer();
      case 'html':
        return new HTMLTokenizer();
      // ...
    }
  }
}
```

---

### 4. Decorator Pattern

**적용:** SyntaxRenderer 캐싱

```javascript
class SyntaxRenderer extends BaseRenderer {
  renderLine(_text, _language, _lineNumber) {
    // 캐시 확인
    const cached = this.getFromCache(key);
    if (cached) return cached;

    // 렌더링
    const result = this.#doRender(_text, _language);

    // 캐싱
    this.addToCache(key, result);
    return result;
  }
}
```

---

### 5. Command Pattern

**적용:** Undo/Redo (향후 구현)

```javascript
class InsertTextCommand {
  execute() {
    // 텍스트 삽입
  }
  undo() {
    // 삽입 취소
  }
}
```

---

## 컴포넌트 상세

### EditorPane 아키텍처

```
┌───────────────────────────────────────┐
│          EditorPane                   │
│  (BaseComponent)                      │
├───────────────────────────────────────┤
│                                       │
│  ┌─────────────────────────────────┐ │
│  │  Line Numbers Gutter            │ │
│  └─────────────────────────────────┘ │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │  Editor Content (contenteditable)│ │
│  │                                 │ │
│  │  ┌─────────────────────┐       │ │
│  │  │ VirtualScroller     │       │ │
│  │  │ (대용량 파일용)      │       │ │
│  │  └─────────────────────┘       │ │
│  └─────────────────────────────────┘ │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │  Completion Panel               │ │
│  └─────────────────────────────────┘ │
└───────────────────────────────────────┘
```

**주요 책임:**

1. 텍스트 렌더링 (SyntaxRenderer 사용)
2. 사용자 입력 처리 (키보드, 마우스)
3. 커서 위치 관리
4. 자동완성 트리거
5. Virtual Scrolling (대용량 파일)

---

### FileNode 트리 구조

```
root (directory)
├── src (directory)
│   ├── app.js (file)
│   ├── controllers (directory)
│   │   ├── EditorController.js
│   │   └── FileController.js
│   └── models (directory)
│       └── Document.js
└── tests (directory)
    └── app.test.js
```

**구현:**

```javascript
class FileNode extends BaseModel {
  constructor(_name, _type, _parent) {
    this.name = _name;
    this.type = _type; // 'file' | 'directory'
    this.parent = _parent;
    this.children = []; // directory만 사용
  }

  getPath() {
    // 재귀적으로 경로 생성
    if (!this.parent) return `/${this.name}`;
    return `${this.parent.getPath()}/${this.name}`;
  }
}
```

---

## 데이터 흐름

### 1. 파일 열기 플로우

```
사용자 클릭 (Sidebar)
         │
         ▼
   Sidebar.emit('file-selected')
         │
         ▼
   FileController.openFile()
         │
         ├──> FileSystemService.readFile()
         │
         ▼
   FileController.emit('file-opened')
         │
         ▼
   TabController.openDocument()
         │
         ├──> Document 생성/재사용
         │
         ▼
   TabController.emit('document-opened')
         │
         ├──> TabBar.addTab()
         │
         ▼
   TabController.emit('document-activated')
         │
         ▼
   EditorController.displayDocument()
         │
         ▼
   EditorPane.setDocument()
         │
         ▼
   EditorPane.render()
```

---

### 2. 파일 저장 플로우

```
사용자 Ctrl+S
         │
         ▼
   EditorPane (키보드 이벤트)
         │
         ▼
   EditorController.saveCurrentDocument()
         │
         ├──> TabController.getActiveDocument()
         │
         ▼
   EditorController.emit('save-requested')
         │
         ▼
   FileController.saveFile()
         │
         ├──> FileSystemService.writeFile()
         │
         ▼
   Document.markAsSaved()
         │
         ▼
   TabBar.updateTab() (Dirty 표시 제거)
```

---

### 3. 자동완성 플로우

```
사용자 입력 (EditorPane)
         │
         ▼
   EditorPane (debounce 300ms)
         │
         ▼
   CompletionService.getCompletions()
         │
         ├──> LanguageService.tokenize()
         ├──> 키워드 매칭
         ├──> 심볼 추출
         │
         ▼
   CompletionPanel.show(items)
         │
         ▼
   사용자 선택 (Enter)
         │
         ▼
   EditorPane.insertText()
         │
         ▼
   Document.setContent()
```

---

## 확장 포인트

### 1. 새 언어 추가

```javascript
// src/services/language/LanguageService.js 확장
class LanguageService {
  constructor() {
    this.tokenizers = {
      javascript: new JavaScriptTokenizer(),
      html: new HTMLTokenizer(),
      python: new PythonTokenizer(), // NEW
    };
  }
}
```

---

### 2. 새 Service 추가

```javascript
// src/services/git/GitService.js
export default class GitService extends BaseService {
  async commit(_message) {
    // Git commit
  }

  async push() {
    // Git push
  }
}

// app.js에서 등록
this.services.git = new GitService();
```

---

### 3. 새 View 추가

```javascript
// src/views/components/Minimap.js
export default class Minimap extends BaseComponent {
  render() {
    // 미니맵 렌더링
  }
}

// app.js에서 등록
this.views.minimap = new Minimap('Minimap');
this.views.minimap.mount();
```

---

### 4. 커스텀 테마

```javascript
// src/themes/DarkTheme.js
export default {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  keyword: '#569cd6',
  string: '#ce9178',
  // ...
};

// app.js에서 적용
this.views.syntax_renderer.setTheme(DarkTheme);
```

---

## 성능 최적화

### 1. Virtual Scrolling

대용량 파일 (10,000줄+)을 효율적으로 렌더링합니다.

```javascript
class VirtualScroller {
  constructor(_config) {
    this.visible_start = 0; // 가시 시작 줄
    this.visible_end = 50; // 가시 끝 줄
  }

  updateScroll(_scrollTop) {
    // 가시 범위 재계산
    this.visible_start = Math.floor(_scrollTop / this.line_height);
    this.visible_end = this.visible_start + this.visible_count;
  }
}
```

**효과:**

- 10,000줄 파일도 부드러운 스크롤
- 메모리 사용량 감소
- 초기 로딩 시간 단축

---

### 2. LRU 캐싱

SyntaxRenderer가 렌더링 결과를 캐싱합니다.

```javascript
class SyntaxRenderer extends BaseRenderer {
  constructor() {
    super({
      cache_size: 5000, // 최대 5000개 캐싱
    });
  }

  renderLine(_text, _language, _lineNumber) {
    const key = this.#getCacheKey(_text, _language, _lineNumber);
    return this.renderWithCache(key, () => {
      return this.#doRender(_text, _language);
    });
  }
}
```

**효과:**

- 반복 렌더링 시 성능 향상
- 스크롤 성능 개선

---

### 3. Debounce

자동완성 트리거를 지연시켜 과도한 호출을 방지합니다.

```javascript
const debouncedComplete = debounce(() => {
  this.#showCompletions();
}, 300);
```

**효과:**

- 타이핑 중 불필요한 계산 방지
- 부드러운 사용자 경험

---

## 테스트 전략

### 1. 단위 테스트

각 컴포넌트를 독립적으로 테스트합니다.

```
src/tests/unit/
├── models/
│   ├── Document.test.js
│   └── FileNode.test.js
├── services/
│   ├── CompletionService.test.js
│   └── LinterService.test.js
├── views/
│   ├── EditorPane.test.js
│   └── Sidebar.test.js
└── controllers/
    ├── EditorController.test.js
    └── FileController.test.js
```

**커버리지 목표:** 90%+

---

### 2. 통합 테스트

여러 컴포넌트의 상호작용을 테스트합니다.

```
src/tests/integration/
├── file-operations.test.js    # 파일 열기/저장/닫기
├── editing.test.js            # 편집 작업
└── error-handling.test.js     # 에러 처리
```

---

### 3. E2E 테스트 (향후)

실제 사용자 시나리오를 테스트합니다.

```
tests/e2e/
├── basic-workflow.test.js     # 기본 워크플로우
├── large-file.test.js         # 대용량 파일
└── multi-file.test.js         # 다중 파일
```

---

## 보안 고려사항

### 1. XSS 방지

사용자 입력을 HTML 이스케이프합니다.

```javascript
DOMUtils.escapeHtml(_text);
```

---

### 2. 파일 시스템 접근 제한

File System Access API 권한을 명시적으로 요청합니다.

```javascript
const permission = await handle.requestPermission({ mode: 'readwrite' });
if (permission !== 'granted') {
  throw new Error('Permission denied');
}
```

---

## 향후 개선 사항

### Phase 7 (향후)

1. **화면 분할** - 여러 파일 동시 편집
2. **Git 통합** - 버전 관리
3. **미니맵** - 파일 전체 미리보기
4. **설정 시스템** - 사용자 커스터마이징
5. **플러그인 시스템** - 확장 기능

---

## 참고 문서

- [API 문서](./API.md)
- [개발자 가이드](./DEVELOPER_GUIDE.md)
- [리팩토링 계획](../project-decisions-5.2-refactoring.md)

---

## 라이센스

MIT License
