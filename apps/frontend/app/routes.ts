import {
  type RouteConfig,
  route,
  index,
  layout,
} from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),  // outside layout — no nav bar on login page
  layout("routes/layout.tsx", [
    index("routes/index.tsx"),
    route("profiles", "routes/profiles/index.tsx"),
  ]),
  route("maintenance", "routes/maintenance.tsx")
] satisfies RouteConfig;
