# Movie Ticket Booking System

A microservices-based movie ticket booking platform built with NestJS and TypeORM.

## Overview

Web-based system where guests can browse movies/theatres, select shows and seats, make payments, and receive tickets via email. Admins manage theatres, movies, shows, and bookings.

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** NestJS 10
- **Database:** PostgreSQL / SQL Server
- **ORM:** TypeORM
- **Message Broker:** RabbitMQ
- **Cache:** Redis
- **Auth:** JWT (Access + Refresh tokens)
- **Payments:** Stripe

## Planned Microservices

| Service | Port | Description |
|---------|------|-------------|
| Identity | 3001 | Authentication, user management, role-based access |
| Theatre | 3002 | Theatre, screen, and seat layout management |
| Movie | 3003 | Movie catalogue, images, and movie requests |
| Show | 3004 | Show scheduling and pricing configuration |
| Booking | 3005 | Seat holds, bookings, and ticket generation |
| Payment | 3006 | Stripe checkout and webhook handling |
| Notification | 3007 | In-app notifications and email delivery |

### Identity Service
- JWT authentication (login, refresh, logout)
- User management (CRUD for admin users)
- Role-based authorization (SUPER_ADMIN, STAFF, THEATRE_ADMIN)

### Theatre Service
- Theatre management (name, city, address)
- Screen management per theatre
- Seat layout configuration (Standard, VIP seat types)
- Theatre admin assignment to theatres

### Movie Service
- Global movie catalogue (title, description, cast, director, rating)
- Movie image management with primary image support
- Movie request workflow (Theatre Admin requests → Staff/Super Admin approval)

### Show Service
- Show scheduling (movie + screen + date/time)
- Overlap detection for same screen
- Seat-type pricing per show

### Booking Service
- Seat availability (Available, Held, Sold status)
- Temporary seat holds with expiry (5 min default)
- Atomic booking creation with price snapshot
- Hold expiry cleanup job

### Payment Service
- Stripe Checkout integration
- Webhook handling (payment success/failure)
- Idempotent event processing

### Notification Service
- In-app notifications for admins
- Ticket generation on booking confirmation
- Email delivery with retry mechanism

## User Roles

| Role | Permissions |
|------|-------------|
| SUPER_ADMIN | Manage theatres, users, movies, review movie requests |
| STAFF | Manage movies and images, review movie requests |
| THEATRE_ADMIN | Manage assigned theatre's screens, seats, shows, pricing, view bookings |
| Guest | Browse movies/theatres, book tickets (no login required) |

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm 10+

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- SQL Server on port 1433
- RabbitMQ on ports 5672 / 15672 (Management UI)
- Redis on port 6379

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 4. Run Migrations

```bash
npm run migration:run -w @moviebooking/database
```

## Infrastructure Access

- **SQL Server:** `localhost:1433` (sa / MovieBooking@123)
- **RabbitMQ UI:** http://localhost:15672 (moviebooking / moviebooking123)
- **Redis:** `localhost:6379` (password: redis123)

## License

MIT
