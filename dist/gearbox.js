import * as THREE from './assets/vendor/three.module.min.js';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';
import { GLTFLoader } from './assets/vendor/GLTFLoader.js';
import { MeshoptDecoder } from './assets/vendor/meshopt_decoder.mjs';

import { components } from './components.js';

export async function mountGearbox(panel) {
  const stage = panel.querySelector('.component-stage');
  const canvas = stage.querySelector('canvas');
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
  let active = null, current = 0, target = 0, switching = false, request = 0;
  let visible = false, paused = false, frame = 0, last = 0, elapsed = 0, tour = true;
  let angleStart = null, angleFrom = 0, angleTo = 0, lookHeight = 0, modelRadius = 3.8;
  const duration = 30;

  function loadModel(index) {
    if (!cache.has(index)) {
      cache.set(index, loader.loadAsync(`/assets/models/${components[index].file}.glb`).then(gltf => {
        const root = gltf.scene;
        root.rotation.set(...components[index].rotation);
        root.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(root);
        const size = bounds.getSize(new THREE.Vector3());
        root.scale.multiplyScalar(5.8 / Math.max(size.x, size.y, size.z));
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
          const source = object.material;
          object.material = new THREE.MeshStandardMaterial({
            color: source.map ? 0xffffff : 0x737d7b,
            map: source.map || null,
            metalness: components[index].metalness,
            roughness: components[index].roughness,
            side: THREE.DoubleSide
          });
          object.castShadow = true; object.receiveShadow = true;
        });
        return root;
      }).catch(error => { cache.delete(index); throw error; }));
    }
    return cache.get(index);
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
    panel.style.setProperty('--camera-progress', String(Math.min(elapsed / duration, 1)));
    panel.dataset.cameraAngle = String(Math.round(azimuth * 180 / Math.PI));
  }
  function render() { updateCamera(); renderer.render(scene, camera); }
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
    stage.setAttribute('aria-label', `Real scanned ${data.name.toLowerCase()} in three dimensions with yellow accent lighting`);
    tabs.forEach((tab, i) => tab.setAttribute('aria-pressed', String(i === index)));
    panel.dataset.component = data.file;
    picker.value = String(index);
  }
  async function select(index, manual = false) {
    const token = ++request;
    target = index; switching = true;
    if (manual) tour = false;
    panel.setAttribute('aria-busy', 'true');
    panel.querySelector('[data-view-label]').textContent = 'LOADING COMPONENT';
    try {
      const object = await loadModel(index);
      if (token !== request) return;
      canvas.style.opacity = '0';
      // The fade conceals the component cut while the camera restarts.
      if (active && !preference.matches) await new Promise(resolve => setTimeout(resolve, 450));
      if (token !== request) return;
      if (active) scene.remove(active);
      active = object; lookHeight = object.userData.lookHeight; modelRadius = object.userData.radius; scene.add(active); current = index; elapsed = 0;
      setLabels(index);
      renderer.shadowMap.needsUpdate = true;
      render();
      panel.classList.remove('component-unavailable');
      panel.classList.add('component-ready');
      canvas.style.opacity = '';
      panel.querySelector('[data-view-label]').textContent = 'REAL COMPONENTS. UP CLOSE.';
      panel.setAttribute('aria-busy', 'false');
      switching = false; sync();
      // Keep at most three models cached; the tour loads each next part on demand.
      for (const [key, promise] of cache) {
        if (cache.size <= 3) break;
        if (key === current || key === target) continue;
        cache.delete(key);
        promise.then(root => {
          if (root === active) return;
          root.traverse(child => {
            if (!child.isMesh) return;
            child.geometry.dispose();
            child.material.map?.dispose();
            child.material.dispose();
          });
        }).catch(() => {});
      }
    } catch {
      if (token !== request) return;
      switching = false; panel.setAttribute('aria-busy', 'false');
      panel.querySelector('[data-view-label]').textContent = active ? 'COMPONENT UNAVAILABLE. TRY ANOTHER.' : 'COMPONENT PREVIEW';
      if (!active) panel.classList.add('component-unavailable');
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
    } else if (!paused && !preference.matches && !switching) {
      elapsed += delta;
      if (elapsed >= duration) {
        elapsed = 0;
        if (tour) select((current + 1) % components.length);
      }
    }
    render();
    if ((visible && !paused && !preference.matches && !document.hidden) || angleStart !== null) frame = requestAnimationFrame(draw);
  }
  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0;
    pauseButton.hidden = preference.matches || !active;
    angleButton.hidden = !active;
    tourButton.hidden = !active || preference.matches;
    tourButton.setAttribute('aria-pressed', String(tour));
    tourButton.textContent = tour ? 'Tour on' : 'Auto tour';
    pauseButton.querySelector('[data-motion-label]').textContent = paused ? 'Play' : 'Pause';
    pauseButton.querySelector('.pause-icon').textContent = paused ? '▷' : 'Ⅱ';
    pauseButton.setAttribute('aria-label', paused ? 'Play camera motion' : 'Pause camera motion');
    const running = visible && !paused && !preference.matches && !document.hidden && !!active;
    panel.dataset.motion = running ? 'running' : 'paused';
    if (running || angleStart !== null) frame = requestAnimationFrame(draw); else render();
  }
  pauseButton.addEventListener('click', () => { paused = !paused; angleStart = null; sync(); });
  angleButton.addEventListener('click', () => {
    tour = false;
    if (preference.matches) { elapsed = (elapsed + duration / 4) % duration; sync(); }
    else { angleFrom = elapsed; angleTo = elapsed + duration / 4; angleStart = performance.now(); sync(); }
  });
  tabs.forEach((tab, index) => tab.addEventListener('click', () => { if (index !== current || target !== current) select(index, true); }));
  picker.addEventListener('change', () => select(Number(picker.value), true));
  tourButton.addEventListener('click', () => { tour = !tour; if (tour) paused = false; sync(); });
  preference.addEventListener('change', () => { angleStart = null; sync(); });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (!visible) angleStart = null; sync(); }, { threshold: .05 }).observe(stage);
  new ResizeObserver(resize).observe(stage);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); cancelAnimationFrame(frame); active = null;
    panel.classList.remove('component-ready'); panel.classList.add('component-unavailable');
    setLabels(0);
    panel.querySelector('[data-view-label]').textContent = 'COMPONENT PREVIEW';
    panel.setAttribute('aria-busy', 'false');
    pauseButton.hidden = true; angleButton.hidden = true;
  });
  resize(); await select(0);
}
