# Backend API

NestJS backend with Drizzle ORM and PostgreSQL.

## Quick Start

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Set up environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Start PostgreSQL:**

   ```bash
   # Option 1: Using Docker
   docker run --name postgres-dev -e POSTGRES_DB=nestjs_app -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15

   # Option 2: Use local PostgreSQL installation
   createdb nestjs_app
   ```

4. **Run database migrations:**

   ```bash
   bun run db:generate
   bun run db:migrate
   ```

5. **Start development server:**
   ```bash
   bun run dev
   ```

The API will be available at `http://localhost:3001/api`

## Available Scripts

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun run start:prod` - Start production server
- `bun run db:generate` - Generate database migration files
- `bun run db:migrate` - Run database migrations
- `bun run db:studio` - Open Drizzle Studio (database GUI)

## API Endpoints

### Health Check

- `GET /api` - Hello message
- `GET /api/health` - Health check

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

## Environment Variables

Create a `.env` file based on `.env.example`:

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

## Frontend Integration

The frontend is configured to proxy `/api/*` requests to this backend server. All API calls from the frontend will automatically be routed to `http://localhost:3001/api/*`.
