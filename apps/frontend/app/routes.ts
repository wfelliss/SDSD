import {
  type RouteConfig,
  route,
  index,
  layout,
} from "@react-router/dev/routes";

export default [
  layout("routes/layout.tsx", [
    index("routes/index.tsx"),
    route("profiles", "routes/profiles/index.tsx"),
    route("login", "routes/login.tsx")
  ]),
  route("maintenance", "routes/maintenance.tsx")
] satisfies RouteConfig;
