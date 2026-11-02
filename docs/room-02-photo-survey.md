# Room 2 / main hall — photograph batch 1

Source: the user's inline photographs, explicitly identified onsite as room 2, supplied in this conversation on 1 November 2026. The photos are visual references; original files and EXIF are not available in the checkout. No photogrammetry, measured camera registration or scanned textures are claimed.

## Onsite registration correction

The user clarified: these photos cover **room 2**, while the higher roof section is directly over the **dashed square numbered 1** on the plan. The model now treats that square as a raised-bay survey region inside the surrounding room-2 hall; it adds no partition walls. The brochure legend names (Boat Space / Lightwell) describe overlapping venue areas and must not override the user’s onsite identification. The cardinal direction of the timber-door wall still needs confirmation.

## Direct observations

- Rough, mottled concrete floor with wear and visible cracking/joints in some views.
- Tall rectangular concrete columns and substantial horizontal concrete beams. The existing plan's column locations remain the spatial reference; photo perspective alone does not establish their exact dimensions.
- Dark exposed roof framing, cross members, roof panels and suspended services. There is raised/high-level glazing and a vertical change in the roof/beam arrangement. A single uniform flat ceiling is an incomplete blockout of this room.
- Warm exposed brick walls, areas of grey blockwork, concrete lintels, tall timber sliding doors on an exposed rail, other industrial doors and framed glazing.
- Black curtains behind the presentation screen and along at least one side of the event area. Curtains obscure the actual wall/door surfaces behind them.
- A red arched panel appears to be leaning in front of the blockwork. Do not turn its outline into an architectural door opening without confirmation.
- Event equipment: low black presentation platform, screen, speakers, chairs, timber-top tables, lounge sofas, freestanding graphic backdrops and coloured lighting. These do not establish the permanent structural layout. People, screens and bags are not architectural evidence.

## Applied in the first pass

The surrounding room 2 and the square numbered 1 share a rough-concrete floor approximation. Six existing plan column markers in this hall have concrete finishes. Room 2's roof placeholder is dark rather than white and has a cutout over the traced square 1. The raised bay now has a separate timber/masonry/glazing assembly and a provisional upper roof cap. Its upper height is estimated at 8 m, not measured. See [room 1 timber bay](room-01-timber-bay.md) for the registration and dimensions still requiring verification.

The published horizontal scale, wall openings and collision column dimensions are retained. Materials are procedural visual approximations, not scanned textures. Individual cracks/joints are not reproduced. Other rooms remain unchanged.

## Unresolved before an accurate architectural reconstruction

1. **Plan orientation:** which wall carries the tall timber sliding doors and high glazing? The user has been asked to identify the Haggerston Road side versus the Atrium/Canal Room side. This locates the entire photo sequence on the plan.
2. **Roof profile:** measured clear height at a regular beam underside, the raised-glazing zone, and highest roof point. The 5.5 m brochure / 5.6 m drawing values are references, not evidence for a uniform ceiling or its slope. Need upward views from the room centre and both ends, including the glazing-to-roof junction.
3. **Structural grid:** a column's width/depth and one centre-to-centre spacing, or a measured long wall span. Need unobstructed views showing each column base and beam junction to register the grid.
4. **Openings:** full-height, near-frontal views of the timber door, industrial entry and the passage into adjacent rooms, with a width/height reference where possible. Confirm which panels move and which doors are actually openable for the tour.
5. **Curtained side:** the curtain conceals permanent architecture. A safe view behind it, or venue confirmation, is needed; don't infer a solid wall or new opening from the fabric.
6. **Event layout registration:** the stage, audience chairs and backdrops are well visible, but their positions must be anchored to confirmed walls/columns before adding a collision-aware event layer.

The next useful photos are targeted at these gaps, not more repeats of the lounge/backdrop view. Room 2 and the raised bay remain incomplete until these references are resolved.

## Event-stage reconstruction

The user located the stage **around marker 2** and requested the stage/setup without people, tables or chairs. The current event layer includes a low black platform and skirting, framed projection screen, silver lattice lectern, two speakers on stands, two roll-up banners and pleated black draping. The screen surface is neutral rather than a reproduction of projected content. Banner artwork is an approximate procedural interpretation of the observed banners.

