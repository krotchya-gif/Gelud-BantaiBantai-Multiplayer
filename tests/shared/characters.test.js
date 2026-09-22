import { describe, expect, it } from 'vitest';
import { getCharacterDef } from '../../shared/data/characters.js';

describe('shared character balance', () => {
  it('keeps Ace attack and Super values aligned with the redesigned roster', () => {
    const ace = getCharacterDef('ace');
    expect(ace.attack.damage).toBe(220);
    expect(ace.attack.range).toBe(8.2);
    expect(ace.super.damage).toBe(220);
  });
});
