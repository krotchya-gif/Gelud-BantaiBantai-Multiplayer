function Qc(e) {
  let t = e | 0;
  return function () {
    t = (t + 1831565813) | 0;
    let e = Math.imul(t ^ (t >>> 15), 1 | t);
    return ((e = (e + Math.imul(e ^ (e >>> 7), 61 | e)) ^ e), ((e ^ (e >>> 14)) >>> 0) / 4294967296);
  };
}
function disposeRendererResources(resources) {
  let dispose = () => {
    for (let resource of new Set(resources)) resource?.dispose?.();
  };
  let queue = window.__GBH_RENDERER__?.kind === `webgpu` ? window.__GBH_RENDERER__.renderer?.backend?.device?.queue : null;
  if (typeof queue?.onSubmittedWorkDone === `function`) queue.onSubmittedWorkDone().then(dispose, dispose);
  else dispose();
}
var ARENA_VARIANTS = {
  open: {
    label: `Open Arena`,
    description: `Wide sightlines and fewer obstacles.`,
    icon: `☀️`,
  },
  stepped: {
    label: `Stepped Ruins`,
    description: `Layered cover creates tighter lanes.`,
    icon: `🧱`,
  },
  ...(window.GBH_MAP_PACK?.arenaVariants || {}),
};
var BIOME_SURFACE = Object.freeze({ NONE: 0, WATER: 1, LAVA: 2, TOXIC: 3, ICE: 4, MUD: 5, LOW_GRAVITY: 6, BRIDGE: 7 });
var $c = (e, t, n) => Math.max(t, Math.min(n, e)),
  el = (e, t, n) => e + (t - e) * n,
  tl = (e, t, n) => {
    let r = $c((n - e) / (t - e), 0, 1);
    return r * r * (3 - 2 * r);
  },
  nl = (e, t, n, r) => el(e, t, 1 - Math.exp(-n * r)),
  Q = (e = 0, t = 1) => e + Math.random() * (t - e);
