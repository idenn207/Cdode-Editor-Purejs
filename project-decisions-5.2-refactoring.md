# Code Editor 리팩토링 계획

## 목표

1. **유지보수성 향상**: 코드 패턴 통일, 책임 명확화
2. **가독성 향상**: 추상화 계층 구축, 일관된 네이밍
3. **테스트 가능성**: 단위 테스트 프레임워크 구축
4. **확장성**: 새 기능 추가 시 기존 코드 수정 최소화

---

## 새로운 아키텍처

### 계층 구조

```
┌──────────────────────────────────────────┐
│          Application Layer               │
│              (app.js)                    │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│          Controller Layer                │
│  (비즈니스 로직, 이벤트 조정)              │
└──────────────────────────────────────────┘
                    ↓
┌───────────────┬──────────────┬───────────┐
│  Service Layer│  Model Layer │View Layer │
│  (핵심 기능)   │  (데이터)    │  (UI)     │
└───────────────┴──────────────┴───────────┘
                    ↓
┌──────────────────────────────────────────┐
│          Infrastructure Layer            │
│     (Utils, Constants, Interfaces)       │
└──────────────────────────────────────────┘
```

---

## 추상화 계층

### 1. Base Classes (Abstract)

모든 컴포넌트가 상속받을 기본 클래스들

```
src/core/
├── BaseComponent.js       # UI 컴포넌트 베이스
├── BaseController.js      # 컨트롤러 베이스
├── BaseService.js         # 서비스 베이스
├── BaseModel.js           # 모델 베이스
└── BaseRenderer.js        # 렌더러 베이스
```

#### BaseComponent (UI 컴포넌트)

```javascript
export default class BaseComponent extends EventEmitter {
  constructor(_containerId) {
    super();
    this.container_id = _containerId;
    this.container = null;
    this.is_initialized = false;
    this.is_destroyed = false;
  }

  // Abstract 메서드 (구현 필수)
  initialize() {
    throw new Error('initialize() must be implemented');
  }

  render() {
    throw new Error('render() must be implemented');
  }

  // 공통 메서드
  mount() {
    if (this.is_initialized) return;
    this.container = document.getElementById(this.container_id);
    if (!this.container) {
      throw new Error(`Container not found: ${this.container_id}`);
    }
    this.initialize();
    this.is_initialized = true;
  }

  destroy() {
    if (this.is_destroyed) return;
    this.removeAllListeners();
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.is_destroyed = true;
  }

  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }
}
```

#### BaseController

```javascript
export default class BaseController extends EventEmitter {
  constructor() {
    super();
    this.is_initialized = false;
  }

  // Abstract 메서드
  initialize() {
    throw new Error('initialize() must be implemented');
  }

  destroy() {
    this.removeAllListeners();
    this.is_initialized = false;
  }

  // 공통 에러 처리
  handleError(_error, _context = 'Unknown') {
    console.error(`[${this.constructor.name}] Error in ${_context}:`, _error);
    this.emit('error', { error: _error, context: _context });
  }
}
```

#### BaseService

```javascript
export default class BaseService {
  constructor() {
    this.is_initialized = false;
  }

  initialize() {
    // 선택적 구현
    this.is_initialized = true;
  }

  destroy() {
    this.is_initialized = false;
  }

  // 공통 검증 메서드
  validateNotNull(_value, _name) {
    if (_value === null || _value === undefined) {
      throw new Error(`${_name} cannot be null or undefined`);
    }
  }

  validateType(_value, _type, _name) {
    if (typeof _value !== _type) {
      throw new Error(`${_name} must be of type ${_type}`);
    }
  }
}
```

#### BaseModel

```javascript
export default class BaseModel extends EventEmitter {
  constructor() {
    super();
    this._data = {};
  }

  // Abstract 메서드
  toJSON() {
    throw new Error('toJSON() must be implemented');
  }

  fromJSON(_json) {
    throw new Error('fromJSON() must be implemented');
  }

  // 공통 메서드
  get(_key) {
    return this._data[_key];
  }

  set(_key, _value) {
    const old_value = this._data[_key];
    if (old_value !== _value) {
      this._data[_key] = _value;
      this.emit('change', { key: _key, old: old_value, new: _value });
      this.emit(`change:${_key}`, { old: old_value, new: _value });
    }
  }

  reset() {
    this._data = {};
    this.emit('reset');
  }
}
```

#### BaseRenderer

