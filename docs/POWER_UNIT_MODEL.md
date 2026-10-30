# AeroLab 25 — Honda RBPTH003 power-unit model

## Scope

Revision 0.4.3 adds an app-authored power-unit assembly to the 2025 RB21 viewer. It is a reference-led 3D layout study, not an official Honda/Red Bull model, scan, measured replica, or engineering deliverable. No manufacturer CAD or proprietary geometry is included.

## Publicly supported architecture

Honda identifies the 2025 RB21 power unit as the **Honda RBPTH003**. Honda's public specification gives a 1,600 cc, 90-degree turbocharged six-cylinder engine with four valves per cylinder and a 15,000 rpm maximum engine speed. Honda lists an MGU-H maximum speed of 125,000 rpm and an MGU-K maximum output of 160 bhp at up to 50,000 rpm.

The 2025 FIA Technical Regulations (Issue 03, Article 5) require six equal-capacity cylinders in a 90-degree V, two inlet valves and two exhaust valves per cylinder, an 80 mm bore, no more than three connecting-rod bearing journals, minimum crankshaft main- and crankpin-journal diameters of 43.95 mm and 37.95 mm, and a single-stage compressor linked to a single-stage exhaust turbine by a common shaft parallel to the crankshaft; an MGU-H may be directly coupled to that shaft. The FIA defines the MGU-K as mechanically linked to the powertrain, and the Energy Store as part of the ERS. The ES main enclosure is defined as an enclosure installed inside the survival cell.

## Geometry added

The assembly comprises **235 individually selectable meshes** for:

- Crankcase, bedplate/sump, timing case, rear flange, a longitudinal crankshaft, three offset crankpin journals and six crank-web representations.
- Two 45-degree cylinder banks, six 80 mm-bore cylinder positions with separate liner outside walls and bore surfaces, six piston/piston-pin/connecting-rod sets, cylinder heads, four camshafts and 24 cam lobes, 24 axial poppet valves (two inlet and two exhaust per cylinder), ignition-coil and injector representations, and fuel rails.
- Inlet plenum, six intake runners, throttle body and inlet bell.
- Six exhaust primary runners, two bank collectors, turbocharger compressor and turbine housings, common shaft, compressor/turbine wheel representations, MGU-H casing, wastegate actuator, charge-air pipe and exhaust tailpipe.
- MGU-K, representative inverter connector and high-voltage lead.
- Chassis-mounted Energy Store enclosure, module rails, PU control-electronics enclosure and schematic HV looms.
- Representative oil/coolant/fuel pumps, fluid lines, six survival-cell mounting-stud representations and four transmission-stud representations, matching the 2025 FIA mounting-stud counts (not datum-positioned).

The POWER UNIT inspector filter lists the generated meshes individually. Selecting a generated mesh displays a component-specific description and a `REFERENCE-LED STUDY` confidence label. The whole system can be isolated or hidden like the imported source mesh groups.

A Node.js smoke test (`tools/validate_powerunit.js`) verifies that the builder returns 235 uniquely named meshes with component metadata in both X- and Z-longitudinal source-model orientations. It is a construction/inventory test only; it does not run Three.js WebGL rendering, Android WebView, or a dimensional fit check against an RB21 engineering model.

## Installation assumptions

The source-model bounds are used to place the study in the rear central part of the chassis before the car's normalisation transform is applied. Its longitudinal axis follows the viewer convention (+X forward when the model's long axis is X; the assembly is rotated for a Z-longitudinal source). The engine package length is scaled as a fraction of the imported car's overall length. This does **not** validate the location against RB21 CAD. The battery and control electronics are positioned schematically; the precise RBPTH003 installation coordinates are not disclosed in the cited public sources.

## Important exclusions

This is an inspectable mechanical layout study, not a validated Honda cutaway. The 80 mm bore is a 2025 FIA requirement. The model uses a nominal 53 mm stroke / 26.5 mm crank throw consistent with published summaries of the 2014–2025 F1 engine generation, but that stroke is not a disclosed RBPTH003 measurement. The 120 mm connecting-rod length, crank throw phasing, piston compression height, valve-head dimensions, cam profiles, ports, combustion bowl, fuel-injection spray, turbo blade aerofoils, bearing details, thermal shields, exact oil/coolant circuits, sensor placement, wire gauge, high-voltage safety distances, exact battery cell layout, and internal Honda casting shapes remain illustrative or unmodelled. Component-level meshes are intended for visual exploration; their dimensions and shapes should not be used for manufacture, simulation, fitment or compliance work.

## Source register

1. [Honda Global — Honda RBPTH003](https://global.honda/en/POWEREDbyHONDA/2025_Honda_rbpth003/) (2025 RB21 application and public engine / hybrid specifications).
2. [Honda Racing — Honda RBPTH003](https://honda.racing/f1/machines/honda-rbpth-003) (manufacturer attribution, application and architecture).
3. [FIA — 2025 Formula 1 Technical Regulations, Issue 03, 7 April 2025](https://api.fia.com/sites/default/files/documents/fia_2025_formula_1_technical_regulations_-_issue_03_-_2025-04-07.pdf), especially Article 5.1 definitions, 5.2 engine specification, 5.3 ERS, and 5.26 ES design and installation.
4. [FIA — 2025 Formula 1 Sporting Regulations, Article 28](https://www.fia.com/sites/default/files/fia_2025_formula_1_sporting_regulations_-_issue_3_-_2024-12-11.pdf) (2022–2025 PU component allocation).
5. [Energies — The Pro-Ecological Evolution of Powertrains and Fuels in Formula 1](https://www.mdpi.com/1996-1073/18/22/6013) (published 2025; summary table reports the 2014–2025 80 mm bore / 53 mm stroke baseline).
