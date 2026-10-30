# AeroLab 25 — RB21 model viewer (Android)

AeroLab 25 is an offline Android viewer for a detailed community 3D model published as **F1-2025 Redbull RB21**. It uses a native Android WebView shell and a local Three.js / WebGL scene. The GLB is packaged as an Android app asset inside the APK; the installed app does not need a network connection to display the car.

## Revision 0.4.3

This revision keeps the downloaded multi-object GLB as a packaged Android asset and fixes how Android WebView serves that local binary file to Three.js. The app preserves all 190 imported source mesh objects and exposes them as individual selectable rows, with category filters and text search. It also retains app-side system grouping for inspection.

Revision 0.4.3 adds a separate **Honda RBPTH003 2025 power-unit study** to the imported RB21 scene. The new assembly is made from individually selectable Three.js meshes and includes the 90-degree V6 block and banks, six 80 mm-bore cylinder positions, six pistons and connecting rods, four camshafts with 24 lobes, 24 poppet valves, inlet plenum and runners, fuel rails/injectors, six exhaust primaries and collectors, the single-stage turbocharger, MGU-H, MGU-K, Energy Store, control electronics, charge-air pipework, ancillaries and representative electrical/fluid routing. A dedicated POWER UNIT filter makes those components easier to inspect.

The power unit is not copied from a second community model. It is new app-side geometry constrained by Honda's public RBPTH003 specifications and the 2025 FIA technical regulations. Exact Honda/Red Bull internal surfaces and installation coordinates are not public, so the geometry is marked as a **reference-led layout study**, not factory CAD. See [`docs/POWER_UNIT_MODEL.md`](docs/POWER_UNIT_MODEL.md) for the modelling assumptions and source register.


This revision fixes local GLB loading in Android WebView. The GLB remains a normal Android APK asset (not an internet-hosted model). The app now serves assets from `AssetManager` under the virtual HTTPS origin `https://appassets.androidplatform.net/assets/`, so Three.js can request the binary GLB using XHR without `file://` origin restrictions. File access from arbitrary local paths is disabled.

### Inspected model package

- 358 scene nodes and 190 mesh objects / primitives.
- 272,827 indexed triangles.
- 25 materials and 25 embedded images in the GLB.
- Source hierarchy includes rear-wing / DRS, cockpit, steering, safety-cell, four wheel / hub assemblies, suspension groups and brake callipers.
- Source object names are retained when an individual mesh is selected.

The published model title and source page identify it as an RB21. However, its internal names include several `RB19` labels and numerous generic `redbull_*` / `Dummy` objects, with no `RB21`-named nodes. That naming alone does not establish which geometry was reused, so AeroLab describes its controls as **source mesh groups** rather than verified factory component names. The model is a community visual asset, not Red Bull CAD, an engineering scan, or dimensionally certified data. Its precise exterior configuration still needs comparison against matched 2025 RB21 reference photographs.

### Viewer controls

- Drag to orbit; pinch to zoom.
- Isometric, side and top camera presets, plus fit/reset.
- Component inspector with 190 individually selectable imported source meshes plus the 235 separately selectable power-unit study meshes (425 meshes total), category filters and search.
- Select an individual mesh by tapping it in the 3D view or choosing it from the searchable 425-object list.
- Hide/show and isolate selected individual meshes or entire systems, plus exploded view.

### App-side classification groups

- Rear wing and DRS.
- Remaining exterior body panels.
- Mirrors and antennae.
- Cockpit and steering.
- Survival cell.
- Suspension and steering links.
- Wheels and hubs.
- Brake callipers.
- Honda RBPTH003 power-unit study (235 app-authored meshes).

These are convenience groups based on the downloaded scene hierarchy; they are not a claim that every assembly is individually engineered or fully identified. Generic source meshes remain grouped under exterior body panels until their identities can be established.

## Model attribution and licence

The 3D model is by **Abu Saif (@abuhossain844)**, titled *F1-2025 Redbull RB21*, and is published on Sketchfab under the **Creative Commons Attribution 4.0 International (CC BY 4.0)** licence.

Source: https://sketchfab.com/3d-models/f1-2025-redbull-rb21-418c3b3cdf9d41ea8beb15076d875a86  
Licence: https://creativecommons.org/licenses/by/4.0/

AeroLab 25 incorporates the downloaded GLB and adds an app-side viewer, system grouping, selection, highlighting, hide/isolate and exploded-view controls. Attribution is also displayed in the app footer. See [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md).

## Build

Requirements: Java 17, Gradle 8.9 (or compatible), Android SDK platform 35 and Android Build Tools 35.0.0.

```bash
gradle --no-daemon assembleDebug
```

**The first build needs internet access.** A Gradle preparation task downloads the public GitHub Release archive, verifies its SHA-256 checksum, extracts the embedded GLB and downloads the pinned Three.js r145 browser scripts. These files are placed in generated Android assets and bundled into the APK. The Android WebView serves them from the APK AssetManager through a same-origin virtual HTTPS URL (`appassets.androidplatform.net`). This avoids `file://` origin restrictions that can prevent Three.js `GLTFLoader` from requesting a local binary file. The model and viewer libraries are not fetched at app runtime; the installed APK works offline.

The model release is kept outside the Git repository to avoid committing a 124 MB binary asset:

https://github.com/SF12-YT/dummy-assets/releases/tag/model

The debug APK is written to `app/build/outputs/apk/debug/app-debug.apk`. Revision 0.4.3 uses Android version code 7.

The app-side geometry builder has a lightweight inventory smoke test. From the project root, run `node tools/validate_powerunit.js`. It checks the 235-mesh inventory, unique selectable names, component metadata, key part counts and both supported model-axis orientations. This does not replace an Android/WebGL runtime test or validate the installation against proprietary RB21 CAD.

The GitHub Actions workflow builds on pushes to `main` / `master` and via **Run workflow**. It uses Ubuntu 24.04, Java 17, and installs only named Android SDK packages (not the removed legacy `tools` package).

## Project structure

```text
AeroLab25/
├── app/src/main/assets/
│   ├── index.html        # viewer interface
│   ├── powerunit.js      # separately selectable RBPTH003 layout study
│   └── viewer.js         # Three.js scene, model loading and interactions
│   # Build-generated assets: models/rb21.glb and vendor/*.js
├── app/src/main/java/    # Android WebView shell
├── docs/
│   ├── ATTRIBUTION.md
│   ├── REFERENCE_REGISTER.md
│   └── POWER_UNIT_MODEL.md
├── THIRD_PARTY_NOTICES.md
├── tools/
│   └── validate_powerunit.js
└── .github/workflows/
    └── android.yml
```

## Next modelling steps

1. Compare matched orthographic views of this model against official RB21 photographs from a single, named race configuration.
2. Correct any visible mismatches in nose, front wing, sidepod inlets / undercuts, floor edge, engine cover and rear wing.
3. Replace opaque source labels with documented names only when the component identity is adequately verified.
4. Add individually selectable aero elements, fences, strakes, suspension members, uprights, brake ducts and fasteners.
5. Calibrate the new power-unit position against a named RB21 race configuration and any credible public installation photographs.
6. Refine hidden internal geometry only where reliable technical references support it; keep unknown dimensions and routing explicitly provisional.

No proprietary Red Bull CAD or internal design data is claimed or included.
