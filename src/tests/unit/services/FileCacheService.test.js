/**
 * 파일: src/tests/unit/services/FileCacheService.test.js
 * 기능: FileCacheService 단위 테스트
 */

import FileCacheService from '../../../services/file/FileCacheService.js';
import { TestRunner, expect } from '../../TestRunner.js';

const runner = new TestRunner();

runner.describe('FileCacheService', () => {
  let cache;

  runner.beforeEach(() => {
    cache = new FileCacheService();
    cache.initialize();
  });

  // 기본 기능
  runner.it('should initialize successfully', () => {
    expect(cache.is_initialized).toBe(true);
    expect(cache.cache.size).toBe(0);
  });

  runner.it('should set and get cache', () => {
    cache.set('/test.js', 'content');
    expect(cache.get('/test.js')).toBe('content');
  });

  runner.it('should return null for missing cache', () => {
    expect(cache.get('/missing.js')).toBe(null);
  });

  runner.it('should check cache existence', () => {
    cache.set('/test.js', 'content');
    expect(cache.has('/test.js')).toBe(true);
    expect(cache.has('/missing.js')).toBe(false);
  });

  // LRU 동작
  runner.it('should evict LRU when cache is full', () => {
    cache.setCacheSizeLimit(3);

    cache.set('/file1.js', 'content1');
    cache.set('/file2.js', 'content2');
    cache.set('/file3.js', 'content3');

    // 4번째 추가 시 file1 제거됨
    cache.set('/file4.js', 'content4');

    expect(cache.has('/file1.js')).toBe(false);
    expect(cache.has('/file2.js')).toBe(true);
    expect(cache.has('/file3.js')).toBe(true);
    expect(cache.has('/file4.js')).toBe(true);
  });

  runner.it('should update LRU order on access', () => {
    cache.setCacheSizeLimit(3);

    cache.set('/file1.js', 'content1');
    cache.set('/file2.js', 'content2');
    cache.set('/file3.js', 'content3');

    // file1 재접근 (LRU 순서 변경)
    cache.get('/file1.js');

    // 4번째 추가 시 file2가 제거됨 (file1은 최근 접근)
    cache.set('/file4.js', 'content4');

    expect(cache.has('/file1.js')).toBe(true);
    expect(cache.has('/file2.js')).toBe(false);
    expect(cache.has('/file3.js')).toBe(true);
    expect(cache.has('/file4.js')).toBe(true);
  });

  // 무효화
  runner.it('should invalidate specific cache', () => {
    cache.set('/test.js', 'content');
    cache.invalidate('/test.js');
    expect(cache.has('/test.js')).toBe(false);
  });

  runner.it('should clear all cache', () => {
    cache.set('/file1.js', 'content1');
    cache.set('/file2.js', 'content2');
    cache.clear();
    expect(cache.cache.size).toBe(0);
  });

  // 통계
  runner.it('should return cache statistics', () => {
    cache.setCacheSizeLimit(10);
    cache.set('/file1.js', 'content1');
    cache.set('/file2.js', 'content2');

    const stats = cache.getStatistics();
    expect(stats.size).toBe(2);
    expect(stats.limit).toBe(10);
    expect(stats.usage_percent).toBe(20);
    expect(stats.paths).toContain('/file1.js');
  });

  // 설정
  runner.it('should update cache size limit', () => {
    cache.setCacheSizeLimit(5);
    expect(cache.cache_size_limit).toBe(5);
  });

  runner.it('should shrink cache when limit decreased', () => {
    cache.setCacheSizeLimit(5);
    cache.set('/file1.js', 'content1');
    cache.set('/file2.js', 'content2');
    cache.set('/file3.js', 'content3');

    cache.setCacheSizeLimit(2);
    expect(cache.cache.size).toBe(2);
  });

  // 검증
  runner.it('should validate path parameter', () => {
    expect(() => cache.get('')).toThrow();
    expect(() => cache.set('', 'content')).toThrow();
  });

  runner.it('should validate content parameter', () => {
    expect(() => cache.set('/test.js', null)).toThrow();
  });

  // 종료
  runner.it('should destroy cleanly', () => {
    cache.set('/test.js', 'content');
    cache.destroy();
    expect(cache.is_initialized).toBe(false);
    expect(cache.cache.size).toBe(0);
  });
});

runner.run();
