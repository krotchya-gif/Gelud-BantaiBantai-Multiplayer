import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import * as THREE_SOURCE from 'three/src/Three.js';
import WebGPURenderer from 'three/src/renderers/webgpu/WebGPURenderer.js';
import { installThreeGlobals } from '../src/three-global-runtime.js';

describe('shared Three.js runtime', () => {
  it('uses one Three.js core for WebGPU and the classic engine globals', () => {
    const globals = {};
    installThreeGlobals(globals);

    expect(THREE).toBe(THREE_SOURCE);
    expect(typeof WebGPURenderer).toBe('function');
    expect(globals.THREE.Vector3).toBe(THREE.Vector3);
    expect(globals.H).toBe(THREE.Vector3);
    expect(globals.J).toBe(THREE.Color);
    expect(globals.cr).toBe(THREE.CanvasTexture);
    const canvasTexture = new globals.cr({ width: 8, height: 8 });
    expect(canvasTexture.isCanvasTexture).toBe(true);
    expect(canvasTexture.version).toBe(1);
    expect(globals.en).toBe(THREE.Float32BufferAttribute);
    expect(globals.uc).toBe(THREE.WebGLRenderer);
    expect(globals.Si).toBe(THREE.DirectionalLight);
    expect(globals.k).toBe(THREE.SRGBColorSpace);
    expect(globals.u).toBe(THREE.HalfFloatType);
    expect(globals.N).toBe(THREE.DynamicDrawUsage);
    expect(globals.THREE.BufferGeometryUtils.mergeGeometries).toBeDefined();

    const mesh = new globals.Ln(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    const instanced = new globals.Yn(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 2);
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(instanced).toBeInstanceOf(THREE.InstancedMesh);
  });
});