function rl(e, t) {
  let n = (t - e) % (Math.PI * 2);
  return (n > Math.PI && (n -= Math.PI * 2), n < -Math.PI && (n += Math.PI * 2), n);
}
var il = (e, t, n, r) => e + rl(e, t) * (1 - Math.exp(-n * r));
function al(e, t) {
  let n = document.createElement(`canvas`);
  return ((n.width = e), (n.height = t), n);
}
var ol = (e, t, n, r) => (e - n) * (e - n) + (t - r) * (t - r),
  sl = (e, t, n, r) => Math.sqrt(ol(e, t, n, r)),
  cl = {
    sun: 16777215,
    sunI: 0,
    sky: 4152528,
    ground: 1514820,
    hemiI: 0.6,
    fill: 6258656,
    fillI: 0.2,
    envI: 0.09,
    exp: 1.2,
    sat: 1.08,
    vig: 0.46,
  },
  ll = {
    sun: 16773336,
    sunI: 4.6,
    sky: 12573951,
    ground: 11570784,
    hemiI: 0.8,
    fill: 14543103,
    fillI: 0.42,
    envI: 0.26,
    exp: 0.98,
    sat: 1.12,
    vig: 0.28,
  },
  ul = [
    { h: 0, ...cl },
    { h: 4.9, ...cl },
    {
      h: 6.1,
      sun: 16742970,
      sunI: 2.6,
      sky: 10129366,
      ground: 6965834,
      hemiI: 0.62,
      fill: 11575520,
      fillI: 0.26,
      envI: 0.18,
      exp: 1.12,
      sat: 1.12,
      vig: 0.36,
    },
    {
      h: 7.6,
      sun: 16758903,
      sunI: 4,
      sky: 11849471,
      ground: 9730140,
      hemiI: 0.72,
      fill: 13623551,
      fillI: 0.36,
      envI: 0.22,
      exp: 1,
      sat: 1.12,
      vig: 0.3,
    },
    { h: 10.5, ...ll },
    { h: 15, ...ll },
    {
      h: 17.2,
      sun: 16754002,
      sunI: 4.7,
      sky: 11122943,
      ground: 10252368,
      hemiI: 0.7,
      fill: 13160703,
      fillI: 0.36,
      envI: 0.22,
      exp: 1,
      sat: 1.16,
      vig: 0.32,
    },
    {
      h: 18.4,
      sun: 16739884,
      sunI: 4.4,
      sky: 9275098,
      ground: 7358536,
      hemiI: 0.66,
      fill: 11051240,
      fillI: 0.3,
      envI: 0.19,
      exp: 1.06,
      sat: 1.18,
      vig: 0.36,
    },
    {
      h: 19.2,
      sun: 16734762,
      sunI: 2.6,
      sky: 6714056,
      ground: 3551322,
      hemiI: 0.72,
      fill: 8423648,
      fillI: 0.28,
      envI: 0.17,
      exp: 1.2,
      sat: 1.1,
      vig: 0.4,
    },
    { h: 20.3, ...cl },
    { h: 24, ...cl },
  ].map((e) => ({ ...e, sun: new J(e.sun), sky: new J(e.sky), ground: new J(e.ground), fill: new J(e.fill) })),
  dl = new J(8825087),
  fl = 1.35,
  pl = new J(0.74, 0.88, 1.26),
  ml = new J(16758112),
  hl = 46,
  gl = 2,
  _l = 60,
  vl = new H(),
  yl = new Re(),
  bl = new H(),
  xl = new H(),
  Sl = new H(),
  Cl = new H(0, 1, 0),
  wl = new Hi(),
  Tl = new V(),
  El = new _n(new H(0, 1, 0), 0),
  Dl = new H(),
  Ol = new H(),
  shadowFitNdc = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
    [0, -1],
    [0, 1],
  ],
  kl = class {
    constructor(e, t) {
      ((this.scene = e),
        (this.pipeline = t),
        (this.time = 15.4),
        (this.night = 0),
        (this.ambientLevel = 1),
        (this.biomeSky = null),
        (this.biomeFog = null),
        (this.biomeSkyColor = new J()),
        (this.biomeGroundColor = new J()),
        (this.state = {
          sun: new J(),
          sky: new J(),
          ground: new J(),
          fill: new J(),
          sunI: 0,
          hemiI: 1,
          fillI: 0,
          envI: 0.5,
          exp: 1,
          sat: 1,
          vig: 0.3,
        }),
        (this.keyDir = new H(0, 1, 0)),
        (this.shadowRadius = 20),
        (this.lastShadowFit = -Infinity),
        (this.shadowFitDirty = !0),
        (this.tier = 1),
        (this.mapSize = this.pipeline.isWebGPU ? 2048 : 4096),
        (this.shadowFitPoints = Array.from({ length: 6 }, () => new H())));
      let DirectionalLight = this.pipeline.isWebGPU ? window.__GBH_LIGHTS__.DirectionalLight : Si,
        HemisphereLight = this.pipeline.isWebGPU ? window.__GBH_LIGHTS__.HemisphereLight : ri,
        n = new DirectionalLight(16777215, 3);
      ((n.name = `key`),
        (n.castShadow = !this.pipeline.isWebGPU),
        n.shadow.mapSize.set(this.mapSize, this.mapSize),
        (n.shadow.camera.near = 1),
        (n.shadow.camera.far = 121),
        (n.shadow.bias = -35e-5),
        (n.shadow.normalBias = 0.028),
        e.add(n, n.target),
        (this.key = n));
      let r = new DirectionalLight(14543103, 0.4);
      (r.position.set(2.5, 9, 10), e.add(r), (this.fill = r));
      let i = new HemisphereLight(13624575, 11046504, 1.2);
      (e.add(i),
        (this.hemi = i),
        this.buildEnvironment(),
        (this.pool = []),
        (this.requests = []),
        (this.requestCount = 0));
      for (let e = 0; e < 96; e++)
        this.requests.push({ x: 0, y: 0, z: 0, r: 1, g: 1, b: 1, intensity: 0, distance: 4, score: 0 });
      ((this.focus = new H()),
        (this.lamps = []),
        (this.lampSlots = []),
        (this.lampShadowSlots = this.pipeline.isWebGPU ? 0 : 4),
        (this.lampGlass = null),
        (this.cones = []),
        (this.coneMaterial = this.pipeline.isWebGPU
          ? new Tn({ color: ml.clone(), transparent: !0, opacity: 0, blending: 2, depthWrite: !1, side: 2 })
          : new jr({
          uniforms: { uColor: { value: ml.clone() }, uStrength: { value: 0 } },
          vertexShader: `
        varying vec3 vN; varying vec3 vView; varying float vH;
        void main() {
          vH = uv.y;
          vec4 mv = modelViewMatrix * vec4( position, 1.0 );
          vN = normalize( normalMatrix * normal );
          vView = normalize( - mv.xyz );
          gl_Position = projectionMatrix * mv;
        }`,
          fragmentShader: `
        uniform vec3 uColor; uniform float uStrength;
        varying vec3 vN; varying vec3 vView; varying float vH;
        void main() {
          float facing = abs( dot( normalize( vN ), normalize( vView ) ) );
          float edge = smoothstep( 0.0, 0.9, facing );
          // clamp first: pow() of a slightly negative interpolant is NaN, and one NaN
          // pixel is smeared across the whole frame by the bloom blur
          float h = clamp( vH, 0.0, 1.0 );
          float fall = pow( h, 2.4 ) * 0.9 + 0.035 * h;
          gl_FragColor = vec4( uColor * uStrength * edge * fall, 1.0 );
        }`,
          transparent: !0,
          blending: 2,
          depthWrite: !1,
          side: 2,
        })),
        this.buildLampSlots(8),
        this.setTime(this.time));
    }
    buildEnvironment() {
      if (this.pipeline.isWebGPU) {
        ((this.scene.environment = null), (this.scene.background = new J(724506)));
        return;
      }
      let e = new vt(),
        t = new Ln(
          new xr(10, 32, 16),
          new jr({
            side: 1,
            vertexShader: `varying vec3 vDir; void main() { vDir = normalize( position ); gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
            fragmentShader: `
          varying vec3 vDir;
          void main() {
            float y = normalize( vDir ).y;
            vec3 zenith = vec3( 0.34, 0.55, 1.0 ) * 1.15;
            vec3 horizon = vec3( 1.0, 0.93, 0.82 ) * 1.25;
            vec3 floorC = vec3( 0.62, 0.47, 0.30 ) * 0.55;
            vec3 c = y > 0.0 ? mix( horizon, zenith, pow( y, 0.55 ) ) : mix( horizon * 0.7, floorC, pow( - y, 0.4 ) );
            gl_FragColor = vec4( c, 1.0 );
          }`,
          }),
        );
      e.add(t);
      let n = new ga(this.pipeline.renderer);
      ((this.envTarget = n.fromScene(e, 0.03)),
        (this.scene.environment = this.envTarget.texture),
        n.dispose(),
        t.geometry.dispose(),
        t.material.dispose(),
        (this.scene.background = new J(724506)));
    }
    invalidateShadowMap(e) {
      let t = e.shadow;
      if (!t.map) return;
      if (this.pipeline.isWebGPU) {
        t.needsUpdate = !0;
        return;
      }
      (t.map.dispose(), (t.map = null));
    }
    applyQuality(e) {
      // Keep WebGPU light and shadow topology fixed. Changing active light counts
      // or shadow casters rebuilds pipelines on demand and can stall a live match.
      let shadowMapSize = this.pipeline.isWebGPU ? 2048 : e.shadowMap;
      let lampMapSize = this.pipeline.isWebGPU ? 1024 : e.lampMap;
      ((this.tier = e.tier),
        (this.shadowFitDirty = !0),
        (this.pcss = this.pipeline.usingPCSS),
        this.mapSize !== shadowMapSize &&
          ((this.mapSize = shadowMapSize),
          this.key.shadow.mapSize.set(shadowMapSize, shadowMapSize),
          this.invalidateShadowMap(this.key)),
        this.pipeline.isWebGPU && (this.key.castShadow = !1),
        this.setPoolSize(this.pipeline.isWebGPU ? 4 : e.poolLights),
        this.lampSlots.forEach((t, n) => {
          let r = !this.pipeline.isWebGPU && e.lampShadows && n < this.lampShadowSlots;
          (t.castShadow !== r && (t.castShadow = r),
            t.shadow.mapSize.x !== lampMapSize &&
              (t.shadow.mapSize.set(lampMapSize, lampMapSize),
              this.invalidateShadowMap(t)));
        }),
        this.updateShadowParams());
    }
    updateShadowParams() {
      let e = Rc.size / (4 * Math.tan(Rc.angle));
      if (this.pcss) {
        this.key.shadow.radius = this.tier + $c(10 / (this.shadowRadius * 2), 0.001, 0.999);
        let t = Math.max(0, this.tier - 1);
        this.lampSlots.forEach((n) => (n.shadow.radius = -(t + e)));
      } else ((this.key.shadow.radius = 2.5), this.lampSlots.forEach((e) => (e.shadow.radius = 2)));
    }
    setPoolSize(e) {
      let PointLight = this.pipeline.isWebGPU ? window.__GBH_LIGHTS__.PointLight : yi;
      for (; this.pool.length < e;) {
        let e = new PointLight(16777215, 0, 5, 2);
        (e.position.set(0, -50, 0), this.scene.add(e), this.pool.push(e));
      }
      for (; this.pool.length > e;) {
        let e = this.pool.pop();
        (this.scene.remove(e), e.dispose());
      }
    }
    buildLampSlots(e) {
      let SpotLight = this.pipeline.isWebGPU ? window.__GBH_LIGHTS__.SpotLight : _i;
      for (let t = 0; t < e; t++) {
        let e = new SpotLight(ml, 0, Rc.far, Rc.angle, 0.55, gl);
        (e.position.set(0, Rc.height, 0),
          (e.castShadow = !this.pipeline.isWebGPU && t < this.lampShadowSlots),
          e.shadow.mapSize.set(1024, 1024),
          (e.shadow.camera.near = Rc.near),
          (e.shadow.camera.far = Rc.far),
          (e.shadow.bias = -9e-4),
          (e.shadow.normalBias = 0.03),
          (e.shadow.autoUpdate = !1),
          this.scene.add(e, e.target),
          this.lampSlots.push(e));
      }
    }
    setLamps(e, t) {
      (this.cones.forEach((e) => this.scene.remove(e)),
        (this.cones.length = 0),
        (this.lamps = e.map((e) => ({ x: e.x, z: e.z, d: 0, phase: Math.random() * 10 }))),
        (this.lampGlass = t));
      let n = Rc.height - 0.12,
        r = new gr(Math.tan(Rc.angle * 0.8) * n, n, 40, 1, !0);
      r.translate(0, n / 2, 0);
      for (let e of this.lamps) {
        let t = new Ln(r, this.coneMaterial);
        (t.position.set(e.x, 0, e.z),
          (t.userData.noAO = !0),
          (t.renderOrder = 5),
          this.scene.add(t),
          this.cones.push(t));
      }
    }
    setTime(e) {
      ((this.time = ((e % 24) + 24) % 24), this.applyTime());
    }
    setBiomePalette(e) {
      ((this.biomeSky = e?.sky ? new J(e.sky) : null), (this.biomeFog = e?.fog ? new J(e.fog) : null), this.applyTime());
    }
    sample(e) {
      let t = 0;
      for (; t < ul.length - 2 && e >= ul[t + 1].h;) t++;
      let n = ul[t],
        r = ul[t + 1],
        i = $c((e - n.h) / (r.h - n.h), 0, 1),
        a = this.state;
      (a.sun.lerpColors(n.sun, r.sun, i),
        a.sky.lerpColors(n.sky, r.sky, i),
        a.ground.lerpColors(n.ground, r.ground, i),
        a.fill.lerpColors(n.fill, r.fill, i));
      for (let e of [`sunI`, `hemiI`, `fillI`, `envI`, `exp`, `sat`, `vig`]) a[e] = el(n[e], r[e], i);
      return a;
    }
    applyTime() {
      let e = this.time,
        t = this.sample(e),
        n = ((e - 6) / 13) * Math.PI,
        r = Math.sin(n),
        i = e > 6 && e < 19 ? tl(0, 0.2, r) : 0,
        a = Math.max(tl(19.15, 20.2, e), 1 - tl(4.7, 5.7, e)),
        sky = this.biomeSky ? this.biomeSkyColor.copy(t.sky).lerp(this.biomeSky, 0.28) : t.sky,
        ground = this.biomeFog ? this.biomeGroundColor.copy(t.ground).lerp(this.biomeFog, 0.2) : t.ground;
      if (i > 5e-4)
        (this.keyDir.set(Math.cos(n), Math.max(r * 0.85, 0.17), -(0.22 + 0.3 * r)).normalize(),
          this.key.color.copy(t.sun),
          (this.key.intensity = t.sunI * i));
      else {
        let t = (e > 12 ? e - 20 : e + 4) * 0.06;
        (this.keyDir.set(0.55 - t, 0.78, -0.5).normalize(), this.key.color.copy(dl), (this.key.intensity = fl * a));
      }
      (this.hemi.color.copy(sky),
        this.hemi.groundColor.copy(ground),
        (this.hemi.intensity = t.hemiI),
        this.fill.color.copy(t.fill),
        (this.fill.intensity = t.fillI),
        (this.scene.environmentIntensity = t.envI),
        this.scene.background.copy(sky).multiplyScalar(0.18),
        (this.pipeline.renderer.toneMappingExposure = t.exp),
        (this.night = Math.max(tl(18.5, 19.55, e), 1 - tl(5.4, 6.3, e))),
        (this.ambientLevel = el(1, 0.36, this.night)));
    }
    addLight(e, t, n, r, i, a = 5) {
      if (this.requestCount >= this.requests.length || i <= 0.01) return;
      let o = this.requests[this.requestCount++];
      ((o.x = e), (o.y = t), (o.z = n), (o.r = r.r), (o.g = r.g), (o.b = r.b), (o.intensity = i), (o.distance = a));
    }
    assignPool() {
      let e = this.requestCount,
        t = this.focus;
      for (let n = 0; n < e; n++) {
        let e = this.requests[n],
          r = e.x - t.x,
          i = e.z - (t.z - 2);
        e.score = e.intensity / (1 + (r * r + i * i) * 0.03);
      }
      let n = Math.min(this.pool.length, e);
      for (let t = 0; t < n; t++) {
        let n = t;
        for (let r = t + 1; r < e; r++) this.requests[r].score > this.requests[n].score && (n = r);
        if (n !== t) {
          let e = this.requests[t];
          ((this.requests[t] = this.requests[n]), (this.requests[n] = e));
        }
      }
      for (let e = 0; e < this.pool.length; e++) {
        let t = this.pool[e];
        if (e < n) {
          let n = this.requests[e];
          (t.position.set(n.x, n.y, n.z),
            t.color.setRGB(n.r, n.g, n.b),
            (t.intensity = n.intensity),
            (t.distance = n.distance));
        } else t.intensity = 0;
      }
      this.requestCount = 0;
    }
    updateLamps(e) {
      let t = this.night,
        n = t > 0.002;
      for (let e of this.lampSlots) e.castShadow && e.shadow.map === null && (e.shadow.needsUpdate = !0);
      (this.lampGlass && (this.lampGlass.emissiveIntensity = 0.15 + t * 4.2),
        this.coneMaterial.uniforms
          ? (this.coneMaterial.uniforms.uStrength.value = t * 0.6)
          : ((this.coneMaterial.opacity = t * 0.12), this.coneMaterial.color.copy(ml).multiplyScalar(0.65 + t * 0.35)));
      for (let e of this.cones) e.visible = n;
      if (!n || this.lamps.length === 0) {
        for (let e of this.lampSlots) ((e.intensity = 0), (e.shadow.autoUpdate = !1));
        return;
      }
      let r = this.focus;
      for (let e of this.lamps) e.d = Math.hypot(e.x - r.x, e.z - (r.z - 2));
      this.lamps.sort((e, t) => e.d - t.d);
      for (let n = 0; n < this.lampSlots.length; n++) {
        let r = this.lampSlots[n],
          i = this.lamps[n];
        if (!i) {
          ((r.intensity = 0), (r.shadow.autoUpdate = !1));
          continue;
        }
        let a = 1 - tl(19, 25, i.d),
          o = 1 + Math.sin(e * 7 + i.phase) * 0.006 + Math.sin(e * 17 + i.phase * 3) * 0.004;
        (r.position.set(i.x, Rc.height - 0.52, i.z),
          r.target.position.set(i.x, 0, i.z),
          r.target.updateMatrixWorld(),
          (r.intensity = hl * t * a * o),
          r.castShadow &&
            ((r.shadow.intensity = 1 - tl(10.5, 14.5, i.d)),
            (r.shadow.autoUpdate = r.intensity > 0.01 && r.shadow.intensity > 0.005)));
      }
    }
    fitShadow(e) {
      let t = this.shadowFitPoints;
      for (let r = 0; r < shadowFitNdc.length; r++) {
        (Tl.set(shadowFitNdc[r][0], shadowFitNdc[r][1]), wl.setFromCamera(Tl, e));
        let n = wl.ray.intersectPlane(El, t[r]);
        (!n || wl.ray.origin.distanceToSquared(n) >= 8100) &&
          t[r].copy(wl.ray.origin).addScaledVector(wl.ray.direction, 90).setY(0);
      }
      Ol.copy(t[4]).add(t[5]).multiplyScalar(0.5);
      let r = 0;
      for (let e = 0; e < 4; e++) r = Math.max(r, Ol.distanceTo(t[e]));
      let i = $c(Math.ceil(r + 3.5), 12, 46);
      ((i > this.shadowRadius || i < this.shadowRadius - 3) && ((this.shadowRadius = i), this.updateShadowParams()),
        (r = this.shadowRadius));
      let a = this.key.shadow.camera;
      (a.right !== r && ((a.left = -r), (a.right = r), (a.top = r), (a.bottom = -r), a.updateProjectionMatrix()),
        yl.lookAt(vl.copy(this.keyDir).multiplyScalar(_l), Sl, Cl),
        bl.setFromMatrixColumn(yl, 0),
        xl.setFromMatrixColumn(yl, 1));
      let o = ((2 * r) / this.mapSize) * 64,
        s = Ol.dot(bl),
        c = Ol.dot(xl);
      (Ol.addScaledVector(bl, Math.round(s / o) * o - s),
        Ol.addScaledVector(xl, Math.round(c / o) * o - c),
        this.key.target.position.copy(Ol),
        this.key.position.copy(Ol).addScaledVector(this.keyDir, _l),
        this.key.target.updateMatrixWorld(),
        this.key.updateMatrixWorld(),
        this.fill.target.position.copy(Ol),
        this.fill.position.set(Ol.x + 2.5, 9, Ol.z + 10),
        this.fill.target.updateMatrixWorld(),
        this.fill.target.parent || this.scene.add(this.fill.target));
    }
    resetShadowFit() {
      ((this.shadowRadius = 0), (this.shadowFitDirty = !0));
    }
    update(e, t, n, r, i = !1) {
      this.focus.copy(r);
      let shadowFitNow = performance.now();
      (this.shadowFitDirty || shadowFitNow - this.lastShadowFit >= 1000 / 30) &&
        ((this.lastShadowFit = shadowFitNow), (this.shadowFitDirty = !1), this.fitShadow(n));
      (this.updateLamps(t), i || this.assignPool());
      let a = this.pipeline.grade;
      a &&
        ((a.uniforms.uSaturation.value = this.state.sat),
        (a.uniforms.uVignette.value = this.state.vig),
        a.uniforms.uTint.value.setRGB(1, 1, 1).lerp(pl, this.night));
    }
  },
  Al = new H();
function jl(e, t, n, r, i, a) {
  let o = (2 * Math.PI * i) / 4,
    s = Math.max(a - 2 * i, 0),
    c = Math.PI / 4;
  (Al.copy(t), (Al[r] = 0), Al.normalize());
  let l = (0.5 * o) / (o + s),
    u = 1 - Al.angleTo(e) / c;
  return Math.sign(Al[n]) === 1 ? u * l : s / (o + s) + l + l * (1 - u);
}
var Ml = class e extends fr {
  constructor(e = 1, t = 1, n = 1, r = 2, i = 0.1) {
    let a = r * 2 + 1;
    if (
      ((i = Math.min(e / 2, t / 2, n / 2, i)),
      super(1, 1, 1, a, a, a),
      (this.type = `RoundedBoxGeometry`),
      (this.parameters = { width: e, height: t, depth: n, segments: r, radius: i }),
      a === 1)
    )
      return;
    let o = this.toNonIndexed();
    ((this.index = null),
      (this.attributes.position = o.attributes.position),
      (this.attributes.normal = o.attributes.normal),
      (this.attributes.uv = o.attributes.uv));
    let s = new H(),
      c = new H(),
      l = new H(e, t, n).divideScalar(2).subScalar(i),
      u = this.attributes.position.array,
      d = this.attributes.normal.array,
      f = this.attributes.uv.array,
      p = u.length / 6,
      m = new H(),
      h = 0.5 / a;
    for (let r = 0, a = 0; r < u.length; r += 3, a += 2)
      switch (
        (s.fromArray(u, r),
        c.copy(s),
        (c.x -= Math.sign(c.x) * h),
        (c.y -= Math.sign(c.y) * h),
        (c.z -= Math.sign(c.z) * h),
        c.normalize(),
        (u[r + 0] = l.x * Math.sign(s.x) + c.x * i),
        (u[r + 1] = l.y * Math.sign(s.y) + c.y * i),
        (u[r + 2] = l.z * Math.sign(s.z) + c.z * i),
        (d[r + 0] = c.x),
        (d[r + 1] = c.y),
        (d[r + 2] = c.z),
        Math.floor(r / p))
      ) {
        case 0:
          (m.set(1, 0, 0), (f[a + 0] = jl(m, c, `z`, `y`, i, n)), (f[a + 1] = 1 - jl(m, c, `y`, `z`, i, t)));
          break;
        case 1:
          (m.set(-1, 0, 0), (f[a + 0] = 1 - jl(m, c, `z`, `y`, i, n)), (f[a + 1] = 1 - jl(m, c, `y`, `z`, i, t)));
          break;
        case 2:
          (m.set(0, 1, 0), (f[a + 0] = 1 - jl(m, c, `x`, `z`, i, e)), (f[a + 1] = jl(m, c, `z`, `x`, i, n)));
          break;
        case 3:
          (m.set(0, -1, 0), (f[a + 0] = 1 - jl(m, c, `x`, `z`, i, e)), (f[a + 1] = 1 - jl(m, c, `z`, `x`, i, n)));
          break;
        case 4:
          (m.set(0, 0, 1), (f[a + 0] = 1 - jl(m, c, `x`, `y`, i, e)), (f[a + 1] = 1 - jl(m, c, `y`, `x`, i, t)));
          break;
        case 5:
          (m.set(0, 0, -1), (f[a + 0] = jl(m, c, `x`, `y`, i, e)), (f[a + 1] = 1 - jl(m, c, `y`, `x`, i, t)));
      }
  }
  static fromJSON(t) {
    return new e(t.width, t.height, t.depth, t.segments, t.radius);
  }
};
function Nl(e, t = !1) {
  let n = e[0].index !== null,
    r = new Set(Object.keys(e[0].attributes)),
    i = new Set(Object.keys(e[0].morphAttributes)),
    a = {},
    o = {},
    s = e[0].morphTargetsRelative,
    c = new pn(),
    l = 0;
  for (let u = 0; u < e.length; ++u) {
    let d = e[u],
      f = 0;
    if (n !== (d.index !== null))
      return (
        console.error(
          `THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ` +
            u +
            `. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.`,
        ),
        null
      );
    for (let e in d.attributes) {
      if (!r.has(e))
        return (
          console.error(
            `THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ` +
              u +
              `. All geometries must have compatible attributes; make sure "` +
              e +
              `" attribute exists among all geometries, or in none of them.`,
          ),
          null
        );
      (a[e] === void 0 && (a[e] = []), a[e].push(d.attributes[e]), f++);
    }
    if (f !== r.size)
      return (
        console.error(
          `THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ` +
            u +
            `. Make sure all geometries have the same number of attributes.`,
        ),
        null
      );
    if (s !== d.morphTargetsRelative)
      return (
        console.error(
          `THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ` +
            u +
            `. .morphTargetsRelative must be consistent throughout all geometries.`,
        ),
        null
      );
    for (let e in d.morphAttributes) {
      if (!i.has(e))
        return (
          console.error(
            `THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ` +
              u +
              `.  .morphAttributes must be consistent throughout all geometries.`,
          ),
          null
        );
      (o[e] === void 0 && (o[e] = []), o[e].push(d.morphAttributes[e]));
    }
    if (t) {
      let e;
      if (n) e = d.index.count;
      else if (d.attributes.position !== void 0) e = d.attributes.position.count;
      else
        return (
          console.error(
            `THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index ` +
              u +
              `. The geometry must have either an index or a position attribute`,
          ),
          null
        );
      (c.addGroup(l, e, u), (l += e));
    }
  }
  if (n) {
    let t = 0,
      n = [];
    for (let r = 0; r < e.length; ++r) {
      let i = e[r].index;
      for (let e = 0; e < i.count; ++e) n.push(i.getX(e) + t);
      t += e[r].attributes.position.count;
    }
    c.setIndex(n);
  }
  for (let e in a) {
    let t = Pl(a[e]);
    if (!t)
      return (
        console.error(
          `THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the ` + e + ` attribute.`,
        ),
        null
      );
    c.setAttribute(e, t);
  }
  for (let e in o) {
    let t = o[e][0].length;
    if (t !== 0) {
      ((c.morphAttributes = c.morphAttributes || {}), (c.morphAttributes[e] = []));
      for (let n = 0; n < t; ++n) {
        let t = [];
        for (let r = 0; r < o[e].length; ++r) t.push(o[e][r][n]);
        let r = Pl(t);
        if (!r)
          return (
            console.error(
              `THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the ` +
                e +
                ` morphAttribute.`,
            ),
            null
          );
        c.morphAttributes[e].push(r);
      }
    }
  }
  return c;
}
function Pl(e) {
  let t,
    n,
    r,
    i = -1,
    a = 0;
  for (let o = 0; o < e.length; ++o) {
    let s = e[o];
    if ((t === void 0 && (t = s.array.constructor), t !== s.array.constructor))
      return (
        console.error(
          `THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.`,
        ),
        null
      );
    if ((n === void 0 && (n = s.itemSize), n !== s.itemSize))
      return (
        console.error(
          `THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.`,
        ),
        null
      );
    if ((r === void 0 && (r = s.normalized), r !== s.normalized))
      return (
        console.error(
          `THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.`,
        ),
        null
      );
    if ((i === -1 && (i = s.gpuType), i !== s.gpuType))
      return (
        console.error(
          `THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes.`,
        ),
        null
      );
    a += s.count * n;
  }
  let o = new t(a),
    s = new Zt(o, n, r),
    c = 0;
  for (let t = 0; t < e.length; ++t) {
    let r = e[t];
    if (r.isInterleavedBufferAttribute) {
      let e = c / n;
      for (let t = 0, i = r.count; t < i; t++)
        for (let i = 0; i < n; i++) {
          let n = r.getComponent(t, i);
          s.setComponent(t + e, i, n);
        }
    } else o.set(r.array, c);
    c += r.count * n;
  }
  return (i !== void 0 && (s.gpuType = i), s);
}
var Fl = (e, t) => t * 44 + e,
  Il = (e, t) => e >= 0 && t >= 0 && e < 44 && t < 44,
  Ll = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
  Rl = 32,
  zl = 16,
  Bl = new Re(),
  Vl = new H(),
  Hl = new _e(),
  Ul = new H(),
  Wl = new Ke(),
  Gl = new J(),
  Kl = new Re().makeScale(0, 0, 0);
