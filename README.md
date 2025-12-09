# Full-Stack Application

A modern full-stack application built with Remix, NestJS, PostgreSQL, and Turborepo.

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- [Docker](https://www.docker.com/) for PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone git@github.com:wfelliss/SDSD.git
cd SDSD
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Start PostgreSQL Database

```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d

# Or run PostgreSQL directly
docker run --name postgres-dev \
  -e POSTGRES_DB=nestjs_app \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15

# To stop the database later:
docker-compose down
# Or: docker stop postgres-dev && docker rm postgres-dev
```

### 4. Set Up Backend Environment

- You will need to request the S3 bucket details from Will Ellis, email him on wellis3@sheffield.ac.uk, Without these the website will not work

```bash
# Copy environment file
cp apps/backend/.env.example apps/backend/.env
# Fill this environment file with the contents recieved by Will E

# Generate and run database migrations
cd apps/backend
bun run db:generate
bun run db:migrate

# Optional: Seed database with test data
bun run seed

cd ../..
```

### 5. Start Development Servers

```bash
# Start both frontend and backend
bun run dev

# Or start individually:
# bun run dev --filter=frontend  # Frontend only
# bun run dev --filter=backend   # Backend only
```

### 6. Open Your Application

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001/api](http://localhost:3001/api)
- **Database**: PostgreSQL on port 5432

## 🏗️ What's Inside?

This Turborepo includes the following apps and packages:

### Apps

- **`frontend`**: [Remix](https://remix.run/) app with [Tailwind CSS](https://tailwindcss.com/)
- **`backend`**: [NestJS](https://nestjs.com/) API with [Drizzle ORM](https://orm.drizzle.team/)

### Packages

- **`@repo/ui`**: Shared React component library
- **`@repo/eslint-config`**: ESLint configurations
- **`@repo/typescript-config`**: TypeScript configurations

### Tech Stack

- **Frontend**: Remix + React 19 + Tailwind CSS
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Monorepo**: Turborepo
- **Package Manager**: Bun
- **Styling**: Tailwind CSS with design system
- **Dev Tools**: TypeScript, ESLint, Prettier

## 📋 API Endpoints

### Health Check

- `GET /api` - Hello from backend
- `GET /api/health` - Service health status

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 🛠️ Development

### Available Scripts

```bash
# Development
bun run dev                    # Start all apps
bun run dev --filter=frontend # Frontend only
bun run dev --filter=backend  # Backend only

# Building
bun run build                 # Build all apps
bun run build --filter=frontend
bun run build --filter=backend

# Database
cd apps/backend
bun run db:generate          # Generate migrations
bun run db:migrate           # Run migrations
bun run db:studio            # Open Drizzle Studio
bun run seed                 # Seed test data

# Linting & Type Checking
bun run lint                 # Lint all packages
bun run check-types          # Type check all packages
```

### Project Structure

```
apps/
├── frontend/                # Remix frontend
│   ├── app/
│   │   ├── components/
│   │   │   └── graphs/ # Graph components
│   │   │       ├── base/    # Reusable D3 primitives (LinePlot, Histogram)
│   │   │       └── domain/  # Domain charts (Displacement, Sag, Travel) using base components
│   │   ├── lib/             # Telemetry data utilities
│   │   ├── routes/          # Remix routes (_index.tsx)
│   │   ├── root.tsx         # Root component
│   │   └── tailwind.css     # Tailwind styles
│   ├── public/              # Static assets
│   └── vite.config.ts       # Vite config with API proxy
|
├── backend/                # NestJS backend
│   ├── src/
│   │   ├── database/       # Database schema & connection
│   │   ├── users/          # Users module
│   │   └── main.ts         # Application entry
│   ├── drizzle/            # Generated migrations
│   └── drizzle.config.ts   # Drizzle configuration
│
packages/
├── ui/                     # Shared React components
├── eslint-config/          # ESLint configurations
└── typescript-config/      # TypeScript configurations
```

## 🐳 Docker Support

The project includes Docker Compose for PostgreSQL:

```bash
# Start PostgreSQL
docker-compose up -d

# Stop PostgreSQL
docker-compose down

# View logs
docker-compose logs postgres
```

## 🔧 Configuration

### Environment Variables

Backend (`.env` in `apps/backend/`):

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/nestjs_app
PORT=3002
NODE_ENV=development
```

### API Proxy

The frontend automatically proxies `/api/*` requests to the backend server. This is configured in `apps/frontend/vite.config.ts`.

## 🚀 Deployment

### Frontend (Remix)

- Deploy to [Vercel](https://vercel.com/), [Netlify](https://netlify.com/), or any Node.js hosting
- Supports server-side rendering and static generation

### Backend (NestJS)

- Deploy to [Railway](https://railway.app/), [Render](https://render.com/), or any Node.js hosting
- Requires PostgreSQL database (use managed services like [Supabase](https://supabase.com/) or [Neon](https://neon.tech/))

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📚 Learn More

- [Remix Documentation](https://remix.run/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Turborepo Documentation](https://turborepo.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
