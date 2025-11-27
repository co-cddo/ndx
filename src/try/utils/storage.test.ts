/**
 * @jest-environment jsdom
 */

import { safeSessionStorage } from './storage';

describe('SafeStorage', () => {
  const originalSessionStorage = window.sessionStorage;

  afterEach(() => {
    // Restore sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true,
    });
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when sessionStorage is available', () => {
      expect(safeSessionStorage.isAvailable()).toBe(true);
    });

    it('should return false when sessionStorage throws', () => {
      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new Error('SecurityError');
        },
        configurable: true,
      });

      expect(safeSessionStorage.isAvailable()).toBe(false);
    });

    it('should return false when setItem throws QuotaExceededError', () => {
      const mockStorage = {
        setItem: jest.fn().mockImplementation(() => {
          throw new Error('QuotaExceededError');
        }),
        removeItem: jest.fn(),
        getItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
      };

      Object.defineProperty(window, 'sessionStorage', {
        value: mockStorage,
        writable: true,
      });

      expect(safeSessionStorage.isAvailable()).toBe(false);
    });
  });

  describe('getItem', () => {
    it('should return stored value', () => {
      sessionStorage.setItem('test-key', 'test-value');
      expect(safeSessionStorage.getItem('test-key')).toBe('test-value');
    });

    it('should return null for non-existent key', () => {
      expect(safeSessionStorage.getItem('non-existent')).toBeNull();
    });

    it('should return null when sessionStorage throws', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new Error('SecurityError');
        },
        configurable: true,
      });

      expect(safeSessionStorage.getItem('test')).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should return null when getItem throws', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockStorage = {
        getItem: jest.fn().mockImplementation(() => {
          throw new Error('SecurityError');
        }),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
      };

      Object.defineProperty(window, 'sessionStorage', {
        value: mockStorage,
        writable: true,
      });

      expect(safeSessionStorage.getItem('test')).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[SafeStorage] Failed to get item 'test':",
        expect.any(Error)
      );
    });
  });

  describe('setItem', () => {
    it('should store value and return true', () => {
      expect(safeSessionStorage.setItem('test-key', 'test-value')).toBe(true);
      expect(sessionStorage.getItem('test-key')).toBe('test-value');
    });

    it('should return false when sessionStorage throws QuotaExceededError', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockStorage = {
        setItem: jest.fn().mockImplementation(() => {
          throw new Error('QuotaExceededError');
        }),
        getItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
      };

      Object.defineProperty(window, 'sessionStorage', {
        value: mockStorage,
        writable: true,
      });

      expect(safeSessionStorage.setItem('test', 'value')).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should return false when sessionStorage throws SecurityError', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new Error('SecurityError');
        },
        configurable: true,
      });

      expect(safeSessionStorage.setItem('test', 'value')).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('removeItem', () => {
    it('should remove stored item', () => {
      sessionStorage.setItem('test-key', 'test-value');
      safeSessionStorage.removeItem('test-key');
      expect(sessionStorage.getItem('test-key')).toBeNull();
    });

    it('should not throw when removing non-existent key', () => {
      expect(() => safeSessionStorage.removeItem('non-existent')).not.toThrow();
    });

    it('should handle errors silently', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockStorage = {
        removeItem: jest.fn().mockImplementation(() => {
          throw new Error('SecurityError');
        }),
        setItem: jest.fn(),
        getItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
      };

      Object.defineProperty(window, 'sessionStorage', {
        value: mockStorage,
        writable: true,
      });

      expect(() => safeSessionStorage.removeItem('test')).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear all items', () => {
      sessionStorage.setItem('key1', 'value1');
      sessionStorage.setItem('key2', 'value2');
      safeSessionStorage.clear();
      expect(sessionStorage.length).toBe(0);
    });

    it('should handle errors silently', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockStorage = {
        clear: jest.fn().mockImplementation(() => {
          throw new Error('SecurityError');
        }),
        setItem: jest.fn(),
        getItem: jest.fn(),
        removeItem: jest.fn(),
        length: 0,
        key: jest.fn(),
      };

      Object.defineProperty(window, 'sessionStorage', {
        value: mockStorage,
        writable: true,
      });

      expect(() => safeSessionStorage.clear()).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('SSR environment (typeof sessionStorage === undefined)', () => {
    beforeEach(() => {
      // Simulate SSR by making sessionStorage undefined
      Object.defineProperty(window, 'sessionStorage', {
        get: () => undefined,
        configurable: true,
      });
    });

    it('isAvailable should return false', () => {
      expect(safeSessionStorage.isAvailable()).toBe(false);
    });

    it('getItem should return null', () => {
      expect(safeSessionStorage.getItem('test')).toBeNull();
    });

    it('setItem should return false', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      expect(safeSessionStorage.setItem('test', 'value')).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[SafeStorage] sessionStorage unavailable');
    });

    it('removeItem should not throw', () => {
      expect(() => safeSessionStorage.removeItem('test')).not.toThrow();
    });

    it('clear should not throw', () => {
      expect(() => safeSessionStorage.clear()).not.toThrow();
    });
  });
});
