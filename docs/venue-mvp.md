# Hoxton Docks tour MVP

The game remains at `/`; `/tour` is the first-person tour; `/venue` provides a matching roofless 3D/top-down review and embedded source-plan overlay. Run `npm run dev`, or create a self-contained browser download with `node scripts/export-tour.mjs` (`artifacts/hoxton-docks-simulator.html`). No game server is needed for the tour.

Photo-informed spaces: 1 high bay, 2 main hall/stage/help desk, 3 Canal Room, 5 Atrium, 11 yard and the front entrance. The front includes the red AVERY scale, open timber leaves, banners, framed artwork, extinguisher pair, cream pressed ceiling panels and black beams. Entrance/canal ceilings and yard wall heights use provisional 3.4 m references. The plan footprint and doorway registration remain authoritative; photographs do not constitute a measured survey.

Rooms 4, 7, 8 and 10 have closed shared collision panels and readable locked signs; room 8 is marked WC. Shortcuts cannot bypass these doors. Public circulation openings remain accessible. Furniture visibility and solid collision are separate controls, and the tapered Canal Room retains a human-width aisle when furniture is solid.

Per the user's final finish direction, blank wall faces—including the entrance and Atrium far end—reuse the brick/concrete palette from the detailed rooms. These extrapolated finishes are intentional visual continuity, not evidence of the actual material in unphotographed rooms. Colored fixtures use emissive surfaces to avoid many simultaneous dynamic lights. Navigation overlays adapt to desktop, mobile and short landscape viewports.

Missing dedicated references: 6 internal courtyard pockets, 9 cloakroom (only a glimpse from the entrance), 12 covered parking, 13 bar, 14 club room and 15 workshop. Prioritize 13–15 for the next detail pass. No inaccessible interior references are required for the locked rooms. Canal/boat photographs establish exterior character; exact waterfront access and the barge interior remain unconfirmed. The yard's furniture arrangement and its registration within the larger footprint are estimates.

Review screenshots: [entrance](previews/venue-entrance.jpg), [Canal Room](previews/venue-canal.jpg), [yard](previews/venue-yard.jpg). The latest multiplayer implementation remains available at `/` (`/paintball` redirects there), including playable pets, randomized weapons, commentary and Redis/Vercel transport.
