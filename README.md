# AeroLab 25 — RB21 exterior study (Android)

AeroLab 25 is an offline-first Android viewer for an interactive, reference-based reconstruction study of the 2025 Red Bull RB21. It uses a native Android WebView shell and a local JavaScript/WebGL geometry engine. There are no remote libraries, CDNs, accounts, trackers, or runtime network requirements.

## Revision 0.2.0

This revision replaces the original primitive-heavy concept model with a new procedural exterior pass. Geometry is generated from parametric sections and swept profiles rather than relying on large boxes and cylinders.

### Viewer

- Drag to orbit; pinch or wheel to zoom.
- Isometric, side and top camera presets, plus fit/reset.
- Component inspector with 12 selectable systems.
- Hide/show, isolate and exploded-view controls.
- Geometry is generated locally and the app remains usable offline.

### Exterior work in this pass

- Three swept front-wing aerofoil elements, endplates and pylons.
- Multi-section nose and survival-cell envelope, yellow centreline treatment and cockpit aperture.
- Rounded sidepod shells, inlet mouths, undercut edges, cooling louvres and red livery accents.
- Engine-cover and airbox silhouette.
- Shaped floor perimeter, twin tunnel representations, fence blades and rising diffuser surfaces.
- Multi-element rear wing, beam wing, supports and endplates.
- Curved halo rails, mirrors and suspension-link fairings.
- Wheel and tyre envelopes, rims, hubs, brake discs and calipers.

The mesh is an evolving reverse-engineering study, not a scan or a replica of Red Bull's confidential CAD. The viewer uses +X towards the nose for convenience; the FIA's published coordinate convention has X positive rearwards, so a sign conversion is required before adding regulatory dimension overlays. The RB21 changed during the season and some cooling/bodywork configurations were circuit-specific. The model uses an RB21-inspired season reference set rather than claiming to be the exact car from one Grand Prix. The current view is an exterior-first model; several power-unit and drivetrain groups are simplified for future isolated/exploded inspection.

## Accuracy labels

- **REGULATION-LED** — component category and permitted architecture follow the public FIA rules.
- **REFERENCE-BASED** — visible exterior shape inferred from public photographs and technical galleries.
- **DIMENSIONAL STUDY** — proportions are guided by public dimensional constraints but not verified against team CAD.
- **LAYOUT STUDY** — internal assemblies are illustrative and must not be treated as production drawings.

A reference-based reconstruction can look convincing without being dimensionally exact. Each component should acquire its own source record, confidence rating and measurement notes as the model is refined.

## Build

Open the project folder in Android Studio, or build from a terminal with Android SDK platform 35 and build tools 35.0.0 installed:

```bash
gradle --no-daemon assembleDebug
```

The debug APK is written to `app/build/outputs/apk/debug/app-debug.apk`.

The GitHub Actions workflow pins Ubuntu 24.04, uses current action majors, installs only the named Android SDK packages, and deliberately does not install the obsolete `tools` SDK package. It builds on pushes to `main`/`master` and via **Run workflow**.

## Project structure

```text
AeroLab25/
├── app/src/main/assets/
│   ├── index.html        # viewer UI
│   └── model.js          # procedural WebGL geometry and interactions
├── app/src/main/java/    # Android WebView shell
├── docs/
│   └── REFERENCE_REGISTER.md
└── .github/workflows/
    └── android.yml
```

## Next modelling steps

1. Lock the chosen RB21 Grand Prix configuration and compare the model against matched side/front/rear/top photographs.
2. Add measurement overlays and calibrated reference-image planes.
3. Split exterior systems into independently selectable subassemblies: individual flaps, fences, strakes, wishbone members, uprights, brake ducts, louvres, panels and fasteners.
4. Add component-level dimensions, source citations, confidence and version history.
5. Progressively open the bodywork and model the internal cooling, engine, hybrid systems, transmission and hydraulic/electrical routing.

No proprietary CAD or internal design data is claimed or included.
