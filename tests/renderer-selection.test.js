import { describe, expect, it } from 'vitest';
import { chooseRenderer } from '../src/renderer-selection.js';

describe('chooseRenderer', () => {
  it('uses WebGPU by default on mobile when available', () => {
    expect(chooseRenderer({ isMobile: true, webgpuAvailable: true })).toBe('webgpu');
  });

  it('keeps the stable WebGL default on desktop', () => {
    expect(chooseRenderer({ isMobile: false, webgpuAvailable: true })).toBe('webgl');
  });

  it('respects explicit renderer overrides', () => {
    expect(chooseRenderer({ requested: 'webgpu', isMobile: false, webgpuAvailable: true })).toBe('webgpu');
    expect(chooseRenderer({ requested: 'webgl', isMobile: true, webgpuAvailable: true })).toBe('webgl');
  });

  it('falls back to WebGL when WebGPU is unavailable', () => {
    expect(chooseRenderer({ requested: 'webgpu', isMobile: true, webgpuAvailable: false })).toBe('webgl');
    expect(chooseRenderer({ isMobile: true, webgpuAvailable: false })).toBe('webgl');
  });
});
