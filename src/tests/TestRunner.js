/**
 * 파일: src/tests/TestRunner.js
 * 기능: 단위 테스트 러너
 * 책임: 테스트 실행, 결과 리포팅
 */

export class TestRunner {
  constructor() {
    this.suites = [];
    this.current_suite = null;
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      suites: [],
    };
  }

  /**
   * 테스트 스위트 정의
   */
  describe(_suite_name, _fn) {
    const suite = {
      name: _suite_name,
      tests: [],
      before_each: null,
      after_each: null,
      before_all: null,
      after_all: null,
    };

    this.suites.push(suite);
    this.current_suite = suite;

    // 테스트 정의 블록 실행
    _fn();

    this.current_suite = null;
  }

  /**
   * 테스트 케이스 정의
   */
  it(_test_name, _fn) {
    if (!this.current_suite) {
      throw new Error('it() must be called inside describe()');
    }

    this.current_suite.tests.push({
      name: _test_name,
      fn: _fn,
      skipped: false,
    });
  }

  /**
   * 테스트 건너뛰기
   */
  xit(_test_name, _fn) {
    if (!this.current_suite) {
      throw new Error('xit() must be called inside describe()');
    }

    this.current_suite.tests.push({
      name: _test_name,
      fn: _fn,
      skipped: true,
    });
  }

  /**
   * 각 테스트 전 실행
   */
  beforeEach(_fn) {
    if (!this.current_suite) {
      throw new Error('beforeEach() must be called inside describe()');
    }
    this.current_suite.before_each = _fn;
  }

  /**
   * 각 테스트 후 실행
   */
  afterEach(_fn) {
    if (!this.current_suite) {
      throw new Error('afterEach() must be called inside describe()');
    }
    this.current_suite.after_each = _fn;
  }

  /**
   * 모든 테스트 전 실행
   */
  beforeAll(_fn) {
    if (!this.current_suite) {
      throw new Error('beforeAll() must be called inside describe()');
    }
    this.current_suite.before_all = _fn;
  }

  /**
   * 모든 테스트 후 실행
   */
  afterAll(_fn) {
    if (!this.current_suite) {
      throw new Error('afterAll() must be called inside describe()');
    }
    this.current_suite.after_all = _fn;
  }

  /**
   * 모든 테스트 실행
   */
  async run() {
    console.log('🧪 Running tests...\n');

    for (const suite of this.suites) {
      await this.#runSuite(suite);
    }

    this.#printSummary();
  }

  /**
   * 스위트 실행
   */
  async #runSuite(_suite) {
    console.log(`\n📦 ${_suite.name}`);

    const suite_result = {
      name: _suite.name,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
    };

    // beforeAll 실행
    if (_suite.before_all) {
      try {
        await _suite.before_all();
      } catch (error) {
        console.error(`  ❌ beforeAll failed:`, error.message);
        return;
      }
    }

    // 각 테스트 실행
    for (const test of _suite.tests) {
      const test_result = await this.#runTest(_suite, test);
      suite_result.tests.push(test_result);

      if (test_result.status === 'passed') {
        suite_result.passed++;
        this.results.passed++;
      } else if (test_result.status === 'failed') {
        suite_result.failed++;
        this.results.failed++;
      } else if (test_result.status === 'skipped') {
        suite_result.skipped++;
        this.results.skipped++;
      }

      this.results.total++;
    }

    // afterAll 실행
    if (_suite.after_all) {
      try {
        await _suite.after_all();
      } catch (error) {
        console.error(`  ❌ afterAll failed:`, error.message);
      }
    }

    this.results.suites.push(suite_result);
  }

  /**
   * 테스트 실행
   */
  async #runTest(_suite, _test) {
    if (_test.skipped) {
      console.log(`  ⏭️  ${_test.name} (skipped)`);
      return {
        name: _test.name,
        status: 'skipped',
      };
    }

    try {
      // beforeEach 실행
      if (_suite.before_each) {
        await _suite.before_each();
      }

      // 테스트 실행
      await _test.fn();

      // afterEach 실행
      if (_suite.after_each) {
        await _suite.after_each();
      }

      console.log(`  ✅ ${_test.name}`);
      return {
        name: _test.name,
        status: 'passed',
      };
    } catch (error) {
      console.log(`  ❌ ${_test.name}`);
      console.error(`     ${error.message}`);
      if (error.stack) {
        console.error(`     ${error.stack.split('\n')[1]}`);
      }

      return {
        name: _test.name,
        status: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * 결과 요약 출력
   */
  #printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results');
    console.log('='.repeat(50));

    this.results.suites.forEach((_suite) => {
      const total = _suite.passed + _suite.failed + _suite.skipped;
      console.log(`\n${_suite.name}: ${_suite.passed}/${total} passed (${_suite.failed} failed, ${_suite.skipped} skipped)`);
    });

    console.log('\n' + '-'.repeat(50));
    console.log(`Total: ${this.results.passed}/${this.results.total} passed (${this.results.failed} failed, ${this.results.skipped} skipped)`);
    console.log('='.repeat(50));

    if (this.results.failed === 0) {
      console.log('\n✨ All tests passed! ✨');
    } else {
      console.log(`\n⚠️  ${this.results.failed} test(s) failed`);
    }
  }
}

