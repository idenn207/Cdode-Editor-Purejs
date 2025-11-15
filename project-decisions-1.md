# Web Code Editor - Phase 1 구현 문서

## 프로젝트 개요

VSCode와 유사한 웹 기반 코드 에디터를 순수 JavaScript로 구현하는 프로젝트입니다.

### 기술 스택

- HTML5, CSS, Pure JavaScript (Node.js 미사용)
- 객체 지향 프로그래밍 (Class 기반)
- SOLID 원칙 준수

### 지원 기능

- 폴더 탐색 사이드바
- 파일 열기/저장
- 탭 기능
- 화면 분할
- 뒤로/앞으로가기
- 코드 오류 하이라이트
- 탭 indent 색상
- HTML auto-close-tag
- Ctrl+Click 참조 이동
- 언어별 자동 포맷
- 신택스 하이라이팅
- 지원 언어: .js, .html, .css, .md

---

## 아키텍처 설계

### 전체 구조

```
Application Layer (app.js)
    ↓
┌─────────────┬─────────────┬─────────────┐
│ Controllers │  Services   │    Views    │
├─────────────┼─────────────┼─────────────┤
│ - Editor    │ - FileSystem│ - Sidebar   │
│ - File      │ - Parser    │ - EditorPane│
│ - Tab       │ - Formatter │ - TabBar    │
│ - Layout    │ - Highlight │ - StatusBar │
│ - Navigation│ - History   │ - SplitView │
└─────────────┴─────────────┴─────────────┘
```

### 디자인 패턴

- **Observer Pattern**: EventEmitter를 통한 컴포넌트 간 통신
- **Command Pattern**: 편집 작업 캡슐화 (Undo/Redo)
- **Strategy Pattern**: 언어별 파싱/포맷팅 전략
- **Decorator Pattern**: 텍스트 렌더링 데코레이터
- **Virtual DOM Pattern**: 효율적인 렌더링

### 프로젝트 구조

```
index.html
src/
├── app.js
├── controllers/
│   ├── EditorController.js
│   ├── FileController.js
│   ├── TabController.js
│   ├── LayoutController.js
│   └── NavigationController.js
├── services/
│   ├── FileSystemService.js
│   ├── ParserService.js
│   ├── FormatterService.js
│   ├── HighlighterService.js
│   ├── LinterService.js
│   ├── HistoryService.js
│   ├── LanguageService.js
│   └── ReferenceService.js
├── views/
│   ├── components/
│   │   ├── Sidebar.js
│   │   ├── EditorPane.js
│   │   ├── TabBar.js
│   │   ├── StatusBar.js
│   │   ├── SplitView.js
│   │   └── LineNumberGutter.js
│   └── renderers/
│       ├── TextRenderer.js
│       ├── SyntaxRenderer.js
│       └── ErrorRenderer.js
├── models/
│   ├── FileNode.js
│   ├── EditorState.js
│   ├── Document.js
│   └── Selection.js
├── utils/
│   ├── Rope.js
│   ├── EventEmitter.js
│   ├── Debounce.js
│   └── TokenParser.js
└── constants/
    ├── Languages.js
    ├── Themes.js
    └── KeyBindings.js
```

---

## Phase 1 구현 내용

### 1. 기본 구조

#### index.html

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Web Code Editor</title>
    <link rel="stylesheet" href="src/styles/main.css" />
  </head>
  <body>
    <div id="App" class="app-container">
      <div id="Sidebar" class="sidebar"></div>
      <div class="main-content">
        <div id="TabBar" class="tab-bar"></div>
        <div id="EditorContainer" class="editor-container"></div>
        <div id="StatusBar" class="status-bar"></div>
      </div>
    </div>
    <script type="module" src="src/app.js"></script>
  </body>
