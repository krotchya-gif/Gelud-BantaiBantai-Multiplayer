import './pwa.js';
import './multiplayer/lobby.js';

const legacyScripts = [
  'engine/three-legacy.js',
  'engine/character-roster.js',
  'engine/render-pipeline.js',
  'engine/map-biomes.js',
  'engine/world.js',
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

async function prepareRenderer() {
  const canvas = document.getElementById('game');
  const requested = new URLSearchParams(location.search).get('renderer');

  if (requested === 'webgl' || !navigator.gpu) {
    window.__GBH_RENDERER__ = { kind: 'webgl', renderer: null };
    return;
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
      renderer.dispose();
      const replacement = canvas.cloneNode(false);
      canvas.replaceWith(replacement);
      window.__GBH_RENDERER__ = { kind: 'webgl', renderer: null };
      return;
    }
    window.__GBH_LIGHTS__ = { DirectionalLight, HemisphereLight, PointLight, SpotLight };
    window.__GBH_RENDERER__ = { kind: 'webgpu', renderer };
  } catch (error) {
    console.warn('[Gelud BakuHantam] WebGPU unavailable; using WebGL2.', error);
    renderer?.dispose();
    const replacement = canvas.cloneNode(false);
    canvas.replaceWith(replacement);
    window.__GBH_RENDERER__ = { kind: 'webgl', renderer: null };
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
