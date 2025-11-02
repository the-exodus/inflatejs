import { describe, it, expect } from 'vitest';
import { knownTypes } from '../known-types';

describe('knownTypes', () => {
  describe('structure', () => {
    it('should be a Map', () => {
      expect(knownTypes).toBeInstanceOf(Map);
    });

    it('should not be empty', () => {
      expect(knownTypes.size).toBeGreaterThan(0);
    });
  });

  describe('basic JavaScript types', () => {
    it('should have String type mapped to string', () => {
      expect(knownTypes.get('String')).toBe('string');
    });

    it('should have Number type mapped to number', () => {
      expect(knownTypes.get('Number')).toBe('number');
    });

    it('should have Boolean type mapped to boolean', () => {
      expect(knownTypes.get('Boolean')).toBe('boolean');
    });

    it('should have Array type mapped to any[]', () => {
      expect(knownTypes.get('Array')).toBe('any[]');
    });

    it('should have Object type mapped to object', () => {
      expect(knownTypes.get('Object')).toBe('object');
    });

    it('should have Function type mapped to Function', () => {
      expect(knownTypes.get('Function')).toBe('Function');
    });
  });

  describe('complex JavaScript types', () => {
    it('should have RegExp type', () => {
      expect(knownTypes.get('RegExp')).toBe('RegExp');
    });

    it('should have Date type', () => {
      expect(knownTypes.get('Date')).toBe('Date');
    });

    it('should have Promise type with generic', () => {
      expect(knownTypes.get('Promise')).toBe('Promise<any>');
    });

    it('should have Map type with generics', () => {
      expect(knownTypes.get('Map')).toBe('Map<any, any>');
    });

    it('should have Set type with generic', () => {
      expect(knownTypes.get('Set')).toBe('Set<any>');
    });
  });

  describe('Array methods', () => {
    it('should have Array.prototype.map returning any[]', () => {
      expect(knownTypes.get('Array.prototype.map')).toBe('any[]');
    });

    it('should have Array.prototype.filter returning any[]', () => {
      expect(knownTypes.get('Array.prototype.filter')).toBe('any[]');
    });

    it('should have Array.prototype.reduce returning any', () => {
      expect(knownTypes.get('Array.prototype.reduce')).toBe('any');
    });

    it('should have Array.prototype.forEach returning void', () => {
      expect(knownTypes.get('Array.prototype.forEach')).toBe('void');
    });

    it('should have Array.prototype.find returning any', () => {
      expect(knownTypes.get('Array.prototype.find')).toBe('any');
    });

    it('should have Array.prototype.some returning boolean', () => {
      expect(knownTypes.get('Array.prototype.some')).toBe('boolean');
    });

    it('should have Array.prototype.every returning boolean', () => {
      expect(knownTypes.get('Array.prototype.every')).toBe('boolean');
    });

    it('should have Array.prototype.join returning string', () => {
      expect(knownTypes.get('Array.prototype.join')).toBe('string');
    });
  });

  describe('String methods', () => {
    it('should have String.prototype.split returning string[]', () => {
      expect(knownTypes.get('String.prototype.split')).toBe('string[]');
    });

    it('should have String.prototype.replace returning string', () => {
      expect(knownTypes.get('String.prototype.replace')).toBe('string');
    });

    it('should have String.prototype.match with correct return type', () => {
      expect(knownTypes.get('String.prototype.match')).toBe('RegExpMatchArray | null');
    });
  });

  describe('Object methods', () => {
    it('should have Object.keys returning string[]', () => {
      expect(knownTypes.get('Object.keys')).toBe('string[]');
    });

    it('should have Object.values returning any[]', () => {
      expect(knownTypes.get('Object.values')).toBe('any[]');
    });

    it('should have Object.entries returning tuple array', () => {
      expect(knownTypes.get('Object.entries')).toBe('[string, any][]');
    });
  });

  describe('type lookups', () => {
    it('should return undefined for non-existent type', () => {
      expect(knownTypes.get('NonExistentType')).toBeUndefined();
    });

    it('should handle case-sensitive lookups', () => {
      expect(knownTypes.get('string')).toBeUndefined();
      expect(knownTypes.get('String')).toBe('string');
    });
  });
});
