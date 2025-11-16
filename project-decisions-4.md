# Web Code Editor - Phase 4 구현 문서

## Phase 4 개요

Phase 4에서는 검색/바꾸기 기능과 키보드 단축키 시스템을 구현했습니다.

---

## Phase 4 구현 목표

✅ **완료된 기능**

### Part 1: 검색/바꾸기 기능

- SearchService (검색 엔진)
- SearchPanel 컴포넌트 (UI)
- 정규식 지원
- 대소문자 구분 옵션
- 전체 바꾸기 기능
- 키보드 단축키 (Ctrl+F, Ctrl+H)

### Part 2: 키보드 단축키 시스템

- KeyBindingManager (단축키 관리)
- 글로벌 키보드 이벤트 처리
- 입력 요소 필터링

### Part 3: 버그 수정

- 검색창 포커스 이동 문제
- 붙여넣기 중복/줄바꿈 문제
- 신택스 하이라이팅 색상 수정
- Ctrl+W 브라우저 충돌 해결

---

## 1. SearchService 구현

### 파일 위치

`src/services/SearchService.js`

### 책임

텍스트 검색 및 바꾸기 로직

### 주요 메서드

#### search(\_text, \_query, \_options)

```javascript
/**
 * 텍스트에서 쿼리 검색
 * @param {string} _text - 검색할 텍스트
 * @param {string} _query - 검색어
 * @param {object} _options - { caseSensitive, wholeWord, regex }
 * @returns {Array} - [{ line, column, length, match }]
 */
```

**옵션:**

- `caseSensitive`: 대소문자 구분
- `wholeWord`: 단어 단위 검색
- `regex`: 정규식 모드

**검색 알고리즘:**

1. 일반 검색: `indexOf()` 사용
2. 정규식 검색: `RegExp.exec()` 사용
3. 단어 단위: 앞뒤 문자 확인

#### replace(\_text, \_query, \_replacement, \_options)

```javascript
/**
 * 전체 바꾸기
 * @returns {object} - { newText, count }
 */
```

**동작:**

1. 검색 결과 배열 생성
2. 뒤에서부터 바꾸기 (인덱스 유지)
3. 변경된 텍스트와 개수 반환

#### replaceOne(\_text, \_result, \_replacement)

```javascript
/**
 * 하나만 바꾸기
 */
```

#### validateRegex(\_pattern)

```javascript
/**
 * 정규식 검증
 * @returns {object} - { valid, error }
 */
```

### 설계 결정

**왜 줄 단위 결과인가?**

- Document 모델이 줄 단위 배열 사용
- 에디터에서 줄 번호 표시 용이
- 검색 결과로 스크롤 시 줄 인덱스 필요

**왜 뒤에서부터 바꾸기인가?**

- 앞에서부터 바꾸면 인덱스가 변경됨
- 뒤에서부터 바꾸면 앞쪽 인덱스 유지

---

## 2. SearchPanel 컴포넌트

### 파일 위치

`src/views/components/SearchPanel.js`

### 책임

검색/바꾸기 UI

### HTML 구조

```html
<div class="search-panel">
  <div class="search-row">
    <input type="text" class="search-input" placeholder="찾기..." />
    <button id="PrevButton">◀</button>
    <button id="NextButton">▶</button>
    <button id="CloseButton">✕</button>
  </div>
  <div class="replace-row">
    <input type="text" class="replace-input" placeholder="바꾸기..." />
    <button id="ReplaceOneButton">바꾸기</button>
    <button id="ReplaceAllButton">전체 바꾸기</button>
  </div>
  <div class="options-row">
    <label>
      <input type="checkbox" id="CaseSensitiveCheckbox" />
      <span>Aa</span> 대소문자 구분
    </label>
    <label>
      <input type="checkbox" id="WholeWordCheckbox" />
      <span>Ab</span> 단어 단위
    </label>
    <label>
      <input type="checkbox" id="RegexCheckbox" />
      <span>.*</span> 정규식
    </label>
  </div>
  <div class="results-info">3 of 10 results</div>
</div>
```

