/**
 * 파일: src/tests/unit/core/BaseModel.test.js
 * 기능: BaseModel 단위 테스트
 * 책임: BaseModel의 모든 기능 검증
 */

import BaseModel from '../../../core/BaseModel.js';
import { TestRunner, createMock, expect } from '../../TestRunner.js';

// 테스트용 구체 클래스
class TestModel extends BaseModel {
  constructor() {
    super();
    this.set('name', '');
    this.set('age', 0);
  }

  toJSON() {
    return {
      name: this.get('name'),
      age: this.get('age'),
    };
  }

  fromJSON(_json) {
    this.set('name', _json.name || '');
    this.set('age', _json.age || 0);
  }
}

const runner = new TestRunner();

runner.describe('BaseModel', () => {
  let model;

  runner.beforeEach(() => {
    model = new TestModel();
  });

  runner.it('should create a model', () => {
    expect(model).toBeInstanceOf(BaseModel);
    expect(model).toBeInstanceOf(TestModel);
  });

  runner.it('should set and get data', () => {
    model.set('name', 'John');
    expect(model.get('name')).toBe('John');

    model.set('age', 30);
    expect(model.get('age')).toBe(30);
  });

  runner.it('should emit change event when data changes', () => {
    const mock = createMock();
    model.on('change', mock);

    model.set('name', 'Jane');

    expect(mock.callCount()).toBe(1);
    expect(mock.calls[0][0].key).toBe('name');
    expect(mock.calls[0][0].new_value).toBe('Jane');
  });

  runner.it('should emit specific change event', () => {
    const mock = createMock();
    model.on('change:name', mock);

    model.set('name', 'Bob');

    expect(mock.callCount()).toBe(1);
  });

  runner.it('should not emit event if value is same', () => {
    const mock = createMock();
    model.on('change', mock);

    model.set('name', 'John');
    model.set('name', 'John'); // 동일한 값

    expect(mock.callCount()).toBe(1); // 한 번만 호출
  });

  runner.it('should track dirty state', () => {
    expect(model.isDirty()).toBe(false);

    model.set('name', 'John');
    expect(model.isDirty()).toBe(true);

    model.clearDirty();
    expect(model.isDirty()).toBe(false);
  });

  runner.it('should set multiple values', () => {
    model.setMultiple({
      name: 'Alice',
      age: 25,
    });

    expect(model.get('name')).toBe('Alice');
    expect(model.get('age')).toBe(25);
  });

  runner.it('should check if has property', () => {
    model.set('name', 'John');
    expect(model.has('name')).toBe(true);
    expect(model.has('nonexistent')).toBe(false);
  });

  runner.it('should delete property', () => {
    model.set('name', 'John');
    expect(model.has('name')).toBe(true);

    model.delete('name');
    expect(model.has('name')).toBe(false);
  });

  runner.it('should get all data', () => {
    model.set('name', 'John');
    model.set('age', 30);

    const all_data = model.getAll();
    expect(all_data.name).toBe('John');
    expect(all_data.age).toBe(30);
  });

  runner.it('should reset data', () => {
    model.set('name', 'John');
    model.set('age', 30);

    model.reset();

    expect(model.has('name')).toBe(false);
    expect(model.has('age')).toBe(false);
    expect(model.isDirty()).toBe(false);
  });

  runner.it('should clone model', () => {
    model.set('name', 'John');
    model.set('age', 30);

    const cloned = model.clone();

    expect(cloned.get('name')).toBe('John');
    expect(cloned.get('age')).toBe(30);
    expect(cloned).not.toBe(model); // 다른 인스턴스
  });

  runner.it('should compare models for equality', () => {
    const model1 = new TestModel();
    const model2 = new TestModel();

    model1.set('name', 'John');
    model1.set('age', 30);

    model2.set('name', 'John');
    model2.set('age', 30);

    expect(model1.equals(model2)).toBe(true);

    model2.set('age', 31);
    expect(model1.equals(model2)).toBe(false);
  });

  runner.it('should serialize to JSON', () => {
    model.set('name', 'John');
    model.set('age', 30);

    const json = model.toJSON();

    expect(json.name).toBe('John');
    expect(json.age).toBe(30);
  });

  runner.it('should deserialize from JSON', () => {
    const json = {
      name: 'Jane',
      age: 25,
    };

    model.fromJSON(json);

    expect(model.get('name')).toBe('Jane');
    expect(model.get('age')).toBe(25);
  });

  runner.it('should provide debug info', () => {
    model.set('name', 'John');
    const debug = model.getDebugInfo();

    expect(debug.name).toBe('TestModel');
    expect(debug.is_dirty).toBe(true);
    expect(debug.keys_count).toBeGreaterThan(0);
  });
});

// 테스트 실행
runner.run();