```javascript
export default class BaseRenderer {
  constructor() {
    this.cache = new Map();
  }

  // Abstract 메서드
  render(_input) {
    throw new Error('render() must be implemented');
  }

  // 공통 캐싱
  renderWithCache(_key, _input) {
    if (this.cache.has(_key)) {
      return this.cache.get(_key);
    }
    const result = this.render(_input);
    this.cache.set(_key, result);
    return result;
  }

  clearCache() {
    this.cache.clear();
  }
}
```

---

## 2. Interfaces (TypeScript-style JSDoc)

JavaScript에서 인터페이스를 JSDoc으로 표현

```javascript
/**
 * @interface IEditable
 * @description 편집 가능한 객체의 인터페이스
 */

/**
 * @typedef {Object} IEditable
 * @property {function(number, number, string): void} insert - 텍스트 삽입
 * @property {function(number, number, number, number): string} delete - 텍스트 삭제
 * @property {function(): string} getText - 전체 텍스트 가져오기
 * @property {function(string): void} setText - 전체 텍스트 설정
 */

/**
 * @interface ISerializable
 * @description 직렬화 가능한 객체의 인터페이스
 */

/**
 * @typedef {Object} ISerializable
 * @property {function(): Object} toJSON - JSON으로 변환
 * @property {function(Object): void} fromJSON - JSON에서 복원
 */

/**
 * @interface IDisposable
 * @description 리소스 해제가 필요한 객체의 인터페이스
 */

/**
 * @typedef {Object} IDisposable
 * @property {function(): void} dispose - 리소스 해제
 */
```

---

## 3. 디렉토리 구조 재설계

```
src/
├── core/                           # 핵심 추상화
│   ├── BaseComponent.js
│   ├── BaseController.js
│   ├── BaseService.js
│   ├── BaseModel.js
│   └── BaseRenderer.js
│
├── interfaces/                     # 인터페이스 정의 (JSDoc)
│   ├── IEditable.js
│   ├── ISerializable.js
│   ├── IDisposable.js
│   └── IRenderable.js
│
├── controllers/                    # 컨트롤러 (BaseController 상속)
│   ├── EditorController.js
│   ├── FileController.js
│   └── TabController.js
│
├── services/                       # 서비스 (BaseService 상속)
│   ├── file/
│   │   ├── FileSystemService.js
│   │   └── FileCacheService.js
│   ├── editor/
│   │   ├── CompletionService.js
│   │   ├── LinterService.js
│   │   └── FormatterService.js
│   ├── language/
│   │   ├── LanguageService.js
│   │   ├── TokenizerService.js
│   │   └── ParserService.js
│   └── search/
│       └── SearchService.js
│
├── models/                         # 모델 (BaseModel 상속)
│   ├── Document.js
│   ├── FileNode.js
│   ├── Selection.js
│   └── EditorState.js
│
├── views/
│   ├── components/                 # UI 컴포넌트 (BaseComponent 상속)
│   │   ├── Sidebar.js
│   │   ├── EditorPane.js
│   │   ├── TabBar.js
│   │   ├── CompletionPanel.js
│   │   └── StatusBar.js
│   └── renderers/                  # 렌더러 (BaseRenderer 상속)
│       ├── SyntaxRenderer.js
│       ├── ErrorRenderer.js
│       └── VirtualScroller.js
│
├── utils/                          # 유틸리티
│   ├── EventEmitter.js
│   ├── Debounce.js
│   ├── DOMUtils.js                # DOM 조작 유틸
│   ├── TextUtils.js               # 텍스트 처리 유틸
│   └── ValidationUtils.js         # 검증 유틸
│
├── constants/                      # 상수
│   ├── Languages.js
│   ├── Themes.js
│   ├── KeyBindings.js
│   └── EditorConfig.js
│
├── tests/                          # 단위 테스트
│   ├── unit/
│   │   ├── models/
│   │   ├── services/
│   │   ├── controllers/
│   │   └── utils/
│   ├── integration/
│   │   └── editor/
│   ├── helpers/
│   │   ├── TestFixtures.js
│   │   └── MockFactory.js
│   └── test-runner.js
│
└── app.js                          # 애플리케이션 진입점
```

---

## 4. 코드 패턴 통일

### 4.1 컴포넌트 생성 패턴

**Before:**

```javascript
// 일관성 없는 초기화
class Sidebar {
  constructor(_id) {
    this.container = document.getElementById(_id);
    this.#initialize();
  }
}

class EditorPane {
  constructor(_id) {
    this.container = document.getElementById(_id);
    this.#attachEvents();
    this.#render();
  }
}
```

**After:**

