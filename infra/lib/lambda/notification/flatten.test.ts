/**
 * Tests for Payload Flattening Utility
 *
 * Story: N7-2 - Payload Flattening Utility
 * FRs: FR-ENRICH-7 to FR-ENRICH-18
 */

import {
  flattenObject,
  flatten,
  stringifyValue,
  calculatePayloadSize,
  truncatePayloadToSize,
  mergeWithEnriched,
  generateKeys,
  addKeysParameter,
  prepareNotificationPayload,
  SEPARATOR,
  MAX_DEPTH,
  MAX_ARRAY_ITEMS,
  MAX_PAYLOAD_SIZE_BYTES,
  MAX_KEYS_LENGTH,
  KEYS_FIELD_NAME,
  type FlattenedPayload,
} from './flatten';

// =============================================================================
// stringifyValue Tests
// =============================================================================

describe('stringifyValue', () => {
  describe('N7-3 AC-1: Numbers become strings', () => {
    it('converts integer to string', () => {
      expect(stringifyValue(42)).toBe('42');
    });

    it('converts float to string', () => {
      expect(stringifyValue(3.14159)).toBe('3.14159');
    });

    it('converts negative number to string', () => {
      expect(stringifyValue(-100)).toBe('-100');
    });

    it('converts zero to string', () => {
      expect(stringifyValue(0)).toBe('0');
    });
  });

  describe('N7-3 AC-2: Booleans become strings', () => {
    it('converts true to "true"', () => {
      expect(stringifyValue(true)).toBe('true');
    });

    it('converts false to "false"', () => {
      expect(stringifyValue(false)).toBe('false');
    });
  });

  describe('N7-3 AC-3: Strings remain unchanged', () => {
    it('returns string unchanged', () => {
      expect(stringifyValue('hello')).toBe('hello');
    });

    it('returns empty string unchanged', () => {
      expect(stringifyValue('')).toBe('');
    });
  });

  describe('N7-3 AC-5, AC-6: Skip null and undefined', () => {
    it('returns null for null value', () => {
      expect(stringifyValue(null)).toBeNull();
    });

    it('returns null for undefined value', () => {
      expect(stringifyValue(undefined)).toBeNull();
    });
  });

  describe('Date handling', () => {
    it('converts Date to ISO 8601 string', () => {
      const date = new Date('2025-01-15T10:30:00Z');
      expect(stringifyValue(date)).toBe('2025-01-15T10:30:00.000Z');
    });
  });

  describe('Unsupported types', () => {
    it('returns null for objects', () => {
      expect(stringifyValue({ foo: 'bar' })).toBeNull();
    });

    it('returns null for arrays', () => {
      expect(stringifyValue([1, 2, 3])).toBeNull();
    });

    it('returns null for functions', () => {
      expect(stringifyValue(() => {})).toBeNull();
    });
  });
});

// =============================================================================
// flattenObject Tests - Basic Flattening
// =============================================================================

