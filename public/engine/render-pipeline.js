var Yc = {
    name: `SanitizeShader`,
    uniforms: { tDiffuse: { value: null } },
    vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
    fragmentShader: `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D( tDiffuse, vUv );
      bvec3 bad = bvec3( isnan( c.r ) || isinf( c.r ), isnan( c.g ) || isinf( c.g ), isnan( c.b ) || isinf( c.b ) );
      c.rgb = mix( c.rgb, vec3( 0.0 ), vec3( bad ) );
      gl_FragColor = vec4( clamp( c.rgb, 0.0, 120.0 ), 1.0 );
    }`,
  },
  Xc = {
    name: `GradeShader`,
    uniforms: {
      tDiffuse: { value: null },
      uVignette: { value: 0.32 },
      uSaturation: { value: 1.1 },
      uTint: { value: new J(1, 1, 1) },
    },
    vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
    fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uSaturation;
    uniform vec3 uTint;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D( tDiffuse, vUv );
      vec2 d = ( vUv - 0.5 ) * vec2( 1.0, 1.12 );
      float v = smoothstep( 0.9, 0.3, length( d ) );
      c.rgb *= mix( 1.0 - uVignette, 1.0, v );
      float l = dot( c.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
      // split-tone: uTint colours the dark end only, so lamp-lit areas keep their warmth
      vec3 tint = mix( uTint, vec3( 1.0 ), smoothstep( 0.04, 0.75, l ) );
      c.rgb = max( mix( vec3( l ), c.rgb, uSaturation ), 0.0 ) * tint;
      gl_FragColor = c;
    }`,
  },
  Zc = class {
    constructor(e, t, n) {
      ((this.scene = t),
        (this.camera = n),
        (this.isWebGPU = window.__GBH_RENDERER__?.kind === `webgpu`),
        (this.pcssAvailable = this.isWebGPU ? !1 : Jc()));
      let r = window.__GBH_RENDERER__?.renderer || new uc({ canvas: e, antialias: !1, powerPreference: `high-performance`, stencil: !1 });
      ((this.renderer = r),
        (r.outputColorSpace = k),
        (r.toneMapping = 4),
        (r.toneMappingExposure = 1),
        (r.shadowMap.enabled = !this.isWebGPU),
        (r.shadowMap.type = +!this.pcssAvailable),
        (r.shadowMap.autoUpdate = !1),
        r.setClearColor(724506, 1),
        (this.qualityName = `high`),
        (this.quality = Uc.high),
        (this.toggles = { ao: !0, bloom: !0 }),
        (this.superSample = 0),
        (this.maxPixelsCoarse = 1500000),
        (this.maxPixelsFine = 5000000),
        (this.composer = null),
        (this.width = 1),
        (this.height = 1),
        (this.pixelRatio = 0),
        (this.shadowLights = []),
        (this.shadowLightsDirty = !0),
        (this.shadowUpdateInterval = 1000 / 30),
        (this.lastShadowUpdate = -Infinity),
        (this.shadowUpdateRequested = !0),
        (this.performanceScale = 1));
    }
    get usingPCSS() {
      return this.pcssAvailable && this.quality.pcss;
    }
    setQuality(e) {
      if (!Uc[e]) return;
      let previous = this.quality;
      ((this.qualityName = e), (this.quality = Uc[e]), (this.shadowLightsDirty = !0));
      let t = +!this.usingPCSS;
      this.renderer.shadowMap.type !== t && (this.renderer.shadowMap.type = t);
      let passLayoutChanged = !previous || previous.msaa !== this.quality.msaa || previous.ao !== this.quality.ao || previous.bloom !== this.quality.bloom;
      if (passLayoutChanged || (!this.isWebGPU && !this.composer)) this.build();
      else {
        let width = Math.max(2, this.renderer.domElement.clientWidth || window.innerWidth);
        let height = Math.max(2, this.renderer.domElement.clientHeight || window.innerHeight);
        this.setSize(width, height, this.getPixelRatio(width, height));
        this.requestShadowUpdate(!0);
      }
    }
    requestShadowUpdate(e = !1) {
      ((this.shadowUpdateRequested = !0), e && (this.shadowLightsDirty = !0));
    }
    getPixelRatio(e, t) {
      let n = Math.max(0.25, (this.superSample || Math.min(window.devicePixelRatio || 1, this.quality.dpr)) * this.performanceScale),
        r = window.matchMedia && window.matchMedia(`(pointer: coarse)`).matches ? this.maxPixelsCoarse : this.maxPixelsFine;
      return (n *= Math.min(1, Math.sqrt(r / Math.max(1, e * t * n * n)))), n;
    }
    setPerformanceScale(e) {
      let n = $c(Number(e) || 1, 0.6, 1);
      if (Math.abs(n - this.performanceScale) < 0.005) return !1;
      ((this.performanceScale = n), this.resize());
      return !0;
    }
    setSize(e, t, n = this.getPixelRatio(e, t)) {
      let r = this.renderer;
      (r.setPixelRatio(n), r.setSize(e, t, !1), this.composer && (this.composer.setPixelRatio(n), this.composer.setSize(e, t)));
      ((this.width = e), (this.height = t), (this.pixelRatio = n), (this.camera.aspect = e / t), this.camera.updateProjectionMatrix());
    }
    build() {
      let e = this.quality,
        t = this.renderer,
        n = Math.max(2, t.domElement.clientWidth || window.innerWidth),
        r = Math.max(2, t.domElement.clientHeight || window.innerHeight),
        i = this.getPixelRatio(n, r);
      (this.composer &&
          (this.composer.passes.forEach((e) => e.dispose && e.dispose()),
          this.composer.renderTarget1.dispose(),
          this.composer.renderTarget2.dispose(),
          (this.composer = null)),
        this.setSize(n, r, i));
      this.requestShadowUpdate(!0);
      if (this.isWebGPU) {
        ((this.composer = null), (this.gtao = null), (this.bloom = null), (this.grade = null));
        return;
      }
      let a = t.getDrawingBufferSize(new V()),
        o = new yc(t, new Fe(a.x, a.y, { type: u, samples: e.msaa }));
      if (
        (o.setPixelRatio(i),
        o.setSize(n, r),
        (this.composer = o),
        o.addPass(new bc(this.scene, this.camera)),
        o.addPass(new gc(Yc)),
        (this.gtao = null),
        e.ao && this.toggles.ao)
      ) {
        // AO is a soft, low-frequency effect. Keeping its G-buffer at half
        // resolution avoids three full-size render targets on High/Ultra maps.
        let aoScale = this.quality.tier >= 2 ? 0.5 : 1;
        let e = new Ac(this.scene, this.camera, Math.max(2, Math.ceil(a.x * aoScale)), Math.max(2, Math.ceil(a.y * aoScale)));
        let resizeAO = e.setSize.bind(e);
        e.setSize = (width, height) => resizeAO(Math.max(2, Math.ceil(width * aoScale)), Math.max(2, Math.ceil(height * aoScale)));
        ((e.output = Ac.OUTPUT.Default),
          (e.blendIntensity = 0.85),
          e.updateGtaoMaterial({
            radius: 0.55,
            distanceExponent: 1.4,
            thickness: 1.2,
            scale: 1.15,
            samples: 16,
            distanceFallOff: 1,
            screenSpaceRadius: !1,
          }),
          e.updatePdMaterial({
            lumaPhi: 10,
            depthPhi: 2,
            normalPhi: 3,
            radius: 7,
            radiusExponent: 1.2,
            rings: 2,
            samples: 14,
          }));
        let t = e._overrideVisibility.bind(e);
        ((e._overrideVisibility = function () {
          t();
          let e = this._visibilityCache;
          this.scene.traverse((t) => {
            t.userData.noAO && t.visible && ((t.visible = !1), e.push(t));
          });
        }),
          (e.enabled = this.toggles.ao),
          o.addPass(e),
          (this.gtao = e));
      }
      this.bloom = null;
      e.bloom && this.toggles.bloom && ((this.bloom = new Mc(new V(a.x, a.y), 0.5, 0.72, 1.2)), o.addPass(this.bloom));
      this.grade = null;
      if (!(window.matchMedia && window.matchMedia(`(pointer: coarse)`).matches)) {
        ((this.grade = new gc(Xc)), o.addPass(this.grade));
      }
      o.addPass(new Pc());
    }
    setToggle(e, t) {
      this.toggles[e] = t;
      if (e === `ao` && this.quality.ao && (t ? !this.gtao : this.gtao)) return this.build();
      if (e === `bloom` && this.quality.bloom && (t ? !this.bloom : this.bloom)) return this.build();
      (e === `ao` && this.gtao && (this.gtao.enabled = t),
        e === `bloom` && this.bloom && (this.bloom.enabled = t && this.quality.bloom));
    }
    resize() {
      let e = Math.max(2, this.renderer.domElement.clientWidth || window.innerWidth),
        t = Math.max(2, this.renderer.domElement.clientHeight || window.innerHeight),
        n = this.getPixelRatio(e, t);
      (e !== this.width || t !== this.height || Math.abs(n - this.pixelRatio) > 1e-3) &&
        (this.setSize(e, t, n), this.requestShadowUpdate());
    }
    render(e) {
      let t = performance.now();
      if (this.shadowLightsDirty) {
        ((this.shadowLights.length = 0),
          this.scene.traverse((e) => e.isLight && e.shadow && this.shadowLights.push(e)),
          (this.shadowLightsDirty = !1));
      }
      let n = this.shadowUpdateRequested || t - this.lastShadowUpdate >= this.shadowUpdateInterval,
        r = !1;
      for (let e of this.shadowLights) {
        let t = e.shadow,
          i = !!(e.visible !== !1 && e.castShadow && e.intensity > 0.005 && (!Number.isFinite(t.intensity) || t.intensity > 0.005));
        ((t.autoUpdate = !1),
          i && (r = !0),
          n && i ? (t.needsUpdate = !0) : !i && (t.needsUpdate = !1));
      }
      if (this.renderer.shadowMap) {
        ((this.renderer.shadowMap.autoUpdate = !1),
          (this.renderer.shadowMap.needsUpdate = !!(n && r)));
      }
      (n && ((this.lastShadowUpdate = t), (this.shadowUpdateRequested = !1)),
        this.isWebGPU ? this.renderer.render(this.scene, this.camera) : this.composer.render(e));
    }
  };
