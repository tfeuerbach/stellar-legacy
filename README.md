# Stellar Legacy

Real-time cosmic ray visualizations driven by neutron monitor data.

**[stellar-legacy.tfeuerbach.dev](https://stellar-legacy.tfeuerbach.dev)**

![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=flat&logo=svelte&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat&logo=threedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=flat&logo=socketdotio&logoColor=white)
![GLSL](https://img.shields.io/badge/GLSL-5586A4?style=flat&logo=opengl&logoColor=white)

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

## Production (Docker + Cloudflare Tunnel)

Use `.env.production.example` as the base for `.env` (HTTPS/WSS URLs for `tfeuerbach.dev`). Start the stack with `docker compose up -d --build`. The voxel app is published on host port **8081** (see `docker-compose.yml`) so it does not collide with other services using 8080.

Install `cloudflared` (the repo assumes `~/.local/bin/cloudflared` from the [official release](https://github.com/cloudflare/cloudflared/releases)), then run `./deploy/setup-cloudflared-tunnel.sh` once. That performs `cloudflared tunnel login`, creates the `stellar-legacy` tunnel, writes `~/.cloudflared/config.yml`, and adds DNS for `stellar-legacy.tfeuerbach.dev`, `stellar-legacy-api.tfeuerbach.dev`, and `stellar-legacy-voxel.tfeuerbach.dev`. Enable the user service so the tunnel survives logouts: `systemctl --user enable --now cloudflared-stellar-legacy.service`. For the tunnel to start at boot before login, run `sudo loginctl enable-linger "$USER"` once.

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
