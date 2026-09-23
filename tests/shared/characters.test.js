import { describe, expect, it } from 'vitest';
import { getCharacterDef } from '../../shared/data/characters.js';

describe('shared character balance', () => {
  it('keeps the network roster aligned with the solo roster', () => {
    expect(getCharacterDef('dusty').name).toBe('Athallah');
    const ace = getCharacterDef('ace');
    expect(ace.name).toBe('Zeyd');
    expect(ace.attack.damage).toBe(200);
    expect(ace.attack.range).toBe(8.2);
    expect(ace.super.damage).toBe(220);
    expect(getCharacterDef('fuse').maxAmmo).toBe(5);
    expect(getCharacterDef('volt').attack.damage).toBe(380);
    expect(getCharacterDef('naka').attack.damage).toBe(280);
    expect(getCharacterDef('titan').speed).toBe(3.25);
  });
});