</html>
```

### 2. 핵심 유틸리티

#### EventEmitter (Observer 패턴)

- 컴포넌트 간 느슨한 결합 제공
- on/once/off/emit 메서드 구현
- 이벤트 기반 통신 활성화

#### Debounce/Throttle

- 과도한 이벤트 호출 방지
- debounce: 연속 이벤트 그룹화
- throttle: 일정 간격 실행 제한

### 3. Constants

#### Languages.js

```javascript
export const LANGUAGE_JAVASCRIPT = 'javascript';
export const LANGUAGE_HTML = 'html';
export const LANGUAGE_CSS = 'css';
export const LANGUAGE_MARKDOWN = 'markdown';

export const EXTENSION_MAP = {
  '.js': LANGUAGE_JAVASCRIPT,
  '.html': LANGUAGE_HTML,
  '.css': LANGUAGE_CSS,
  '.md': LANGUAGE_MARKDOWN,
};
```

#### Themes.js

- VSCode Dark Theme 색상 정의
- 신택스 하이라이팅 색상 스키마
- keyword, string, comment, function 등

### 4. Models

#### FileNode

- 파일/폴더 트리 구조 표현
- 부모-자식 관계 관리
- 정렬, 경로 계산 기능
- type: 'file' | 'directory'

주요 메서드:

- `isFile()`, `isDirectory()`
- `addChild(childNode)`
- `getExtension()`
- `sortChildren()` - 폴더 우선, 이름순
- `getFullPath()`
- `getDepth()`

### 5. FileSystemService

**기능**: File System Access API를 사용한 로컬 파일 접근

주요 메서드:

- `selectDirectory()`: 디렉토리 선택 다이얼로그
- `#buildFileTree()`: 재귀적 파일 트리 생성
- `readFile()`: 파일 읽기 (캐싱)
- `writeFile()`: 파일 저장
- `invalidateCache()`: 캐시 무효화

특징:

- 숨김 파일/폴더 자동 제외
- node_modules, .git 등 제외
- 지원 확장자만 포함
- Map 기반 파일 캐싱

### 6. Sidebar Component

**기능**: 파일 탐색기 UI

주요 기능:

- 파일 트리 재귀 렌더링
- 폴더 확장/축소
- 파일 선택
- 이벤트 발행: 'request-open-folder', 'file-selected'

UI 요소:

- EXPLORER 헤더
- 📁 Open Folder 버튼
- 계층적 파일 트리
- 아이콘: 📂(확장), 📁(축소), 📜(.js), 🌐(.html), 🎨(.css), 📝(.md)

### 7. FileController

**기능**: 파일 관련 비즈니스 로직

주요 메서드:

- `openDirectory()`: 디렉토리 열기
- `openFile()`: 파일 열기
- `saveFile()`: 파일 저장
- `#detectLanguage()`: 확장자로 언어 감지

발행 이벤트:

- 'directory-opened'
- 'file-opened'
- 'file-saved'
- 'error'

### 8. Application (app.js)

**진입점**: 전체 애플리케이션 초기화

초기화 순서:

1. Services 생성
2. Controllers 생성
3. Views 생성
4. 이벤트 연결
5. 스타일 로드

이벤트 흐름:

```
Sidebar.click → 'request-open-folder'
    ↓
FileController.openDirectory()
    ↓
FileSystemService.selectDirectory()
    ↓
FileController.emit('directory-opened')
    ↓
Sidebar.render(rootNode)
```

---

## CSS 스타일링

### 테마 변수 (VSCode Dark)

```css
:root {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d30;
  --bg-hover: #2a2d2e;
  --bg-active: #37373d;

  --text-primary: #cccccc;
  --text-secondary: #969696;
  --text-accent: #4fc3f7;

  --border-color: #3e3e42;
  --focus-border: #007acc;
}
```

### 레이아웃

- Flexbox 기반
- Sidebar: 250px 고정폭
- TabBar: 35px 고정높이
- StatusBar: 22px 고정높이
- EditorContainer: flex 1 (나머지 공간)

---

## 이벤트 플로우

### 파일 열기

