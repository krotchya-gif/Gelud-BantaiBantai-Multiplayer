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
      (this.mobileDefaultQuality = n && !qualityChoice),
      (this.mobileDefaultEffects = {
        ao: this.mobileDefaultQuality && typeof t.ao !== `boolean`,
        bloom: this.mobileDefaultQuality && typeof t.bloom !== `boolean`,
      }),
      typeof t.ao === `boolean`
        ? (this.pipeline.toggles.ao = t.ao)
        : this.mobileDefaultEffects.ao && (this.pipeline.toggles.ao = !1),
      typeof t.bloom === `boolean`
        ? (this.pipeline.toggles.bloom = t.bloom)
        : this.mobileDefaultEffects.bloom && (this.pipeline.toggles.bloom = !1));
    let r = requestedQuality || (n ? `low` : `high`);
    ((this.userPickedQuality = qualityChoice),
      (this.pipeline.superSample = $c(parseFloat(this.params.get(`ss`)) || 0, 0, 3)),
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
      this.mobileDefaultQuality && (this.lighting.key.castShadow = !1),
      this.pipeline.requestShadowUpdate(!0),
      (this.audio = new Xu()),
      (this.audio.muted = !!t.muted),
      (this.input = new Gu(this.pipeline.renderer.domElement, document.getElementById(`super`))),
      (this.input.onTouchMode = (e) => this.hud.setTouchMode(e)),
      (this.elapsed = 0),
      (this.matchTime = 0),
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
          t === `KeyF` && this.useHeldItem() && e.preventDefault(),
          t === `KeyP` && [`countdown`, `playing`].includes(this.state) && this.setPaused(!this.paused),
          t === `Escape` &&
            (this.paused
              ? this.setPaused(!1)
              : ($(`settings`).classList.remove(`open`), $(`gear`).setAttribute(`aria-expanded`, `false`))));
      }),
      this.hud.syncSettings(),
      (() => {
        let button = $(`item-action`),
          touchActivationAt = 0,
          touchPointerId = null;
        button.addEventListener(`pointerdown`, (event) => {
          if (event.pointerType !== `touch`) return;
          event.preventDefault();
          event.stopPropagation();
          touchPointerId = event.pointerId;
          touchActivationAt = performance.now();
          this.useHeldItem();
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
          this.useHeldItem();
        });
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
      (this.mobileDefaultQuality = !1),
      [`ao`, `bloom`].forEach((e) => {
        this.mobileDefaultEffects[e] && ((this.pipeline.toggles[e] = !0), (this.mobileDefaultEffects[e] = !1));
      })),
      this.pipeline.setQuality(e),
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
      n = cd(t.spawns.slice()),
      r = cd(Vc.slice()),
      i = Object.keys(Bc),
      a = Lc.bots + 1;
    for (let o = 0; o < a; o++) {
      let [a, s] = n[o % n.length],
        c = o === 0 && !!e,
        l = Bc[c ? e : i[(o + Math.floor(Math.random() * i.length)) % i.length]],
        u = new fu(this, l, {
          isPlayer: c,
          name: c ? `YOU` : r[o % r.length],
          x: t.center(a),
          z: t.center(s),
          hueShift: c ? 0 : Q(-0.07, 0.07),
        });
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
  useHeldItem() {
    if (this.networkSession) {
      const player = this.player;
      if (this.paused || this.state !== `playing` || !player?.heldItem) return !1;
      this.networkSession.sendItem();
      this.vibrate(12);
      return !0;
    }
    if (this.paused || this.state !== `playing` || !this.player?.useHeldItem()) return !1;
    this.vibrate(12);
    return !0;
  }
  toMenu() {
    if (this.networkSession) {
      this.networkSession.network.emit(`match:leave`);
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
    this.networkEntities = new Map();
    this.networkProjectiles = new Map();
    this.networkItems = new Map();
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
      brawler.networkId = player.id;
      this.brawlers.push(brawler);
      this.networkEntities.set(player.id, brawler);
      this.hud.addBrawler(brawler);
      if (player.id === session.localPlayerId) this.player = brawler;
    }
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
  updateNetwork(e) {
    this.elapsed += e;
    this.matchTime += e;
    this.networkInputT -= e;
    if (this.networkInputT <= 0 && this.networkSession) {
      this.networkInputT += 1 / 30;
      const axis = this.input.axis();
      const player = this.player;
      const aimX = player ? Math.sin(player.facing) : 0;
      const aimZ = player ? Math.cos(player.facing) : 1;
      this.networkSession.sendMovement({ moveX: axis.x, moveZ: axis.z, aimX, aimZ });
    }
    const player = this.player;
    if (player && this.networkSession) {
      for (const shot of this.input.takeShots()) {
        if (shot.cancelled) continue;
        const kind = shot.kind === `super` ? `super` : `attack`;
        const aim = this.stickAim(shot, player.def[kind]);
        if (kind === `super`) this.networkSession.sendSuper(aim.dx, aim.dz, aim.x, aim.z);
        else {
          this.networkSession.sendAttackStart(aim.dx, aim.dz);
          if (player.def.id === `syafiah`) this.networkSession.sendAttackRelease(aim.dx, aim.dz);
        }
      }
      if (!this.input.touchMode) {
        if (this.input.consumeSuperRelease()) {
          this.networkSession.sendSuper(Math.sin(player.facing), Math.cos(player.facing), player.x + Math.sin(player.facing) * player.def.super.range, player.z + Math.cos(player.facing) * player.def.super.range);
        }
        if (this.input.fire && !this.networkFire) {
          this.networkFire = true;
          this.networkSession.sendAttackStart(Math.sin(player.facing), Math.cos(player.facing));
        } else if (!this.input.fire && this.networkFire) {
          this.networkFire = false;
          if (player.def.id === `syafiah`) {
            this.networkSession.sendAttackRelease(Math.sin(player.facing), Math.cos(player.facing));
          }
        }
      }
    }
    if (this.networkSession?.localPlayer && this.player) {
      const predicted = this.networkSession.localPlayer;
      this.player.root.position.set(predicted.x, 0, predicted.z);
      this.player.facing = predicted.facing;
      this.player.root.rotation.y = -predicted.facing;
    }
    const snapshot = this.networkSession?.renderState(Date.now());
    if (snapshot) {
      for (const remote of snapshot.players || []) {
        const entity = this.networkEntities.get(remote.id);
        if (!entity) continue;
        if (remote.id === this.networkSession.localPlayerId) continue;
        entity.root.position.set(remote.x, 0, remote.z);
        entity.facing = remote.facing;
        entity.root.rotation.y = -remote.facing;
        entity.hp = remote.hp;
        entity.maxHp = remote.maxHp;
        entity.kills = remote.kills || 0;
        entity.deaths = remote.deaths || 0;
        entity.alive = remote.alive;
        entity.superCharge = remote.superCharge || 0;
        entity.heldItem = remote.heldItem || null;
        entity.shieldT = remote.shieldT || 0;
        entity.itemSpeedT = remote.speedBoostT || 0;
        entity.spawnT = remote.spawnProtectionT || 0;
        entity.root.visible = remote.alive;
      }
      const local = snapshot.players?.find((remote) => remote.id === this.networkSession.localPlayerId);
      if (local) {
        this.focus.set(local.x, 0, local.z);
        if (this.player) {
          this.player.hp = local.hp;
          this.player.maxHp = local.maxHp;
          this.player.kills = local.kills || 0;
          this.player.deaths = local.deaths || 0;
          this.player.superCharge = local.superCharge || 0;
          this.player.heldItem = local.heldItem || null;
          this.player.shieldT = local.shieldT || 0;
          this.player.itemSpeedT = local.speedBoostT || 0;
        }
      }
      this.syncNetworkProjectiles(snapshot.projectiles || []);
      this.syncNetworkItems(snapshot.items || []);
    }
    this.updateVisibility();
    this.updateTime(e);
    this.updateCamera(e);
    this.world.update(e, this.elapsed);
    this.effects.update(e);
    this.audio.listener.x = this.focus.x;
    this.audio.listener.z = this.focus.z;
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
    const entity = event.ownerId ? this.networkEntities.get(event.ownerId) : null;
    if (event.type === `DAMAGE`) {
      const target = this.networkEntities.get(event.targetId);
      if (target && target.isPlayer) this.onPlayerHurt(event.amount);
      target && this.effects.impact(target.x, 0.72, target.z, target.lightColor, 5);
    } else if (event.type === `DEATH`) {
      const target = this.networkEntities.get(event.targetId);
      if (target) {
        target.alive = false;
        target.root.visible = false;
        this.effects.defeat(target.x, target.z, target.lightColor);
      }
      const attacker = event.attackerId ? this.networkEntities.get(event.attackerId) : null;
      const victim = target;
      if (attacker && victim) this.hud.feed(`<span class="k">${attacker.name}</span> ⚔ <span class="v">${victim.name}</span>`);
    } else if (event.type === `RESPAWN`) {
      const target = this.networkEntities.get(event.playerId);
      if (target) { target.alive = true; target.hp = target.maxHp; target.root.visible = true; target.root.position.set(event.x, 0, event.z); }
    } else if (event.type === `SUPER_USED` || event.type === `SUPER_ZONE` || event.type === `SUPER_WAVE`) {
      const x = Number.isFinite(event.targetX) ? event.targetX : event.x ?? entity?.x;
      const z = Number.isFinite(event.targetZ) ? event.targetZ : event.z ?? entity?.z;
      if (Number.isFinite(x) && Number.isFinite(z)) this.effects.burst(x, 0.7, z, entity?.superColor || 0xd0a2ff, event.type === `SUPER_WAVE` ? 8 : 14, event.type === `SUPER_ZONE` ? 4 : 3);
    } else if (event.type === `ITEM_PICKUP` || event.type === `ITEM_USED`) {
      const x = entity?.x || 0; const z = entity?.z || 0;
      this.effects.burst(x, 0.7, z, entity?.superColor || 0xffc93a, 8, 2.5);
    } else if (event.type === `MELEE_SWING`) {
      if (entity) this.effects.slash?.(entity.x, entity.z, entity.superColor || entity.lightColor);
    }
  }
  syncNetworkProjectiles(projectiles) {
    const seen = new Set();
    for (const projectile of projectiles) {
      seen.add(projectile.id);
      let mesh = this.networkProjectiles.get(projectile.id);
      if (!mesh) {
        const material = new Tn({ color: projectile.isSuper ? 0xffe08a : 0x9affdf, emissive: projectile.isSuper ? 0x7a3f0b : 0x164e4e, emissiveIntensity: 1.8, roughness: 0.3, metalness: 0.1 });
        mesh = new Ln(new fr(0.2, 0.2, 0.2), material);
        mesh.userData.networkProjectile = true;
        this.scene.add(mesh);
        this.networkProjectiles.set(projectile.id, mesh);
      }
      mesh.position.set(projectile.x, 0.72, projectile.z);
      mesh.rotation.y = Math.atan2(projectile.dirX, projectile.dirZ);
      mesh.scale.set(projectile.radius > 0.25 ? 1.6 : 1, projectile.radius > 0.25 ? 1.6 : 1, projectile.radius > 0.25 ? 1.6 : 1);
    }
    for (const [id, mesh] of this.networkProjectiles) {
      if (seen.has(id)) continue;
      this.scene.remove(mesh);
      mesh.geometry?.dispose?.();
      mesh.material?.dispose?.();
      this.networkProjectiles.delete(id);
    }
  }
  syncNetworkItems(items) {
    const seen = new Set();
    for (const item of items) {
      seen.add(item.id);
      let mesh = this.networkItems.get(item.id);
      if (!mesh) {
        const colors = { heal: 0x7dff9a, shield: 0x7ceaff, speed: 0xffd15c, ammo: 0xff956d, super: 0xd0a2ff };
        mesh = new Ln(new fr(0.45, 0.45, 0.45), new Tn({ color: colors[item.kind] || 0xffc93a, emissive: colors[item.kind] || 0xffc93a, emissiveIntensity: 1.4, roughness: 0.28 }));
        mesh.userData.networkItem = true;
        this.scene.add(mesh);
        this.networkItems.set(item.id, mesh);
      }
      mesh.visible = true;
      mesh.position.set(item.x, 0.55 + Math.sin(this.elapsed * 4 + item.x) * 0.08, item.z);
      mesh.rotation.y += 0.04;
    }
    for (const [id, mesh] of this.networkItems) {
      if (seen.has(id)) continue;
      mesh.visible = false;
    }
  }
  clearNetworkVisuals() {
    for (const collection of [this.networkProjectiles, this.networkItems]) {
      if (!collection) continue;
      for (const mesh of collection.values()) {
        this.scene.remove(mesh);
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
      }
      collection.clear();
    }
    this.networkProjectiles = null;
    this.networkItems = null;
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
      (e.ammo = 3),
      (e.reloadT = 0),
      (e.superCharge = 0),
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
  updateGuide(e, t, n, r, i, a) {
    let o = this.player,
      s = this.guide;
    ((s.visible = !0), s.position.set(o.x, 0.06, o.z), (s.rotation.y = Math.atan2(n, r) - Math.PI / 2));
    let c = a ? 16765498 : 16777215,
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
        r =
          n.super.id !== null && n.super.moved && e.superReady
            ? `super`
            : n.aim.id !== null && n.aim.moved
              ? `attack`
              : null;
      if (r && !e.airborne) {
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
      o = t.kind === `lob` || t.kind === `leap` || t.kind === `arrow-shower`
        ? Math.max(t.kind === `leap` ? 2 : 1, e.mag * t.range)
        : t.range;
    return { dx: i, dz: a, dist: o, x: n.x + i * o, z: n.z + a * o };
  }
  autoAim(e) {
    let t = this.player,
      n = e.range * 1.05,
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
      let n = e.kind === `lob` || e.kind === `leap` ? e.range * 0.6 : e.range;
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
      this.userPickedQuality ||
      this.state !== `playing` ||
      this.paused ||
      document.hidden ||
      e > 0.1 ||
      ((t.t += e), t.frames++, t.t < 6)
    )
      return;
    let n = t.frames / t.t;
    ((t.t = 0), (t.frames = 0));
    let r = [`ultra`, `high`, `medium`, `low`],
      i = r.indexOf(this.pipeline.qualityName);
    n < 24 &&
      i < r.length - 1 &&
      (this.setQuality(r[i + 1]),
      this.hud.toast(`Running at ${Math.round(n)} fps - switched to ${Uc[r[i + 1]].label} quality`));
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