function ql(e, t = 0.6, n = 1) {
  e.computeBoundingBox();
  let { min: r, max: i } = e.boundingBox,
    a = e.attributes.position,
    o = new Float32Array(a.count * 3);
  for (let e = 0; e < a.count; e++) {
    let s = $c((a.getY(e) - r.y) / (i.y - r.y || 1), 0, 1),
      c = t + (1 - t) * s ** +n;
    o[e * 3] = o[e * 3 + 1] = o[e * 3 + 2] = c;
  }
  return (e.setAttribute(`color`, new Zt(o, 3)), e);
}
function Jl() {
  let e = al(128, 128),
    t = e.getContext(`2d`);
  ((t.fillStyle = `#b07a3c`), t.fillRect(0, 0, 128, 128));
  for (let e = 0; e < 4; e++)
    ((t.fillStyle = e % 2 ? `#a9743a` : `#b98446`),
      t.fillRect(0, e * 32, 128, 31),
      (t.fillStyle = `rgba(60,35,12,0.55)`),
      t.fillRect(0, e * 32 + 30, 128, 2));
  ((t.strokeStyle = `#7a4d20`),
    (t.lineWidth = 14),
    t.strokeRect(7, 7, 114, 114),
    (t.lineWidth = 12),
    t.beginPath(),
    t.moveTo(10, 10),
    t.lineTo(118, 118),
    t.stroke(),
    (t.fillStyle = `#4a3014`));
  for (let [e, n] of [
    [14, 14],
    [114, 14],
    [14, 114],
    [114, 114],
  ])
    (t.beginPath(), t.arc(e, n, 3.5, 0, 7), t.fill());
  let n = new cr(e);
  return ((n.colorSpace = k), (n.anisotropy = 4), n);
}
function Yl() {
  let e = al(128, 64),
    t = e.getContext(`2d`);
  for (let e = 0; e < 8; e++)
    ((t.fillStyle = e % 2 ? `#9a5f2e` : `#a86a34`),
      t.fillRect(e * 16, 0, 16, 64),
      (t.fillStyle = `rgba(50,28,10,0.5)`),
      t.fillRect(e * 16 + 15, 0, 1.5, 64));
  ((t.fillStyle = `#4c4f58`), t.fillRect(0, 9, 128, 7), t.fillRect(0, 48, 128, 7));
  let n = new cr(e);
  return ((n.colorSpace = k), n);
}
function Xl() {
  let t = al(256, 256),
    n = t.getContext(`2d`),
    r = n.createImageData(256, 256),
    i = [
      [1, 2, 0, 1],
      [3, -1, 1.3, 0.6],
      [-2, 3, 2.1, 0.5],
      [5, 2, 0.7, 0.28],
      [-4, -5, 4, 0.22],
      [7, -3, 2.9, 0.14],
    ],
    a = (e, t) => {
      let n = 0;
      for (let [r, a, o, s] of i) n += Math.sin(((e * r + t * a) / 256) * Math.PI * 2 + o) * s;
      return n;
    };
  for (let e = 0; e < 256; e++)
    for (let t = 0; t < 256; t++) {
      let n = (a(t + 1, e) - a(t - 1, e)) * 3.2,
        i = (a(t, e + 1) - a(t, e - 1)) * 3.2,
        o = 1 / Math.hypot(n, i, 1),
        s = (e * 256 + t) * 4;
      ((r.data[s] = (-n * o * 0.5 + 0.5) * 255),
        (r.data[s + 1] = (-i * o * 0.5 + 0.5) * 255),
        (r.data[s + 2] = (o * 0.5 + 0.5) * 255),
        (r.data[s + 3] = 255));
    }
  n.putImageData(r, 0, 0);
  let o = new cr(t);
  return ((o.wrapS = o.wrapT = THREE.RepeatWrapping), o.repeat.set(44 / 5, 44 / 5), o);
}
var Zl = class {
    constructor(e, t, n = 8, arenaName = `open`, qualityTier = 2) {
      ((this.scene = e),
        (this.anisotropy = n),
        (this.arenaName = ARENA_VARIANTS[arenaName] ? arenaName : `open`),
        (this.qualityTier = Math.max(0, Math.min(3, Math.trunc(Number(qualityTier) || 0)))),
        (this.group = new ut()),
        e.add(this.group),
        (this.tiles = new Uint8Array(1936)),
        (this.styles = new Uint8Array(1936)),
        (this.blockers = new Uint8Array(1936)),
        (this.surfaceTypes = new Uint8Array(1936)),
        (this.hazardTiles = []),
        (this.hazardMeshes = []),
        (this.instanceOf = new Int32Array(1936).fill(-1)),
        (this.bushRange = new Int32Array(3872).fill(-1)),
        (this.spawns = []),
        (this.boxSpots = []),
        (this.lampTiles = []),
        (this.lanterns = []),
        (this.meshes = {}),
        (this.disposables = []),
        (this.bushGeometries = new Map()),
        (this.aoDirty = !1),
        (this.aoTimer = 0),
        (this._g = new Float32Array(1936)),
        (this._from = new Int32Array(1936)),
        (this._stamp = new Uint32Array(1936)),
        (this._closed = new Uint32Array(1936)),
        (this._tick = 0),
        (this.grassUniforms = {
          uTime: { value: 0 },
          uPushers: { value: Array.from({ length: 8 }, () => new Ne(0, 0, 1, 0)) },
          uReveal: { value: new Ne(0, 0, 0, 0) },
        }));
      try {
        this.generate(t);
        this.buildGround();
        this.buildWalls();
        this.buildBushes();
        this.buildWater();
        this.buildBiomeSurfaces();
        this.buildLamps();
        this.buildOutskirts();
      } catch (error) {
        this.dispose();
        throw error;
      }
    }
    toTile(e) {
      return Math.floor(e + 22);
    }
    center(e) {
      return e + 0.5 - 22;
    }
    tileAt(e, t) {
      let n = this.toTile(e),
        r = this.toTile(t);
      return Il(n, r) ? this.tiles[Fl(n, r)] : Z.WALL;
    }
    isBushAt(e, t) {
      return this.tileAt(e, t) === Z.BUSH;
    }
    surfaceAt(e, t) {
      let n = this.toTile(e),
        r = this.toTile(t);
      return Il(n, r) ? this.surfaceTypes[Fl(n, r)] : BIOME_SURFACE.NONE;
    }
    hazardDamageAt(e, t) {
      let n = this.surfaceAt(e, t),
        r = this.biomeGameplay;
      return n === BIOME_SURFACE.LAVA ? r?.hazardDamagePerSecond || 0 : n === BIOME_SURFACE.TOXIC ? r?.toxicDamagePerSecond || 0 : 0;
    }
    gravityAt(e, t) {
      return this.surfaceAt(e, t) === BIOME_SURFACE.LOW_GRAVITY ? this.biomeGameplay?.lowGravityMultiplier || 1 : 1;
    }
    isSolidTile(e, t) {
      if (!Il(e, t)) return !0;
      let n = Fl(e, t),
        r = this.tiles[n];
      return r === Z.WALL || r === Z.WATER || this.blockers[n] === 1;
    }
    blocksShots(e, t) {
      if (!Il(e, t)) return !0;
      let n = Fl(e, t);
      return this.tiles[n] === Z.WALL || this.blockers[n] === 1;
    }
    isWalkable(e, t) {
      return !this.isSolidTile(e, t);
    }
    isBreakable(e, t) {
      if (!Il(e, t)) return !1;
      let n = Fl(e, t);
      return (
        this.tiles[n] === Z.BUSH ||
        (this.tiles[n] === Z.WALL && this.styles[n] !== Fc.ROCK && this.styles[n] !== Fc.LAMP)
      );
    }
    generate(e) {
      let mapPack = window.GBH_MAP_PACK;
      if (mapPack?.MAPS?.[this.arenaName]) {
        if (typeof mapPack.generate !== `function` || typeof mapPack.applyLegacyWorld !== `function`)
          throw new Error(`[world] map pack is incomplete for ${this.arenaName}`);
        let blueprint = mapPack.generate(this.arenaName, e);
        if (blueprint?.id !== this.arenaName || blueprint.cells?.length !== this.tiles.length)
          throw new Error(`[world] map pack returned an invalid blueprint for ${this.arenaName}`);
        mapPack.applyLegacyWorld(this, blueprint, Z, Fc);
        this.seed = e;
        this.surfaceTypes.fill(BIOME_SURFACE.NONE);
        this.hazardTiles = [];
        this.biomeName = blueprint.biome;
        this.biomePalette = blueprint.palette;
        this.biomeGameplay = blueprint.gameplay;
        this.mapLandmarks = blueprint.landmarks;
        for (let i = 0; i < blueprint.cells.length; i++) {
          let cell = blueprint.cells[i],
            surface = BIOME_SURFACE.NONE;
          if (cell.kind === mapPack.CELL.WATER) surface = BIOME_SURFACE.WATER;
          else if (cell.kind === mapPack.CELL.HAZARD) {
            surface = cell.meta?.hazardType === `toxic` ? BIOME_SURFACE.TOXIC : cell.meta?.hazardType === `low-gravity` ? BIOME_SURFACE.LOW_GRAVITY : BIOME_SURFACE.LAVA;
            this.tiles[i] = Z.EMPTY;
          } else if (cell.kind === mapPack.CELL.ICE) {
            surface = BIOME_SURFACE.ICE;
            this.tiles[i] = Z.EMPTY;
          } else if (cell.kind === mapPack.CELL.MUD) {
            surface = BIOME_SURFACE.MUD;
            this.tiles[i] = Z.EMPTY;
          } else if (cell.kind === mapPack.CELL.BRIDGE) {
            surface = BIOME_SURFACE.BRIDGE;
            this.tiles[i] = Z.EMPTY;
          }
          this.surfaceTypes[i] = surface;
          if (surface === BIOME_SURFACE.LAVA || surface === BIOME_SURFACE.TOXIC || surface === BIOME_SURFACE.ICE || surface === BIOME_SURFACE.MUD || surface === BIOME_SURFACE.LOW_GRAVITY)
            this.hazardTiles.push({ x: i % 44, y: (i / 44) | 0, type: surface });
        }
        this.mapHazards = blueprint.hazards;
        return;
      }
      if (this.arenaName !== `open` && this.arenaName !== `stepped`)
        throw new Error(`[world] selected map ${this.arenaName} is missing from the loaded map pack`);
      this.mapBlueprint = null;
      this.biomeName = null;
      this.biomePalette = null;
      this.biomeGameplay = null;
      this.mapLandmarks = [];
      this.hazardTiles = [];
      this.surfaceTypes.fill(BIOME_SURFACE.NONE);
      for (let t = 0; t < 60; t++) {
        let n = (e + t * 7919) | 0;
        if (this.tryGenerate(Qc(n))) {
          this.seed = n;
          return;
        }
      }
      console.warn(`[world] map validation kept failing; using last attempt`);
    }
    tryGenerate(e) {
      let { tiles: t, styles: n } = this;
      (t.fill(Z.EMPTY), n.fill(0));
      let r = new Uint8Array(1936),
        i = (t, n) => t + Math.floor(e() * (n - t + 1)),
        a = (e, t) => [
          [e, t],
          [43 - e, t],
          [e, 43 - t],
          [43 - e, 43 - t],
        ];
      for (let e = 0; e < 44; e++)
        for (let r = 0; r < 44; r++)
          (r < 2 || e < 2 || r >= 42 || e >= 42) && ((t[Fl(r, e)] = Z.WALL), (n[Fl(r, e)] = Fc.ROCK));
      this.spawns = [
        [6, 6],
        [37, 6],
        [6, 37],
        [37, 37],
        [21, 5],
        [38, 21],
        [22, 38],
        [5, 22],
      ];
      for (let [e, t] of this.spawns)
        for (let [n, i] of a(e, t))
          for (let e = -2; e <= 2; e++) for (let t = -2; t <= 2; t++) Il(n + t, i + e) && (r[Fl(n + t, i + e)] = 1);
      let o = (e, t) => Math.max(Math.abs(e + 0.5 - 22), Math.abs(t + 0.5 - 22)),
        s = (e, i, s, c = 0) => {
          if (e < 2 || i < 2 || e > 21 || i > 21 || (s !== Z.BUSH && o(e, i) < 3.6)) return !1;
          let l = !1;
          for (let [o, u] of a(e, i)) {
            let e = Fl(o, u);
            r[e] || t[e] !== Z.EMPTY || ((t[e] = s), (n[e] = c), (l = !0));
          }
          return l;
        },
        c = this.arenaName === `open` ? i(5, 8) : i(13, 16);
      for (let t = 0; t < c; t++) {
        let t = i(3, 21),
          n = i(3, 21),
          r = e() < 0.5,
          a = i(2, 5),
          o = e(),
          c = o < 0.6 ? Fc.STONE : o < 0.86 ? Fc.CRATE : Fc.BARREL;
        for (let e = 0; e < a; e++) s(t + (r ? e : 0), n + (r ? 0 : e), Z.WALL, c);
        if (e() < 0.42) {
          let o = t + (r ? a - 1 : 0),
            l = n + (r ? 0 : a - 1),
            u = e() < 0.5 ? -1 : 1,
            d = i(2, 3);
          for (let e = 1; e <= d; e++) s(o + (r ? 0 : e * u), l + (r ? e * u : 0), Z.WALL, c);
        }
      }
      let l = (t, n, r, i) => {
        let a = [[r, i]];
        s(r, i, t);
        for (let r = 0; r < n * 3 && a.length < n; r++) {
          let [n, r] = a[Math.floor(e() * a.length)],
            i = Ll[Math.floor(e() * 4)],
            o = n + i[0],
            c = r + i[1];
          a.some((e) => e[0] === o && e[1] === c) || (s(o, c, t) && a.push([o, c]));
        }
      };
      let bushCount = this.arenaName === `open` ? i(2, 3) : i(6, 7);
      for (let e = 0; e < bushCount; e++)
        l(Z.BUSH, this.arenaName === `open` ? i(3, 6) : i(5, 12), i(3, 21), i(3, 21));
      if (this.arenaName !== `open`) l(Z.BUSH, 7, 20, 20);
      for (let e = 0, t = this.arenaName === `open` ? i(0, 1) : i(1, 2); e < t; e++)
        l(Z.WATER, i(4, 8), i(8, 18), i(8, 18));
      let cactusCount = this.arenaName === `open` ? 1 : 4;
      for (let e = 0; e < cactusCount; e++) s(i(3, 21), i(3, 21), Z.WALL, Fc.CACTUS);
      if (this.arenaName === `stepped`) {
        let stairStyles = [Fc.STONE, Fc.CRATE, Fc.BARREL];
        for (let step = 0; step < 4; step++) {
          let style = stairStyles[step % stairStyles.length];
          s(9 + step, 13, Z.WALL, style);
          s(13, 9 + step, Z.WALL, style);
          s(15 + step, 20, Z.WALL, style);
        }
      }
      this.lampTiles = [];
      let u = (e, i) => {
        for (let [o, s] of a(e, i)) {
          let e = Fl(o, s);
          r[e] || ((t[e] = Z.WALL), (n[e] = Fc.LAMP), this.lampTiles.push([o, s]));
        }
      };
      (this.arenaName === `stepped` ? u(17, 17) : u(10, 10),
        u(i(8, 10), i(14, 16)),
        u(i(14, 16), i(7, 9)),
        (this.boxSpots = []));
      let d = [];
      for (let e = 0; e < 300 && d.length < 4; e++) {
        let e = i(3, 20),
          n = i(3, 20),
          a = Fl(e, n);
        t[a] !== Z.EMPTY ||
          r[a] ||
          Math.hypot(e - 6, n - 6) < 6 ||
          d.some((t) => Math.hypot(t[0] - e, t[1] - n) < 5) ||
          d.push([e, n]);
      }
      for (let [e, t] of d) for (let n of a(e, t)) this.boxSpots.push(n);
      let f = new Uint8Array(1936),
        p = [Fl(this.spawns[0][0], this.spawns[0][1])];
      f[p[0]] = 1;
      let m = 0;
      for (; p.length;) {
        let e = p.pop();
        m++;
        let n = e % 44,
          r = (e / 44) | 0;
        for (let [e, i] of Ll) {
          let a = Fl(n + e, r + i);
          Il(n + e, r + i) && !f[a] && t[a] !== Z.WALL && t[a] !== Z.WATER && ((f[a] = 1), p.push(a));
        }
      }
      let h = 0;
      for (let e = 0; e < t.length; e++) (t[e] === Z.EMPTY || t[e] === Z.BUSH) && h++;
      return m < h * 0.93 || !this.spawns.every(([e, t]) => f[Fl(e, t)]) || !f[Fl(22, 22)]
        ? !1
        : ((this.boxSpots = this.boxSpots.filter(([e, t]) => f[Fl(e, t)])), this.boxSpots.length >= 10);
    }
    paintBase() {
      let e = 44 * Rl,
        t = al(e, e),
        n = t.getContext(`2d`),
        r = Qc(this.seed ^ 20973),
        palette = this.biomePalette;
      for (let e = 0; e < 44; e++)
        for (let t = 0; t < 44; t++) {
          let i = t < 2 || e < 2 || t >= 42 || e >= 42,
            a = (r() - 0.5) * 3;
          ((n.fillStyle = i
            ? palette?.groundB || `hsl(33, 38%, ${52 + a}%)`
            : palette
              ? (t + e) % 2 ? palette.groundA : palette.groundB
              : (t + e) % 2 ? `hsl(37, 60%, ${66 + a}%)` : `hsl(36, 57%, ${62 + a}%)`),
            n.fillRect(t * Rl, e * Rl, Rl, Rl));
        }
      for (let t = 0; t < 9e3; t++) {
        let t = r() * e,
          i = r() * e,
          a = 0.6 + r() * 1.6;
        ((n.globalAlpha = palette ? 0.1 : 1),
          (n.fillStyle = palette ? (r() < 0.5 ? palette.accent : `#ffffff`) : r() < 0.5 ? `rgba(120,80,30,0.16)` : `rgba(255,240,200,0.16)`),
          n.beginPath(),
          n.arc(t, i, a, 0, 7),
          n.fill(),
          (n.globalAlpha = 1));
      }
      let i = al(e, e),
        a = i.getContext(`2d`);
      ((a.fillStyle = `#fff`), a.fillRect(0, 0, e, e));
      for (let e = 0; e < 44; e++)
        for (let t = 0; t < 44; t++) {
          let n = this.tiles[Fl(t, e)],
            surface = this.surfaceTypes[Fl(t, e)];
          if (n === Z.WATER) a.fillStyle = `#8f7a5a`;
          else if (n === Z.BUSH) a.fillStyle = `#9fae6e`;
          else if (surface === BIOME_SURFACE.LAVA || surface === BIOME_SURFACE.TOXIC) a.fillStyle = `#594737`;
          else if (surface === BIOME_SURFACE.ICE) a.fillStyle = `#8ea2a8`;
          else if (surface === BIOME_SURFACE.MUD) a.fillStyle = `#535747`;
          else continue;
          a.fillRect(t * Rl - 3, e * Rl - 3, 38, 38);
        }
      return (
        n.save(),
        (n.globalCompositeOperation = `multiply`),
        (n.filter = `blur(7px)`),
        n.drawImage(i, 0, 0),
        n.restore(),
        t
      );
    }
    paintAO() {
      let e = 44 * zl,
        t = al(e, e),
        n = t.getContext(`2d`);
      ((n.fillStyle = `#fff`), n.fillRect(0, 0, e, e));
      for (let e = 0; e < 44; e++)
        for (let t = 0; t < 44; t++) {
          let r = Fl(t, e),
            i = this.tiles[r];
          if (i === Z.WALL || this.blockers[r]) n.fillStyle = `#000`;
          else if (i === Z.BUSH) n.fillStyle = `#6a6a6a`;
          else continue;
          let a = i === Z.WALL && this.styles[r] === Fc.LAMP ? 3 : 0;
          n.fillRect(t * zl + a, e * zl + a, zl - a * 2, zl - a * 2);
        }
      this.aoCanvas ||= al(e, e);
      let r = this.aoCanvas.getContext(`2d`);
      return (
        (r.fillStyle = `#fff`),
        r.fillRect(0, 0, e, e),
        (r.filter = `blur(6px)`),
        r.drawImage(t, 0, 0),
        (r.filter = `none`),
        this.aoCanvas
      );
    }
    composeGround() {
      let e = 44 * Rl;
      this.groundCanvas ||= al(e, e);
      let t = this.groundCanvas.getContext(`2d`);
      ((t.globalCompositeOperation = `source-over`),
        (t.globalAlpha = 1),
        t.drawImage(this.baseCanvas, 0, 0),
        (t.globalCompositeOperation = `multiply`),
        (t.globalAlpha = 0.34),
        t.drawImage(this.aoCanvas, 0, 0, e, e),
        (t.globalAlpha = 1),
        (t.globalCompositeOperation = `source-over`));
    }
    buildGround() {
      ((this.baseCanvas = this.paintBase()), this.paintAO(), this.composeGround());
      let e = new cr(this.groundCanvas);
      ((e.colorSpace = k), (e.anisotropy = this.anisotropy));
      let t = new cr(this.aoCanvas);
      ((t.anisotropy = 4), (this.groundMap = e), (this.groundAO = t));
      let n = [],
        r = [],
        i = [],
        a = [],
        o = (e, t, o, s, c, l) => {
          let u = n.length / 3;
          for (let r of [e, t, o, s]) n.push(r[0], r[1], r[2]);
          for (let e = 0; e < 4; e++) i.push(c[0], c[1], c[2]);
          for (let e of l) r.push(e[0], e[1]);
          a.push(u, u + 1, u + 2, u, u + 2, u + 3);
        },
        s = (e) => e / 44,
        c = (e) => 1 - e / 44,
        l = -0.4;
      for (let e = 0; e < 44; e++)
        for (let t = 0; t < 44; t++) {
          let n = t - 22,
            r = e - 22,
            i = n + 1,
            a = r + 1;
          if (this.tiles[Fl(t, e)] !== Z.WATER) {
            o(
              [n, 0, r],
              [n, 0, a],
              [i, 0, a],
              [i, 0, r],
              [0, 1, 0],
              [
                [s(t), c(e)],
                [s(t), c(e + 1)],
                [s(t + 1), c(e + 1)],
                [s(t + 1), c(e)],
              ],
            );
            continue;
          }
          let u = 0.12 / 44,
            d = (n, r) => Il(t + n, e + r) && this.tiles[Fl(t + n, e + r)] !== Z.WATER;
          (d(0, -1) &&
            o(
              [n, 0, r],
              [i, 0, r],
              [i, l, r],
              [n, l, r],
              [0, 0, 1],
              [
                [s(t), c(e) + u],
                [s(t + 1), c(e) + u],
                [s(t + 1), c(e) + u],
                [s(t), c(e) + u],
              ],
            ),
            d(0, 1) &&
              o(
                [i, 0, a],
                [n, 0, a],
                [n, l, a],
                [i, l, a],
                [0, 0, -1],
                [
                  [s(t + 1), c(e + 1) - u],
                  [s(t), c(e + 1) - u],
                  [s(t), c(e + 1) - u],
                  [s(t + 1), c(e + 1) - u],
                ],
              ),
            d(-1, 0) &&
              o(
                [n, 0, a],
                [n, 0, r],
                [n, l, r],
                [n, l, a],
                [1, 0, 0],
                [
                  [s(t) - u, c(e + 1)],
                  [s(t) - u, c(e)],
                  [s(t) - u, c(e)],
                  [s(t) - u, c(e + 1)],
                ],
              ),
            d(1, 0) &&
              o(
                [i, 0, r],
                [i, 0, a],
                [i, l, a],
                [i, l, r],
                [-1, 0, 0],
                [
                  [s(t + 1) + u, c(e)],
                  [s(t + 1) + u, c(e + 1)],
                  [s(t + 1) + u, c(e + 1)],
                  [s(t + 1) + u, c(e)],
                ],
              ));
        }
      let u = new pn();
      (u.setAttribute(`position`, new en(n, 3)),
        u.setAttribute(`normal`, new en(i, 3)),
        u.setAttribute(`uv`, new en(r, 2)),
        u.setIndex(a));
      let d = new Nr({ map: e, aoMap: t, aoMapIntensity: 1, roughness: 0.96, metalness: 0 }),
        f = new Ln(u, d);
      ((f.receiveShadow = !0), (f.name = `ground`), this.group.add(f), this.disposables.push(u, d, e, t));
    }
    rebakeGround() {
      (this.paintAO(), this.composeGround(), (this.groundMap.needsUpdate = !0), (this.groundAO.needsUpdate = !0));
    }
    addInstanced(e, t, n, r, i = !0) {
      let a = new Yn(t, n, Math.max(1, r));
      return (
        (a.count = r),
        (a.castShadow = i),
        (a.receiveShadow = !0),
        (a.name = e),
        this.group.add(a),
        (this.meshes[e] = a),
        this.disposables.push(t, n),
        a
      );
    }
    buildWalls() {
      let e = Qc(this.seed ^ 2577),
        t = { [Fc.STONE]: [], [Fc.CRATE]: [], [Fc.BARREL]: [], [Fc.CACTUS]: [], [Fc.ROCK]: [] };
      for (let e = 0; e < 44; e++)
        for (let n = 0; n < 44; n++) {
          let r = Fl(n, e);
          this.tiles[r] === Z.WALL && t[this.styles[r]] && t[this.styles[r]].push([n, e]);
        }
      let n = (e, t, n, r, i, a, o, s, c, l, u, d, f = 0, p = 0) => {
        (Wl.set(f, s, p),
          Hl.setFromEuler(Wl),
          Bl.compose(Vl.set(i, a, o), Hl, Ul.set(c, l, u)),
          e.setMatrixAt(t, Bl),
          e.setColorAt(t, d),
          n >= 0 && (this.instanceOf[Fl(n, r)] = t));
      };
      {
        let r = ql(new Ml(1, 1, 1, 3, 0.085), 0.62, 0.8),
          i = new Nr({ color: 16777215, roughness: 0.88, metalness: 0, vertexColors: !0 }),
          a = this.addInstanced(`stone`, r, i, t[Fc.STONE].length);
        t[Fc.STONE].forEach(([t, r], i) => {
          let o = e() < 0.13 ? 1.75 + e() * 0.2 : 1.02 + e() * 0.28;
          (Gl.setHSL(0.61 + e() * 0.03, 0.12 + e() * 0.06, 0.58 + e() * 0.1),
            n(a, i, t, r, this.center(t), o / 2 - 0.07, this.center(r), 0, 1, o, 1, Gl));
        });
      }
      {
        let r = ql(new fr(0.94, 0.94, 0.94), 0.7),
          i = new Nr({ map: Jl(), roughness: 0.82, vertexColors: !0 }),
          a = this.addInstanced(`crate`, r, i, t[Fc.CRATE].length);
        t[Fc.CRATE].forEach(([t, r], i) => {
          let o = 0.97 + e() * 0.06;
          (Gl.setHSL(0.08, 0.1, 0.86 + e() * 0.14),
            n(
              a,
              i,
              t,
              r,
              this.center(t),
              0.47 * o - 0.01,
              this.center(r),
              (e() < 0.5 ? 0 : Math.PI / 2) + (e() - 0.5) * 0.12,
              o,
              o,
              o,
              Gl,
            ));
        });
      }
      {
        let r = ql(new hr(0.41, 0.37, 1.04, 16), 0.68),
          i = new Nr({ map: Yl(), roughness: 0.7, vertexColors: !0 }),
          a = this.addInstanced(`barrel`, r, i, t[Fc.BARREL].length);
        t[Fc.BARREL].forEach(([t, r], i) => {
          (Gl.setHSL(0.07, 0.1, 0.85 + e() * 0.15),
            n(a, i, t, r, this.center(t), 0.51, this.center(r), e() * 6.28, 1, 1, 1, Gl));
        });
      }
      {
        let e = [new pr(0.2, 0.85, 5, 12).translate(0, 0.62, 0)],
          n = new pr(0.105, 0.26, 4, 10);
        (e.push(
          n
            .clone()
            .rotateZ(Math.PI / 2)
            .translate(0.3, 0.72, 0),
          n.clone().translate(0.46, 0.92, 0),
        ),
          e.push(
            n
              .clone()
              .rotateZ(Math.PI / 2)
              .translate(-0.28, 0.5, 0),
            n.clone().translate(-0.43, 0.68, 0),
          ),
          (this.cactusGeo = ql(Nl(e), 0.6)),
          (this.cactusMat = new Nr({ color: 16777215, roughness: 0.7, vertexColors: !0 })),
          (this.cactusList = t[Fc.CACTUS]));
      }
      ((this.rockList = t[Fc.ROCK]), (this._place = n), (this._rng = e));
    }
    buildOutskirts() {
      let e = this._rng,
        t = this._place,
        n = [],
        r = [];
      for (let t = 0; t < 150; t++) {
        let t = (e() - 0.5) * 70,
          i = (e() - 0.5) * 66 - 4;
        (Math.abs(t) < 22.8 && Math.abs(i) < 22.8) || (e() < 0.62 ? n : r).push([t, i]);
      }
      let i = new vr(0.78, 0),
        a = new Nr({ color: 16777215, roughness: 0.93, metalness: 0 }),
        o = this.addInstanced(`rock`, i, a, this.rockList.length + n.length);
      (this.rockList.forEach(([n, r], i) => {
        let a = r >= 42 ? 0.95 + e() * 0.4 : (n === 0 || r === 0 || n === 43 || r === 43 ? 1.9 : 1.35) + e() * 0.9,
          s = 1.05 + e() * 0.32;
        (Gl.setHSL(0.05 + e() * 0.025, 0.36 + e() * 0.1, 0.41 + e() * 0.1),
          t(
            o,
            i,
            -1,
            -1,
            this.center(n) + (e() - 0.5) * 0.25,
            a * 0.3,
            this.center(r) + (e() - 0.5) * 0.25,
            e() * 6.28,
            s,
            a,
            s,
            Gl,
            (e() - 0.5) * 0.4,
            (e() - 0.5) * 0.4,
          ));
      }),
        n.forEach(([n, r], i) => {
          let a = 0.5 + e() * 1.3;
          (Gl.setHSL(0.07 + e() * 0.025, 0.22 + e() * 0.1, 0.4 + e() * 0.12),
            t(
              o,
              this.rockList.length + i,
              -1,
              -1,
              n,
              a * 0.28,
              r,
              e() * 6.28,
              a,
              a * (0.7 + e() * 0.8),
              a,
              Gl,
              (e() - 0.5) * 0.5,
              (e() - 0.5) * 0.5,
            ));
        }),
        (o.instanceMatrix.needsUpdate = !0));
      let s = this.addInstanced(`cactus`, this.cactusGeo, this.cactusMat, this.cactusList.length + r.length);
      (this.cactusList.forEach(([n, r], i) => {
        let a = 1 + e() * 0.3;
        (Gl.setHSL(0.3 + e() * 0.04, 0.42, 0.42 + e() * 0.08),
          t(s, i, n, r, this.center(n), -0.04, this.center(r), e() * 6.28, a, a, a, Gl));
      }),
        r.forEach(([n, r], i) => {
          let a = 0.8 + e() * 0.7;
          (Gl.setHSL(0.3 + e() * 0.04, 0.38, 0.38 + e() * 0.08),
            t(s, this.cactusList.length + i, -1, -1, n, -0.04, r, e() * 6.28, a, a, a, Gl));
        }));
      let c = new Nr({ color: new J().setHSL(33 / 360, 0.38, 0.5), roughness: 1 });
      for (let [e, t, n, r] of [
        [0, -67, 224, 90],
        [0, 67, 224, 90],
        [-67, 0, 90, 44],
        [67, 0, 90, 44],
      ]) {
        let i = new yr(n, r).rotateX(-Math.PI / 2),
          a = new Ln(i, c);
        (a.position.set(e, 0, t), (a.receiveShadow = !0), this.group.add(a), this.disposables.push(i));
      }
      this.disposables.push(c);
    }
    createBushGeometry(tier = this.qualityTier) {
      const detail = [[3, 1], [4, 2], [5, 3], [6, 4]][Math.max(0, Math.min(3, Math.trunc(tier)))];
      let geometry = new gr(0.2, 1, detail[0], detail[1]);
      geometry.translate(0, 0.5, 0);
      let positions = geometry.attributes.position;
      for (let index = 0; index < positions.count; index++) {
        let height = positions.getY(index);
        (positions.setX(index, positions.getX(index) + height * height * 0.2), positions.setZ(index, positions.getZ(index) * 0.5));
      }
      geometry.computeVertexNormals();
      return geometry;
    }
    setQuality(tier) {
      const nextTier = Math.max(0, Math.min(3, Math.trunc(Number(tier) || 0)));
      if (nextTier === this.qualityTier) return !1;
      const bush = this.meshes.bush;
      if (bush) {
        let next = this.bushGeometries.get(nextTier);
        if (!next) {
          next = this.createBushGeometry(nextTier);
          this.bushGeometries.set(nextTier, next);
          this.disposables.push(next);
        }
        bush.geometry = next;
        bush.computeBoundingSphere();
        bush.boundingSphere.radius += 4.5;
      }
      this.qualityTier = nextTier;
      return !0;
    }
    buildBushes() {
      let e = Qc(this.seed ^ 2821),
        t = [];
      for (let e = 0; e < 44; e++) for (let n = 0; n < 44; n++) this.tiles[Fl(n, e)] === Z.BUSH && t.push([n, e]);
      let n = this.createBushGeometry();
      this.bushGeometries.set(this.qualityTier, n);
      let i = new Nr({ color: 16777215, roughness: 0.78, metalness: 0 }),
        a = this.grassUniforms;
      if (window.__GBH_RENDERER__?.kind !== `webgpu`) i.onBeforeCompile = (e) => {
        (Object.assign(e.uniforms, a),
          (e.vertexShader = e.vertexShader
            .replace(
              `#include <common>`,
              `#include <common>
uniform float uTime;
uniform vec4 uPushers[ 8 ];
varying float vBladeH;
varying vec3 vBladeWorld;`,
            )
            .replace(
              `#include <project_vertex>`,
              `
          vec4 mvPosition = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
            vec3 rootW = ( instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
          #else
            vec3 rootW = vec3( 0.0 );
          #endif
          float bladeH = clamp( position.y, 0.0, 1.0 );
          float bend = bladeH * bladeH;
          float w1 = sin( uTime * 1.7 + rootW.x * 0.9 + rootW.z * 0.6 );
          float w2 = sin( uTime * 2.9 + rootW.x * 1.7 - rootW.z * 1.3 );
          vec2 sway = vec2( w1 * 0.07 + w2 * 0.03, w2 * 0.045 );
          for ( int i = 0; i < 8; i ++ ) {
            vec4 pusher = uPushers[ i ];
            vec2 away = rootW.xz - pusher.xy;
            float dist = length( away );
            float f = ( 1.0 - smoothstep( 0.0, pusher.z, dist ) ) * pusher.w;
            sway += ( away / max( dist, 0.001 ) ) * f * 0.5;
          }
          mvPosition.xz += sway * bend;
          mvPosition.y -= length( sway ) * bend * 0.4;
          vBladeH = bladeH;
          vBladeWorld = mvPosition.xyz;
          mvPosition = modelViewMatrix * mvPosition;
          gl_Position = projectionMatrix * mvPosition;`,
            )),
          (e.fragmentShader = e.fragmentShader
            .replace(
              `#include <common>`,
              `#include <common>
uniform vec4 uReveal;
varying float vBladeH;
varying vec3 vBladeWorld;`,
            )
            .replace(
              `#include <color_fragment>`,
              `#include <color_fragment>
          // dark roots, bright tips: fake occlusion + translucency
          diffuseColor.rgb *= mix( 0.4, 1.3, vBladeH );
          if ( uReveal.w > 0.5 ) {
            // screen-door fade so you can see your own brawler while hiding
            float fade = smoothstep( 0.55, 1.55, distance( vBladeWorld.xz, uReveal.xy ) );
            float n = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
            if ( n > mix( 0.3, 1.01, fade ) ) discard;
          }`,
            )));
      };
      let o = this.addInstanced(`bush`, n, i, t.length * 13),
        s = 0;
      for (let [n, r] of t) {
        ((this.bushRange[Fl(n, r) * 2] = s), (this.bushRange[Fl(n, r) * 2 + 1] = 13));
        for (let t = 0; t < 13; t++) {
          let i = t < 9 ? (t % 3) / 3 + 1 / 6 : e(),
            a = t < 9 ? Math.floor(t / 3) / 3 + 1 / 6 : e(),
            c = n - 22 + i + (e() - 0.5) * 0.22,
            l = r - 22 + a + (e() - 0.5) * 0.22,
            u = 0.85 + e() * 0.5;
          (Wl.set((e() - 0.5) * 0.3, e() * 6.28, (e() - 0.5) * 0.3),
            Hl.setFromEuler(Wl),
            Bl.compose(Vl.set(c, -0.03, l), Hl, Ul.set(u * 1.15, u * (0.95 + e() * 0.35), u * 1.15)),
            o.setMatrixAt(s, Bl),
            Gl.setHSL(0.27 + e() * 0.06, 0.55 + e() * 0.15, 0.36 + e() * 0.1),
            o.setColorAt(s, Gl),
            s++);
        }
      }
      o.computeBoundingSphere();
      // The vertex shader can bend blades by up to 4 units when several pushers overlap.
      o.boundingSphere.radius += 4.5;
      o.frustumCulled = !0;
    }
    buildWater() {
      let e = !1;
      for (let t = 0; t < this.tiles.length; t++) this.tiles[t] === Z.WATER && (e = !0);
      if (!e) return;
      let t = Xl(),
        n = new Nr({
          color: this.biomePalette?.liquid || 2072516,
          roughness: 0.07,
          metalness: 0.05,
          normalMap: t,
          normalScale: new V(0.55, 0.55),
          envMapIntensity: 1.6,
          emissive: this.biomePalette?.liquid || 407631,
          emissiveIntensity: 0.35,
        }),
        r = new yr(44, 44).rotateX(-Math.PI / 2),
        i = new Ln(r, n);
      ((i.position.y = -0.17),
        (i.receiveShadow = !0),
        (i.name = `water`),
        this.group.add(i),
        (this.water = i),
        (this.waterNormal = t),
        this.disposables.push(r, n, t));
    }
    buildBiomeSurfaces() {
      if (!this.hazardTiles.length) return;
      let geometry = new yr(0.96, 0.96).rotateX(-Math.PI / 2),
        styles = {
          [BIOME_SURFACE.LAVA]: { name: `lava`, color: 0xb83d20, emissive: 0xff3b09, intensity: 0.78 },
          [BIOME_SURFACE.TOXIC]: { name: `toxic`, color: 0x667a38, emissive: 0x73d72d, intensity: 0.4 },
          [BIOME_SURFACE.ICE]: { name: `ice`, color: 0xb9e4ed, emissive: 0x68adbf, intensity: 0.18 },
          [BIOME_SURFACE.MUD]: { name: `mud`, color: 0x514d38, emissive: 0x1c2412, intensity: 0.08 },
          [BIOME_SURFACE.LOW_GRAVITY]: { name: `gravity`, color: 0x5549aa, emissive: 0x766bff, intensity: 0.62 },
        };
      this.disposables.push(geometry);
      for (let [surface, style] of Object.entries(styles)) {
        let tiles = this.hazardTiles.filter((tile) => tile.type === +surface);
        if (!tiles.length) continue;
        let material = new Nr({
            color: style.color,
            emissive: style.emissive,
            emissiveIntensity: style.intensity,
            roughness: surface === `${BIOME_SURFACE.ICE}` ? 0.3 : 0.82,
            metalness: 0,
          }),
          mesh = new Yn(geometry, material, tiles.length);
        (mesh.castShadow = !1),
          (mesh.receiveShadow = !1),
          (mesh.name = `biome-${style.name}`);
        tiles.forEach((tile, index) => {
          (Bl.makeTranslation(this.center(tile.x), 0.022, this.center(tile.y)), mesh.setMatrixAt(index, Bl));
        });
        (mesh.instanceMatrix.needsUpdate = !0,
          mesh.computeBoundingSphere(),
          this.group.add(mesh),
          (this.meshes[mesh.name] = mesh),
          this.disposables.push(material));
        this.hazardMeshes.push({ material, intensity: style.intensity, type: +surface });
      }
      let bridges = this.surfaceTypes.reduce((count, surface) => count + +(surface === BIOME_SURFACE.BRIDGE), 0);
      if (bridges) {
        let material = new Nr({ color: this.biomePalette?.accent || 0xa7a092, roughness: 0.92, metalness: 0 }),
          mesh = new Yn(geometry, material, bridges),
          index = 0;
        (mesh.castShadow = !1), (mesh.receiveShadow = !1), (mesh.name = `biome-bridge`);
        for (let tile = 0; tile < this.surfaceTypes.length; tile++)
          if (this.surfaceTypes[tile] === BIOME_SURFACE.BRIDGE) {
            (Bl.makeTranslation(this.center(tile % 44), 0.026, this.center((tile / 44) | 0)), mesh.setMatrixAt(index++, Bl));
          }
        (mesh.instanceMatrix.needsUpdate = !0,
          mesh.computeBoundingSphere(),
          this.group.add(mesh),
          (this.meshes[mesh.name] = mesh),
          this.disposables.push(material));
      }
    }
    buildLamps() {
      let e = this.lampTiles.length,
        t = Nl([
          new hr(0.3, 0.4, 0.5, 10).translate(0, 0.25, 0),
          new hr(0.05, 0.075, Rc.height, 8).translate(0, Rc.height / 2, 0),
          new fr(Rc.arm + 0.12, 0.07, 0.07).translate(Rc.arm / 2, Rc.height, 0),
          new hr(0.07, 0.15, 0.07, 8).translate(Rc.arm, Rc.height - 0.02, 0),
          new hr(0.1, 0.06, 0.05, 8).translate(Rc.arm, Rc.height - 0.42, 0),
        ]),
        n = new Nr({ color: 4869984, roughness: 0.55, metalness: 0.25 }),
        r = this.addInstanced(`lampPost`, t, n, e),
        i = new hr(0.135, 0.105, 0.34, 10).translate(0, -0.05, 0);
      this.lampGlass = new Nr({ color: 3811860, emissive: 16757850, emissiveIntensity: 0.15, roughness: 0.3 });
      let a = this.addInstanced(`lampGlass`, i, this.lampGlass, e, !1);
      ((a.receiveShadow = !1),
        (this.lanterns = []),
        this.lampTiles.forEach(([e, t], n) => {
          let i = this.center(e),
            o = this.center(t),
            s = Math.hypot(i, o) || 1,
            c = -i / s,
            l = -o / s;
          (Wl.set(0, Math.atan2(-l, c), 0),
            Hl.setFromEuler(Wl),
            Bl.compose(Vl.set(i, -0.03, o), Hl, Ul.set(1, 1, 1)),
            r.setMatrixAt(n, Bl));
          let u = i + c * Rc.arm,
            d = o + l * Rc.arm;
          (Bl.makeTranslation(u, Rc.height - 0.17, d), a.setMatrixAt(n, Bl), this.lanterns.push({ x: u, z: d }));
        }));
    }
    destroyTile(e, t) {
      if (!this.isBreakable(e, t)) return null;
      let n = Fl(e, t),
        r = { type: this.tiles[n], style: this.styles[n], x: this.center(e), z: this.center(t) };
      if (this.tiles[n] === Z.BUSH) {
        let e = this.bushRange[n * 2],
          t = this.bushRange[n * 2 + 1],
          r = this.meshes.bush;
        for (let n = 0; n < t; n++) r.setMatrixAt(e + n, Kl);
        r.instanceMatrix.needsUpdate = !0;
      } else {
        let e = [`stone`, `crate`, `barrel`, `cactus`][this.styles[n]],
          t = this.meshes[e],
          r = this.instanceOf[n];
        t && r >= 0 && (t.setMatrixAt(r, Kl), (t.instanceMatrix.needsUpdate = !0));
      }
      return ((this.tiles[n] = Z.EMPTY), (this.aoDirty = !0), r);
    }
    setBlocker(e, t, n) {
      ((this.blockers[Fl(e, t)] = +!!n), (this.aoDirty = !0));
    }
    resolveCircle(e, t) {
      for (let n = 0; n < 2; n++) {
        let n = this.toTile(e.x),
          r = this.toTile(e.z);
        for (let i = -1; i <= 1; i++)
          for (let a = -1; a <= 1; a++) {
            let o = n + a,
              s = r + i;
            if (!this.isSolidTile(o, s)) continue;
            let c = o - 22,
              l = s - 22,
              u = $c(e.x, c, c + 1),
              d = $c(e.z, l, l + 1),
              f = e.x - u,
              p = e.z - d,
              m = f * f + p * p;
            if (!(m >= t * t)) {
              if (m > 1e-8) {
                let n = Math.sqrt(m);
                ((e.x = u + (f / n) * t), (e.z = d + (p / n) * t));
              } else {
                let n = e.x - c,
                  r = c + 1 - e.x,
                  i = e.z - l,
                  a = l + 1 - e.z,
                  o = Math.min(n, r, i, a);
                o === n ? (e.x = c - t) : o === r ? (e.x = c + 1 + t) : (e.z = o === i ? l - t : l + 1 + t);
              }
            }
          }
      }
    }
    raycast(e, t, n, r, i = {}) {
      if (!Number.isFinite(e) || !Number.isFinite(t) || !Number.isFinite(n) || !Number.isFinite(r)) return null;
      let a = this.toTile(e),
        o = this.toTile(t),
        s = n - e,
        c = r - t,
        l = Math.hypot(s, c);
      if (l < 1e-6) return null;
      let u = s / l,
        d = c / l,
        f = u > 0 ? 1 : -1,
        p = d > 0 ? 1 : -1,
        m = u === 0 ? 1 / 0 : Math.abs(1 / u),
        h = d === 0 ? 1 / 0 : Math.abs(1 / d),
        g = e + 22 - a,
        _ = t + 22 - o,
        v = u === 0 ? 1 / 0 : (u > 0 ? 1 - g : g) * m,
        y = d === 0 ? 1 / 0 : (d > 0 ? 1 - _ : _) * h,
        b = 0;
      for (let n = 0; n < 160; n++) {
        if ((v < y ? ((b = v), (v += m), (a += f)) : ((b = y), (y += h), (o += p)), b > l)) return null;
        if (this.blocksShots(a, o) && !(i.ignoreTile && i.ignoreTile.x === a && i.ignoreTile.z === o))
          return ((i.tx = a), (i.ty = o), (i.dist = b), (i.x = e + u * b), (i.z = t + d * b), i);
      }
      return null;
    }
    hasLineOfSight(e, t, n, r) {
      return this.raycast(e, t, n, r) === null;
    }
    findPath(e, t, n, r, i) {
      if (!Il(e, t) || !Il(n, r)) return null;
      let a = ++this._tick,
        { _g: o, _from: s, _stamp: c, _closed: l } = this,
        u = Fl(e, t),
        d = Fl(n, r),
        f = [],
        p = (e, t) => {
          f.push([t, e]);
          let n = f.length - 1;
          for (; n > 0;) {
            let e = (n - 1) >> 1;
            if (f[e][0] <= f[n][0]) break;
            (([f[e], f[n]] = [f[n], f[e]]), (n = e));
          }
        },
        m = () => {
          let e = f[0],
            t = f.pop();
          if (f.length) {
            f[0] = t;
            let e = 0;
            for (;;) {
              let t = e * 2 + 1,
                n = t + 1,
                r = e;
              if ((t < f.length && f[t][0] < f[r][0] && (r = t), n < f.length && f[n][0] < f[r][0] && (r = n), r === e))
                break;
              (([f[r], f[e]] = [f[e], f[r]]), (e = r));
            }
          }
          return e[1];
        },
        h = (e, t) => {
          let i = Math.abs(e - n),
            a = Math.abs(t - r);
          return Math.max(i, a) + 0.4142 * Math.min(i, a);
        };
      ((o[u] = 0), (c[u] = a), (s[u] = -1), p(u, h(e, t)));
      let g = 0;
      for (; f.length && g++ < 4e3;) {
        let e = m();
        if (e === d) {
          let t = [],
            n = e;
          for (; n !== u && n >= 0;) (t.push([n % 44, (n / 44) | 0]), (n = s[n]));
          return t.reverse();
        }
        if (l[e] === a) continue;
        l[e] = a;
        let t = e % 44,
          n = (e / 44) | 0;
        for (let r = -1; r <= 1; r++)
          for (let l = -1; l <= 1; l++) {
            if (!l && !r) continue;
            let u = t + l,
              f = n + r;
            if (!Il(u, f)) continue;
            let m = Fl(u, f);
            if (
              (m !== d && !this.isWalkable(u, f)) ||
              (l && r && (!this.isWalkable(t + l, n) || !this.isWalkable(t, n + r)))
            )
              continue;
            let g = o[e] + (l && r ? 1.4142 : 1) + (i ? i(u, f) : 0);
            (c[m] === a && g >= o[m]) || ((o[m] = g), (c[m] = a), (s[m] = e), p(m, g + h(u, f)));
          }
      }
      return null;
    }
    nearestOpen(e, t) {
      let n = this.toTile(e),
        r = this.toTile(t),
        i = null,
        a = 1 / 0;
      for (let o = 0; o <= 4 && !i; o++)
        for (let s = -o; s <= o; s++)
          for (let c = -o; c <= o; c++) {
            if (Math.max(Math.abs(c), Math.abs(s)) !== o || !this.isWalkable(n + c, r + s)) continue;
            let l = this.center(n + c),
              u = this.center(r + s),
              d = (l - e) * (l - e) + (u - t) * (u - t);
            d < a && ((a = d), (i = { x: o === 0 ? e : l, z: o === 0 ? t : u }));
          }
      return i || { x: e, z: t };
    }
    update(e, t) {
      ((this.grassUniforms.uTime.value = t), this.waterNormal && this.waterNormal.offset.set(t * 0.021, t * 0.013));
      for (let i = 0; i < this.hazardMeshes.length; i++) {
        let hazard = this.hazardMeshes[i];
        hazard.material.emissiveIntensity = hazard.intensity * (0.9 + Math.sin(t * (hazard.type === BIOME_SURFACE.LAVA ? 4 : 2.4)) * 0.1);
      }
      this.aoDirty
        ? ((this.aoTimer -= e), this.aoTimer <= 0 && (this.rebakeGround(), (this.aoDirty = !1), (this.aoTimer = 0.3)))
        : (this.aoTimer = Math.max(0, this.aoTimer - e));
    }
    dispose() {
      this.scene.remove(this.group);
      disposeRendererResources([...this.disposables, ...Object.values(this.meshes)]);
    }
  },
  Ql = {},
  $l = (e, t) => Ql[e] || (Ql[e] = t()),
  eu = (e, t = 18, n = 14) => $l(`s${e}_${t}_${n}`, () => new xr(e, t, n)),
  tu = (e, t) => $l(`c${e}_${t}`, () => new pr(e, t, 5, 12)),
  nu = (e, t, n, r = 16) => $l(`y${e}_${t}_${n}_${r}`, () => new hr(e, t, n, r)),
  ru = (e, t, n) => $l(`b${e}_${t}_${n}`, () => new fr(e, t, n)),
  iu = (e, t) => $l(`d${e}_${t}`, () => new xr(e, 20, 12, 0, Math.PI * 2, 0, Math.PI * t)),
  au = (e, t) => $l(`t${e}_${t}`, () => new Sr(e, t, 8, 24)),
  ou = new br(0.5, 0.64, 44).rotateX(-Math.PI / 2),
  su = new mr(0.5, 36).rotateX(-Math.PI / 2),
  cu = new br(0.7, 0.8, 44).rotateX(-Math.PI / 2),
  lu = (e, t = {}) => new Nr({ color: e, roughness: 0.62, metalness: 0, ...t });
