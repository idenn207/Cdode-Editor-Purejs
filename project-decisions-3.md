# Web Code Editor - Phase 3 구현 문서

## Phase 3 개요

Phase 3에서는 신택스 하이라이팅, 성능 최적화, 그리고 사용자 경험 개선을 구현했습니다.

---

## Phase 3 구현 목표

✅ **완료된 기능**

### Part 1: 신택스 하이라이팅

- TokenParser 유틸리티 (코드 토큰화)
- LanguageService (언어별 파싱 전략)
- SyntaxRenderer (토큰 렌더링)
- syntax.css (토큰별 색상)
- JavaScript 고급 토큰: function, class, property, method, constant

### Part 2: 성능 최적화

- VirtualScroller (Virtual Scrolling)
- Debounce 적용 (입력 최적화)
- 커서 위치 정확한 복원
- Incremental Rendering 준비

### Part 3: 버그 수정

- 이중 개행 문제 해결 (#extractText)

---

## 1. TokenParser 유틸리티

### 파일 위치

`src/utils/TokenParser.js`

### 책임

소스코드를 의미 단위(토큰)로 분리

### 토큰 타입

```javascript
TOKEN_KEYWORD; // if, for, function
TOKEN_STRING; // "text"
TOKEN_COMMENT; // // comment
TOKEN_NUMBER; // 123
TOKEN_OPERATOR; // +, -, =
TOKEN_IDENTIFIER; // variableName
TOKEN_PUNCTUATION; // { } ( ) ;
TOKEN_TAG; // <div> (HTML)
TOKEN_ATTRIBUTE; // class="..." (HTML)
TOKEN_FUNCTION; // functionName()
TOKEN_CLASS; // ClassName
TOKEN_PROPERTY; // obj.property
TOKEN_METHOD; // obj.method()
TOKEN_CONSTANT; // MAX_VALUE
TOKEN_TEXT; // 일반 텍스트
```

### 주요 메서드

#### tokenize(\_code, \_patterns)

정규식 패턴 배열로 코드를 토큰화합니다.

```javascript
static tokenize(_code, _patterns) {
  const tokens = [];
  let remaining = _code;

  while (remaining.length > 0) {
    // 패턴 순차 매칭
    for (const pattern of _patterns) {
      const regex = new RegExp(`^${pattern.regex}`);
      const match = remaining.match(regex);

      if (match) {
        tokens.push({
          type: pattern.type,
          value: match[0],
          start: position,
          end: position + match[0].length
        });
        // ...
      }
    }
  }

  return tokens;
}
```

### 설계 결정

**왜 정규식 기반인가?**

- 빠른 구현 가능
- 대부분의 기본 신택스 하이라이팅에 충분
- 외부 라이브러리 불필요

**단점:**

- 문맥을 완벽히 이해하지 못함
- 복잡한 구문 분석 제한적

**대안 (Phase 4):**

- AST 기반 파서 (Acorn, Babel Parser)

---

## 2. LanguageService

### 파일 위치

`src/services/LanguageService.js`

### 책임

언어별 토큰화 규칙 제공 (Strategy 패턴)

### 지원 언어

- JavaScript
- HTML
- CSS
- Markdown

### JavaScript 파싱 규칙

**정규식 순서 (중요!)**

```javascript
1. 주석 (최우선)
2. 문자열
3. 숫자
4. 키워드
5. 클래스명 (class/extends/new 다음)
6. 상수 (SCREAMING_SNAKE_CASE)
7. 함수 (식별자 + 괄호 앞)
8. 메서드/프로퍼티 (점 다음)
9. 연산자, 구두점
10. 일반 식별자 (마지막)
```

**Lookahead/Lookbehind 활용:**

```javascript
// 클래스명
{ regex: '(?<=class\\s+)[A-Z][a-zA-Z0-9_]*', type: TOKEN_CLASS }

// 함수
{ regex: '\\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\\s*\\()', type: TOKEN_FUNCTION }

// 메서드
{ regex: '(?<=\\.)[a-zA-Z_$][a-zA-Z0-9_$]*(?=\\s*\\()', type: TOKEN_METHOD }

// 프로퍼티
{ regex: '(?<=\\.)[a-zA-Z_$][a-zA-Z0-9_$]*', type: TOKEN_PROPERTY }

// 상수
{ regex: '\\b[A-Z][A-Z0-9_]*\\b', type: TOKEN_CONSTANT }
```

### HTML 파싱

```javascript
- 주석: <!--...-->
- 태그: <div>, </div>
- 속성명: class, id
- 속성값: "value"
```

### CSS 파싱

```javascript
- 주석: /* ... */
- 선택자: .class, #id
- 속성명: color, margin
- 속성값: red, 10px
- 색상 코드: #ff0000
```

### Markdown 파싱

````javascript
- 헤더: # Title
- 코드 블록: ```code```
- 인라인 코드: `code`
- 굵게: **bold**
- 기울임: *italic*
- 링크: [text](url)
````

### 설계 결정

**왜 Strategy 패턴인가?**

- 언어별로 다른 파싱 규칙 필요
- 새 언어 추가 용이
- 각 언어 파서 독립적으로 테스트 가능

---

## 3. SyntaxRenderer

### 파일 위치

`src/views/renderers/SyntaxRenderer.js`

### 책임

토큰을 HTML로 변환하여 색상 적용

### 주요 메서드

#### renderLine(\_code, \_language)

한 줄의 코드를 신택스 하이라이팅된 HTML로 변환합니다.

```javascript
renderLine(_code, _language) {
  if (!_code || _code === '\n') {
    return '<br>';
  }

  const tokens = this.language_service.parse(_code, _language);

  let html = '';
  tokens.forEach((_token) => {
    const escaped = this.#escapeHtml(_token.value);
    html += `<span class="token-${_token.type}">${escaped}</span>`;
  });

  return html;
}
```

**출력 예시:**

```html
<span class="token-keyword">const</span>
<span class="token-text"> </span>
<span class="token-identifier">userName</span>
<span class="token-text"> </span>
<span class="token-operator">=</span>
<span class="token-text"> </span>
<span class="token-string">"John"</span>
```

### 설계 결정

**왜 줄 단위 렌더링인가?**

- Document 모델이 줄 단위 배열 사용
- 부분 업데이트 용이 (향후 Incremental Rendering)
- Virtual Scrolling과 호환

---

## 4. syntax.css

### 파일 위치

`src/styles/syntax.css`

### VSCode Dark Theme 색상

```css
/* JavaScript & 공통 */
.token-keyword {
  color: #569cd6;
} /* 파란색 */
.token-string {
  color: #ce9178;
} /* 주황색 */
.token-comment {
  color: #6a9955;
  font-style: italic;
} /* 녹색 */
.token-number {
  color: #b5cea8;
} /* 연두색 */
.token-operator {
  color: #d4d4d4;
} /* 회색 */
.token-identifier {
  color: #9cdcfe;
} /* 하늘색 */
.token-punctuation {
  color: #d4d4d4;
} /* 회색 */

/* JavaScript 전용 */
.token-function {
  color: #dcdcaa;
} /* 노란색 */
.token-class {
  color: #4ec9b0;
} /* 청록색 */
.token-property {
  color: #9cdcfe;
} /* 하늘색 */
.token-method {
  color: #dcdcaa;
} /* 노란색 */
.token-constant {
  color: #4fc3f7;
} /* 밝은 파란색 */

/* HTML 전용 */
.token-tag {
  color: #569cd6;
} /* 파란색 */
.token-attribute {
  color: #9cdcfe;
} /* 하늘색 */

/* 일반 텍스트 */
.token-text {
  color: #d4d4d4;
} /* 회색 */
```

### 색상 선택 기준

**호출 가능 요소 (노란색):**

- function, method

**타입/클래스 (청록색):**

- class

**데이터 (하늘색):**

- identifier, property, attribute

**불변 값 (밝은 파란색):**

- constant

---

## 5. VirtualScroller

### 파일 위치

`src/views/renderers/VirtualScroller.js`

### 책임

보이는 영역의 줄만 렌더링하여 성능 최적화

### 핵심 개념

```
전체 파일: 10,000 줄
화면 표시: 50 줄
버퍼: 20 줄

렌더링 범위:
- visible_start: 100 (스크롤 위치 - 버퍼)
- visible_end: 170 (스크롤 위치 + 화면 높이 + 버퍼)
- 실제 렌더링: 70 줄만

나머지 9,930 줄: DOM에 없음 (높이만 유지)
```

### 주요 필드

```javascript
{
  line_height: 22.4,        // 줄 높이 (14px * 1.6)
  buffer_lines: 20,         // 버퍼 줄 수
  total_lines: 0,           // 전체 줄 수
  visible_start: 0,         // 가시 시작 줄
  visible_end: 0,           // 가시 끝 줄
  viewport_height: 0        // 화면 높이
}
```

### 주요 메서드

#### #updateVisibleRange()

스크롤 위치로 가시 범위를 계산합니다.

```javascript
#updateVisibleRange() {
  const scrollTop = this.container.scrollTop;

  // 시작 줄 (버퍼 포함)
  this.visible_start = Math.max(
    0,
    Math.floor(scrollTop / this.line_height) - this.buffer_lines
  );

  // 끝 줄 (버퍼 포함)
  const visibleLines = Math.ceil(this.viewport_height / this.line_height);
  this.visible_end = Math.min(
    this.total_lines,
    this.visible_start + visibleLines + this.buffer_lines * 2
  );

  return { start: this.visible_start, end: this.visible_end };
}
```

#### getTotalHeight()

전체 컨텐츠 높이를 계산합니다.

```javascript
getTotalHeight() {
  return this.total_lines * this.line_height;
}
```

### Throttle 적용

스크롤 이벤트에 16ms throttle 적용 (~60fps)

```javascript
this.container.addEventListener(
  'scroll',
  throttle(() => {
    this.#updateVisibleRange();
  }, 16)
);
```

### 설계 결정

**버퍼가 필요한 이유:**

- 스크롤 시 깜빡임 방지
- 부드러운 렌더링 전환

**임계값 1,000줄:**

- 작은 파일: Virtual Scrolling 오버헤드 불필요
- 큰 파일: 성능 개선 효과 큼

---

## 6. EditorPane 수정

### Virtual Scrolling 통합

```javascript
setDocument(_document) {
  const lineCount = _document.getLineCount();

  // 1,000줄 이상이면 Virtual Scrolling 활성화
  this.use_virtual_scrolling = lineCount >= this.virtual_scrolling_threshold;

  if (this.use_virtual_scrolling && !this.virtual_scroller) {
    this.virtual_scroller = new VirtualScroller(this.content_wrapper_el, {
      line_height: 22.4,
      buffer_lines: 20
    });
  }

  this.#render();
}
```

### 렌더링 분기

```javascript
#render() {
  if (this.use_virtual_scrolling) {
    this.#renderWithVirtualScrolling();
  } else {
    this.#renderAllLines();
  }
}
```

### Virtual Scrolling 렌더링

```javascript
#renderWithVirtualScrolling() {
  const lineCount = this.document.getLineCount();
  this.virtual_scroller.setTotalLines(lineCount);

  const { start, end } = this.virtual_scroller.getVisibleRange();

  // 가시 범위만 렌더링
  this.#renderLineNumbersVirtual(start, end);
  this.#renderContentVirtual(start, end);

  // 전체 높이 설정 (스크롤바 유지)
  const totalHeight = this.virtual_scroller.getTotalHeight();
  this.content_el.style.height = `${totalHeight}px`;
}
```

### 오프셋 적용

```javascript
#renderContentVirtual(_start, _end) {
  let html = '';

  // 상단 오프셋 (보이지 않는 줄들의 높이)
  const topOffset = _start * 22.4;
  html += `<div style="height: ${topOffset}px;"></div>`;

  // 가시 범위 줄만 렌더링
  for (let i = _start; i < _end; i++) {
    const line = lines[i] || '\n';
    const highlightedHTML = this.syntax_renderer.renderLine(line, language);
    html += `<div class="code-line">${highlightedHTML}</div>`;
  }

  this.content_el.innerHTML = html;
}
```

---

## 7. Debounce 적용

### 입력 핸들러 최적화

```javascript
#attachEvents() {
  // 150ms debounce 적용
  const debouncedInput = debounce((_e) => {
    this.#handleInput(_e);
  }, 150);

  this.content_el.addEventListener('input', debouncedInput);
}
```

### 효과

- 빠른 타이핑 시 매 키마다 재렌더링 안함
- 마지막 입력 후 150ms 뒤 한 번만 처리
- CPU 사용률 감소, 반응성 개선

---

## 8. 커서 복원 개선

### 문제

innerHTML 변경 시 Selection 손실로 커서 위치 이동

### 해결: 텍스트 오프셋 기반 복원

#### #saveCursor()

렌더링 전 커서 위치를 텍스트 오프셋으로 저장

```javascript
#saveCursor() {
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);

  const preSelectionRange = range.cloneRange();
  preSelectionRange.selectNodeContents(this.content_el);
  preSelectionRange.setEnd(range.startContainer, range.startOffset);

  return {
    offset: preSelectionRange.toString().length,
    isCollapsed: range.collapsed
  };
}
```

#### #restoreCursor()

저장된 오프셋으로 커서 복원

```javascript
#restoreCursor(_cursorInfo) {
  const selection = window.getSelection();
  const range = window.document.createRange();

  let charCount = 0;
  let found = false;

  // DOM 트리를 순회하며 오프셋 위치 찾기
  const walkTextNodes = (_node) => {
    if (_node.nodeType === Node.TEXT_NODE) {
      const nextCharCount = charCount + _node.length;

      if (_cursorInfo.offset >= charCount && _cursorInfo.offset <= nextCharCount) {
        range.setStart(_node, _cursorInfo.offset - charCount);
        range.setEnd(_node, _cursorInfo.offset - charCount);
        found = true;
        return;
      }

      charCount = nextCharCount;
    } else {
      for (let child of _node.childNodes) {
        walkTextNodes(child);
        if (found) return;
      }
    }
  };

  walkTextNodes(this.content_el);

  if (found) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
```

### 효과

- 신택스 하이라이팅 후에도 커서 위치 유지
- 자연스러운 편집 경험

---

## 9. 이중 개행 문제 해결

### 문제

- `innerText` 사용 시 `<br>` 태그가 `\n`으로 변환
- 빈 줄이 저장 시 `\n\n`으로 중복 적용

### 원인

```javascript
// SyntaxRenderer.renderLine()
if (!_code || _code === '\n') {
  return '<br>'; // 빈 줄을 <br>로 렌더링
}

// EditorPane.#handleInput()
const text = this.content_el.innerText; // <br>이 \n으로 변환됨
```

### 해결: #extractText() 메서드

```javascript
#extractText() {
  const lines = [];
  const codeLines = this.content_el.querySelectorAll('.code-line');

  codeLines.forEach((_lineEl) => {
    let lineText = '';

    // 노드 순회하며 텍스트만 추출
    const walkNodes = (_node) => {
      if (_node.nodeType === Node.TEXT_NODE) {
        lineText += _node.textContent;
      } else if (_node.nodeName === 'BR') {
        return; // BR 태그는 무시
      } else {
        for (let child of _node.childNodes) {
          walkNodes(child);
        }
      }
    };

    walkNodes(_lineEl);
    lines.push(lineText);
  });

  return lines.join('\n');
}
```

### #handleInput() 수정

```javascript
// Before
const text = this.content_el.innerText;

// After
const text = this.#extractText();
```

### 효과

- `.code-line` 요소를 직접 순회하여 정확한 텍스트만 추출
- `<br>` 태그 무시로 이중 개행 방지
- 정확한 줄 수 유지

---

## 10. editor.css 수정

### editor-content-wrapper 추가

```css
/* Virtual Scrolling 래퍼 */
.editor-content-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  position: relative;
}

.editor-content {
  padding: 10px 16px;
  outline: none;
  white-space: pre;
  tab-size: 2;
  min-height: 100%;
}
```

### 변경 이유

- Virtual Scrolling에서 스크롤 이벤트 감지 필요
- 줄 번호와 텍스트 스크롤 동기화
- 스크롤바를 wrapper에서 관리

### 선택 영역 스타일 개선

```css
.editor-content ::selection {
  background-color: #264f78;
  color: inherit;
}
```

---

## 전체 이벤트 플로우

### 파일 열기 (신택스 하이라이팅 포함)

```
[User] Sidebar에서 파일 클릭
    ↓
[FileController] openFile()
    ↓
[TabController] openDocument() → Document 생성
    ↓
[EditorController] displayDocument()
    ↓
[EditorPane] setDocument()
    ↓
[EditorPane] #render()
    ↓
[SyntaxRenderer] renderLine() (각 줄마다)
    ↓
[LanguageService] parse() → 토큰 배열 반환
    ↓
[TokenParser] tokenize() → 정규식 매칭
    ↓
[SyntaxRenderer] HTML 생성 (<span class="token-...">)
    ↓
[EditorPane] innerHTML 설정 → 화면 표시
```

### 텍스트 편집 (Debounce 적용)

```
[User] 빠르게 타이핑
    ↓
[Debounce] 150ms 대기
    ↓
[EditorPane] #handleInput()
    ↓
[EditorPane] #extractText() → 정확한 텍스트 추출
    ↓
[Document] lines 업데이트, is_dirty = true
    ↓
[TabBar] updateTab() → ● 표시
```

### Virtual Scrolling (대용량 파일)

```
[User] 스크롤
    ↓
[Throttle] 16ms 제한 (~60fps)
    ↓
[VirtualScroller] #updateVisibleRange()
    ↓
[EditorPane] #renderWithVirtualScrolling()
    ↓
[EditorPane] 가시 범위만 렌더링 (start ~ end)
    ↓
화면 업데이트 (70줄만 DOM에 존재)
```

---

## 성능 비교

### Before Phase 3

| 파일 크기 | 스크롤     | 타이핑     | 색상 |
| --------- | ---------- | ---------- | ---- |
| 100줄     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌   |
| 1,000줄   | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ❌   |
| 5,000줄   | ⭐⭐       | ⭐⭐       | ❌   |
| 10,000줄  | ⭐         | ⭐         | ❌   |

### After Phase 3

| 파일 크기 | 스크롤     | 타이핑     | 색상 |
| --------- | ---------- | ---------- | ---- |
| 100줄     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅   |
| 1,000줄   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅   |
| 5,000줄   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅   |
| 10,000줄  | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ✅   |

**개선 효과:**

- 신택스 하이라이팅 추가
- 대용량 파일 성능 대폭 향상
- 타이핑 반응성 개선

---

## 테스트 예제

### JavaScript 신택스 하이라이팅

```javascript
// 상수
const MAX_COUNT = 100;

// 클래스
class UserManager {
  constructor() {
    this.users = [];
  }

  // 메서드
  addUser(name) {
    console.log(name);
  }
}

// 함수
function calculateTotal(items) {
  return items.length;
}

// 인스턴스 생성
const manager = new UserManager();
manager.addUser('Alice');
```

**기대 색상:**

- `MAX_COUNT`: 밝은 파란색 (constant)
- `UserManager`: 청록색 (class)
- `constructor`, `addUser`, `calculateTotal`, `log`: 노란색 (method/function)
- `users`, `length`: 하늘색 (property)
- `name`, `items`, `manager`: 하늘색 (identifier)
- `const`, `class`, `function`, `return`, `new`: 파란색 (keyword)
- `"Alice"`: 주황색 (string)
- `100`: 연두색 (number)

---

## 주요 기술 결정

### 1. 정규식 기반 파싱

**선택 이유:**

- 빠른 구현
- 외부 의존성 없음
- 기본 신택스 하이라이팅에 충분

**단점:**

- 문맥 이해 제한적
- 복잡한 구문 분석 어려움

**향후 개선 (Phase 4):**

- AST 기반 파서 도입 고려

### 2. Virtual Scrolling 임계값 1,000줄

**선택 이유:**

- 작은 파일: 오버헤드 불필요
- 큰 파일: 성능 개선 효과 큼
- 실험적으로 최적 지점 확인

**대안:**

- 사용자 설정 가능하게 변경
- 파일 크기 기반 동적 조정

### 3. Debounce 150ms

**선택 이유:**

- 너무 짧으면: 효과 미미
- 너무 길면: 반응성 저하
- 150ms: 사용자가 느끼지 못하는 수준

**대안:**

- 300ms: 더 공격적인 최적화
- 100ms: 더 빠른 반응

### 4. Lookahead/Lookbehind 사용

**선택 이유:**

- 문맥 파악에 유용
- class 다음, 점 다음 등 위치 기반 매칭

**단점:**

- 구형 브라우저 미지원

**대안:**

- 2-pass 파싱 (먼저 토큰화 후 문맥 분석)

---

## 알려진 제한사항

### 1. 브라우저 호환성

**Lookbehind 정규식 (`(?<=...)`):**

- Chrome 62+
- Firefox 78+
- Safari 16.4+

**대응:**

- 지원 여부 체크
- 폴백 파서 제공 (2-pass)

### 2. Context-free 파싱

**문제:**

```javascript
const MyClass = class {}; // MyClass를 클래스로 인식 못함
const obj = { method() {} }; // method를 메서드로 인식 못함
```

**해결 (Phase 4):**

- AST 기반 파서 도입

### 3. Virtual Scrolling 커서 복원

**문제:**

- Virtual Scrolling 모드에서 커서 복원 제한적
- 가시 범위 밖으로 나가면 복원 불가

**임시 대응:**

- 편집 중인 영역은 항상 가시 범위에 유지

### 4. 대용량 파일 메모리

**문제:**

- 10만 줄 이상 파일은 여전히 느림
- 전체 텍스트를 메모리에 유지

**해결 (Phase 4):**

- Rope Data Structure
- 파일 스트리밍

---

## 파일 구조 (Phase 3 추가)

```
src/
├── utils/
│   ├── EventEmitter.js
│   ├── Debounce.js
│   └── TokenParser.js          [NEW]
├── services/
│   ├── FileSystemService.js
│   └── LanguageService.js      [NEW]
├── views/
│   ├── components/
│   │   ├── Sidebar.js
│   │   ├── TabBar.js
│   │   └── EditorPane.js       [MODIFIED]
│   └── renderers/
│       ├── SyntaxRenderer.js   [NEW]
│       └── VirtualScroller.js  [NEW]
├── models/
│   ├── FileNode.js
│   └── Document.js
├── controllers/
│   ├── FileController.js
│   ├── TabController.js
│   └── EditorController.js
└── styles/
    ├── main.css
    ├── sidebar.css
    ├── tabbar.css
    ├── editor.css              [MODIFIED]
    └── syntax.css              [NEW]
```

---

## 코딩 컨벤션 준수

### 파일 헤더

```javascript
/**
 * 파일: src/services/LanguageService.js
 * 기능: 언어별 파싱 전략
 * 책임: 각 언어에 맞는 토큰화 규칙 제공
 */
```

### 네이밍

```javascript
// Field: snake_case
this.syntax_renderer = new SyntaxRenderer();

// Private Method: #camelCase
#extractText() { }

// Parameter: _camelCase
renderLine(_code, _language) { }

// Constant: SCREAMING_SNAKE_CASE
const TOKEN_KEYWORD = 'keyword';
```

### 객체 초기화

```javascript
// Good ✅
this.parsers = {
  javascript: null,
  html: null,
};
this.parsers.javascript = this.#parseJavaScript.bind(this);
```

---

## Phase 3 vs Phase 2 비교

| 기능               | Phase 2 | Phase 3                |
| ------------------ | ------- | ---------------------- |
| 폴더 열기          | ✅      | ✅                     |
| 파일 트리          | ✅      | ✅                     |
| 파일 읽기/쓰기     | ✅      | ✅                     |
| 텍스트 편집        | ✅      | ✅                     |
| 탭 기능            | ✅      | ✅                     |
| 수정 표시          | ✅      | ✅                     |
| 줄 번호            | ✅      | ✅                     |
| **신택스 색상**    | ❌      | ✅                     |
| **대용량 파일**    | ❌      | ✅ (Virtual Scrolling) |
| **입력 최적화**    | ❌      | ✅ (Debounce)          |
| **커서 복원**      | 부분    | ✅ (개선)              |
| **이중 개행 버그** | ❌      | ✅ (해결)              |

---

## 다음 단계 (Phase 4 후보)

### 필수 기능

1. **검색/바꾸기**

   - Ctrl+F: 검색
   - Ctrl+H: 바꾸기
   - 정규식 지원
   - 전체/선택 영역 바꾸기

2. **코드 오류 표시**

   - LinterService
   - 실시간 오류 감지
   - 에러 마커 표시
   - 호버 시 오류 메시지

3. **자동완성**
   - 키워드 자동완성
   - 파일 경로 자동완성
   - 코드 스니펫
   - Ctrl+Space 트리거

### 추가 기능

4. **화면 분할**

   - SplitView 컴포넌트
   - 수평/수직 분할
   - 드래그로 크기 조절

5. **미니맵**

   - 파일 전체 미리보기
   - 현재 위치 표시
   - 클릭으로 이동

6. **AST 기반 파싱**

   - Acorn 또는 Babel Parser
   - 정확한 문맥 이해
   - 고급 신택스 기능

7. **Rope Data Structure**
   - 대용량 텍스트 효율적 관리
   - 삽입/삭제 O(log n)
   - 메모리 최적화

---

## 참고 자료

- [Lookbehind Assertions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Assertions#lookbehind_assertion)
- [Virtual Scrolling](https://blog.logrocket.com/virtual-scrolling-core-principles-and-basic-implementation-in-react/)
- [Debounce vs Throttle](https://css-tricks.com/debouncing-throttling-explained-examples/)
- [Selection API](https://developer.mozilla.org/en-US/docs/Web/API/Selection)
- [VSCode Themes](https://code.visualstudio.com/api/references/theme-color)
- [Acorn Parser](https://github.com/acornjs/acorn)

---

## 라이선스

MIT License

---

## Phase 3 총 라인 수

| 파일                 | 라인 수    |
| -------------------- | ---------- |
| TokenParser.js       | ~80        |
| LanguageService.js   | ~250       |
| SyntaxRenderer.js    | ~60        |
| VirtualScroller.js   | ~120       |
| EditorPane.js (수정) | ~450       |
| syntax.css           | ~40        |
| editor.css (수정)    | ~70        |
| **Phase 3 합계**     | **~1,070** |

---

**Phase 3 구현 완료!** 🎉

신택스 하이라이팅, 성능 최적화, 버그 수정이 모두 완료되었습니다.