describe('flattenObject', () => {
  describe('FR-ENRICH-7: Flatten nested objects with underscore separator', () => {
    it('flattens single level nesting', () => {
      const input = { meta: { createdTime: '2025-01-15' } };
      const result = flattenObject(input);
      expect(result.flattened).toEqual({ meta_createdTime: '2025-01-15' });
    });

    it('flattens meta object with multiple fields (FR-ENRICH-9, 10, 11)', () => {
      const input = {
        meta: {
          createdTime: '2025-01-15T10:00:00Z',
          lastEditTime: '2025-01-16T14:30:00Z',
          schemaVersion: '1.0',
        },
      };
      const result = flattenObject(input);
      expect(result.flattened).toEqual({
        meta_createdTime: '2025-01-15T10:00:00Z',
        meta_lastEditTime: '2025-01-16T14:30:00Z',
        meta_schemaVersion: '1.0',
      });
    });

    it('preserves top-level fields alongside nested fields', () => {
      const input = {
        uuid: '12345',
        meta: { createdTime: '2025-01-15' },
      };
      const result = flattenObject(input);
      expect(result.flattened).toEqual({
        uuid: '12345',
        meta_createdTime: '2025-01-15',
      });
    });
  });

  describe('FR-ENRICH-8: Handle multiple nesting levels', () => {
    it('flattens two levels deep', () => {
      const input = { a: { b: { c: 'value' } } };
      const result = flattenObject(input);
      expect(result.flattened).toEqual({ a_b_c: 'value' });
    });

    it('flattens three levels deep', () => {
      const input = { level1: { level2: { level3: { data: 'deep' } } } };
      const result = flattenObject(input);
      expect(result.flattened).toEqual({ level1_level2_level3_data: 'deep' });
    });

    it('flattens mixed depth levels', () => {
      const input = {
        shallow: 'value1',
        nested: {
          mid: 'value2',
          deep: { inner: 'value3' },
        },
      };
      const result = flattenObject(input);
      expect(result.flattened).toEqual({
        shallow: 'value1',
        nested_mid: 'value2',
        nested_deep_inner: 'value3',
      });
    });
  });

  describe('N7-2 AC-7: Max depth limit of 5 levels', () => {
    it('skips values beyond max depth', () => {
      const input = {
        l1: { l2: { l3: { l4: { l5: { l6: 'too deep' } } } } },
      };
      const result = flattenObject(input);
      expect(result.flattened).not.toHaveProperty('l1_l2_l3_l4_l5_l6');
      expect(result.truncatedByDepth).toBe(1);
    });

    it('includes values at max depth (level 5)', () => {
      const input = {
        l1: { l2: { l3: { l4: { l5: 'at limit' } } } },
      };
      const result = flattenObject(input);
      expect(result.flattened).toEqual({ l1_l2_l3_l4_l5: 'at limit' });
      expect(result.truncatedByDepth).toBe(0);
    });

    it('respects custom max depth option', () => {
      const input = { a: { b: { c: 'deep' } } };
      const result = flattenObject(input, { maxDepth: 2 });
      expect(result.flattened).not.toHaveProperty('a_b_c');
      expect(result.truncatedByDepth).toBe(1);
    });
  });
});

// =============================================================================
// flattenObject Tests - Array Handling
// =============================================================================