### 주요 메서드

#### show() / hide()

패널 표시/숨김

#### setMode(\_mode)

'search' | 'replace' 모드 전환

#### updateResults(\_results, \_currentIndex)

검색 결과 정보 업데이트 ("3 of 10 results")

#### #onSearchChanged()

검색어 또는 옵션 변경 시 이벤트 발행

#### #findNext() / #findPrevious()

다음/이전 결과 찾기 이벤트 발행

#### #replaceOne() / #replaceAll()

바꾸기 이벤트 발행

### 발행 이벤트

- `search-changed`: 검색어/옵션 변경
- `find-next`: 다음 찾기
- `find-previous`: 이전 찾기
- `replace-one`: 하나 바꾸기
- `replace-all`: 전체 바꾸기
- `close-requested`: 패널 닫기

### 키보드 단축키

- `Enter`: 다음 찾기
- `Shift+Enter`: 이전 찾기
- `Escape`: 패널 닫기

---

## 3. EditorPane 수정 (검색 하이라이트)

### 검색 관련 필드 추가

```javascript
constructor(_containerId) {
  // ... 기존 코드
  this.search_results = [];
  this.search_current_index = -1;
}
```

### 주요 메서드

#### highlightSearchResults(\_results, \_currentIndex)

```javascript
/**
 * 검색 결과 하이라이트
 */
highlightSearchResults(_results, _currentIndex) {
  this.search_results = _results;
  this.search_current_index = _currentIndex;
  this.#render();

  // 현재 결과로 스크롤
  if (_currentIndex >= 0 && _currentIndex < _results.length) {
    this.#scrollToSearchResult(_results[_currentIndex]);
  }
}
```

#### clearSearchHighlights()

```javascript
/**
 * 검색 하이라이트 제거
 */
clearSearchHighlights() {
  this.search_results = [];
  this.search_current_index = -1;
  this.#render();
}
```

#### #scrollToSearchResult(\_result)

```javascript
/**
 * 검색 결과로 스크롤
 */
#scrollToSearchResult(_result) {
  const lineHeight = 22.4;
  const scrollTop = _result.line * lineHeight;
  this.content_wrapper_el.scrollTop = scrollTop - 100;
}
```

### SyntaxRenderer 통합

renderLine()에 검색 옵션 추가:

```javascript
renderLine(_code, _language, _options = {}) {
  // _options: { searchResults, currentIndex, lineIndex }

  // 검색 결과 하이라이트 적용
  if (_options.searchResults && _options.lineIndex !== undefined) {
    const lineResults = _options.searchResults.filter(
      _r => _r.line === _options.lineIndex
    );

    lineResults.forEach(_result => {
      // 토큰 내에 검색 결과 포함 시 하이라이트 적용
      const isCurrent = _options.currentIndex !== undefined &&
        _options.searchResults[_options.currentIndex] === _result;

      const highlightClass = isCurrent ?
        'search-highlight-current' : 'search-highlight';

      // HTML에 하이라이트 span 추가
    });
  }
}
```

---

## 4. EditorController 통합

### 검색 관련 필드 추가

```javascript
constructor(_tabController, _fileSystemService) {
  super();
  // ... 기존 코드

  this.searchService = new SearchService();
  this.search_panel = null;
  this.current_search_results = [];
  this.current_search_index = -1;
}
```

### 주요 메서드

#### setSearchPanel(\_searchPanel)

SearchPanel 연결 및 이벤트 설정

```javascript
setSearchPanel(_searchPanel) {
  this.search_panel = _searchPanel;

  this.search_panel.on('search-changed', (_query, _options) => {
    this.#performSearch(_query, _options);
  });

  this.search_panel.on('find-next', () => {
    this.#findNext();
  });

  this.search_panel.on('find-previous', () => {
    this.#findPrevious();
  });

  this.search_panel.on('replace-one', (_replacement) => {
    this.#replaceOne(_replacement);
  });

  this.search_panel.on('replace-all', (_query, _replacement, _options) => {
    this.#replaceAll(_query, _replacement, _options);
  });

  this.search_panel.on('close-requested', () => {
    this.editorPane.clearSearchHighlights();
    this.current_search_results = [];
    this.current_search_index = -1;
  });
}
```

