/**
 * 파일: src/services/file/FileCacheService.js
 * 기능: 파일 콘텐츠 캐싱
 * 책임: 파일 읽기/쓰기 결과 캐싱, LRU 정책
 */

import BaseService from '../../core/BaseService.js';

export default class FileCacheService extends BaseService {
  constructor() {
    super();
    this.cache = new Map();
    this.cache_size_limit = 100; // 최대 100개 파일 캐싱
    this.cache_order = []; // LRU를 위한 순서 추적
  }

  /**
   * 초기화
   */
  initialize() {
    this.is_initialized = true;
  }

  /**
   * 캐시에서 파일 내용 가져오기
   */
  get(_path) {
    this.validateNonEmptyString(_path, 'path');

    if (!this.cache.has(_path)) {
      return null;
    }

    // LRU: 접근 시 순서 업데이트
    this.#updateAccessOrder(_path);

    return this.cache.get(_path);
  }

  /**
   * 캐시에 파일 내용 저장
   */
  set(_path, _content) {
    this.validateNonEmptyString(_path, 'path');
    this.validateString(_content, 'content');

    // 캐시 크기 제한 확인
    if (!this.cache.has(_path) && this.cache.size >= this.cache_size_limit) {
      this.#evictLRU();
    }

    this.cache.set(_path, _content);
    this.#updateAccessOrder(_path);
  }

  /**
   * 특정 경로 캐시 무효화
   */
  invalidate(_path) {
    if (!_path) {
      this.handleError(new Error('Path is required'), 'invalidate');
      return false;
    }

    const deleted = this.cache.delete(_path);
    if (deleted) {
      const index = this.cache_order.indexOf(_path);
      if (index !== -1) {
        this.cache_order.splice(index, 1);
      }
    }

    return deleted;
  }

  /**
   * 전체 캐시 초기화
   */
  clear() {
    this.cache.clear();
    this.cache_order = [];
  }

  /**
   * 캐시 존재 여부 확인
   */
  has(_path) {
    this.validateNonEmptyString(_path, 'path');
    return this.cache.has(_path);
  }

  /**
   * 캐시 통계
   */
  getStatistics() {
    return {
      size: this.cache.size,
      limit: this.cache_size_limit,
      usage_percent: (this.cache.size / this.cache_size_limit) * 100,
      paths: Array.from(this.cache.keys()),
    };
  }

  /**
   * 캐시 크기 제한 설정
   */
  setCacheSizeLimit(_limit) {
    this.validatePositiveNumber(_limit, 'limit');

    this.cache_size_limit = _limit;

    // 현재 캐시가 새 제한보다 크면 축소
    while (this.cache.size > this.cache_size_limit) {
      this.#evictLRU();
    }
  }

  /**
   * LRU 접근 순서 업데이트 (private)
   */
  #updateAccessOrder(_path) {
    // 기존 위치 제거
    const index = this.cache_order.indexOf(_path);
    if (index !== -1) {
      this.cache_order.splice(index, 1);
    }

    // 맨 뒤에 추가 (가장 최근 접근)
    this.cache_order.push(_path);
  }

  /**
   * LRU 제거 (private)
   */
  #evictLRU() {
    if (this.cache_order.length === 0) return;

    // 가장 오래된 항목 제거
    const oldest_path = this.cache_order.shift();
    this.cache.delete(oldest_path);
  }

  /**
   * 서비스 종료
   */
  destroy() {
    this.clear();
    this.is_initialized = false;
    super.destroy();
  }
}