`packages/shared/src/stage.ts` owns photo-estimated dimensions and a plan anchor `[450, 270]`, slightly canalward of marker 2 at approximately `[448, 294]`, facing +Z toward the main hall/square 1. The anchor is deliberately labelled `photo-estimated`: the user confirmed the region, not a surveyed centre point or rotation. Exact alignment to columns still needs a measured reference. The 4.6 × 2.4 m platform, 0.32 m deck elevation, 4 × 2.25 m screen and 5.5 m curtain reference are estimates, not measured dimensions.

The simulator and review view share the event asset and transform. The tour uses the same local stage geometry for collisions, including a supported step onto the low platform and the camera eye level relative to the deck. People, laptops and loose belongings remain omitted. The photo-detail pass includes tables, folding chairs and lounge seating; their collisions are optional. The existing neutral legacy paintball renderer does not activate this simulator event layer.

The most useful next reference is **platform width, depth and height**, plus one near-frontal view that shows the stage edges and the nearest columns together. This refines the stage without requiring more duplicate crowd views. Door-wall orientation and the raised-bay roof section remain independent unresolved survey items.

## Detailed photo pass: confidence and remaining limits

The user identified the requested interior sheet as the **OpenAI / DevDay Exchange Community Hackathon** backdrop shown beside the black-covered table. That readable text is reproduced. Artwork is a procedural approximation rather than the original print file; front and back placement is provisional.

Implemented features cross-checked across the supplied views:

| Feature                                    | Visual evidence                                             | What is and is not verified                                                                                                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Folding chairs, timber trestle tables      | Hall, audience and reverse-stage photographs                | Black folding frames, seat/back forms and timber tops observed. 5 audience rows, 6 table groups, chair counts and positions are a representative estimate; occluded furniture cannot be counted exactly. |
| Brown lounge seating                       | Repeated lounge photographs                                 | Form and brown finish observed; dimensions and plan anchors estimated.                                                                                                                                   |
| DevDay banner and black registration table | Registration and lounge views; explicit user identification | Readable OpenAI / DevDay text confirmed. Graphic layout, dimensions and precise anchor are approximate.                                                                                                  |
| Brick / blockwork / concrete               | Lounge, reverse-hall and glazing views                      | Material families and visible lintels confirmed. Exact face registration, historic brick dimensions and individual damage are unmeasured. Brick tiling is metric; blockwork uses a larger course scale.  |
| Sliding-gate ribs and rail                 | Industrial gate in hall photos and gate on the plan         | Visible detailing added to the existing closed gate; no new opening or invented door height.                                                                                                             |
| Leaning red arched panel                   | Repeated lounge views                                       | A decorative leaning panel is represented; no door opening is cut into the wall. Pattern, dimensions and placement estimated.                                                                            |
| Concrete beams / steel roof members        | Upward and hall views                                       | Structural character observed; rendered spans use existing plan column locations. Member sections and all upper roof elevations remain unmeasured.                                                       |
| Coloured column lights                     | Several overlapping hall photographs                        | Small fixtures and coloured light observed; exact output, aiming and fixture positions estimated.                                                                                                        |

Furniture is visible by default and can be hidden. **Solid furniture** is off by default to preserve free inspection; when enabled the same furniture transforms produce collision boxes. Room shortcuts are checked for clearance in both modes. Repeated chair geometry is instanced for performance.

This is not a declaration that the room is fully verified or surveyed. To resolve the remaining architectural alignment, provide near-frontal photos of the timber-door / brick wall and grey-block wall, with their locations marked on the plan. A measured table width, door width or column spacing would check the global scale; beam underside and raised-roof heights remain especially useful.

Use `node scripts/export-tour.mjs` after changes to regenerate the self-contained downloadable simulator with embedded source-plan imagery. It uses the locked esbuild installation already supplied with the project's tsx toolchain.

The 2025 drawing's generic stored-container/timber boxes were obscuring the photographed stage view but are not established as present in this event batch. They are excluded from the current event renderer **and** tour collisions, while retained in the historical plan/game model and original source image. Their actual current contents/positions are unverified; no claim is made that the physical objects have permanently been removed.
