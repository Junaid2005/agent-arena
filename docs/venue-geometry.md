# Hoxton Docks geometry

The game geometry and standalone first-person simulator use the ground-floor drawing from **Hoxton Dock Creds Deck**, September 2025, page 5, supplied by the user. The source labels the drawing **1:200**, says to print on **A3**, and describes it as illustrative. This is a plan-based blockout, not a measured survey or an exact digital twin.

## Scale

`packages/shared/src/venue.ts` owns the trace, calibration, walls, room outlines and spawns. Coordinates are in a 1406 × 987 reference frame (half the embedded image's original 2812 × 1974 pixels). The full image is retained at `/venue/hoxton-ground-floor.webp`.

Use the source image fitted to the **420 mm width of landscape A3**, without extra print margins or further cropping. At 1:200, that width represents **84 metres**. The conversion is therefore **84 / 1406 = 0.05974395448 metres per trace pixel**, identically on both axes. One game/Three.js unit is one metre. Trace origin `[840, 520]` maps to world `[0, 0]`; image down maps to world +Z, so the canal appears at the top of the review view. Do not use the brochure PDF page width as a scale ruler: the image was embedded into a different-sized page.

This assumes the source's A3 instruction means full-image fit to A3 width. Its aspect ratio differs from A3 by under 1%. The brochure's rounded 200 m² Atrium and 300 m² Boat Space descriptions are approximate and do not independently establish precise dimensions; they are not used to distort either axis or individual rooms. The trace yields an Atrium around 227 m² at the published drawing scale. A measured wall can confirm or refine the global calibration; set `metresPerPixel = measuredMetres / tracedPixelDistance` once available.

## What is modeled

- Irregular ground-floor envelope, sloped canal-side facade and angled club-room/workshop partitions.
- Boat Space, Lightwell, Canal Room, kitchen, Atrium, both internal courtyards, photo studio, restrooms, cloakroom, recording studio, bar, club room, workshop, circulation, yard and parking footprint.
- Traced door gaps, overhead lintels, major columns, container and timber obstructions.
- Enclosed private areas; exterior gates visibly closed to contain gameplay.
- Neutral floors/walls, with no speculative stage, desks, demo plinths, trusses or event decoration. The earlier event layout does not define permanent architecture.

Wall segments generate **the same rotated boxes** for meshes, Rapier colliders, authoritative capsule movement, camera clearance and hitscan. Movement is substepped so diving cannot cross a thin partition in one tick. Room polygons define floor surfaces; the larger bounds are a final guard, not a replacement for the building envelope.

## Remaining accuracy limits

The illustration is raster-based. Wall faces and jamb positions are traced rather than surveyed; window/door symbols can be ambiguous. Doors are open gaps in the blockout, without swing animations. The model is ground-floor only; stairs, internal toilet stalls/fixtures, detailed private-room interiors, roof/ceiling slopes, window openings and equipment await better references. Neither this model nor its review view is an evacuation plan.

The Boat Space prose says 5.5 m high and the drawing says 5.6 m. The blockout uses 5.5 m. Other spaces temporarily share that height, ordinary wall thickness defaults to 0.22 m (main divider 0.55 m), and door height to 2.15 m. These vertical/thickness values are explicit assumptions; the A3 scale calibrates the horizontal plan. Photos and measurements can refine them later.

## Reviewing

Open the default route for the first-person simulator, or `/venue` using its **Floor plan** link. The viewer has a top-down plan, 3D orbit, room labels, 1 m grid/5 m major grid, approximate footprint areas and a source-image overlay. Inspect alignment before making any decorative pass. The source overlay and model use the same transform and uniform scale.

Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:network` against a fresh local server. Tests cover the published scale, door clearance, diagonal collision/ray occlusion, spawns, and authoritative gameplay. Do not run combat fixtures against the occupied public server. Frontend and backend need the same geometry version when deployed together; no production deployment is part of this change.

## Standalone tour

The default page runs without Socket.IO or the game server. `packages/shared/src/tour.ts` defines a 1.65 m camera eye level, 1.8 m body clearance, 0.30 m collision radius and 1.4 m/s walking speed (2.4 m/s with Shift). Diagonal input is normalized and long frame stalls are capped. Desktop pointer lock and drag fallback, touch arrows and drag-to-look share the same camera and collision code. Room shortcuts use validated destinations.

The tour adds ceiling surfaces over indoor room polygons at the explicit 5.5 m reference height; outdoor courts and the yard stay open. Ceiling color is a neutral placeholder. This is a visual height reference rather than a claim that all roofs are flat or all rooms have measured 5.5 m clearance. The plan-review view remains roofless for inspection.

## Room-by-room photo pass

The user identified the first photo batch as **room 2** and located the taller part on the **dashed square numbered 1**. The model now splits those survey regions accordingly, retaining an uninterrupted walking floor and adding no partition walls. Concrete finishes are shared across this photographed hall; the surrounding ceiling is dark, with its higher-bay footprint cut out. Room 1 now has a timber-door / raised masonry / clerestory assembly, with an explicitly provisional 8 m upper roof cap; its height/section remain unmeasured. See [room 1](room-01-timber-bay.md). See [room 2 survey](room-02-photo-survey.md) for observations and targeted missing references. Wall orientation, roof structure and event-object registration remain unresolved.

## Atrium photo pass

Room 5 now has a distinct pitched roof with two skylight strips, trusses, crane/hoist assemblies, factory/frosted windows, projector, lighting and furniture. The 5.5 m eaves / 7.5 m ridge, member sections and wide portal’s 3.3 m opening height are explicit photo estimates. The original horizontal footprint and door positions are retained. See [room 5](room-05-atrium.md).
