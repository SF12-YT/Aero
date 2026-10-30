/* AeroLab 25 — 2025 Honda RBPTH003 power-unit layout study.
 * Publicly grounded architecture; internal castings, ancillary shapes and exact
 * RB21 installation coordinates are illustrative, not Honda/Red Bull CAD.
 * Local axes: +X forward, +Y up, +/-Z across the car. The turbo shaft is parallel
 * to the crankshaft, as required by the 2025 FIA Technical Regulations.
 */
(() => {
  'use strict';

  const THREE = window.THREE;
  if (!THREE) throw new Error('Three.js must be loaded before powerunit.js');

  function buildPowerUnit({ bounds, size, lengthAxis }) {
    const unit = (lengthAxis === 'x' ? size.x : size.z) / 5.5;
    const longSize = lengthAxis === 'x' ? size.x : size.z;
    const verticalSize = size.y;
    const group = new THREE.Group();
    group.name = 'Honda RBPTH003 — power unit study';
    group.userData.systemId = 'power';

    const materials = {
      block: new THREE.MeshStandardMaterial({ color: 0x56616c, metalness: 0.72, roughness: 0.42 }),
      alloy: new THREE.MeshStandardMaterial({ color: 0x929ba2, metalness: 0.78, roughness: 0.34 }),
      head: new THREE.MeshStandardMaterial({ color: 0x727e88, metalness: 0.74, roughness: 0.39 }),
      cover: new THREE.MeshStandardMaterial({ color: 0x182330, metalness: 0.48, roughness: 0.48 }),
      carbon: new THREE.MeshStandardMaterial({ color: 0x080d14, metalness: 0.18, roughness: 0.76 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x252f39, metalness: 0.68, roughness: 0.36 }),
      titanium: new THREE.MeshStandardMaterial({ color: 0x9c8069, metalness: 0.82, roughness: 0.32 }),
      exhaust: new THREE.MeshStandardMaterial({ color: 0x98765d, metalness: 0.84, roughness: 0.30 }),
      copper: new THREE.MeshStandardMaterial({ color: 0xa9653c, metalness: 0.78, roughness: 0.30 }),
      blue: new THREE.MeshStandardMaterial({ color: 0x31566d, metalness: 0.52, roughness: 0.39 }),
      black: new THREE.MeshStandardMaterial({ color: 0x05080d, metalness: 0.36, roughness: 0.57 }),
      orange: new THREE.MeshStandardMaterial({ color: 0xc47737, metalness: 0.42, roughness: 0.42 }),
      ceramic: new THREE.MeshStandardMaterial({ color: 0xd3d5d4, metalness: 0.15, roughness: 0.60 })
    };

    const info = {
      block: ['ICE · crankcase', 'Lower crankcase structure supporting the crankshaft and the two 45-degree cylinder banks. The external form is a proportioned study, not a disclosed RBPTH003 casting.'],
      bank: ['ICE · cylinder bank and head', 'One bank of three equal-capacity cylinders. The 90-degree V6 arrangement and four valves per cylinder follow the 2025 architecture; port, chamber and casting details are illustrative.'],
      liner: ['ICE · cylinder liner', 'One of six cylinder positions. The FIA 2025 nominal 80 mm bore is represented by an 80 mm internal reference; the visible sleeve outside diameter and wall thickness are illustrative.'],
      piston: ['ICE · piston', 'One of six reciprocating piston representations. The FIA 2025 rules require a four-stroke reciprocating-piston engine; piston crown, ring pack and skirt profiles are not Honda dimensions.'],
      rod: ['ICE · connecting rod', 'One of six connecting-rod representations linking a piston pin to one of the three crankpin positions. The 120 mm rod length and section are reference-led proportions, not disclosed Honda dimensions.'],
      pin: ['ICE · piston pin', 'Piston-pin representation joining each piston to its connecting rod. The 18 mm pin size is an illustrative scale choice; retention and oiling details are not publicly documented for the RBPTH003.'],
      valve: ['ICE · poppet valve', 'One of 24 axial poppet-valve representations: two inlet and two exhaust valves per cylinder, as required by the 2025 FIA regulations. Valve-head profiles and angles are schematic.'],
      camshaft: ['ICE · camshaft', 'One of four camshaft representations in a double-overhead-cam, four-valve V6 study. Exact RBPTH003 cam profiles, phasing and drive arrangement are not public.'],
      lobe: ['ICE · cam lobe', 'One of the schematic cam lobes. Its profile and timing are not Honda data; it represents the mechanical interface that actuates the poppet-valve train.'],
      cam: ['ICE · camshaft cover', 'Cam-cover and upper-head representation for a four-valve-per-cylinder, double-overhead-cam V6 study. Exact RBPTH003 cover geometry is not public.'],
      crank: ['ICE · crankshaft', 'Longitudinal crankshaft representation with three offset crankpin journals, matching the FIA limit of three connecting-rod bearing journals. The 53 mm throw and crank phasing are reference-led; the exact Honda crankshaft is not public.'],
      plenum: ['ICE · inlet plenum', 'Air plenum and six intake runners feeding the cylinder banks. The 2025 rules define the inlet system, but the precise RB21 plenum shape and routing are not public.'],
      runner: ['ICE · intake runner', 'One of six individual intake-runner representations connecting the plenum to a cylinder inlet.'],
      throttle: ['ICE · throttle / compressor inlet duct', 'Air-entry and throttle-body study. This is not an exact Honda throttle assembly or duct scan.'],
      injector: ['ICE · fuel rail / injector', 'Representative direct-injection rail and injector positions, one injector per cylinder shown schematically. Internal fuel pressures and component dimensions are not modelled.'],
      exhaust: ['Exhaust · primary pipe', 'One of six exhaust primary runners. The 2025 rules require exhaust outlets outboard of the cylinder-bore centreline, not in the centre of the V.'],
      collector: ['Exhaust · collector', 'Three primary runners from a cylinder bank merge towards the single-stage turbine. The precise RB21 manifold routing is not publicly disclosed.'],
      turbo: ['Turbocharger · compressor / turbine', 'Single-stage compressor and exhaust turbine on a common shaft parallel to the engine crankshaft, following FIA Article 5.2.6. The housing contours are schematic.'],
      rotor: ['Turbocharger · compressor / turbine wheel', 'Illustrative rotating wheel inside the compressor or turbine housing; blade count and aerofoil profiles are not Honda geometry.'],
      mguH: ['ERS · MGU-H', 'Motor-generator coupled directly to the turbocharger shaft. The 2025 limit is 125,000 rpm; the 2026 power-unit rules remove the MGU-H.'],
      mguK: ['ERS · MGU-K', 'Motor-generator mechanically linked to the powertrain before the main clutch. The 2025 FIA limit is 50,000 rpm and 120 kW; this visual housing is illustrative.'],
      battery: ['ERS · Energy Store', 'Energy-store enclosure shown as a chassis-mounted package. The 2025 rules require the ES main enclosure to be installed inside the survival cell; exact RB21 cell placement is estimated.'],
      ce: ['ERS · power-unit control electronics', 'Representative control-electronics enclosure and high-voltage junction. The location and external package are not claimed to match Honda hardware.'],
      cable: ['ERS · high-voltage cable', 'Schematic high-voltage connection between ERS components. Routing is illustrative and not a wiring diagram.'],
      charge: ['Turbocharger · charge-air pipe', 'Compressor outlet duct to the engine inlet plenum. Exact charge-air cooling and pipe routing vary by package and are not known from public RB21 CAD.'],
      wastegate: ['Turbocharger · wastegate actuator', 'Representative actuator and wastegate connection. It is separated in the inspector for component exploration.'],
      pump: ['ICE · ancillary pump', 'Representative engine-mounted oil or coolant pump. It is not identified as a specific Honda pump or an exact location.'],
      mount: ['ICE · mounting bracket', 'Representative power-unit mounting hardware. It is not a structural or load-rated mount design.']
    };

    function scaleVec(v) { return v.map(n => n * unit); }
    function register(mesh, name, key, parent = group) {
      mesh.name = name;
      mesh.userData.systemId = 'power';
      mesh.userData.componentInfo = {
        label: info[key][0],
        description: info[key][1],
        accuracy: 'REFERENCE-LED STUDY'
      };
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      parent.add(mesh);
      return mesh;
    }
    function box(name, dims, pos, mat, key, parent = group, rotation = null) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(...scaleVec(dims)), mat
      );
      mesh.position.set(...scaleVec(pos));
      if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
      return register(mesh, name, key, parent);
    }
    function sphere(name, radii, pos, mat, key, parent = group) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), mat);
      mesh.scale.set(...scaleVec(radii));
      mesh.position.set(...scaleVec(pos));
      return register(mesh, name, key, parent);
    }
    function cylinder(name, radius, length, pos, mat, key, axis = 'y', parent = group, radial = 28) {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * unit, radius * unit, length * unit, radial, 1), mat
      );
      mesh.position.set(...scaleVec(pos));
      if (axis === 'x') mesh.rotation.z = Math.PI / 2;
      else if (axis === 'z') mesh.rotation.x = Math.PI / 2;
      return register(mesh, name, key, parent);
    }
    function torus(name, radius, tube, pos, mat, key, axis = 'z', parent = group) {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(radius * unit, tube * unit, 10, 36), mat
      );
      mesh.position.set(...scaleVec(pos));
      if (axis === 'x') mesh.rotation.y = Math.PI / 2;
      else if (axis === 'y') mesh.rotation.x = Math.PI / 2;
      return register(mesh, name, key, parent);
    }
    function tube(name, points, radius, mat, key, parent = group) {
      const curve = new THREE.CatmullRomCurve3(
        points.map(p => new THREE.Vector3(p[0] * unit, p[1] * unit, p[2] * unit)),
        false,
        'centripetal'
      );
      const geometry = new THREE.TubeGeometry(curve, Math.max(18, points.length * 7), radius * unit, 8, false);
      return register(new THREE.Mesh(geometry, mat), name, key, parent);
    }
    function cylinderBetween(name, start, end, radius, mat, key, parent = group) {
      const a = new THREE.Vector3(...scaleVec(start));
      const b = new THREE.Vector3(...scaleVec(end));
      const direction = new THREE.Vector3().subVectors(b, a);
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * unit, radius * unit, direction.length(), 20, 1), mat
      );
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      return register(mesh, name, key, parent);
    }

    // Position the study in the rear half of the chassis. Dimensions scale with
    // the imported car bounds; the installation datum remains an estimate.
    const minLong = lengthAxis === 'x' ? bounds.min.x : bounds.min.z;
    const minLat = lengthAxis === 'x' ? bounds.min.z : bounds.min.x;
    const maxLat = lengthAxis === 'x' ? bounds.max.z : bounds.max.x;
    const longCentre = minLong + longSize * 0.255;
    const latCentre = (minLat + maxLat) * 0.5;
    const verticalCentre = bounds.min.y + verticalSize * 0.42;
    if (lengthAxis === 'x') {
      group.position.set(longCentre, verticalCentre, latCentre);
    } else {
      group.position.set(latCentre, verticalCentre, longCentre);
      group.rotation.y = -Math.PI / 2;
    }
    group.userData.installationNote = 'Installation datum is estimated from the community model envelope.';

    // ICE lower structure and longitudinal crankshaft.
    box('ICE — main crankcase', [0.72, 0.23, 0.43], [0, -0.105, 0], materials.block, 'block');
    box('ICE — lower bedplate / sump', [0.66, 0.095, 0.34], [-0.025, -0.245, 0], materials.dark, 'block');
    box('ICE — front timing case', [0.105, 0.255, 0.47], [0.36, -0.095, 0], materials.alloy, 'block');
    box('ICE — rear crankcase flange', [0.075, 0.245, 0.45], [-0.36, -0.09, 0], materials.alloy, 'block');
    cylinder('ICE — crankshaft main-journal spine (44 mm nominal)', 0.022, 0.66, [0, -0.105, 0], materials.titanium, 'crank', 'x', group, 28);
    const crankPhases = [0, Math.PI * 2 / 3, Math.PI * 4 / 3];
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.11;
      const phase = crankPhases[i];
      const pinY = -0.105 + 0.0265 * Math.cos(phase);
      const pinZ = 0.0265 * Math.sin(phase);
      cylinder(`ICE — crankpin journal ${i + 1} (38 mm nominal)`, 0.019, 0.085, [x, pinY, pinZ], materials.copper, 'crank', 'x', group, 24);
      for (const webOffset of [-0.050, 0.050]) {
        cylinder(`ICE — crank web ${i + 1} ${webOffset < 0 ? 'front' : 'rear'}`, 0.047, 0.016, [x + webOffset, -0.105, 0], materials.dark, 'crank', 'x', group, 28);
      }
    }
    for (const side of [-1, 1]) {
      box(`ICE — lower side rail ${side < 0 ? 'L' : 'R'}`, [0.66, 0.09, 0.045], [-0.02, -0.19, side * 0.235], materials.alloy, 'block');
    }

    // Two 45-degree banks: three cylinders per bank, six total, 90-degree V.
    const bankGroups = [];
    for (const side of [-1, 1]) {
      const bank = new THREE.Group();
      bank.name = `Cylinder bank ${side < 0 ? 'L' : 'R'}`;
      bank.position.set(0, -0.105, 0);
      bank.rotation.x = side * Math.PI / 4;
      group.add(bank);
      bankGroups.push(bank);
      box(`ICE — ${side < 0 ? 'left' : 'right'} bank casting`, [0.48, 0.155, 0.225], [0, 0.095, 0], materials.head, 'bank', bank);
      box(`ICE — ${side < 0 ? 'left' : 'right'} cylinder head`, [0.50, 0.095, 0.245], [-0.005, 0.215, 0], materials.alloy, 'bank', bank);
      box(`ICE — ${side < 0 ? 'left' : 'right'} camshaft cover`, [0.46, 0.065, 0.195], [-0.005, 0.295, 0], materials.cover, 'cam', bank);
      box(`ICE — ${side < 0 ? 'left' : 'right'} cover spine`, [0.42, 0.018, 0.045], [-0.005, 0.335, 0], materials.dark, 'cam', bank);

      for (let cylinderIndex = 0; cylinderIndex < 3; cylinderIndex++) {
        const x = (cylinderIndex - 1) * 0.11;
        const liner = new THREE.Mesh(new THREE.CylinderGeometry(0.043 * unit, 0.043 * unit, 0.168 * unit, 32, 1, true), materials.block);
        liner.position.set(...scaleVec([x, 0.084, 0]));
        register(liner, `ICE — ${side < 0 ? 'L' : 'R'} cylinder ${cylinderIndex + 1} liner outer wall`, 'liner', bank);
        const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.040 * unit, 0.040 * unit, 0.168 * unit, 32, 1, true), materials.dark);
        bore.position.set(...scaleVec([x, 0.084, 0]));
        register(bore, `ICE — ${side < 0 ? 'L' : 'R'} cylinder ${cylinderIndex + 1} bore surface (80 mm)`, 'liner', bank);
        cylinder(`ICE — ${side < 0 ? 'L' : 'R'} cam bearing cap ${cylinderIndex + 1}`, 0.015, 0.024, [x, 0.302, 0], materials.alloy, 'cam', 'y', bank, 20);
        cylinder(`ICE — ${side < 0 ? 'L' : 'R'} ignition coil ${cylinderIndex + 1}`, 0.019, 0.095, [x, 0.385, side * -0.025], materials.black, 'cam', 'y', bank, 16);
        cylinder(`ICE — ${side < 0 ? 'L' : 'R'} injector ${cylinderIndex + 1}`, 0.014, 0.105, [x, 0.112, side * 0.105], materials.copper, 'injector', 'y', bank, 14);

        // Reciprocating internals. Bore = 80 mm per FIA Article 5.4.1.
        // 53 mm stroke / 26.5 mm crank throw and 120 mm rod are reference-led
        // proportions, not disclosed Honda dimensions or a verified crank phase.
        const phase = crankPhases[cylinderIndex];
        const crankY = 0.0265 * Math.cos(phase);
        const crankZ = 0.0265 * Math.sin(phase);
        const bankAngle = side * Math.PI / 4;
        const pinLocalY = Math.cos(bankAngle) * crankY + Math.sin(bankAngle) * crankZ;
        const pinLocalZ = -Math.sin(bankAngle) * crankY + Math.cos(bankAngle) * crankZ;
        const rodLength = 0.120;
        const pistonPinY = pinLocalY + Math.sqrt(rodLength * rodLength - pinLocalZ * pinLocalZ);
        const pistonCentreY = pistonPinY - 0.005;
        cylinder(`ICE — ${side < 0 ? 'L' : 'R'} piston ${cylinderIndex + 1} (80 mm bore family)`, 0.0395, 0.030, [x, pistonCentreY, 0], materials.alloy, 'piston', 'y', bank, 28);
        cylinder(`ICE — ${side < 0 ? 'L' : 'R'} piston pin ${cylinderIndex + 1}`, 0.009, 0.073, [x, pistonPinY, 0], materials.titanium, 'pin', 'z', bank, 20);
        const rodBigEndX = x + side * 0.018;
        cylinderBetween(`ICE — ${side < 0 ? 'L' : 'R'} connecting rod ${cylinderIndex + 1}`, [x, pistonPinY, 0], [rodBigEndX, pinLocalY, pinLocalZ], 0.009, materials.titanium, 'rod', bank);

        // Four axial poppet valves per cylinder: two inlet and two exhaust.
        for (const valveSide of [-1, 1]) {
          const valveX = x + valveSide * 0.015;
          const inletZ = -0.021;
          const exhaustZ = 0.021;
          cylinder(`ICE — ${side < 0 ? 'L' : 'R'} cylinder ${cylinderIndex + 1} inlet valve ${valveSide < 0 ? 'A' : 'B'} stem`, 0.0025, 0.075, [valveX, 0.216, inletZ], materials.alloy, 'valve', 'y', bank, 12);
          sphere(`ICE — ${side < 0 ? 'L' : 'R'} cylinder ${cylinderIndex + 1} inlet valve ${valveSide < 0 ? 'A' : 'B'} head`, [0.0155, 0.0035, 0.0155], [valveX, 0.175, inletZ], materials.alloy, 'valve', bank);
          cylinder(`ICE — ${side < 0 ? 'L' : 'R'} cylinder ${cylinderIndex + 1} exhaust valve ${valveSide < 0 ? 'A' : 'B'} stem`, 0.0025, 0.075, [valveX, 0.216, exhaustZ], materials.titanium, 'valve', 'y', bank, 12);
          sphere(`ICE — ${side < 0 ? 'L' : 'R'} cylinder ${cylinderIndex + 1} exhaust valve ${valveSide < 0 ? 'A' : 'B'} head`, [0.0135, 0.0035, 0.0135], [valveX, 0.175, exhaustZ], materials.titanium, 'valve', bank);
        }
      }
      // Two longitudinal camshafts per bank, each with two lobes per cylinder.
      for (const camSide of [-1, 1]) {
        const camZ = camSide * 0.055;
        cylinder(`ICE — ${side < 0 ? 'L' : 'R'} ${camSide < 0 ? 'inlet' : 'exhaust'} camshaft`, 0.011, 0.47, [0, 0.300, camZ], materials.titanium, 'camshaft', 'x', bank, 24);
        for (let cylinderIndex = 0; cylinderIndex < 3; cylinderIndex++) {
          const x = (cylinderIndex - 1) * 0.11;
          for (const lobeSide of [-1, 1]) {
            torus(`ICE — ${side < 0 ? 'L' : 'R'} ${camSide < 0 ? 'inlet' : 'exhaust'} cam lobe C${cylinderIndex + 1}-${lobeSide < 0 ? 'A' : 'B'}`, 0.020, 0.005, [x + lobeSide * 0.016, 0.300, camZ], materials.copper, 'lobe', 'x', bank);
          }
        }
      }
      tube(`ICE — ${side < 0 ? 'left' : 'right'} fuel rail`, [[-0.23, 0.13, side * 0.12], [-0.12, 0.15, side * 0.12], [0.12, 0.15, side * 0.12], [0.23, 0.13, side * 0.12]], 0.018, materials.alloy, 'injector', bank);
    }

    // V-valley intake system: a common plenum and six separate runners.
    box('ICE — inlet plenum lower body', [0.50, 0.105, 0.22], [0.01, 0.365, 0], materials.dark, 'plenum');
    box('ICE — inlet plenum upper cover', [0.47, 0.035, 0.205], [0.01, 0.432, 0], materials.cover, 'plenum');
    box('ICE — plenum end cap forward', [0.055, 0.10, 0.215], [0.265, 0.38, 0], materials.alloy, 'plenum');
    box('ICE — plenum end cap rear', [0.055, 0.10, 0.215], [-0.265, 0.38, 0], materials.alloy, 'plenum');
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.11;
      for (const side of [-1, 1]) {
        tube(`ICE — ${side < 0 ? 'L' : 'R'} intake runner ${i + 1}`, [
          [x, 0.35, side * 0.055],
          [x + 0.025, 0.30, side * 0.10],
          [x, 0.245, side * 0.155],
          [x - 0.015, 0.205, side * 0.18]
        ], 0.027, materials.alloy, 'runner');
      }
    }
    cylinder('ICE — throttle body', 0.067, 0.16, [0.32, 0.39, 0], materials.dark, 'throttle', 'x', group, 28);
    torus('ICE — compressor inlet bell mouth', 0.088, 0.018, [0.42, 0.39, 0], materials.alloy, 'throttle', 'x');
    cylinder('ICE — intake neck', 0.055, 0.20, [0.34, 0.39, 0], materials.black, 'throttle', 'x', group, 24);

    // Six exhaust primaries remain on the outboard sides of the V.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.11;
        const z = side * 0.285;
        tube(`Exhaust — ${side < 0 ? 'L' : 'R'} primary ${i + 1}`, [
          [x + 0.02, -0.005, z * 0.78],
          [x + 0.07, -0.105, side * 0.34],
          [x - 0.015, -0.22, side * 0.35],
          [-0.24, -0.205 + i * 0.014, side * 0.31],
          [-0.22, -0.035 + i * 0.012, side * 0.20],
          [-0.16, 0.16, side * 0.12]
        ], 0.021, materials.exhaust, 'exhaust');
      }
      tube(`Exhaust — ${side < 0 ? 'left' : 'right'} three-into-one collector`, [
        [-0.28, -0.12, side * 0.32],
        [-0.31, -0.02, side * 0.29],
        [-0.25, 0.14, side * 0.19],
        [-0.18, 0.23, side * 0.105]
      ], 0.035, materials.titanium, 'collector');
    }

    // Single-stage turbo: compressor, MGU-H and turbine share a longitudinal shaft.
    sphere('Turbocharger — compressor housing', [0.105, 0.155, 0.155], [-0.535, 0.34, 0], materials.alloy, 'turbo');
    sphere('Turbocharger — turbine housing', [0.115, 0.16, 0.16], [-0.185, 0.34, 0], materials.titanium, 'turbo');
    cylinder('Turbocharger — common shaft', 0.034, 0.47, [-0.36, 0.34, 0], materials.copper, 'turbo', 'x', group, 20);
    cylinder('Turbocharger — MGU-H motor casing', 0.075, 0.135, [-0.36, 0.34, 0], materials.dark, 'mguH', 'x', group, 28);
    torus('Turbocharger — MGU-H end ring', 0.071, 0.012, [-0.43, 0.34, 0], materials.alloy, 'mguH', 'x');
    torus('Turbocharger — compressor inlet rim', 0.105, 0.019, [-0.635, 0.34, 0], materials.alloy, 'turbo', 'x');
    torus('Turbocharger — turbine outlet rim', 0.105, 0.018, [-0.065, 0.34, 0], materials.exhaust, 'turbo', 'x');
    cylinder('Turbocharger — compressor wheel hub', 0.045, 0.035, [-0.64, 0.34, 0], materials.dark, 'rotor', 'x', group, 24);
    cylinder('Turbocharger — turbine wheel hub', 0.045, 0.035, [-0.055, 0.34, 0], materials.dark, 'rotor', 'x', group, 24);
    for (let blade = 0; blade < 10; blade++) {
      const angle = blade * Math.PI * 2 / 10;
      const y = Math.cos(angle) * 0.065;
      const z = Math.sin(angle) * 0.065;
      const compressorBlade = box(`Turbocharger — compressor blade ${blade + 1}`, [0.018, 0.075, 0.012], [-0.662, 0.34 + y, z], materials.blue, 'rotor');
      compressorBlade.rotation.x = angle;
      const turbineBlade = box(`Turbocharger — turbine blade ${blade + 1}`, [0.018, 0.070, 0.012], [-0.034, 0.34 + y, z], materials.titanium, 'rotor');
      turbineBlade.rotation.x = angle;
    }
    tube('Turbocharger — compressor outlet / charge-air pipe', [
      [-0.53, 0.40, -0.08], [-0.40, 0.47, -0.15], [-0.18, 0.48, -0.16], [0.04, 0.46, -0.11], [0.25, 0.41, -0.04]
    ], 0.042, materials.blue, 'charge');
    tube('Turbocharger — turbine outlet / exhaust tailpipe', [
      [-0.12, 0.27, 0], [-0.29, 0.22, 0], [-0.47, 0.18, 0], [-0.66, 0.18, 0]
    ], 0.049, materials.exhaust, 'turbo');
    cylinder('Turbocharger — wastegate actuator', 0.036, 0.105, [-0.20, 0.51, 0.13], materials.dark, 'wastegate', 'z', group, 18);
    tube('Turbocharger — wastegate control line', [[-0.20, 0.51, 0.12], [-0.12, 0.45, 0.15], [-0.10, 0.35, 0.14]], 0.010, materials.copper, 'wastegate');

    // MGU-K is mechanically linked to the powertrain; show it beside the lower ICE.
    cylinder('ERS — MGU-K electric machine', 0.092, 0.235, [0.06, -0.16, -0.31], materials.dark, 'mguK', 'x', group, 32);
    torus('ERS — MGU-K end flange', 0.084, 0.015, [0.18, -0.16, -0.31], materials.alloy, 'mguK', 'x');
    box('ERS — MGU-K inverter connector', [0.075, 0.055, 0.065], [0.12, -0.055, -0.31], materials.orange, 'mguK');
    tube('ERS — MGU-K high-voltage lead', [[0.12, -0.055, -0.31], [0.24, 0.02, -0.32], [0.38, 0.05, -0.31], [0.49, 0.02, -0.27]], 0.018, materials.orange, 'cable');

    // Chassis-mounted ES and PU control electronics. Their package positions are
    // schematic: the FIA specifies the ES enclosure inside the survival cell.
    box('ERS — Energy Store enclosure', [0.36, 0.17, 0.43], [0.66, -0.18, 0], materials.carbon, 'battery');
    box('ERS — Energy Store upper cover', [0.33, 0.035, 0.40], [0.66, -0.075, 0], materials.dark, 'battery');
    for (let i = 0; i < 6; i++) {
      box(`ERS — Energy Store module rail ${i + 1}`, [0.29, 0.012, 0.018], [0.66, -0.05, (i - 2.5) * 0.055], materials.alloy, 'battery');
    }
    box('ERS — PU control electronics enclosure', [0.235, 0.12, 0.18], [0.48, 0.13, 0.29], materials.cover, 'ce');
    box('ERS — control electronics heat spreader', [0.19, 0.022, 0.13], [0.48, 0.202, 0.29], materials.alloy, 'ce');
    tube('ERS — ES to control-electronics HV loom', [[0.57, -0.08, 0.16], [0.52, 0.02, 0.22], [0.49, 0.13, 0.24]], 0.014, materials.orange, 'cable');
    tube('ERS — MGU-H HV lead', [[-0.36, 0.42, 0.09], [-0.25, 0.54, 0.18], [0.04, 0.57, 0.20], [0.36, 0.28, 0.29]], 0.013, materials.orange, 'cable');

    // Ancillaries, mounting points and fluid/coolant routing.
    cylinder('ICE — high-pressure fuel pump', 0.043, 0.10, [0.34, -0.075, 0.255], materials.alloy, 'pump', 'z', group, 20);
    cylinder('ICE — oil scavenge pump', 0.047, 0.105, [-0.28, -0.19, -0.255], materials.dark, 'pump', 'z', group, 20);
    tube('ICE — oil feed line', [[-0.28, -0.19, -0.31], [-0.08, -0.28, -0.30], [0.12, -0.23, -0.29], [0.29, -0.10, -0.25]], 0.012, materials.copper, 'pump');
    tube('ICE — coolant return line', [[0.36, 0.07, 0.22], [0.23, 0.18, 0.30], [-0.08, 0.23, 0.32], [-0.34, 0.12, 0.25]], 0.014, materials.blue, 'pump');
    // FIA 2025 Article 5.4.8 specifies six M12 survival-cell studs and four
    // or six transmission studs. These visual placeholders are not datum-mapped.
    for (const side of [-1, 1]) {
      for (let position = 0; position < 3; position++) {
        const x = (position - 1) * 0.22;
        cylinder(`ICE — ${side < 0 ? 'left' : 'right'} survival-cell M12 mounting stud ${position + 1}`, 0.006, 0.070, [x, -0.135, side * 0.245], materials.alloy, 'mount', 'z', group, 16);
      }
    }
    for (const side of [-1, 1]) {
      for (const height of [-1, 1]) {
        cylinder(`ICE — transmission mounting stud ${side < 0 ? 'L' : 'R'}${height < 0 ? ' lower' : ' upper'}`, 0.006, 0.070, [-0.36, height * 0.10, side * 0.13], materials.alloy, 'mount', 'z', group, 16);
      }
    }
    box('ICE — rear accessory bracket', [0.09, 0.22, 0.29], [-0.39, 0.02, 0], materials.dark, 'mount');

    // Preserve the study within the existing car envelope and keep the engine
    // proportions consistent with the imported model's overall scale.
    // Keep the model's bank angle and component proportions intact. The unit
    // derives its base scale from the imported car's longitudinal envelope.

    return group;
  }

  window.AeroPowerUnit = { build: buildPowerUnit };
})();