describe('flattenObject - Arrays', () => {
  describe('FR-ENRICH-12-14: Flatten arrays of objects', () => {
    it('flattens array of objects with index notation', () => {
      const input = {
        budgetThresholds: [{ dollarsSpent: 50, action: 'notify' }],
      };
      const result = flattenObject(input);
      expect(result.flattened).toEqual({
        budgetThresholds_0_dollarsSpent: '50',
        budgetThresholds_0_action: 'notify',
      });
    });

    it('flattens multiple array items (FR-ENRICH-13, 14)', () => {
      const input = {
        budgetThresholds: [
          { dollarsSpent: 50, action: 'notify' },
          { dollarsSpent: 100, action: 'freeze' },
        ],
      };
      const result = flattenObject(input);
      expect(result.flattened).toEqual({
        budgetThresholds_0_dollarsSpent: '50',
        budgetThresholds_0_action: 'notify',
        budgetThresholds_1_dollarsSpent: '100',
        budgetThresholds_1_action: 'freeze',
      });
    });

    it('flattens durationThresholds array (FR-ENRICH-15, 16)', () => {
      const input = {
        durationThresholds: [
          { hoursRemaining: 24, action: 'notify' },
          { hoursRemaining: 1, action: 'warn' },
        ],
      };
      const result = flattenObject(input);
      expect(result.flattened).toEqual({
        durationThresholds_0_hoursRemaining: '24',
        durationThresholds_0_action: 'notify',
        durationThresholds_1_hoursRemaining: '1',
        durationThresholds_1_action: 'warn',
      });
    });
  });

  describe('FR-ENRICH-17: Flatten arrays of primitives', () => {
    it('flattens string array with index notation', () => {
      const input = { tags: ['a', 'b', 'c'] };
      const result = flattenObject(input);
      expect(result.flattened).toEqual({
        tags_0: 'a',
        tags_1: 'b',
        tags_2: 'c',
      });
    });

    it('flattens number array', () => {
      const input = { values: [10, 20, 30] };
      const result = flattenObject(input);
      expect(result.flattened).toEqual({
        values_0: '10',
        values_1: '20',
        values_2: '30',
      });
    });

    it('flattens boolean array', () => {
      const input = { flags: [true, false, true] };
      const result = flattenObject(input);
      expect(result.flattened).toEqual({
        flags_0: 'true',
        flags_1: 'false',
        flags_2: 'true',
      });
    });
  });

  describe('FR-ENRICH-18: Handle empty arrays', () => {
    it('empty arrays produce no output fields', () => {
      const input = { emptyList: [] };
      const result = flattenObject(input);
      expect(result.flattened).toEqual({});
    });

    it('empty arrays alongside other fields', () => {
      const input = {
        name: 'test',
        emptyList: [],
        value: 42,
      };
      const result = flattenObject(input);
      expect(result.flattened).toEqual({
        name: 'test',
        value: '42',
      });
    });
  });

  describe('N7-2 AC-8: Arrays with > 10 items are truncated', () => {
    it('truncates array at 10 items and adds count field', () => {
      const input = {
        items: Array.from({ length: 15 }, (_, i) => `item${i}`),
      };
      const result = flattenObject(input);

      // Should have first 10 items
      expect(result.flattened).toHaveProperty('items_0', 'item0');
      expect(result.flattened).toHaveProperty('items_9', 'item9');

      // Should NOT have items beyond 10
      expect(result.flattened).not.toHaveProperty('items_10');

      // Should have count field
      expect(result.flattened).toHaveProperty('items_count', '15');

      // Check truncation metadata
      expect(result.truncatedArrayItems).toBe(5);
    });

    it('respects custom maxArrayItems option', () => {
      const input = { items: ['a', 'b', 'c', 'd', 'e'] };
      const result = flattenObject(input, { maxArrayItems: 3 });

      expect(result.flattened).toHaveProperty('items_0', 'a');
      expect(result.flattened).toHaveProperty('items_2', 'c');
      expect(result.flattened).not.toHaveProperty('items_3');
      expect(result.flattened).toHaveProperty('items_count', '5');
      expect(result.truncatedArrayItems).toBe(2);
    });

    it('no count field when array is within limit', () => {
      const input = { items: ['a', 'b', 'c'] };
      const result = flattenObject(input);

      expect(result.flattened).not.toHaveProperty('items_count');
      expect(result.truncatedArrayItems).toBe(0);
    });
  });
});

// =============================================================================
// flattenObject Tests - Value Type Handling
// =============================================================================

describe('flattenObject - Value Types', () => {
  it('handles null values (skips them)', () => {
    const input = { name: 'test', nullable: null };
    const result = flattenObject(input);
    expect(result.flattened).toEqual({ name: 'test' });
  });

  it('handles undefined values (skips them)', () => {
    const input = { name: 'test', undef: undefined };
    const result = flattenObject(input);
    expect(result.flattened).toEqual({ name: 'test' });
  });

  it('handles mixed value types', () => {
    const input = {
      stringVal: 'hello',
      numberVal: 42,
      boolVal: true,
      nullVal: null,
      nestedObj: { inner: 'value' },
    };
    const result = flattenObject(input);
    expect(result.flattened).toEqual({
      stringVal: 'hello',
      numberVal: '42',
      boolVal: 'true',
      nestedObj_inner: 'value',
    });
  });

  it('handles Date objects', () => {
    const input = {
      createdAt: new Date('2025-01-15T10:30:00Z'),
    };
    const result = flattenObject(input);
    expect(result.flattened).toEqual({
      createdAt: '2025-01-15T10:30:00.000Z',
    });
  });
});

// =============================================================================
// flattenObject Tests - Real Lease Record
// =============================================================================

