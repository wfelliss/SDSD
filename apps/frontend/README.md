This is a [Remix](https://remix.run) project created as part of a Turborepo monorepo.

## Getting Started

First, install dependencies and run the development server:

```bash
# From the root of the monorepo
bun install

# Run the development server
bun run dev
# or run only this frontend app
bun run dev --filter=frontend
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

You can start editing the page by modifying `app/routes/_index.tsx`. The page auto-updates as you edit the file.

## Project Structure

```
app/
├── routes/
│   └── _index.tsx          # Homepage route
├── entry.client.tsx        # Client-side entry point
├── entry.server.tsx        # Server-side entry point
└── root.tsx               # Root component
```

## Learn More

To learn more about Remix and the tools used in this project:

- [Remix Documentation](https://remix.run/docs) - learn about Remix features and API.
- [Remix Tutorial](https://remix.run/docs/en/main/tutorial) - an interactive Remix tutorial.
- [Vite](https://vitejs.dev/) - the build tool used by Remix.
- [Turborepo](https://turborepo.org/docs) - for managing this monorepo.

## Building for Production

```bash
# Build the app
bun run build

# Start the production server
bun run start
```

## Deployment

Remix can be deployed to various platforms. Check out the [Remix deployment guides](https://remix.run/docs/en/main/guides/deployment) for more details.
