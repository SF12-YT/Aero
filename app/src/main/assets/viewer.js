/* AeroLab 25 — Sketchfab RB21 community model viewer.
 * The source mesh labels are preserved. System grouping below is an app-side
 * convenience layer, not a claim that the mesh is factory CAD or RB21-certified.
 */
(() => {
  'use strict';

  const canvas = document.getElementById('gl');
  const status = document.getElementById('modelStatus');
  const partHost = document.getElementById('parts');
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const temp = new THREE.Vector3();

  const systems = [
    { id: 'rear', category: 'AERO', label: 'AERODYNAMICS', name: 'Rear wing & DRS', short: 'Rear wing / DRS', accuracy: 'SOURCE MESH GROUP', desc: 'Separate rear-wing and DRS meshes from the downloaded model. The original mesh names are retained.' , explode: [0, 1.0, 0] },
    { id: 'body', category: 'AERO', label: 'EXTERIOR BODYWORK', name: 'Exterior panels', short: 'Exterior panels', accuracy: 'SOURCE MESH GROUP', desc: 'The remaining body panels are grouped here because many source objects use generic redbull_* labels rather than named engineering assemblies.', explode: [0, 0.65, 0] },
    { id: 'mirrors', category: 'AERO', label: 'EXTERIOR DETAILS', name: 'Mirrors & antennas', short: 'Mirrors / antennas', accuracy: 'SOURCE MESH GROUP', desc: 'Mirror and antenna objects identified from the source hierarchy.', explode: [0.7, 0.25, 0] },
    { id: 'cockpit', category: 'CHASSIS', label: 'DRIVER ENVIRONMENT', name: 'Cockpit & steering', short: 'Cockpit / steering', accuracy: 'SOURCE MESH GROUP', desc: 'Cockpit and steering-wheel objects, including the source model’s high/low-detail and control subassemblies.', explode: [0, 1.0, 0] },
    { id: 'cell', category: 'CHASSIS', label: 'PRIMARY STRUCTURE', name: 'Survival cell', short: 'Survival cell', accuracy: 'SOURCE MESH GROUP', desc: 'Meshes grouped under the source safetycell hierarchy. This is a visual model, not structural or crash-certification data.', explode: [0, 0.35, 0] },
    { id: 'suspension', category: 'SUSPENSION', label: 'SUSPENSION', name: 'Suspension & steering links', short: 'Suspension', accuracy: 'SOURCE MESH GROUP', desc: 'Front and rear suspension/steering meshes identified by their LF, RF, LR and RR parent groups.', explode: [0, 0, 0.75] },
    { id: 'wheels', category: 'SUSPENSION', label: 'ROTATING ASSEMBLIES', name: 'Wheels & hubs', short: 'Wheels / hubs', accuracy: 'SOURCE MESH GROUP', desc: 'Four wheel and hub assemblies, with individual mesh objects retained for selection.', explode: [0, 0, 1.05] },
    { id: 'brakes', category: 'MECHANICAL', label: 'BRAKE HARDWARE', name: 'Brake callipers', short: 'Brake callipers', accuracy: 'SOURCE MESH GROUP', desc: 'Calliper meshes identified by the source CALIPER_* hierarchy. The archive does not provide a verified technical specification.', explode: [0, 0.15, 0.65] },
    { id: 'power', category: 'POWERTRAIN', label: '2025 HYBRID POWER UNIT', name: 'Honda RBPTH003 · 1.6L V6 hybrid', short: 'Power unit', accuracy: 'PUBLIC ARCHITECTURE · VISUAL STUDY', desc: 'Honda identifies the RB21 unit as the RBPTH003: a 1,600 cc, 90-degree V6 with turbocharger, MGU-K and MGU-H. Honda lists 15,000 rpm maximum engine speed, 125,000 rpm MGU-H speed and 160 bhp maximum MGU-K output. The assembly below uses the 2025 FIA layout constraints. Component contours, hidden internals and exact RB21 installation positions are reference-led estimates, not Honda or Red Bull CAD.', explode: [0, 0.65, 0] }
  ];
  const systemById = Object.fromEntries(systems.map(s => [s.id, s]));
  const meshes = [];
  let currentMatchCount = 0;
  const hiddenSystems = new Set();
  const hiddenMeshes = new Set();
  let carRoot = null;
  let selectedSystem = 'body';
  let selectedMesh = null;
  let isolated = false;
  let exploded = false;
  let modelCenter = new THREE.Vector3();
  let maxModelDimension = 5;
  let lengthAxis = 'x';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
  camera.up.set(0, 1, 0);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = false;

  scene.add(new THREE.HemisphereLight(0xdceaff, 0x1a2635, 1.35));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.15);
  keyLight.position.set(5, 8, 7);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x8bb7e8, 0.8);
  fillLight.position.set(-7, 3, -5);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xffc47e, 0.7);
  rimLight.position.set(-4, 5, 6);
  scene.add(rimLight);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.rotateSpeed = 0.48;
  controls.zoomSpeed = 0.72;
  controls.minDistance = 2.4;
  controls.maxDistance = 28;

  function allNames(object) {
    const names = [];
    let node = object;
    while (node && node !== carRoot) {
      if (node.name) names.push(node.name);
      node = node.parent;
    }
    return names.join(' ').toUpperCase();
  }

  function classify(object) {
    const names = allNames(object);
    if (/POWERTRAIN|POWER_UNIT|TURBO|MGU[-_ ]?[HK]|EXHAUST|GEARBOX|ENGINE(?![_ ]?COVER|COVER)/.test(names)) return 'power';
    if (/CALIPER_(RF|LF|RR|LR)/.test(names)) return 'brakes';
    if (/WHEEL_(RF|LF|RR|LR)|HUB_(RF|LF|RR|LR)/.test(names)) return 'wheels';
    if (/SUSP_(RF|LF|RR|LR)|STEER_(RF|LF|RR|LR)/.test(names)) return 'suspension';
    if (/REARWING|DRS|RWING_WOBBLE/.test(names)) return 'rear';
    if (/SAFETYCELL/.test(names)) return 'cell';
    if (/COCKPIT|STEER_HR|STEERING_WHEEL|SW_RB19/.test(names)) return 'cockpit';
    if (/MIRROR[LR]?|ANTENNA|\bANT1\b/.test(names)) return 'mirrors';
    return 'body';
  }

  function humanName(name) {
    if (!name) return 'Unnamed mesh';
    return name.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function setStatus(message, ready = false) {
    if (status) {
      status.textContent = message;
      status.style.color = ready ? '#8dd9df' : '#ffcc83';
    }
  }

  function cloneMaterial(material) {
    return Array.isArray(material) ? material.map(m => m.clone()) : material.clone();
  }

  function clearHighlights() {
    for (const mesh of meshes) {
      if (mesh.userData.originalMaterial) {
        mesh.material = mesh.userData.originalMaterial;
        delete mesh.userData.originalMaterial;
      }
    }
  }

  function highlightSelection() {
    clearHighlights();
    const system = systemById[selectedSystem];
    if (!system) return;
    for (const mesh of meshes) {
      if (mesh.userData.systemId !== selectedSystem) continue;
      mesh.userData.originalMaterial = mesh.material;
      mesh.material = cloneMaterial(mesh.material);
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (material.emissive) {
          material.emissive.setHex(mesh === selectedMesh ? 0x704016 : 0x291b0d);
          material.emissiveIntensity = mesh === selectedMesh ? 0.85 : 0.25;
        }
      }
    }
  }

  function applyVisibility() {
    let hiddenMeshCount = 0;
    for (const mesh of meshes) {
      const id = mesh.userData.systemId;
      const hidden = hiddenSystems.has(id) || hiddenMeshes.has(mesh)
        || (isolated && (selectedMesh ? mesh !== selectedMesh : id !== selectedSystem));
      mesh.visible = !hidden;
      if (hidden) hiddenMeshCount++;
    }
    const counter = document.getElementById('partCount');
    if (counter) counter.textContent = `${meshes.length} OBJECTS · ${currentMatchCount} MATCHED · ${hiddenMeshCount} HIDDEN`;
    const toggle = document.getElementById('togglePart');
    if (toggle) {
      const isHidden = selectedMesh ? hiddenMeshes.has(selectedMesh) : hiddenSystems.has(selectedSystem);
      toggle.textContent = isHidden ? (selectedMesh ? 'SHOW OBJECT' : 'SHOW SYSTEM') : (selectedMesh ? 'HIDE OBJECT' : 'HIDE SYSTEM');
    }
    const isolate = document.getElementById('isolate');
    if (isolate) isolate.textContent = isolated ? 'RESTORE ALL' : (selectedMesh ? 'ISOLATE OBJECT' : 'ISOLATE SYSTEM');
  }

  function renderParts() {
    if (!partHost) return;
    partHost.innerHTML = '';
    const filter = window.aeroFilter || 'ALL';
    const query = (document.getElementById('meshSearch')?.value || '').trim().toUpperCase();
    const filtered = meshes.filter(mesh => {
      const system = systemById[mesh.userData.systemId];
      if (!system || (filter !== 'ALL' && system.category !== filter)) return false;
      if (!query) return true;
      const searchable = `${mesh.name || ''} ${humanName(mesh.name)} ${system.name} ${system.category}`.toUpperCase();
      return searchable.includes(query);
    });

    currentMatchCount = filtered.length;
    for (const mesh of filtered) {
      const system = systemById[mesh.userData.systemId];
      const button = document.createElement('button');
      button.className = 'part' + (mesh === selectedMesh ? ' active' : '');
      button.type = 'button';
      button.title = `${mesh.name || 'Unnamed mesh'} · ${system.name}`;
      const number = document.createElement('span');
      number.className = 'num';
      number.textContent = String(meshes.indexOf(mesh) + 1).padStart(3, '0');
      const labels = document.createElement('span');
      labels.className = 'meshlabels';
      const name = document.createElement('span');
      name.className = 'pname';
      name.textContent = humanName(mesh.name);
      const group = document.createElement('span');
      group.className = 'psystem';
      group.textContent = system.short;
      labels.append(name, group);
      button.append(number, labels);
      button.addEventListener('click', () => selectSystem(mesh.userData.systemId, mesh));
      partHost.appendChild(button);
    }

    const counter = document.getElementById('partCount');
    if (counter) counter.textContent = `${meshes.length} OBJECTS · ${filtered.length} MATCHED`;
    const empty = document.getElementById('emptyParts');
    if (empty) empty.classList.toggle('hidden', filtered.length !== 0);
  }

  function selectSystem(id, focusMesh) {
    if (!systemById[id]) return;
    selectedSystem = id;
    selectedMesh = focusMesh || null;
    const system = systemById[id];
    const componentInfo = focusMesh?.userData?.componentInfo;
    document.getElementById('selCategory').textContent = componentInfo?.label || system.label;
    document.getElementById('selAccuracy').textContent = componentInfo?.accuracy || system.accuracy;
    document.getElementById('selName').textContent = focusMesh ? humanName(focusMesh.name) : system.name;
    document.getElementById('selDesc').textContent = componentInfo
      ? componentInfo.description
      : focusMesh
        ? `${system.name} · original source object: ${focusMesh.name || 'unnamed'}. This is a selectable mesh from the community model, not a verified factory part number.`
        : system.desc;
    highlightSelection();
    renderParts();
    applyVisibility();
  }

  function updateExplode() {
    if (!carRoot) return;
    carRoot.updateMatrixWorld(true);
    for (const mesh of meshes) {
      const base = mesh.userData.basePosition;
      if (!base) continue;
      if (!exploded) {
        mesh.position.copy(base);
        continue;
      }
      const world = mesh.userData.baseWorldPosition.clone();
      const direction = world.clone().sub(modelCenter);
      if (direction.lengthSq() < 1e-8) direction.set(0, 1, 0);
      direction.normalize();
      world.addScaledVector(direction, 0.48);
      mesh.parent.worldToLocal(world);
      mesh.position.copy(world);
    }
    carRoot.updateMatrixWorld(true);
  }

  function fitCamera() {
    const distance = Math.max(6.7, maxModelDimension * 1.65);
    controls.target.set(0, 0, 0);
    camera.up.set(0, 1, 0);
    camera.position.set(distance * 0.95, distance * 0.52, distance * 1.12);
    camera.near = Math.max(0.01, maxModelDimension / 1000);
    camera.far = maxModelDimension * 100;
    camera.updateProjectionMatrix();
    controls.minDistance = maxModelDimension * 0.5;
    controls.maxDistance = maxModelDimension * 5;
    controls.update();
  }

  function setView(view) {
    document.querySelectorAll('.toolbtn').forEach(b => b.classList.remove('active'));
    const id = view === 'iso' ? 'viewIso' : view === 'side' ? 'viewSide' : 'viewTop';
    document.getElementById(id)?.classList.add('active');
    const d = Math.max(6.7, maxModelDimension * 1.65);
    controls.target.set(0, 0, 0);
    if (view === 'iso') {
      camera.up.set(0, 1, 0);
      camera.position.set(d * 0.95, d * 0.52, d * 1.12);
    } else if (view === 'side') {
      camera.up.set(0, 1, 0);
      if (lengthAxis === 'x') camera.position.set(0, d * 0.12, d * 1.85);
      else camera.position.set(d * 1.85, d * 0.12, 0);
    } else {
      camera.up.set(0, 0, -1);
      camera.position.set(0, d * 1.9, 0.001);
    }
    camera.lookAt(controls.target);
    controls.update();
  }

  function onResize() {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize, { passive: true });

  document.getElementById('viewIso').addEventListener('click', () => setView('iso'));
  document.getElementById('viewSide').addEventListener('click', () => setView('side'));
  document.getElementById('viewTop').addEventListener('click', () => setView('top'));
  document.getElementById('viewReset').addEventListener('click', () => setView('iso'));

  document.getElementById('togglePart').addEventListener('click', () => {
    if (selectedMesh) {
      if (hiddenMeshes.has(selectedMesh)) hiddenMeshes.delete(selectedMesh);
      else hiddenMeshes.add(selectedMesh);
    } else {
      if (hiddenSystems.has(selectedSystem)) hiddenSystems.delete(selectedSystem);
      else hiddenSystems.add(selectedSystem);
    }
    applyVisibility();
    renderParts();
  });
  document.getElementById('isolate').addEventListener('click', () => {
    isolated = !isolated;
    applyVisibility();
  });
  document.getElementById('explode').addEventListener('click', () => {
    exploded = !exploded;
    updateExplode();
    const button = document.getElementById('explode');
    button.classList.toggle('active', exploded);
    button.textContent = exploded ? 'EXPLODED VIEW ✓' : 'EXPLODED VIEW ↗';
  });
  document.getElementById('tabs').addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    window.aeroFilter = button.dataset.filter;
    document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab === button));
    renderParts();
  });

  document.getElementById('meshSearch').addEventListener('input', renderParts);

  let downPoint = null;
  canvas.addEventListener('pointerdown', event => { downPoint = { x: event.clientX, y: event.clientY }; }, { passive: true });
  canvas.addEventListener('pointerup', event => {
    if (!downPoint) return;
    const moved = Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y);
    downPoint = null;
    if (moved > 6 || !carRoot) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(meshes, false).find(item => item.object.visible);
    if (hit) selectSystem(hit.object.userData.systemId, hit.object);
  }, { passive: true });

  function registerMeshes(root) {
    root.traverse(object => {
      if (!object.isMesh) return;
      const id = object.userData.systemId || classify(object);
      object.userData.systemId = id;
      object.userData.basePosition = object.position.clone();
      object.userData.originalMaterial = null;
      object.frustumCulled = true;
      if (object.geometry && object.geometry.attributes && object.geometry.attributes.normal === undefined) object.geometry.computeVertexNormals();
      meshes.push(object);
    });
    root.updateMatrixWorld(true);
    for (const mesh of meshes) {
      mesh.userData.baseWorldPosition = mesh.getWorldPosition(new THREE.Vector3());
    }
  }

  function loadModel() {
    setStatus('LOADING RB21 MODEL…');
    const manager = new THREE.LoadingManager();
    manager.onError = url => {
      console.error('AeroLab asset request failed:', url);
    };
    const loader = new THREE.GLTFLoader(manager);
    const modelUrl = new URL('models/rb21.glb', document.baseURI).href;
    loader.load(modelUrl, gltf => {
      carRoot = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(carRoot);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      maxModelDimension = Math.max(size.x, size.y, size.z, 0.1);
      lengthAxis = size.x >= size.z ? 'x' : 'z';

      // Add a separate, individually selectable RBPTH003 layout study to the
      // existing car scene before applying the same model normalisation.
      if (window.AeroPowerUnit && typeof window.AeroPowerUnit.build === 'function') {
        const powerUnit = window.AeroPowerUnit.build({ bounds, size, lengthAxis });
        if (powerUnit) carRoot.add(powerUnit);
      }
      scene.add(carRoot);
      registerMeshes(carRoot);

      const scale = 5.5 / maxModelDimension;
      carRoot.scale.multiplyScalar(scale);
      carRoot.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
      carRoot.updateMatrixWorld(true);

      const normalizedBounds = new THREE.Box3().setFromObject(carRoot);
      const normalizedCenter = normalizedBounds.getCenter(new THREE.Vector3());
      modelCenter.copy(normalizedCenter);
      maxModelDimension = Math.max(...normalizedBounds.getSize(new THREE.Vector3()).toArray());
      for (const mesh of meshes) {
        mesh.userData.baseWorldPosition = mesh.getWorldPosition(new THREE.Vector3());
      }

      const floorY = normalizedBounds.min.y - 0.025;
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(maxModelDimension * 5.5, maxModelDimension * 5.5),
        new THREE.MeshStandardMaterial({ color: 0x0b1522, roughness: 0.96, metalness: 0.03 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = floorY;
      ground.receiveShadow = false;
      scene.add(ground);
      const grid = new THREE.GridHelper(maxModelDimension * 5, 32, 0x34465b, 0x1e2b3b);
      grid.position.y = floorY + 0.004;
      if (Array.isArray(grid.material)) grid.material.forEach(m => { m.transparent = true; m.opacity = 0.27; });
      else { grid.material.transparent = true; grid.material.opacity = 0.27; }
      scene.add(grid);

      const available = systems.filter(system => meshes.some(mesh => mesh.userData.systemId === system.id));
      if (!available.some(s => s.id === selectedSystem)) selectedSystem = available[0]?.id || 'body';
      renderParts();
      selectSystem(selectedSystem, null);
      fitCamera();
      onResize();
      setStatus(`MODEL READY · ${meshes.length} MESHES`, true);
    }, xhr => {
      if (xhr.total > 0) setStatus(`LOADING MODEL · ${Math.round(xhr.loaded / xhr.total * 100)}%`);
    }, error => {
      const detail = error && (error.message || error.type || error.statusText)
        ? (error.message || error.type || error.statusText)
        : 'asset request or GLB parsing error';
      console.error('RB21 GLB load failed:', detail, error);
      setStatus('MODEL LOAD FAILED');
      document.getElementById('selName').textContent = 'Model could not be loaded';
      document.getElementById('selDesc').textContent = `The bundled model could not be read from ${modelUrl}. ${detail}. Check the Android log for the exact asset error.`;
    });
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  onResize();
  loadModel();
  animate();
})();
