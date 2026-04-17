# Stellar Legacy

Real-time cosmic ray visualizations driven by neutron monitor data.

## What this is

Neutron monitors around the world count the secondary particles that cosmic rays leave behind when they hit the atmosphere. A Python poller pulls counts from the [NMDB](https://www.nmdb.eu) public feed every 5 minutes, normalizes them into a 0-1 seed, and stores the readings in Postgres. A NestJS backend serves the data over REST and WebSocket. A SvelteKit frontend turns the seed into GPU-driven visuals.

## Running

```bash
docker compose up --build
```

- Postgres on 5432
- Backend (NestJS) on the port set in `.env` (default 3001)
- Frontend (SvelteKit) on 5173
- Voxel (nginx) on 8080
- Poller runs every 5 min (see `POLL_INTERVAL_SECONDS`)

Copy `.env.example` to `.env` for local dev. See `.env.production.example` for deployment.

## Dev

```bash
# backend
cd backend && npm install && npm run start:dev

# frontend
cd frontend && npm install && npm run dev

# poller
cd poller && pip install -r requirements.txt && python poller.py
```

Needs Node 20+, Python 3.10+, Postgres, FFmpeg.

## Render modes

| Mode | Description |
|------|-------------|
| Noise | Fractal curl noise blended with static, unique hue per station |
| Pipes | 3D metallic pipes with station-derived color palettes, clears every 60s |
| Crossing | Top-down pedestrian intersection, crowd size tracks raw neutron counts |
| Runner | Playable dodge game, neutron particles scale with station flux |
| Voxel | Minecraft-style world seeded by cosmic data and station code |

## Credits

Data from [NMDB](https://www.nmdb.eu), EU FP7 programme (contract no. 213007). Station-specific credits are embedded in each visualization.

Voxel mode is built on [minecraft-threejs](https://github.com/vyse12138/minecraft-threejs) by Yulei Zhu (MIT license). The original LICENSE file is preserved in the `minecraft/` directory.
