var  Ru = 9,
  zu = 4.5,
  Bu = 2.4,
  Vu = class {
    constructor(e, t) {
      ((this.game = e),
        (this.b = t),
        (this.thinkT = Q(0, 0.35)),
        (this.state = `loot`),
        (this.target = null),
        (this.box = null),
        (this.goal = null),
        (this.path = null),
        (this.pathI = 0),
        (this.repathT = 0),
        (this.strafeDir = Math.random() < 0.5 ? 1 : -1),
        (this.strafeT = Q(0.6, 1.6)),
        (this.reactT = 0),
        (this.shootT = Q(0.4, 1)),
        (this.stuckT = 0),
        (this.lastX = t.x),
        (this.lastZ = t.z),
        (this.jitterT = 0),
        (this.jx = 0),
        (this.jz = 0),
        (this.wanderT = 0),
        // Acquire an opponent immediately after spawn. Once a target is
        // locked, pathfinding can lead the bot through map cover instead of
        // waiting for line-of-sight or for the player to approach.
        (this.spawnHuntT = 12));
      let [n, r] = e.difficulty.skill;
      ((this.skill = Q(n, r)), (this.thrower = t.def.attack.kind === `lob`));
    }
    canSee(e, t) {
      let gameplay = this.game.world.biomeGameplay,
        vision = gameplay?.vision ?? 1,
        concealment = gameplay?.bushConcealment ?? 1;
      return t > Ru * vision || (e.inBush && t > Bu * concealment && e.revealT <= 0)
        ? !1
        : this.thrower && t < 8 * vision
          ? !0
          : t < 2.5 * vision || this.game.world.hasLineOfSight(this.b.x, this.b.z, e.x, e.z);
    }
    seesBox(e) {
      let t = this.game.world.raycast(this.b.x, this.b.z, e.x, e.z);
      return !t || (t.tx === e.tx && t.ty === e.ty);
    }
    think() {
      let { b: e, game: t } = this,
        n = t.world,
        r = t.gas,
        a = null,
        o = 1 / 0,
        bestScore = 1 / 0;
      for (let n of t.brawlers) {
        if (n === e || !n.alive || n.airborne) continue;
        let r = sl(e.x, e.z, n.x, n.z),
          i = e.lastAttacker === n && t.elapsed - e.lastHitTime < 4;
          if (t.modeName !== `deathmatch` && !n.isPlayer && !i && r > zu) continue;
          if (t.modeName !== `deathmatch` && n.isPlayer && !i && this.target !== n && this.spawnHuntT <= 0) {
            let e = t.difficulty;
            if (
              r > e.engage ||
              (t.brains.reduce((e, t) => e + (t !== this && t.b.alive && t.target === n ? 1 : 0), 0) >= e.hunters &&
                r > 2.5)
            )
              continue;
          }
        let score = r * (0.62 + (n.hp / n.maxHp) * 0.38) * (i ? 0.7 : 1),
          targetVisible = this.canSee(n, r) ||
            ((this.spawnHuntT > 0 || t.modeName === `deathmatch` || n === this.target) && !n.inBush);
        score < bestScore && targetVisible && ((a = n), (o = r), (bestScore = score));
      }
      (a !== this.target && (this.reactT = Q(0.22, 0.5) * (2 - this.skill) * t.difficulty.react), (this.target = a));
      let s = r.active ? r.depthAt(e.x, e.z) : -99,
        c = null,
        l;
      if (s > -1.6) {
        l = `escape`;
        let t = Math.max(0, r.half - 4.5),
          i = Math.max(Math.abs(e.x), Math.abs(e.z), 0.001),
          a = Math.min(1, t / i);
        c = n.nearestOpen(e.x * a, e.z * a);
      } else if (a) {
        let t = e.hp / e.maxHp,
          i = a.hp / a.maxHp;
        if (t < 0.42 && i > t + 0.05 && o < 9) {
          l = `flee`;
          let t = (e.x - a.x) / (o || 1),
            i = (e.z - a.z) / (o || 1),
            s = e.x + t * 6 - e.x * 0.15,
            u = e.z + i * 6 - e.z * 0.15,
            d = Math.max(2, r.half - 3);
          ((s = $c(s, -d, d)), (u = $c(u, -d, d)), (c = n.nearestOpen(s, u)));
        } else l = `fight`;
      } else {
        let i = null,
          a = 9;
        if (t.modeName !== `deathmatch` || e.cubes < t.mode.powerUpCap) {
          for (let n of t.combat.cubes) {
            let t = sl(e.x, e.z, n.x, n.z);
            t < a && r.depthAt(n.x, n.z) < -0.5 && ((i = n), (a = t));
          }
        }
        if (i) ((l = `cube`), (c = { x: i.x, z: i.z }));
        else {
          let i = null,
            a = 26;
          for (let n of t.combat.boxes) {
            if (!n.alive || n.skipBy === e.id) continue;
            let t = sl(e.x, e.z, n.x, n.z);
            t < a && r.depthAt(n.x, n.z) < -2 && ((i = n), (a = t));
          }
          if (((this.box = i), i)) ((l = `box`), (c = { x: i.x, z: i.z }));
          else {
            if (
              ((l = `wander`),
              (this.wanderT -= 0.3),
              !this.goal || this.wanderT <= 0 || sl(e.x, e.z, this.goal.x, this.goal.z) < 1.2)
            ) {
              let e = Math.max(2, Math.min(r.half - 4, 17));
              ((this.wanderGoal = n.nearestOpen(Q(-e, e), Q(-e, e))), (this.wanderT = 7));
            }
            c = this.wanderGoal;
          }
        }
      }
      (l !== `box` && (this.box = null),
        (this.state = l),
        (this.repathT -= 0.3),
        c
          ? (!this.goal || sl(c.x, c.z, this.goal.x, this.goal.z) > 1.4 || this.repathT <= 0 || !this.path) &&
            this.planTo(c)
          : ((this.goal = null), (this.path = null)));
    }
    planTo(e) {
      let { b: t, game: n } = this,
        r = n.world,
        i = n.gas;
      ((this.goal = e), (this.repathT = 1.3));
      let a = i.active ? (e, t) => (i.depthAt(r.center(e), r.center(t)) > -0.5 ? 6 : 0) : null;
      ((this.path = r.findPath(r.toTile(t.x), r.toTile(t.z), r.toTile(e.x), r.toTile(e.z), a)),
        (this.pathI = 0),
        !this.path && this.box && ((this.box.skipBy = t.id), (this.box = null)));
    }
    followPath() {
      let { b: e, game: t } = this;
      if (!this.path || this.pathI >= this.path.length) return [0, 0];
      let n = t.world,
        [r, i] = this.path[this.pathI],
        a = n.center(r),
        o = n.center(i);
      if (sl(e.x, e.z, a, o) < 0.36) {
        if ((this.pathI++, this.pathI >= this.path.length)) return [0, 0];
        (([r, i] = this.path[this.pathI]), (a = n.center(r)), (o = n.center(i)));
      }
      let s = sl(e.x, e.z, a, o) || 1;
      return [(a - e.x) / s, (o - e.z) / s];
    }
    aimAt(e, t, n, r, i) {
      let { b: a } = this,
        o = sl(a.x, a.z, e, t),
        s = i.kind === `lob` ? i.flight + i.fuse * 0.7 : o / (i.speed || 14),
        c = 0.8 * this.skill,
        l = e + n * s * c,
        u = t + r * s * c,
        d = (Math.random() - 0.5) * 2 * (0.05 + (1 - this.skill) * 0.3),
        f = Math.atan2(l - a.x, u - a.z) + d,
        p = sl(a.x, a.z, l, u);
      return { dx: Math.sin(f), dz: Math.cos(f), x: a.x + Math.sin(f) * p, z: a.z + Math.cos(f) * p };
    }
    avoidDanger(e, t) {
      let n = this.b,
        r = this.game.combat,
        i = 0,
        a = 0,
        o = 0;
      for (let e of r.bullets) {
        if (!e.alive || e.owner === n) continue;
        let t = n.x - e.x,
          r = n.z - e.z,
          s = t * e.dx + r * e.dz,
          c = Math.abs(t * e.dz - r * e.dx);
        if (s > 0 && s < 5.2 && c < 1.15 + e.radius) {
          let l = t * e.dz - r * e.dx >= 0 ? 1 : -1,
            u = (1 - s / 5.2) * (1.25 - Math.min(1, c / 1.25));
          ((i += -e.dz * l * u), (a += e.dx * l * u), (o += u));
        }
      }
      for (let e of r.bombs) {
        let t = e.landed ? e.slot.group.position.x : e.tx,
          r = e.landed ? e.slot.group.position.z : e.tz,
          s = n.x - t,
          c = n.z - r,
          l = Math.hypot(s, c) || 1,
          u = e.a.blast + 1.2;
        l < u && ((i += (s / l) * (u - l)), (a += (c / l) * (u - l)), (o += u - l));
      }
      if (o <= 0) return [e, t];
      let s = (this.game.difficulty.dodge || 0.4) * (0.45 + this.skill * 0.55);
      return [e * (1 - s) + i * s, t * (1 - s) + a * s];
    }
    tryBasicAttack(dx, dz, x, z) {
      const b = this.b;
      if (b.def.id !== `syafiah`) return b.attack(dx, dz, x, z);
      if (!b.canAct() || (b.usesAmmo && b.ammo < 1) || b.fireCooldown > 0 || b.burst) return !1;
      let distance = Math.hypot(x - b.x, z - b.z),
        quick = distance < 4.6 || !!b.game.combat.incomingBullet(b, 0.4),
        goal = quick ? 0.32 : b.def.attack.chargeTime;
      this.drawTime = Math.min(goal, (this.drawTime || 0) + this.drawDt);
      b.isCharging = !0;
      b.chargeLevel = Math.min(1, this.drawTime / b.def.attack.chargeTime);
      b.aimAngle = Math.atan2(dx, dz);
      b.aimHold = 0.15;
      if (this.drawTime < goal) return !1;
      const fired = b.attack(dx, dz, x, z, this.drawTime);
      this.drawTime = 0;
      return fired;
    }
    update(e) {
      let { b: t, game: n } = this;
      this.drawDt = e;
      t.isCharging = !1;
      t.chargeLevel = 0;
      if (!t.alive) return;
      if (n.state === `countdown`) {
        t.moveX = t.moveZ = 0;
        return;
      }
      ((this.thinkT -= e),
        (this.spawnHuntT = Math.max(0, this.spawnHuntT - e)),
        this.thinkT <= 0 && ((this.thinkT = 0.3), this.think()),
        (this.reactT = Math.max(0, this.reactT - e)),
        (this.shootT -= e));
      let r = n.world,
        i = t.def.attack,
        a = 0,
        o = 0,
        s = this.target && this.target.alive ? this.target : null;
      if ((t.def.super.kind === `parry` || t.def.super.kind === `iaido`) && t.superReady && this.shootT <= 0 && t.spawnT <= 0) {
        let bullet = n.combat.incomingBullet(t, t.def.super.guardDuration || t.def.super.duration);
        if (bullet) {
          let dx = -bullet.dx,
            dz = -bullet.dz,
            range = t.def.super.dashRange || t.def.super.range || 2;
          t.useSuper(dx, dz, t.x + dx * range, t.z + dz * range) && (this.shootT = Q(0.45, 0.7));
        }
      }
      if (this.state === `fight` && s) {
        let n = sl(t.x, t.z, s.x, s.z) || 0.001;
        if (!(this.thrower || r.hasLineOfSight(t.x, t.z, s.x, s.z)))
          ((!this.path || this.pathI >= this.path.length) && this.planTo({ x: s.x, z: s.z }),
            ([a, o] = this.followPath()));
        else {
          let r = (s.x - t.x) / n,
            i = (s.z - t.z) / n,
            c = t.def.preferred,
            l = 0;
          (n > c + 0.8 ? (l = 1) : n < c - 1.2 && (l = -1),
            t.usesAmmo && t.ammo < 0.8 && n < c + 2.5 && (l = -1),
            (this.strafeT -= e),
            this.strafeT <= 0 && ((this.strafeT = Q(0.5, 1.5)), (this.strafeDir *= -1)));
          let u = c < 2.5 ? 0.25 : 0.85,
            steadyAim = t.def.id === `ace` && n > 4.5 && n < t.def.attack.range * 0.85 && !this.game.combat.incomingBullet(t, 0.45);
          steadyAim
            ? ((a = 0), (o = 0))
            : ((a = r * l + -i * this.strafeDir * u), (o = i * l + r * this.strafeDir * u));
        }
      } else
        this.state === `box` && this.box && this.box.alive
          ? (sl(t.x, t.z, this.box.x, this.box.z) > Math.min(i.range * 0.7, 5) || !this.seesBox(this.box)) &&
            ([a, o] = this.followPath())
          : ([a, o] = this.followPath());
      if (((this.stuckT += e), this.stuckT > 0.6)) {
        let e = sl(t.x, t.z, this.lastX, this.lastZ);
        if ((a || o) && e < 0.14) {
          this.jitterT = 0.4;
          let e = Math.random() * 6.28;
          ((this.jx = Math.cos(e)), (this.jz = Math.sin(e)), (this.strafeDir *= -1), (this.repathT = 0));
        }
        ((this.stuckT = 0), (this.lastX = t.x), (this.lastZ = t.z));
      }
      this.jitterT > 0 && ((this.jitterT -= e), (a = this.jx), (o = this.jz));
      (([a, o] = this.avoidDanger(a, o)));
      if (t.flickerReady && (n.combat.incomingBullet(t, 0.28) || (s && sl(t.x, t.z, s.x, s.z) < 2.8))) {
        let flickerX = a,
          flickerZ = o;
        if (Math.hypot(flickerX, flickerZ) < 0.08 && s) {
          flickerX = t.x - s.x;
          flickerZ = t.z - s.z;
        }
        t.useFlicker(flickerX, flickerZ) && (this.shootT = Math.max(this.shootT, 0.28));
      }
      let c = Math.hypot(a, o);
      if (((t.moveX = c > 0.01 ? a / c : 0), (t.moveZ = c > 0.01 ? o / c : 0), s && this.reactT <= 0 && !s.airborne)) {
        let e = sl(t.x, t.z, s.x, s.z),
          a = this.thrower ? e < i.range : r.hasLineOfSight(t.x, t.z, s.x, s.z),
          superDef = t.def.super,
          superDistance = superDef.kind === `arrow-shower` ? e < superDef.range : e < (superDef.range || 0) * 0.9;
        if (superDef.kind === `arrow-shower` && superDistance && t.superReady && this.shootT <= 0) {
          let lead = superDef.warningDelay + 0.22,
            x = s.x + s.vel.x * lead,
            z = s.z + s.vel.y * lead,
            cluster = 0;
          for (let other of n.brawlers)
            if (other !== t && other.alive && !other.hidden && !other.airborne && Math.hypot(other.x + other.vel.x * lead - x, other.z + other.vel.y * lead - z) <= superDef.areaRadius)
              cluster++;
          if ((cluster >= 2 || e < 6.5) && Math.random() < 0.65) {
            let dx = x - t.x,
              dz = z - t.z,
              length = Math.hypot(dx, dz) || 1,
              scale = Math.min(1, superDef.range / length);
            ((x = t.x + dx * scale), (z = t.z + dz * scale));
            length = Math.hypot(x - t.x, z - t.z) || 1;
            t.useSuper((x - t.x) / length, (z - t.z) / length, x, z) && (this.shootT = Q(0.65, 0.9));
          }
        }
        if (a && superDef.kind !== `parry` && superDef.kind !== `arrow-shower` && t.superReady && this.shootT <= 0) {
          let n = t.def.super,
            r = n.kind === `spread` ? 5 : n.kind === `leap` ? n.range : n.range * 0.9,
            i = n.kind === `leap` ? 2.5 : 0;
          if (e < r && e > i && Math.random() < 0.6) {
            let e = this.aimAt(s.x, s.z, s.vel.x, s.vel.y, n);
            let dashDistance = Math.min(n.range, sl(t.x, t.z, e.x, e.z)),
              blockedDash = n.kind === `dash` && this.game.world.raycast(t.x, t.z, t.x + e.dx * dashDistance, t.z + e.dz * dashDistance);
            if (!blockedDash || blockedDash.dist >= dashDistance - 0.8)
              t.useSuper(e.dx, e.dz, e.x, e.z) && (this.shootT = Q(0.4, 0.8));
          }
        }
        if (a && e < i.range * 0.95 && this.shootT <= 0 && (!t.usesAmmo || t.ammo >= 1)) {
          let e = this.aimAt(s.x, s.z, s.vel.x, s.vel.y, i);
          this.tryBasicAttack(e.dx, e.dz, e.x, e.z) &&
            (this.shootT = (t.def.id === `ello` ? 0.12 : Q(0.45, 1) + (t.usesAmmo && t.ammo < 1 ? 0.4 : 0)) * (s.isPlayer ? n.difficulty.cadence : 1));
        }
      } else if (this.state === `box` && this.box && this.box.alive && this.shootT <= 0 && (!t.usesAmmo || t.ammo >= 1)) {
        let e = sl(t.x, t.z, this.box.x, this.box.z);
        if (e < i.range * 0.85 && (this.thrower || this.seesBox(this.box))) {
          let n = (this.box.x - t.x) / (e || 1),
            r = (this.box.z - t.z) / (e || 1);
          this.tryBasicAttack(n, r, this.box.x, this.box.z) && (this.shootT = Q(0.35, 0.7));
        }
      }
      if (!t.isCharging) this.drawTime = 0;
    }
  },
  Hu = {
    w: `KeyW`,
    a: `KeyA`,
    s: `KeyS`,
    d: `KeyD`,
    e: `KeyE`,
    t: `KeyT`,
    p: `KeyP`,
    m: `KeyM`,
    " ": `Space`,
    spacebar: `Space`,
    escape: `Escape`,
    arrowleft: `ArrowLeft`,
    arrowright: `ArrowRight`,
    arrowup: `ArrowUp`,
    arrowdown: `ArrowDown`,
  },
  Uu = (e) => e.code || Hu[(e.key || ``).toLowerCase()] || ``,
  Wu = () => ({ id: null, ox: 0, oy: 0, x: 0, y: 0, mag: 0, moved: !1 }),
  Gu = class {
    constructor(e, t, aControl) {
      ((this.keys = new Set()),
        (this.ndcX = 0),
        (this.ndcY = 0),
        (this.fire = !1),
        (this.fireStartedAt = 0),
        (this.fireReleasedDuration = null),
        (this.superHeld = !1),
        (this.superReleased = !1),
        (this.flickerPressed = !1),
        (this.enabled = !0),
        (this.touchMode = !1),
        (this.onTouchMode = null),
        (this.lastTouch = -1e9),
        (this.sticks = { move: Wu(), aim: Wu(), super: Wu() }),
        (this.shots = []),
        (this.attackControl = aControl || null));
      let n = new Set([`Space`, `KeyE`]);
      (window.addEventListener(`keydown`, (e) => {
        if (e.repeat || (e.target && (e.target.tagName === `INPUT` || e.target.tagName === `SELECT`))) return;
        let t = Uu(e);
        (this.keys.add(t),
          n.has(t) && ((this.superHeld = !0), e.preventDefault()),
          (t === `ShiftLeft` || t === `ShiftRight`) && ((this.flickerPressed = !0), e.preventDefault()),
          t.startsWith(`Arrow`) && e.preventDefault());
      }),
        window.addEventListener(`keyup`, (e) => {
          let t = Uu(e);
          (this.keys.delete(t), n.has(t) && this.superHeld && ((this.superHeld = !1), (this.superReleased = !0)));
        }),
        window.addEventListener(`blur`, () => {
          (this.keys.clear(), this.cancelActions());
        }));
      let r = () => performance.now() - this.lastTouch < 900,
        i = (e) => {
          ((this.ndcX = (e.clientX / window.innerWidth) * 2 - 1),
            (this.ndcY = -(e.clientY / window.innerHeight) * 2 + 1));
        };
      (window.addEventListener(`mousemove`, (e) => {
        r() || i(e);
      }),
        e.addEventListener(`mousedown`, (e) => {
          r() ||
            (this.touchMode && this.setTouchMode(!1),
            i(e),
            e.button === 0 && ((this.fire = !0), (this.fireStartedAt = performance.now()), (this.fireReleasedDuration = null)),
            e.button === 2 && (this.superHeld = !0));
        }),
        window.addEventListener(`mouseup`, (e) => {
          (e.button === 0 &&
            ((this.fireStartedAt > 0 &&
              (this.fireReleasedDuration = Math.max(0, performance.now() - this.fireStartedAt) / 1000)),
            (this.fireStartedAt = 0),
            (this.fire = !1)),
            e.button === 2 && this.superHeld && ((this.superHeld = !1), (this.superReleased = !0)));
        }),
        e.addEventListener(`contextmenu`, (e) => e.preventDefault()));
      let a = (e, t) => {
          if (e.pointerType !== `touch`) return;
          ((this.lastTouch = performance.now()), this.touchMode || this.setTouchMode(!0));
          let r = document.body.classList.contains(`left-handed`),
            n =
              t === `super`
                ? this.sticks.super
                : e.clientX < window.innerWidth * 0.45
                  ? r
                    ? this.sticks.aim
                    : this.sticks.move
                  : r
                    ? this.sticks.move
                    : this.sticks.aim;
          n.id === null &&
            ((n.id = e.pointerId),
            (n.startedAt = performance.now()),
            (n.ox = e.clientX),
            (n.oy = e.clientY),
            (n.x = n.y = n.mag = 0),
            (n.moved = !1),
            e.preventDefault());
        },
        o = (e) => Object.values(this.sticks).find((t) => t.id === e.pointerId);
      (e.addEventListener(`pointerdown`, (e) => a(e, `field`)),
        aControl && aControl.addEventListener(`pointerdown`, (e) => a(e, `field`)),
        t &&
          (t.addEventListener(`pointerdown`, (e) => a(e, `super`)),
          t.addEventListener(`click`, () => {
            r() || this.shots.push({ kind: `super`, x: 0, y: 0, mag: 0, tap: !0, cancelled: !1 });
          })),
        window.addEventListener(`pointermove`, (e) => {
          if (e.pointerType !== `touch`) return;
          this.lastTouch = performance.now();
          let t = o(e);
          if (!t) return;
          let n = (e.clientX - t.ox) / 58,
            r = (e.clientY - t.oy) / 58,
            i = Math.hypot(n, r);
          (i > 1 && ((n /= i), (r /= i)),
            (t.x = n),
            (t.y = r),
            (t.mag = Math.min(1, i)),
            t.mag > 0.22 && (t.moved = !0));
        }));
      let s = (e) => {
        if (e.pointerType !== `touch`) return;
        this.lastTouch = performance.now();
        let t = o(e);
        t &&
          (t !== this.sticks.move &&
            e.type === `pointerup` &&
            this.shots.push({
              kind: t === this.sticks.super ? `super` : `attack`,
              x: t.x,
              y: t.y,
              mag: t.mag,
              held: Math.max(0, (performance.now() - t.startedAt) / 1000),
              tap: !t.moved,
              cancelled: t.moved && t.mag <= 0.22,
            }),
          this.resetStick(t));
      };
      (window.addEventListener(`pointerup`, s), window.addEventListener(`pointercancel`, s));
    }
    resetStick(e) {
      ((e.id = null), (e.x = e.y = e.mag = 0), (e.moved = !1));
    }
    setTouchMode(e) {
      if (this.touchMode !== e) {
        if (((this.touchMode = e), (this.fire = !1), !e)) for (let e of Object.values(this.sticks)) this.resetStick(e);
        this.onTouchMode && this.onTouchMode(e);
      }
    }
    axis() {
      let e = this.sticks.move;
      if (e.id !== null && e.mag > 0.22) {
        let t = Math.hypot(e.x, e.y) || 1;
        return { x: e.x / t, z: e.y / t };
      }
      let t = this.keys,
        n = 0,
        r = 0;
      ((t.has(`KeyA`) || t.has(`ArrowLeft`)) && --n,
        (t.has(`KeyD`) || t.has(`ArrowRight`)) && (n += 1),
        (t.has(`KeyW`) || t.has(`ArrowUp`)) && --r,
        (t.has(`KeyS`) || t.has(`ArrowDown`)) && (r += 1));
      let i = Math.hypot(n, r);
      return i > 0 ? { x: n / i, z: r / i } : { x: 0, z: 0 };
    }
    consumeSuperRelease() {
      let e = this.superReleased;
      return ((this.superReleased = !1), e);
    }
    consumeFlicker() {
      let e = this.flickerPressed;
      return ((this.flickerPressed = !1), e);
    }
    consumeFireRelease() {
      let e = this.fireReleasedDuration;
      return ((this.fireReleasedDuration = null), e);
    }
    cancelActions() {
      (this.keys.clear(),
        (this.fire = !1),
        (this.fireStartedAt = 0),
        (this.fireReleasedDuration = null),
        (this.superHeld = !1),
        (this.superReleased = !1),
        (this.flickerPressed = !1),
        (this.shots.length = 0));
      for (let e of Object.values(this.sticks)) this.resetStick(e);
    }
    takeShots() {
      if (this.shots.length === 0) return this.shots;
      let e = this.shots;
      return ((this.shots = []), e);
    }
  },
  Ku = new H(),
  $ = (e) => document.getElementById(e),
  qu = (e) => {
    let t = Math.floor(e) % 24,
      n = Math.floor((e - Math.floor(e)) * 60);
    return `${String(t).padStart(2, `0`)}:${String(n).padStart(2, `0`)}`;
  },
  Ju = (e) => (e >= 19.4 || e < 5.6 ? `🌙` : e >= 17.2 || e < 7.2 ? `🌇` : `☀️`),
  Yu = class {
    constructor(e) {
      ((this.game = e),
        (this.root = $(`hud`)),
        (this.fpsEl = $(`fps-counter`)),
        (this.overheadLayer = $(`overheads`)),
        (this.floaterLayer = $(`floaters`)),
        (this.overheads = new Map()),
        (this.boxBars = new Map()),
        (this.floaters = []));
      for (let e = 0; e < 36; e++) {
        let e = document.createElement(`div`);
        ((e.className = `floater`),
          (e.hidden = !0),
          this.floaterLayer.appendChild(e),
          this.floaters.push({ el: e, life: 0, x: 0, y: 0, z: 0, drift: 0 }));
      }
      ((this.floaterCursor = 0),
        (this.bannerT = 0),
        (this.hurt = 0),
        (this.selected = `dusty`),
        (this.lastLeft = -1),
        (this.lastClock = ``),
        (this.scoreboardT = 0),
        (this.lastDeathmatch = null),
        (this.lastDmClock = ``),
        (this.lastTimeLabel = ``),
        (this.lastLeaderboardKey = ``),
        (this.lastGasWarning = null),
        (this.lastKillLine = ``),
        (this.lastSuper = -1),
        (this.lastItemUi = []),
        (this.lastFlickerUi = ``),
        (this.statsT = 0),
        (this.frames = 0),
        (this.fps = 0),
        (this.touch = !1),
        (this.stickEls = { move: $(`stick-move`), aim: $(`stick-aim`) }),
        this.buildMenu(),
        this.buildSettings());
    }
    setTouchMode(e) {
      ((this.touch = e), document.body.classList.toggle(`touch`, e), (this.lastSuper = -1), (this.lastItemUi = []), (this.lastFlickerUi = ``));
    }
    updateSticks() {
      if (!this.touch) {
        document.body.classList.remove(`aiming`);
        return;
      }
      let e = this.game.input.sticks,
        t = window.innerWidth,
        n = window.innerHeight,
        attackBounds = this.attackControl?.getBoundingClientRect(),
        attackCenter = attackBounds
          ? [attackBounds.left + attackBounds.width / 2, attackBounds.top + attackBounds.height / 2]
          : [this.game.leftHanded ? 80 : t - 80, n - 80],
        r = {
          move: this.game.leftHanded
            ? [t - Math.max(96, t * 0.14), n - 118]
            : [Math.max(96, t * 0.14), n - 118],
          aim: attackCenter,
        };
      document.body.classList.toggle(`aiming`, e.aim.id !== null);
      for (let t of [`move`, `aim`]) {
        let n = e[t],
          i = this.stickEls[t];
        if (!i) continue;
        let a = n.id !== null,
          o = a ? n.ox : r[t][0],
          s = a ? n.oy : r[t][1];
        ((i.style.transform = `translate3d(${o.toFixed(1)}px, ${s.toFixed(1)}px, 0)`),
          i.classList.toggle(`on`, a),
          (i.firstElementChild.style.transform = `translate(${(n.x * 58).toFixed(1)}px, ${(n.y * 58).toFixed(1)}px)`));
      }
    }
    buildMenu() {
      let e = $(`cards`),
        t = { dusty: `💥`, ace: `🎯`, fuse: `💣`, titan: `🥊`, volt: `⚡`, naka: `✥`, ello: `🗡️`, syafiah: `🏹` },
        n = (label, value) =>
          `<div class="stat"><span>${label}</span><i><b style="width:${Math.round((value / 5) * 100)}%"></b></i></div>`;
      let modeDescriptions = {
        classic: `Last brawler standing. Poison gas closes in.`,
        blitz: `A faster survival round with less time to loot.`,
        deathmatch: `50 KOs or 5:00 · power-up cap lvl 10 · respawn in 5s · shield for 2s.`,
      };
      let roleById = { naka: `Ninja`, ello: `Samurai`, syafiah: `Archer` };
      let weaponById = { naka: `✥ Shuriken`, ello: `🗡️ Katana`, syafiah: `🏹 Bow` };
      for (let [t, n] of Object.entries(MATCH_MODES)) {
        let r = document.createElement(`button`);
        ((r.type = `button`),
          (r.className = `choice-card`),
          (r.dataset.mode = t),
          (r.innerHTML = `<strong>${n.label}</strong><small>${modeDescriptions[t] || `Choose this game mode.`}</small>`),
          r.setAttribute(`aria-pressed`, String(t === this.game.modeName)),
          r.addEventListener(`click`, () => this.game.setMode(t)),
          $(`mode-cards`).appendChild(r));
      }
      for (let [t, n] of Object.entries(ARENA_VARIANTS)) {
        let r = document.createElement(`button`);
        ((r.type = `button`),
          (r.className = `choice-card`),
          (r.dataset.arena = t),
          (r.innerHTML = `<strong>${n.icon} ${n.label}</strong><small>${n.description}</small>`),
          r.setAttribute(`aria-pressed`, String(t === this.game.arenaName)),
          r.addEventListener(`click`, () => this.game.setArena(t)),
          $(`arena-cards`).appendChild(r));
      }
      for (let r of Object.values(Bc)) {
        let i = document.createElement(`div`);
        ((i.className = `card` + (r.id === this.selected ? ` on` : ``)),
          (i.dataset.id = r.id),
          (i.tabIndex = 0),
          i.setAttribute(`role`, `button`),
          i.setAttribute(`aria-pressed`, String(r.id === this.selected)));
        let a = `#` + r.palette.body.toString(16).padStart(6, `0`),
          o = `#` + r.palette.accent.toString(16).padStart(6, `0`),
          stats = r.stats || { durability: 3, agility: 3, damage: 3, range: 3 },
          role = r.role && r.role !== `undefined` ? r.role : roleById[r.id] || `Brawler`,
          weapon = weaponById[r.id];
        i.innerHTML = `<div class="swatch" style="background:linear-gradient(135deg, ${a}, ${o})">${t[r.id] || `★`}</div>
        <h2>${r.name}</h2><div class="role">${role}</div>${weapon ? `<div class="equipment">${weapon}</div>` : ``}<p>${r.blurb}</p>
        ${n(`DURABILITY`, stats.durability)}${n(`AGILITY`, stats.agility)}${n(`DAMAGE`, stats.damage)}${n(`RANGE`, stats.range)}
        <div class="passive"><b>PASSIVE</b> ${r.passive || `No passive`}</div>`;
        let l = () => {
          (this.game.audio.unlock(), this.game.audio.play(`click`), this.select(r.id));
        };
        (i.addEventListener(`click`, l),
          i.addEventListener(`keydown`, (e) => {
            (e.key === `Enter` || e.key === ` `) && (e.preventDefault(), l());
          }),
          e.appendChild(i));
      }
      ($(`play`).addEventListener(`click`, () => {
        (this.game.audio.unlock(), this.game.enterImmersive(), this.game.startMatch(this.selected));
      }),
        $(`again`).addEventListener(`click`, () => (this.game.requestNetworkRematch?.() || (this.game.enterImmersive(), this.game.startMatch(this.selected)))),
        $(`to-menu`).addEventListener(`click`, () => this.game.toMenu()));
      ($(`resume-match`).addEventListener(`click`, () => this.game.setPaused(!1)),
        $(`pause-to-menu`).addEventListener(`click`, () => this.game.toMenu()),
        $(`pause-menu`).addEventListener(`keydown`, (e) => {
          if (e.key !== `Tab`) return;
          let t = Array.from($(`pause-menu`).querySelectorAll(`button:not(:disabled)`)),
            n = t.indexOf(document.activeElement);
          t.length &&
            (n < 0 || (e.shiftKey && n === 0)
              ? (e.preventDefault(), t[e.shiftKey ? t.length - 1 : 0].focus())
              : !e.shiftKey && n === t.length - 1 && (e.preventDefault(), t[0].focus()));
        }));
    }
    select(e) {
      ((this.selected = e),
        document.querySelectorAll(`#cards .card`).forEach((t) => {
          let n = t.dataset.id === e;
          (t.classList.toggle(`on`, n), t.setAttribute(`aria-pressed`, String(n)));
        }));
    }
    selectArena(e) {
      document.querySelectorAll(`#arena-cards .choice-card`).forEach((t) => {
        let n = t.dataset.arena === e;
        (t.classList.toggle(`on`, n), t.setAttribute(`aria-pressed`, String(n)));
      });
    }
    showMenu(e) {
      ($(`menu`).classList.toggle(`open`, e),
        e && $(`result`).classList.remove(`open`),
        e && document.body.classList.remove(`deathmatch`),
        this.root.classList.toggle(`hidden`, e));
    }
    showPause(e, t = !0) {
      let n = $(`pause-menu`),
        r = !!e;
      if (r) {
        n.classList.contains(`open`) || (this.pauseFocusReturn = document.activeElement);
        (n.classList.add(`open`), n.setAttribute(`aria-hidden`, `false`), $(`settings`).classList.remove(`open`), $(`gear`).setAttribute(`aria-expanded`, `false`), $(`resume-match`).focus({ preventScroll: !0 }));
        return;
      }
      (n.classList.remove(`open`), n.setAttribute(`aria-hidden`, `true`));
      let i = this.pauseFocusReturn;
      if (((this.pauseFocusReturn = null), t && i && i !== document.body && i.isConnected && i.getClientRects().length))
        i.focus({ preventScroll: !0 });
      else if (n.contains(document.activeElement)) document.activeElement.blur();
    }
    showResult(e, t, n, r, i) {
      let a = $(`result-title`);
      (document.body.classList.remove(`playing`),
        document.body.classList.remove(`deathmatch`),
        (a.textContent = e ? `VICTORY!` : t <= 3 ? `SO CLOSE!` : `DEFEATED`),
        a.classList.toggle(`lose`, !e),
        ($(`result-rank`).textContent = `RANK #${t} of ${n}`),
        ($(`result-stats`).textContent = this.game.modeName === `deathmatch`
          ? `${r} KOs  ·  ${i} power cube${i === 1 ? `` : `s`}`
          : `${r} takedown${r === 1 ? `` : `s`}  ·  ${i} power cube${i === 1 ? `` : `s`}`),
        $(`result`).classList.add(`open`));
    }
    hideResult() {
      $(`result`).classList.remove(`open`);
    }
    buildSettings() {
      let e = this.game,
        t = $(`settings`);
      $(`gear`).addEventListener(`click`, () => {
        let e = t.classList.toggle(`open`);
        $(`gear`).setAttribute(`aria-expanded`, String(e));
      });
      let n = $(`quality-seg`);
      for (let [t, r] of Object.entries(Uc)) {
        let i = document.createElement(`button`);
        ((i.textContent = r.label),
          (i.dataset.q = t),
          i.addEventListener(`click`, () => e.setQuality(t, !0)),
          n.appendChild(i));
      }
      let r = $(`difficulty-seg`);
      for (let [t, n] of Object.entries(Hc)) {
        let i = document.createElement(`button`);
        ((i.textContent = n.label),
          (i.dataset.d = t),
          i.addEventListener(`click`, () => e.setDifficulty(t)),
          r.appendChild(i));
      }
      let i = $(`mode-seg`);
      for (let [t, n] of Object.entries(MATCH_MODES)) {
        let r = document.createElement(`button`);
        ((r.textContent = n.label),
          (r.dataset.mode = t),
          r.addEventListener(`click`, () => e.setMode(t)),
          i.appendChild(r));
      }
      ($(`auto-time`).addEventListener(`change`, (t) => e.setAutoTime(t.target.checked)),
        $(`time-slider`).addEventListener(`input`, (t) => {
          (e.setAutoTime(!1), e.lighting.setTime(parseFloat(t.target.value)));
        }),
        $(`tog-ao`).addEventListener(`change`, (t) => e.setToggle(`ao`, t.target.checked)),
        $(`tog-bloom`).addEventListener(`change`, (t) => e.setToggle(`bloom`, t.target.checked)),
        $(`tog-mute`).addEventListener(`change`, (t) => e.setMuted(t.target.checked)),
        $(`tog-haptics`).addEventListener(`change`, (t) => e.setHaptics(t.target.checked)),
        $(`tog-left`).addEventListener(`change`, (t) => e.setLeftHanded(t.target.checked)),
        $(`enter-fullscreen`).addEventListener(`click`, () => e.enterImmersive()),
        $(`fullscreen-btn`).addEventListener(`click`, () => e.enterImmersive()),
        $(`rotate-fullscreen`).addEventListener(`click`, () => e.enterImmersive()),
        $(`pause-btn`).addEventListener(`click`, () => e.setPaused(!e.paused)),
        $(`desktop-pause-btn`).addEventListener(`click`, () => e.setPaused(!e.paused)),
        $(`desktop-menu-btn`).addEventListener(`click`, () => e.toMenu()));
    }
    syncSettings() {
      let e = this.game;
      (document
        .querySelectorAll(`#quality-seg button`)
        .forEach((t) => t.classList.toggle(`on`, t.dataset.q === e.pipeline.qualityName)),
        document
          .querySelectorAll(`#difficulty-seg button`)
          .forEach((t) => t.classList.toggle(`on`, t.dataset.d === e.difficultyName)),
        document
          .querySelectorAll(`#mode-seg button`)
          .forEach((t) => {
            (t.classList.toggle(`on`, t.dataset.mode === e.modeName), (t.disabled = e.state !== `menu`));
          }),
        document.querySelectorAll(`#mode-cards .choice-card`).forEach((t) => {
          let n = t.dataset.mode === e.modeName;
          (t.classList.toggle(`on`, n), t.setAttribute(`aria-pressed`, String(n)));
        }),
        this.selectArena(e.arenaName),
        ($(`mode-badge`).textContent = e.mode.label.toUpperCase()),
        ($(`renderer-info`).textContent = `Renderer aktif: ${e.pipeline.isWebGPU ? `WebGPU (eksperimental)` : `WebGL2`}`),
        ($(`auto-time`).checked = e.autoTime),
        ($(`tog-ao`).checked = e.pipeline.toggles.ao),
        ($(`tog-ao`).disabled = e.pipeline.isWebGPU || !e.pipeline.quality.ao),
        ($(`tog-bloom`).checked = e.pipeline.toggles.bloom),
        ($(`tog-bloom`).disabled = e.pipeline.isWebGPU),
        ($(`tog-mute`).checked = e.audio.muted),
        ($(`tog-haptics`).checked = e.haptics),
        ($(`tog-left`).checked = e.leftHanded));
    }
    toast(e) {
      let t = $(`toast`);
      ((t.textContent = e),
        t.classList.add(`show`),
        clearTimeout(this.toastTimer),
        (this.toastTimer = setTimeout(() => t.classList.remove(`show`), 3200)));
    }
    reset() {
      for (let e of this.overheads.values()) e.root.remove();
      this.overheads.clear();
      for (let e of this.boxBars.values()) e.root.remove();
      this.boxBars.clear();
      for (let e of this.floaters) ((e.life = 0), (e.el.hidden = !0));
      (($(`feed`).innerHTML = ``),
        $(`dm-leaderboard-list`).replaceChildren(),
        (this.lastLeft = -1),
        (this.lastKillLine = ``),
        (this.lastLeaderboardKey = ``),
        (this.scoreboardT = 0),
        (this.lastClock = ``),
        (this.lastTimeLabel = ``),
        (this.lastGasWarning = null),
        (this.lastDeathmatch = null),
        (this.lastDmClock = ``),
        this.hideResult());
    }
    addBrawler(e) {
      let t = document.createElement(`div`);
      ((t.className = `oh` + (e.isPlayer ? ` me` : ``)),
        (t.innerHTML = `<div class="oh-name"><span class="n"></span><span class="oh-cubes"></span></div>
      <div class="oh-bar"><div class="oh-fill"></div><span class="oh-hp"></span></div>
      ${e.isPlayer && e.usesAmmo ? `<div class="oh-ammo">${Array.from({ length: e.maxAmmo || 3 }, () => `<i><b></b></i>`).join(``)}</div>` : ``}`),
        (t.querySelector(`.n`).textContent = e.name),
        this.overheadLayer.appendChild(t),
        this.overheads.set(e.id, {
          root: t,
          fill: t.querySelector(`.oh-fill`),
          hp: t.querySelector(`.oh-hp`),
          cubes: t.querySelector(`.oh-cubes`),
          ammo: [...t.querySelectorAll(`.oh-ammo b`)],
          lastHp: -1,
          lastMax: -1,
          lastCubes: -1,
          lastAmmo: new Array(e.maxAmmo || 3).fill(-1),
          shown: !0,
        }));
    }
    floatText(e, t, n, r, i) {
      let a = this.floaters[this.floaterCursor];
      ((this.floaterCursor = (this.floaterCursor + 1) % this.floaters.length),
        (a.life = 0.85),
        (a.x = e + (Math.random() - 0.5) * 0.5),
        (a.y = t),
        (a.z = n),
        (a.drift = (Math.random() - 0.5) * 30),
        (a.el.textContent = r),
        (a.el.className = `floater ` + i),
        (a.el.hidden = !1));
    }
    feed(e) {
      let t = $(`feed`),
        n = document.createElement(`div`);
      for (n.innerHTML = e, t.appendChild(n); t.children.length > 4;) t.firstChild.remove();
      setTimeout(() => n.remove(), 6e3);
    }
    banner(e, t = 1, n = !1) {
      let r = $(`banner`);
      ((r.textContent = e), r.classList.toggle(`small`, n), r.classList.add(`show`), (this.bannerT = t));
    }
    flashHurt(e) {
      this.hurt = $c(this.hurt + e / 1400, 0.35, 1);
    }
    project(e, t, n, r) {
      return (
        Ku.set(e, t, n).project(this.game.camera),
        (r.x = (Ku.x * 0.5 + 0.5) * window.innerWidth),
        (r.y = (-Ku.y * 0.5 + 0.5) * window.innerHeight),
        (r.on = Ku.z < 1 && Math.abs(Ku.x) < 1.15 && Math.abs(Ku.y) < 1.2),
        r
      );
    }
    syncTimeReadout(e) {
      let t = qu(e);
      t !== this.lastTimeLabel && ((this.lastTimeLabel = t), ($(`time-label`).textContent = t));
      let n = $(`time-slider`);
      let r = (Math.round(e / 0.05) * 0.05).toFixed(2);
      document.activeElement !== n && n.value !== r && (n.value = r);
    }
    updateMatchStatus(e) {
      let t = this.game,
        n = t.modeName === `deathmatch` && (t.state === `countdown` || t.state === `playing`),
        r = $(`dm-leaderboard`);
      this.lastDeathmatch !== n &&
        ((this.lastDeathmatch = n),
        n ? (this.lastDmClock = ``) : (this.lastClock = ``),
        document.body.classList.toggle(`deathmatch`, n),
        (r.hidden = !n));
      if (n) {
        let n = t.mode.targetKills,
          i = t.player ? t.player.kills : 0,
          a = Math.max(0, Math.ceil(t.mode.timeLimit - t.matchTime)),
          clock = `${Math.floor(a / 60)}:${String(a % 60).padStart(2, `0`)}`;
        (this.lastKillLine !== `${i}/${n}` &&
          ((this.lastKillLine = `${i}/${n}`), ($(`left-count`).innerHTML = `YOU <b>${i}/${n}</b>`)),
          clock !== this.lastDmClock && ((this.lastDmClock = clock), ($(`clock`).textContent = clock)),
          this.syncTimeReadout(t.lighting.time));
        this.scoreboardT -= e;
        if (this.scoreboardT <= 0) {
          this.scoreboardT = 0.35;
          let e = [...t.brawlers].sort((e, t) => t.kills - e.kills).slice(0, 5);
          t.player && !e.includes(t.player) && e.push(t.player);
          let key = e.map((e) => `${e.id}:${e.kills}`).join(`|`);
          if (key !== this.lastLeaderboardKey) {
            this.lastLeaderboardKey = key;
            let n = $(`dm-leaderboard-list`),
              r = document.createDocumentFragment();
            for (let t of e) {
              let e = document.createElement(`li`),
                i = document.createElement(`span`),
                a = document.createElement(`b`);
              ((e.className = t.isPlayer ? `you` : ``),
                (i.textContent = t.isPlayer ? `YOU` : t.name),
                (a.textContent = t.kills),
                e.append(i, a),
                r.appendChild(e));
            }
            n.replaceChildren(r);
          }
        }
        return;
      }
      let i = t.brawlers.reduce((e, t) => e + +!!t.alive, 0);
      i !== this.lastLeft && ((this.lastLeft = i), ($(`left-count`).innerHTML = `BRAWLERS LEFT <b>${i}</b>`));
      let a = `${Ju(t.lighting.time)} ${qu(t.lighting.time)}`;
      a !== this.lastClock &&
        ((this.lastClock = a), ($(`clock`).textContent = a));
      this.syncTimeReadout(t.lighting.time);
    }
    update(e) {
      let t = this.game,
        n = {};
      for (let e of t.brawlers) {
        let t = this.overheads.get(e.id);
        if (!t) continue;
        let r = e.alive && e.root.visible,
          i = r ? this.project(e.x, e.root.position.y + 1.72, e.z, n) : null,
          a = r && i.on;
        if ((a !== t.shown && ((t.root.hidden = !a), (t.shown = a)), !a)) continue;
        t.root.style.transform = `translate3d(${i.x.toFixed(1)}px, ${(i.y - 44).toFixed(1)}px, 0)`;
        let o = Math.max(0, Math.ceil(e.hp));
        if (
          ((o !== t.lastHp || e.maxHp !== t.lastMax) &&
            ((t.lastHp = o),
            (t.lastMax = e.maxHp),
            (t.fill.style.transform = `scaleX(${$c(o / e.maxHp, 0, 1).toFixed(3)})`),
            (t.hp.textContent = o)),
          e.cubes !== t.lastCubes &&
            ((t.lastCubes = e.cubes), (t.cubes.textContent = e.cubes > 0 ? `⚡${e.cubes}` : ``)),
          e.isPlayer && e.usesAmmo)
        )
          for (let n = 0; n < t.ammo.length; n++) {
            let r = $c(e.ammo - n + (Math.floor(e.ammo) === n ? e.reloadT : 0), 0, 1),
              i = Math.round(r * 40);
            i !== t.lastAmmo[n] &&
              ((t.lastAmmo[n] = i),
              (t.ammo[n].style.transform = `scaleX(${(i / 40).toFixed(3)})`),
              (t.ammo[n].style.opacity = r >= 1 ? `1` : `0.55`));
          }
      }
      for (let e of t.combat.boxes) {
        let t = this.boxBars.get(e);
        if (!(e.alive && e.hp < e.maxHp)) {
          t && (t.root.remove(), this.boxBars.delete(e));
          continue;
        }
        if (!t) {
          let n = document.createElement(`div`);
          ((n.className = `oh box`),
            (n.innerHTML = `<div class="oh-bar"><div class="oh-fill"></div><span class="oh-hp"></span></div>`),
            this.overheadLayer.appendChild(n),
            (t = { root: n, fill: n.querySelector(`.oh-fill`), hp: n.querySelector(`.oh-hp`), last: -1 }),
            this.boxBars.set(e, t));
        }
        let r = this.project(e.x, 1.35, e.z, n);
        ((t.root.hidden = !r.on),
          (t.root.style.transform = `translate3d(${r.x.toFixed(1)}px, ${(r.y - 20).toFixed(1)}px, 0)`));
        let i = Math.max(0, Math.ceil(e.hp));
        i !== t.last &&
          ((t.last = i),
          (t.fill.style.transform = `scaleX(${$c(i / e.maxHp, 0, 1).toFixed(3)})`),
          (t.hp.textContent = i));
      }
      for (let t of this.floaters) {
        if (t.life <= 0) continue;
        if (((t.life -= e), t.life <= 0)) {
          t.el.hidden = !0;
          continue;
        }
        let r = 1 - t.life / 0.85,
          i = this.project(t.x, t.y + r * 0.9, t.z, n),
          a = r < 0.15 ? 0.6 + (r / 0.15) * 0.6 : 1.2 - Math.min(1, (r - 0.15) * 1.5) * 0.2;
        ((t.el.style.transform = `translate3d(${(i.x + t.drift * r).toFixed(1)}px, ${i.y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${a.toFixed(2)})`),
          (t.el.style.opacity = r > 0.7 ? ((1 - r) / 0.3).toFixed(2) : `1`));
      }
      this.updateMatchStatus(e);
      let a = t.player,
        o = a ? Math.round(a.superCharge * 100) : 0;
      this.syncItemButton(a, 0);
      this.syncItemButton(a, 1);
      this.syncFlickerButton(a);
      if (o !== this.lastSuper) {
        this.lastSuper = o;
        let e = $(`super`);
        (e.style.setProperty(`--p`, o),
          e.classList.toggle(`ready`, o >= 100),
          ($(`super-core`).textContent = o >= 100 ? (this.touch ? `SUPER!` : `SPACE!`) : `SUPER ${o}%`));
      }
      (this.updateSticks(),
        this.bannerT > 0 && ((this.bannerT -= e), this.bannerT <= 0 && $(`banner`).classList.remove(`show`)),
        (this.hurt = Math.max(0, this.hurt - e * 2.2)),
        ($(`hurt`).style.opacity = this.hurt.toFixed(2)));
      let lowHealth = a && a.alive ? $c((0.4 - a.hp / a.maxHp) / 0.4, 0, 1) : 0;
      $(`low-health`).style.opacity = (lowHealth * (0.56 + Math.sin(t.elapsed * 4.5) * 0.1)).toFixed(2);
      let s = a && a.alive && t.gas.active && t.gas.depthAt(a.x, a.z) > 0.35;
      if (
        (s !== this.lastGasWarning &&
          ((this.lastGasWarning = s), ($(`gas-warn`).style.opacity = s ? `1` : `0`)),
        this.frames++,
        (this.statsT += e),
        this.statsT >= 0.5 &&
          ((this.fps = Math.round(this.frames / this.statsT)),
          (this.frames = 0),
          (this.statsT = 0),
          (this.fpsEl.textContent = `FPS ${this.fps}`),
          $(`settings`).classList.contains(`open`)))
      ) {
        let e = { render: t.frameStats },
          n = t.lighting,
          r = 0,
          i = 0,
          poolLit = 0;
        for (let e of n.lampSlots) {
          e.intensity > 0.01 && r++;
          e.castShadow && e.shadow.autoUpdate && i++;
        }
        for (let e of n.pool) e.intensity > 0 && poolLit++;
        let renderStats = e.render,
          updateMs = Number.isFinite(renderStats.updateMs) ? renderStats.updateMs.toFixed(1) : `—`,
          updateP95Ms = Number.isFinite(renderStats.updateP95Ms) ? renderStats.updateP95Ms.toFixed(1) : `—`,
          renderMs = Number.isFinite(renderStats.renderMs) ? renderStats.renderMs.toFixed(1) : `—`,
          renderP95Ms = Number.isFinite(renderStats.renderP95Ms) ? renderStats.renderP95Ms.toFixed(1) : `—`;
        $(`stats`).textContent =
          `${this.fps} fps   ${e.render.calls} draws   ${(e.render.triangles / 1e3).toFixed(0)}k tris\nCPU update ${updateMs} ms (p95 ${updateP95Ms})   CPU render ${renderMs} ms (p95 ${renderP95Ms})\nrenderer: ${t.pipeline.isWebGPU ? `WebGPU` : `WebGL2`}\nsun shadow ${n.mapSize}px over ${(n.shadowRadius * 2).toFixed(0)}m  (${t.pipeline.usingPCSS ? `PCSS` : `PCF`})\nlamps lit ${r}  casting ${i}   pool lights ${poolLit}/${n.pool.length}\n` +
          (t.userPickedQuality
            ? `quality: your choice`
            : `quality: auto  (night frame ${t.perf.benchMs ? t.perf.benchMs.toFixed(1) : `?`} ms at startup)`);
      }
    }
    syncItemButton(player, slot = 0) {
      slot = slot === 1 ? 1 : 0;
      let suffix = slot === 1 ? `-2` : ``,
        button = $(`item-action${suffix}`),
        item = player?.heldItems?.[slot] || (slot === 0 ? player?.heldItem : null) || null,
        canUse = !!item && this.game.state === `playing` && !this.game.paused && player.canUseHeldItem(slot),
        isFocusAmmo = item === `ammo` && [`ello`, `syafiah`].includes(player?.def?.id),
        signature = `${player?.def?.id || ``}:${item || ``}:${+canUse}:${this.touch ? `touch` : `keys`}`;
      if (signature === this.lastItemUi[slot]) return;
      this.lastItemUi[slot] = signature;
      let meta = {
        shield: { icon: `🛡️`, label: `SHIELD`, title: `Damage reduced by 65% for 3 seconds` },
        speed: { icon: `⚡`, label: `SPEED`, title: `Move 35% faster for 4 seconds` },
        heal: { icon: `✚`, label: `MEDKIT`, title: `Restore 35% of max health` },
        ammo: { icon: `↻`, label: `AMMO`, title: `Refill all ammo` },
        super: { icon: `✦`, label: `SUPER`, title: `Charge 25% of your Super meter` },
      }[item];
      if (isFocusAmmo) meta = { ...meta, label: `FOCUS`, title: `Focus charge` };
      (($(`item-icon${suffix}`).textContent = meta?.icon || `◇`),
        ($(`item-label${suffix}`).textContent = meta?.label || `ITEM ${slot + 1}`),
        ($(`item-key${suffix}`).textContent = this.touch ? `TAP` : slot === 0 ? `F` : `G`),
        (button.dataset.item = item || `empty`),
        button.classList.toggle(`has-item`, !!item),
        (button.disabled = !canUse),
        button.setAttribute(`aria-label`, item ? `Item ${slot + 1}: ${meta.label}. ${meta.title}${canUse ? `. Activate now` : `. Not available yet`}` : `Item ${slot + 1} empty`),
        (button.title = item ? `${meta.title} — ${this.touch ? `tap to use` : `press ${slot === 0 ? `F` : `G`} to use`}` : `Item ${slot + 1} empty`));
    }
    syncFlickerButton(player) {
      let button = $(`flicker-action`),
        remaining = Number.isFinite(player?.flickerRemaining) ? player.flickerRemaining : 30,
        charged = remaining <= 0.001,
        ready = !!player && player.alive && (player.spawnT || 0) <= 0 && !player.burst && player.canAct() && this.game.state === `playing` && !this.game.paused && charged,
        progress = Math.round($c(1 - remaining / 30, 0, 1) * 100),
        signature = `${ready}:${Math.ceil(remaining * 10)}:${this.touch}`;
      if (signature === this.lastFlickerUi) return;
      this.lastFlickerUi = signature;
      button.style.setProperty(`--p`, progress);
      button.classList.toggle(`ready`, ready);
      button.disabled = !ready;
      $(`flicker-label`).textContent = ready ? `FLICKER` : charged ? `WAIT` : `${Math.ceil(remaining)}s`;
      $(`flicker-key`).textContent = this.touch ? `TAP` : `SHIFT`;
      button.setAttribute(`aria-label`, ready ? `Flicker ready. ${this.touch ? `Tap` : `Press Shift`} to dodge` : charged ? `Flicker charged, but temporarily unavailable` : `Flicker recharging. ${Math.ceil(remaining)} seconds remaining`);
      button.title = ready ? `${this.touch ? `Tap` : `Press Shift`} to dodge` : charged ? `Flicker charged — wait until your current action or respawn protection ends` : `Flicker recharging — ${Math.ceil(remaining)}s`;
    }
  },
  Xu = class {
    constructor() {
      ((this.ctx = null),
        (this.master = null),
        (this.muted = !1),
        (this.listener = { x: 0, z: 0 }),
        (this.noiseBuffer = null),
        (this.lastPlayed = {}),
        (this.timeOffset = 0));
    }
    unlock() {
      if (this.ctx) {
        this.ctx.state === `suspended` && this.ctx.resume();
        return;
      }
      let e = window.AudioContext || window.webkitAudioContext;
      e && this.attach(new e());
    }
    attach(e) {
      ((this.ctx = e), (this.master = this.ctx.createGain()), (this.master.gain.value = this.muted ? 0 : 0.34));
      let t = this.ctx.createDynamicsCompressor();
      (this.master.connect(t), t.connect(this.ctx.destination));
      let n = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, n, n);
      let r = this.noiseBuffer.getChannelData(0);
      for (let e = 0; e < n; e++) r[e] = Math.random() * 2 - 1;
    }
    setMuted(e) {
      ((this.muted = e), this.master && (this.master.gain.value = e ? 0 : 0.34));
    }
    tone(e, t, n, r, i, a = 0) {
      let o = this.ctx,
        s = o.currentTime + this.timeOffset + a,
        c = o.createOscillator(),
        l = o.createGain();
      ((c.type = e),
        c.frequency.setValueAtTime(t, s),
        c.frequency.exponentialRampToValueAtTime(Math.max(20, n), s + r),
        l.gain.setValueAtTime(i, s),
        l.gain.exponentialRampToValueAtTime(8e-4, s + r),
        c.connect(l),
        l.connect(this.master),
        c.start(s),
        c.stop(s + r + 0.02));
    }
    noise(e, t, n, r, i, a = 1, o = 0) {
      let s = this.ctx,
        c = s.currentTime + this.timeOffset + o,
        l = s.createBufferSource();
      ((l.buffer = this.noiseBuffer), (l.playbackRate.value = 0.8 + Math.random() * 0.4));
      let u = s.createBiquadFilter();
      ((u.type = e),
        (u.Q.value = a),
        u.frequency.setValueAtTime(t, c),
        u.frequency.exponentialRampToValueAtTime(Math.max(30, n), c + r));
      let d = s.createGain();
      (d.gain.setValueAtTime(i, c),
        d.gain.exponentialRampToValueAtTime(8e-4, c + r),
        l.connect(u),
        u.connect(d),
        d.connect(this.master),
        l.start(c, Math.random() * 0.5),
        l.stop(c + r + 0.02));
    }
    loudness(e, t) {
      if (e === void 0) return 1;
      let n = Math.hypot(e - this.listener.x, t - this.listener.z),
        r = Math.max(0, 1 - n / 22);
      return r * r;
    }
    play(e, t, n) {
      this.ctx && !this.muted && this.emit(e, this.loudness(t, n));
    }
    emit(e, t) {
      if (t < 0.02) return;
      let n = this.ctx.currentTime + this.timeOffset;
      if (!(n - (this.lastPlayed[e] ?? -1) < 0.035))
        switch (((this.lastPlayed[e] = n), e)) {
          case `shot`:
            (this.noise(`bandpass`, 2600, 700, 0.09, 0.5 * t, 0.8), this.tone(`square`, 760, 170, 0.08, 0.12 * t));
            break;
          case `shotBig`:
            (this.noise(`bandpass`, 2e3, 400, 0.13, 0.6 * t, 0.7), this.tone(`sawtooth`, 520, 110, 0.12, 0.16 * t));
            break;
          case `zap`:
            (this.noise(`highpass`, 4200, 1700, 0.075, 0.22 * t, 2.4), this.tone(`square`, 1500, 360, 0.085, 0.1 * t));
            break;
          case `zapBig`:
            (this.noise(`highpass`, 5200, 900, 0.14, 0.36 * t, 2),
              this.tone(`sawtooth`, 1250, 180, 0.15, 0.16 * t),
              this.tone(`square`, 2100, 480, 0.1, 0.07 * t, 0.025));
            break;
          case `blast`:
            (this.noise(`lowpass`, 3200, 240, 0.2, 0.85 * t), this.tone(`sine`, 170, 50, 0.16, 0.4 * t));
            break;
          case `blastBig`:
            (this.noise(`lowpass`, 3600, 160, 0.34, 1 * t), this.tone(`sine`, 150, 38, 0.3, 0.6 * t));
            break;
          case `lob`:
            (this.tone(`sine`, 330, 120, 0.16, 0.35 * t), this.noise(`bandpass`, 900, 500, 0.08, 0.2 * t));
            break;
          case `punch`:
            (this.noise(`lowpass`, 900, 120, 0.09, 0.7 * t), this.tone(`sine`, 140, 60, 0.08, 0.35 * t));
            break;
          case `boom`:
            (this.noise(`lowpass`, 1800, 70, 0.5, 1 * t), this.tone(`sine`, 110, 34, 0.45, 0.7 * t));
            break;
          case `boomBig`:
            (this.noise(`lowpass`, 2400, 50, 0.85, 1.2 * t),
              this.tone(`sine`, 95, 28, 0.8, 0.9 * t),
              this.noise(`bandpass`, 500, 200, 0.5, 0.4 * t, 0.6, 0.05));
            break;
          case `hit`:
            this.tone(`triangle`, 720, 260, 0.06, 0.3 * t);
            break;
          case `crate`:
            (this.noise(`bandpass`, 1300, 380, 0.2, 0.75 * t, 1.2), this.tone(`square`, 210, 80, 0.1, 0.12 * t));
            break;
          case `pickup`:
            [660, 880, 1320].forEach((e, n) => this.tone(`triangle`, e, e * 1.01, 0.13, 0.26 * t, n * 0.065));
            break;
          case `ready`:
            [784, 1046, 1568].forEach((e, t) => this.tone(`sine`, e, e, 0.22, 0.24, t * 0.08));
            break;
          case `super`:
            (this.noise(`bandpass`, 300, 3200, 0.3, 0.5 * t, 1.5), this.tone(`sawtooth`, 180, 720, 0.28, 0.13 * t));
            break;
          case `leap`:
            (this.tone(`sine`, 200, 620, 0.35, 0.3 * t), this.noise(`highpass`, 800, 3e3, 0.3, 0.2 * t));
            break;
          case `gas`:
            this.noise(`highpass`, 3e3, 1500, 0.22, 0.22);
            break;
          case `down`:
            (this.tone(`sawtooth`, 420, 60, 0.5, 0.25 * t), this.noise(`lowpass`, 1200, 100, 0.4, 0.4 * t));
            break;
          case `count`:
            this.tone(`square`, 520, 520, 0.12, 0.2);
            break;
          case `go`:
            (this.tone(`square`, 880, 1320, 0.3, 0.24), this.tone(`sine`, 440, 660, 0.3, 0.2));
            break;
          case `win`:
            [523, 659, 784, 1046, 1318].forEach((e, t) => this.tone(`triangle`, e, e, 0.3, 0.3, t * 0.11));
            break;
          case `lose`:
            [392, 330, 262, 196].forEach((e, t) => this.tone(`sawtooth`, e, e * 0.97, 0.32, 0.18, t * 0.16));
            break;
          case `click`:
            this.tone(`triangle`, 900, 600, 0.05, 0.2);
        }
    }
  },
  Zu = 32,
  Qu = (56 * Math.PI) / 180,
  $u = 23,
  ed = [null, 12.5, 17.6, 18.6, 19.4, 21.5],
  td = `sundown-showdown-settings`,
  nd = new Hi(),
  rd = new V(),
  id = new _n(new H(0, 1, 0), -0.5),
  ad = new H(),
  od = new J(16761402),
  sd = new J(16767392);
