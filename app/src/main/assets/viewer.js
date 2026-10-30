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
    { id: 'rear', category: 'AERO', label: 'REAR AERODYNAMICS', name: 'Rear wing & DRS', short: 'Rear wing / DRS', accuracy: 'SOURCE MESH + USER ID', desc: 'Rear-wing, main-plane and DRS-flap source meshes. Sponsor graphics are catalogued separately so they can be found without confusing decals with structural wing elements.', explode: [0, 1.0, 0] },
    { id: 'body', category: 'BODYWORK', label: 'EXTERIOR BODYWORK', name: 'Body panels & lighting', short: 'Bodywork', accuracy: 'SOURCE MESH GROUP', desc: 'Exterior panels, rear lighting, camera covers and other exterior body pieces. Generic source meshes remain explicitly identified as unverified where their function is unknown.', explode: [0, 0.65, 0] },
    { id: 'mirrors', category: 'AERO', label: 'EXTERIOR DETAILS', name: 'Mirrors & antennas', short: 'Mirrors / antennas', accuracy: 'SOURCE MESH GROUP', desc: 'Mirror and antenna objects identified from the source hierarchy.', explode: [0.7, 0.25, 0] },
    { id: 'cockpit', category: 'DRIVER', label: 'DRIVER ENVIRONMENT', name: 'Cockpit, harness & steering', short: 'Cockpit / driver', accuracy: 'SOURCE MESH GROUP', desc: 'Cockpit and steering-wheel objects. The seatbelt harness is identified from the supplied source-object annotations.', explode: [0, 1.0, 0] },
    { id: 'cell', category: 'CHASSIS', label: 'PRIMARY STRUCTURE', name: 'Survival cell', short: 'Survival cell', accuracy: 'SOURCE MESH GROUP', desc: 'Meshes grouped under the source safetycell hierarchy. This is a visual model, not structural or crash-certification data.', explode: [0, 0.35, 0] },
    { id: 'suspension', category: 'SUSPENSION', label: 'SUSPENSION', name: 'Suspension & steering links', short: 'Suspension', accuracy: 'SOURCE MESH GROUP', desc: 'Front and rear suspension/steering meshes identified by source wheel-corner hierarchy and the supplied wheel-rod annotations.', explode: [0, 0, 0.75] },
    { id: 'wheels', category: 'WHEELS', label: 'WHEEL ASSEMBLIES', name: 'Wheels, rims & tyres', short: 'Wheels / tyres', accuracy: 'SOURCE MESH + USER ID', desc: 'Four corner-specific wheel and tyre assemblies. Wheel and tyre meshes remain independently selectable.', explode: [0, 0, 1.05] },
    { id: 'brakes', category: 'BRAKES', label: 'BRAKE HARDWARE', name: 'Brake ducts & drums', short: 'Brakes', accuracy: 'SOURCE MESH + USER ID', desc: 'Corner-specific brake ducts and complete brake-drum meshes identified by the supplied source-object annotations. Internal disc, caliper and cooling details are not inferred from these labels.', explode: [0, 0.15, 0.65] },
    { id: 'branding', category: 'BRANDING', label: 'LIVERY & SPONSOR MARKINGS', name: 'Logos, decals & markings', short: 'Livery / sponsors', accuracy: 'USER-IDENTIFIED SOURCE MESH', desc: 'Sponsor logos, team marks, driver name, sanctioning-body marks and visual orientation cues. These meshes are graphics/markings, not structural car components.', explode: [0, 0.2, 0] },
    { id: 'power', category: 'POWERTRAIN', label: '2025 HYBRID POWER UNIT', name: 'Honda RBPTH003 · 1.6L V6 hybrid', short: 'Power unit', accuracy: 'PUBLIC ARCHITECTURE · VISUAL STUDY', desc: 'Honda identifies the RB21 unit as the RBPTH003: a 1,600 cc, 90-degree V6 with turbocharger, MGU-K and MGU-H. Honda lists 15,000 rpm maximum engine speed, 125,000 rpm MGU-H speed and 160 bhp maximum MGU-K output. The assembly below uses the 2025 FIA layout constraints. Component contours, hidden internals and exact RB21 installation positions are reference-led estimates, not Honda or Red Bull CAD.', explode: [0, 0.65, 0] }
  ];
  const systemById = Object.fromEntries(systems.map(s => [s.id, s]));
  // Exact source-object annotations supplied by the project owner. Keys are
  // normalized for Blender's common underscore/space naming differences;
  // original GLB names are never changed or discarded.
  const knownSourceParts = new Map();
  function addKnownParts(systemId, label, entries, groupDescription) {
    for (const entry of entries) {
      const [sourceName, displayName, description, tags = ''] = entry;
      const key = sourceName.toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
      const existing = knownSourceParts.get(key);
      if (existing) {
        // Preserve conflicting supplied annotations instead of silently letting
        // the later label overwrite the earlier one.
        existing.displayName = `${existing.displayName} / ${displayName}`;
        existing.description = `The supplied annotations assign this same source object more than one identity: ${existing.description} Additional annotation: ${description} Visually verify this object before treating either interpretation as definitive.`;
        existing.tags = `${existing.tags} ${tags} ${displayName}`.trim();
        existing.accuracy = 'ANNOTATION CONFLICT · REVIEW';
      } else {
        knownSourceParts.set(key, {
          displayName, label, systemId, description,
          tags: `${tags} ${sourceName} ${displayName} ${label}`.trim(),
          accuracy: 'USER-IDENTIFIED SOURCE MESH',
          userIdentified: true
        });
      }
    }
  }

  addKnownParts('brakes', 'FRONT BRAKE COOLING', [
    ['redbull 31', 'Front-right brake duct', 'Front-right brake-duct mesh, identified from the source object name. The mesh label does not establish duct internals or airflow performance.', 'RF front right cooling'],
    ['redbull 32', 'Front-left brake duct', 'Front-left brake-duct mesh, identified from the source object name. The mesh label does not establish duct internals or airflow performance.', 'LF front left cooling']
  ]);
  addKnownParts('brakes', 'REAR BRAKE COOLING', [
    ['redbull 01 010 001', 'Rear-left brake duct', 'Rear-left brake-duct mesh, identified from the source object name.', 'LR rear left cooling'],
    ['redbull 01 009 001', 'Rear-right brake duct', 'Rear-right brake-duct mesh, identified from the source object name.', 'RR rear right cooling']
  ]);
  addKnownParts('brakes', 'BRAKE DRUM ASSEMBLIES', [
    ['redbull 35', 'Rear-right brake drum', 'Complete rear-right brake-drum mesh as identified by the supplied source annotation.', 'RR rear right'],
    ['redbull 34', 'Rear-left brake drum', 'Complete rear-left brake-drum mesh as identified by the supplied source annotation.', 'LR rear left'],
    ['redbull 03', 'Front-left brake drum', 'Complete front-left brake-drum mesh as identified by the supplied source annotation.', 'LF front left'],
    ['redbull 04', 'Front-right brake drum', 'Complete front-right brake-drum mesh as identified by the supplied source annotation.', 'RF front right']
  ]);

  addKnownParts('wheels', 'WHEELS & TYRES', [
    ['redbull 27 SUB1', 'Front-right wheel / rim', 'Front-right wheel mesh. Kept separate from its tyre mesh for independent inspection.', 'RF front right rim wheel'],
    ['redbull 27 SUB0', 'Front-right tyre', 'Front-right tyre mesh, separate from the wheel/rim.', 'RF front right tyre'],
    ['redbull 25 SUB1', 'Front-left wheel / rim', 'Front-left wheel mesh. Kept separate from its tyre mesh for independent inspection.', 'LF front left rim wheel'],
    ['redbull 25 SUB0', 'Front-left tyre', 'Front-left tyre mesh, separate from the wheel/rim.', 'LF front left tyre'],
    ['redbull 26 SUB1', 'Rear-left wheel / rim', 'Rear-left wheel mesh. Kept separate from its tyre mesh for independent inspection.', 'LR rear left rim wheel'],
    ['redbull 26 SUB0', 'Rear-left tyre', 'Rear-left tyre mesh, separate from the wheel/rim.', 'LR rear left tyre'],
    ['redbull 28 SUB1', 'Rear-right wheel / rim', 'Rear-right wheel mesh. Kept separate from its tyre mesh for independent inspection.', 'RR rear right rim wheel'],
    ['redbull 28 SUB0', 'Rear-right tyre', 'Rear-right tyre mesh, separate from the wheel/rim.', 'RR rear right tyre']
  ]);
  addKnownParts('suspension', 'WHEEL-LINK HARDWARE', [
    ['redbull 02 006 001', 'Front-right wheel rod', 'Front-right wheel-rod mesh, identified from the supplied source annotation. Exact linkage function is not inferred beyond that label.', 'RF front right link rod'],
    ['redbull 02 003 001', 'Front-left wheel rod', 'Front-left wheel-rod mesh, identified from the supplied source annotation. Exact linkage function is not inferred beyond that label.', 'LF front left link rod']
  ]);
  addKnownParts('cockpit', 'DRIVER RESTRAINT', [
    ['CINTURE ON SUB1', 'Seatbelt harness · section 1', 'One independently selectable seatbelt-harness mesh section. The two source objects are both retained.', 'seat belt driver restraint'],
    ['CINTURE ON SUB0', 'Seatbelt harness · section 2', 'One independently selectable seatbelt-harness mesh section. The two source objects are both retained.', 'seat belt driver restraint']
  ]);

  addKnownParts('rear', 'REAR WING & DRS', [
    ['rearwing', 'DRS flap', 'Rear-wing DRS flap mesh, identified from the supplied source annotation.', 'rear wing drag reduction system'],
    ['rearwing 003 001', 'Rear-wing main element', 'Rear-wing element mesh identified as the wing by the supplied annotation. The source model does not provide verified aero-surface data.', 'rear wing aero element']
  ]);
  addKnownParts('body', 'REAR LIGHTING', [
    ['rearlight', 'Rear light', 'Rear light mesh.', 'rear brake light'],
    ['rearlight2', 'Rear light · secondary mesh', 'Second rear-light mesh in the source model; kept separately selectable.', 'rear brake light']
  ]);

  addKnownParts('branding', 'REAR-WING SPONSOR MARKINGS', [
    ['rearwing 011 001', 'Oracle logo · rear wing', 'Oracle logo graphic on the rear wing.', 'Oracle sponsor decal'],
    ['rearwing 012 001', 'Gate.io logo · upper half', 'Upper half of the Gate.io logo graphic on the rear wing.', 'Gate.io sponsor decal'],
    ['rearwing 008 001', 'Mobil 1 logos · rear wing', 'Mobil 1 logo graphics on the rear wing.', 'Mobil 1 sponsor decal'],
    ['rearwing 009 001', 'Heineken logos · rear wing', 'Heineken logo graphics on the rear wing.', 'Heineken sponsor decal'],
    ['rearwing 010 001', 'Cola logos · rear wing', 'Cola logo graphics on the rear wing, as labelled in the source annotation.', 'cola beverage decal'],
    ['rearwing 011 001', 'Gate.io logo · lower half', 'Lower half of the Gate.io logo graphic on the rear wing.', 'Gate.io sponsor decal']
  ]);
  addKnownParts('branding', 'TEAM & PARTNER MARKINGS', [
    ['redbull 03 002 001', 'Red Bull logo', 'Red Bull team logo graphic.', 'team logo decal'],
    ['redbull 03 001 001', 'Hard Rock logo', 'Hard Rock sponsor logo graphic.', 'Hard Rock sponsor decal'],
    ['redbull 13 005 001', 'Oracle & TAG Heuer logos', 'Combined Oracle and TAG Heuer logo graphic.', 'Oracle TAG Heuer sponsor decal'],
    ['redbull 13 004 001', 'Mobil 1 logos', 'Mobil 1 sponsor logo graphics.', 'Mobil 1 decal'],
    ['redbull 13 002 001', 'Pepe Jeans logo', 'Pepe Jeans sponsor logo graphic.', 'Pepe Jeans decal'],
    ['redbull 13 001 001', 'Red Bull logo & N symbol', 'Red Bull logo and N symbol graphic, as identified in the supplied annotation.', 'Red Bull N symbol decal'],
    ['redbull 17 002 001', 'Rauch logos', 'Rauch sponsor logo graphics.', 'Rauch decal'],
    ['RB19 052 001', 'Halo logos', 'Sponsor/team logo markings on the Halo. The source object retains its RB19-prefixed name.', 'halo sponsor decal'],
    ['redbull 12 001 001', 'Front-nose sponsor logos', 'Group of white sponsor logos on the front nose, as identified in the supplied annotation.', 'nose white sponsor logos'],
    ['redbull 12 002 001', 'HRC & Red Bull Racing logos', 'Honda Racing Corporation and Red Bull Racing logo graphic.', 'HRC Honda Red Bull Racing'],
    ['redbull 12 003 001', 'Mobil logos · nose', 'Mobil logo graphics on the nose.', 'Mobil sponsor decal'],
    ['redbull 15 001 001', 'FIA logos', 'FIA logo markings.', 'FIA decal'],
    ['redbull 13 006 001', '1Password logos', '1Password sponsor logo graphics.', '1Password decal'],
    ['redbull 14 001 001', 'Rauch & Castore logos', 'Rauch and Castore logo graphics.', 'Rauch Castore decal'],
    ['redbull 15 002 001', 'HD & Siemens logos', 'HD and Siemens logo graphics, as identified in the supplied annotation.', 'HD Siemens decal'],
    ['redbull 13 013 001', 'Red Bull logo · body', 'Red Bull team logo graphic.', 'Red Bull team decal'],
    ['redbull 13 014 001', 'Visa logos', 'Visa sponsor logo graphics.', 'Visa decal'],
    ['redbull 13 015 001', 'Gate.io logos', 'Gate.io sponsor logo graphics.', 'Gate.io decal'],
    ['redbull 11 003 001', 'AT&T logos', 'AT&T sponsor logo graphics.', 'ATT decal'],
    ['redbull 13 018 001', 'Max Verstappen cockpit name', 'Driver name marking for Max Verstappen on the cockpit.', 'Max Verstappen driver name cockpit'],
    ['redbull 13 021 001', 'Honda logos', 'Honda logo graphics.', 'Honda HRC decal']
  ]);
  addKnownParts('branding', 'VISUAL MARKINGS & DECALS', [
    ['redbull 13 012 001', 'T-cam direction markers', 'Two yellow triangular visual markers pointing towards the T-cam, as described in the supplied annotation.', 'yellow triangles T-cam markers']
  ]);
  addKnownParts('body', 'CAMERA HOUSING', [
    ['redbull 20 001 001', 'T-cam cover', 'T-cam cover mesh.', 'camera T-cam housing'],
    ['redbull 20 002 001', 'T-cam cover · left plate', 'Left plate of the T-cam cover assembly.', 'camera T-cam left'],
    ['redbull 20 003 001', 'T-cam cover · right plate', 'Right plate of the T-cam cover assembly.', 'camera T-cam right']
  ]);
  addKnownParts('body', 'EXTERIOR BODY PANELS', [
    ['redbull 13 008 001', 'Exterior body panel', 'Exterior body-panel mesh. The exact panel location is not specified by the supplied annotation.', 'bodywork panel exterior'],
    ['redbull 13 009 001', 'Exterior body panel', 'Exterior body-panel mesh. The exact panel location is not specified by the supplied annotation.', 'bodywork panel exterior'],
    ['redbull 13 010 001', 'Exterior body panel', 'Exterior body-panel mesh. The exact panel location is not specified by the supplied annotation.', 'bodywork panel exterior'],
    ['redbull 13 011 001', 'Exterior body panel', 'Exterior body-panel mesh. The exact panel location is not specified by the supplied annotation.', 'bodywork panel exterior'],
    ['redbull 13 022 001', 'Exterior body panel', 'Exterior body-panel mesh. The exact panel location is not specified by the supplied annotation.', 'bodywork panel exterior'],
    ['redbull 13 023 001', 'Exterior body panel', 'Exterior body-panel mesh. The exact panel location is not specified by the supplied annotation.', 'bodywork panel exterior'],
    ['redbull 13 024 001', 'Exterior body panel', 'Exterior body-panel mesh. The exact panel location is not specified by the supplied annotation.', 'bodywork panel exterior']
  ]);

  function normalizeSourceName(name) {
    return String(name || '').toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function findKnownSourcePart(object) {
    const candidates = [object.name, object.geometry && object.geometry.name, object.userData && object.userData.sourceName];
    for (const candidate of candidates) {
      const key = normalizeSourceName(candidate);
      if (knownSourceParts.has(key)) return knownSourceParts.get(key);
      // Blender may append a .001-style duplicate suffix; match only that suffix.
      const withoutDuplicate = key.replace(/\.\d{3,}$/, '');
      if (withoutDuplicate !== key && knownSourceParts.has(withoutDuplicate)) return knownSourceParts.get(withoutDuplicate);
    }
    return null;
  }
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
    if (/CALIPER_|BRAKE|BRK_DUCT|BRAKEDRUM/.test(names)) return 'brakes';
    if (/WHEEL_(RF|LF|RR|LR)|HUB_(RF|LF|RR|LR)|TYRE|TIRE/.test(names)) return 'wheels';
    if (/SUSP_(RF|LF|RR|LR)|STEER_(RF|LF|RR|LR)/.test(names)) return 'suspension';
    if (/REARWING|DRS|RWING_WOBBLE/.test(names)) return 'rear';
    if (/SAFETYCELL/.test(names)) return 'cell';
    if (/CINTURE|HARNESS|COCKPIT|STEER_HR|STEERING_WHEEL|SW_RB19/.test(names)) return 'cockpit';
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
    if (counter) counter.textContent = `${meshes.length} OBJECTS · ${meshes.filter(m => m.userData.componentInfo?.userIdentified).length} IDENTIFIED · ${currentMatchCount} MATCHED · ${hiddenMeshCount} HIDDEN`;
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
      const info = mesh.userData.componentInfo;
      if (!system || (filter !== 'ALL' && filter !== 'IDENTIFIED' && system.category !== filter)) return false;
      if (filter === 'IDENTIFIED' && !info?.userIdentified) return false;
      if (!query) return true;
      const searchable = `${mesh.name || ''} ${humanName(mesh.name)} ${info?.displayName || ''} ${info?.label || ''} ${info?.tags || ''} ${info?.description || ''} ${system.name} ${system.category}`.toUpperCase();
      return searchable.includes(query);
    });

    currentMatchCount = filtered.length;
    for (const mesh of filtered) {
      const system = systemById[mesh.userData.systemId];
      const button = document.createElement('button');
      button.className = 'part' + (mesh === selectedMesh ? ' active' : '');
      button.type = 'button';
      button.title = `${mesh.userData.componentInfo?.displayName || humanName(mesh.name)} · source: ${mesh.userData.componentInfo?.sourceObject || mesh.name || 'unnamed'} · ${system.name}`;
      const number = document.createElement('span');
      number.className = 'num';
      number.textContent = String(meshes.indexOf(mesh) + 1).padStart(3, '0');
      const labels = document.createElement('span');
      labels.className = 'meshlabels';
      const name = document.createElement('span');
      name.className = 'pname';
      name.textContent = mesh.userData.componentInfo?.displayName || humanName(mesh.name);
      const group = document.createElement('span');
      group.className = 'psystem';
      group.textContent = mesh.userData.componentInfo?.userIdentified ? `SOURCE: ${mesh.userData.componentInfo?.sourceObject || mesh.name}` : system.short;
      labels.append(name, group);
      button.append(number, labels);
      button.addEventListener('click', () => selectSystem(mesh.userData.systemId, mesh));
      partHost.appendChild(button);
    }

    const counter = document.getElementById('partCount');
    if (counter) counter.textContent = `${meshes.length} OBJECTS · ${meshes.filter(m => m.userData.componentInfo?.userIdentified).length} IDENTIFIED · ${filtered.length} MATCHED`;
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
    document.getElementById('selName').textContent = focusMesh ? (componentInfo?.displayName || humanName(focusMesh.name)) : system.name;
    document.getElementById('focusPart').textContent = focusMesh ? 'FOCUS PART' : 'FOCUS SYSTEM';
    document.getElementById('selDesc').textContent = componentInfo
      ? `${componentInfo.description} Source object: ${componentInfo.sourceObject || focusMesh.name || 'unnamed'}.`
      : focusMesh
        ? `${system.name} · original source object: ${focusMesh.name || 'unnamed'}. This selectable community-model mesh has not been identified as a factory part number.`
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

  function focusSelectedPart() {
    const targets = selectedMesh ? [selectedMesh] : meshes.filter(mesh => mesh.userData.systemId === selectedSystem);
    if (!targets.length) return;
    const bounds = new THREE.Box3().setFromObject(targets[0]);
    for (let i = 1; i < targets.length; i++) bounds.expandByObject(targets[i]);
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z, 0.025);
    const direction = camera.position.clone().sub(controls.target);
    if (direction.lengthSq() < 1e-8) direction.set(1, 0.5, 1);
    direction.normalize();
    const distance = Math.max(radius * 3.4, maxModelDimension * 0.12);
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(direction, distance);
    camera.near = Math.max(0.001, distance / 1000);
    camera.far = Math.max(maxModelDimension * 100, distance * 20);
    controls.minDistance = Math.max(0.02, Math.min(maxModelDimension * 0.5, distance * 0.45));
    controls.update();
    camera.updateProjectionMatrix();
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

  document.getElementById('focusPart').addEventListener('click', focusSelectedPart);

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
      const knownPart = findKnownSourcePart(object);
      const id = knownPart?.systemId || object.userData.systemId || classify(object);
      object.userData.systemId = id;
      if (knownPart) object.userData.componentInfo = { ...knownPart, sourceObject: object.name || object.geometry?.name || '' };
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