```javascript
// BaseComponent 상속으로 통일
class Sidebar extends BaseComponent {
  constructor(_containerId) {
    super(_containerId);
  }

  initialize() {
    this.#createDOM();
    this.#attachEvents();
    this.render();
  }

  #createDOM() {
    // DOM 구조 생성
  }

  #attachEvents() {
    // 이벤트 연결
  }

  render() {
    // 렌더링
  }
}

// 사용
const sidebar = new Sidebar('Sidebar');
sidebar.mount(); // BaseComponent의 mount() 호출
```

### 4.2 이벤트 명명 패턴

**Before:**

```javascript
// 일관성 없는 이벤트 이름
this.emit('file-selected');
this.emit('request-open-folder');
this.emit('trigger-completion');
```

**After:**

```javascript
// 패턴: <주체>:<동작>:<대상>
this.emit('file:selected', fileNode);
this.emit('folder:open:requested');
this.emit('completion:triggered', { prefix, context });

// 또는
// 패턴: <동사>-<명사>
this.emit('select-file', fileNode);
this.emit('request-open-folder');
this.emit('trigger-completion', data);
```

### 4.3 에러 처리 패턴

**Before:**

```javascript
// 각자 다른 에러 처리
try {
  // ...
} catch (e) {
  console.error('Error:', e);
}

// 또는
if (!file) {
  throw new Error('File not found');
}
```

**After:**

```javascript
// BaseController의 handleError 사용
try {
  // ...
} catch (error) {
  this.handleError(error, 'openFile');
}

// 또는 커스텀 에러 클래스
class FileNotFoundError extends Error {
  constructor(_path) {
    super(`File not found: ${_path}`);
    this.name = 'FileNotFoundError';
    this.path = _path;
  }
}

throw new FileNotFoundError(filePath);
```

### 4.4 비동기 처리 패턴

**Before:**

```javascript
// 콜백, Promise 혼용
selectDirectory(callback) {
  window.showDirectoryPicker().then(handle => {
    callback(null, handle);
  }).catch(err => {
    callback(err);
  });
}
```

**After:**

```javascript
// async/await 통일
async selectDirectory() {
  try {
    const handle = await window.showDirectoryPicker();
    return handle;
  } catch (error) {
    this.handleError(error, 'selectDirectory');
    throw error;
  }
}
```

---

## 5. 책임 분리 (SRP)

### 5.1 EditorPane 분리

**Before (EditorPane):**

- 텍스트 편집 ✓
- 자동완성 트리거 ✓
- 검색 결과 하이라이트 ✓
- 라인 번호 렌더링 ✓
- 가상 스크롤링 ✓
- 신택스 하이라이팅 ✓

**After:**

```
EditorPane (BaseComponent)
├── TextEditor (실제 편집)
├── LineNumberGutter (줄 번호)
├── SearchHighlighter (검색 하이라이트)
└── AutoCompleter (자동완성 트리거)
```

### 5.2 FileSystemService 분리

**Before:**

- 파일 시스템 접근 ✓
- 파일 트리 빌드 ✓
- 파일 캐싱 ✓
- 파일 읽기/쓰기 ✓

**After:**

```
FileSystemService (파일 시스템 접근)
FileCacheService (캐싱 전담)
FileTreeBuilder (트리 구조 빌드)
```

---

## 6. 단위 테스트 프레임워크

### 6.1 테스트 러너

```javascript
// src/tests/test-runner.js
export class TestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
    };
  }

  describe(_suiteName, _fn) {
    console.log(`\n📦 ${_suiteName}`);
    _fn();
  }

  it(_testName, _fn) {
    this.tests.push({ name: _testName, fn: _fn });
  }

  async run() {
    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`  ✅ ${test.name}`);
        this.results.passed++;
      } catch (error) {
        console.log(`  ❌ ${test.name}`);
        console.error(`     ${error.message}`);
        this.results.failed++;
      }
      this.results.total++;
    }

    console.log(`\n📊 Results: ${this.results.passed}/${this.results.total} passed`);
  }
}

// 헬퍼 함수
export function expect(_actual) {
  return {
    toBe(_expected) {
      if (_actual !== _expected) {
        throw new Error(`Expected ${_expected}, got ${_actual}`);
      }
    },
    toEqual(_expected) {
      if (JSON.stringify(_actual) !== JSON.stringify(_expected)) {
        throw new Error(`Expected ${JSON.stringify(_expected)}, got ${JSON.stringify(_actual)}`);
      }
    },
    toThrow() {
      let threw = false;
      try {
        _actual();
      } catch {
        threw = true;
      }
      if (!threw) {
        throw new Error('Expected function to throw');
      }
    },
  };
}
```

