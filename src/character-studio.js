import './character-studio.css';

const canvas = document.getElementById('studio-canvas');
const loading = document.getElementById('loading');
const scripts = ['three-legacy', 'character-roster', 'world', 'character-models', 'sorcerer-models', 'brawlers'];

async function loadScript(name) {
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${import.meta.env.BASE_URL}engine/${name}.js?v=${__ENGINE_BUILD_ID__}`;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Gagal memuat ${name}`));
    document.body.append(script);
  });
}

try {
  for (const name of scripts) await loadScript(name);

  const renderer = new window.uc({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x11151e, 0);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = 4;
  renderer.toneMappingExposure = 1.05;

  const scene = new window.vt();
  const camera = new window.hi(32, 1, 0.05, 60);
  const target = new window.H(0, 0.82, 0);
  let orbitYaw = 0, orbitPitch = 0.1, orbitRadius = 4.7;
  const updateCamera = () => {
    camera.position.set(
      Math.sin(orbitYaw) * Math.cos(orbitPitch) * orbitRadius,
      target.y + Math.sin(orbitPitch) * orbitRadius,
      Math.cos(orbitYaw) * Math.cos(orbitPitch) * orbitRadius,
    );
    camera.lookAt(target);
  };

  const pointers = new Map();
  let pinchDistance = 0;
  canvas.addEventListener('pointerdown', event => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    pinchDistance = 0;
  });
  canvas.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    if (pointers.size === 1) {
      orbitYaw -= (event.clientX - previous[0]) * 0.008;
      orbitPitch = Math.max(0.02, Math.min(1.4, orbitPitch + (event.clientY - previous[1]) * 0.005));
    } else {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinchDistance) orbitRadius = Math.max(1.5, Math.min(10, orbitRadius * pinchDistance / Math.max(1, distance)));
      pinchDistance = distance;
    }
    updateCamera();
  });
  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(eventName, event => {
      pointers.delete(event.pointerId);
      pinchDistance = 0;
    });
  }
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    orbitRadius = Math.max(1.5, Math.min(10, orbitRadius * Math.exp(event.deltaY * 0.001)));
    updateCamera();
  }, { passive: false });

  const ambient = new window.ri(0xcbdcff, 0x4e3b38, 0.85);
  scene.add(ambient);
  const light = (color, intensity, position) => {
    const lamp = new window.Si(color, intensity);
    lamp.position.set(...position);
    scene.add(lamp);
    return lamp;
  };
  const key = light(0xffecdd, 3, [2, 4, 4]);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.normalBias = 0.018;
  light(0x819fff, 1.35, [-3, 2, 0]);
  light(0xff8090, 1.05, [3, 2, -2]);
  light(0xffffff, 1.25, [0, 3, -4]);

  const game = { scene, elapsed: 0, effects: { footDust() {} } };
  const originalRoster = Object.values(window.Bc).map((def, index) => ({
    id: def.id,
    label: def.alias || def.name || def.id,
    role: def.role || def.visual || 'Brawler',
    def,
    index,
    isRedesign: false,
  }));
  const redesigns = Object.values(window.GBH_CHARACTER_DESIGNS).map((design, index) => ({
    id: design.id,
    label: design.name,
    role: design.id === 'gojo' ? 'Space Manipulator' : 'Cursed Slayer',
    def: { ...window.Bc.titan, ...design },
    index: originalRoster.length + index,
    isRedesign: true,
  }));
  const entries = [...originalRoster, ...redesigns].map(entry => {
    const actor = new window.fu(game, entry.def, {
      x: 0, z: 0, isPlayer: false, name: entry.label,
    });
    actor.ring.visible = false;
    actor.superRing.visible = false;
    actor.root.visible = false;
    actor.walkPhase = 0;
    return { ...entry, actor };
  });

  const contactGeometry = window.eu(0.5, 20, 12);
  const contactMaterial = window.lu(0x080a10, {
    emissive: 0x020308, transparent: true, opacity: 0.42, depthWrite: false, roughness: 1,
  });
  for (const entry of entries) {
    const shadow = new window.Ln(contactGeometry, contactMaterial);
    shadow.name = 'studio-contact-shadow';
    shadow.position.set(0, 0.018, -0.025);
    shadow.scale.set(entry.isRedesign ? 1.35 : 1.05, 0.025, 0.55);
    shadow.castShadow = false;
    shadow.receiveShadow = false;
    entry.actor.root.add(shadow);
  }

  let selected = 'both', view = 'front', motion = 'idle';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const captionFor = id => entries.find(entry => entry.id === id);
  const setCaption = entry => {
    document.getElementById('left-name').textContent = entry.label.toUpperCase();
    document.getElementById('left-role').textContent = entry.role.toUpperCase();
    document.getElementById('right-caption').hidden = selected !== 'both';
  };
  const press = (selector, activeButton) => {
    document.querySelectorAll(selector).forEach(button => {
      button.setAttribute('aria-pressed', String(button === activeButton));
    });
  };
  const setView = () => {
    const both = selected === 'both';
    const activeEntry = both ? null : captionFor(selected);
    const mobile = canvas.clientWidth < 650;
    orbitRadius = both
      ? (mobile ? 6.2 : 4.7)
      : activeEntry?.isRedesign ? 3.9 : 2.9;
    for (const entry of entries) {
      const visible = both ? entry.isRedesign : entry.id === selected;
      entry.actor.root.visible = visible;
      entry.actor.root.rotation.y = 0;
      if (!visible) continue;
      const sideBySide = both && view !== 'side';
      const sideDepth = both && view === 'side';
      const isSukuna = entry.id === 'sukuna';
      entry.actor.root.position.set(
        sideBySide ? (isSukuna ? 0.66 : -0.66) : 0,
        0,
        sideDepth ? (isSukuna ? -0.66 : 0.66) : 0,
      );
    }
    orbitYaw = view === 'side' ? Math.PI / 2 : view === 'back' ? Math.PI : view === 'arena' ? 0.68 : 0;
    orbitPitch = view === 'arena' ? 0.9 : 0.08;
    updateCamera();
  };

  document.querySelectorAll('[data-model]').forEach(button => {
    button.addEventListener('click', () => {
      selected = button.dataset.model;
      press('[data-model]', button);
      document.querySelectorAll('.roster-card').forEach(card => card.setAttribute('aria-pressed', 'false'));
      setCaption(captionFor(selected === 'both' ? 'gojo' : selected));
      setView();
    });
  });
  document.querySelectorAll('[data-view]').forEach(button => {
    button.addEventListener('click', () => {
      view = button.dataset.view;
      press('[data-view]', button);
      setView();
    });
  });
  document.querySelectorAll('[data-motion]').forEach(button => {
    button.addEventListener('click', () => {
      motion = button.dataset.motion;
      press('[data-motion]', button);
    });
  });

  const grid = document.getElementById('roster-grid');
  const thumbCards = new Map();
  const focusCharacter = entry => {
    selected = entry.id;
    press('[data-model]', null);
    document.querySelectorAll('.roster-card').forEach(card => {
      card.setAttribute('aria-pressed', String(card.dataset.character === entry.id));
    });
    setCaption(entry);
    setView();
    document.getElementById('model-viewport').scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  for (const entry of entries) {
    const card = document.createElement('button');
    card.className = 'roster-card';
    card.type = 'button';
    card.dataset.character = entry.id;
    card.setAttribute('aria-label', `Lihat model ${entry.label}, ${entry.role}`);
    card.style.setProperty('--roster-accent', `#${(entry.def.palette?.accent ?? 0x91a9eb).toString(16).padStart(6, '0')}`);
    const image = document.createElement('img');
    image.className = 'roster-thumb';
    image.alt = `Tampak depan model ${entry.label}`;
    image.width = 224;
    image.height = 300;
    const meta = document.createElement('span');
    meta.className = 'roster-meta';
    meta.innerHTML = `<strong></strong><small></small>`;
    meta.querySelector('strong').textContent = entry.label;
    meta.querySelector('small').textContent = entry.role;
    card.append(image, meta);
    card.addEventListener('click', () => focusCharacter(entry));
    grid.append(card);
    thumbCards.set(entry.id, image);
  }

  const renderRosterThumbnails = () => {
    const thumbCanvas = document.createElement('canvas');
    const thumbWidth = 224, thumbHeight = 300;
    const thumbRenderer = new window.uc({
      canvas: thumbCanvas, antialias: true, alpha: true, preserveDrawingBuffer: true,
    });
    thumbRenderer.setPixelRatio(1);
    thumbRenderer.setSize(thumbWidth, thumbHeight, false);
    thumbRenderer.setClearColor(0x171b25, 0);
    const thumbCamera = new window.hi(32, thumbWidth / thumbHeight, 0.05, 40);
    const thumbnailTarget = new window.H(0, 0.78, 0);
    const status = document.getElementById('roster-loading');

    entries.forEach(entry => { entry.actor.root.visible = false; });
    entries.forEach((entry, index) => {
      status.textContent = `Menyiapkan karakter ${index + 1} dari ${entries.length}: ${entry.label}…`;
      const actor = entry.actor;
      actor.root.position.set(0, 0, 0);
      actor.root.rotation.set(0, 0, 0);
      actor.root.visible = true;
      actor.vel.set(0, 0);
      actor.chargeLevel = 0;
      actor.recoil = 0;
      actor.animate(0, false);
      actor.model.updateVisualPose?.(0, false, entry.isRedesign ? 0.55 : 0);
      if (!entry.isRedesign) actor.model.energy?.forEach(effect => { effect.visible = false; });
      thumbCamera.position.set(0, 0.82, entry.isRedesign ? 3.9 : 2.9);
      thumbCamera.lookAt(thumbnailTarget);
      thumbRenderer.render(scene, thumbCamera);
      thumbCards.get(entry.id).src = thumbCanvas.toDataURL('image/png');
      actor.root.visible = false;
    });
    thumbRenderer.dispose();
    status.textContent = `${entries.length} karakter siap diaudit.`;
    setView();
  };

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    updateCamera();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  setCaption(captionFor('gojo'));
  setView();
  loading.textContent = '';

  const stats = document.getElementById('model-stats');
  let lastTime = performance.now(), statsTime = 0, disposed = false;
  function frame(now) {
    if (disposed) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (!document.hidden) {
      game.elapsed += dt;
      for (const entry of entries) {
        const { actor } = entry;
        if (!actor.root.visible) continue;
        const walk = motion === 'walk', cast = motion === 'cast';
        actor.vel.set(walk ? 2.5 : 0, 0);
        actor.chargeLevel = 0;
        actor.recoil = 0;
        actor.animate(reducedMotion && motion === 'idle' ? 0 : dt, walk);
        const aura = document.getElementById('energy').checked;
        actor.model.updateVisualPose?.(reducedMotion && motion === 'idle' ? 0 : game.elapsed, walk,
          cast ? 1 : aura && entry.isRedesign ? 0.55 : 0);
        if (cast && actor.model.arms) {
          actor.model.arms[0].rotation.z = -0.8;
          actor.model.arms[1].rotation.z = 0.8;
          actor.model.arms.forEach(arm => { arm.rotation.x = -0.32; });
        } else {
          actor.model.arms?.forEach((arm, index) => {
            arm.rotation.z = actor.model.pose.armBase[index][1];
          });
        }
        if (!aura) actor.model.energy?.forEach(effect => { effect.visible = false; });
        if (document.getElementById('turntable').checked) actor.root.rotation.y += dt * 0.4;
      }
      renderer.render(scene, camera);
      statsTime += dt;
      if (statsTime > 0.5) {
        statsTime = 0;
        stats.textContent = `${renderer.info.render.triangles.toLocaleString('id-ID')} triangles · ${renderer.info.render.calls} draw calls`;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  requestAnimationFrame(renderRosterThumbnails);

  window.addEventListener('pagehide', () => {
    disposed = true;
    observer.disconnect();
    entries.forEach(({ actor }) => actor.dispose());
    contactMaterial.dispose();
    renderer.dispose();
  }, { once: true });
} catch (error) {
  loading.textContent = `Preview tidak dapat dimuat: ${error.message}`;
  console.error(error);
}
