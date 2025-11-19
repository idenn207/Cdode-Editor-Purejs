/**
 * 파일: src/core/BaseRenderer.js
 * 기능: 렌더러 추상 베이스 클래스
 * 책임: 데이터를 시각적 표현으로 변환, 캐싱
 */

export default class BaseRenderer {
  constructor() {
    this.cache = new Map();
    this.cache_enabled = true;
    this.cache_size_limit = 1000; // 최대 캐시 크기
  }

  /**
   * Abstract 메서드 - 렌더링
   */
  render(_input) {
    throw new Error(`${this.constructor.name}.render() must be implemented`);
  }

  /**
   * 캐시를 사용하여 렌더링
   */
  renderWithCache(_key, _input) {
    // 캐시 비활성화 시 직접 렌더링
    if (!this.cache_enabled) {
      return this.render(_input);
    }

    // 캐시에 있으면 반환
    if (this.cache.has(_key)) {
      return this.cache.get(_key);
    }

    // 렌더링 후 캐시에 저장
    const result = this.render(_input);
    this.cache.set(_key, result);

    // 캐시 크기 제한 확인
    if (this.cache.size > this.cache_size_limit) {
      this.#evictOldestCache();
    }

    return result;
  }

  /**
   * 캐시 제거 (LRU 방식)
   */
  #evictOldestCache() {
    const first_key = this.cache.keys().next().value;
    if (first_key !== undefined) {
      this.cache.delete(first_key);
    }
  }

  /**
   * 캐시 초기화
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 특정 키 캐시 삭제
   */
  invalidateCache(_key) {
    this.cache.delete(_key);
  }

  /**
   * 캐시 활성화/비활성화
   */
  setCacheEnabled(_enabled) {
    this.cache_enabled = _enabled;
    if (!_enabled) {
      this.clearCache();
    }
  }

  /**
   * 캐시 크기 제한 설정
   */
  setCacheSizeLimit(_limit) {
    this.cache_size_limit = Math.max(1, _limit);
  }

  /**
   * 캐시 통계
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      limit: this.cache_size_limit,
      enabled: this.cache_enabled,
      usage_percent: (this.cache.size / this.cache_size_limit) * 100,
    };
  }

  /**
   * 일괄 렌더링
   */
  renderBatch(_inputs, _keyGenerator = null) {
    return _inputs.map((_input, _index) => {
      const key = _keyGenerator ? _keyGenerator(_input, _index) : `batch_${_index}`;
      return this.renderWithCache(key, _input);
    });
  }

  /**
   * 비동기 렌더링 (대용량 처리)
   */
  async renderAsync(_input) {
    return new Promise((_resolve) => {
      setTimeout(() => {
        _resolve(this.render(_input));
      }, 0);
    });
  }

  /**
   * 디버그 정보
   */
  getDebugInfo() {
    return {
      name: this.constructor.name,
      cache_stats: this.getCacheStats(),
    };
  }
}