#### showSearch() / showReplace()

검색/바꾸기 패널 표시

```javascript
showSearch() {
  if (!this.search_panel) return;
  this.search_panel.show();
  this.search_panel.setMode('search');
  this.search_panel.focus();
}
```

#### #performSearch(\_query, \_options)

검색 수행

```javascript
#performSearch(_query, _options) {
  if (!this.current_document || !_query) {
    this.current_search_results = [];
    this.current_search_index = -1;
    this.editorPane.clearSearchHighlights();
    this.search_panel.updateResults([], -1);
    return;
  }

  // 정규식 검증
  if (_options.regex) {
    const validation = this.searchService.validateRegex(_query);
    if (!validation.valid) {
      console.error('잘못된 정규식:', validation.error);
      return;
    }
  }

  const text = this.current_document.getText();
  this.current_search_results = this.searchService.search(text, _query, _options);

  if (this.current_search_results.length > 0) {
    this.current_search_index = 0;
  } else {
    this.current_search_index = -1;
  }

  this.editorPane.highlightSearchResults(
    this.current_search_results,
    this.current_search_index
  );
  this.search_panel.updateResults(
    this.current_search_results,
    this.current_search_index
  );
}
```

#### #findNext() / #findPrevious()

다음/이전 결과로 이동

```javascript
#findNext() {
  if (this.current_search_results.length === 0) return;

  this.current_search_index =
    (this.current_search_index + 1) % this.current_search_results.length;

  this.editorPane.highlightSearchResults(
    this.current_search_results,
    this.current_search_index
  );
  this.search_panel.updateResults(
    this.current_search_results,
    this.current_search_index
  );
}
```

#### #replaceOne(\_replacement)

현재 결과 하나만 바꾸기

```javascript
#replaceOne(_replacement) {
  if (!this.current_document || this.current_search_results.length === 0) return;
  if (this.current_search_index < 0) return;

  const result = this.current_search_results[this.current_search_index];
  const oldText = this.current_document.getText();
  const newText = this.searchService.replaceOne(oldText, result, _replacement);

  this.current_document.content = newText;
  this.current_document.lines = newText.split('\n');
  this.current_document.is_dirty = true;

  // 검색 다시 수행
  const lastSearch = this.searchService.getLastSearch();
  if (lastSearch) {
    this.#performSearch(lastSearch.query, lastSearch.options);
  }
}
```

#### #replaceAll(\_query, \_replacement, \_options)

전체 바꾸기

```javascript
#replaceAll(_query, _replacement, _options) {
  if (!this.current_document || !_query) return;

  const oldText = this.current_document.getText();
  const result = this.searchService.replace(oldText, _query, _replacement, _options);

  if (result.count === 0) {
    alert('바꿀 항목이 없습니다.');
    return;
  }

  this.current_document.content = result.newText;
  this.current_document.lines = result.newText.split('\n');
  this.current_document.is_dirty = true;

  this.current_search_results = [];
  this.current_search_index = -1;
  this.editorPane.clearSearchHighlights();
  this.search_panel.updateResults([], -1);

  this.emit('status-message', `${result.count}개 항목을 바꿨습니다.`);
}
```

---

## 5. KeyBindingManager 구현

### 파일 위치

`src/utils/KeyBindingManager.js`

### 책임

글로벌 키보드 단축키 관리

### 주요 메서드

#### register(\_key, \_callback)

단축키 등록

```javascript
/**
 * @param {string} _key - 'ctrl+f', 'ctrl+shift+p' 등
 * @param {function} _callback - 실행할 함수
 */
register(_key, _callback) {
  const normalizedKey = this.#normalizeKey(_key);
  this.bindings.set(normalizedKey, _callback);
}
```

#### #handleKeyDown(\_e)

키 이벤트 처리