describe('flattenObject - Real Lease Record', () => {
  it('flattens a realistic lease record correctly', () => {
    const leaseRecord = {
      userEmail: 'test@example.gov.uk',
      uuid: 'lease-123',
      status: 'Active',
      maxSpend: 500,
      totalCostAccrued: 123.45,
      leaseDurationInHours: 24,
      meta: {
        createdTime: '2025-01-15T10:00:00Z',
        lastEditTime: '2025-01-16T14:30:00Z',
        schemaVersion: '1.0',
      },
      budgetThresholds: [
        { dollarsSpent: 250, action: 'notify' },
        { dollarsSpent: 400, action: 'warn' },
        { dollarsSpent: 500, action: 'freeze' },
      ],
      durationThresholds: [
        { hoursRemaining: 4, action: 'notify' },
        { hoursRemaining: 1, action: 'warn' },
      ],
    };

    const result = flattenObject(leaseRecord);

    expect(result.flattened).toEqual({
      userEmail: 'test@example.gov.uk',
      uuid: 'lease-123',
      status: 'Active',
      maxSpend: '500',
      totalCostAccrued: '123.45',
      leaseDurationInHours: '24',
      meta_createdTime: '2025-01-15T10:00:00Z',
      meta_lastEditTime: '2025-01-16T14:30:00Z',
      meta_schemaVersion: '1.0',
      budgetThresholds_0_dollarsSpent: '250',
      budgetThresholds_0_action: 'notify',
      budgetThresholds_1_dollarsSpent: '400',
      budgetThresholds_1_action: 'warn',
      budgetThresholds_2_dollarsSpent: '500',
      budgetThresholds_2_action: 'freeze',
      durationThresholds_0_hoursRemaining: '4',
      durationThresholds_0_action: 'notify',
      durationThresholds_1_hoursRemaining: '1',
      durationThresholds_1_action: 'warn',
    });

    expect(result.truncatedByDepth).toBe(0);
    expect(result.truncatedArrayItems).toBe(0);
  });
});

// =============================================================================
// Payload Size Tests
// =============================================================================

describe('calculatePayloadSize', () => {
  it('calculates size of empty object', () => {
    expect(calculatePayloadSize({})).toBe(2); // "{}"
  });

  it('calculates size of simple object', () => {
    const payload = { a: 'b' };
    // {"a":"b"} = 2 + 1+3 + 1+2 = 9
    const size = calculatePayloadSize(payload);
    expect(size).toBeGreaterThan(0);
  });

  it('increases with more fields', () => {
    const small = { a: 'b' };
    const large = { a: 'b', c: 'd', e: 'f' };
    expect(calculatePayloadSize(large)).toBeGreaterThan(calculatePayloadSize(small));
  });
});

describe('truncatePayloadToSize', () => {
  it('removes fields to meet size limit', () => {
    const payload: FlattenedPayload = {
      short: 'a',
      nested_long: 'x'.repeat(1000),
      another_nested: 'y'.repeat(500),
    };

    truncatePayloadToSize(payload, 100, 'test-event');

    // Should have removed large fields
    expect(Object.keys(payload).length).toBeLessThan(3);
    expect(calculatePayloadSize(payload)).toBeLessThanOrEqual(100);
  });

  it('prioritizes removing nested fields', () => {
    const payload: FlattenedPayload = {
      root: 'x'.repeat(50),
      nested_field: 'y'.repeat(50),
    };

    truncatePayloadToSize(payload, 80, 'test-event');

    // Should remove nested field first
    expect(payload).not.toHaveProperty('nested_field');
    expect(payload).toHaveProperty('root');
  });

  it('does nothing if already under limit', () => {
    const payload: FlattenedPayload = { a: 'b' };
    const originalKeys = Object.keys(payload).length;

    truncatePayloadToSize(payload, 1000, 'test-event');

    expect(Object.keys(payload).length).toBe(originalKeys);
  });
});

// =============================================================================
// Convenience Function Tests
// =============================================================================

describe('flatten convenience function', () => {
  it('returns just the flattened payload', () => {
    const input = { a: { b: 'c' } };
    const result = flatten(input);
    expect(result).toEqual({ a_b: 'c' });
  });
});

// =============================================================================
// Merge Tests
// =============================================================================

