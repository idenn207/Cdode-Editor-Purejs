# CodeEditor 개발자 가이드

## 목차

1. [시작하기](#시작하기)
2. [프로젝트 구조](#프로젝트-구조)
3. [코딩 규칙](#코딩-규칙)
4. [컴포넌트 개발](#컴포넌트-개발)
5. [테스트 작성](#테스트-작성)
6. [디버깅](#디버깅)
7. [배포](#배포)

---

## 시작하기

### 요구사항

- 최신 브라우저 (File System Access API 지원)
  - Chrome 86+
  - Edge 86+
  - Opera 72+
- 로컬 웹 서버

### 설치

```bash
# 프로젝트 클론
git clone <repository-url>

# 로컬 서버 실행
python -m http.server 8000
# 또는
npx http-server .
```

### 실행

브라우저에서 `http://localhost:8000` 접속

---

## 프로젝트 구조

```
/home/claude/
├── index.html              # 메인 HTML
├── src/
│   ├── app.js              # 애플리케이션 엔트리
│   ├── core/               # 기반 클래스
│   │   ├── BaseComponent.js
│   │   ├── BaseController.js
│   │   ├── BaseService.js
│   │   ├── BaseModel.js
│   │   └── BaseRenderer.js
│   ├── models/             # 데이터 모델
│   │   ├── Document.js
│   │   ├── FileNode.js
│   │   ├── Selection.js
│   │   └── EditorState.js
│   ├── services/           # 비즈니스 로직
│   │   ├── file/
│   │   ├── editor/
│   │   ├── search/
│   │   └── language/
│   ├── views/              # UI 컴포넌트
│   │   ├── components/
│   │   └── renderers/
│   ├── controllers/        # 제어 로직
│   │   ├── EditorController.js
│   │   ├── FileController.js
│   │   └── TabController.js
│   ├── utils/              # 유틸리티
│   │   ├── DOMUtils.js
│   │   ├── TextUtils.js
│   │   └── ValidationUtils.js
│   └── tests/              # 테스트
│       ├── unit/
│       └── integration/
├── docs/                   # 문서
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── DEVELOPER_GUIDE.md
└── styles/                 # CSS
    ├── main.css
    └── theme.css
```

---

## 코딩 규칙

### 네이밍 컨벤션

```javascript
// Variable: camelCase
const userName = 'John';

// Function: camelCase
function getUserName() {}

// Class: PascalCase
class EditorController {}

// Field: snake_case
class MyClass {
  user_name = '';
}

// Private Field: '_' + snake_case
class MyClass {
  _private_field = '';
}

// Method: camelCase
class MyClass {
  getUserName() {}
}

// Private Method: '#' + camelCase
class MyClass {
  #getPrivateData() {}
}

// Parameter: '_' + camelCase
function myFunction(_userId, _userName) {}

// Constant: SCREAMING_SNAKE_CASE
const MAX_FILE_SIZE = 1024 * 1024;

// HTML id: PascalCase
<div id="EditorPane"></div>

// HTML name: camelCase
<input name="fileName" />

// HTML class: kebab-case
<div class="editor-pane"></div>
```

---

### 파일 구조

각 파일은 다음 구조를 따릅니다:

```javascript
/**
 * /home/claude/src/services/MyService.js
 *
 * 서비스 설명
 *
 * 책임:
 * - 책임 1
 * - 책임 2
 */

import BaseService from '../core/BaseService.js';
import ValidationUtils from '../utils/ValidationUtils.js';

/**
 * MyService 클래스
 */
export default class MyService extends BaseService {
  /**
   * 생성자
   */
  constructor(_dependency) {
    super();
    this.dependency = _dependency;
  }

  /**
   * 초기화
   */
  initialize() {
    super.initialize();
    // 초기화 로직
  }

  /**
   * Public 메서드
   */
  publicMethod(_param) {
    ValidationUtils.assertNonNull(_param, 'param');
    return this.#privateMethod(_param);
  }

  /**
   * Private 메서드
   */
  #privateMethod(_param) {
    // 구현
  }
}
```

---

### 에러 처리

```javascript
// 파라미터 검증
ValidationUtils.assertNonNull(_param, 'param');
ValidationUtils.assertType(_param, 'string', 'param');

// Try-Catch
try {
  // 위험한 작업
} catch (error) {
  this.handleError(error, 'methodName');
  throw error; // 또는 처리
}

// 상태 검증
ValidationUtils.assertState(this.is_initialized, 'Service must be initialized');
```

---

### 이벤트 발행/구독

```javascript
// 이벤트 발행
this.emit('file-opened', {
  file_node: fileNode,
  content: content,
});

// 이벤트 구독
component.on('file-opened', (_event) => {
  const { file_node, content } = _event;
  // 처리
});

// 이벤트 명명: kebab-case
// 'file-opened', 'document-changed', 'tab-closed'
```

---

## 컴포넌트 개발

### 1. Model 개발

`BaseModel`을 상속받습니다.

```javascript
import BaseModel from '../core/BaseModel.js';

export default class MyModel extends BaseModel {
  constructor(_initialData) {
    super();
    this.set('name', _initialData.name);
    this.set('value', _initialData.value);
  }

  // Getter
  getName() {
    return this.get('name');
  }

  // Setter (자동으로 change 이벤트 발행)
  setName(_name) {
    this.set('name', _name);
  }

  // 검증
  validate() {
    ValidationUtils.assertNonEmptyString(this.get('name'), 'name');
  }

  // 직렬화
  serialize() {
    return {
      name: this.get('name'),
      value: this.get('value'),
    };
  }

  // 역직렬화
  static deserialize(_data) {
    return new MyModel(_data);
  }
}
```

---

### 2. Service 개발

`BaseService`를 상속받습니다.

```javascript
import BaseService from '../core/BaseService.js';

export default class MyService extends BaseService {
  constructor(_dependency) {
    super();
    this.validateDependency(_dependency, 'Dependency');
    this.dependency = _dependency;
  }

  initialize() {
    super.initialize();
    // 초기화
  }

  async doSomething(_param) {
    // 파라미터 검증
    this.validateString(_param, 'param');

    try {
      // 비즈니스 로직
      const result = await this.dependency.process(_param);
      return result;
    } catch (error) {
      this.handleError(error, 'doSomething');
      throw error;
    }
  }

  destroy() {
    // 정리
    super.destroy();
  }
}
```

---

### 3. View 개발

`BaseComponent`를 상속받습니다.

```javascript
import BaseComponent from '../core/BaseComponent.js';

export default class MyComponent extends BaseComponent {
  constructor(_id) {
    super(_id);
    this.state = {
      data: [],
    };
  }

  initialize() {
    super.initialize();
    this.#createDOM();
    this.#attachEvents();
  }

  render() {
    // DOM 업데이트
    this.container.innerHTML = this.#buildHTML();
  }

  #createDOM() {
    this.container.innerHTML = `
      <div class="my-component">
        <div class="header"></div>
        <div class="content"></div>
      </div>
    `;
  }

  #attachEvents() {
    const button = this.container.querySelector('.button');
    button.addEventListener('click', () => {
      this.#handleClick();
    });
  }

  #handleClick() {
    this.emit('item-clicked', { id: 1 });
  }

  destroy() {
    // 이벤트 리스너 제거
    super.destroy();
  }
}
```

---

### 4. Controller 개발

`BaseController`를 상속받습니다.

```javascript
import BaseController from '../core/BaseController.js';

export default class MyController extends BaseController {
  constructor(_service, _view) {
    super();
    this.registerService('myService', _service);
    this.registerView('myView', _view);
  }

  initialize() {
    super.initialize();
    this.#connectEvents();
  }

  #connectEvents() {
    // View → Controller
    this.views.myView.on('action-requested', (_event) => {
      this.#handleAction(_event);
    });

    // Service → Controller
    this.services.myService.on('data-changed', (_event) => {
      this.#updateView(_event);
    });
  }

  async #handleAction(_event) {
    try {
      const result = await this.services.myService.doSomething(_event.data);
      this.emit('action-completed', { result });
    } catch (error) {
      this.handleError(error, 'handleAction');
    }
  }

  #updateView(_event) {
    this.views.myView.setState({ data: _event.data });
    this.views.myView.render();
  }
}
```

---

## 테스트 작성

### 1. 단위 테스트

```javascript
import { TestRunner, expect, createMock } from '../TestRunner.js';
import MyService from '../../services/MyService.js';

const runner = new TestRunner();

runner.describe('MyService', () => {
  let service;
  let mockDependency;

  runner.beforeEach(() => {
    mockDependency = {
      process: createMock().mockResolvedValue('result'),
    };
    service = new MyService(mockDependency);
    service.initialize();
  });

  runner.afterEach(() => {
    service.destroy();
  });

  runner.it('should process data', async () => {
    const result = await service.doSomething('input');

    expect(result).toBe('result');
    expect(mockDependency.process).toHaveBeenCalledWith('input');
  });

  runner.it('should throw error for null input', async () => {
    let errorCaught = false;

    try {
      await service.doSomething(null);
    } catch (error) {
      errorCaught = true;
      expect(error.message).toContain('param');
    }

    expect(errorCaught).toBe(true);
  });
});

runner.run();
```

---

### 2. Mock 사용

```javascript
// Mock 함수 생성
const mockFn = createMock();

// 반환값 설정
mockFn.mockReturnValue('result');
mockFn.mockResolvedValue('async result');
mockFn.mockRejectedValue(new Error('error'));

// 호출 확인
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledTimes(2);

// 호출 정보
const calls = mockFn.mock.calls;
expect(calls[0]).toEqual(['arg1', 'arg2']);
```

---

### 3. Assertion 함수

```javascript
// 동등성
expect(actual).toBe(expected);
expect(actual).toEqual(expected); // 깊은 비교

// 참/거짓
expect(actual).toBeTruthy();
expect(actual).toBeFalsy();
expect(actual).toBeNull();
expect(actual).toBeUndefined();

// 숫자
expect(actual).toBeGreaterThan(5);
expect(actual).toBeLessThan(10);
expect(actual).toBeCloseTo(1.5, 0.1);

// 문자열
expect(actual).toContain('substring');
expect(actual).toMatch(/pattern/);

// 배열/객체
expect(array).toContain(item);
expect(array).toHaveLength(3);
expect(obj).toHaveProperty('key');

// 함수
expect(fn).toThrow();
expect(fn).toThrow('error message');

// Mock
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg');
```

---

## 디버깅

### 1. 디버그 정보

```javascript
// 애플리케이션 상태
const debugInfo = app.getDebugInfo();
console.log(debugInfo);

// 컴포넌트 상태
console.log(component.is_mounted);
console.log(component.is_destroyed);

// 이벤트 추적
component.on('*', (_eventName, _event) => {
  console.log(`Event: ${_eventName}`, _event);
});
```

---

### 2. 브라우저 DevTools

```javascript
// 전역 접근
window.codeEditorApp;

// 콘솔에서 테스트
const doc = window.codeEditorApp.controllers.tab.getActiveDocument();
console.log(doc.getContent());
```

---

### 3. 로깅

```javascript
// 개발 모드
const DEBUG = true;

if (DEBUG) {
  console.log('🔍 Debug:', data);
}

// 에러 로깅
console.error('❌ Error:', error);
console.warn('⚠️  Warning:', warning);
```

---

## 베스트 프랙티스

### 1. 의존성 주입

```javascript
// ✅ Good: 의존성 주입
class MyController {
  constructor(_service) {
    this.service = _service;
  }
}

// ❌ Bad: 하드코딩
class MyController {
  constructor() {
    this.service = new MyService(); // 테스트 어려움
  }
}
```

---

### 2. 불변성

```javascript
// ✅ Good: 새 객체 반환
function addItem(_array, _item) {
  return [..._array, _item];
}

// ❌ Bad: 원본 수정
function addItem(_array, _item) {
  _array.push(_item);
  return _array;
}
```

---

### 3. 에러 처리

```javascript
// ✅ Good: 구체적인 에러
if (!_param) {
  throw new Error('param is required');
}

// ❌ Bad: 모호한 에러
if (!_param) {
  throw new Error('invalid');
}
```

---

### 4. 비동기 처리

```javascript
// ✅ Good: async/await
async function loadData() {
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    handleError(error);
  }
}

// ❌ Bad: callback hell
function loadData(_callback) {
  fetchData((_data) => {
    processData(_data, (_result) => {
      _callback(_result);
    });
  });
}
```

---

### 5. 명명

```javascript
// ✅ Good: 명확한 이름
function getUserById(_userId) {}

// ❌ Bad: 모호한 이름
function get(_id) {}
```

---

## 성능 최적화

### 1. Debounce/Throttle

```javascript
import { debounce } from './utils/FunctionUtils.js';

// Debounce: 마지막 호출만 실행
const debouncedFn = debounce(() => {
  console.log('Executed');
}, 300);

// Throttle: 주기적으로 실행
const throttledFn = throttle(() => {
  console.log('Executed');
}, 100);
```

---

### 2. Virtual Scrolling

```javascript
// 대용량 데이터는 Virtual Scrolling 사용
const scroller = new VirtualScroller({
  container: element,
  item_height: 20,
  total_items: 10000,
});
```

---

### 3. 캐싱

```javascript
// BaseRenderer의 캐싱 사용
class MyRenderer extends BaseRenderer {
  constructor() {
    super({ cache_size: 1000 });
  }

  render(_data) {
    return this.renderWithCache(_data.id, () => {
      // 실제 렌더링
    });
  }
}
```

---

## 배포

### 1. 빌드 체크리스트

- [ ] 모든 테스트 통과
- [ ] 린트 에러 없음
- [ ] 문서 업데이트
- [ ] 버전 번호 업데이트
- [ ] CHANGELOG 작성

---

### 2. 프로덕션 최적화

```javascript
// 디버그 모드 비활성화
const DEBUG = false;

// 콘솔 로그 제거
if (!DEBUG) {
  console.log = () => {};
  console.debug = () => {};
}
```

---

### 3. 브라우저 호환성 확인

```javascript
// File System Access API 지원 확인
if ('showDirectoryPicker' in window) {
  // 지원됨
} else {
  // Fallback UI
  alert('이 브라우저는 File System Access API를 지원하지 않습니다.');
}
```

---

## 트러블슈팅

### 문제: 파일이 열리지 않음

**원인:** File System Access API 권한 거부

**해결:**

```javascript
const permission = await handle.requestPermission({ mode: 'readwrite' });
if (permission !== 'granted') {
  alert('파일 접근 권한이 필요합니다.');
}
```

---

### 문제: 커서 위치 이상

**원인:** contenteditable의 Selection API 문제

**해결:**

```javascript
// Selection 정규화
const selection = window.getSelection();
const range = selection.getRangeAt(0);
range.collapse(true);
```

---

### 문제: 메모리 누수

**원인:** 이벤트 리스너 제거 안 됨

**해결:**

```javascript
// destroy 시 반드시 제거
destroy() {
  element.removeEventListener('click', this.handler);
  super.destroy();
}
```

---

## 추가 자료

- [MDN Web Docs](https://developer.mozilla.org/)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [JavaScript Design Patterns](https://www.patterns.dev/)

---

## 기여하기

### Pull Request 가이드

1. Feature 브랜치 생성
2. 코딩 규칙 준수
3. 테스트 작성
4. 문서 업데이트
5. PR 생성

### 코드 리뷰

- 코드 품질
- 테스트 커버리지
- 문서화
- 성능

---

## 라이센스

MIT License