```javascript
#handleKeyDown(_e) {
  // 입력 요소에서는 단축키 무시
  const target = _e.target;
  const tagName = target.tagName.toLowerCase();

  if (tagName === 'input' || tagName === 'textarea') {
    if (!_e.ctrlKey && !_e.metaKey) {
      return;
    }
  }

  const keyString = this.#getKeyString(_e);
  const callback = this.bindings.get(keyString);

  if (callback) {
    _e.preventDefault();
    callback(_e);
  }
}
```

#### #getKeyString(\_e)

이벤트에서 키 문자열 생성

```javascript
#getKeyString(_e) {
  const parts = [];

  if (_e.ctrlKey || _e.metaKey) parts.push('ctrl');
  if (_e.altKey) parts.push('alt');
  if (_e.shiftKey) parts.push('shift');

  let key = _e.key.toLowerCase();

  // 특수 키 매핑
  const specialKeys = {
    ' ': 'space',
    enter: 'enter',
    escape: 'escape',
    // ...
  };

  if (specialKeys[key]) {
    key = specialKeys[key];
  }

  parts.push(key);
  return parts.join('+');
}
```

#### #normalizeKey(\_key)

키 문자열 정규화

```javascript
#normalizeKey(_key) {
  const parts = _key.toLowerCase().split('+');
  const modifiers = [];
  let mainKey = '';

  parts.forEach(_part => {
    if (['ctrl', 'alt', 'shift'].includes(_part)) {
      modifiers.push(_part);
    } else {
      mainKey = _part;
    }
  });

  // 수정자 키 정렬 (일관성)
  modifiers.sort();

  return [...modifiers, mainKey].join('+');
}
```

### 설계 결정

**왜 전역 리스너인가?**

- 모든 키보드 이벤트를 한 곳에서 관리
- 중복 등록 방지
- 우선순위 제어 용이

**왜 입력 요소를 필터링하는가?**

- 검색창 등에서 일반 타이핑 가능
- Ctrl 조합만 허용하여 저장 등은 동작

---

## 6. app.js 통합

### SearchPanel 추가

```javascript
async initialize() {
  // ... 기존 코드

  this.views.searchPanel = new SearchPanel('EditorContainer');

  this.controllers.editor.setSearchPanel(this.views.searchPanel);

  this.keyBindings = new KeyBindingManager();

  this.#setupKeyBindings();

  // ... 나머지 코드
}
```

### 키보드 단축키 설정

```javascript
#setupKeyBindings() {
  // 검색
  this.keyBindings.register('ctrl+f', () => {
    this.controllers.editor.showSearch();
  });

  // 바꾸기
  this.keyBindings.register('ctrl+h', () => {
    this.controllers.editor.showReplace();
  });

  // 저장
  this.keyBindings.register('ctrl+s', () => {
    const doc = this.controllers.editor.getCurrentDocument();
    if (doc) {
      this.controllers.editor.saveDocument(doc);
    }
  });

  // 전체 저장
  this.keyBindings.register('ctrl+shift+s', () => {
    this.controllers.editor.saveAllDocuments();
  });

  // 폴더 열기
  this.keyBindings.register('ctrl+o', () => {
    this.controllers.file.openDirectory();
  });

  console.log('⌨️ 키보드 단축키 등록 완료:', this.keyBindings.getBindings());
}
```

### 스타일 로드

```javascript
async #loadStyles() {
  const styles = ['sidebar', 'tabbar', 'editor', 'syntax', 'search-panel'];

  for (const style of styles) {
    const link = window.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `src/styles/${style}.css`;
    window.document.head.appendChild(link);
  }
}
```

---

## 7. CSS 스타일

### search-panel.css

```css
.search-panel {
  position: absolute;
  top: var(--tabbar-height);
  right: 20px;
  width: 420px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.search-input,
.replace-input {
  flex: 1;
  padding: 6px 8px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  color: var(--text-primary);
  font-size: 13px;
}

.search-input:focus,
.replace-input:focus {
  outline: none;
  border-color: var(--focus-border);
}

.search-button {
  padding: 6px 12px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.1s;
}

.search-button:hover {
  background-color: var(--bg-hover);
}

.options-row {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 12px;
}

.results-info {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: right;
  min-height: 16px;
}

.search-highlight {
  background-color: rgba(255, 255, 0, 0.3);
  border-radius: 2px;
}

.search-highlight-current {
  background-color: rgba(255, 165, 0, 0.5);
  outline: 1px solid #ff8c00;
  border-radius: 2px;
}
```

