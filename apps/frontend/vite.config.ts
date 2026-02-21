import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import devtoolsJson from "vite-plugin-devtools-json";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    devtoolsJson(),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
  server: {
    port: 3000
  },
});
