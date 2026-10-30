# AeroLab 25 — Android prototype

AeroLab 25 is an offline-first Android prototype for exploring a reconstructed 2025-era Formula One car. The app uses a native Android Activity as its shell and a self-contained WebGL viewer (plain JavaScript, no remote CDN or runtime dependency) for the interactive 3D scene.

## First-build features

- Interactive 3D car model with drag-to-orbit and pinch/wheel zoom.
- Isometric, side and top camera presets, plus fit/reset.
- 12 selectable system assemblies: front wing, nose/monocoque, sidepods, floor/diffuser, rear wing, halo/cockpit, front suspension, rear suspension, wheels/brakes, power unit, gearbox and cooling.
- Component inspector with a short explanation and a reconstruction-status label.
- Hide/show and isolate controls for each assembly.
- Exploded-view offsets to separate the major assemblies visually.
- Runs without a network connection; all model geometry and UI assets are bundled in the APK.

## Build the Android app

Open the project folder in Android Studio and let Gradle sync. The project uses Android Gradle Plugin 8.7.3, Gradle 8.9, Java 17, compile SDK 35 and min SDK 26.

To build from a terminal with an Android SDK configured:

```bash
gradle --no-daemon assembleDebug
```

The debug APK uses application ID `com.sf12.f1garage` and is written to:

```text
app/build/outputs/apk/debug/app-debug.apk
```

The included GitHub Actions workflow (`.github/workflows/android.yml`) builds the debug APK on a push to `main`/`master` or from the Actions tab using **Run workflow**, then uploads it as `aerolab25-debug-apk`.

## Model scope and accuracy

This first build is a **generic 2025 ground-effect-era concept study**, not an exact reconstruction of a named constructor's car. It is intended to establish the viewer, component hierarchy and interaction model before detailed reverse-engineering begins.

The model contains three broad confidence classes:

- **Regulation-led:** overall architecture and safety/aero component categories guided by the public 2025 FIA technical regulations.
- **Reconstructed:** exterior forms and suspension layouts are illustrative geometry inferred from common 2025 F1 layouts and public reference imagery.
- **Layout study:** internal power-unit, gearbox, cooling and brake details are simplified representations, not production CAD.

No claim is made that the geometry is dimensionally exact, mechanically complete, or compliant with every clause of the FIA regulations. Fasteners, bearings, seals, internal castings, wiring, hydraulic routing and other small hardware are not yet modelled. The current 12 items are **systems**, not a 12-part count. The future build should progressively split assemblies into individually selectable subassemblies and parts, while recording each part's source and confidence level.

## Primary reference

- FIA, *2025 Formula 1 Technical Regulations*, Issue 03 (7 April 2025): <https://www.fia.com/sites/default/files/documents/fia_2025_formula_1_technical_regulations_-_issue_03_-_2025-04-07.pdf>

The regulations are a framework for the study, not a source of proprietary team CAD. The generic model avoids reproducing a specific team's livery or claiming access to confidential design data.

## Project structure

```text
AeroLab25/
├── app/
│   └── src/main/
│       ├── assets/
│       │   ├── index.html    # UI and layout
│       │   └── model.js      # procedural WebGL model + interactions
│       ├── java/com/sf12/f1garage/MainActivity.java
│       └── res/
├── .github/workflows/android.yml
├── build.gradle
├── settings.gradle
└── gradle.properties
```

## Planned next modelling passes

1. Replace major primitives with dimensioned, parametric assemblies and add front/rear view measurement overlays.
2. Split each current system into subassemblies (wishbones, uprights, brake ducts, discs, calipers, DRS flap, floor fences, diffuser strakes, turbo, MGU-K/MGU-H, etc.).
3. Add source records per component: regulation/article, public image/drawing, measured estimate, and confidence score.
4. Add selection directly on the 3D geometry, sectional/cutaway views, and assembly constraints.
5. Progressively increase part granularity, including fasteners, without implying undocumented internal geometry is exact.


## CI workflow fix (0.1.1)

The GitHub Actions workflow no longer invokes `android-actions/setup-android@v3`. That action attempted to install the retired Android SDK `tools` package and failed inside `sdkmanager`. The workflow now uses the Android command-line tools already present on the pinned `ubuntu-24.04` runner, installs only `platform-tools`, `platforms;android-35`, and `build-tools;35.0.0`, and upgrades checkout/setup-java to their Node 24-compatible major versions.
