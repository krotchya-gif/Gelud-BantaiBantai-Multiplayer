function Mu() {
  let e = al(128, 128),
    t = e.getContext(`2d`),
    n = t.createRadialGradient(64, 64, 4, 64, 64, 62);
  (n.addColorStop(0, `rgba(10,6,4,0.85)`),
    n.addColorStop(0.45, `rgba(14,9,6,0.6)`),
    n.addColorStop(0.8, `rgba(20,12,8,0.18)`),
    n.addColorStop(1, `rgba(20,12,8,0)`),
    (t.fillStyle = n),
    t.fillRect(0, 0, 128, 128));
  for (let e = 0; e < 26; e++) {
    let e = Math.random() * 6.28,
      n = 20 + Math.random() * 38;
    ((t.fillStyle = `rgba(8,5,3,0.35)`),
      t.beginPath(),
      t.arc(64 + Math.cos(e) * n, 64 + Math.sin(e) * n, 2 + Math.random() * 5, 0, 7),
      t.fill());
  }
  return new cr(e);
}
var Nu = class {
    constructor(e) {
      this.game = e;
      let t = e.scene;
      ((this.glow = new ju(t, 1800, !0)),
        (this.smoke = new ju(t, 900, !1)),
        (this.flashes = []),
        (this.flashPool = []),
        (this.debrisCap = 140),
        (this.debrisActiveCap = this.debrisCap),
        (this.debrisMesh = new Yn(new fr(1, 1, 1), new Nr({ color: 16777215, roughness: 0.85 }), this.debrisCap)),
        (this.debrisMesh.castShadow = !0),
        (this.debrisMesh.receiveShadow = !0),
        (this.debrisMesh.frustumCulled = !1),
        (this.debrisData = []));
      for (let e = 0; e < this.debrisCap; e++)
        (this.debrisData.push({
          life: 0,
          x: 0,
          y: 0,
          z: 0,
          vx: 0,
          vy: 0,
          vz: 0,
          rx: 0,
          ry: 0,
          rz: 0,
          wx: 0,
          wy: 0,
          wz: 0,
          s: 0.1,
        }),
          this.debrisMesh.setMatrixAt(e, Cu.makeScale(0, 0, 0)),
          this.debrisMesh.setColorAt(e, Ou.set(16777215)));
      for (let e = 0; e < 48; e++)
        this.flashPool.push({ x: 0, y: 0, z: 0, color: null, intensity: 0, distance: 0, t: 0, T: 0 });
      ((this.debrisCursor = 0), t.add(this.debrisMesh), (this.decals = []));
      let n = Mu(),
        r = new yr(1, 1).rotateX(-Math.PI / 2);
      for (let e = 0; e < 18; e++) {
        let e = new Ln(r, new Tn({ map: n, transparent: !0, opacity: 0, depthWrite: !1, color: 0 }));
        ((e.visible = !1),
          (e.renderOrder = 1),
          (e.userData.noAO = !0),
          t.add(e),
          this.decals.push({ mesh: e, life: 0 }));
      }
      ((this.decalCursor = 0), (this.rings = []), (this.drawingBufferSize = new V()));
      let i = new br(0.82, 1, 64).rotateX(-Math.PI / 2);
      for (let e = 0; e < 10; e++) {
        let e = new Ln(i, new Tn({ color: 16777215, transparent: !0, opacity: 0, depthWrite: !1, blending: 2 }));
        ((e.visible = !1),
          (e.renderOrder = 6),
          (e.userData.noAO = !0),
          t.add(e),
          this.rings.push({ mesh: e, t: 0, T: 0, r: 1 }));
      }
      ((this.ringCursor = 0), this.setQuality(e.pipeline.quality.tier), this.buildFireflies());
    }
    setQuality(e) {
      let t = [0.55, 0.75, 0.9, 1][e] ?? 1;
      (this.glow.setQuality(t), this.smoke.setQuality(t));
      let n = Math.max(24, Math.round(this.debrisCap * t));
      if (n === this.debrisActiveCap) return;
      if (n < this.debrisActiveCap)
        for (let e = n; e < this.debrisActiveCap; e++)
          ((this.debrisData[e].life = 0), this.debrisMesh.setMatrixAt(e, Kl));
      ((this.debrisActiveCap = n), (this.debrisCursor %= n), (this.debrisMesh.instanceMatrix.needsUpdate = !0));
    }
    buildFireflies() {
      let e = this.game.world,
        t = [],
        n = e.meshes.bush,
        r = new Float32Array(270),
        i = new Float32Array(90),
        a = new Re();
      for (let e = 0; e < 90; e++)
        (n && n.count > 0
          ? (n.getMatrixAt(Math.floor(Math.random() * n.count), a), Tu.setFromMatrixPosition(a))
          : Tu.set(Q(-18, 18), 0, Q(-18, 18)),
          (r[e * 3] = Tu.x + Q(-1.4, 1.4)),
          (r[e * 3 + 1] = Q(0.5, 1.9)),
          (r[e * 3 + 2] = Tu.z + Q(-1.4, 1.4)),
          (i[e] = Math.random() * 100),
          t.push(e));
      let o = new pn();
      (o.setAttribute(`position`, new Zt(r, 3)),
        o.setAttribute(`aPhase`, new Zt(i, 1)),
        (this.fireflyBase = r.slice()),
        (this.fireflyPhases = i),
        (this.fireflyMat = this.game.pipeline.isWebGPU
          ? new er({ color: 14286831, size: 0.16, transparent: !0, opacity: 0, depthWrite: !1, blending: 2 })
          : new jr({
          uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uScale: { value: 600 } },
          vertexShader: `
        attribute float aPhase;
        uniform float uTime; uniform float uScale;
        varying float vBlink;
        void main() {
          vec3 p = position;
          p.x += sin( uTime * 0.6 + aPhase ) * 0.7 + sin( uTime * 1.3 + aPhase * 2.0 ) * 0.25;
          p.y += sin( uTime * 0.9 + aPhase * 1.7 ) * 0.3;
          p.z += cos( uTime * 0.5 + aPhase * 1.3 ) * 0.7;
          vBlink = pow( clamp( 0.5 + 0.5 * sin( uTime * 2.2 + aPhase * 5.0 ), 0.0, 1.0 ), 3.0 );
          vec4 mv = modelViewMatrix * vec4( p, 1.0 );
          gl_Position = projectionMatrix * mv;
          gl_PointSize = ( 0.1 + vBlink * 0.12 ) * uScale / max( 0.1, - mv.z );
        }`,
          fragmentShader: `
        uniform float uNight;
        varying float vBlink;
        void main() {
          float d = length( gl_PointCoord - 0.5 );
          float a = smoothstep( 0.5, 0.0, d );
          gl_FragColor = vec4( vec3( 1.6, 2.4, 0.5 ) * ( 0.4 + vBlink * 3.0 ), a * a * uNight );
        }`,
          transparent: !0,
          depthWrite: !1,
          blending: 2,
        })),
        (this.fireflies = new ar(o, this.fireflyMat)),
        (this.fireflies.frustumCulled = !1),
        (this.fireflies.renderOrder = 9),
        this.game.scene.add(this.fireflies));
    }
    rebuildFireflies() {
      (this.game.scene.remove(this.fireflies),
        disposeRendererResources([this.fireflies.geometry, this.fireflyMat]),
        this.buildFireflies());
    }
    flash(e, t, n, r, i, a, o) {
      let flash = this.flashPool.pop() || { x: 0, y: 0, z: 0, color: null, intensity: 0, distance: 0, t: 0, T: 0 };
      ((flash.x = e),
        (flash.y = t),
        (flash.z = n),
        (flash.color = r),
        (flash.intensity = i),
        (flash.distance = a),
        (flash.t = 0),
        (flash.T = o),
        this.flashes.push(flash));
    }
    spark(e, t, n, r) {
      this.glow.emit(
        e,
        t,
        n,
        Q(-1.4, 1.4),
        Q(0.6, 2.6),
        Q(-1.4, 1.4),
        Q(0.18, 0.4),
        0.14,
        0.02,
        r.r * 5,
        r.g * 5,
        r.b * 5,
        1,
        2,
        7,
      );
    }
    trail(e, t, n, r, i) {
      this.glow.emit(
        e + Q(-0.04, 0.04),
        t + Q(-0.04, 0.04),
        n + Q(-0.04, 0.04),
        0,
        0,
        0,
        0.15,
        i * 1.35,
        0.02,
        r.r * 1.15,
        r.g * 1.15,
        r.b * 1.15,
        0.5,
        0,
        0,
      );
    }
    electricMuzzle(e, t, n, r, i, a, o) {
      this.flash(e, t, n, a, 4.8 * o, 4.5 * o, 0.09);
      let s = o > 1 ? 9 : 6;
      for (let c = 0; c < s; c++) {
        let s = Q(0.5, 2.4) * o,
          l = Q(-1.7, 1.7) * o;
        this.glow.emit(
          e + r * Q(0.02, 0.24),
          t + Q(-0.07, 0.07),
          n + i * Q(0.02, 0.24),
          r * s + i * l,
          Q(-0.8, 1.8) * o,
          i * s - r * l,
          Q(0.055, 0.13),
          Q(0.08, 0.16) * o,
          0.015,
          a.r * 4.8,
          a.g * 4.8,
          a.b * 5.8,
          1,
          1,
          2,
        );
      }
    }
    electricTrail(e, t, n, r, i) {
      for (let a = 0; a < 2; a++)
        this.glow.emit(
          e + Q(-0.12, 0.12),
          t + Q(-0.1, 0.1),
          n + Q(-0.12, 0.12),
          Q(-0.7, 0.7),
          Q(-0.25, 0.55),
          Q(-0.7, 0.7),
          Q(0.05, 0.11),
          i * Q(0.75, 1.25),
          0.01,
          r.r * 4.2,
          r.g * 4.6,
          r.b * 5.8,
          0.9,
          1,
          0,
        );
    }
    electricImpact(e, t, n, r, i) {
      this.flash(e, t, n, r, i ? 7 : 4.5, i ? 6 : 3.8, i ? 0.15 : 0.1);
      let a = i ? 12 : 7;
      for (let i = 0; i < a; i++) {
        let a = Math.random() * 6.28,
          o = Q(2.2, 6.5);
        this.glow.emit(
          e,
          t,
          n,
          Math.cos(a) * o,
          Q(-0.4, 3.2),
          Math.sin(a) * o,
          Q(0.07, 0.16),
          Q(0.1, 0.2),
          0.01,
          r.r * 4.5,
          r.g * 5,
          r.b * 6,
          1,
          2,
          3,
        );
      }
    }
    impact(e, t, n, r, i) {
      for (let a = 0; a < i; a++) {
        let i = Math.random() * 6.28,
          a = Q(1.5, 5);
        this.glow.emit(
          e,
          t,
          n,
          Math.cos(i) * a,
          Q(0.5, 3.5),
          Math.sin(i) * a,
          Q(0.15, 0.35),
          0.15,
          0.02,
          r.r * 3.2,
          r.g * 3.2,
          r.b * 3.2,
          1,
          3,
          9,
        );
      }
      this.glow.emit(e, t, n, 0, 0, 0, 0.1, 0.7, 0.2, r.r * 1.6, r.g * 1.6, r.b * 1.6, 0.8, 0, 0);
    }
    burst(e, t, n, r, i, a) {
      for (let o = 0; o < i; o++) {
        let i = Math.random() * 6.28,
          o = Q(0.4, 1) * a;
        this.glow.emit(
          e,
          t,
          n,
          Math.cos(i) * o,
          Q(1, 4.5),
          Math.sin(i) * o,
          Q(0.35, 0.7),
          0.2,
          0.03,
          r.r * 4,
          r.g * 4,
          r.b * 4,
          1,
          2.2,
          8,
        );
      }
    }
    muzzle(e, t, n, r, i, a, o) {
      (this.flash(e + r * 0.2, t + 0.1, n + i * 0.2, a, 6.5 * o, 5.5, 0.09),
        this.glow.emit(
          e + r * 0.1,
          t,
          n + i * 0.1,
          r * 1.5,
          0,
          i * 1.5,
          0.07,
          0.95 * o,
          0.3,
          a.r * 3,
          a.g * 3,
          a.b * 3,
          1,
          0,
          0,
        ));
      for (let o = 0; o < 5; o++) {
        let o = 0.5,
          s = r * Q(4, 9) + Q(-0.5, o) * 3,
          c = i * Q(4, 9) + Q(-0.5, o) * 3;
        this.glow.emit(e, t, n, s, Q(-0.5, 1.5), c, Q(0.08, 0.2), 0.13, 0.02, a.r * 5, a.g * 5, a.b * 5, 1, 4, 3);
      }
      this.smoke.emit(
        e + r * 0.15,
        t + 0.05,
        n + i * 0.15,
        r * 0.9,
        0.5,
        i * 0.9,
        0.5,
        0.25,
        0.7,
        0.8,
        0.8,
        0.8,
        0.3,
        1.5,
        -0.3,
      );
    }
    dust(e, t, n, r) {
      for (let i = 0; i < n; i++) {
        let n = Math.random() * 6.28,
          i = Q(0.4, 1) * r;
        this.smoke.emit(
          e + Math.cos(n) * 0.2,
          0.12,
          t + Math.sin(n) * 0.2,
          Math.cos(n) * i,
          Q(0.2, 0.9),
          Math.sin(n) * i,
          Q(0.5, 0.95),
          0.35,
          1.1,
          0.78,
          0.66,
          0.47,
          0.42,
          2.4,
          -0.2,
        );
      }
    }
    footDust(e, t) {
      this.smoke.emit(
        e + Q(-0.1, 0.1),
        0.06,
        t + Q(-0.1, 0.1),
        Q(-0.2, 0.2),
        0.35,
        Q(-0.2, 0.2),
        0.42,
        0.16,
        0.5,
        0.8,
        0.68,
        0.48,
        0.3,
        2,
        -0.1,
      );
    }
    leaves(e, t, n) {
      for (let r = 0; r < n; r++) {
        let n = Math.random() * 6.28;
        this.smoke.emit(
          e + Q(-0.3, 0.3),
          Q(0.3, 0.9),
          t + Q(-0.3, 0.3),
          Math.cos(n) * Q(0.6, 2.2),
          Q(1.2, 3),
          Math.sin(n) * Q(0.6, 2.2),
          Q(0.5, 0.9),
          0.17,
          0.1,
          0.3,
          0.72,
          0.22,
          0.95,
          1.6,
          6,
        );
      }
    }
    healPuff(e, t) {
      for (let n = 0; n < 5; n++)
        this.glow.emit(
          e + Q(-0.4, 0.4),
          Q(0.4, 1.2),
          t + Q(-0.4, 0.4),
          0,
          Q(0.8, 1.6),
          0,
          Q(0.4, 0.7),
          0.16,
          0.04,
          0.5,
          3.2,
          0.9,
          0.9,
          0.5,
          0,
        );
    }
    debris(e, t, n, r, i) {
      for (let a = 0; a < Math.min(i, this.debrisActiveCap); a++) {
        let i = this.debrisCursor;
        this.debrisCursor = (i + 1) % this.debrisActiveCap;
        let a = this.debrisData[i],
          o = Math.random() * 6.28,
          s = Q(1.2, 4.2);
        ((a.life = Q(1.6, 2.6)),
          (a.x = e + Q(-0.3, 0.3)),
          (a.y = t + Q(-0.2, 0.4)),
          (a.z = n + Q(-0.3, 0.3)),
          (a.vx = Math.cos(o) * s),
          (a.vy = Q(3, 7)),
          (a.vz = Math.sin(o) * s),
          (a.rx = Q(0, 6)),
          (a.ry = Q(0, 6)),
          (a.rz = Q(0, 6)),
          (a.wx = Q(-9, 9)),
          (a.wy = Q(-9, 9)),
          (a.wz = Q(-9, 9)),
          (a.s = Q(0.12, 0.27)),
          Ou.set(r).offsetHSL(0, 0, Q(-0.06, 0.06)),
          this.debrisMesh.setColorAt(i, Ou));
      }
      this.debrisMesh.instanceColor.needsUpdate = !0;
    }
    ring(e, t, n, r, i = 0.4, a = 3) {
      let o = this.rings[this.ringCursor];
      ((this.ringCursor = (this.ringCursor + 1) % this.rings.length),
        (o.t = 0),
        (o.T = i),
        (o.r = n),
        (o.mesh.visible = !0),
        o.mesh.position.set(e, 0.09, t),
        o.mesh.material.color.copy(r).multiplyScalar(a));
    }
    decal(e, t, n) {
      let r = this.decals[this.decalCursor];
      ((this.decalCursor = (this.decalCursor + 1) % this.decals.length),
        (r.life = 14),
        (r.mesh.visible = !0),
        r.mesh.position.set(e, 0.022 + this.decalCursor * 8e-4, t),
        (r.mesh.rotation.y = Math.random() * 6.28),
        r.mesh.scale.setScalar(n * 1.9));
    }
    explosion(e, t, n, r, i) {
      let a = i ? 46 : 24;
      (this.flash(e, 1.1, t, r, i ? 95 : 48, i ? 15 : 10, i ? 0.5 : 0.34),
        this.ring(e, t, n * 1.15, r, i ? 0.5 : 0.36),
        this.decal(e, t, n * 0.85),
        this.glow.emit(e, 0.6, t, 0, 0.5, 0, 0.22, n * 3.2, n * 0.8, r.r * 6, r.g * 5, r.b * 4, 1, 0, 0));
      for (let r = 0; r < a; r++) {
        let r = Math.random() * 6.28,
          i = Q(0.3, 1) * n * 4.2,
          a = Math.random();
        this.glow.emit(
          e,
          0.4,
          t,
          Math.cos(r) * i,
          Q(1, 6),
          Math.sin(r) * i,
          Q(0.3, 0.75),
          Q(0.25, 0.6),
          0.04,
          (1 + a) * 3.2,
          (0.4 + a * 0.6) * 3,
          0.75,
          1,
          2.6,
          6,
        );
      }
      for (let r = 0; r < (i ? 16 : 9); r++) {
        let r = Math.random() * 6.28,
          i = Q(0.2, 1) * n * 1.6;
        this.smoke.emit(
          e + Math.cos(r) * 0.3,
          Q(0.3, 0.9),
          t + Math.sin(r) * 0.3,
          Math.cos(r) * i,
          Q(0.8, 2.6),
          Math.sin(r) * i,
          Q(0.9, 1.7),
          n * 0.7,
          n * 1.9,
          0.22,
          0.2,
          0.2,
          0.55,
          1.6,
          -0.5,
        );
      }
      this.dust(e, t, i ? 14 : 8, n * 2.2);
    }
    slam(e, t, n, r) {
      (this.flash(e, 0.9, t, r, 40, 10, 0.32),
        this.ring(e, t, n * 1.2, r, 0.42, 2.4),
        this.decal(e, t, n * 0.6),
        this.dust(e, t, 22, n * 3.2));
      for (let n = 0; n < 18; n++) {
        let n = Math.random() * 6.28,
          i = Q(2, 7);
        this.glow.emit(
          e,
          0.2,
          t,
          Math.cos(n) * i,
          Q(1, 4),
          Math.sin(n) * i,
          Q(0.25, 0.5),
          0.2,
          0.03,
          r.r * 4,
          r.g * 4,
          r.b * 4,
          1,
          2.5,
          8,
        );
      }
    }
    defeat(e, t, n) {
      (this.flash(e, 1, t, n, 26, 8, 0.4), this.ring(e, t, 1.6, n, 0.45, 2.2), this.burst(e, 0.8, t, n, 26, 5));
      for (let n = 0; n < 8; n++)
        this.smoke.emit(
          e + Q(-0.3, 0.3),
          Q(0.3, 1.2),
          t + Q(-0.3, 0.3),
          Q(-0.6, 0.6),
          Q(0.8, 2),
          Q(-0.6, 0.6),
          Q(0.7, 1.2),
          0.5,
          1.4,
          0.85,
          0.85,
          0.9,
          0.5,
          1.4,
          -0.3,
        );
    }
    update(e) {
      let t = this.game,
        n = t.lighting;
      if (t.pipeline.isWebGPU) {
        let r = this.fireflies.geometry.attributes.position.array;
        if (n.night > 0.01) {
          for (let i = 0; i < this.fireflyPhases.length; i++) {
            let a = this.fireflyPhases[i],
              o = i * 3;
            ((r[o] = this.fireflyBase[o] + Math.sin(t.elapsed * 0.6 + a) * 0.7 + Math.sin(t.elapsed * 1.3 + a * 2) * 0.25),
              (r[o + 1] = this.fireflyBase[o + 1] + Math.sin(t.elapsed * 0.9 + a * 1.7) * 0.3),
              (r[o + 2] = this.fireflyBase[o + 2] + Math.cos(t.elapsed * 0.5 + a * 1.3) * 0.7));
          }
          this.fireflies.geometry.attributes.position.needsUpdate = !0;
        }
        ((this.fireflyMat.opacity = n.night),
          this.smoke.material.color.setScalar(n.ambientLevel));
      } else {
        let r = t.pipeline.renderer.getDrawingBufferSize(this.drawingBufferSize).y / (2 * Math.tan((t.camera.fov * Math.PI) / 360));
        ((this.glow.material.uniforms.uScale.value = r),
          (this.smoke.material.uniforms.uScale.value = r),
          (this.smoke.material.uniforms.uDim.value = n.ambientLevel),
          (this.fireflyMat.uniforms.uScale.value = r),
          (this.fireflyMat.uniforms.uTime.value = t.elapsed),
          (this.fireflyMat.uniforms.uNight.value = n.night));
      }
      ((this.fireflies.visible = n.night > 0.01),
        this.glow.update(e),
        this.smoke.update(e));
      let flashCount = 0;
      for (let i = 0; i < this.flashes.length; i++) {
        let t = this.flashes[i];
        t.t += e;
        if (t.t < t.T) {
          let r = 1 - $c(t.t / t.T, 0, 1);
          n.addLight(t.x, t.y, t.z, t.color, t.intensity * r * r, t.distance);
          this.flashes[flashCount++] = t;
        } else this.flashPool.push(t);
      }
      this.flashes.length = flashCount;
      let i = !1;
      for (let t = 0; t < this.debrisActiveCap; t++) {
        let n = this.debrisData[t];
        if (n.life <= 0) continue;
        ((i = !0), (n.life -= e), (n.vy -= 19 * e), (n.x += n.vx * e), (n.y += n.vy * e), (n.z += n.vz * e));
        let r = n.s * 0.5;
        (n.y < r &&
          ((n.y = r), (n.vy *= -0.38), (n.vx *= 0.6), (n.vz *= 0.6), (n.wx *= 0.5), (n.wy *= 0.5), (n.wz *= 0.5)),
          (n.rx += n.wx * e),
          (n.ry += n.wy * e),
          (n.rz += n.wz * e));
        let a = n.life <= 0 ? 0 : n.s * $c(n.life / 0.4, 0, 1);
        (Du.set(n.rx, n.ry, n.rz),
          wu.setFromEuler(Du),
          Cu.compose(Tu.set(n.x, n.y, n.z), wu, Eu.set(a, a, a)),
          this.debrisMesh.setMatrixAt(t, Cu));
      }
      i && (this.debrisMesh.instanceMatrix.needsUpdate = !0);
      for (let t of this.decals)
        t.life <= 0 ||
          ((t.life -= e),
          (t.mesh.material.opacity = $c(t.life / 4, 0, 1) * 0.55),
          t.life <= 0 && (t.mesh.visible = !1));
      for (let t of this.rings) {
        if (!t.mesh.visible) continue;
        t.t += e;
        let n = $c(t.t / t.T, 0, 1),
          r = 1 - (1 - n) * (1 - n);
        (t.mesh.scale.setScalar(0.2 + r * t.r),
          (t.mesh.material.opacity = (1 - n) * 0.9),
          n >= 1 && (t.mesh.visible = !1));
      }
    }
  },
  Pu = `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4( position, 1.0 );
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`,
  Fu = `
  uniform float uTime;
  uniform float uHalf;
  uniform float uRound;
  uniform float uLayer;
  uniform float uAlpha;
  uniform float uAmbient;
  uniform float uGlow;
  varying vec3 vWorld;

  float hash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
  float noise( vec2 p ) {
    vec2 i = floor( p ); vec2 f = fract( p );
    vec2 u = f * f * ( 3.0 - 2.0 * f );
    return mix( mix( hash( i ), hash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( hash( i + vec2( 0.0, 1.0 ) ), hash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
  }
  float fbm( vec2 p ) {
    float v = 0.0; float a = 0.5;
    for ( int i = 0; i < 4; i ++ ) { v += a * noise( p ); p = p * 2.03 + 17.0; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 p = vWorld.xz;
    vec2 q = abs( p ) - vec2( uHalf - uRound );
    float sd = length( max( q, 0.0 ) ) + min( max( q.x, q.y ), 0.0 ) - uRound; // < 0 inside the safe zone
    vec2 flow = vec2( uTime * 0.11, - uTime * 0.07 ) * ( 1.0 + uLayer * 0.35 );
    float n = fbm( p * 0.33 + flow + uLayer * 9.7 );
    float n2 = fbm( p * 0.9 - flow * 1.7 + uLayer * 3.1 );
    float edge = sd + ( n - 0.5 ) * 1.9;
    float body = smoothstep( 0.0, 2.2, edge );
    if ( body <= 0.001 ) discard;
    float dens = body * mix( 0.5, 1.0, n ) * mix( 0.7, 1.0, n2 );
    float rim = smoothstep( 0.0, 0.5, edge ) * ( 1.0 - smoothstep( 0.5, 2.4, edge ) );
    vec3 deep = vec3( 0.05, 0.42, 0.12 );
    vec3 light = vec3( 0.38, 0.95, 0.3 );
    vec3 col = mix( deep, light, n * n2 * 1.6 ) * uAmbient;
    // three sheets stack, so the rim must stay near 1.0 after blending: any hotter and
    // bloom turns the whole front line into a white wall (it did, at night)
    col += vec3( 0.28, 1.45, 0.4 ) * rim * uGlow;
    gl_FragColor = vec4( col, clamp( dens * uAlpha + rim * 0.25, 0.0, 0.95 ) );
  }`,
  Iu = [0.34, 0.3, 0.26],
  Lu = class {
    constructor(e) {
      ((this.game = e),
        (this.half = Lc.gasStartHalf),
        (this.round = 5),
        (this.layers = []),
        (this.tickT = 0),
        (this.ticks = 0));
      if (this.game.pipeline.isWebGPU) this.buildWebGPUGas();
      else {
      let t = new yr(104, 104).rotateX(-Math.PI / 2);
      ([0.3, 0.72, 1.12].forEach((n, r) => {
        let i = new jr({
            uniforms: {
              uTime: { value: 0 },
              uHalf: { value: this.half },
              uRound: { value: this.round },
              uLayer: { value: r },
              uAlpha: { value: Iu[r] },
              uAmbient: { value: 1 },
              uGlow: { value: 1 },
            },
            vertexShader: Pu,
            fragmentShader: this.game.pipeline.quality.tier === 0 ? Fu.replace(`i < 4`, `i < 3`) : Fu,
            transparent: !0,
            depthWrite: !1,
          }),
          a = new Ln(t, i);
        ((a.position.y = n),
          (a.userData.gasLayer = r),
          (a.renderOrder = 4),
          (a.userData.noAO = !0),
          (a.frustumCulled = !1),
          e.scene.add(a),
          this.layers.push(a));
      }));
      }
      this.reset();
    }
    setQuality(e) {
      if (this.game.pipeline.isWebGPU) return;
      let t = e === 0 ? Fu.replace(`i < 4`, `i < 3`) : Fu;
      for (let n of this.layers)
        n.material.fragmentShader !== t && ((n.material.fragmentShader = t), (n.material.needsUpdate = !0));
    }
    buildWebGPUGas() {
      let e = new fr(1, 1, 1),
        t = new Tn({ color: 3539004, transparent: !0, opacity: 0.2, depthWrite: !1 });
      for (let n = 0; n < 4; n++) {
        let r = new Ln(e, t);
        ((r.visible = !1),
          (r.renderOrder = 4),
          (r.userData.noAO = !0),
          (r.userData.gasEdge = n),
          this.game.scene.add(r),
          this.layers.push(r));
      }
    }
    reset() {
      ((this.half = Lc.gasStartHalf), (this.tickT = 0), (this.ticks = 0), (this.active = !1));
      for (let e of this.layers) e.visible = !1;
    }
    depthAt(e, t) {
      let n = Math.abs(e) - (this.half - this.round),
        r = Math.abs(t) - (this.half - this.round);
      return Math.hypot(Math.max(n, 0), Math.max(r, 0)) + Math.min(Math.max(n, r), 0) - this.round;
    }
    update(e, t, applyDamage = !0) {
      let n = this.game,
        r = $c((t - Lc.gasDelay) / Lc.gasDuration, 0, 1);
      ((this.active = t > Lc.gasDelay - 6),
        (this.half = el(Lc.gasStartHalf, Lc.gasEndHalf, r)),
        (this.round = el(5, 2.2, r)));
      let i = tl(Lc.gasDelay - 6, Lc.gasDelay, t);
      if (
        (this.layers.forEach((e, t) => {
          e.visible = this.active;
          if (n.pipeline.isWebGPU) {
            let r = 22,
              a = Math.max(0.5, r - this.half),
              o = e.userData.gasEdge;
            e.material.opacity = (0.14 + (0.5 + Math.sin(n.elapsed * 1.7 + o) * 0.5) * 0.1) * i;
            o === 0
              ? (e.position.set(0, 1.4, (r + this.half) * 0.5), e.scale.set(44, 2.8, a))
              : o === 1
                ? (e.position.set(0, 1.4, -(r + this.half) * 0.5), e.scale.set(44, 2.8, a))
                : o === 2
                  ? (e.position.set((r + this.half) * 0.5, 1.4, 0), e.scale.set(a, 2.8, this.half * 2))
                  : (e.position.set(-(r + this.half) * 0.5, 1.4, 0), e.scale.set(a, 2.8, this.half * 2));
            return;
          }
          let layerIndex = e.userData.gasLayer ?? t,
            r = e.material.uniforms;
          ((r.uTime.value = n.elapsed), (r.uHalf.value = this.half), (r.uRound.value = this.round));
          e.visible = this.active && !(n.pipeline.quality.tier === 0 && layerIndex === 1);
          let a = $c((n.lighting.ambientLevel - 0.36) / 0.64, 0, 1);
          ((r.uAmbient.value = el(0.2, 1, a)),
            (r.uGlow.value = (0.55 + n.lighting.night * 0.3) * i),
            (r.uAlpha.value = Iu[layerIndex] * i));
        }),
        applyDamage && !(t < Lc.gasDelay) && ((this.tickT += e), this.tickT >= 1))
      ) {
        (--this.tickT, this.ticks++);
        let e = 600 + Math.min(this.ticks, 60) * 25;
        for (let t of n.brawlers)
          t.alive &&
            !t.airborne &&
            this.depthAt(t.x, t.z) > 0.35 &&
            (t.takeDamage(e, null, !0), t.isPlayer && n.audio.play(`gas`));
      }
    }
  };
