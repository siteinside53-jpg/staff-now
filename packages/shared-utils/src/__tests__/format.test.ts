import { describe, it, expect } from 'vitest';
import { formatCurrency, truncateText } from '../format';

describe('formatCurrency', () => {
  it('should format a basic amount in EUR', () => {
    const result = formatCurrency(29);
    // el-GR locale formats EUR; we check key parts
    expect(result).toContain('29');
    expect(result).toContain('00');
  });

  it('should format zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('should format decimal amounts', () => {
    const result = formatCurrency(9.99);
    expect(result).toContain('9');
    expect(result).toContain('99');
  });

  it('should format large amounts', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1');
    expect(result).toContain('234');
    expect(result).toContain('56');
  });

  it('should respect a different locale', () => {
    const result = formatCurrency(29, 'en-US');
    // en-US EUR format uses the euro sign
    expect(result).toContain('29');
  });
});

describe('truncateText', () => {
  it('should return the original text if within maxLength', () => {
    expect(truncateText('Hello', 10)).toBe('Hello');
  });

  it('should return the original text if exactly maxLength', () => {
    expect(truncateText('Hello', 5)).toBe('Hello');
  });

  it('should truncate text exceeding maxLength and add ellipsis', () => {
    expect(truncateText('Hello, World!', 5)).toBe('Hello...');
  });

  it('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('');
  });

  it('should handle maxLength of 0', () => {
    expect(truncateText('Hello', 0)).toBe('...');
  });

  it('should trim trailing spaces before ellipsis', () => {
    expect(truncateText('Hello World', 6)).toBe('Hello...');
  });
});