---

## 8. 버그 수정

### 문제 1: 검색창 입력 시 에디터 포커스 이동

**원인:** KeyBindingManager가 모든 keydown 이벤트 캡처

**해결:** 입력 요소에서 단축키 무시

```javascript
// KeyBindingManager.js
#handleKeyDown(_e) {
  const target = _e.target;
  const tagName = target.tagName.toLowerCase();

  if (tagName === 'input' || tagName === 'textarea') {
    if (!_e.ctrlKey && !_e.metaKey) {
      return; // 일반 타이핑은 무시
    }
  }

  // ... 단축키 처리
}
```

### 문제 2: 붙여넣기 시 중복/줄바꿈 문제

**원인:**

1. contenteditable에 서식 포함 HTML 삽입
2. #extractText가 중첩 .code-line 처리 못함

**해결:**

#### EditorPane - paste 이벤트 처리

```javascript
#attachEvents() {
  // 붙여넣기 이벤트
  this.content_el.addEventListener('paste', (_e) => {
    this.#handlePaste(_e);
  });
}

#handlePaste(_e) {
  _e.preventDefault();

  // 순수 텍스트만 가져오기
  const text = _e.clipboardData.getData('text/plain');

  if (!text) return;

  // execCommand로 텍스트만 삽입
  window.document.execCommand('insertText', false, text);
}
```

#### EditorPane - #extractText 개선

```javascript
#extractText() {
  const lines = [];

  // 최상위 .code-line만 선택 (중첩 방지)
  const codeLines = this.content_el.querySelectorAll(':scope > .code-line');

  codeLines.forEach(_lineEl => {
    let lineText = '';

    const extractTextFromNode = _node => {
      if (_node.nodeType === Node.TEXT_NODE) {
        lineText += _node.textContent;
      } else if (_node.nodeType === Node.ELEMENT_NODE) {
        if (_node.nodeName === 'BR') {
          return; // BR 무시
        }

        for (let child of _node.childNodes) {
          extractTextFromNode(child);
        }
      }
    };

    extractTextFromNode(_lineEl);
    lines.push(lineText);
  });

  return lines.join('\n');
}
```

#### EditorPane - #handleInput 중복 방지

```javascript
#handleInput(_e) {
  if (!this.document) return;

  const text = this.#extractText();

  if (this.is_rendering) return;

  // 중복 업데이트 방지
  const currentText = this.document.getText();
  if (text === currentText) {
    return;
  }

  this.document.content = text;
  this.document.lines = text.split('\n');

  if (!this.document.is_dirty) {
    this.document.is_dirty = true;
    this.emit('content-changed', {
      document: this.document,
      text: text,
    });
  }
}
```

### 문제 3: 신택스 하이라이팅 색상

**요구사항:**

- 클래스명 (UserManager): 청록색
- 제어 키워드 (import/export/default/continue/break): 보라색
- 여러 줄 주석: 녹색

**해결:**

#### TokenParser - 제어 키워드 토큰 추가

```javascript
export const TOKEN_KEYWORD_CONTROL = 'keyword-control';
```

#### LanguageService - 파싱 순서 조정

