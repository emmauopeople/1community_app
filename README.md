# One Community

**One Community** is a mobile-first local service discovery platform designed to help users find trusted community-based service providers such as plumbers, electricians, tailors, drivers, hairdressers, cleaners, mechanics, and other skilled workers. The project is part of an MSIT capstone and focuses on practical software engineering, DevOps, cloud deployment, system integration, monitoring, and secure configuration management.

The platform is especially designed for communities where users may depend on mobile devices, WhatsApp contact, local recommendations, and simple search workflows instead of complex marketplace systems.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [Project Objectives](#project-objectives)
- [Core Features](#core-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Environment Variables](#environment-variables)
- [Local Development Setup](#local-development-setup)
- [Running Tests](#running-tests)
- [Deployment Overview](#deployment-overview)
- [CI/CD Workflow](#cicd-workflow)
- [Monitoring and Observability](#monitoring-and-observability)
- [Security Considerations](#security-considerations)
- [Known Issue: Mobile Media Upload](#known-issue-mobile-media-upload)
- [Future Improvements](#future-improvements)
- [Project Status](#project-status)
- [Author](#author)

---

## Project Overview

One Community allows users to search for local service providers by keyword, category, and location. Providers can register, verify their account, create service listings, and upload media for their skills. Administrators can manage providers and monitor platform activity through a separate admin portal.

The public platform focuses on three main user groups:

1. **Public users** who search for local services.
2. **Providers** who register and publish skills or services.
3. **Administrators** who manage providers, platform data, and monitoring.

---

## Problem Statement

In many communities, especially in developing regions, finding trusted local service providers can be difficult. People often depend on word-of-mouth, phone contacts, or informal referrals. This makes it hard for new providers to advertise their services and hard for users to compare available options.

One Community addresses this problem by providing a simple web-based platform where users can search for local services and contact providers directly.

---

## Project Objectives

The main objectives of One Community are to:

- Provide a searchable platform for local service discovery.
- Allow providers to register and manage their service listings.
- Allow only active and approved providers to publish services.
- Store skill information in a structured database.
- Support media uploads for provider skills using object storage.
- Track important platform events such as search and skill views.
- Deploy the application using a reproducible Docker-based environment.
- Monitor system behavior using Prometheus, Grafana, cAdvisor, and node-exporter.
- Demonstrate practical DevOps, CI/CD, testing, and deployment skills.

---

## Core Features

### Public User Features

- Search for local service providers.
- View skill/service details.
- View provider contact information.
- Access the platform from desktop or mobile browsers.
- Contact providers using available communication methods.

### Provider Features

- Provider registration with OTP verification.
- Provider login and session management.
- Provider profile management.
- Skill/service creation.
- Skill listing validation.
- Media upload support using presigned object storage URLs.
- Provider-only protected routes.

### Admin/Management Features

The admin portal is maintained separately but connects to the same platform database.

- View and manage providers.
- Activate or deactivate provider accounts.
- Monitor login and system activity.
- Review platform metrics.
- Support moderation and operational oversight.

---

## System Architecture

One Community is deployed as a Docker-based system with separate application, database, object storage, and monitoring components.

```text
Users
  |
  | HTTPS
  v
Nginx Reverse Proxy
  |
  |---------------------> React Frontend
  |
  |---------------------> Node.js / Express Backend
                              |
                              | SQL queries
                              v
                         PostgreSQL Database

Media Upload Flow:
Frontend -> Backend -> Presigned S3 URL -> Browser uploads directly to S3 -> Backend confirms metadata

Monitoring Flow:
Backend /metrics + cAdvisor + node-exporter -> Prometheus -> Grafana
```

### Main Components

| Component | Purpose |
|---|---|
| React/Vite Frontend | Public and provider user interface |
| Node.js/Express Backend | API, authentication, business logic, media workflow |
| PostgreSQL | Stores users, providers, skills, events, and media metadata |
| Nginx | Reverse proxy and HTTPS routing |
| Certbot | SSL/TLS certificate renewal |
| AWS S3 | Stores provider skill images/media |
| Prometheus | Collects metrics |
| Grafana | Visualizes metrics |
| cAdvisor | Exposes container metrics |
| node-exporter | Exposes host/server metrics |

---

## Technology Stack

### Frontend

- React
- Vite
- JavaScript
- Tailwind CSS
- Axios

### Backend

- Node.js
- Express.js
- PostgreSQL
- Cookie-based session authentication
- AWS SDK for S3 presigned URLs
- bcrypt
- Helmet
- CORS
- Rate limiting

### Database

- PostgreSQL
- Tables include users, skills, skill media, events, login attempts, and other platform data.

### DevOps and Deployment

- Docker
- Docker Compose
- GitHub Actions
- GitHub Container Registry (GHCR)
- Nginx
- Certbot
- OVHCloud VPS
- AWS S3 object storage

### Testing

- Jest
- Supertest
- Unit tests
- Integration-style API route tests

### Monitoring

- Prometheus
- Grafana
- cAdvisor
- node-exporter
- Backend `/metrics` endpoint

---

## Repository Structure

A typical structure for the project is shown below.

```text
1community_app/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── skills.js
│   │   │   ├── media.js
│   │   │   ├── events.js
│   │   │   ├── metrics.js
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── otpService.js
│   │   │   ├── eventService.js
│   │   │   ├── s3.js
│   │   │   └── ...
│   │   ├── middleware/
│   │   └── app.js
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   └── components/
│   │   ├── pages/
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml
├── nginx/
├── prometheus/
├── .github/
│   └── workflows/
└── README.md
```

---

## Environment Variables

Environment variables are used to separate configuration from source code. Sensitive values should not be committed to GitHub.

### Backend Environment Variables

Create a backend `.env` file using values similar to the following:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://username:password@localhost:5432/onecommunity

SESSION_SECRET=replace-with-secure-session-secret
COOKIE_SECURE=false

FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

OTP_SECRET=replace-with-secure-otp-secret

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_FROM=no-reply@example.com

AWS_ACCESS_KEY_ID=replace-with-access-key
AWS_SECRET_ACCESS_KEY=replace-with-secret-key
AWS_REGION=eu-west-3
S3_BUCKET=onecommunity-media-production
S3_PREFIX_SKILLS=skills
S3_PRESIGN_EXPIRES_SECONDS=300
S3_MAX_IMAGE_BYTES=3145728
S3_ALLOWED_IMAGE_MIME=image/jpeg,image/png,image/webp
```

### Frontend Environment Variables

Create a frontend `.env` or `.env.production` file:

```env
VITE_BACKEND_URL=http://localhost:3000
VITE_FRONTEND_URL=http://localhost:5173
```

For production:

```env
VITE_BACKEND_URL=https://api.cameroonskills.org
VITE_FRONTEND_URL=https://www.cameroonskills.org
```

---

## Local Development Setup

### Prerequisites

Install the following:

- Node.js 20+
- npm
- PostgreSQL
- Git
- Docker and Docker Compose, optional for local container testing

### 1. Clone the Repository

```bash
git clone https://github.com/emmauopeople/1community_app.git
cd 1community_app
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Update `.env` with your database, session, email, and S3 values.

Start the backend:

```bash
npm run dev
```

The backend should run on:

```text
http://localhost:3000
```

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
cp .env.example .env
```

Start the frontend:

```bash
npm run dev
```

The frontend should run on:

```text
http://localhost:5173
```

### 4. Health Check

Test the backend:

```bash
curl -i http://localhost:3000/healthz
```

Expected result:

```text
HTTP/1.1 200 OK
```

---

## Running Tests

The backend uses Jest for unit and integration-style tests.

### Run All Tests

```bash
cd backend
npm test
```

### Run Unit Tests Only

```bash
npm test -- tests/unit/eventService.test.js tests/unit/otpService.test.js
```

### Example Unit Tests

| Test File | Purpose |
|---|---|
| `otpService.test.js` | Tests OTP generation and hashing |
| `eventService.test.js` | Tests event logging and duplicate skill view prevention |

### Integration-Style Route Tests

| Test File | Purpose |
|---|---|
| `auth.routes.test.js` | Tests authentication and provider registration routes |
| `events.routes.test.js` | Tests event route behavior |
| `skills.routes.test.js` | Tests public skill search and skill detail routes |

---

## Deployment Overview

The production deployment uses Docker Compose on OVHCloud VPS servers.

### Deployment Components

| Service | Description |
|---|---|
| frontend | React/Vite frontend container |
| backend | Node.js/Express backend container |
| nginx | Reverse proxy for frontend and backend |
| certbot | SSL/TLS renewal |
| prometheus | Metrics collection |
| cadvisor | Container metrics |
| node-exporter | Host metrics |

### Example Deployment Commands

```bash
docker compose pull
docker compose up -d --force-recreate
docker ps
docker logs cameroonskills-backend --tail=100
```

### Example Production Domains

```text
Public app: https://www.cameroonskills.org
Backend API: https://api.cameroonskills.org
```

---

## CI/CD Workflow

The project uses GitHub Actions for CI/CD automation.

### Branching Strategy

```text
feature/* -> dev -> release -> main
```

### Workflow Summary

1. Developer creates a feature branch.
2. Code is pushed to GitHub.
3. Pull request is opened into `dev`.
4. CI workflow runs tests, linting, dependency checks, and security scans.
5. If checks pass, the branch is merged into `dev`.
6. Pull request from `dev` to `release` triggers deployment to the test environment.
7. Docker images are built and pushed to GHCR.
8. Deployment environment file is updated with new image tags.
9. Docker Compose pulls and recreates containers.
10. Stable releases are promoted to `main`.

### Example Workflow Files

```text
.github/workflows/ci.yml
.github/workflows/deployment.yml
.github/workflows/rollback.yml
```

---

## Monitoring and Observability

The backend exposes metrics through a `/metrics` endpoint, and Prometheus scrapes application and container metrics.

### Monitoring Stack

| Tool | Purpose |
|---|---|
| Prometheus | Scrapes and stores metrics |
| Grafana | Visualizes metrics |
| cAdvisor | Exposes Docker container metrics |
| node-exporter | Exposes host metrics |

### Useful Metrics

- Backend CPU usage
- Backend memory usage
- Container CPU usage
- Node.js process metrics
- HTTP request metrics
- Login success/failure counters
- Provider status change counters
- Event tracking metrics

### Example Prometheus/Grafana Queries

Backend memory:

```promql
process_resident_memory_bytes{job="backend"}
```

Backend CPU:

```promql
rate(process_cpu_seconds_total{job="backend"}[5m]) * 100
```

Container CPU:

```promql
sum by (name) (
  rate(container_cpu_usage_seconds_total{name!=""}[5m])
) * 100
```

---

## Security Considerations

One Community includes several security-focused practices:

- Session-based authentication.
- Role-based access control for provider routes.
- Provider status validation before skill creation.
- OTP-based provider registration.
- Password hashing with bcrypt.
- Helmet middleware for secure HTTP headers.
- CORS configuration for approved frontend origins.
- Rate limiting for authentication routes.
- Environment variables for secrets.
- Private object storage with presigned URLs.
- HTTPS using Nginx and Certbot.
- Monitoring for login and system activity.

---

## API Overview

The backend exposes routes for authentication, provider profiles, skills, media, events, analytics, contacts, health checks, and metrics.

### Health

```http
GET /healthz
GET /api/hello
```

### Authentication

```http
GET /auth/me
POST /auth/login
POST /auth/logout
POST /auth/provider/begin
POST /auth/provider/complete
```

### Provider Profile

```http
GET /provider/profile
PUT /provider/profile
```

### Skills

```http
GET /skills/search
GET /skills/:id
POST /provider/skills
PUT /provider/skills/:id
DELETE /provider/skills/:id
```

### Media

```http
POST /media/skills/:skillId/presign
POST /media/skills/:skillId/confirm
```

### Events

```http
POST /events
```

### Metrics

```http
GET /metrics
```

---

## Core Business Rules

### Provider Status Rule

Only active providers can create skill listings.

```text
if provider.status !== "active":
    reject request
else:
    allow skill creation
```

### Skill Validation Rule

A provider skill must include required fields such as:

- title
- category
- description
- country
- region
- city

### Media Upload Rule

Media uploads must meet the following requirements:

- Maximum 3 images per skill.
- Allowed types: JPG, PNG, WEBP.
- Maximum image size: 3 MB.
- Provider must own the skill.
- Provider and skill must be active.

---

## Known Issue: Mobile Media Upload

During system integration testing, image upload worked on desktop but failed on mobile with the message:

```text
Failed to fetch
```

The investigation showed:

- Skill creation works on mobile.
- Backend `/media/skills/:skillId/presign` returns `200`.
- The mobile file tested was `image/jpeg`.
- The tested file size was small.
- The failure appears to happen during direct browser-to-S3 upload using the presigned PUT URL.

This issue is currently treated as an integration challenge between the mobile browser and the object storage upload step.

### Planned Troubleshooting

- Improve client-side upload diagnostics.
- Test signed header behavior during direct PUT requests.
- Test upload with and without explicit `Content-Type`.
- Review mobile browser behavior with presigned URLs.
- Consider image compression before upload.
- Consider backend-mediated upload if direct mobile upload remains unreliable.

---

## Future Improvements

Planned improvements include:

- Complete mobile image upload troubleshooting.
- Add image compression before upload.
- Improve frontend upload error messages.
- Add provider dashboard analytics.
- Add admin moderation logs.
- Add search ranking by location and activity.
- Add multilingual support for English and French.
- Add SMS or WhatsApp notification support.
- Improve accessibility and mobile UX.
- Add automated end-to-end tests.
- Add blue-green or canary deployment strategy as the platform grows.
- Add backup and restore automation for PostgreSQL.
- Add object storage lifecycle policies.

---

## Project Status

Current status:

- Public skill creation workflow implemented.
- Provider status validation implemented.
- Skill validation implemented.
- OTP service implemented and unit tested.
- Event logging implemented and unit tested.
- Public skill search implemented.
- Media upload workflow implemented, with mobile issue under investigation.
- Docker Compose deployment configured.
- Monitoring stack configured with Prometheus and Grafana.
- CI/CD workflow designed with GitHub Actions and GHCR.

---

## Author

**Mbimunyui Emmanuel**  
MSIT Capstone Project  
University of the People

---

## License

This project is currently for academic and portfolio purposes. Add a formal license before public production use.