describe('mergeWithEnriched', () => {
  it('merges event data with enriched data', () => {
    const eventData = { uuid: '123', userName: 'Test User' };
    const enrichedData = { maxSpend: 500, leaseDurationInHours: 24 };

    const result = mergeWithEnriched(eventData, enrichedData);

    expect(result).toEqual({
      uuid: '123',
      userName: 'Test User',
      maxSpend: '500',
      leaseDurationInHours: '24',
    });
  });

  it('enriched data takes precedence for duplicate fields (N7-4 AC-1)', () => {
    const eventData = { maxSpend: 100 };
    const enrichedData = { maxSpend: 500 };

    const result = mergeWithEnriched(eventData, enrichedData);

    expect(result.maxSpend).toBe('500');
  });

  it('handles nested data in both sources', () => {
    const eventData = { meta: { source: 'event' } };
    const enrichedData = { meta: { source: 'enriched', extra: 'field' } };

    const result = mergeWithEnriched(eventData, enrichedData);

    // Enriched takes precedence
    expect(result.meta_source).toBe('enriched');
    expect(result.meta_extra).toBe('field');
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('handles empty object', () => {
    const result = flattenObject({});
    expect(result.flattened).toEqual({});
    expect(result.truncatedByDepth).toBe(0);
  });

  it('handles deeply nested empty objects', () => {
    const input = { a: { b: { c: {} } } };
    const result = flattenObject(input);
    expect(result.flattened).toEqual({});
  });

  it('handles arrays of mixed types', () => {
    const input = { mixed: [1, 'two', true, null] };
    const result = flattenObject(input);
    expect(result.flattened).toEqual({
      mixed_0: '1',
      mixed_1: 'two',
      mixed_2: 'true',
      // null is skipped
    });
  });

  it('handles custom separator', () => {
    const input = { a: { b: 'c' } };
    const result = flattenObject(input, { separator: '.' });
    expect(result.flattened).toEqual({ 'a.b': 'c' });
  });

  it('preserves empty string values', () => {
    const input = { name: '', value: 'not empty' };
    const result = flattenObject(input);
    expect(result.flattened).toEqual({
      name: '',
      value: 'not empty',
    });
  });

  it('handles arrays with nested objects at depth limit', () => {
    // Depth: l1(1) -> l2(2) -> items(3) -> [0](4) -> value(5) = at limit
    const input = {
      l1: {
        l2: {
          items: [{ value: 'should work' }],
        },
      },
    };
    const result = flattenObject(input);
    expect(result.flattened).toHaveProperty('l1_l2_items_0_value', 'should work');
  });

  it('skips arrays with nested objects beyond depth limit', () => {
    // Depth: l1(1) -> l2(2) -> l3(3) -> items(4) -> [0](5) -> value(6) = exceeds limit
    const input = {
      l1: {
        l2: {
          l3: {
            items: [{ value: 'too deep' }],
          },
        },
      },
    };
    const result = flattenObject(input);
    expect(result.flattened).not.toHaveProperty('l1_l2_l3_items_0_value');
    expect(result.truncatedByDepth).toBe(1);
  });
});

// =============================================================================
// Story 7.3: Keys Parameter Tests
// =============================================================================

describe('generateKeys', () => {
  describe('N7-3 AC-7: Keys field contains comma-separated list of field names', () => {
    it('generates keys from simple payload', () => {
      const payload: FlattenedPayload = { a: '1', b: '2', c: '3' };
      const keys = generateKeys(payload);
      expect(keys).toBe('a,b,c');
    });

    it('generates keys from nested flattened payload', () => {
      const payload: FlattenedPayload = {
        uuid: '123',
        meta_createdTime: '2025-01-01',
        budgetThresholds_0_action: 'notify',
      };
      const keys = generateKeys(payload);
      expect(keys).toBe('budgetThresholds_0_action,meta_createdTime,uuid');
    });
  });

  describe('N7-3 AC-8: Keys are sorted alphabetically', () => {
    it('sorts keys alphabetically', () => {
      const payload: FlattenedPayload = { zebra: '1', alpha: '2', mango: '3' };
      const keys = generateKeys(payload);
      expect(keys).toBe('alpha,mango,zebra');
    });

    it('sorts numeric keys correctly', () => {
      const payload: FlattenedPayload = {
        items_10: 'a',
        items_1: 'b',
        items_2: 'c',
      };
      const keys = generateKeys(payload);
      // Alphabetic sort means "10" comes before "2"
      expect(keys).toBe('items_1,items_10,items_2');
    });
  });

  describe('N7-3 AC-9: Keys field excludes itself', () => {
    it('does not include keys field in the list', () => {
      const payload: FlattenedPayload = { a: '1', keys: 'existing', b: '2' };
      const keys = generateKeys(payload);
      expect(keys).toBe('a,b');
      expect(keys).not.toContain('keys');
    });
  });

  describe('N7-3 AC-9: Keys parameter truncation', () => {
    it('truncates keys to MAX_KEYS_LENGTH with "..." suffix', () => {
      // Create payload with many long keys that exceed 5000 chars
      const payload: FlattenedPayload = {};
      for (let i = 0; i < 200; i++) {
        payload[`very_long_field_name_${i.toString().padStart(4, '0')}`] = 'value';
      }

      const keys = generateKeys(payload);

      expect(keys.length).toBeLessThanOrEqual(MAX_KEYS_LENGTH);
      expect(keys).toMatch(/\.\.\.$/);
    });

    it('does not truncate short keys', () => {
      const payload: FlattenedPayload = { a: '1', b: '2', c: '3' };
      const keys = generateKeys(payload);

      expect(keys).toBe('a,b,c');
      expect(keys).not.toMatch(/\.\.\.$/);
    });
  });

  it('handles empty payload', () => {
    const payload: FlattenedPayload = {};
    const keys = generateKeys(payload);
    expect(keys).toBe('');
  });
});

describe('addKeysParameter', () => {
  it('adds keys field to payload', () => {
    const payload: FlattenedPayload = { a: '1', b: '2' };
    const result = addKeysParameter(payload);

    expect(result).toHaveProperty('keys', 'a,b');
    expect(result.a).toBe('1');
    expect(result.b).toBe('2');
  });

  it('replaces existing keys field', () => {
    const payload: FlattenedPayload = { a: '1', keys: 'old' };
    const result = addKeysParameter(payload);

    expect(result.keys).toBe('a');
  });
});

describe('prepareNotificationPayload', () => {
  it('merges event and enriched data with keys', () => {
    const eventData = { uuid: '123', userName: 'Test' };
    const enrichedData = { maxSpend: 500, leaseDurationInHours: 24 };

    const result = prepareNotificationPayload(eventData, enrichedData);

    expect(result.uuid).toBe('123');
    expect(result.userName).toBe('Test');
    expect(result.maxSpend).toBe('500');
    expect(result.leaseDurationInHours).toBe('24');
    expect(result.keys).toBe('leaseDurationInHours,maxSpend,userName,uuid');
  });

  it('enriched data takes precedence (N7-4 AC-1)', () => {
    const eventData = { maxSpend: 100 };
    const enrichedData = { maxSpend: 500 };

    const result = prepareNotificationPayload(eventData, enrichedData);

    expect(result.maxSpend).toBe('500');
  });

  it('includes keys in all payloads (N7-3 AC-11)', () => {
    const eventData = { uuid: '123' };
    const enrichedData = {};

    const result = prepareNotificationPayload(eventData, enrichedData);

    expect(result).toHaveProperty('keys');
    expect(result.keys).toBe('uuid');
  });
});

// =============================================================================
// Constants Tests
// =============================================================================

describe('Constants', () => {
  it('SEPARATOR is underscore', () => {
    expect(SEPARATOR).toBe('_');
  });

  it('MAX_DEPTH is 5', () => {
    expect(MAX_DEPTH).toBe(5);
  });

  it('MAX_ARRAY_ITEMS is 10', () => {
    expect(MAX_ARRAY_ITEMS).toBe(10);
  });

  it('MAX_PAYLOAD_SIZE_BYTES is 50KB', () => {
    expect(MAX_PAYLOAD_SIZE_BYTES).toBe(50 * 1024);
  });

  it('MAX_KEYS_LENGTH is 5000', () => {
    expect(MAX_KEYS_LENGTH).toBe(5000);
  });

  it('KEYS_FIELD_NAME is "keys"', () => {
    expect(KEYS_FIELD_NAME).toBe('keys');
  });
});
