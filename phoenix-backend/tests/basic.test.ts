import { describe, it, expect } from '@jest/globals';

describe('Basic Tests', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should perform basic math operations', () => {
    expect(2 + 2).toBe(4);
    expect(10 - 5).toBe(5);
  });
});
