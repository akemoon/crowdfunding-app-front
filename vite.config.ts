import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    proxy: {
      // TODO: remove proxy in production, configure reverse proxy (nginx etc.) instead
      '/api': {
        target: 'http://localhost:10001',
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
