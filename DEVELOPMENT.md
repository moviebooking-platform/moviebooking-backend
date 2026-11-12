# Development guide

How to build, run and check the backend locally.

## Build order: libraries first

The services import `@moviebooking/common` and `@moviebooking/database` through each library's compiled `dist/` folder (`"main": "dist/index.js"`). `dist/` is not committed, so on a fresh clone **the libraries must be built before any service can build, start or run its tests**.

The root scripts handle this:

| Script | What it does |
|---|---|
| `npm run build` | Builds the libraries, then the services |
| `npm run build:libs` | Builds `libs/common` and `libs/database` only |
| `npm run build:services` | Builds every service (needs the libraries built) |

After changing anything under `libs/`, run `npm run build:libs` again before starting or testing a service.

## First-time set-up

```bash
npm ci
cp .env.example .env        # then fill in the secrets (DB_PASSWORD, JWT_*, ID_ENCRYPTION_KEY, ADMIN_*)
docker compose up -d        # RabbitMQ and Redis (SQL Server runs locally, not in compose)
npm run build:libs
npm run db:migrate
```

## Running the services

Run each service in its own terminal:

```bash
npm run start:dev -w @moviebooking/identity-service
```

Each service reads only its own port variable:

| Service | Workspace | Port variable | Default |
|---|---|---|---|
| identity | `@moviebooking/identity-service` | `IDENTITY_SERVICE_PORT` | 3001 |
| theatre | `@moviebooking/theatre-service` | `THEATRE_SERVICE_PORT` | 3002 |
| movie | `@moviebooking/movie-service` | `MOVIE_SERVICE_PORT` | 3003 |
| show | `@moviebooking/show-service` | `SHOW_SERVICE_PORT` | 3004 |
| booking | `@moviebooking/booking-service` | `BOOKING_SERVICE_PORT` | 3005 |

## Checks (the same ones CI runs)

```bash
npm run lint:check   # ESLint without --fix (npm run lint applies fixes)
npm run typecheck    # tsc --noEmit in every package
npm test             # unit tests in every package
npm run test:cov     # unit tests with coverage
```

Line endings are LF everywhere (`.gitattributes`). Prettier is applied through ESLint; `npx prettier --write .` reformats the repository.