/**
 * Assertion 라이브러리
 */
export function expect(_actual) {
  return {
    /**
     * 동등 비교 (===)
     */
    toBe(_expected) {
      if (_actual !== _expected) {
        throw new Error(`Expected ${_expected}, but got ${_actual}`);
      }
    },

    /**
     * 부정 비교 (!==)
     */
    notToBe(_expected) {
      if (_actual === _expected) {
        throw new Error(`Expected not to be ${_expected}`);
      }
    },

    /**
     * 깊은 비교 (객체, 배열)
     */
    toEqual(_expected) {
      const actual_json = JSON.stringify(_actual);
      const expected_json = JSON.stringify(_expected);

      if (actual_json !== expected_json) {
        throw new Error(`Expected ${expected_json}, but got ${actual_json}`);
      }
    },

    /**
     * truthy 확인
     */
    toBeTruthy() {
      if (!_actual) {
        throw new Error(`Expected truthy value, but got ${_actual}`);
      }
    },

    /**
     * falsy 확인
     */
    toBeFalsy() {
      if (_actual) {
        throw new Error(`Expected falsy value, but got ${_actual}`);
      }
    },

    /**
     * null 확인
     */
    toBeNull() {
      if (_actual !== null) {
        throw new Error(`Expected null, but got ${_actual}`);
      }
    },

    /**
     * undefined 확인
     */
    toBeUndefined() {
      if (_actual !== undefined) {
        throw new Error(`Expected undefined, but got ${_actual}`);
      }
    },

    /**
     * 타입 확인
     */
    toBeType(_expected_type) {
      const actual_type = typeof _actual;
      if (actual_type !== _expected_type) {
        throw new Error(`Expected type ${_expected_type}, but got ${actual_type}`);
      }
    },

    /**
     * 인스턴스 확인
     */
    toBeInstanceOf(_expected_class) {
      if (!(_actual instanceof _expected_class)) {
        throw new Error(`Expected instance of ${_expected_class.name}, but got ${_actual.constructor.name}`);
      }
    },

    /**
     * 배열 포함 확인
     */
    toContain(_expected_item) {
      if (!Array.isArray(_actual)) {
        throw new Error(`Expected array, but got ${typeof _actual}`);
      }

      if (!_actual.includes(_expected_item)) {
        throw new Error(`Expected array to contain ${_expected_item}`);
      }
    },

    /**
     * 길이 확인
     */
    toHaveLength(_expected_length) {
      if (_actual.length !== _expected_length) {
        throw new Error(`Expected length ${_expected_length}, but got ${_actual.length}`);
      }
    },

    /**
     * 예외 발생 확인
     */
    toThrow(_expected_error = null) {
      if (typeof _actual !== 'function') {
        throw new Error('Expected a function');
      }

      let threw = false;
      let actual_error = null;

      try {
        _actual();
      } catch (error) {
        threw = true;
        actual_error = error;
      }

      if (!threw) {
        throw new Error('Expected function to throw an error');
      }

      if (_expected_error && actual_error.message !== _expected_error) {
        throw new Error(`Expected error "${_expected_error}", but got "${actual_error.message}"`);
      }
    },

    /**
     * 비동기 resolve 확인
     */
    async resolves() {
      if (!(_actual instanceof Promise)) {
        throw new Error('Expected a Promise');
      }

      try {
        await _actual;
      } catch (error) {
        throw new Error(`Expected Promise to resolve, but it rejected with: ${error.message}`);
      }
    },

    /**
     * 비동기 reject 확인
     */
    async rejects() {
      if (!(_actual instanceof Promise)) {
        throw new Error('Expected a Promise');
      }

      let rejected = false;

      try {
        await _actual;
      } catch {
        rejected = true;
      }

      if (!rejected) {
        throw new Error('Expected Promise to reject, but it resolved');
      }
    },

    /**
     * 숫자 범위 확인
     */
    toBeGreaterThan(_expected) {
      if (_actual <= _expected) {
        throw new Error(`Expected ${_actual} to be greater than ${_expected}`);
      }
    },

    toBeLessThan(_expected) {
      if (_actual >= _expected) {
        throw new Error(`Expected ${_actual} to be less than ${_expected}`);
      }
    },

    /**
     * 객체 프로퍼티 확인
     */
    toHaveProperty(_property_name) {
      if (!(_property_name in _actual)) {
        throw new Error(`Expected object to have property "${_property_name}"`);
      }
    },
  };
}

/**
 * Mock 함수 생성
 */
export function createMock() {
  const calls = [];

  const mock_fn = function (..._args) {
    calls.push(_args);
    return mock_fn.return_value;
  };

  mock_fn.return_value = undefined;
  mock_fn.calls = calls;
  mock_fn.callCount = () => calls.length;
  mock_fn.calledWith = (..._expected_args) => {
    return calls.some((_call) => {
      return JSON.stringify(_call) === JSON.stringify(_expected_args);
    });
  };
  mock_fn.mockReturnValue = (_value) => {
    mock_fn.return_value = _value;
    return mock_fn;
  };
  mock_fn.reset = () => {
    calls.length = 0;
    mock_fn.return_value = undefined;
  };

  return mock_fn;
}