```javascript
#parseJavaScript(_code) {
  const patterns = [
    // 주석 (여러 줄) - 개선된 정규식
    { regex: '/\\*[\\s\\S]*?\\*/', type: TOKEN_COMMENT },
    // 주석 (한 줄)
    { regex: '//.*', type: TOKEN_COMMENT },

    // 문자열
    { regex: '"(?:[^"\\\\]|\\\\.)*"', type: TOKEN_STRING },
    { regex: "'(?:[^'\\\\]|\\\\.)*'", type: TOKEN_STRING },
    { regex: '`(?:[^`\\\\]|\\\\.)*`', type: TOKEN_STRING },

    // 숫자
    { regex: '\\b\\d+\\.?\\d*\\b', type: TOKEN_NUMBER },

    // 제어 키워드 (보라색) - 일반 키워드보다 먼저
    {
      regex: '\\b(import|export|default|continue|break|return|throw|yield)\\b',
      type: TOKEN_KEYWORD_CONTROL,
    },

    // 일반 키워드 (파란색)
    {
      regex: '\\b(const|let|var|function|class|if|else|for|while|...)\\b',
      type: TOKEN_KEYWORD,
    },

    // 클래스명 (대문자 시작)
    { regex: '\\b[A-Z][a-zA-Z0-9_]*\\b', type: TOKEN_CLASS },

    // 함수
    { regex: '\\b[a-z_$][a-zA-Z0-9_$]*(?=\\s*\\()', type: TOKEN_FUNCTION },

    // 연산자, 구두점, 식별자
    // ...
  ];

  return TokenParser.tokenize(_code, patterns);
}
```

#### syntax.css - 색상 추가

```css
.token-keyword-control {
  color: #c586c0; /* 보라색 */
}

.token-class {
  color: #4ec9b0; /* 청록색 */
}
```

### 문제 4: Ctrl+W 브라우저 탭 닫힘

**원인:** Ctrl+W는 브라우저 기본 동작

**해결:** Ctrl+W 단축키 제거

```javascript
// app.js - #setupKeyBindings()
// Ctrl+W 등록 제거
// 탭 닫기는 × 버튼 사용
```

---

## 전체 이벤트 플로우

### 검색 플로우

```
[User] Ctrl+F
    ↓
[KeyBindingManager] 'ctrl+f' 이벤트
    ↓
[EditorController] showSearch()
    ↓
[SearchPanel] show(), focus()
    ↓
[User] 검색어 입력
    ↓
[SearchPanel] 'search-changed' 이벤트
    ↓
[EditorController] #performSearch()
    ↓
[SearchService] search() → 결과 배열
    ↓
[EditorPane] highlightSearchResults()
    ↓
[SyntaxRenderer] renderLine() with searchResults
    ↓
화면에 노란색/주황색 하이라이트 표시
```

### 바꾸기 플로우

```
[User] Ctrl+H
    ↓
[EditorController] showReplace()
    ↓
[SearchPanel] setMode('replace')
    ↓
[User] 바꾸기 입력 후 "전체 바꾸기" 클릭
    ↓
[SearchPanel] confirm() 다이얼로그
    ↓
확인 시 'replace-all' 이벤트
    ↓
[EditorController] #replaceAll()
    ↓
[SearchService] replace() → { newText, count }
    ↓
[Document] content/lines 업데이트
    ↓
[EditorController] emit('status-message', "5개 항목을 바꿨습니다.")
```

### 붙여넣기 플로우

```
[User] Ctrl+V
    ↓
[EditorPane] paste 이벤트 캡처
    ↓
[EditorPane] #handlePaste()
    ↓
clipboardData.getData('text/plain') → 순수 텍스트만 추출
    ↓
execCommand('insertText') → HTML 없이 삽입
    ↓
input 이벤트 자동 발생
    ↓
[EditorPane] #handleInput() (debounced)
    ↓
[EditorPane] #extractText() → 정확한 텍스트 추출
    ↓
