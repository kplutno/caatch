import { describe, it, expect } from 'vitest';
import { RELATION_NAMES, getTypeColor } from '../src/app/components/constants';

describe('RELATION_NAMES', () => {
  it('maps every expected relation key to a human-readable label', () => {
    expect(RELATION_NAMES.KNOWS).toBe('Knows');
    expect(RELATION_NAMES.MEMBER_OF).toBe('Member Of');
    expect(RELATION_NAMES.LOCATED_IN).toBe('Located In');
    expect(RELATION_NAMES.LIVES_IN).toBe('Lives In');
    expect(RELATION_NAMES.ATTENDED).toBe('Attended');
    expect(RELATION_NAMES.PARTICIPATED_IN).toBe('Participated In');
    expect(RELATION_NAMES.WORKS_WITH).toBe('Works With');
    expect(RELATION_NAMES.OTHER).toBe('Other');
  });

  it('contains exactly 8 relation types', () => {
    expect(Object.keys(RELATION_NAMES)).toHaveLength(8);
  });
});

describe('getTypeColor', () => {
  it('returns teal colours for person', () => {
    const result = getTypeColor('person');
    expect(result.fill).toBe('#99f6e4');
    expect(result.bg).toContain('teal');
  });

  it('returns rose colours for event', () => {
    const result = getTypeColor('event');
    expect(result.fill).toBe('#fecdd3');
    expect(result.bg).toContain('rose');
  });

  it('returns sky colours for place', () => {
    const result = getTypeColor('place');
    expect(result.fill).toBe('#bae6fd');
    expect(result.bg).toContain('sky');
  });

  it('returns amber colours for organization', () => {
    const result = getTypeColor('organization');
    expect(result.fill).toBe('#fde68a');
    expect(result.bg).toContain('amber');
  });

  it('returns purple colours for unknown types', () => {
    const result = getTypeColor('unknown');
    expect(result.fill).toBe('#e9d5ff');
    expect(result.bg).toContain('purple');
  });

  it('always returns an object with bg, fill, and glow keys', () => {
    for (const type of ['person', 'event', 'place', 'organization']) {
      const result = getTypeColor(type);
      expect(result).toHaveProperty('bg');
      expect(result).toHaveProperty('fill');
      expect(result).toHaveProperty('glow');
    }
  });
});
