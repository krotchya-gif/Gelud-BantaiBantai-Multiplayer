function xu() {
  let e = (e) => {
    let t = al(128, 128),
      n = t.getContext(`2d`);
    if (e) ((n.fillStyle = `#000`), n.fillRect(0, 0, 128, 128));
    else {
      ((n.fillStyle = `#5d4a86`), n.fillRect(0, 0, 128, 128));
      for (let e = 0; e < 4; e++) ((n.fillStyle = e % 2 ? `#584480` : `#65518f`), n.fillRect(0, e * 32, 128, 30));
      ((n.strokeStyle = `#33264f`), (n.lineWidth = 16), n.strokeRect(8, 8, 112, 112));
    }
    ((n.fillStyle = e ? `#7dffb0` : `#2fe07a`),
      n.beginPath(),
      n.moveTo(72, 22),
      n.lineTo(40, 70),
      n.lineTo(60, 70),
      n.lineTo(52, 106),
      n.lineTo(90, 54),
      n.lineTo(68, 54),
      n.closePath(),
      n.fill(),
      e && ((n.strokeStyle = `#2aff80`), (n.lineWidth = 3), n.strokeRect(17, 17, 94, 94)));
    let r = new cr(t);
    return ((r.colorSpace = k), r);
  };
  return { map: e(!1), emissiveMap: e(!0) };
}
var Su = class {
    constructor(e) {
      ((this.game = e),
        (this.bullets = []),
        (this.bombs = []),
        (this.boxes = []),
        (this.cubes = []),
        (this.cubePool = []),
        (this.items = []),
        (this.itemPool = []),
        (this.arrowShowers = []),
        (this.arrowFalls = []));
      let t = new xr(1, 10, 8);
      ((this.bulletMesh = new Yn(t, new Tn({ color: 16777215 }), bu)),
        (this.bulletMesh.count = 0),
        (this.bulletMesh.frustumCulled = !1),
        (this.bulletMesh.userData.noAO = !0),
        this.bulletMesh.setColorAt(0, vu.set(1, 1, 1)),
        e.scene.add(this.bulletMesh),
        (this.bombPool = []));
      this.weaponProjectiles = {};
      for (let kind of [`shuriken`, `arrow`]) {
        let mesh = new Yn(brawlerProjectileGeometry(kind), new Tn({ color: kind === `arrow` ? 0xe7c58b : 0xd4e2de }), bu);
        mesh.count = 0;
        mesh.frustumCulled = !1;
        mesh.userData.noAO = !0;
        e.scene.add(mesh);
        this.weaponProjectiles[kind] = mesh;
      }
      this.arrowShowerDiscGeometry = new mr(3.4, 48).rotateX(-Math.PI / 2);
      this.arrowShowerRingGeometry = new br(3.22, 3.4, 64).rotateX(-Math.PI / 2);
      this.arrowShowerDiscMaterial = new Tn({ color: 0xffd17a, transparent: !0, opacity: 0.18, depthWrite: !1 });
      this.arrowShowerRingMaterial = new Tn({ color: 0xffe5a5, transparent: !0, opacity: 0.92, depthWrite: !1 });
      this.arrowShowerColor = new J(0xffd17a);
      let n = new xr(0.2, 16, 12),
        r = new Nr({ color: 1776418, roughness: 0.35, metalness: 0.3 }),
        i = new xr(0.07, 8, 6);
      for (let t = 0; t < 14; t++) {
        let t = new ut(),
          a = new Ln(n, r);
        a.castShadow = !0;
        let o = new Ln(i, new Tn({ color: new J(6, 2.4, 0.5) }));
        (o.position.set(0, 0.24, 0), (o.userData.noAO = !0), t.add(a, o), (t.visible = !1), e.scene.add(t));
        let s = new Ln(
            new br(0.93, 1, 56).rotateX(-Math.PI / 2),
            new Tn({ color: 16728112, transparent: !0, opacity: 0, depthWrite: !1 }),
          ),
          c = new Ln(
            new mr(0.93, 48).rotateX(-Math.PI / 2),
            new Tn({ color: 16728112, transparent: !0, opacity: 0, depthWrite: !1 }),
          );
        (s.add(c),
          (s.position.y = 0.05),
          (s.visible = !1),
          (s.userData.noAO = !0),
          (s.renderOrder = 2),
          e.scene.add(s),
          this.bombPool.push({ group: t, ring: s, fillDisc: c, spark: o, busy: !1 }));
      }
      let a = xu();
      ((this.boxGeo = new fr(0.92, 0.92, 0.92)),
        (this.boxTex = a),
        (this.cubeGeo = new fr(0.34, 0.34, 0.34)),
        (this.cubeMat = new Nr({
          color: 1870410,
          emissive: 3211136,
          emissiveIntensity: 2.4,
          roughness: 0.25,
          metalness: 0.2,
        })),
        (this.cubeLight = new J(4259722)),
        (this.itemGeo = new fr(0.4, 0.4, 0.4)),
        (this.itemMaterials = {
          shield: new Nr({ color: 0x7ceaff, emissive: 0x208db4, emissiveIntensity: 2.6, roughness: 0.28, metalness: 0.16 }),
          speed: new Nr({ color: 0xffd15c, emissive: 0xb36a10, emissiveIntensity: 2.5, roughness: 0.3, metalness: 0.12 }),
          heal: new Nr({ color: 0x7dff9a, emissive: 0x168b3b, emissiveIntensity: 2.5, roughness: 0.28, metalness: 0.08 }),
          ammo: new Nr({ color: 0xff956d, emissive: 0xb53721, emissiveIntensity: 2.4, roughness: 0.3, metalness: 0.12 }),
          super: new Nr({ color: 0xd0a2ff, emissive: 0x7534c4, emissiveIntensity: 2.8, roughness: 0.24, metalness: 0.22 }),
        }),
        (this.itemLights = {
          shield: new J(0x57dfff),
          speed: new J(0xffc43c),
          heal: new J(0x54ff82),
          ammo: new J(0xff7959),
          super: new J(0xc887ff),
        }),
        (this.orange = new J(16747066)));
    }
    addBox(e, t) {
      let n = this.game.world,
        r = new Nr({
          map: this.boxTex.map,
          emissiveMap: this.boxTex.emissiveMap,
          emissive: 16777215,
          emissiveIntensity: 1.4,
          roughness: 0.7,
        }),
        i = new Ln(this.boxGeo, r);
      (i.position.set(n.center(e), 0.46, n.center(t)),
        (i.castShadow = !0),
        (i.receiveShadow = !0),
        this.game.scene.add(i),
        n.setBlocker(e, t, !0));
      let a = {
        tx: e,
        ty: t,
        x: i.position.x,
        z: i.position.z,
        hp: Lc.boxHp,
        maxHp: Lc.boxHp,
        mesh: i,
        mat: r,
        shake: 0,
        alive: !0,
        isBox: !0,
      };
      return (this.boxes.push(a), a);
    }
    boxAt(e, t) {
      for (let n of this.boxes) if (n.alive && n.tx === e && n.ty === t) return n;
      return null;
    }
    damageBox(e, t, n) {
      e.alive &&
        ((e.hp -= t),
        (e.shake = 1),
        this.game.hud.floatText(e.x, 1.2, e.z, `${Math.round(t)}`, `dmg`),
        n && (n.lastCombat = this.game.elapsed),
        e.hp <= 0 &&
          ((e.alive = !1),
          this.game.scene.remove(e.mesh),
          e.mat.dispose(),
          this.game.world.setBlocker(e.tx, e.ty, !1),
          this.game.effects.debris(e.x, 0.5, e.z, 6968470, 9),
          this.game.effects.burst(e.x, 0.6, e.z, this.cubeLight, 16, 4.5),
          this.game.effects.flash(e.x, 0.8, e.z, this.cubeLight, 9, 6, 0.3),
          this.game.audio.play(`crate`, e.x, e.z),
          this.spawnItem(e.x, e.z)));
    }
    spawnCube(e, t, n, r) {
      let cube = this.cubePool.pop();
      if (!cube) {
        let mesh = new Ln(this.cubeGeo, this.cubeMat);
        ((mesh.castShadow = !0), (cube = { mesh, sx: 0, sz: 0, x: 0, z: 0, t: 0, alive: !1, phase: 0 }));
      }
      ((cube.sx = e),
        (cube.sz = t),
        (cube.x = n),
        (cube.z = r),
        (cube.t = 0),
        (cube.alive = !0),
        (cube.phase = Math.random() * 6),
        (cube.mesh.visible = !0),
        cube.mesh.position.set(e, 0.5, t),
        cube.mesh.rotation.set(0.6, this.game.elapsed * 1.8 + cube.phase, 0.6),
        this.game.scene.add(cube.mesh),
        this.cubes.push(cube));
    }
    spawnItem(e, t) {
      let roll = Math.random(),
        kind = roll < 0.26 ? `heal` : roll < 0.5 ? `shield` : roll < 0.7 ? `speed` : roll < 0.89 ? `ammo` : `super`,
        angle = Math.random() * Math.PI * 2,
        landing = this.game.world.nearestOpen(e + Math.cos(angle) * 0.65, t + Math.sin(angle) * 0.65),
        item = this.itemPool.pop();
      if (!item) {
        let mesh = new Ln(this.itemGeo, this.itemMaterials[kind]);
        ((mesh.castShadow = !1), (mesh.receiveShadow = !1), (mesh.userData.noAO = !0));
        item = { mesh, kind, sx: 0, sz: 0, x: 0, z: 0, t: 0, life: 0, phase: 0, alive: !1 };
      }
      ((item.kind = kind),
        (item.sx = e),
        (item.sz = t),
        (item.x = landing.x),
        (item.z = landing.z),
        (item.t = 0),
        (item.life = 24),
        (item.phase = Math.random() * 6),
        (item.alive = !0),
        (item.mesh.material = this.itemMaterials[kind]),
        (item.mesh.visible = !0),
        item.mesh.position.set(e, 0.55, t),
        item.mesh.rotation.set(0.25, item.phase, 0.25),
        this.game.scene.add(item.mesh),
        this.items.push(item));
    }
    removeItem(item) {
      (this.game.scene.remove(item.mesh), (item.mesh.visible = !1), (item.alive = !1), this.itemPool.push(item));
    }
    dropCubes(e, t, n) {
      let r = this.game.world;
      for (let i = 0; i < n; i++) {
        let a = (i / n) * Math.PI * 2 + Math.random(),
          o = n === 1 ? 0 : 0.7 + Math.random() * 0.5,
          s = r.nearestOpen(e + Math.cos(a) * o, t + Math.sin(a) * o);
        this.spawnCube(e, t, s.x, s.z);
      }
    }
    spawnBullet(e, t, n, r, i, a, o, s) {
      if (this.bullets.length >= bu) return;
      let c = e.bulletColor(o).clone();
      this.bullets.push({
        owner: e,
        x: t,
        z: n,
        dx: r,
        dz: i,
        a,
        isSuper: o,
        speed: s,
        travel: 0,
        range: a.range,
        radius: a.radius,
        damage: a.damage * e.damageMul,
        returnDamage: a.returnDamageMultiplier === undefined ? null : a.damage * e.damageMul * a.returnDamageMultiplier,
        color: c,
        alive: !0,
        trail: 0,
        melee: a.kind === `melee`,
        attackId: e.attackSerial,
        phaseTravel: 0,
        returning: !1,
        hitTargets: new Set(),
      });
    }
    beginReturn(projectile) {
      if (!projectile.a.returning || projectile.returning) return !1;
      ((projectile.returning = !0),
        (projectile.phaseTravel = 0),
        projectile.returnDamage !== null && (projectile.damage = projectile.returnDamage),
        projectile.hitTargets.clear());
      return !0;
    }
    incomingBullet(target, horizon = 0.55) {
      let threat = null,
        nearestTime = horizon + 1;
      for (let bullet of this.bullets) {
        if (!bullet.alive || bullet.owner === target || bullet.hitTargets.has(target)) continue;
        let x = target.x - bullet.x,
          z = target.z - bullet.z,
          along = x * bullet.dx + z * bullet.dz,
          across = Math.abs(x * bullet.dz - z * bullet.dx),
          time = along / Math.max(1, bullet.speed);
        if (along < 0 || time > horizon || across > 0.48 + bullet.radius || time >= nearestTime) continue;
        ((nearestTime = time), (threat = bullet));
      }
      return threat;
    }
    slash(owner, dx, dz, attack, isSuper = !1) {
      let length = Math.hypot(dx, dz) || 1;
      ((dx /= length), (dz /= length));
      let reach = attack.range,
        halfArc = attack.arc * 0.5,
        minDot = Math.cos(halfArc);
      for (let target of this.game.brawlers) {
        if (!target.alive || target === owner || target.airborne) continue;
        let x = target.x - owner.x,
          z = target.z - owner.z,
          distance = Math.hypot(x, z);
        if (distance > reach + 0.35 || distance < 0.02 || (x * dx + z * dz) / distance < minDot) continue;
        if (!this.game.world.hasLineOfSight(owner.x, owner.z, target.x, target.z)) continue;
        let damage = Math.round(attack.damage * owner.damageMul),
          dealt = target.takeDamage(damage, owner, !1, { kind: `melee`, dirX: dx, dirZ: dz });
        owner.onAttackHit(target, {
          a: attack,
          attackId: owner.attackSerial,
          travel: distance,
          range: reach,
          melee: !0,
          returning: !1,
        }, dealt);
        attack.knockback && target.applyKnockback((x / distance) * attack.knockback, (z / distance) * attack.knockback);
      }
      for (let box of this.boxes) {
        if (!box.alive) continue;
        let x = box.x - owner.x,
          z = box.z - owner.z,
          distance = Math.hypot(x, z);
        if (distance <= reach + 0.4 && distance > 0.02 && (x * dx + z * dz) / distance >= minDot) {
          const hit = this.game.world.raycast(owner.x, owner.z, box.x, box.z);
          if (!hit || (hit.tx === box.tx && hit.ty === box.ty))
            this.damageBox(box, attack.damage * owner.damageMul, owner);
        }
      }
      let color = owner.bulletColor(isSuper),
        x = owner.x + dx * Math.min(reach * 0.72, 1.8),
        z = owner.z + dz * Math.min(reach * 0.72, 1.8);
      this.game.effects.impact(x, 0.68, z, color, 14);
      this.game.effects.muzzle(owner.x + dx * 0.45, 0.75, owner.z + dz * 0.45, dx, dz, color, 0.8);
    }
    dashSlash(owner, dash, attack) {
      let sx = dash.sx,
        sz = dash.sz,
        dx = dash.tx - sx,
        dz = dash.tz - sz,
        lengthSq = dx * dx + dz * dz,
        radius = attack.radius || 0.72;
      if (lengthSq < 0.0001) return;
      for (let target of this.game.brawlers) {
        if (!target.alive || target === owner || target.airborne) continue;
        let along = $c(((target.x - sx) * dx + (target.z - sz) * dz) / lengthSq, 0, 1),
          hitX = sx + dx * along,
          hitZ = sz + dz * along,
          offX = target.x - hitX,
          offZ = target.z - hitZ,
          distance = Math.hypot(offX, offZ);
        if (distance > radius + 0.4 || !this.game.world.hasLineOfSight(hitX, hitZ, target.x, target.z)) continue;
        let damage = Math.round(attack.damage * owner.damageMul),
          dirX = distance > 0.02 ? offX / distance : dash.dx,
          dirZ = distance > 0.02 ? offZ / distance : dash.dz,
          dealt = target.takeDamage(damage, owner, !1, { kind: `melee`, dirX: dash.dx, dirZ: dash.dz });
        owner.onAttackHit(target, {
          a: attack,
          attackId: owner.attackSerial,
          travel: along * Math.sqrt(lengthSq),
          range: attack.range,
          melee: !0,
          returning: !1,
        }, dealt);
        attack.knockback && target.applyKnockback(dirX * attack.knockback, dirZ * attack.knockback);
      }
      let color = owner.bulletColor(!0),
        centerX = (sx + dash.tx) * 0.5,
        centerZ = (sz + dash.tz) * 0.5;
      (this.game.effects.impact(centerX, 0.68, centerZ, color, 18),
        this.game.effects.muzzle(dash.tx, 0.75, dash.tz, dash.dx, dash.dz, color, 1.15),
        this.game.audio.play(`shotBig`, owner.x, owner.z));
    }
    startArrowShower(owner, x, z, attack) {
      let dx = x - owner.x,
        dz = z - owner.z,
        distance = Math.hypot(dx, dz) || 1,
        range = attack.range;
      distance > range && ((x = owner.x + dx / distance * range), (z = owner.z + dz / distance * range));
      x = $c(x, -21.4, 21.4);
      z = $c(z, -21.4, 21.4);
      let marker = new ut(),
        disc = new Ln(this.arrowShowerDiscGeometry, this.arrowShowerDiscMaterial),
        ring = new Ln(this.arrowShowerRingGeometry, this.arrowShowerRingMaterial);
      ((disc.userData.noAO = !0),
        (ring.userData.noAO = !0),
        (disc.renderOrder = 3),
        (ring.renderOrder = 3),
        marker.add(disc, ring),
        marker.position.set(x, 0.055, z),
        (marker.userData.noAO = !0),
        (marker.renderOrder = 3),
        this.game.scene.add(marker),
        this.arrowShowers.push({ owner, x, z, attack, marker, t: 0, wave: 0, done: !1 }));
      owner.attackSerial++;
    }
    damageArrowShower(shower) {
      let { owner, x, z, attack } = shower,
        radius = attack.areaRadius,
        damage = Math.round(attack.waveDamage * owner.damageMul);
      for (let target of this.game.brawlers) {
        if (!target.alive || target === owner || target.airborne || Math.hypot(target.x - x, target.z - z) > radius + 0.24) continue;
        target.takeDamage(damage, owner, !1, { kind: `arrow-shower`, x, z });
      }
      this.game.effects.impact(x, 0.08, z, this.arrowShowerColor, 18);
      this.game.audio.play(`hit`, x, z);
    }
    spawnBomb(e, t, n, r, i, a, o, s) {
      let c = this.bombPool.find((e) => !e.busy);
      if (!c) return;
      ((c.busy = !0),
        (c.group.visible = !0),
        c.group.position.set(t, n, r),
        c.group.scale.setScalar(o.big ? 1.75 : 1),
        (c.ring.visible = !0),
        c.ring.position.set(i, 0.05, a),
        c.ring.scale.setScalar(o.blast));
      let l = s ? 16761402 : 16728112;
      (c.ring.material.color.set(l),
        c.fillDisc.material.color.set(l),
        this.bombs.push({
          owner: e,
          slot: c,
          sx: t,
          sy: n,
          sz: r,
          tx: i,
          tz: a,
          a: o,
          isSuper: s,
          t: 0,
          fuse: o.fuse,
          landed: !1,
          damage: o.damage * e.damageMul,
          color: e.bulletColor(s).clone(),
        }));
    }
    breakTile(e, t) {
      let n = this.game,
        r = n.world.destroyTile(e, t);
      r &&
        (r.type === Z.BUSH
          ? n.effects.leaves(r.x, r.z, 14)
          : (n.effects.debris(r.x, 0.6, r.z, [12166540, 11565628, 10116910, 5216842][r.style] ?? 12166540, 10),
            n.effects.dust(r.x, r.z, 8, 2.2),
            n.audio.play(`crate`, r.x, r.z)));
    }
    explode(e, t, n, r, i, a = !1) {
      let o = this.game,
        s = o.world,
        c = n.blast,
        l = n.damage * r.damageMul;
      for (let i of o.brawlers) {
        if (!i.alive || i === r || i.airborne) continue;
        let a = Math.hypot(i.x - e, i.z - t);
        if (!(a > c + 0.24)) {
          let dealt = i.takeDamage(l, r, !1, { kind: `explosion`, x: e, z: t });
          r.def.id === `fuse` && dealt > 0 && (i.slowT = Math.max(i.slowT, 1));
          if (!n.knockback) continue;
          let knockbackPower = n.knockback * (1 - (a / (c + 0.5)) * 0.5),
            o = a > 0.01 ? (i.x - e) / a : 1,
            s = a > 0.01 ? (i.z - t) / a : 0;
          i.applyKnockback(o * knockbackPower, s * knockbackPower);
        }
      }
      for (let n of this.boxes) n.alive && Math.hypot(n.x - e, n.z - t) < c + 0.4 && this.damageBox(n, l, r);
      if (n.breaksWalls) {
        let n = Math.ceil(c),
          r = s.toTile(e),
          i = s.toTile(t);
        for (let a = -n; a <= n; a++)
          for (let o = -n; o <= n; o++) {
            let n = s.center(r + o),
              l = s.center(i + a);
            Math.hypot(n - e, l - t) < c - 0.25 && this.breakTile(r + o, i + a);
          }
      }
      (a
        ? o.effects.slam(e, t, c, r.superColor)
        : o.effects.explosion(e, t, c, n.big ? r.superColor : this.orange, !!n.big),
        o.shake(n.big || a ? 0.55 : 0.24, e, t),
        o.audio.play(n.big || a ? `boomBig` : `boom`, e, t));
    }
    update(e) {
      let t = this.game,
        n = t.world,
        r = t.lighting,
        i = t.effects,
        a = Ic + 0.06,
        o = 0;
      const weaponCounts = { shuriken: 0, arrow: 0 };
      for (let s of this.bullets) {
        let c = s.speed * e;
        for (; c > 0 && s.alive;) {
          if (s.a.returning && !s.returning && s.phaseTravel >= s.range) this.beginReturn(s);
          if (s.returning) {
            if (!s.owner.alive) {
              s.alive = !1;
              break;
            }
            let dx = s.owner.x - s.x,
              dz = s.owner.z - s.z,
              distance = Math.hypot(dx, dz);
            if (distance < 0.22) {
              s.alive = !1;
              break;
            }
            ((s.dx = dx / distance), (s.dz = dz / distance));
          }
          let e = Math.min(c, 0.2);
          ((c -= e),
            (s.x += s.dx * e),
            (s.z += s.dz * e),
            (s.travel += e),
            (s.phaseTravel += e));
          let r = n.toTile(s.x),
            o = n.toTile(s.z);
          if (n.blocksShots(r, o)) {
            let e = this.boxAt(r, o);
            if (
              (e
                ? (this.damageBox(e, s.damage, s.owner), (s.alive = !1))
                : s.a.breaksWalls && n.isBreakable(r, o)
                  ? (this.breakTile(r, o), s.a.pierce || (s.alive = !1))
                  : (s.alive = !1),
              !s.alive)
            ) {
              if (this.beginReturn(s)) {
                s.alive = !0;
                break;
              }
              s.a.electric
                ? i.electricImpact(s.x - s.dx * 0.12, yu, s.z - s.dz * 0.12, s.color, s.isSuper)
                : i.impact(s.x - s.dx * 0.12, yu, s.z - s.dz * 0.12, s.color, s.melee ? 3 : 6);
              break;
            }
          } else s.a.breaksWalls && n.tiles[o * 44 + r] === Z.BUSH && this.breakTile(r, o);
          for (let target of t.brawlers) {
            if (!target.alive || target === s.owner || target.airborne || s.hitTargets.has(target)) continue;
            let dx = target.x - s.x,
              dz = target.z - s.z,
              radius = a + s.radius;
            if (!(dx * dx + dz * dz > radius * radius)) {
              s.hitTargets.add(target);
              let context = {
                kind: `projectile`,
                dirX: s.dx,
                dirZ: s.dz,
              },
                dealt = target.takeDamage(s.damage, s.owner, !1, context);
              s.owner.onAttackHit(target, s, dealt);
              if (!s.a.noKnockback)
                s.a.knockback !== undefined
                  ? target.applyKnockback(s.dx * s.a.knockback, s.dz * s.a.knockback)
                  : target.applyKnockback(s.dx * 1.2, s.dz * 1.2, !0);
              (s.a.electric ? i.electricImpact(s.x, yu, s.z, s.color, s.isSuper) : i.impact(s.x, yu, s.z, s.color, 8),
                i.flash(s.x, yu, s.z, s.color, 5, 4, 0.12));
              (context.parried || !(s.a.pierce || s.a.returning)) && (s.alive = !1);
              break;
            }
          }
          s.alive && s.a.returning && !s.returning && s.phaseTravel >= s.range && this.beginReturn(s);
          s.alive &&
            s.returning &&
            Math.hypot(s.owner.x - s.x, s.owner.z - s.z) < 0.22 &&
            (s.alive = !1);
          if (s.alive && !s.a.returning && s.travel >= s.range) {
            ((s.alive = !1),
              s.a.electric ? i.electricImpact(s.x, yu, s.z, s.color, !1) : i.impact(s.x, yu, s.z, s.color, 2));
          }
        }
        if (!s.alive) continue;
        let remaining = s.a.returning
            ? s.returning
              ? Math.hypot(s.owner.x - s.x, s.owner.z - s.z)
              : s.range - s.phaseTravel
            : s.range - s.travel,
          l = $c(remaining / 0.8, 0.35, 1),
          u = s.melee ? s.radius * 1.2 : s.radius * (s.isSuper ? 3.6 : 3),
          d = s.radius * (s.melee ? 1 : 0.8) * l;
        if (this.weaponProjectiles[s.a.projectile]) {
          let kind = s.a.projectile, scale = s.isSuper ? 1.35 : 1;
          _u.set(0, kind === `shuriken` ? t.elapsed * 28 : Math.atan2(s.dx, s.dz), 0);
          mu.setFromEuler(_u);
          pu.compose(hu.set(s.x, yu, s.z), mu, gu.setScalar(scale));
          this.weaponProjectiles[kind].setMatrixAt(weaponCounts[kind]++, pu);
        } else {
        (_u.set(0, Math.atan2(s.dx, s.dz) + (s.a.electric ? Math.sin(t.elapsed * 45 + s.travel * 7) * 0.08 : 0), 0),
          mu.setFromEuler(_u),
          pu.compose(hu.set(s.x, yu, s.z), mu, gu.set(d, d * (s.melee ? 0.7 : 1), u)),
          this.bulletMesh.setMatrixAt(o, pu));
        let f = s.isSuper ? 3.6 : 2.8;
        (this.bulletMesh.setColorAt(o, vu.copy(s.color).multiplyScalar(f * (s.melee ? 0.6 : 1))), o++);
        }
        let p = s.a.kind === `spread` ? 1.6 / s.a.pellets : s.melee ? 0.5 : 1;
        (r.addLight(s.x, yu, s.z, s.color, (s.isSuper ? 2.6 : 1.9) * p, 4.2),
          (s.trail -= e),
          s.trail <= 0 &&
            ((s.trail = s.a.projectile ? 0.09 : s.a.electric ? 0.045 : 0.03),
            s.a.electric
              ? i.electricTrail(s.x, yu, s.z, s.color, s.radius * (s.isSuper ? 2.5 : 2))
              : i.trail(s.x, yu, s.z, s.color, s.radius * (s.melee ? 2.2 : 1.6))));
      }
      let liveBullets = 0;
      for (let e = 0; e < this.bullets.length; e++)
        this.bullets[e].alive && (this.bullets[liveBullets++] = this.bullets[e]);
      ((this.bullets.length = liveBullets),
        (this.bulletMesh.count = o),
        (this.bulletMesh.instanceMatrix.needsUpdate = !0),
        this.bulletMesh.instanceColor && (this.bulletMesh.instanceColor.needsUpdate = !0));
      for (let shower of this.arrowShowers) {
        shower.t += e;
        let attack = shower.attack,
          fallDuration = 0.24;
        while (shower.wave < attack.waveCount) {
          let waveAt = attack.warningDelay + shower.wave * attack.waveInterval,
            fallAt = waveAt - fallDuration;
          if (!shower.fallSpawned && shower.t >= fallAt) {
            shower.fallSpawned = !0;
            for (let count = 0; count < attack.projectileCount; count++) {
              let angle = Math.random() * Math.PI * 2,
                distance = Math.sqrt(Math.random()) * attack.areaRadius;
              this.arrowFalls.push({
                x: shower.x + Math.cos(angle) * distance,
                z: shower.z + Math.sin(angle) * distance,
                angle,
                t: Math.max(0, shower.t - fallAt),
                duration: fallDuration,
              });
            }
          }
          if (shower.t < waveAt) break;
          this.damageArrowShower(shower);
          shower.wave++;
          shower.fallSpawned = !1;
        }
        shower.marker.scale.setScalar(1 + Math.sin(t.elapsed * 18) * 0.025);
        shower.wave >= attack.waveCount && shower.t >= attack.warningDelay + (attack.waveCount - 1) * attack.waveInterval + 0.55 &&
          ((shower.done = !0), shower.marker.removeFromParent());
      }
      let liveShowers = 0;
      for (let index = 0; index < this.arrowShowers.length; index++)
        !this.arrowShowers[index].done && (this.arrowShowers[liveShowers++] = this.arrowShowers[index]);
      this.arrowShowers.length = liveShowers;
      let liveFalls = 0;
      for (let index = 0; index < this.arrowFalls.length; index++) {
        let fall = this.arrowFalls[index];
        fall.t += e;
        let progress = $c(fall.t / fall.duration, 0, 1);
        if (progress >= 1) continue;
        if (weaponCounts.arrow < bu) {
          _u.set(0.82, fall.angle, 0);
          mu.setFromEuler(_u);
          pu.compose(hu.set(fall.x, 5.2 * (1 - progress), fall.z), mu, gu.setScalar(0.8));
          this.weaponProjectiles.arrow.setMatrixAt(weaponCounts.arrow++, pu);
        }
        this.arrowFalls[liveFalls++] = fall;
      }
      this.arrowFalls.length = liveFalls;
      for (let kind of Object.keys(weaponCounts)) {
        let mesh = this.weaponProjectiles[kind];
        mesh.count = weaponCounts[kind];
        if (mesh.count) mesh.instanceMatrix.needsUpdate = !0;
      }
      for (let n of this.bombs) {
        let a = n.slot,
          o = n.a;
        if (n.landed) ((n.fuse -= e), (a.group.position.y = 0.2 * a.group.scale.x));
        else {
          n.t += e;
          let t = $c(n.t / o.flight, 0, 1),
            r = o.big ? 4.4 : 3.3,
            s = el(n.sy, 0.2, t) + Math.sin(t * Math.PI) * r;
          (a.group.position.set(el(n.sx, n.tx, t), s, el(n.sz, n.tz, t)),
            (a.group.rotation.x += e * 9),
            (a.group.rotation.z += e * 5),
            t >= 1 && ((n.landed = !0), i.dust(n.tx, n.tz, 4, 1.4)));
        }
        let s = n.landed ? 1 - $c(n.fuse / o.fuse, 0, 1) : 0,
          c = 0.5 + 0.5 * Math.sin(t.elapsed * (14 + s * 30));
        (a.spark.scale.setScalar(0.8 + c * 0.9),
          (a.ring.material.opacity = 0.55 + c * 0.35),
          (a.fillDisc.material.opacity = 0.1 + s * 0.22));
        let l = a.group.position;
        (r.addLight(l.x, l.y + 0.3, l.z, this.orange, 2.2 + c * 2.5, 4),
          Math.random() < e * 40 && i.spark(l.x, l.y + 0.25 * a.group.scale.x, l.z, this.orange),
          n.landed &&
            n.fuse <= 0 &&
            ((n.done = !0),
            (a.busy = !1),
            (a.group.visible = !1),
            (a.ring.visible = !1),
            this.explode(n.tx, n.tz, o, n.owner, n.isSuper)));
      }
      let liveBombs = 0;
      for (let e = 0; e < this.bombs.length; e++)
        !this.bombs[e].done && (this.bombs[liveBombs++] = this.bombs[e]);
      this.bombs.length = liveBombs;
      for (let n of this.boxes) {
        if (!n.alive) continue;
        n.shake = Math.max(0, n.shake - e * 5);
        let i = n.shake;
        ((n.mesh.rotation.z = Math.sin(t.elapsed * 60) * 0.09 * i),
          n.mesh.scale.setScalar(1 + i * 0.08),
          (n.mat.emissiveIntensity = 1.1 + r.night * 1.6 + i * 3));
      }
      for (let n of this.cubes) {
        n.t += e;
        let a = $c(n.t / 0.45, 0, 1),
          o = el(n.sx, n.x, a),
          s = el(n.sz, n.z, a),
          c = 0.42 + Math.sin(a * Math.PI) * 1.1 + (a >= 1 ? Math.sin(t.elapsed * 3 + n.phase) * 0.08 : 0);
        if (
          (n.mesh.position.set(o, c, s),
          n.mesh.rotation.set(0.6, t.elapsed * 1.8 + n.phase, 0.6),
          r.addLight(o, c + 0.1, s, this.cubeLight, 1.6 + r.night * 1.6, 3.4),
          !(a < 1))
        ) {
          for (let e of t.brawlers)
            if (e.alive && !e.airborne && Math.hypot(e.x - n.x, e.z - n.z) < 0.78) {
              if (!e.addCube()) continue;
              ((n.alive = !1),
                t.scene.remove(n.mesh),
                (n.mesh.visible = !1),
                this.cubePool.push(n),
                i.burst(n.x, 0.7, n.z, this.cubeLight, 12, 3.5),
                i.flash(n.x, 0.8, n.z, this.cubeLight, 7, 5, 0.25),
                (!e.hidden || e.isPlayer) && t.hud.floatText(e.x, 2, e.z, `POWER UP!`, `power`),
                t.audio.play(`pickup`, n.x, n.z));
              break;
            }
        }
      }
      let liveCubes = 0;
      for (let e = 0; e < this.cubes.length; e++)
        this.cubes[e].alive && (this.cubes[liveCubes++] = this.cubes[e]);
      this.cubes.length = liveCubes;
      for (let item of this.items) {
        item.t += e;
        item.life -= e;
        if (item.life <= 0) {
          this.removeItem(item);
          continue;
        }
        let arc = $c(item.t / 0.42, 0, 1),
          x = el(item.sx, item.x, arc),
          z = el(item.sz, item.z, arc),
          y = 0.46 + Math.sin(arc * Math.PI) * 0.8 + (arc >= 1 ? Math.sin(t.elapsed * 4 + item.phase) * 0.08 : 0);
        (item.mesh.position.set(x, y, z),
          item.mesh.rotation.set(0.25, t.elapsed * 1.7 + item.phase, 0.25),
          item.mesh.scale.setScalar(1 + Math.sin(t.elapsed * 5 + item.phase) * 0.05),
          r.addLight(x, y + 0.1, z, this.itemLights[item.kind], 1.5 + r.night, 3.2));
        if (arc < 1) continue;
        for (let brawler of t.brawlers) {
          if (!brawler.alive || brawler.airborne || brawler.heldItem || Math.hypot(brawler.x - item.x, brawler.z - item.z) >= 0.82) continue;
          let kind = item.kind;
          let label = kind === `ammo` && !brawler.usesAmmo ? `FOCUS` : kind.toUpperCase();
          ((brawler.heldItem = kind),
            this.removeItem(item),
            i.burst(item.x, 0.7, item.z, this.itemLights[kind], 10, 3.1),
            (!brawler.hidden || brawler.isPlayer) && t.hud.floatText(brawler.x, 2, brawler.z, `${label}!`, `power`),
            brawler.isPlayer && t.hud.toast(`${label} READY · TAP ITEM OR PRESS F`),
            t.audio.play(`pickup`, item.x, item.z));
          break;
        }
      }
      let liveItems = 0;
      for (let e = 0; e < this.items.length; e++) this.items[e].alive && (this.items[liveItems++] = this.items[e]);
      this.items.length = liveItems;
    }
    clear() {
      let e = this.game.scene;
      ((this.bullets.length = 0), (this.bulletMesh.count = 0));
      for (let mesh of Object.values(this.weaponProjectiles)) mesh.count = 0;
      for (let shower of this.arrowShowers) shower.marker.removeFromParent();
      this.arrowShowers.length = 0;
      this.arrowFalls.length = 0;
      for (let e of this.bombs) ((e.slot.busy = !1), (e.slot.group.visible = !1), (e.slot.ring.visible = !1));
      this.bombs.length = 0;
      for (let t of this.boxes) (t.alive && e.remove(t.mesh), t.mat.dispose());
      this.boxes.length = 0;
      for (let t of this.cubes) (e.remove(t.mesh), (t.mesh.visible = !1), (t.alive = !1), this.cubePool.push(t));
      this.cubes.length = 0;
      for (let item of this.items) this.removeItem(item);
      this.items.length = 0;
    }
  },
  Cu = new Re(),
  wu = new _e(),
  Tu = new H(),
  Eu = new H(),
  Du = new Ke(),
  Ou = new J(),
  ku = `
  attribute vec4 aColor;
  attribute float aSize;
  uniform float uScale;
  varying vec4 vColor;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4( position, 1.0 );
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / max( 0.1, - mv.z );
  }`,
  Au = `
  uniform float uDim;
  varying vec4 vColor;
  void main() {
    float d = length( gl_PointCoord - 0.5 );
    float a = smoothstep( 0.5, 0.12, d ) * vColor.a;
    if ( a < 0.004 ) discard;
    gl_FragColor = vec4( vColor.rgb * uDim, a );
  }`,
  ju = class {
    constructor(e, t, n) {
      ((this.cap = t), (this.maxActive = t), (this.cursor = 0), (this.additive = n), (this.webgpu = window.__GBH_RENDERER__?.kind === `webgpu`));
      let r = t;
      ((this.pos = new Float32Array(r * 3)),
        (this.drawPos = this.webgpu ? new Float32Array(r * 3) : null),
        (this.col = new Float32Array(r * 4)),
        (this.gpuCol = this.webgpu ? new Float32Array(r * 3) : null),
        (this.size = new Float32Array(r)),
        (this.vel = new Float32Array(r * 3)),
        (this.life = new Float32Array(r)),
        (this.maxLife = new Float32Array(r)),
        (this.size0 = new Float32Array(r)),
        (this.size1 = new Float32Array(r)),
        (this.alpha = new Float32Array(r)),
        (this.drag = new Float32Array(r)),
        (this.grav = new Float32Array(r)),
        (this.activeSlots = []),
        (this.activeFlags = new Uint8Array(r)));
      let i = new pn();
      (i.setAttribute(`position`, new Zt(this.webgpu ? this.drawPos : this.pos, 3).setUsage(N)),
        this.webgpu
          ? i.setAttribute(`color`, new Zt(this.gpuCol, 3).setUsage(N))
          : (i.setAttribute(`aColor`, new Zt(this.col, 4).setUsage(N)), i.setAttribute(`aSize`, new Zt(this.size, 1).setUsage(N))),
        this.webgpu && i.setDrawRange(0, 0),
        (this.material = this.webgpu
          ? new er({ color: 16777215, size: 0.16, vertexColors: !0, transparent: !0, depthWrite: !1, blending: n ? 2 : 1 })
          : new jr({
          uniforms: { uScale: { value: 600 }, uDim: { value: 1 } },
          vertexShader: ku,
          fragmentShader: Au,
          transparent: !0,
          depthWrite: !1,
          blending: n ? 2 : 1,
        })),
        (this.points = new ar(i, this.material)),
        (this.points.frustumCulled = !1),
        (this.points.renderOrder = n ? 8 : 7),
        e.add(this.points));
    }
    setQuality(e) {
      this.maxActive = Math.max(1, Math.floor(this.cap * e));
    }
    emit(e, t, n, r, i, a, o, s, c, l, u, d, f = 1, p = 1.5, m = 0) {
      if (this.activeSlots.length >= this.maxActive) return;
      let h = this.cursor;
      ((this.cursor = (h + 1) % this.cap),
        !this.activeFlags[h] && (this.activeFlags[h] = 1, this.activeSlots.push(h)),
        (this.pos[h * 3] = e),
        (this.pos[h * 3 + 1] = t),
        (this.pos[h * 3 + 2] = n),
        (this.vel[h * 3] = r),
        (this.vel[h * 3 + 1] = i),
        (this.vel[h * 3 + 2] = a),
        (this.life[h] = o),
        (this.maxLife[h] = o),
        (this.size0[h] = s),
        (this.size1[h] = c),
        (this.col[h * 4] = l),
        (this.col[h * 4 + 1] = u),
        (this.col[h * 4 + 2] = d),
        (this.alpha[h] = f),
        (this.drag[h] = p),
        (this.grav[h] = m));
    }
    update(e) {
      let {
        pos: t,
        vel: n,
        life: r,
        maxLife: i,
        size: a,
        size0: o,
        size1: s,
        col: c,
        alpha: l,
        drag: u,
        grav: d,
      } = this;
      let dirty = this.activeSlots.length > 0;
      for (let activeIndex = 0; activeIndex < this.activeSlots.length;) {
        let f = this.activeSlots[activeIndex];
        r[f] -= e;
        let progress = 1 - Math.max(0, r[f]) / i[f],
          m = Math.exp(-u[f] * e);
        ((n[f * 3] *= m),
          (n[f * 3 + 1] = n[f * 3 + 1] * m - d[f] * e),
          (n[f * 3 + 2] *= m),
          (t[f * 3] += n[f * 3] * e),
          (t[f * 3 + 1] += n[f * 3 + 1] * e),
          (t[f * 3 + 2] += n[f * 3 + 2] * e),
          t[f * 3 + 1] < 0.03 && d[f] > 0 && ((t[f * 3 + 1] = 0.03), (n[f * 3 + 1] *= -0.35)),
          (a[f] = r[f] <= 0 ? 0 : o[f] + (s[f] - o[f]) * progress),
          (c[f * 4 + 3] = l[f] * (1 - progress * progress)));
        if (r[f] <= 0) {
          this.activeFlags[f] = 0;
          let last = this.activeSlots.pop();
          if (activeIndex < this.activeSlots.length) this.activeSlots[activeIndex] = last;
          a[f] = 0;
        } else activeIndex++;
      }
      if (!dirty) return;
      let f = this.points.geometry;
      if (this.webgpu) {
        for (let index = 0; index < this.activeSlots.length; index++) {
          let slot = this.activeSlots[index],
            source = slot * 3,
            target = index * 3,
            color = slot * 4,
            alpha = c[color + 3];
          ((this.drawPos[target] = t[source]),
            (this.drawPos[target + 1] = t[source + 1]),
            (this.drawPos[target + 2] = t[source + 2]),
            (this.gpuCol[target] = c[color] * alpha),
            (this.gpuCol[target + 1] = c[color + 1] * alpha),
            (this.gpuCol[target + 2] = c[color + 2] * alpha));
        }
        (f.setDrawRange(0, this.activeSlots.length),
          (f.attributes.position.needsUpdate = !0),
          (f.attributes.color.needsUpdate = this.activeSlots.length > 0));
      } else ((f.attributes.position.needsUpdate = !0), (f.attributes.aColor.needsUpdate = !0), (f.attributes.aSize.needsUpdate = !0));
    }
  };
