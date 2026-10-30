# RB21 source mesh annotations

This catalogue records user-supplied interpretations of object names in the Abu Saif community GLB. It is a navigation aid for AeroLab 25, not a source of factory part numbers or engineering validation. The original object names are retained in the viewer.

## Identification rules

- Matching is case-insensitive. Spaces and underscores are treated equivalently.
- Blender duplicate suffixes (`.001`, `.002`, etc.) are tolerated.
- The viewer matches the mesh object name, geometry name or explicit `userData.sourceName`; it intentionally does not match arbitrary ancestor names, preventing a short group name from being applied to every child mesh.
- An unmatched object remains available under its original source label.
- Sponsor graphics, team marks, driver-name graphics and T-cam arrows are classified as branding/markings rather than structural components.
- Ducts and brake drums are catalogued under BRAKES; wheels/tyres are WHEELS; wheel rods are SUSPENSION; seatbelt pieces are DRIVER.

## Source-name inventory

| Source object | Inspector label | Category |
|---|---|---|
| `redbull 31` | Front-right brake duct | Brakes |
| `redbull 32` | Front-left brake duct | Brakes |
| `redbull 01 010 001` | Rear-left brake duct | Brakes |
| `redbull 01 009 001` | Rear-right brake duct | Brakes |
| `redbull 35`, `redbull 34`, `redbull 03`, `redbull 04` | Corner-specific brake drums | Brakes |
| `redbull 27 SUB1/SUB0`, `redbull 25 SUB1/SUB0`, `redbull 26 SUB1/SUB0`, `redbull 28 SUB1/SUB0` | Four wheel/rim and tyre pairs | Wheels |
| `redbull 02 006 001`, `redbull 02 003 001` | Front-right/front-left wheel rods | Suspension |
| `CINTURE ON SUB1`, `CINTURE ON SUB0` | Seatbelt harness sections | Driver |
| `rearwing`, `rearwing 003 001` | DRS flap and rear-wing element | Aero |
| `rearlight`, `rearlight2` | Rear lights | Bodywork |
| `redbull 20 001 001`–`redbull 20 003 001` | T-cam cover and left/right plates | Bodywork |
| `redbull 13 008 001`–`redbull 13 011 001`, `redbull 13 022 001`–`redbull 13 024 001` | Exterior body panels | Bodywork |
| `rearwing 011 001`, `rearwing 012 001`, `rearwing 008 001`–`rearwing 010 001` | Oracle, Gate.io, Mobil 1, Heineken and Cola graphics | Branding |
| `redbull 03 002 001`, `redbull 03 001 001`, `redbull 13 005 001`, `redbull 13 004 001`, `redbull 13 002 001`, `redbull 13 001 001`, `redbull 17 002 001` | Red Bull, Hard Rock, Oracle/TAG Heuer, Mobil 1, Pepe Jeans, Red Bull/N symbol and Rauch markings | Branding |
| `RB19 052 001` | Halo logo markings | Branding |
| `redbull 12 001 001`–`redbull 12 003 001` | Front-nose sponsor, HRC/Red Bull Racing and Mobil graphics | Branding |
| `redbull 15 001 001`, `redbull 15 002 001` | FIA and HD/Siemens markings | Branding |
| `redbull 13 006 001`, `redbull 14 001 001`, `redbull 13 013 001`–`redbull 13 015 001`, `redbull 11 003 001`, `redbull 13 018 001`, `redbull 13 021 001` | 1Password, Rauch/Castore, Red Bull, Visa, Gate.io, AT&T, Max Verstappen and Honda markings | Branding |
| `redbull 13 012 001` | Yellow T-cam direction markers | Branding |

`rearwing 011 001` is an explicit annotation conflict: the supplied list assigns the same source ID to both the Oracle logo and the lower half of the Gate.io logo. AeroLab keeps both names in one flagged entry for visual review rather than inventing a second object.

Some source names (for example `redbull 03`) are short and reused for unrelated objects. Matching is exact after normalization, never substring-based, so `redbull 03` cannot accidentally match `redbull 03 001 001` or `redbull 03 002 001`.
