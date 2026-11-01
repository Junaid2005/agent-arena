# Room 5 / Atrium — photo reconstruction

Source: the user's four overlapping Atrium photographs, supplied after rooms 1/2. The views show the hall in both directions and include its roof. Original camera files, EXIF and measured elevations are not available; this is not photogrammetry or a surveyed model.

## Registration and observed features

The room-2 connection/wide opening is treated as the west end of the plan. The opposite end has the large white projection surface. The factory-window wall is the north/Canal Room side; the narrower frosted-panel wall is the south/courtyard side. This registration is inferred from both-direction photos and existing plan door positions, rather than an independent camera survey.

The model includes the following photo-supported feature families:

- Brick walls, concrete lintels, dark vertical steel framing, large black-grid factory windows and narrower frosted panels.
- A pitched industrial roof with two parallel skylight runs, pale triangular trusses and exposed dark crane rails/bridge beams.
- Two suspended hoist/trolley assemblies with cable blocks/hooks, suspended linear lights, coloured wall lighting and a central projector.
- The white end-wall surface, OpenAI roll-up banners and an Astra Commons banner with the readable text shown in the photographs. Printed artwork is approximated.
- Timber-top folding tables, black folding chairs, pale/brown entrance sofas and burgundy tufted lounge seating. People, laptops, bags and loose personal belongings remain omitted.

The roof and all features are mapped onto the existing irregular Atrium quadrilateral through `atriumPlan`/`atriumPoint`, without stretching one horizontal axis independently. Door positions remain those of the architectural plan. Window groups avoid the existing door gaps and are represented as opaque/frosted surfaces over the existing wall faces; no new passage is created through a window. The wide room-2 portal has a provisional 3.3 m opening height to reflect its industrial proportions, rather than the earlier generic 2.15 m domestic-door placeholder.

## Explicit estimates

The eaves use a **5.5 m wall reference** and the ridge **7.5 m**, following the user’s acceptance of the earlier reference. These are not measured Atrium dimensions. The supplied deck was rechecked: its Atrium section lists 200 sqm, natural light and high ceilings, but no numerical height; the 5.5 m statement belongs to the Boat Space. Wall caps, trusses, rails, lights and projector elevations follow the room-5 profile. The brochure/drawing's 5.5/5.6 m values do not independently establish this room's eaves or ridge. Roof pitch, skylight widths, six truss stations, steel member sections, projector/hoist elevations, pane sizes, furniture dimensions and exact printed artwork remain approximations.

The current 10 table groups and their chairs, four sofa elements and their placements are representative of the visible layout, not a verified count of furniture hidden by people. Furniture is visible by default, with optional physical collisions. All room shortcuts and an aligned end-to-end central aisle are tested for clearance with furniture made solid.

Both **5 / Atrium — opening end** and **5 / Atrium — white-wall end** are available in the room selector. Their camera directions follow the actual slightly angled plan axis, rather than a world-axis rectangle. The first-person eye height remains 1.65 m above the floor.

## Best next measurements

A measured eaves/beam-underside height or the wide room-2 opening's height would check vertical scale. A view square-on to each wall, with its location marked on the plan, would refine panel/door spacing. The roof ridge height and skylight run widths are particularly valuable. An unobstructed elevated view would resolve furniture counts/positions concealed by the event crowd.

Implementation: `packages/shared/src/roomFive.ts`, `apps/web/components/tour/RoomFiveAtrium.tsx`. The standalone HTML is regenerated from the same components via `node scripts/export-tour.mjs`.
