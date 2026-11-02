# Contributing

Start with the root README. Use Node 24, `npm ci`, then `npm run dev`.

Create a feature branch and keep changes focused. Before opening a pull request, run `npm run check`, `npm run test:integration`, `npm run audit`, and `npm run build`. Run `npm run format` to apply formatting and `npm run lint:fix` for safe lint fixes. Integration tests start and stop fresh servers automatically, with paid commentary disabled.

The public game is one shared arena. Never run automated combat tests against human players. Do not deploy backend changes without coordinating, because restarts reset active gameplay.

Map collision geometry is assembled in `packages/shared/src/constants.ts` from the traced venue modules. The renderer and authoritative server must agree on walls, ramps, dimensions and spawns. Desktop and touch controls should both remain usable. Use screenshots or short recordings in UI PRs.

Keep provider keys, deployment credentials, `.env` files and the source video out of Git. Describe untested integrations honestly. Do not substitute flat photo billboards or fake progress for genuine generated 3D avatars.