[Document] lines 업데이트
```

---

## 주요 기술 결정

### 1. 검색 결과를 줄 단위로 관리

**이유:**

- Document가 줄 단위 배열 사용
- Virtual Scrolling과 호환
- 검색 결과로 스크롤 시 줄 번호 필요

**대안:**

- 문자 오프셋 방식 (더 정확하지만 복잡)

### 2. 정규식 직접 구현

**이유:**

- 외부 라이브러리 불필요
- 브라우저 내장 RegExp 활용
- 사용자에게 익숙한 문법

**단점:**

- 복잡한 정규식 오류 메시지 불친절

### 3. SearchPanel을 EditorContainer에 배치

**이유:**

- 에디터 위에 오버레이
- 탭바와 독립적
- z-index로 최상위 표시

**대안:**

- 별도 전역 패널 영역 (복잡도 증가)

### 4. KeyBindingManager 전역 리스너

**이유:**

- 모든 단축키를 한 곳에서 관리
- 우선순위 제어 용이
- 중복 등록 방지

**단점:**

- 입력 요소 필터링 필요

### 5. paste 이벤트에서 순수 텍스트만 허용

**이유:**

- 서식 포함 HTML 방지
- 일관된 텍스트 구조 유지
- 붙여넣기 버그 근본 해결

**효과:**

- VSCode/메모장 등 모든 소스에서 정상 동작

### 6. Ctrl+W 단축키 제거

**이유:**

- 브라우저 기본 동작 완전 차단 불가능
- 사용자 혼란 방지
- × 버튼으로 충분

**대안 고려:**

- Alt+W, Ctrl+Shift+W (혼란 가중)

---

## 성능 고려사항

### 검색 성능

**현재 구현:**

- 전체 텍스트를 한 번에 검색
- O(n) 시간 복잡도

**최적화 (Phase 5):**

- 가시 범위만 먼저 검색
- Web Worker로 백그라운드 검색

### 하이라이트 렌더링

**현재 구현:**

- 전체 재렌더링
- 검색 옵션도 렌더링 시 적용

**최적화 (Phase 5):**

- 변경된 줄만 재렌더링
- CSS로 하이라이트 (DOM 조작 최소화)

---

## 알려진 제한사항

### 1. 정규식 에러 메시지

**문제:**

- 브라우저 기본 에러 메시지 사용
- 사용자 친화적이지 않음

**해결 (Phase 5):**

- 정규식 파서로 상세한 에러 위치 표시

### 2. 대용량 파일 검색

**문제:**

- 10,000줄 이상 파일에서 검색 느림
- UI 블로킹 가능

**해결 (Phase 5):**

- Web Worker로 비동기 검색
- 점진적 결과 표시

### 3. 하이라이트 성능

**문제:**

- 많은 검색 결과 시 렌더링 느림

**해결 (Phase 5):**

- 가시 범위만 하이라이트
- CSS contain 속성 활용

### 4. 바꾸기 Undo

**문제:**

- 바꾸기 후 실행 취소 불가

**해결 (Phase 5):**

- History 시스템 구현
- Command Pattern으로 Undo/Redo

---

## 파일 구조 (Phase 4 추가)

```
src/
├── services/
│   ├── FileSystemService.js
│   ├── LanguageService.js
│   └── SearchService.js          [NEW]
├── views/
│   └── components/
│       ├── Sidebar.js
│       ├── TabBar.js
│       ├── EditorPane.js         [MODIFIED]
│       └── SearchPanel.js        [NEW]
├── controllers/
│   ├── FileController.js
│   ├── TabController.js
│   └── EditorController.js       [MODIFIED]
├── utils/
│   ├── EventEmitter.js
│   ├── Debounce.js
│   ├── TokenParser.js            [MODIFIED]
│   └── KeyBindingManager.js      [NEW]
├── styles/
│   ├── main.css
│   ├── sidebar.css
│   ├── tabbar.css
│   ├── editor.css
│   ├── syntax.css                [MODIFIED]
│   └── search-panel.css          [NEW]
└── app.js                         [MODIFIED]
```

---

## 테스트 시나리오

### 검색 기능

1. JavaScript 파일 열기
2. **Ctrl+F** - 검색 패널 열림
3. "function" 입력
4. ✅ 모든 "function"이 노란색으로 하이라이트
5. ✅ 첫 번째 결과는 주황색 강조
6. ✅ "1 of 5 results" 표시
7. **▶** 버튼 클릭 → 다음 결과로 이동
8. **◀** 버튼 클릭 → 이전 결과로 이동
9. **Escape** → 패널 닫힘

### 정규식 검색

1. **Ctrl+F**
2. `.*` 체크박스 클릭 (정규식 모드)
3. `\d+` 입력
4. ✅ 모든 숫자 하이라이트
5. `(const|let|var)` 입력
6. ✅ 모든 변수 선언 키워드 하이라이트

### 바꾸기

1. **Ctrl+H** - 바꾸기 패널
2. 찾기: "const", 바꾸기: "let"
3. **바꾸기** 버튼 → 현재 항목만 변경
4. **전체 바꾸기** → 확인 다이얼로그
5. ✅ "5개 항목을 바꿨습니다." 메시지
6. ✅ 탭에 ● 표시 (수정됨)

### 붙여넣기

1. VSCode에서 HTML 코드 복사
2. **Ctrl+V**
3. ✅ 순수 텍스트만 붙여넣기
4. ✅ 줄바꿈 정상 유지
5. ✅ 서식 제거
6. **Ctrl+S** 저장
7. ✅ 중복 없이 정상 저장

### 키보드 단축키

1. **Ctrl+F** → 검색
2. **Ctrl+H** → 바꾸기
3. **Ctrl+S** → 저장
4. **Ctrl+O** → 폴더 열기
5. 검색창에서 "test" 타이핑
6. ✅ 에디터로 포커스 이동 안함

---

## Phase 4 vs Phase 3 비교

| 기능              | Phase 3 | Phase 4                |
| ----------------- | ------- | ---------------------- |
| 폴더/파일 탐색    | ✅      | ✅                     |
| 텍스트 편집       | ✅      | ✅                     |
| 신택스 하이라이팅 | ✅      | ✅ (색상 개선)         |
| Virtual Scrolling | ✅      | ✅                     |
| **검색**          | ❌      | ✅ (정규식 지원)       |
| **바꾸기**        | ❌      | ✅ (전체 바꾸기)       |
| **키보드 단축키** | 부분    | ✅ (전역 시스템)       |
| **붙여넣기**      | 버그    | ✅ (순수 텍스트)       |
| **제어 키워드**   | ❌      | ✅ (보라색)            |
| **클래스명**      | 부분    | ✅ (청록색, 정상 동작) |

---

## 다음 단계 (Phase 5 후보)

### 필수 기능

1. **코드 오류 표시 (Linting)**

   - LinterService
   - JavaScript 기본 검증
   - 에러 마커 및 물결선
   - 호버 툴팁

2. **자동완성**

   - CompletionService
   - 키워드/변수/함수 제안
   - CompletionPanel UI
   - Ctrl+Space 트리거

3. **실행 취소/다시 실행**
   - HistoryService
   - Command Pattern
   - Ctrl+Z / Ctrl+Y

### 추가 기능

4. **화면 분할**

   - SplitView 컴포넌트
   - 수평/수직 분할
   - 드래그 리사이징

5. **미니맵**

   - 파일 전체 미리보기
   - 현재 위치 표시

6. **파일 트리 개선**
   - 파일 생성/삭제/이름 변경
   - 드래그 앤 드롭

---

## 참고 자료

- [Regular Expressions (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
- [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent)
- [Selection API](https://developer.mozilla.org/en-US/docs/Web/API/Selection)
- [VSCode Search Documentation](https://code.visualstudio.com/docs/editor/codebasics#_search-and-replace)

---

## 라이선스

MIT License

---

## Phase 4 총 라인 수

| 파일                       | 라인 수    |
| -------------------------- | ---------- |
| SearchService.js           | ~250       |
| SearchPanel.js             | ~220       |
| KeyBindingManager.js       | ~120       |
| EditorController.js (수정) | ~200       |
| EditorPane.js (수정)       | ~550       |
| LanguageService.js (수정)  | ~180       |
| TokenParser.js (수정)      | ~10        |
| app.js (수정)              | ~50        |
| search-panel.css           | ~80        |
| syntax.css (수정)          | ~5         |
| **Phase 4 합계**           | **~1,665** |

---

**Phase 4 구현 완료!** 🎉

검색/바꾸기 기능, 키보드 단축키 시스템, 주요 버그 수정이 모두 완료되었습니다.
