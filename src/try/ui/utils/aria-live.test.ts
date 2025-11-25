/**
 * Unit tests for ARIA Live Region Utility
 *
 * ADR-028: ARIA Live Regions for screen reader announcements
 *
 * @jest-environment jsdom
 */

import { announce, clearAnnouncement } from './aria-live';

describe('ARIA Live Region Utility', () => {
  beforeEach(() => {
    // Clean up any existing live region
    const existingRegion = document.getElementById('aria-live-region');
    if (existingRegion) {
      existingRegion.remove();
    }
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('announce', () => {
    it('should create live region if it does not exist', () => {
      expect(document.getElementById('aria-live-region')).toBeNull();

      announce('Test message');

      const region = document.getElementById('aria-live-region');
      expect(region).not.toBeNull();
    });

    it('should set correct ARIA attributes', () => {
      announce('Test message');

      const region = document.getElementById('aria-live-region');
      expect(region?.getAttribute('role')).toBe('status');
      expect(region?.getAttribute('aria-atomic')).toBe('true');
    });

    it('should use polite priority by default', () => {
      announce('Test message');

      const region = document.getElementById('aria-live-region');
      expect(region?.getAttribute('aria-live')).toBe('polite');
    });

    it('should use assertive priority when specified', () => {
      announce('Urgent message', 'assertive');

      const region = document.getElementById('aria-live-region');
      expect(region?.getAttribute('aria-live')).toBe('assertive');
    });

    it('should set message content after requestAnimationFrame', () => {
      announce('Test message');

      const region = document.getElementById('aria-live-region');

      // Content cleared initially for re-announcement
      expect(region?.textContent).toBe('');

      // Simulate requestAnimationFrame
      jest.runAllTimers();

      expect(region?.textContent).toBe('Test message');
    });

    it('should reuse existing live region', () => {
      announce('First message');
      const region1 = document.getElementById('aria-live-region');

      announce('Second message');
      const region2 = document.getElementById('aria-live-region');

      expect(region1).toBe(region2);
      expect(document.querySelectorAll('#aria-live-region').length).toBe(1);
    });

    it('should have visually hidden class for GOV.UK compliance', () => {
      announce('Test message');

      const region = document.getElementById('aria-live-region');
      expect(region?.classList.contains('govuk-visually-hidden')).toBe(true);
    });

    it('should switch priority when calling with different priority', () => {
      announce('Polite message', 'polite');
      const region = document.getElementById('aria-live-region');
      expect(region?.getAttribute('aria-live')).toBe('polite');

      announce('Assertive message', 'assertive');
      expect(region?.getAttribute('aria-live')).toBe('assertive');

      announce('Polite again');
      expect(region?.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('clearAnnouncement', () => {
    it('should clear the live region content', () => {
      announce('Test message');
      jest.runAllTimers();

      const region = document.getElementById('aria-live-region');
      expect(region?.textContent).toBe('Test message');

      clearAnnouncement();

      expect(region?.textContent).toBe('');
    });

    it('should not throw if live region does not exist', () => {
      expect(() => clearAnnouncement()).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty message', () => {
      announce('');
      jest.runAllTimers();

      const region = document.getElementById('aria-live-region');
      expect(region?.textContent).toBe('');
    });

    it('should handle special characters in message', () => {
      const message = 'Loading... <script>alert("xss")</script>';
      announce(message);
      jest.runAllTimers();

      const region = document.getElementById('aria-live-region');
      // textContent should escape HTML
      expect(region?.textContent).toBe(message);
    });

    it('should recreate region if removed from DOM', () => {
      announce('First');
      const region1 = document.getElementById('aria-live-region');
      region1?.remove();

      announce('Second');
      const region2 = document.getElementById('aria-live-region');

      expect(region2).not.toBeNull();
      expect(region2).not.toBe(region1);
    });
  });
});
