import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const legacyGlobals = {
  H: THREE.Vector3,
  J: THREE.Color,
  Y: THREE.ShaderChunk,
  k: THREE.SRGBColorSpace,
  u: THREE.HalfFloatType,
  N: THREE.DynamicDrawUsage,
  Ln: THREE.Mesh,
  ut: THREE.Group,
  Tn: THREE.MeshBasicMaterial,
  V: THREE.Vector2,
  Re: THREE.Matrix4,
  _e: THREE.Quaternion,
  Ke: THREE.Euler,
  cr: THREE.CanvasTexture,
  xr: THREE.SphereGeometry,
  Yn: THREE.InstancedMesh,
  mr: THREE.CircleGeometry,
  br: THREE.RingGeometry,
  Nr: THREE.MeshStandardMaterial,
  fr: THREE.BoxGeometry,
  pn: THREE.BufferGeometry,
  Zt: THREE.BufferAttribute,
  er: THREE.PointsMaterial,
  jr: THREE.ShaderMaterial,
  ar: THREE.Points,
  yr: THREE.PlaneGeometry,
  Hi: THREE.Raycaster,
  _n: THREE.Plane,
  vt: THREE.Scene,
  hi: THREE.PerspectiveCamera,
  uc: THREE.WebGLRenderer,
  yc: EffectComposer,
  Fe: THREE.WebGLRenderTarget,
  bc: RenderPass,
  gc: ShaderPass,
  Ac: GTAOPass,
  Mc: UnrealBloomPass,
  Pc: OutputPass,
  en: THREE.Float32BufferAttribute,
  Sr: THREE.TorusGeometry,
  ga: THREE.PMREMGenerator,
  gr: THREE.ConeGeometry,
  Ne: THREE.Vector4,
  hr: THREE.CylinderGeometry,
  pr: THREE.CapsuleGeometry,
  vr: THREE.DodecahedronGeometry,
  Di: THREE.Timer,
  Si: THREE.DirectionalLight,
  ri: THREE.HemisphereLight,
  yi: THREE.PointLight,
  _i: THREE.SpotLight,
};

export function installThreeGlobals(target = globalThis) {
  if (target.__GBH_THREE_RUNTIME_READY__) return target.THREE;

  target.THREE = { ...THREE, BufferGeometryUtils };
  Object.assign(target, legacyGlobals);
  target.__GBH_THREE_RUNTIME_READY__ = true;
  return target.THREE;
}

export { THREE };
