import { describe, expect, it } from 'vitest';
import { chooseRenderer } from '../src/renderer-selection.js';

describe('chooseRenderer', () => {
  it('uses WebGPU on mobile and desktop when available', () => {
    expect(chooseRenderer({ isMobile: true, webgpuAvailable: true })).toBe('webgpu');
    expect(chooseRenderer({ isMobile: false, webgpuAvailable: true })).toBe('webgpu');
  });

  it('uses WebGL only when explicitly requested for debugging', () => {
    expect(chooseRenderer({ requested: 'webgl', isMobile: true, webgpuAvailable: true })).toBe('webgl');
  });

  it('keeps WebGL as a fallback when WebGPU is unavailable', () => {
    expect(chooseRenderer({ requested: 'webgpu', isMobile: true, webgpuAvailable: false })).toBe('webgl');
    expect(chooseRenderer({ isMobile: false, webgpuAvailable: false })).toBe('webgl');
  });
});
