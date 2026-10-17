import * as THREE from './assets/vendor/three.module.min.js';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';
import { GLTFLoader } from './assets/vendor/GLTFLoader.js';
import { MeshoptDecoder } from './assets/vendor/meshopt_decoder.mjs';

import { components } from './components.js';

export async function mountGearbox(panel) {
  const stage = panel.querySelector('.component-stage');
  const canvas = stage.querySelector('canvas');
  const poster = stage.querySelector('.component-poster');
  const pauseButton = panel.querySelector('.motion-toggle');
  const angleButton = panel.querySelector('.angle-toggle');
  const tabs = [...panel.querySelectorAll('[data-component]')];
  const picker = panel.querySelector('#component-picker');
  const tourButton = panel.querySelector('.tour-toggle');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    panel.classList.add('component-unavailable');
    return;
  }
  // Keep the selector usable during downloads and recoverable asset failures.
  panel.classList.add('component-interactive');
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .88;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTarget = pmrem.fromScene(environment, .025);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = .8;
  environment.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xdce7e4, 0x242d20, 1.2));
  const key = new THREE.DirectionalLight(0xf4f8ff, 2.8);
  key.position.set(3, 7, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .1, far: 25 });
  key.shadow.normalBias = .025; key.shadow.bias = -.0002;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xf4e443, 4);
  rim.position.set(-4, 3, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xd9e3e1, .9);
  fill.position.set(-5, 1, 4); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .33 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.05; floor.receiveShadow = true; scene.add(floor);
  // Restrained yellow rings give the camera a fixed reference as it travels.
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xf4e443, transparent: true, opacity: .18, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.31, 100), ringMaterial);
  ring.rotation.x = -Math.PI / 2; ring.position.y = -2.04; scene.add(ring);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const cache = new Map();
  let active = null, current = 0, target = 0, prefetched = null, request = 0;
  let visible = false, paused = false, frame = 0, last = 0, elapsed = 0, tour = true;
  let started = false, contextLost = false, tourTimer = 0, slotStartedAt = null;
  let angleStart = null, angleFrom = 0, angleTo = 0, lookHeight = 0, modelRadius = 3.8;
  const duration = 30;
  const slideDuration = 3500;
  let slotRemaining = slideDuration;
  // A slot changes immediately; the existing CSS fade must not extend its dwell.
  canvas.style.transition = 'none';
  panel.dataset.slideDuration = String(slideDuration);
  panel.dataset.currentIndex = '0';
  panel.dataset.renderedIndex = '-1';

  function disposeModel(root) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    root.traverse(child => {
      if (!child.isMesh) return;
      geometries.add(child.geometry);
      for (const material of [].concat(child.material)) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    textures.forEach(texture => texture.dispose());
    materials.forEach(material => material.dispose());
    geometries.forEach(geometry => geometry.dispose());
  }
  function pruneCache() {
    // Protect both the requested assembly and its prefetched successor.
    for (const [index, promise] of cache) {
      if (cache.size <= 3) break;
      if (index === current || index === target || index === prefetched) continue;
      cache.delete(index);
      promise.then(root => { if (root !== active) disposeModel(root); }).catch(() => {});
    }
    panel.dataset.cachedModels = String(cache.size);
  }

  function loadModel(index) {
    if (!cache.has(index)) {
      const promise = loader.loadAsync(`/assets/models/${components[index].file}.glb`).then(gltf => {
        const root = gltf.scene;
        root.rotation.set(...components[index].rotation);
        root.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(root);
        const size = bounds.getSize(new THREE.Vector3());
        root.scale.multiplyScalar(5.8 / (Math.max(size.x, size.y, size.z) || 1));
        root.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        root.position.sub(center);
        const height = box.max.y - box.min.y;
        root.position.y += height / 2 - 1.95;
        root.userData.lookHeight = height / 2 - 1.95;
        root.userData.radius = box.getSize(new THREE.Vector3()).length() / 2;
        root.traverse(object => {
          if (!object.isMesh) return;
          if (!object.geometry.attributes.normal) object.geometry.computeVertexNormals();
          // Retain original PBR colours, texture maps, metalness and roughness.
          for (const material of [].concat(object.material)) {
            material.side = THREE.DoubleSide;
            material.needsUpdate = true;
          }
          object.castShadow = true; object.receiveShadow = true;
        });
        return root;
      }).catch(error => {
        if (cache.get(index) === promise) cache.delete(index);
        throw error;
      });
      cache.set(index, promise);
      pruneCache();
    }
    return cache.get(index);
  }
  function prefetchNext(index) {
    prefetched = (index + 1) % components.length;
    loadModel(prefetched).catch(() => {});
    pruneCache();
  }
  function canMove() {
    return visible && !paused && !preference.matches && !document.hidden && !contextLost && panel.isConnected;
  }
  function stopTourClock() {
    clearTimeout(tourTimer); tourTimer = 0;
    if (slotStartedAt !== null) slotRemaining = Math.max(0, slotRemaining - (performance.now() - slotStartedAt));
    slotStartedAt = null;
  }
  function startTourClock() {
    if (!tour || !started || !canMove() || tourTimer) return;
    slotStartedAt = performance.now();
    tourTimer = setTimeout(() => {
      tourTimer = 0; slotStartedAt = null;
      if (!tour || !canMove()) { slotRemaining = 0; sync(); return; }
      // Loading belongs to the new slot. Never leave an old assembly on screen
      // while waiting for the next download or add a fade after the deadline.
      select((current + 1) % components.length);
    }, slotRemaining);
  }

  function updateCamera() {
    // Full orbit, two gradual push ins and a rising view over the top.
    const phase = elapsed / duration * Math.PI * 2;
    const azimuth = .55 + phase;
    const elevation = .26 + (.5 + .5 * Math.sin(phase - .4)) * .42;
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    const limitingFov = Math.min(verticalFov, horizontalFov);
    const fitDistance = modelRadius / Math.sin(limitingFov / 2);
    const radius = fitDistance * (1.12 + .14 * Math.cos(phase) ** 2);
    const lookY = lookHeight;
    camera.position.set(Math.sin(azimuth) * Math.cos(elevation) * radius, lookY + Math.sin(elevation) * radius, Math.cos(azimuth) * Math.cos(elevation) * radius);
    camera.lookAt(0, lookY, 0);
    const slotElapsed = slideDuration - slotRemaining + (slotStartedAt === null ? 0 : performance.now() - slotStartedAt);
    panel.style.setProperty('--camera-progress', String(Math.min(slotElapsed / slideDuration, 1)));
    panel.dataset.cameraAngle = String(Math.round(azimuth * 180 / Math.PI));
  }
  function render() { if (!contextLost) { updateCamera(); renderer.render(scene, camera); } }
  function resize() {
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6, Math.sqrt(2400000 / (width * height))));
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix(); render();
  }
  function setLabels(index) {
    const data = components[index];
    panel.querySelector('[data-model-name]').textContent = data.name;
    panel.querySelector('[data-model-detail]').textContent = data.detail;
    panel.querySelector('[data-model-number]').textContent = `${String(index + 1).padStart(2, '0')} / ${components.length}`;
    stage.setAttribute('aria-label', `3D ${data.name.toLowerCase()} assembly with yellow accent lighting`);
    tabs.forEach((tab, i) => tab.setAttribute('aria-pressed', String(i === index)));
    panel.dataset.component = data.file;
    panel.dataset.currentIndex = String(index);
    picker.value = String(index);
  }
  async function select(index, manual = false) {
    if (!Number.isInteger(index) || index < 0 || index >= components.length || contextLost) return;
    stopTourClock(); slotRemaining = slideDuration;
    const token = ++request;
    current = index; target = index;
    if (manual) { tour = false; angleStart = null; }
    if (active) scene.remove(active);
    active = null;
    canvas.style.opacity = '0';
    panel.classList.remove('component-ready', 'component-unavailable');
    // The static first-assembly poster cannot stand in for a different system.
    if (poster) poster.style.visibility = started || index !== 0 ? 'hidden' : '';
    panel.dataset.renderedIndex = '-1';
    panel.dataset.loadState = 'loading';
    panel.setAttribute('aria-busy', 'true');
    setLabels(index);
    panel.querySelector('[data-view-label]').textContent = 'LOADING ASSEMBLY';
    const model = loadModel(index);
    prefetchNext(index);
    sync();
    try {
      const object = await model;
      if (token !== request || contextLost) return;
      active = object; lookHeight = object.userData.lookHeight; modelRadius = object.userData.radius; scene.add(active);
      renderer.shadowMap.needsUpdate = true;
      render();
      started = true;
      panel.classList.remove('component-unavailable');
      panel.classList.add('component-ready');
      canvas.style.opacity = '1';
      panel.querySelector('[data-view-label]').textContent = 'COMPLETE SYSTEMS. IN DETAIL.';
      panel.dataset.renderedIndex = String(index);
      panel.dataset.loadState = 'ready';
      panel.setAttribute('aria-busy', 'false');
      pruneCache(); sync();
    } catch {
      if (token !== request || contextLost) return;
      panel.setAttribute('aria-busy', 'false');
      panel.dataset.loadState = 'unavailable';
      panel.querySelector('[data-view-label]').textContent = 'ASSEMBLY UNAVAILABLE. CHOOSE ANOTHER.';
      panel.classList.add('component-unavailable');
      sync();
    }
  }

  function draw(now) {
    frame = 0;
    const delta = last ? Math.min((now - last) / 1000, .08) : 0;
    last = now;
    if (angleStart !== null) {
      const t = Math.min((now - angleStart) / 1100, 1);
      const smooth = t * t * (3 - 2 * t);
      elapsed = angleFrom + (angleTo - angleFrom) * smooth;
      if (t === 1) { elapsed %= duration; angleStart = null; }
    } else if (canMove()) {
      elapsed = (elapsed + delta) % duration;
    }
    render();
    if ((canMove() && started) || angleStart !== null) frame = requestAnimationFrame(draw);
  }
  function sync() {
    stopTourClock();
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0;
    pauseButton.hidden = preference.matches || !started || contextLost;
    angleButton.hidden = !active;
    tourButton.hidden = !started || preference.matches || contextLost;
    tourButton.setAttribute('aria-pressed', String(tour));
    tourButton.textContent = tour ? 'Tour on' : 'Auto tour';
    pauseButton.querySelector('[data-motion-label]').textContent = paused ? 'Play' : 'Pause';
    pauseButton.querySelector('.pause-icon').textContent = paused ? '▷' : 'Ⅱ';
    const motionLabel = tour ? 'automatic tour and camera motion' : 'camera motion';
    pauseButton.setAttribute('aria-label', `${paused ? 'Play' : 'Pause'} ${motionLabel}`);
    const running = canMove() && started;
    panel.dataset.motion = running ? 'running' : 'paused';
    startTourClock();
    if (running || angleStart !== null) frame = requestAnimationFrame(draw); else render();
  }
  pauseButton.addEventListener('click', () => { paused = !paused; angleStart = null; sync(); });
  angleButton.addEventListener('click', () => {
    tour = false;
    if (preference.matches) { elapsed = (elapsed + duration / 4) % duration; sync(); }
    else { angleFrom = elapsed; angleTo = elapsed + duration / 4; angleStart = performance.now(); sync(); }
  });
  tabs.forEach((tab, index) => tab.addEventListener('click', () => { if (index !== current || !active) select(index, true); }));
  picker.addEventListener('change', () => select(Number(picker.value), true));
  tourButton.addEventListener('click', () => {
    tour = !tour;
    if (tour) { stopTourClock(); slotRemaining = slideDuration; paused = false; prefetchNext(current); }
    sync();
  });
  preference.addEventListener('change', () => { angleStart = null; sync(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) angleStart = null; sync(); });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (!visible) angleStart = null; sync(); }, { threshold: .05 }).observe(stage);
  new ResizeObserver(resize).observe(stage);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); contextLost = true; ++request; angleStart = null; stopTourClock(); cancelAnimationFrame(frame); active = null;
    panel.classList.remove('component-ready'); panel.classList.add('component-unavailable');
    panel.dataset.renderedIndex = '-1';
    panel.dataset.loadState = 'unavailable';
    panel.querySelector('[data-view-label]').textContent = 'ASSEMBLY PREVIEW';
    panel.setAttribute('aria-busy', 'false');
    pauseButton.hidden = true; angleButton.hidden = true; tourButton.hidden = true;
    panel.dataset.motion = 'paused';
  });
  resize(); await select(0);
}
