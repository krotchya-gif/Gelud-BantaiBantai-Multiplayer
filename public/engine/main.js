function cd(e) {
  for (let t = e.length - 1; t > 0; t--) {
    let n = Math.floor(Math.random() * (t + 1));
    [e[t], e[n]] = [e[n], e[t]];
  }
  return e;
}
MATCH_MODES.deathmatch = {
  ...MATCH_MODES.classic,
  label: `Deathmatch`,
  bots: 15,
  targetKills: 50,
  timeLimit: 300,
  powerUpCap: 10,
  respawnDelay: 5,
  spawnProtection: 2,
  deathmatch: !0,
};
var ld = class {
  constructor(e = {}) {
    this.params = new URLSearchParams(location.search);
    let t = {};
    try {
      t = JSON.parse(localStorage.getItem(td) || `{}`);
    } catch {
      t = {};
    }
    let n = !!(window.matchMedia && window.matchMedia(`(pointer: coarse)`).matches),
      qualityParam = this.params.get(`q`),
      requestedQuality = Uc[qualityParam] ? qualityParam : Uc[t.quality] ? t.quality : null,
      qualityChoice = !!requestedQuality;
    let modeKey = this.params.get(`mode`) || t.mode || `classic`;
    ((this.modeName = MATCH_MODES[modeKey] ? modeKey : `classic`),
      (this.mode = MATCH_MODES[this.modeName]),
      Object.assign(Lc, this.mode));
    let arenaKey = this.params.get(`map`) || t.arena || `open`;
    this.arenaName = ARENA_VARIANTS[arenaKey] ? arenaKey : `open`;
    ((this.saved = t),
      (this.scene = new vt()),
      (this.camera = new hi(Zu, window.innerWidth / window.innerHeight, 1, 260)),
      (this.pipeline = new Zc(document.getElementById(`game`), this.scene, this.camera)),
      (this.pipeline.renderer.info.autoReset = !1),
      (this.lowEndDevice = n && ((Number(navigator.deviceMemory) || 8) <= 4 || (Number(navigator.hardwareConcurrency) || 8) <= 4)),
      (this.mobileDefaultQuality = n && !qualityChoice),
      (this.mobileDefaultEffects = {
        ao: this.mobileDefaultQuality && typeof t.ao !== `boolean`,
        bloom: this.mobileDefaultQuality && typeof t.bloom !== `boolean`,
      }),
      this.lowEndDevice && ((this.pipeline.toggles.ao = !1), (this.pipeline.toggles.bloom = !1)),
      typeof t.ao === `boolean`
        ? (this.pipeline.toggles.ao = t.ao)
        : this.mobileDefaultEffects.ao && (this.pipeline.toggles.ao = !1),
      typeof t.bloom === `boolean`
        ? (this.pipeline.toggles.bloom = t.bloom)
        : this.mobileDefaultEffects.bloom && (this.pipeline.toggles.bloom = !1));
    let r = requestedQuality || (n ? `low` : `high`);
    ((this.userPickedQuality = qualityChoice),
      (this.pipeline.superSample = $c(parseFloat(this.params.get(`ss`)) || 0, 0, 3)),
      this.lowEndDevice && (this.pipeline.maxPixelsCoarse = 1000000),
      this.pipeline.setQuality(Uc[r] ? r : n ? `low` : `high`));
    let i = this.params.get(`bots`) || t.difficulty;
    ((this.difficultyName = Hc[i] ? i : `auto`),
      (this.difficulty = { ...Hc[this.difficultyName] }),
      (this.coarsePointer = n),
      (this.haptics = t.haptics !== !1),
      (this.leftHanded = !!t.leftHanded),
      document.body.classList.toggle(`left-handed`, this.leftHanded),
      (this.lighting = new kl(this.scene, this.pipeline)),
      this.lighting.applyQuality(this.pipeline.quality),
      (this.mobileDefaultQuality || this.lowEndDevice) && (this.lighting.key.castShadow = !1),
      this.pipeline.requestShadowUpdate(!0),
      (this.audio = new Xu()),
      (this.audio.muted = !!t.muted),
      (this.input = new Gu(this.pipeline.renderer.domElement, document.getElementById(`super`), document.getElementById(`attack-control`))),
      (this.input.onTouchMode = (e) => this.hud.setTouchMode(e)),
      (this.elapsed = 0),
      (this.matchTime = 0),
      (this.timedTraps = new Map()),
      (this.nextTrapAt = 60),
      (this.nextTrapId = 1),
      (this.state = `menu`),
      (this.brawlers = []),
      (this.brains = []),
      (this.player = null),
      (this.spectate = null),
      (this.focus = new H(0, 0, 0)),
      (this.shakeAmp = 0),
      (this.leanX = 0),
      (this.leanZ = 0),
      (this.menuAngle = 0.6),
      (this.attractT = 0),
      (this.endT = 0),
      (this.pendingResult = null),
      (this.countdownT = 0),
      (this.lastCount = 0),
      (this.lastRespawnCountdown = 0),
      (this.lastShieldCountdown = 0),
      (this.camZoom = parseFloat(this.params.get(`zoom`)) || 1),
      (this.paused = !1),
      (this.simSteps = $c(parseInt(this.params.get(`speed`), 10) || 1, 1, 16)),
      (this.timePreset = 0),
      (this.autoTime = t.autoTime !== !1),
      (this.adaptiveT = 0),
      (this.perf = { t: 0, frames: 0, done: !1 }),
      (this.frameStats = { calls: 0, triangles: 0, updateMs: 0, renderMs: 0, updateP95Ms: 0, renderP95Ms: 0 }),
      (this.frameTiming = {
        update: new Float32Array(120),
        render: new Float32Array(120),
        index: 0,
        count: 0,
        elapsed: 0,
      }));
    let a = parseInt(this.params.get(`seed`), 10);
    ((this.nextSeed = Number.isFinite(a) ? a : (Math.random() * 1e9) | 0),
      (this.fixedSeed = Number.isFinite(a) ? a : null),
      (this.maxAniso = this.pipeline.renderer.capabilities?.getMaxAnisotropy?.() ?? 4),
      (this.world = new Zl(this.scene, this.nextSeed, this.maxAniso, this.arenaName)),
      this.lighting.setBiomePalette(this.world.biomePalette),
      this.lighting.setLamps(this.world.lanterns, this.world.lampGlass),
      (this.effects = new Nu(this)),
      (this.combat = new Su(this)),
      (this.gas = new Lu(this)),
      (this.hud = new Yu(this)),
      this.buildAimGuide(),
      e.selected && Bc[e.selected] && this.hud.select(e.selected),
      n && this.input.setTouchMode(!0));
    let o = parseFloat(this.params.get(`time`));
    (Number.isFinite(o)
      ? ((this.autoTime = !1), this.lighting.setTime(o))
      : !this.autoTime && Number.isFinite(t.time) && this.lighting.setTime(t.time),
      window.addEventListener(`keydown`, (e) => {
        if (e.repeat) return;
        let t = Uu(e);
        (t === `KeyT` && this.cycleTime(),
          t === `KeyM` && this.setMuted(!this.audio.muted),
          t === `KeyF` && this.useHeldItem(0) && e.preventDefault(),
          t === `KeyG` && this.useHeldItem(1) && e.preventDefault(),
          t === `KeyP` && [`countdown`, `playing`].includes(this.state) && this.setPaused(!this.paused),
          t === `Escape` &&
            (this.paused
              ? this.setPaused(!1)
              : ($(`settings`).classList.remove(`open`), $(`gear`).setAttribute(`aria-expanded`, `false`))));
      }),
      this.hud.syncSettings(),
      (() => {
        for (const [buttonId, slot] of [[`item-action`, 0], [`item-action-2`, 1]]) {
          let button = $(buttonId), touchActivationAt = 0, touchPointerId = null;
          button.addEventListener(`pointerdown`, (event) => {
            if (event.pointerType !== `touch`) return;
            event.preventDefault(); event.stopPropagation();
            touchPointerId = event.pointerId; touchActivationAt = performance.now();
            this.useHeldItem(slot);
          });
          window.addEventListener(`pointerup`, (event) => {
            if (event.pointerId !== touchPointerId) return;
            touchPointerId = null; touchActivationAt = performance.now();
          });
          window.addEventListener(`pointercancel`, (event) => {
            if (event.pointerId !== touchPointerId) return;
            touchPointerId = null; touchActivationAt = 0;
          });
          button.addEventListener(`click`, (event) => {
            let generatedByTouch = event.pointerType === `touch` || (!event.pointerType && touchActivationAt > 0 && event.detail > 0 && performance.now() - touchActivationAt < 800);
            if (generatedByTouch) { touchActivationAt = 0; event.preventDefault(); event.stopPropagation(); return; }
            this.useHeldItem(slot);
          });
        }
      })(),
      (() => {
        let button = $(`flicker-action`),
          touchActivationAt = 0,
          touchPointerId = null;
        button.addEventListener(`pointerdown`, (event) => {
          if (event.pointerType !== `touch`) return;
          event.preventDefault();
          event.stopPropagation();
          touchPointerId = event.pointerId;
          touchActivationAt = performance.now();
          this.useFlicker();
        });
        window.addEventListener(`pointerup`, (event) => {
          if (event.pointerId !== touchPointerId) return;
          touchPointerId = null;
          touchActivationAt = performance.now();
        });
        window.addEventListener(`pointercancel`, (event) => {
          if (event.pointerId !== touchPointerId) return;
          touchPointerId = null;
          touchActivationAt = 0;
        });
        button.addEventListener(`click`, (event) => {
          let generatedByTouch =
            event.pointerType === `touch` ||
            (!event.pointerType && touchActivationAt > 0 && event.detail > 0 && performance.now() - touchActivationAt < 800);
          if (generatedByTouch) {
            touchActivationAt = 0;
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          this.useFlicker();
        });
      })(),
      (() => {
        for (const [buttonId, skill] of [[`skill-action-1`, 1], [`skill-action-2`, 2]]) {
          const button = $(buttonId);
          let pointerActivationAt = 0;
          button.addEventListener(`pointerdown`, (event) => {
            if (button.disabled) return;
            event.preventDefault();
            event.stopPropagation();
            if (event.pointerType === `touch`) {
              this.input.setTouchMode(!0);
              this.input.lastTouch = performance.now();
            }
            const chargeStarted = this.player?.def?.id === `sukuna` && skill === 2;
            const pointer = {
              skill, originX: event.clientX, originY: event.clientY,
              x: 0, y: 0, mag: 0, moved: false, chargeStarted,
              startedAt: performance.now(),
            };
            this.input.skillPointers.set(event.pointerId, pointer);
            try { button.setPointerCapture(event.pointerId); } catch {}
            if (chargeStarted) this.input.triggerSkill(skill, `press`);
          });
          window.addEventListener(`pointermove`, (event) => {
            const pointer = this.input.skillPointers.get(event.pointerId);
            if (!pointer) return;
            const dx = event.clientX - pointer.originX;
            const dy = event.clientY - pointer.originY;
            const distance = Math.hypot(dx, dy);
            if (distance > 10) pointer.moved = true;
            const mag = Math.min(1, distance / 58);
            pointer.x = distance > 0 ? dx / distance * mag : 0;
            pointer.y = distance > 0 ? dy / distance * mag : 0;
            pointer.mag = mag;
          });
          window.addEventListener(`pointerup`, (event) => {
            const pointer = this.input.skillPointers.get(event.pointerId);
            if (!pointer) return;
            this.input.skillPointers.delete(event.pointerId);
            if (event.pointerType === `touch`) this.input.lastTouch = performance.now();
            pointerActivationAt = performance.now();
            const shot = pointer.moved ? {
              x: pointer.x, y: pointer.y, mag: pointer.mag, tap: false,
              chargeStarted: pointer.chargeStarted, startedAt: pointer.startedAt,
            } : null;
            this.input.triggerSkill(pointer.skill, pointer.chargeStarted ? `release` : `press`, shot);
          });
          window.addEventListener(`pointercancel`, (event) => {
            const pointer = this.input.skillPointers.get(event.pointerId);
            if (!pointer) return;
            this.input.skillPointers.delete(event.pointerId);
            if (event.pointerType === `touch`) this.input.lastTouch = performance.now();
            if (pointer.chargeStarted) this.input.triggerSkill(2, `cancel`);
          });
          button.addEventListener(`click`, (event) => {
            const generatedByPointer = event.detail > 0 && pointerActivationAt > 0 && performance.now() - pointerActivationAt < 800;
            if (generatedByPointer) {
              pointerActivationAt = 0;
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            if (button.disabled) return;
            this.input.triggerSkill(skill, `press`);
            if (this.player?.def?.id === `sukuna` && skill === 2) this.input.triggerSkill(2, `release`);
          });
        }
      })(),
      this.toMenu());
    let s = this.params.get(`auto`);
    (s && Bc[s] && this.startMatch(s),
      (this.last = performance.now()),
      (this.frame = this.frame.bind(this)),
      (this.warmup = 30),
      requestAnimationFrame(this.frame));
  }
  save() {
    let e = {
      quality: this.userPickedQuality ? this.pipeline.qualityName : void 0,
      ao: this.pipeline.toggles.ao,
      bloom: this.pipeline.toggles.bloom,
      muted: this.audio.muted,
      mode: this.modeName,
      arena: this.arenaName,
      haptics: this.haptics,
      leftHanded: this.leftHanded,
      autoTime: this.autoTime,
      time: this.lighting.time,
      difficulty: this.difficultyName,
    };
    try {
      localStorage.setItem(td, JSON.stringify(e));
    } catch {}
  }
  setQuality(e, t = !1) {
    (t &&
      ((this.userPickedQuality = !0),
      (this.mobileDefaultQuality = !1)),
      this.pipeline.setQuality(e),
      this.perf && ((this.perf.t = 0), (this.perf.frames = 0)),
      this.effects?.setQuality(this.pipeline.quality.tier),
      this.gas?.setQuality(this.pipeline.quality.tier),
      this.lighting.applyQuality(this.pipeline.quality),
      (this.lighting.key.castShadow = !this.mobileDefaultQuality),
      this.pipeline.requestShadowUpdate(!0),
      this.hud.syncSettings(),
      this.save());
  }
  setToggle(e, t) {
    (this.mobileDefaultEffects[e] && (this.mobileDefaultEffects[e] = !1), this.pipeline.setToggle(e, t), this.save());
  }
  setDifficulty(e) {
    Hc[e] &&
      ((this.difficultyName = e),
      (this.difficulty = { ...Hc[e] }),
      this.brains.forEach((t) => {
        let [n, r] = this.difficulty.skill;
        t.skill = Q(n, r);
      }),
      this.hud.syncSettings(),
      this.save());
  }
  setMode(e) {
    if (!MATCH_MODES[e] || this.state !== `menu`) return;
    ((this.modeName = e),
      (this.mode = MATCH_MODES[e]),
      Object.assign(Lc, this.mode),
      this.state === `menu` && this.spawnRoster(null),
      this.hud.syncSettings(),
      this.save());
  }
  setArena(e) {
    if (!ARENA_VARIANTS[e] || this.state !== `menu`) return;
    let t = this.fixedSeed;
    ((this.arenaName = e),
      this.state === `menu` && (this.newWorld(), (this.fixedSeed = t), this.spawnRoster(null)),
      this.hud.syncSettings(),
      this.save());
  }
  setHaptics(e) {
    ((this.haptics = e), this.save());
  }
  setLeftHanded(e) {
    ((this.leftHanded = e), document.body.classList.toggle(`left-handed`, e), this.save());
  }
  vibrate(e) {
    this.haptics && navigator.vibrate && navigator.vibrate(e);
  }
  async enterImmersive() {
    try {
      document.fullscreenElement || (await document.documentElement.requestFullscreen({ navigationUI: `hide` }));
    } catch {}
    try {
      screen.orientation && screen.orientation.lock && (await screen.orientation.lock(`landscape`));
    } catch {}
  }
  setAutoTime(e) {
    ((this.autoTime = e), this.hud.syncSettings(), this.save());
  }
  setMuted(e) {
    (this.audio.setMuted(e), this.hud.syncSettings(), this.save());
  }
  cycleTime() {
    this.timePreset = (this.timePreset + 1) % ed.length;
    let e = ed[this.timePreset];
    e === null
      ? (this.setAutoTime(!0), this.hud.toast(`Time of day: following the match`))
      : (this.setAutoTime(!1),
        this.lighting.setTime(e),
        this.hud.toast(
          `Time of day locked to ${String(Math.floor(e)).padStart(2, `0`)}:${String(Math.round((e % 1) * 60)).padStart(2, `0`)}`,
        ));
  }
  updateAdaptiveDifficulty(e) {
    if (!this.difficulty.adaptive || this.state !== `playing` || !this.player || !this.player.alive) return;
    this.adaptiveT -= e;
    if (this.adaptiveT > 0) return;
    this.adaptiveT = 5;
    let t = this.player,
      n = $c(0.36 + t.kills * 0.13 + t.cubes * 0.035 + (t.hp / t.maxHp) * 0.22, 0.32, 0.95);
    ((this.difficulty.damage = el(0.5, 0.94, n)),
      (this.difficulty.react = el(1.8, 0.78, n)),
      (this.difficulty.cadence = el(1.55, 0.86, n)),
      (this.difficulty.hunters = Math.round(el(1, 4, n))),
      (this.difficulty.engage = el(5.5, 10.5, n)),
      (this.difficulty.dodge = el(0.25, 0.9, n)));
    for (let e of this.brains) e.skill = $c(el(0.38, 0.96, n) + (e.b.id % 3) * 0.025, 0.3, 1);
  }
  clearEntities() {
    this.clearTimedTraps();
    for (let e of this.brawlers) e.dispose();
    ((this.brawlers = []),
      (this.brains = []),
      (this.player = null),
      (this.spectate = null),
      this.combat.clear(),
      this.gas.reset(),
      this.hud.reset());
  }
  newWorld() {
    (this.world.dispose(),
      (this.nextSeed = this.fixedSeed === null ? (Math.random() * 1e9) | 0 : this.fixedSeed),
      (this.fixedSeed = null),
      (this.world = new Zl(this.scene, this.nextSeed, this.maxAniso, this.arenaName)),
      this.lighting.setBiomePalette(this.world.biomePalette),
      this.lighting.setLamps(this.world.lanterns, this.world.lampGlass),
      this.effects.rebuildFireflies());
  }
  spawnRoster(e) {
    this.clearEntities();
    let t = this.world,
      r = cd(Vc.slice()),
      i = Object.keys(Bc),
      a = Lc.bots + 1;
    const balanceDeathmatchRoster = this.modeName === `deathmatch`;
    const deathmatchBotRoster = balanceDeathmatchRoster
      ? createBalancedBotRoster(i, a - (e ? 1 : 0), t.seed)
      : null;
    const candidates = [];
    for (let tileZ = 3; tileZ <= 40; tileZ += 1) {
      for (let tileX = 3; tileX <= 40; tileX += 1) {
        if (!t.isWalkable(tileX, tileZ)) continue;
        const x = t.center(tileX);
        const z = t.center(tileZ);
        if (t.isBushAt(x, z) || t.hazardDamageAt(x, z) > 0) continue;
        candidates.push({ x, z });
      }
    }
    cd(candidates);
    const spawnPoints = [];
    while (spawnPoints.length < a && candidates.length) {
      let bestIndex = 0;
      let bestDistance = -Infinity;
      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        const distance = spawnPoints.length === 0
          ? 0
          : Math.min(...spawnPoints.map((point) => Math.hypot(candidate.x - point.x, candidate.z - point.z)));
        if (distance > bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      }
      spawnPoints.push(candidates.splice(bestIndex, 1)[0]);
    }
    const spawnPoint = (index) => spawnPoints[index] || t.nearestOpen(0, 0);
    for (let o = 0; o < a; o++) {
      let point = spawnPoint(o),
        c = o === 0 && !!e,
        characterId = c ? e : balanceDeathmatchRoster ? deathmatchBotRoster.shift() : i[(o + Math.floor(Math.random() * i.length)) % i.length],
        l = Bc[characterId],
        u = new fu(this, l, {
          isPlayer: c,
          name: c ? `YOU` : r[o % r.length],
          x: point.x,
          z: point.z,
          hueShift: c ? 0 : Q(-0.07, 0.07),
        });
      const facing = Math.random() * Math.PI * 2;
      u.facing = facing;
      u.aimAngle = facing;
      u.root.rotation.y = facing;
      (this.brawlers.push(u), this.hud.addBrawler(u), c ? (this.player = u) : this.brains.push(new Vu(this, u)));
    }
    for (let [e, n] of t.boxSpots) this.combat.addBox(e, n);
    ((t.aoDirty = !0), (t.aoTimer = 0));
  }
  setPaused(e, t = !0, n = !0) {
    let r = !!e;
    if (r && ![`countdown`, `playing`].includes(this.state)) return !1;
    let changed = this.paused !== r;
    r && this.input.cancelActions();
    ((this.paused = r),
      [`pause-btn`, `desktop-pause-btn`].forEach((id) => {
        let button = $(id);
        button.classList.toggle(`is-paused`, r);
        button.setAttribute(`aria-label`, r ? `Resume game` : `Pause game`);
        button.setAttribute(`title`, r ? `Resume` : `Pause`);
      }),
      this.hud.showPause(r, n),
      changed && t && this.hud.toast(r ? `Paused - press P or Escape to resume` : `Resumed`));
    return !0;
  }
  useHeldItem(slot = 0) {
    slot = slot === 1 ? 1 : 0;
    if (this.networkSession) {
      const player = this.player;
      const item = player?.heldItems?.[slot] || (slot === 0 ? player?.heldItem : null);
      if (this.paused || this.state !== `playing` || !item) return !1;
      this.networkSession.sendItem(slot);
      this.vibrate(12);
      return !0;
    }
    if (this.paused || this.state !== `playing` || !this.player?.useHeldItem(slot)) return !1;
    this.vibrate(12);
    return !0;
  }
  useFlicker() {
    const player = this.player;
    if (this.networkSession) {
      if (this.paused || this.state !== `playing` || !player?.alive || player.spawnT > 0 || player.burst || player.flicker || player.networkFlicker || player.dash || player.airborne || !player.flickerReady) return !1;
      const axis = this.input.axis();
      const aim = this.networkAimDirection(player, axis) || { x: Math.sin(player.facing), z: Math.cos(player.facing) };
      const length = Math.hypot(axis.x, axis.z);
      const dx = length > 0.08 ? axis.x / length : aim.x;
      const dz = length > 0.08 ? axis.z / length : aim.z;
      let distance = 2.2;
      const wall = this.world.raycast(player.x, player.z, player.x + dx * distance, player.z + dz * distance);
      if (wall) distance = Math.max(0, wall.dist - 0.34);
      if (distance < 0.2) return !1;
      this.networkSession.sendFlicker(dx, dz);
      player.flickerReadyAt = this.matchTime + 30;
      this.startNetworkFlicker(player, { fromX: player.x, fromZ: player.z, toX: player.x + dx * distance, toZ: player.z + dz * distance, dx, dz });
      this.vibrate([16, 20, 16]);
      return !0;
    }
    if (this.paused || this.state !== `playing` || !player?.alive) return !1;
    const axis = this.input.axis();
    const used = player.useFlicker(axis.x, axis.z);
    used && this.vibrate([16, 20, 16]);
    return used;
  }
  toMenu() {
    if (this.networkSession) {
      this.networkSession.network.leaveRoom?.();
      this.networkSession.stateBuffer.clear();
      this.networkSession.localPlayer = null;
      window.__GBH_PENDING_NETWORK_MATCH__ = null;
      this.networkSession = null;
      this.networkMatch = null;
      this.networkEntities = null;
    }
    this.clearNetworkVisuals();
    this.input.cancelActions();
    this.setPaused(!1, !1, !1);
    ((this.state = `menu`),
      document.body.classList.remove(`playing`),
      this.hud.showMenu(!0),
      this.spawnRoster(null),
      this.hud.syncSettings(),
      $(`play`).focus({ preventScroll: !0 }),
      (this.attractT = 0));
  }
  startMatch(e) {
    this.networkSession = null;
    this.networkMatch = null;
    this.networkEntities = null;
    this.clearNetworkVisuals();
    this.input.cancelActions();
    (this.audio.unlock(),
      this.audio.play(`click`),
      this.setPaused(!1, !1, !1),
      (this.adaptiveT = 0),
      Object.assign(Lc, this.mode),
      document.body.classList.add(`playing`),
      this.newWorld(),
      this.spawnRoster(e),
      this.hud.showMenu(!1),
      this.hud.hideResult(),
      (this.state = `countdown`),
      (this.countdownT = 3.4),
      (this.lastCount = 4),
      (this.lastRespawnCountdown = 0),
      (this.lastShieldCountdown = 0),
      (this.matchTime = 0),
      this.resetTimedTraps(),
      (this.pendingResult = null),
      (this.shakeAmp = 0),
      this.focus.set(this.player.x, 0, this.player.z),
      this.setupGuideFor(this.player.def),
      this.hud.syncSettings(),
      this.autoTime && this.lighting.setTime(Lc.startHour),
      this.input.touchMode &&
        window.innerHeight > window.innerWidth &&
        this.hud.toast(`Tip: turn your phone sideways for a wider view`));
  }
  startNetworkMatch(session, init) {
    this.input.cancelActions();
    this.clearNetworkVisuals();
    this.networkSession = session;
    this.networkMatch = init;
    this.networkInputT = 0;
    this.networkActionId = 0;
    this.networkFire = false;
    this.networkFireT = 0;
    this.networkChargeActive = false;
    this.networkAim = null;
    this.networkEntities = new Map();
    this.networkProjectiles = new Map();
    this.networkProjectilePool = [];
    this.networkProjectileGeometries = new Map();
    this.networkProjectileOwnedGeometries = new Set();
    this.networkProjectileMaterials = new Map();
    this.networkItems = new Map();
    this.networkAreaPulse = new Map();
    this.networkAreaMarkers = new Map();
    this.networkArrowFalls = [];
    this.networkBrokenCover = new Set();
    this.networkTrapMarkers = new Map();
    if (!session.__gameBound) {
      session.__gameBound = true;
      session.addEventListener(`game-event`, ({ detail }) => this.handleNetworkEvent(detail));
      session.addEventListener(`match-end`, ({ detail }) => this.endNetworkMatch(detail));
      session.addEventListener(`connection`, ({ detail }) => {
        if (!detail.connected) this.hud.toast(`Koneksi terputus. Mencoba menyambungkan kembali...`);
        else this.hud.toast(`Koneksi multiplayer tersambung kembali.`);
      });
    }
    this.audio.unlock();
    this.setPaused(!1, !1, !1);
    this.modeName = MATCH_MODES[init.mode] ? init.mode : `deathmatch`;
    this.mode = MATCH_MODES[this.modeName] || MATCH_MODES.deathmatch;
    Object.assign(Lc, this.mode);
    if (ARENA_VARIANTS[init.mapId]) this.arenaName = init.mapId;
    this.fixedSeed = Number.isInteger(init.mapSeed) ? init.mapSeed : null;
    this.newWorld();
    this.clearEntities();
    this.brawlers = [];
    this.brains = [];
    for (const player of init.players || []) {
      const def = Bc[player.characterId] || Bc.dusty;
      const brawler = new fu(this, def, {
        isPlayer: player.id === session.localPlayerId,
        name: player.name || player.id,
        x: player.x || 0,
        z: player.z || 0,
        hueShift: player.id === session.localPlayerId ? 0 : 0.02,
      });
      brawler.characterName = player.characterName || def.name;
      brawler.networkId = player.id;
      this.brawlers.push(brawler);
      this.networkEntities.set(player.id, brawler);
      this.hud.addBrawler(brawler);
      if (player.id === session.localPlayerId) this.player = brawler;
    }
    this.networkAim = this.player ? { x: Math.sin(this.player.facing), z: Math.cos(this.player.facing) } : { x: 0, z: 1 };
    this.hud.showMenu(!1);
    this.hud.hideResult();
    this.state = `playing`;
    this.matchTime = 0;
    this.pendingResult = null;
    this.shakeAmp = 0;
    this.focus.set(this.player?.x || 0, 0, this.player?.z || 0);
    this.setupGuideFor(this.player?.def || Bc.dusty);
    this.hud.syncSettings();
    document.body.classList.add(`playing`);
  }
  networkAimDirection(player, axis = null) {
    if (!player) return null;
    if (this.input.touchMode) {
      const skillPointer = [...this.input.skillPointers.values()].find((pointer) => pointer.moved);
      if (skillPointer) {
        const definition = player.def.skills?.[skillPointer.skill - 1];
        const skillAim = definition ? this.stickAim(skillPointer, definition) : null;
        if (skillAim) this.networkAim = { x: skillAim.dx, z: skillAim.dz };
        return this.networkAim || { x: Math.sin(player.facing), z: Math.cos(player.facing) };
      }
      const stick = this.input.sticks.aim;
      if (stick.id !== null && stick.mag > 0.22) {
        const length = Math.hypot(stick.x, stick.y) || 1;
        this.networkAim = { x: stick.x / length, z: stick.y / length };
      } else if (axis && Math.hypot(axis.x, axis.z) > 0.08) {
        const length = Math.hypot(axis.x, axis.z) || 1;
        this.networkAim = { x: axis.x / length, z: axis.z / length };
      }
      return this.networkAim || { x: Math.sin(player.facing), z: Math.cos(player.facing) };
    }
    rd.set(this.input.ndcX, this.input.ndcY);
    nd.setFromCamera(rd, this.camera);
    if (nd.ray.intersectPlane(id, ad)) {
      const x = ad.x - player.x;
      const z = ad.z - player.z;
      const length = Math.hypot(x, z);
      if (length > 1e-6) {
        this.networkAim = { x: x / length, z: z / length };
        return this.networkAim;
      }
    }
    return this.networkAim || { x: Math.sin(player.facing), z: Math.cos(player.facing) };
  }
  updateNetworkPresentation(entity, dt, moving) {
    if (!entity) return;
    entity.networkLeapT = Math.max(0, (entity.networkLeapT || 0) - dt);
    entity.spawnT = Math.max(0, (entity.spawnT || 0) - dt);
    entity.parryT = Math.max(0, (entity.parryT || 0) - dt);
    entity.flickerInvulnT = Math.max(0, (entity.flickerInvulnT || 0) - dt);
    entity.recoil = nl(entity.recoil || 0, 0, 14, dt);
    entity.punch[0] = nl(entity.punch[0] || 0, 0, 16, dt);
    entity.punch[1] = nl(entity.punch[1] || 0, 0, 16, dt);
    entity.squash = nl(entity.squash || 0, 0, 12, dt);
    if (entity.slashAnim) entity.slashAnim.t += dt;
    if (entity.def.id === `sukuna` && entity.skill2Charging)
      entity.chargeLevel = $c((entity.skill2ChargeT || 0) / Math.max(0.1, entity.def.skills?.[1]?.chargeTime || 1), 0, 1);
    else if (entity.networkCharging) entity.chargeLevel = Math.min(1, (entity.chargeLevel || 0) + dt / 0.7);
    else entity.chargeLevel = nl(entity.chargeLevel || 0, 0, 18, dt);
    if (entity.networkFlicker) {
      const flicker = entity.networkFlicker;
      flicker.t += dt;
      const amount = $c(flicker.t / 0.18, 0, 1);
      const eased = amount * amount * (3 - 2 * amount);
      entity.root.position.set(el(flicker.fromX, flicker.toX, eased), 0, el(flicker.fromZ, flicker.toZ, eased));
      entity.vel.set(flicker.dx * 12, flicker.dz * 12);
      if (amount >= 1) { entity.networkFlicker = null; entity.vel.set(0, 0); entity.squash = 1.1; }
    } else if (entity.networkDash) {
      const dash = entity.networkDash;
      dash.t += dt;
      const amount = $c(dash.t / dash.duration, 0, 1);
      const eased = amount * amount * (3 - 2 * amount);
      const leapHeight = dash.leap ? Math.sin(amount * Math.PI) * 3.4 : 0;
      entity.root.position.set(el(dash.fromX, dash.toX, eased), leapHeight, el(dash.fromZ, dash.toZ, eased));
      entity.vel.set(dash.dx * 5, dash.dz * 5);
      if (amount >= 1) {
        entity.networkDash = null;
        entity.root.position.y = 0;
        if (dash.leap) {
          entity.model.body.rotation.x = 0;
          entity.squash = 1.4;
          if (entity.networkPendingSlam) {
            const slam = entity.networkPendingSlam;
            this.effects.slam(slam.x, slam.z, slam.radius, slam.color);
            this.audio.play(`boomBig`, slam.x, slam.z);
            entity.networkPendingSlam = null;
          }
        } else entity.squash = 1.1;
      }
    }
    entity.isCharging = entity.networkCharging === true || entity.skill2Charging === true;
    entity.animate(dt, moving && entity.alive);
    if (entity.networkDash?.leap) entity.model.body.rotation.x = $c(entity.networkDash.t / entity.networkDash.duration, 0, 1) * Math.PI * 2;
  }
  startNetworkFlicker(entity, event) {
    if (!entity) return;
    const dx = Number.isFinite(event.dx) ? event.dx : event.toX - event.fromX;
    const dz = Number.isFinite(event.dz) ? event.dz : event.toZ - event.fromZ;
    const length = Math.hypot(dx, dz) || 1;
    entity.networkFlicker = {
      fromX: event.fromX,
      fromZ: event.fromZ,
      toX: event.toX,
      toZ: event.toZ,
      dx: dx / length,
      dz: dz / length,
      t: 0,
    };
    entity.flickerInvulnT = 0.22;
    entity.facing = Math.atan2(dx, dz);
    entity.aimAngle = entity.facing;
    entity.root.rotation.y = entity.facing;
    entity.squash = -0.35;
    this.effects.dust(event.fromX, event.fromZ, 6, 1.5);
  }
  updateNetwork(e) {
    this.elapsed += e;
    this.matchTime += e;
    this.networkInputT -= e;
    this.networkFireT = Math.max(0, (this.networkFireT || 0) - e);
    const player = this.player;
    const axis = this.input.axis();
    const aim = this.networkAimDirection(player, axis);
    if (player && aim) {
      player.facing = Math.atan2(aim.x, aim.z);
      player.aimAngle = player.facing;
      player.root.rotation.y = player.facing;
    }
    if (this.networkInputT <= 0 && this.networkSession) {
      this.networkInputT += 1 / 30;
      const aimX = aim?.x ?? (player ? Math.sin(player.facing) : 0);
      const aimZ = aim?.z ?? (player ? Math.cos(player.facing) : 1);
      this.networkSession.sendMovement({ moveX: axis.x, moveZ: axis.z, aimX, aimZ });
    }
    if (player && this.networkSession) {
      if (this.input.consumeFlicker()) this.useFlicker();
      const aimStick = this.input.sticks.aim;
      if (this.input.touchMode && player.def.id === `syafiah` && aimStick.id !== null && aimStick.mag > 0.22 && !this.networkChargeActive) {
        this.networkChargeActive = true;
        this.networkSession.sendAttackStart(aim.x, aim.z);
        player.networkCharging = true;
      }
      for (const shot of this.input.takeShots()) {
        if (shot.cancelled) continue;
        const kind = shot.kind === `super` ? `super` : `attack`;
        // Match the solo input path: a touch tap has no stick displacement, so
        // use the same nearest-target/facing fallback instead of sending a
        // zero vector to the authoritative server.
        const shotAim = shot.tap ? this.autoAim(player.def[kind]) : this.stickAim(shot, player.def[kind]);
        this.networkAim = { x: shotAim.dx, z: shotAim.dz };
        player.facing = Math.atan2(shotAim.dx, shotAim.dz);
        if (kind === `super`) this.networkSession.sendSuper(shotAim.dx, shotAim.dz, shotAim.x, shotAim.z);
        else {
          if (player.def.id === `syafiah`) {
            if (!this.networkChargeActive) this.networkSession.sendAttackStart(shotAim.dx, shotAim.dz);
            this.networkSession.sendAttackRelease(shotAim.dx, shotAim.dz);
            this.networkChargeActive = false;
            player.networkCharging = false;
          } else this.networkSession.sendAttackStart(shotAim.dx, shotAim.dz);
        }
      }
      for (const action of this.input.takeSkillActions()) {
        const chargedSkill = player.def.id === `sukuna` && action.skill === 2;
        const phase = action.phase === `press`
          ? chargedSkill ? `start` : `activate`
          : chargedSkill && (action.phase === `release` || action.phase === `cancel`) ? action.phase : null;
        if (!phase) continue;
        const definition = player.def.skills?.[action.skill - 1];
        const aimed = action.aimShot && definition
          ? this.stickAim(action.aimShot, definition)
          : this.input.touchMode && definition
            ? this.autoAim(definition)
            : null;
        const direction = aimed ? { x: aimed.dx, z: aimed.dz } : aim || { x: Math.sin(player.facing), z: Math.cos(player.facing) };
        const range = definition?.range || 0;
        this.networkAim = { x: direction.x, z: direction.z };
        this.networkSession.sendSkill(
          action.skill,
          phase,
          direction.x,
          direction.z,
          aimed?.x ?? player.x + direction.x * range,
          aimed?.z ?? player.z + direction.z * range,
        );
        if (chargedSkill && action.phase === `press`) {
          player.skill2Charging = !0;
          player.skill2ChargeT = 0;
        } else if (chargedSkill) {
          player.skill2Charging = !1;
          player.skill2ChargeT = 0;
        }
      }
      if (!this.input.touchMode) {
        if (this.input.consumeSuperRelease()) {
          this.networkSession.sendSuper(Math.sin(player.facing), Math.cos(player.facing), player.x + Math.sin(player.facing) * player.def.super.range, player.z + Math.cos(player.facing) * player.def.super.range);
        }
        if (this.input.fire && !this.networkFire) {
          this.networkFire = true;
          this.networkFireT = 0;
          if (player.def.id === `syafiah`) {
            this.networkSession.sendAttackStart(Math.sin(player.facing), Math.cos(player.facing));
            this.networkChargeActive = true;
            player.networkCharging = true;
          }
        } else if (!this.input.fire && this.networkFire) {
          this.networkFire = false;
          this.networkFireT = 0;
          if (player.def.id === `syafiah`) {
            this.networkSession.sendAttackRelease(Math.sin(player.facing), Math.cos(player.facing));
            this.networkChargeActive = false;
            player.networkCharging = false;
          }
        }
        if (this.input.fire && player.def.id !== `syafiah` && this.networkFireT <= 0) {
          this.networkSession.sendAttackStart(Math.sin(player.facing), Math.cos(player.facing));
          const attack = player.def.attack;
          this.networkFireT = attack.kind === `burst` || attack.kind === `melee`
            ? (attack.count || 1) * (attack.interval || 0.12) + 0.12
            : attack.kind === `lob` ? 0.3 : 0.22;
        }
      }
    }
    if (this.networkSession?.localPlayer && this.player) {
      const predicted = this.networkSession.advancePrediction(e);
      const distance = Math.hypot(this.player.root.position.x - predicted.x, this.player.root.position.z - predicted.z);
      if (distance > 2.4) this.player.root.position.set(predicted.x, 0, predicted.z);
      else {
        this.player.root.position.x = nl(this.player.root.position.x, predicted.x, 42, e);
        this.player.root.position.z = nl(this.player.root.position.z, predicted.z, 42, e);
      }
      this.player.facing = il(this.player.facing, predicted.facing, 42, e);
      this.player.aimAngle = this.player.facing;
      this.player.vel.set(predicted?.velX || 0, predicted?.velZ || 0);
      const localMoving = this.player.vel.lengthSq() > 0.2;
      const localVisualFacing = localMoving && !this.player.networkCharging && !this.networkFire && (this.player.recoil || 0) < 0.18
        ? Math.atan2(this.player.vel.x, this.player.vel.y)
        : this.player.facing;
      this.player.root.rotation.y = localVisualFacing;
      this.updateNetworkPresentation(this.player, e, localMoving);
    }
    const snapshot = this.networkSession?.renderState(Date.now());
    if (snapshot) {
      const seenPlayers = new Set();
      for (const remote of snapshot.players || []) {
        seenPlayers.add(remote.id);
        const entity = this.networkEntities.get(remote.id);
        if (!entity) continue;
        if (remote.id === this.networkSession.localPlayerId) continue;
        if (!entity.networkDash && !entity.networkFlicker) entity.root.position.set(remote.x, 0, remote.z);
        entity.name = remote.name || entity.name;
        entity.characterName = remote.characterName || entity.characterName || entity.def.name;
        entity.facing = il(entity.facing, remote.facing, 24, e);
        entity.aimAngle = remote.facing;
        entity.vel.set(remote.velX || 0, remote.velZ || 0);
        entity.hp = remote.hp;
        entity.maxHp = remote.maxHp;
        entity.kills = remote.kills || 0;
        entity.deaths = remote.deaths || 0;
        entity.alive = remote.alive;
        entity.superCharge = remote.superCharge || 0;
        entity.heldItems = Array.isArray(remote.heldItems) ? remote.heldItems.slice(0, 2) : [remote.heldItem || null, null];
        entity.heldItem = entity.heldItems[0] || null;
        entity.shieldT = remote.shieldT || 0;
        entity.parryT = remote.parryT || 0;
        entity.slowT = remote.slowT || 0;
        entity.slowEffects = new Map((remote.slowEffects || []).map(({ sourceId, multiplier, remaining }) => [sourceId, { multiplier, remaining }]));
        entity.itemSpeedT = remote.itemSpeedT || 0;
        entity.spawnT = remote.spawnProtectionT || 0;
        entity.ammo = Number.isFinite(remote.ammo) ? remote.ammo : entity.ammo;
        entity.reloadT = remote.reloadT || 0;
        entity.flickerReadyAt = (Number.isFinite(snapshot.match?.elapsed) ? snapshot.match.elapsed : this.matchTime) + (remote.flickerRemaining || 0);
        entity.flickerInvulnT = remote.flickerInvulnT || 0;
        entity.fireCooldown = remote.attackCooldown || 0;
        entity.comboStep = remote.comboStep || 0;
        entity.burstT = remote.burstT || 0;
        entity.networkCharging = remote.charging === true;
        entity.skillCooldowns = Array.isArray(remote.skillCooldowns) ? remote.skillCooldowns.slice(0, 2) : entity.skillCooldowns;
        entity.skill2Charging = remote.skill2Charging === true;
        entity.skill2ChargeT = remote.skill2ChargeT || 0;
        entity.gojoBarrier = remote.gojoBarrier === true;
        entity.gojoBarrierRemaining = remote.gojoBarrierRemaining || 0;
        entity.hardCCT = remote.hardCCT || 0;
        entity.networkLeapT = remote.airborneT || 0;
        entity.sukunaRushT = remote.sukunaRushT || 0;
        if (entity.networkDash?.leap && entity.networkLeapT > 0) entity.networkDash.duration = entity.networkDash.t + entity.networkLeapT;
        entity.root.visible = remote.alive && remote.connected !== false;
        const remoteMoving = entity.vel.lengthSq() > 0.2;
        const remoteVisualFacing = remoteMoving && !entity.networkCharging && !entity.skill2Charging && (entity.recoil || 0) < 0.18
          ? Math.atan2(entity.vel.x, entity.vel.y)
          : entity.facing;
        entity.root.rotation.y = remoteVisualFacing;
        this.updateNetworkPresentation(entity, e, remoteMoving);
      }
      for (const [id, entity] of this.networkEntities) {
        if (id !== this.networkSession.localPlayerId && !seenPlayers.has(id)) entity.root.visible = false;
      }
      const local = snapshot.players?.find((remote) => remote.id === this.networkSession.localPlayerId);
      if (local) {
        this.matchTime = Number.isFinite(snapshot.match?.elapsed) ? snapshot.match.elapsed : this.matchTime;
        this.focus.set(local.x, 0, local.z);
        if (this.player) {
          this.player.name = local.name || this.player.name;
          this.player.characterName = local.characterName || this.player.characterName || this.player.def.name;
          this.player.hp = local.hp;
          this.player.maxHp = local.maxHp;
          this.player.alive = local.alive;
          this.player.root.visible = local.alive;
          this.player.spawnT = local.spawnProtectionT || 0;
          this.player.kills = local.kills || 0;
          this.player.deaths = local.deaths || 0;
          this.player.superCharge = local.superCharge || 0;
          this.player.heldItems = Array.isArray(local.heldItems) ? local.heldItems.slice(0, 2) : [local.heldItem || null, null];
          this.player.heldItem = this.player.heldItems[0] || null;
          this.player.shieldT = local.shieldT || 0;
          this.player.speedBoostT = local.speedBoostT || 0;
          this.player.itemSpeedT = local.itemSpeedT || 0;
          this.player.slowT = local.slowT || 0;
          this.player.slowEffects = new Map((local.slowEffects || []).map(({ sourceId, multiplier, remaining }) => [sourceId, { multiplier, remaining }]));
          this.player.parryT = local.parryT || 0;
          this.player.ammo = Number.isFinite(local.ammo) ? local.ammo : this.player.ammo;
          this.player.reloadT = local.reloadT || 0;
          this.player.flickerReadyAt = this.matchTime + (local.flickerRemaining || 0);
          this.player.flickerInvulnT = local.flickerInvulnT || 0;
          this.player.fireCooldown = local.attackCooldown || 0;
          this.player.comboStep = local.comboStep || 0;
          this.player.burstT = local.burstT || 0;
          this.player.networkCharging = local.charging === true;
          this.player.isCharging = this.player.networkCharging || this.player.skill2Charging;
          this.player.skillCooldowns = Array.isArray(local.skillCooldowns) ? local.skillCooldowns.slice(0, 2) : this.player.skillCooldowns;
          this.player.skill2Charging = local.skill2Charging === true;
          this.player.skill2ChargeT = local.skill2ChargeT || 0;
          this.player.gojoBarrier = local.gojoBarrier === true;
          this.player.gojoBarrierRemaining = local.gojoBarrierRemaining || 0;
          this.player.hardCCT = local.hardCCT || 0;
          this.player.networkLeapT = local.airborneT || 0;
          this.player.sukunaRushT = local.sukunaRushT || 0;
          if (this.player.networkDash?.leap && this.player.networkLeapT > 0) this.player.networkDash.duration = this.player.networkDash.t + this.player.networkLeapT;
          if (!local.alive) this.player.root.position.set(local.x, 0, local.z);
          this.focus.set(this.player.root.position.x, 0, this.player.root.position.z);
        }
      }
      this.syncNetworkProjectiles(snapshot.projectiles || []);
      this.syncNetworkItems(snapshot.items || []);
      this.syncNetworkAreas(snapshot.areaEffects || []);
      this.syncNetworkBrokenCover(snapshot.brokenCover || []);
      this.syncNetworkTraps(snapshot.traps || []);
      if (this.modeName !== `deathmatch`) this.gas.update(e, this.matchTime, false);
    }
    this.updateNetworkArrowFalls(e);
    this.updateVisibility();
    this.updateTime(e);
    this.updateCamera(e);
    this.world.update(e, this.elapsed);
    this.effects.update(e);
    this.audio.listener.x = this.focus.x;
    this.audio.listener.z = this.focus.z;
    for (const brawler of this.brawlers) if (brawler.alive && !brawler.hidden && brawler.superReady) this.lighting.addLight(brawler.x, 0.9, brawler.z, od, 1.5 + Math.sin(this.elapsed * 6) * 0.4, 3.6);
    if (this.player?.alive && this.lighting.night > 0.02) this.lighting.addLight(this.player.x, 1.9, this.player.z, sd, 2.4 * this.lighting.night, 6.5);
    this.lighting.update(e, this.elapsed, this.camera, this.focus);
    this.hud.update(e);
    if (this.pendingResult) {
      this.pendingResult.t -= e;
      if (this.pendingResult.t <= 0) {
        const result = this.pendingResult;
        this.pendingResult = null;
        this.hud.showResult(result.won, result.rank, this.brawlers.length, this.player?.kills || 0, 0);
      }
    }
  }
  handleNetworkEvent(event) {
    if (!event || !this.networkEntities) return;
    const ownerId = event.ownerId || event.projectile?.ownerId;
    const entity = ownerId ? this.networkEntities.get(ownerId) : null;
    if (event.type === `DAMAGE`) {
      const target = this.networkEntities.get(event.targetId);
      if (target && target.isPlayer) this.onPlayerHurt(event.amount);
      if (target) {
        target.flash = Math.max(target.flash || 0, 0.45);
        this.effects.impact(target.x, 0.72, target.z, target.lightColor, 8);
        this.audio.play(`hit`, target.x, target.z);
      }
    } else if (event.type === `DEATH`) {
      const target = this.networkEntities.get(event.targetId);
      if (target) {
        target.alive = false;
        target.root.visible = false;
        this.effects.defeat(target.x, target.z, target.lightColor);
        this.audio.play(`down`, target.x, target.z);
      }
      const attacker = event.attackerId ? this.networkEntities.get(event.attackerId) : null;
      const victim = target;
      if (attacker && victim) this.hud.feed(`<span class="k">${attacker.name}</span> ⚔ <span class="v">${victim.name}</span>`);
    } else if (event.type === `RESPAWN`) {
      const target = this.networkEntities.get(event.playerId);
      if (target) {
        target.alive = true;
        target.hp = target.maxHp;
        target.root.visible = true;
        target.root.position.set(event.x, 0, event.z);
        target.networkDash = null;
        target.networkPendingSlam = null;
        target.model.body.rotation.x = 0;
        this.effects.burst(event.x, 0.7, event.z, target.superColor, 12, 2.5);
      }
    } else if (event.type === `PROJECTILE_SPAWN`) {
      const projectile = event.projectile;
      if (!projectile || !entity) return;
      this.ensureNetworkProjectile(projectile);
      entity.recoil = 1;
      entity.squash = -0.28;
      const color = new J(projectile.color || (projectile.electric ? 0x40ffff : 0xffc56c));
      const shotAt = performance.now();
      if (shotAt - (entity.networkShotAt || -Infinity) > 35) {
        entity.networkShotAt = shotAt;
        const muzzle = entity.muzzleWorld(new H());
        if (projectile.kind === `bomb`) this.audio.play(`lob`, entity.x, entity.z);
        else if (projectile.electric) {
          this.effects.electricMuzzle(muzzle.x, muzzle.y, muzzle.z, projectile.dirX, projectile.dirZ, color, projectile.isSuper ? 1.15 : 0.8);
          this.audio.play(projectile.isSuper ? `zapBig` : `zap`, entity.x, entity.z);
        } else {
          this.effects.muzzle(muzzle.x, muzzle.y, muzzle.z, projectile.dirX, projectile.dirZ, color, projectile.isSuper ? 1.6 : 1.1);
          this.audio.play(entity.def.attack.kind === `spread` ? (projectile.isSuper ? `blastBig` : `blast`) : (projectile.isSuper ? `shotBig` : `shot`), entity.x, entity.z);
        }
      }
    } else if (event.type === `PROJECTILE_DESTROY`) {
      const color = new J(event.color || (event.electric ? 0x40ffff : 0xffc56c));
      if (event.electric) this.effects.electricImpact(event.x, 0.72, event.z, color, false);
      else this.effects.impact(event.x, 0.72, event.z, color, 5);
    } else if (event.type === `EXPLOSION`) {
      const color = new J(event.color || (event.super ? entity?.superColor : entity?.lightColor) || 0xffa15b);
      if (event.super && entity?.def.super.kind === `leap`) {
        if (entity.networkDash?.leap) entity.networkPendingSlam = { x: event.x, z: event.z, radius: event.radius || 2.3, color };
        else {
          this.effects.slam(event.x, event.z, event.radius || 2.3, color);
          this.audio.play(`boomBig`, event.x, event.z);
        }
      }
      else {
        this.effects.explosion(event.x, event.z, event.radius || 1.4, color, event.super === true);
        this.audio.play(event.super ? `boomBig` : `boom`, event.x, event.z);
      }
      if (entity?.isPlayer) this.shakeAmp = Math.max(this.shakeAmp, event.super ? 0.36 : 0.2);
    } else if (event.type === `FLICKER`) {
      if (entity) {
        if (entity.networkFlicker && entity.isPlayer) {
          entity.networkFlicker.toX = event.toX;
          entity.networkFlicker.toZ = event.toZ;
        } else {
          this.startNetworkFlicker(entity, event);
        }
        this.audio.play(`zap`, event.fromX, event.fromZ);
      }
    } else if (event.type === `SUPER_DASH`) {
      if (entity) {
        const duration = event.duration || entity.def.super.flight || 0.22;
        const dx = event.toX - event.fromX; const dz = event.toZ - event.fromZ;
        const length = Math.hypot(dx, dz) || 1;
        const leap = event.leap === true || (event.leap == null && entity.def.super.kind === `leap`);
        entity.networkLeapT = leap ? duration : 0;
        entity.networkDash = { ...event, dx: dx / length, dz: dz / length, t: 0, duration, leap };
        entity.recoil = 1; entity.squash = -0.35;
        this.effects.dust(event.fromX, event.fromZ, entity.def.id === `titan` ? 10 : 6, entity.def.id === `titan` ? 2.4 : 1.6);
        this.audio.play(entity.networkDash.leap ? `leap` : `shotBig`, event.fromX, event.fromZ);
      }
    } else if (event.type === `PARRY_WINDOW`) {
      if (entity) { entity.parryT = event.duration || 0.45; entity.recoil = 1; }
    } else if (event.type === `PARRY`) {
      if (entity) {
        this.effects.impact(entity.x, 0.82, entity.z, entity.superColor, 12);
        this.audio.play(`shotBig`, entity.x, entity.z);
      }
    } else if (event.type === `ATTACK_CHARGE`) {
      if (entity) { entity.networkCharging = true; entity.chargeLevel = 0; }
    } else if (event.type === `ATTACK_RELEASE`) {
      if (entity) { entity.networkCharging = false; entity.chargeLevel = 0; entity.recoil = 1; }
    } else if (event.type === `SUPER_USED` || event.type === `SUPER_ZONE` || event.type === `SUPER_WAVE`) {
      const x = Number.isFinite(event.targetX) ? event.targetX : event.x ?? entity?.x;
      const z = Number.isFinite(event.targetZ) ? event.targetZ : event.z ?? entity?.z;
      if (Number.isFinite(x) && Number.isFinite(z)) {
        const color = new J(event.color || entity?.superColor || 0xd0a2ff);
        if (event.type === `SUPER_ZONE`) this.ensureNetworkAreaMarker({ ...event, kind: event.kind || `arrow-shower` });
        else if (event.type === `SUPER_WAVE`) {
          if (event.kind === `sukuna-zone`) {
            this.effects.ring(x, z, event.radius || 4.5, color, 0.38, 2.4);
            this.effects.impact(x, 0.08, z, color, 18);
          } else {
            this.spawnNetworkArrowFalls(x, z, event.radius || 3.4);
            this.effects.impact(x, 0.08, z, color, 18);
          }
          this.audio.play(`hit`, x, z);
        } else {
          this.effects.burst(x, 0.7, z, color, 14, 3);
          this.audio.play(`super`, entity?.x ?? x, entity?.z ?? z);
        }
      }
    } else if (event.type === `SKILL_USED`) {
      entity?.startSkillAnimation?.(event.skill);
    } else if (event.type === `SKILL_ZONE`) {
      this.ensureNetworkAreaMarker(event);
      if (entity) {
        entity.recoil = 0.9;
        this.audio.play(`zap`, entity.x, entity.z);
      }
    } else if (event.type === `SKILL_SLASH`) {
      const dx = event.toX - event.fromX;
      const dz = event.toZ - event.fromZ;
      const length = Math.hypot(dx, dz) || 1;
      const color = new J(event.color || entity?.superColor || 0xe52d45);
      this.effects.muzzle(event.fromX + dx / length * 0.35, 0.74, event.fromZ + dz / length * 0.35, dx / length, dz / length, color, 1.2);
      this.effects.impact(event.toX, 0.08, event.toZ, color, 12);
      if (entity) entity.recoil = 0.9;
      this.audio.play(`shotBig`, event.fromX, event.fromZ);
    } else if (event.type === `DOMAIN_ACTIVATED`) {
      const color = new J(event.color || 0x617cff);
      this.effects.flash(event.x, 0.82, event.z, color, 25, 8, 0.3);
      this.effects.ring(event.x, event.z, event.radius || 3.8, color, 0.5, 2.5);
      this.audio.play(`zap`, event.x, event.z);
    } else if (event.type === `SKILL_CHARGE`) {
      if (entity) {
        entity.skill2Charging = true;
        entity.skill2ChargeT = 0;
        entity.networkSkillChargeStartedAt = this.elapsed;
        entity.startSkillAnimation?.(2, event.duration || 1, true);
      }
    } else if (event.type === `SKILL_CHARGE_RELEASE` || event.type === `SKILL_CHARGE_CANCEL`) {
      if (entity) {
        entity.skill2Charging = false;
        entity.skill2ChargeT = 0;
        entity.recoil = event.type === `SKILL_CHARGE_RELEASE` ? 1 : entity.recoil;
        if (event.type === `SKILL_CHARGE_RELEASE`) entity.startSkillAnimation?.(2, 0.48);
        else entity.skillAnimation = null;
      }
    } else if (event.type === `HARD_CC`) {
      const target = this.networkEntities.get(event.targetId);
      if (target) target.applyHardCC(event.duration || 0.7, event.kind || `stun`);
    } else if (event.type === `BARRIER_BLOCKED`) {
      const target = this.networkEntities.get(event.targetId);
      if (target) {
        target.gojoBarrier = false;
        target.gojoBarrierRemaining = 10;
        this.effects.impact(target.x, 0.82, target.z, new J(0x4f79ff), 12);
        this.audio.play(`zap`, target.x, target.z);
      }
    } else if (event.type === `BARRIER_READY`) {
      const target = this.networkEntities.get(event.ownerId);
      if (target) {
        target.gojoBarrier = true;
        this.effects.impact(target.x, 0.72, target.z, new J(0x4f79ff), 10);
      }
    } else if (event.type === `SUKUNA_PASSIVE`) {
      if (entity) {
        entity.sukunaRushT = event.speedDuration || 2;
        this.effects.burst(entity.x, 0.8, entity.z, new J(0xe52d45), 9, 2.8);
        this.hud.floatText(entity.x, 1.8, entity.z, `COMBAT DRIVE`, `power`);
      }
    } else if (event.type === `COVER_BROKEN`) {
      const broken = this.world?.destroyTile(event.tileX, event.tileZ);
      if (broken) this.effects.debris(broken.x, 0.6, broken.z, new J(0x877967), 6);
    } else if (event.type === `AREA_END`) {
      const marker = this.networkAreaMarkers?.get(event.id);
      if (marker) {
        this.removeNetworkAreaMarker(marker);
        this.networkAreaMarkers.delete(event.id);
      }
    } else if (event.type === `TRAP_WARNING`) {
      this.hud.banner(`RED ZONE — MOVE!`, 1.8, !0);
    } else if (event.type === `TRAP_EXPLOSION`) {
      this.effects.explosion(event.x, event.z, event.radius || 3.6, new J(0xff4b42), !0);
      this.audio.play(`boomBig`, event.x, event.z);
      this.shake(0.42, event.x, event.z);
    } else if (event.type === `ITEM_PICKUP` || event.type === `ITEM_USED`) {
      const x = entity?.x || 0; const z = entity?.z || 0;
      const color = this.combat.itemLights[event.kind] || entity?.superColor || new J(0xffc93a);
      this.effects.burst(x, 0.7, z, color, 8, 2.5);
      this.audio.play(`pickup`, x, z);
    } else if (event.type === `MELEE_SWING`) {
      if (!entity) return;
      entity.recoil = 0.9; entity.squash = -0.2;
      if (entity.def.id === `ello`) {
        entity.slashAnim = { t: 0, duration: 0.28, step: event.comboStep || 0, isSuper: false };
        entity.slashTrailT = 0;
      } else {
        entity.punch[(event.attackSerial || 0) % 2] = 1;
        this.effects.impact(entity.x + Math.sin(entity.facing) * 1.15, 0.72, entity.z + Math.cos(entity.facing) * 1.15, entity.lightColor, 7);
      }
      this.audio.play(entity.def.id === `ello` ? `shotBig` : `punch`, entity.x, entity.z);
    }
  }
  ensureNetworkProjectile(projectile) {
    let mesh = this.networkProjectiles.get(projectile.id);
    if (mesh) return mesh;
    const color = projectile.color || (projectile.electric ? 0x40ffff : projectile.isSuper ? 0xffe08a : 0x9affdf);
    const kind = projectile.kind || (projectile.electric ? `bolt` : `arrow`);
    let geometry = this.networkProjectileGeometries.get(kind);
    if (!geometry) {
      if (kind === `shuriken` || kind === `arrow`) geometry = brawlerProjectileGeometry(kind);
      else if (kind === `bomb`) geometry = new fr(0.28, 0.28, 0.28);
      else geometry = new xr(0.075, 0.035, 0.52, 8).rotateX(Math.PI / 2);
      this.networkProjectileGeometries.set(kind, geometry);
      if (kind !== `shuriken` && kind !== `arrow`) this.networkProjectileOwnedGeometries.add(geometry);
    }
    const materialKey = `${kind}:${color}:${projectile.electric ? 1 : 0}:${projectile.isSuper ? 1 : 0}`;
    let material = this.networkProjectileMaterials.get(materialKey);
    if (!material) {
      material = new Nr({ color, emissive: color, emissiveIntensity: projectile.electric ? 2.7 : 1.35, roughness: 0.26, metalness: kind === `shuriken` ? 0.72 : 0.18 });
      this.networkProjectileMaterials.set(materialKey, material);
    }
    mesh = this.networkProjectilePool.pop() || new Ln(geometry, material);
    mesh.geometry = geometry;
    mesh.material = material;
    mesh.userData.networkProjectile = true;
    mesh.userData.disposeGeometry = false;
    mesh.userData.trailAt = -Infinity;
    mesh.visible = true;
    mesh.scale.setScalar(1);
    mesh.rotation.set(0, 0, 0);
    this.scene.add(mesh);
    this.networkProjectiles.set(projectile.id, mesh);
    mesh.position.set(projectile.x, 0.72 + (projectile.height || 0), projectile.z);
    mesh.rotation.y = Math.atan2(projectile.dirX || 0, projectile.dirZ || 1);
    return mesh;
  }
  syncNetworkProjectiles(projectiles) {
    const seen = new Set();
    for (const projectile of projectiles) {
      seen.add(projectile.id);
      const mesh = this.ensureNetworkProjectile(projectile);
      mesh.position.set(projectile.x, 0.72 + (projectile.height || 0), projectile.z);
      mesh.rotation.y = Math.atan2(projectile.dirX, projectile.dirZ);
      const scale = projectile.kind === `bomb` ? (projectile.isSuper ? 1.75 : 1.3) : projectile.radius > 0.25 ? 1.45 : 1;
      mesh.scale.setScalar(scale);
      this.lighting.addLight(projectile.x, 0.72 + (projectile.height || 0), projectile.z, mesh.material.color, projectile.isSuper ? 2.6 : 1.9, 4.2);
      const trailsEnabled = this.pipeline.quality.tier > 0 && !this.lowEndDevice;
      if (trailsEnabled && this.elapsed - mesh.userData.trailAt > (projectile.electric ? 0.032 : 0.055)) {
        mesh.userData.trailAt = this.elapsed;
        if (projectile.electric) this.effects.electricTrail(projectile.x, 0.72 + (projectile.height || 0), projectile.z, mesh.material.color, projectile.isSuper ? 0.28 : 0.18);
        else this.effects.trail(projectile.x, 0.72 + (projectile.height || 0), projectile.z, mesh.material.color, projectile.isSuper ? 0.23 : 0.14);
      }
    }
    for (const [id, mesh] of this.networkProjectiles) {
      if (seen.has(id)) continue;
      this.scene.remove(mesh);
      mesh.visible = false;
      this.networkProjectilePool.push(mesh);
      this.networkProjectiles.delete(id);
    }
  }
  syncNetworkItems(items) {
    const seen = new Set();
    for (const item of items) {
      seen.add(item.id);
      let mesh = this.networkItems.get(item.id);
      if (!mesh) {
        const geometry = this.combat?.itemGeo || new fr(0.4, 0.4, 0.4);
        const material = this.combat?.itemMaterials?.[item.kind] || new Nr({ color: 0xffc93a, emissive: 0xffc93a, emissiveIntensity: 1.5, roughness: 0.24, metalness: 0.12 });
        mesh = new Ln(geometry, material);
        mesh.userData.networkItem = true;
        mesh.userData.ownedGeometry = !this.combat?.itemGeo;
        mesh.userData.ownedMaterial = !this.combat?.itemMaterials?.[item.kind];
        this.scene.add(mesh);
        this.networkItems.set(item.id, mesh);
      }
      mesh.visible = true;
      mesh.position.set(item.x, 0.55 + Math.sin(this.elapsed * 4 + item.x) * 0.08, item.z);
      mesh.rotation.y += item.kind === `super` ? 0.075 : 0.04;
      mesh.rotation.z = item.kind === `super` ? Math.PI / 4 : 0;
      this.lighting.addLight(item.x, mesh.position.y + 0.1, item.z, this.combat.itemLights[item.kind] || mesh.material.color, 1.5 + this.lighting.night, 3.2);
    }
    for (const [id, mesh] of this.networkItems) {
      if (seen.has(id)) continue;
      mesh.visible = false;
    }
  }
  syncNetworkBrokenCover(tiles) {
    if (!this.networkBrokenCover) this.networkBrokenCover = new Set();
    for (const tile of tiles) {
      if (!Number.isInteger(tile.tileX) || !Number.isInteger(tile.tileZ)) continue;
      const key = tile.tileZ * 44 + tile.tileX;
      if (this.networkBrokenCover.has(key)) continue;
      this.networkBrokenCover.add(key);
      const broken = this.world?.destroyTile(tile.tileX, tile.tileZ);
      if (broken) this.effects.debris(broken.x, 0.6, broken.z, new J(0x877967), 5);
    }
  }
  ensureNetworkAreaMarker(area) {
    if (!area?.id || ![`arrow-shower`, `gojo-pull`, `gojo-domain`, `sukuna-zone`].includes(area.kind) || !this.networkAreaMarkers) return;
    let marker = this.networkAreaMarkers.get(area.id);
    if (!marker) {
      marker = new ut();
      const discMaterial = this.combat.arrowShowerDiscMaterial.clone();
      const ringMaterial = this.combat.arrowShowerRingMaterial.clone();
      const color = area.color || (area.kind === `gojo-pull` || area.kind === `gojo-domain` ? 0x4777ff : area.kind === `sukuna-zone` ? 0xe52d45 : 0xffd17a);
      discMaterial.color.set(color);
      ringMaterial.color.set(color);
      const disc = new Ln(this.combat.arrowShowerDiscGeometry, discMaterial);
      const ring = new Ln(this.combat.arrowShowerRingGeometry, ringMaterial);
      disc.userData.noAO = ring.userData.noAO = marker.userData.noAO = true;
      disc.renderOrder = ring.renderOrder = marker.renderOrder = 3;
      marker.add(disc, ring);
      marker.userData.areaDisc = disc;
      marker.userData.areaRing = ring;
      marker.userData.ownsAreaMaterials = true;
      if (area.kind === `gojo-pull`) {
        const orbMaterial = new Nr({
          color: 0x8fbaff, emissive: color, emissiveIntensity: 2.8, roughness: 0.2,
          metalness: 0.08, transparent: true, opacity: 1, depthWrite: false,
        });
        const orb = new Ln(this.combat.characterAreaOrbGeometry, orbMaterial);
        orb.position.y = 0.76;
        orb.userData.noAO = true;
        marker.add(orb);
        marker.userData.areaOrb = orb;
      }
      this.scene.add(marker);
      this.networkAreaMarkers.set(area.id, marker);
    }
    marker.position.set(area.x, 0.055, area.z);
    const activated = area.kind === `gojo-pull` || area.activated === true || (Number.isFinite(area.warning) && area.warning <= 0);
    if (marker.userData.areaDisc) marker.userData.areaDisc.material.opacity = activated ? 0.13 : 0.07 + Math.max(0, Math.sin(this.elapsed * 18)) * 0.08;
    if (marker.userData.areaRing) marker.userData.areaRing.material.opacity = activated ? 0.82 : 0.55 + Math.max(0, Math.sin(this.elapsed * 18)) * 0.4;
    marker.scale.setScalar((area.radius || 3.4) / 3.4 * (activated ? 1 + Math.sin(this.elapsed * 13) * 0.018 : 1));
    if (marker.userData.areaOrb) {
      const fade = $c((area.remaining ?? 1.4) / 0.22, 0, 1);
      const orb = marker.userData.areaOrb;
      orb.position.y = 0.76 + Math.sin(this.elapsed * 8) * 0.09;
      orb.rotation.y = this.elapsed * 2.8;
      orb.scale.setScalar((0.86 + Math.sin(this.elapsed * 11) * 0.12) * (0.72 + fade * 0.28));
      orb.material.opacity = fade;
    }
  }
  removeNetworkAreaMarker(marker) {
    if (!marker) return;
    this.scene.remove(marker);
    if (marker.userData?.ownsAreaMaterials)
      disposeRendererResources(marker.children.map((child) => child.material));
  }
  spawnNetworkArrowFalls(x, z, radius) {
    if (!this.networkArrowFalls) return;
    for (let index = 0; index < 8 && this.networkArrowFalls.length < 64; index++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * radius;
      this.networkArrowFalls.push({ x: x + Math.cos(angle) * distance, z: z + Math.sin(angle) * distance, angle, t: 0, duration: 0.24 });
    }
  }
  updateNetworkArrowFalls(dt) {
    const mesh = this.combat?.weaponProjectiles?.arrow;
    if (!mesh || !this.networkArrowFalls) return;
    let count = 0;
    let live = 0;
    for (const fall of this.networkArrowFalls) {
      fall.t += dt;
      const progress = $c(fall.t / fall.duration, 0, 1);
      if (progress >= 1) continue;
      if (count < mesh.instanceMatrix.count) {
        _u.set(0.82, fall.angle, 0);
        mu.setFromEuler(_u);
        pu.compose(hu.set(fall.x, 5.2 * (1 - progress), fall.z), mu, gu.setScalar(0.8));
        mesh.setMatrixAt(count++, pu);
      }
      this.networkArrowFalls[live++] = fall;
    }
    this.networkArrowFalls.length = live;
    mesh.count = count;
    if (count) mesh.instanceMatrix.needsUpdate = true;
  }
  syncNetworkAreas(areas) {
    const active = new Set();
    for (const area of areas) {
      active.add(area.id);
      if ([`arrow-shower`, `gojo-pull`, `gojo-domain`, `sukuna-zone`].includes(area.kind)) {
        this.ensureNetworkAreaMarker(area);
        continue;
      }
      const previous = this.networkAreaPulse.get(area.id) || -Infinity;
      if (this.elapsed - previous < 0.28) continue;
      this.networkAreaPulse.set(area.id, this.elapsed);
      const owner = this.networkEntities.get(area.ownerId);
      this.effects.ring(area.x, area.z, area.radius || 3, owner?.superColor || new J(0xd0a2ff), 0.38, 2.15);
    }
    for (const id of this.networkAreaPulse.keys()) if (!active.has(id)) this.networkAreaPulse.delete(id);
    for (const [id, marker] of this.networkAreaMarkers || []) {
      if (active.has(id)) continue;
      this.removeNetworkAreaMarker(marker);
      this.networkAreaMarkers.delete(id);
    }
  }
  clearNetworkVisuals() {
    this.clearNetworkTrapMarkers();
    for (const marker of this.networkAreaMarkers?.values() || []) this.removeNetworkAreaMarker(marker);
    this.networkAreaMarkers?.clear();
    this.networkArrowFalls = [];
    if (this.combat?.weaponProjectiles?.arrow) this.combat.weaponProjectiles.arrow.count = 0;
    for (const collection of [this.networkProjectiles, this.networkItems]) {
      if (!collection) continue;
      for (const mesh of collection.values()) {
        this.scene.remove(mesh);
        if (mesh.userData.ownedGeometry) mesh.geometry?.dispose?.();
        if (mesh.userData.ownedMaterial) mesh.material?.dispose?.();
      }
      collection.clear();
    }
    for (const mesh of this.networkProjectilePool || []) this.scene.remove(mesh);
    for (const geometry of this.networkProjectileOwnedGeometries || []) geometry.dispose?.();
    for (const material of this.networkProjectileMaterials?.values?.() || []) material.dispose?.();
    this.networkProjectileOwnedGeometries?.clear?.();
    this.networkProjectileGeometries?.clear?.();
    this.networkProjectileMaterials?.clear?.();
    this.networkProjectilePool = null;
    this.networkProjectiles = null;
    this.networkItems = null;
    this.networkAreaPulse?.clear();
    this.networkAreaMarkers = null;
    this.networkTrapMarkers = null;
  }
  endNetworkMatch(result) {
    if (this.state !== `playing`) return;
    const scores = Array.isArray(result?.scores) ? result.scores : [];
    const rank = 1 + scores.filter((score) => score.kills > (scores.find((item) => item.id === this.networkSession?.localPlayerId)?.kills || 0)).length;
    const won = result?.winnerId === this.networkSession?.localPlayerId;
    if (this.player) this.player.rank = rank;
    this.state = `ended`;
    this.pendingResult = { t: 0.8, won, rank };
    this.hud.banner(won ? `MATCH WON` : `MATCH OVER`, 1.25, !0);
    this.audio.play(won ? `win` : `lose`);
  }
  requestNetworkRematch() {
    if (!this.networkSession) return false;
    this.hud.hideResult();
    this.state = `menu`;
    document.body.classList.remove(`playing`);
    document.getElementById(`multiplayer`)?.classList.add(`open`);
    document.getElementById(`menu`)?.classList.remove(`open`);
    this.networkSession.network.emit(`lobby:start`);
    return true;
  }
  respawnBrawler(e) {
    if (this.modeName !== `deathmatch` || this.state !== `playing` || e.alive) return;
    let t = this.world.spawns
        .map(([e, t]) => ({ x: this.world.center(e), z: this.world.center(t) }))
        .map((t) => ({
          ...t,
          distance: this.brawlers.reduce(
            (e, n) => (n.alive ? Math.min(e, sl(t.x, t.z, n.x, n.z)) : e),
            1 / 0,
          ),
        }))
        .sort((e, t) => t.distance - e.distance),
      n = t[Math.floor(Math.random() * Math.min(3, t.length))] || t[0];
    if (!n) return;
    let r = Math.atan2(-n.x, -n.z);
    ((e.alive = !0),
      (e.deadT = 0),
      (e.hp = e.maxHp = e.def.hp),
      (e.cubes = 0),
      (e.ammo = e.maxAmmo),
      (e.reloadT = 0),
      (e.superCharge = 0),
      (e.skill2Charge = null),
      (e.gojoBarrier = !1),
      (e.gojoBarrierReadyAt = this.matchTime + 10),
      (e.hardCCT = 0),
      (e.hardCCRecoveryT = 0),
      e.slowEffects.clear(),
      e.bleeds.clear(),
      e.burns.clear(),
      e.sukunaBasicHits.clear(),
      (e.sukunaRushT = 0),
      (e.comboStep = 0),
      (e.comboResetT = 0),
      (e.meleeLunge = null),
      (e.slashAnim = null),
      (e.slashTrailT = 0),
      (e.iaidoState = null),
      (e.fireCooldown = 0),
      (e.burst = null),
      (e.leap = null),
      (e.dash = null),
      (e.parryT = 0),
      (e.slowT = 0),
      (e.speedBoostT = 0),
      (e.stationaryT = 0),
      (e.isCharging = !1),
      (e.chargeLevel = 0),
      (e.voltChain = 0),
      (e.lastVoltTarget = null),
      e.scatterHits.clear(),
      (e.aimHold = 0),
      (e.regenT = 0),
      (e.lastAttacker = null),
      (e.lastHitTime = -10),
      (e.lastCombat = this.elapsed),
      (e.flash = 0),
      (e.recoil = 0),
      (e.squash = 0),
      (e.revealT = 0),
      (e.moveX = 0),
      (e.moveZ = 0),
      (e.spawnT = this.mode.spawnProtection),
      e.vel.set(0, 0),
      e.knock.set(0, 0),
      (e.superRing.material.opacity = 0),
      (e.superRing.visible = !1),
      e.root.position.set(n.x, 0, n.z),
      e.root.rotation.set(0, r, 0),
      e.root.scale.setScalar(1),
      (e.root.visible = !0),
      (e.facing = r),
      (e.aimAngle = r),
      (e.inBush = this.world.isBushAt(n.x, n.z)),
      (e.hidden = !1));
    let i = this.brains.find((t) => t.b === e);
    i &&
      ((i.target = null),
      (i.box = null),
      (i.goal = null),
      (i.path = null),
      (i.pathI = 0),
      (i.repathT = 0),
      (i.spawnHuntT = 12),
      (i.thinkT = 0.2));
  }
  endDeathmatch() {
    if (this.modeName !== `deathmatch` || this.state !== `playing` || !this.player) return;
    let e = [...this.brawlers].sort((e, t) => t.kills - e.kills),
      t = 1 + e.filter((e) => e.kills > this.player.kills).length,
      n = t === 1;
    ((this.player.rank = t),
      (this.state = `ended`),
      (this.pendingResult = { t: 1.25, won: n, rank: t }),
      this.hud.banner(n ? `MATCH WON` : `MATCH OVER`, 1.25, !0),
      this.audio.play(n ? `win` : `lose`));
  }
  onPlayerHurt(e) {
    (this.hud.flashHurt(e), this.vibrate(e > 900 ? [24, 28, 32] : 18), (this.shakeAmp = Math.max(this.shakeAmp, 0.07)));
  }
  updateRespawnCountdown() {
    if (this.modeName !== `deathmatch` || this.state !== `playing` || !this.player) {
      ((this.lastRespawnCountdown = 0), (this.lastShieldCountdown = 0));
      return;
    }
    let e = this.player;
    if (!e.alive) {
      this.lastShieldCountdown = 0;
      let t = Math.max(0, Math.ceil(this.mode.respawnDelay - e.deadT));
      t > 0 &&
        t !== this.lastRespawnCountdown &&
        ((this.lastRespawnCountdown = t), this.hud.banner(`RESPAWNING IN ${t}s`, 1.05, !0));
      return;
    }
    this.lastRespawnCountdown = 0;
    let t = Math.max(0, Math.ceil(e.spawnT));
    t > 0 &&
      t !== this.lastShieldCountdown &&
      ((this.lastShieldCountdown = t), this.hud.banner(`INVINCIBLE · ${t}s`, 1.05, !0));
    t === 0 && (this.lastShieldCountdown = 0);
  }
  onBrawlerDown(e, t) {
    let n = this.brawlers.reduce((e, t) => e + +!!t.alive, 0);
    if (
      ((e.rank = n + 1),
      this.effects.defeat(e.x, e.z, e.lightColor),
      this.audio.play(`down`, e.x, e.z),
      this.combat.dropCubes(e.x, e.z, 1 + Math.floor(e.cubes / 2)),
      this.state === `menu`)
    )
      return;
    let r = (e) => (e && e.isPlayer ? `you` : ``);
    if (
      (t && t !== e
        ? this.hud.feed(`<span class="k ${r(t)}">${t.name}</span> ⚔ <span class="v ${r(e)}">${e.name}</span>`)
        : this.hud.feed(`<span class="v ${r(e)}">${e.name}</span> ☠ poison gas`),
      this.state !== `playing`)
    )
      return;
    if (this.modeName === `deathmatch`) {
      if (t && t.kills >= this.mode.targetKills) this.endDeathmatch();
      return;
    }
    let i = this.player;
    e === i
      ? ((this.state = `ended`),
        (this.spectate = t && t.alive ? t : null),
        (this.pendingResult = { t: 1.5, won: !1, rank: e.rank }),
        this.audio.play(`lose`))
      : n === 1 && i && i.alive
        ? ((this.state = `ended`),
          (i.rank = 1),
          (this.pendingResult = { t: 1.3, won: !0, rank: 1 }),
          this.audio.play(`win`))
        : n === 2 && i && i.alive && this.hud.banner(`SHOWDOWN!`, 1.5, !0);
  }
  shake(e, t, n) {
    let r = sl(t, n, this.focus.x, this.focus.z);
    this.shakeAmp = Math.max(this.shakeAmp, e * $c(1 - r / 8, 0, 1));
  }
  resetTimedTraps() {
    this.clearTimedTraps();
    this.nextTrapAt = 60;
    this.nextTrapId = 1;
    this.trapRngState = (((this.world?.seed ?? this.nextSeed ?? 0) | 0) ^ 0x52ed270b) >>> 0;
  }
  nextTimedTrapRandom() {
    let value = (this.trapRngState += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  createTrapMarker() {
    const marker = new ut();
    const fillGeometry = new mr(1, 48).rotateX(-Math.PI / 2);
    const ringGeometry = new br(0.9, 1, 48).rotateX(-Math.PI / 2);
    const fillMaterial = new Tn({ color: 0xff3e4b, transparent: !0, opacity: 0.12, depthWrite: !1, side: 2 });
    const ringMaterial = new Tn({ color: 0xff3e4b, transparent: !0, opacity: 0.78, depthWrite: !1, side: 2 });
    const fill = new Ln(fillGeometry, fillMaterial);
    const ring = new Ln(ringGeometry, ringMaterial);
    fill.position.y = 0.02;
    ring.position.y = 0.035;
    marker.add(fill, ring);
    marker.userData.trapParts = { fill, ring };
    marker.userData.trapGeometry = [fillGeometry, ringGeometry];
    marker.userData.trapMaterials = [fillMaterial, ringMaterial];
    marker.renderOrder = 3;
    this.scene.add(marker);
    return marker;
  }
  updateTrapMarker(marker, trap) {
    if (!marker) return;
    const warning = trap.phase === `warning`;
    const color = warning ? 0xff3147 : trap.kind === `burning` ? 0xff7a30 : trap.kind === `poison` ? 0x59e36c : 0xff3e4b;
    const pulse = 0.5 + Math.sin(this.elapsed * 11) * 0.5;
    const { fill, ring } = marker.userData.trapParts;
    marker.position.set(trap.x, 0, trap.z);
    marker.scale.set(trap.radius, 1, trap.radius);
    fill.material.color.set(color);
    ring.material.color.set(color);
    fill.material.opacity = warning ? 0.07 + pulse * 0.1 : trap.kind === `poison` ? 0.2 : 0.25;
    ring.material.opacity = warning ? 0.48 + pulse * 0.42 : 0.72;
  }
  disposeTrapMarker(marker) {
    if (!marker) return;
    this.scene.remove(marker);
    disposeRendererResources([...(marker.userData.trapGeometry || []), ...(marker.userData.trapMaterials || [])]);
  }
  clearTimedTraps() {
    if (!this.timedTraps) this.timedTraps = new Map();
    for (const trap of this.timedTraps.values()) this.disposeTrapMarker(trap.marker);
    this.timedTraps.clear();
  }
  clearNetworkTrapMarkers() {
    if (!this.networkTrapMarkers) return;
    for (const marker of this.networkTrapMarkers.values()) this.disposeTrapMarker(marker);
    this.networkTrapMarkers.clear();
  }
  syncNetworkTraps(traps) {
    if (!this.networkTrapMarkers) return;
    const active = new Set();
    for (const trap of traps) {
      if (!trap?.id || !Number.isFinite(trap.x) || !Number.isFinite(trap.z)) continue;
      active.add(trap.id);
      let marker = this.networkTrapMarkers.get(trap.id);
      if (!marker) {
        marker = this.createTrapMarker();
        this.networkTrapMarkers.set(trap.id, marker);
      }
      this.updateTrapMarker(marker, trap);
    }
    for (const [id, marker] of this.networkTrapMarkers) {
      if (active.has(id)) continue;
      this.disposeTrapMarker(marker);
      this.networkTrapMarkers.delete(id);
    }
  }
  updateTimedTraps(dt) {
    if (this.networkSession || this.state !== `playing`) return;
    if (this.matchTime >= this.nextTrapAt && this.timedTraps.size === 0) {
      const kinds = [`explosion`, `burning`, `poison`];
      const kind = kinds[Math.floor(this.nextTimedTrapRandom() * kinds.length)];
      let point = null;
      for (let attempt = 0; attempt < 160; attempt += 1) {
        const tileX = 4 + Math.floor(this.nextTimedTrapRandom() * 36);
        const tileZ = 4 + Math.floor(this.nextTimedTrapRandom() * 36);
        if (!this.world.isWalkable(tileX, tileZ)) continue;
        const x = this.world.center(tileX);
        const z = this.world.center(tileZ);
        if (this.world.hazardDamageAt(x, z) > 0) continue;
        point = { x, z };
        break;
      }
      point ||= { x: 0, z: 0 };
      const id = `solo-trap-${this.nextTrapId++}`;
      const trap = { id, kind, ...point, radius: 3.6, phase: `warning`, remaining: 5, damageT: 0, createdAt: this.matchTime };
      trap.marker = this.createTrapMarker();
      this.timedTraps.set(id, trap);
      this.updateTrapMarker(trap.marker, trap);
      this.nextTrapAt += 60;
      this.hud.banner(`RED ZONE — MOVE!`, 1.8, !0);
    }
    for (const [id, trap] of this.timedTraps) {
      if (trap.createdAt !== this.matchTime) trap.remaining = Math.max(0, trap.remaining - dt);
      this.updateTrapMarker(trap.marker, trap);
      if (trap.phase === `warning` && trap.remaining <= 0) {
        if (trap.kind === `explosion`) {
          this.effects.explosion(trap.x, trap.z, trap.radius, new J(0xff4b42), !0);
          this.shake(0.42, trap.x, trap.z);
          for (const brawler of this.brawlers) {
            if (!brawler.alive) continue;
            const distance = Math.hypot(brawler.x - trap.x, brawler.z - trap.z);
            if (distance <= trap.radius) brawler.takeDamage(Math.round(1450 * (1 - distance / trap.radius * 0.45)), null, !0, { kind: `trap`, x: trap.x, z: trap.z });
          }
          this.disposeTrapMarker(trap.marker);
          this.timedTraps.delete(id);
          continue;
        }
        trap.phase = `active`;
        trap.remaining = 8;
        trap.damageT = 0;
      }
      if (trap.phase !== `active`) continue;
      trap.damageT += dt;
      while (trap.damageT >= 1) {
        trap.damageT -= 1;
        const damage = trap.kind === `burning` ? 240 : 190;
        for (const brawler of this.brawlers) {
          if (brawler.alive && Math.hypot(brawler.x - trap.x, brawler.z - trap.z) <= trap.radius) brawler.takeDamage(damage, null, !0, { kind: trap.kind, x: trap.x, z: trap.z });
        }
      }
      if (trap.remaining <= 0) {
        this.disposeTrapMarker(trap.marker);
        this.timedTraps.delete(id);
      }
    }
  }
  clearBots() {
    for (let e of this.brawlers) {
      if (e.isPlayer) continue;
      let t = this.hud.overheads.get(e.id);
      (t && t.root.remove(), this.hud.overheads.delete(e.id), e.dispose());
    }
    ((this.brawlers = this.brawlers.filter((e) => e.isPlayer)), (this.brains = []));
  }
  spawnBot(e, t, n, r, i = !1) {
    let a = Bc[e] || Bc.dusty,
      o = new fu(this, a, {
        isPlayer: !1,
        name: r || Vc[this.brawlers.length % Vc.length],
        x: t,
        z: n,
        hueShift: Q(-0.06, 0.06),
      });
    return (this.brawlers.push(o), this.hud.addBrawler(o), i && this.brains.push(new Vu(this, o)), o);
  }
  buildAimGuide() {
    let e = () => new Tn({ color: 16777215, transparent: !0, opacity: 0.18, depthWrite: !1 }),
      t = new ut();
    ((t.userData.noAO = !0),
      (t.position.y = 0.06),
      (t.visible = !1),
      (this.guideRect = new Ln(new yr(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0), e())),
      (this.guideSector = new Ln(new pn(), e())),
      (this.guideCircle = new Ln(new mr(1, 48).rotateX(-Math.PI / 2), e())),
      (this.guideRing = new Ln(new br(0.93, 1, 48).rotateX(-Math.PI / 2), e())),
      (this.guideRing.material.opacity = 0.7),
      this.guideCircle.add(this.guideRing));
    for (let e of [this.guideRect, this.guideSector, this.guideCircle]) ((e.renderOrder = 3), t.add(e));
    ((this.guide = t), this.scene.add(t), (this.sectorGeos = {}));
  }
  setupGuideFor(e) {
    for (let t of [`attack`, `super`]) {
      let n = e[t];
      (n.kind === `spread` || n.arc) &&
        (this.sectorGeos[t] && this.sectorGeos[t].dispose(),
        (this.sectorGeos[t] = new mr(
          1,
          28,
          n.kind === `spread` ? -n.spread / 2 - 0.07 : -n.arc / 2,
          n.kind === `spread` ? n.spread + 0.14 : n.arc,
        ).rotateX(-Math.PI / 2)));
    }
  }
  updateGuide(e, t, n, r, i, a, charge = 0) {
    let o = this.player,
      s = this.guide;
    ((s.visible = !0), s.position.set(o.x, 0.06, o.z), (s.rotation.y = Math.atan2(n, r) - Math.PI / 2));
    let c = t === `skill` && e.color ? e.color : a ? 16765498 : 16777215,
      l = a ? 0.34 : 0.17;
    if (((this.guideRect.visible = this.guideSector.visible = this.guideCircle.visible = !1),
      e.kind === `spread` || e.arc))
      ((this.guideSector.geometry = this.sectorGeos[t]),
        this.guideSector.scale.setScalar(e.range),
        (this.guideSector.visible = !0),
        this.guideSector.material.color.set(c),
        (this.guideSector.material.opacity = l));
    else if (e.kind === `dash` || e.kind === `iaido`) {
      let t = Math.min(i, e.range),
        hit = this.world.raycast(o.x, o.z, o.x + n * t, o.z + r * t);
      hit && (t = Math.max(0.3, hit.dist - 0.3));
      (this.guideRect.scale.set(t, 1, e.kind === `iaido` ? e.slashRadius * 2 : 0.16),
        (this.guideRect.visible = !0),
        this.guideRect.material.color.set(c),
        (this.guideRect.material.opacity = l));
    } else if (t === `skill` && e.id === `pull`) {
      let distance = Math.min(i, e.range),
        hit = this.world.raycast(o.x, o.z, o.x + n * distance, o.z + r * distance);
      hit && (distance = Math.max(0.3, hit.dist - 0.3));
      (this.guideCircle.position.set(distance, 0, 0),
        this.guideCircle.scale.setScalar(e.radius),
        (this.guideCircle.visible = !0),
        this.guideCircle.material.color.set(c),
        (this.guideCircle.material.opacity = 0.28),
        this.guideRing.material.color.set(c),
        (this.guideRing.material.opacity = 0.86));
    } else if (t === `skill` && (e.id === `repulse` || e.id === `long-slash` || e.id === `flame`)) {
      let range = e.id === `flame` ? charge >= 1 ? e.chargedRange : e.tapRange : e.range,
        distance = Math.min(i, range),
        hit = this.world.raycast(o.x, o.z, o.x + n * distance, o.z + r * distance);
      hit && (distance = Math.max(0.3, hit.dist - 0.3));
      (this.guideRect.scale.set(distance, 1, Math.max(0.14, (e.width || 0.18) * 2)),
        (this.guideRect.visible = !0),
        this.guideRect.material.color.set(c),
        (this.guideRect.material.opacity = 0.26),
        this.guideCircle.position.set(distance, 0, 0),
        this.guideCircle.scale.setScalar(e.id === `flame` && charge >= 1 ? e.blast : 0.24),
        (this.guideCircle.visible = !0),
        this.guideCircle.material.color.set(c),
        (this.guideCircle.material.opacity = e.id === `flame` && charge >= 1 ? 0.3 : 0.16),
        this.guideRing.material.color.set(c));
    } else if (e.kind === `arrow-shower`) {
      let distance = Math.min(i, e.range);
      (this.guideCircle.position.set(distance, 0, 0),
        this.guideCircle.scale.setScalar(e.areaRadius),
        (this.guideCircle.visible = !0),
        this.guideCircle.material.color.set(c),
        (this.guideCircle.material.opacity = 0.34),
        this.guideRing.material.color.set(c));
    } else if (e.kind === `burst` || e.kind === `melee`) {
      let t = e.range,
        i = this.world.raycast(o.x, o.z, o.x + n * e.range, o.z + r * e.range);
      (i && !(e.breaksWalls && this.world.isBreakable(i.tx, i.ty)) && (t = Math.max(0.6, i.dist)),
        this.guideRect.scale.set(t, 1, Math.max(0.42, e.radius * 2.6)),
        (this.guideRect.visible = !0),
        this.guideRect.material.color.set(c),
        (this.guideRect.material.opacity = l));
    } else {
      let t = $c(i, e.kind === `leap` ? 2 : 0.5, e.range);
      (this.guideCircle.position.set(t, 0, 0),
        this.guideCircle.scale.setScalar(e.blast),
        (this.guideCircle.visible = !0),
        this.guideCircle.material.color.set(c),
        (this.guideCircle.material.opacity = l * 0.8),
        this.guideRing.material.color.set(c),
        this.guideRect.scale.set(Math.max(0.1, t - e.blast), 1, 0.12),
        (this.guideRect.visible = !0),
        this.guideRect.material.color.set(c),
        (this.guideRect.material.opacity = l));
    }
  }
  controlPlayer() {
    let e = this.player;
    if (!e || !e.alive || (this.state !== `playing` && this.state !== `countdown`)) {
      ((this.guide.visible = !1),
        e && ((e.moveX = e.moveZ = 0), (e.isCharging = !1), (e.chargeLevel = 0)),
        this.input.cancelActions());
      for (const action of this.input.takeSkillActions())
        if (e && action.skill === 2 && action.phase === `cancel`) e.useSkill(2, `cancel`, Math.sin(e.facing), Math.cos(e.facing));
      return;
    }
    let t = this.input,
      n = t.axis();
    ((e.moveX = n.x), (e.moveZ = n.z));
    let charging = e.def.id === `syafiah` && e.canAct() && !e.burst && e.fireCooldown <= 0 && this.state === `playing` && (t.touchMode ? t.sticks.aim.id !== null : t.fire && !t.superHeld),
      chargeStartedAt = t.touchMode ? t.sticks.aim.startedAt : t.fireStartedAt;
    ((e.isCharging = charging),
      (e.chargeLevel = charging
        ? $c((performance.now() - chargeStartedAt) / (e.def.attack.chargeTime * 1000), 0, 1)
        : 0));
    if (e.def.id === `sukuna` && e.skill2Charge) {
      e.skill2Charging = !0;
      e.skill2ChargeT = Math.max(0, this.matchTime - e.skill2Charge.startedAt);
      e.chargeLevel = $c(e.skill2ChargeT / Math.max(0.1, e.def.skills[1].chargeTime || 1), 0, 1);
    } else if (!this.networkSession) {
      e.skill2Charging = !1;
      e.skill2ChargeT = 0;
      if (e.def.id === `sukuna`) e.chargeLevel = 0;
    }
    if (t.consumeFlicker()) e.useFlicker(n.x, n.z) && this.vibrate([16, 20, 16]);
    for (const action of t.takeSkillActions()) {
      const chargedSkill = e.def.id === `sukuna` && action.skill === 2;
      const phase = action.phase === `press`
        ? chargedSkill ? `start` : `activate`
        : chargedSkill && (action.phase === `release` || action.phase === `cancel`) ? action.phase : null;
      if (!phase) continue;
      const definition = e.def.skills?.[action.skill - 1];
      const aimed = action.aimShot && definition
        ? this.stickAim(action.aimShot, definition)
        : t.touchMode && definition
          ? this.autoAim(definition)
          : null;
      const direction = aimed ? { x: aimed.dx, z: aimed.dz } : this.networkAimDirection(e, n) || { x: Math.sin(e.facing), z: Math.cos(e.facing) };
      const range = definition?.range || 0;
      const accepted = e.useSkill(
        action.skill,
        phase,
        direction.x,
        direction.z,
        aimed?.x ?? e.x + direction.x * range,
        aimed?.z ?? e.z + direction.z * range,
      );
      if (accepted && action.skill === 2 && phase === `start`) this.vibrate([12, 16, 18]);
      else if (accepted && phase === `activate`) this.vibrate([12, 16, 18]);
    }
    for (let n of t.takeShots()) {
      if (n.cancelled) continue;
      let t = n.kind === `super` ? e.def.super : e.def.attack,
        r = n.tap ? this.autoAim(t) : this.stickAim(n, t);
      let i =
        n.kind === `super`
          ? e.useSuper(r.dx, r.dz, r.x, r.z)
          : e.attack(r.dx, r.dz, r.x, r.z, n.held);
      i && this.vibrate(n.kind === `super` ? [18, 22, 32] : 10);
    }
    if (t.touchMode) {
      let n = t.sticks,
        skillPointer = [...t.skillPointers.values()].find((pointer) => pointer.moved),
        r =
          n.super.id !== null && n.super.moved && e.superReady
            ? `super`
            : n.aim.id !== null && n.aim.moved
              ? `attack`
              : null;
      if (skillPointer && !e.airborne) {
        const definition = e.def.skills?.[skillPointer.skill - 1];
        const skillAim = definition ? this.stickAim(skillPointer, definition) : null;
        if (skillAim) {
          ad.set(skillAim.x, 0.5, skillAim.z);
          const skillCharge = skillPointer.chargeStarted
            ? $c((performance.now() - skillPointer.startedAt) / Math.max(100, (definition.chargeTime || 1) * 1000), 0, 1)
            : 0;
          this.updateGuide(definition, `skill`, skillAim.dx, skillAim.dz, skillAim.dist, !1, skillCharge);
        } else this.guide.visible = !1;
      } else if (r && !e.airborne) {
        let t = this.stickAim(r === `super` ? n.super : n.aim, e.def[r]);
        (ad.set(e.x + t.dx * 5, 0.5, e.z + t.dz * 5), this.updateGuide(e.def[r], r, t.dx, t.dz, t.dist, r === `super`));
      } else (ad.set(e.x, 0.5, e.z), (this.guide.visible = !1));
      return;
    }
    (rd.set(t.ndcX, t.ndcY),
      nd.setFromCamera(rd, this.camera),
      nd.ray.intersectPlane(id, ad) || ad.set(e.x, 0.5, e.z + 1));
    let r = ad.x - e.x,
      i = ad.z - e.z,
      a = Math.hypot(r, i) || 1;
    ((r /= a), (i /= a));
    let o = t.consumeSuperRelease(),
      s = t.superHeld && e.superReady,
      releasedFire = t.consumeFireRelease();
    if (o && e.superReady) e.useSuper(r, i, ad.x, ad.z);
    else if (!s && e.def.id === `syafiah`) {
      releasedFire !== null && e.attack(r, i, ad.x, ad.z, releasedFire);
    } else if (t.fire && !s) e.attack(r, i, ad.x, ad.z);
    let c = s ? `super` : `attack`;
    e.airborne ? (this.guide.visible = !1) : this.updateGuide(e.def[c], c, r, i, a, s);
  }
  stickAim(e, t) {
    let n = this.player,
      r = Math.hypot(e.x, e.y) || 1,
      i = e.x / r,
      a = e.y / r,
      o = t.id === `flame`
        ? e.chargeStarted && Number.isFinite(e.startedAt) && performance.now() - e.startedAt >= (t.chargeTime || 1) * 1000
          ? t.chargedRange
          : t.tapRange
        : t.kind === `lob` || t.kind === `leap` || t.kind === `arrow-shower`
          ? Math.max(t.kind === `leap` ? 2 : 1, e.mag * t.range)
          : t.range;
    return { dx: i, dz: a, dist: o, x: n.x + i * o, z: n.z + a * o };
  }
  autoAim(e) {
    let t = this.player,
      chargeElapsed = e.id === `flame`
        ? t?.skill2Charge
          ? Math.max(0, this.matchTime - t.skill2Charge.startedAt)
          : t?.skill2Charging
            ? t.skill2ChargeT || 0
            : 0
        : 0,
      range = e.id === `flame`
        ? chargeElapsed >= (e.chargeTime || 1) ? e.chargedRange : e.tapRange
        : e.range,
      n = range * 1.05,
      r = 0,
      i = 0,
      a = 1 / 0;
    if (e.kind === `arrow-shower`) {
      let best = null,
        bestScore = -1;
      for (let target of this.brawlers) {
        if (target === t || !target.alive || target.hidden || target.airborne) continue;
        let distance = sl(t.x, t.z, target.x, target.z);
        if (distance > e.range) continue;
        let lead = e.warningDelay + 0.22,
          x = target.x + target.vel.x * lead,
          z = target.z + target.vel.y * lead,
          score = 0;
        for (let other of this.brawlers)
          if (other !== t && other.alive && !other.hidden && !other.airborne && Math.hypot(other.x + other.vel.x * lead - x, other.z + other.vel.y * lead - z) <= e.areaRadius)
            score++;
        score -= distance * 0.035;
        if (score > bestScore) ((bestScore = score), (best = { x, z }));
      }
      if (!best) {
        let distance = e.range * 0.7;
        best = { x: t.x + Math.sin(t.facing) * distance, z: t.z + Math.cos(t.facing) * distance };
      }
      let distance = Math.hypot(best.x - t.x, best.z - t.z) || 1,
        scale = Math.min(1, e.range / distance);
      best.x = t.x + (best.x - t.x) * scale;
      best.z = t.z + (best.z - t.z) * scale;
      distance = Math.hypot(best.x - t.x, best.z - t.z) || 1;
      return { dx: (best.x - t.x) / distance, dz: (best.z - t.z) / distance, dist: distance, x: best.x, z: best.z };
    }
    for (let o of this.brawlers) {
      if (o === t || !o.alive || o.hidden || o.airborne) continue;
      let s = sl(t.x, t.z, o.x, o.z);
      if (
        s > n ||
        s >= a ||
        ((e.kind === `burst` || e.kind === `spread` || e.kind === `melee`) &&
          !this.world.hasLineOfSight(t.x, t.z, o.x, o.z))
      )
        continue;
      let c = e.kind === `lob` ? e.flight + e.fuse * 0.6 : e.kind === `leap` ? e.flight : s / (e.speed || 15);
      ((a = s), (r = o.x + o.vel.x * c * 0.7), (i = o.z + o.vel.y * c * 0.7));
    }
    if (a === 1 / 0)
      for (let e of this.combat.boxes) {
        if (!e.alive) continue;
        let o = sl(t.x, t.z, e.x, e.z);
        o > n || o >= a || ((a = o), (r = e.x), (i = e.z));
      }
    if (a === 1 / 0) {
      let n = e.kind === `lob` || e.kind === `leap` ? range * 0.6 : range;
      ((r = t.x + Math.sin(t.facing) * n), (i = t.z + Math.cos(t.facing) * n));
    }
    let o = Math.hypot(r - t.x, i - t.z) || 1;
    return { dx: (r - t.x) / o, dz: (i - t.z) / o, dist: o, x: r, z: i };
  }
  separateBrawlers() {
    let e = this.brawlers,
      t = Ic * 1.9;
    for (let n = 0; n < e.length; n++) {
      let r = e[n];
      if (r.alive && !r.airborne)
        for (let i = n + 1; i < e.length; i++) {
          let n = e[i];
          if (!n.alive || n.airborne) continue;
          let a = n.x - r.x,
            o = n.z - r.z,
            s = Math.hypot(a, o);
          if (s >= t || s < 1e-4) continue;
          let c = (t - s) * 0.5,
            l = a / s,
            u = o / s;
          ((r.root.position.x -= l * c),
            (r.root.position.z -= u * c),
            (n.root.position.x += l * c),
            (n.root.position.z += u * c));
        }
    }
  }
  updateVisibility() {
    let e = this.player && this.player.alive ? this.player : null,
      t = this.world.grassUniforms.uPushers.value,
      concealment = this.world.biomeGameplay?.bushConcealment ?? 1,
      n = 0;
    for (let r of this.brawlers) {
      let i = !1;
      if (
        (e && r !== e && r.alive && r.inBush && r.revealT <= 0 && (i = sl(e.x, e.z, r.x, r.z) > 2.4 * concealment),
        (r.hidden = i),
        r.alive && (r.root.visible = !i),
        n < 8)
      ) {
        let e = Math.min(1, r.vel.length() / 3),
          a = r.alive && !i && !r.airborne ? 0.55 + e * 0.45 : 0;
        t[n++].set(r.x, r.z, 1.05, a);
      }
    }
    for (; n < 8;) t[n++].set(0, 0, 1, 0);
    let r = this.world.grassUniforms.uReveal.value;
    e ? r.set(e.x, e.z, 0, +!!e.inBush) : r.set(0, 0, 0, 0);
  }
  updateTime(e) {
    this.autoTime &&
      (this.state === `menu`
        ? this.lighting.setTime(this.lighting.time + e * 0.4)
        : this.lighting.setTime(el(Lc.startHour, Lc.endHour, $c(this.matchTime / Lc.dayLength, 0, 1))));
  }
  updateCamera(e) {
    let t = this.camera,
      n = t.aspect,
      r = $c(1.55 / n, 1, 1.75);
    if (this.state === `menu`) {
      this.menuAngle += e * 0.05;
      let n = 27 * r;
      (this.focus.set(0, 0, -1),
        t.position.set(Math.sin(this.menuAngle) * n * 0.55, 30 * r, 9 + Math.cos(this.menuAngle) * n * 0.62),
        t.lookAt(this.focus));
      return;
    }
    let i =
      this.player && this.player.alive
        ? this.player
        : this.spectate && this.spectate.alive
          ? this.spectate
          : this.brawlers.find((e) => e.alive);
    if (i) {
      let t = i.x,
        n = i.z;
      (i === this.player &&
        this.state === `playing` &&
        ((this.leanX = nl(this.leanX, $c(ad.x - i.x, -8, 8) * 0.09, 2.2, e)),
        (this.leanZ = nl(this.leanZ, $c(ad.z - i.z, -8, 8) * 0.09, 2.2, e)),
        (t += this.leanX),
        (n += this.leanZ)),
        (t = $c(t, -14, 14)),
        (n = $c(n, -15, 17)),
        (this.focus.x = nl(this.focus.x, t, 5.5, e)),
        (this.focus.z = nl(this.focus.z, n, 5.5, e)));
    }
    let a = this.state === `countdown` ? tl(0.4, 3.2, this.countdownT) : 0,
      o = $u * r * this.camZoom * (1 + a * 0.75);
    this.shakeAmp = nl(this.shakeAmp, 0, 9, e);
    let s = this.shakeAmp,
      c = this.elapsed,
      l = Math.sin(c * 43) * s * 0.3,
      u = Math.cos(c * 37 + 1.3) * s * 0.22;
    (t.position.set(this.focus.x + l, Math.sin(Qu) * o, this.focus.z + Math.cos(Qu) * o + u),
      t.lookAt(this.focus.x + l, 0, this.focus.z + u));
  }
  update(e) {
    if ((this.pipeline.resize(), this.paused)) {
      (this.updateCamera(0),
        this.world.update(e, this.elapsed),
        this.lighting.update(e, this.elapsed, this.camera, this.focus, !0),
        this.hud.update(0));
      return;
    }
    if (this.networkSession) {
      this.updateNetwork(e);
      return;
    }
    if (((this.elapsed += e), this.state === `countdown`)) {
      this.countdownT -= e;
      let t = Math.ceil(this.countdownT - 0.4);
      (t !== this.lastCount &&
        t >= 1 &&
        t <= 3 &&
        ((this.lastCount = t), this.hud.banner(String(t), 0.8), this.audio.play(`count`)),
        this.countdownT <= 0.4 &&
          this.lastCount !== 0 &&
          ((this.lastCount = 0),
          (this.state = `playing`),
          this.lighting.resetShadowFit(),
          this.hud.banner(`BRAWL!`, 0.9),
          this.audio.play(`go`)));
    } else
      this.state !== `menu` &&
        (this.modeName !== `deathmatch` || this.state === `playing`) &&
        (this.matchTime += e);
    if (!(this.modeName === `deathmatch` && this.state === `ended`)) {
      (this.updateAdaptiveDifficulty(e), this.controlPlayer());
      for (let t of this.brains) t.update(e);
      for (let t of this.brawlers) t.update(e);
      this.separateBrawlers();
      this.combat.update(e);
      this.updateTimedTraps(e);
      this.updateRespawnCountdown();
      if (this.state !== `menu` && this.modeName !== `deathmatch`) {
        let t = this.gas.active;
        (this.gas.update(e, this.matchTime),
          !t && this.gas.active && this.hud.banner(`POISON GAS IS CLOSING IN!`, 2.2, !0));
      }
    }
    if (this.modeName === `deathmatch` && this.state === `playing` && this.matchTime >= this.mode.timeLimit)
      this.endDeathmatch();
    (this.effects.update(e),
      this.updateVisibility(),
      this.updateTime(e),
      this.updateCamera(e),
      this.world.update(e, this.elapsed));
    let t = this.lighting;
    for (let e of this.brawlers)
      e.alive &&
        !e.hidden &&
        e.superReady &&
        t.addLight(e.x, 0.9, e.z, od, 1.5 + Math.sin(this.elapsed * 6) * 0.4, 3.6);
    let n = this.player;
    if (
      (n && n.alive && t.night > 0.02 && t.addLight(n.x, 1.9, n.z, sd, 2.4 * t.night, 6.5),
      (this.audio.listener.x = this.focus.x),
      (this.audio.listener.z = this.focus.z),
      t.update(e, this.elapsed, this.camera, this.focus),
      this.state === `menu`)
    ) {
      let t = this.brawlers.reduce((e, t) => e + +!!t.alive, 0);
      ((this.attractT = t <= 1 ? this.attractT + e : 0), this.attractT > 2.5 && this.toMenu());
    }
    if (this.pendingResult && ((this.pendingResult.t -= e), this.pendingResult.t <= 0)) {
      let e = this.pendingResult;
      ((this.pendingResult = null),
        this.hud.showResult(e.won, e.rank, this.brawlers.length, this.player.kills, this.player.cubes));
    }
    this.hud.update(e);
  }
  benchmarkQuality() {
    if (this.userPickedQuality || this.pipeline.isWebGPU) return;
    let e = this.pipeline.renderer,
      t = e.getContext(),
      n = new Uint8Array(4),
      r = [`ultra`, `high`, `medium`, `low`],
      i = this.lighting.time;
    this.lighting.setTime(21.5);
    for (let i = 0; i < 3; i++) {
      let i = [];
      for (let r = 0; r < 10; r++) {
        let r = performance.now();
        (this.lighting.update(0, this.elapsed, this.camera, this.focus, !0),
          this.pipeline.render(0),
          e.setRenderTarget(null),
          t.readPixels(0, 0, 1, 1, t.RGBA, t.UNSIGNED_BYTE, n),
          i.push(performance.now() - r));
      }
      (i.splice(0, 4), i.sort((e, t) => e - t));
      let a = i[Math.floor(i.length / 2)],
        o = r.indexOf(this.pipeline.qualityName);
      if (((this.perf.benchMs = a), a <= 20 || o >= r.length - 1)) break;
      (this.setQuality(r[o + 1]),
        this.hud.toast(`${Uc[r[o + 1]].label} quality picked for this GPU - change it any time under ⚙`));
    }
    this.lighting.setTime(i);
  }
  adaptQuality(e) {
    let t = this.perf;
    if (
      this.state !== `playing` ||
      this.paused ||
      document.hidden ||
      ((t.t += Math.max(0, e)), t.frames++, t.t < (this.userPickedQuality ? 3 : 6))
    )
      return;
    let n = t.frames / t.t;
    ((t.t = 0), (t.frames = 0));
    let r = [`ultra`, `high`, `medium`, `low`],
      i = r.indexOf(this.pipeline.qualityName);
    n < (this.userPickedQuality ? 18 : 24) &&
      i < r.length - 1 &&
      (this.setQuality(r[i + 1]),
      this.hud.toast(`Running at ${Math.round(n)} fps - switched to ${Uc[r[i + 1]].label} quality to keep the match responsive`));
  }
  recordFrameTiming(e, t, n) {
    let r = this.frameTiming,
      i = r.index;
    ((r.update[i] = e), (r.render[i] = t), (r.index = (i + 1) % r.update.length), (r.count = Math.min(r.count + 1, r.update.length)),
      (this.frameStats.updateMs = e),
      (this.frameStats.renderMs = t),
      (r.elapsed += n));
    if (r.elapsed < 0.5) return;
    let quantile = (e) => {
      let t = Array.from(e.subarray(0, r.count)).sort((e, t) => e - t);
      return t[Math.min(t.length - 1, Math.ceil(t.length * 0.95) - 1)] || 0;
    };
    ((this.frameStats.updateP95Ms = quantile(r.update)),
      (this.frameStats.renderP95Ms = quantile(r.render)),
      (r.elapsed = 0));
  }
  frame(e) {
    let t = (e - this.last) / 1e3,
      n = Math.min(0.05, Math.max(1e-4, t));
    this.last = e;
    let r = this.pipeline.renderer.info;
    ((this.frameStats.calls = r.render.calls), (this.frameStats.triangles = r.render.triangles), r.reset());
    let updateStart = performance.now();
    for (let e = 0; e < this.simSteps; e++) this.update(n);
    let updateMs = performance.now() - updateStart,
      renderStart = performance.now();
    (this.pipeline.render(n),
      this.recordFrameTiming(updateMs, performance.now() - renderStart, t),
      this.warmup > 0 &&
        --this.warmup === 0 &&
        (this.benchmarkQuality(),
        (this.last = performance.now()),
        document.getElementById(`loading`).classList.add(`done`)),
      this.adaptQuality(t),
      requestAnimationFrame(this.frame));
  }
};
function ud(e) {
  let t = new ld(e || {});
  window.__game = t;
  if (window.__GBH_PENDING_NETWORK_MATCH__) {
    const pending = window.__GBH_PENDING_NETWORK_MATCH__;
    delete window.__GBH_PENDING_NETWORK_MATCH__;
    t.startNetworkMatch(pending.session, pending.init);
  }
  try {
    window.claude?.hot?.snapshot?.(() => ({ selected: t.hud.selected }));
  } catch {}
}
var dd = window.claude?.hot;
dd?.ready ? dd.ready(ud) : ud(dd?.data ?? {});