### 6.2 테스트 예시

```javascript
// src/tests/unit/models/Document.test.js
import { TestRunner, expect } from '../../test-runner.js';
import Document from '../../../models/Document.js';
import FileNode from '../../../models/FileNode.js';

const runner = new TestRunner();

runner.describe('Document', () => {
  runner.it('should create a document', () => {
    const fileNode = new FileNode('test.js', '/test.js', 'file');
    const doc = new Document(fileNode, 'test content');

    expect(doc.getText()).toBe('test content');
    expect(doc.getLineCount()).toBe(1);
  });

  runner.it('should split text into lines', () => {
    const fileNode = new FileNode('test.js', '/test.js', 'file');
    const doc = new Document(fileNode, 'line1\nline2\nline3');

    expect(doc.getLineCount()).toBe(3);
    expect(doc.getLine(0)).toBe('line1');
    expect(doc.getLine(1)).toBe('line2');
    expect(doc.getLine(2)).toBe('line3');
  });

  runner.it('should detect dirty state', () => {
    const fileNode = new FileNode('test.js', '/test.js', 'file');
    const doc = new Document(fileNode, 'original');

    expect(doc.is_dirty).toBe(false);

    doc.setText('modified');
    expect(doc.is_dirty).toBe(true);
  });
});

runner.run();
```

---

## 7. 리팩토링 순서

### Phase 1: 인프라 구축 (1주)

- [ ] BaseComponent, BaseController, BaseService, BaseModel, BaseRenderer 구현
- [ ] TestRunner 및 assertion 라이브러리 구현
- [ ] 공통 유틸리티 함수 정리 (DOMUtils, TextUtils 등)
- [ ] 에러 클래스 계층 구조 정의

### Phase 2: Models 리팩토링 (1주)

- [ ] Document → BaseModel 상속
- [ ] FileNode → BaseModel 상속
- [ ] Selection, EditorState 모델 리팩토링
- [ ] 각 모델에 대한 단위 테스트 작성

### Phase 3: Services 리팩토링 (2주)

- [ ] FileSystemService → BaseService 상속
- [ ] FileCacheService 분리
- [ ] CompletionService 리팩토링
- [ ] LinterService, LanguageService 리팩토링
- [ ] 각 서비스 단위 테스트 작성

### Phase 4: Views 리팩토링 (2주)

- [ ] Sidebar, TabBar, EditorPane → BaseComponent 상속
- [ ] EditorPane 책임 분리 (TextEditor, LineNumberGutter 등)
- [ ] SyntaxRenderer → BaseRenderer 상속
- [ ] 컴포넌트 단위 테스트 작성

### Phase 5: Controllers 리팩토링 (1주)

- [ ] EditorController, FileController, TabController → BaseController 상속
- [ ] 이벤트 명명 규칙 통일
- [ ] 에러 처리 패턴 통일
- [ ] 컨트롤러 통합 테스트 작성

### Phase 6: 통합 및 정리 (1주)

- [ ] app.js 리팩토링
- [ ] 전체 통합 테스트 작성
- [ ] 문서화 업데이트
- [ ] 성능 테스트 및 최적화

---

## 8. 마이그레이션 전략

### 점진적 마이그레이션

1. **새로운 구조 병행 유지**

   - `src/` (기존 코드)
   - `src-refactored/` (리팩토링된 코드)
   - 기능별로 하나씩 이동

2. **Feature Flag 사용**

   ```javascript
   const USE_REFACTORED_EDITOR = false;

   if (USE_REFACTORED_EDITOR) {
     // 새 EditorPane 사용
   } else {
     // 기존 EditorPane 사용
   }
   ```

3. **병렬 테스트**
   - 기존 기능 유지하면서 새 코드 테스트
   - 문제 발생 시 롤백 가능

---

## 9. 성공 지표

### 정량적 지표

- [ ] 테스트 커버리지 80% 이상
- [ ] 평균 함수 길이 50줄 이하
- [ ] 클래스당 책임 3개 이하
- [ ] 순환 의존성 0개

### 정성적 지표

- [ ] 새 기능 추가 시 기존 코드 수정 최소화
- [ ] 버그 발생률 감소
- [ ] 코드 리뷰 시간 단축
- [ ] 온보딩 시간 단축

---

## 다음 단계

1. 이 계획 검토 및 피드백
2. Phase 1 (인프라 구축) 시작
3. 주간 진행상황 리뷰
