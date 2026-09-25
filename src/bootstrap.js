import './pwa.js';
import './multiplayer/lobby.js';
import { chooseRenderer } from './renderer-selection.js';

const legacyScripts = [
  'engine/three-legacy.js',
  'engine/character-roster.js',
  'engine/render-pipeline.js',
  'engine/map-biomes.js',
  'engine/world.js',
  'engine/character-models.js',
  'engine/sorcerer-models.js',
  'engine/brawlers.js',
  'engine/combat.js',
  'engine/effects.js',
  'engine/interfaces.js',
  'engine/main.js',
];

function loadClassicScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    // Download scripts concurrently while preserving their global dependency order.
    script.async = false;
    script.src = `${import.meta.env.BASE_URL}${path}?v=${__ENGINE_BUILD_ID__}`;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load ${path}`));
    document.body.appendChild(script);
  });
}

function disposeWebGPURenderer(renderer) {
  try {
    renderer?.dispose();
  } catch (error) {
    console.warn('[Gelud BakuHantam] WebGPU renderer cleanup failed.', error);
  }
}

function useWebGLFallback(canvas, { resetCanvas = false, reason, manual = false } = {}) {
  if (reason) console.warn(`[Gelud BakuHantam] ${reason}; using WebGL2 fallback.`);
  if (resetCanvas) canvas.replaceWith(canvas.cloneNode(false));
  window.__GBH_LIGHTS__ = null;
  window.__GBH_RENDERER__ = { kind: 'webgl', renderer: null, fallback: !manual };
}

async function prepareRenderer() {
  const canvas = document.getElementById('game');
  const requested = new URLSearchParams(window.location.search).get('renderer');
  const rendererKind = chooseRenderer({ requested, webgpuAvailable: !!window.navigator.gpu });
  if (rendererKind !== 'webgpu') {
    useWebGLFallback(canvas, {
      manual: requested === 'webgl',
      reason: requested === 'webgl' ? null : 'WebGPU tidak tersedia',
    });
    return true;
  }

  let renderer;
  try {
    const { WebGPURenderer, DirectionalLight, HemisphereLight, PointLight, SpotLight } = await import('three/webgpu');
    renderer = new WebGPURenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    await renderer.init();
    if (renderer.backend?.isWebGPUBackend !== true) {
      disposeWebGPURenderer(renderer);
      useWebGLFallback(canvas, {
        resetCanvas: true,
        reason: 'WebGPU tidak berhasil mengaktifkan backend',
      });
      return true;
    }
    window.__GBH_LIGHTS__ = { DirectionalLight, HemisphereLight, PointLight, SpotLight };
    window.__GBH_RENDERER__ = { kind: 'webgpu', renderer };
    return true;
  } catch (error) {
    console.warn('[Gelud BakuHantam] WebGPU initialization failed; using WebGL2 fallback.', error);
    disposeWebGPURenderer(renderer);
    useWebGLFallback(canvas, { resetCanvas: true });
    return true;
  }
}

try {
  await prepareRenderer();
  await Promise.all(legacyScripts.map(loadClassicScript));
} catch (error) {
  console.error('[Gelud BakuHantam] Failed to start the game.', error);
  const loading = document.getElementById('loading');
  if (loading) loading.textContent = 'Game failed to load. Please refresh.';
}
