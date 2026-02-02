import { describe, it, expect, vi } from 'vitest';

describe('Pattern Library', () => {
  it('should have pattern database schema with required fields', async () => {
    // Import schema to verify it exists
    const { copyPatterns } = await import('../drizzle/schema');
    
    // Verify table exists
    expect(copyPatterns).toBeDefined();
    
    // The schema should have the expected columns
    const columns = Object.keys(copyPatterns);
    expect(columns).toContain('id');
    expect(columns).toContain('userId');
    expect(columns).toContain('componentType');
    expect(columns).toContain('text');
  });

  it('should have pattern database helpers', async () => {
    const patternDb = await import('./patternDb');
    
    // Verify all CRUD functions exist
    expect(typeof patternDb.createPattern).toBe('function');
    expect(typeof patternDb.listPatterns).toBe('function');
    expect(typeof patternDb.searchPatterns).toBe('function');
    expect(typeof patternDb.updatePattern).toBe('function');
    expect(typeof patternDb.deletePattern).toBe('function');
    expect(typeof patternDb.findSimilarPatterns).toBe('function');
    expect(typeof patternDb.getPatternsAsContext).toBe('function');
  });

  it('should search patterns by component type', async () => {
    const { searchPatterns } = await import('./patternDb');
    
    // This should not throw even with no patterns
    const results = await searchPatterns({
      userId: 999,
      query: 'button',
      limit: 10
    });
    expect(Array.isArray(results)).toBe(true);
  });
});