```
[User] 파일 클릭
    ↓
[Sidebar] 'file-selected' 이벤트
    ↓
[FileController] openFile(fileNode)
    ↓
[FileSystemService] readFile() + 캐싱
    ↓
[FileController] 'file-opened' 이벤트
    ↓
[Console] 파일 내용 출력 (Phase 1)
```

### 폴더 열기

```
[User] 📁 버튼 클릭
    ↓
[Sidebar] 'request-open-folder' 이벤트
    ↓
[FileController] openDirectory()
    ↓
[FileSystemService] selectDirectory() → 브라우저 다이얼로그
    ↓
[FileSystemService] buildFileTree() → 재귀 탐색
    ↓
[FileController] 'directory-opened' 이벤트
    ↓
[Sidebar] render(rootNode) → 트리 렌더링
```

---

## 코딩 컨벤션

### 네이밍

- Variable/Function/Method: camelCase
- Class: PascalCase
- Field: snake_case
- Private Field: \_snake_case
- Private Method: #camelCase
- Constant: SCREAMING_SNAKE_CASE
- HTML id: PascalCase
- HTML class: kebab-case

### 패턴

- import/export 사용
- export default만 사용
- 객체 접근: `object.property`
- enum: `const TYPE = 'value1' | 'value2'`
- 초기화는 객체 방식:

```javascript
// Good
const systems = { foo: null, bar: null };
systems.foo = new FooSystem();

// Bad
const systems = [];
systems.push(new FooSystem());
```

---

## Phase 1 완료 체크리스트

### 구현 완료

- ✅ 프로젝트 기본 구조
- ✅ EventEmitter (Observer 패턴)
- ✅ Debounce/Throttle 유틸
- ✅ Languages/Themes 상수
- ✅ FileNode 모델
- ✅ FileSystemService (File System Access API)
- ✅ Sidebar 컴포넌트
- ✅ FileController
- ✅ Application 초기화
- ✅ VSCode 스타일 CSS

### 테스트 방법

1. 로컬 서버 실행: `python -m http.server 8000`
2. 브라우저: `http://localhost:8000`
3. 📁 버튼으로 폴더 선택
4. 파일 클릭 → 콘솔에 내용 출력 확인

### 다음 단계 (Phase 2)

- [ ] Document 모델 (Rope 구조)
- [ ] EditorPane 컴포넌트
- [ ] TabBar 컴포넌트
- [ ] TabController
- [ ] 기본 텍스트 렌더링
- [ ] 커서 및 선택 영역

---

## 주요 기술 결정 사항

### File System Access API 사용

- **이유**: 브라우저 환경에서 Node.js fs 모듈 사용 불가
- **장점**: 로컬 파일 직접 읽기/쓰기 가능
- **단점**: Chrome/Edge만 지원 (Firefox 미지원)

### 객체 방식 초기화

- **이유**: 명시적 속성 관리, 타입 안정성
- **장점**: 속성 존재 여부 명확, 자동완성 지원
- **단점**: 초기 null 값 필요

### EventEmitter 패턴

- **이유**: 컴포넌트 간 느슨한 결합
- **장점**: 유지보수성, 확장성
- **단점**: 디버깅 복잡도 증가

### 파일 캐싱

- **이유**: 동일 파일 반복 읽기 방지
- **장점**: 성능 향상
- **단점**: 메모리 사용량 증가

---

## 알려진 제한사항

1. **브라우저 호환성**: File System Access API는 Chrome/Edge만 지원
2. **보안**: 사용자가 명시적으로 폴더 권한 부여 필요
3. **메모리**: 대용량 파일 캐싱 시 메모리 부족 가능
4. **동시성**: 파일 동시 수정 충돌 미처리 (Phase 1)

---

## 참고 자료

- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [VSCode Color Theme](https://code.visualstudio.com/api/references/theme-color)
- [Observer Pattern](https://refactoring.guru/design-patterns/observer)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
