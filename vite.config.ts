import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path"

// No dev-server proxy is needed anymore — the app talks directly to
// Firebase (Auth + Firestore) over HTTPS from the browser, so there's no
// local backend to forward "/api" requests to.
// geofence.js used to enumerate import.meta.env, which makes Vite inline EVERY
// VITE_* value in .env into the public bundle (including a stray API key).
// Instead only the bounding-box variables are injected, as one constant.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const boxes = Object.fromEntries(
    Object.entries(env).filter(([k]) => /^VITE_.+_(LAT|LNG)_(MIN|MAX)$/.test(k))
  );
  return { ...config, define: { __GEOFENCE_ENV__: JSON.stringify(boxes) } };
});
const config = {
    plugins: [react()],

    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },

  // ─── Dev server ───────────────────────────────────────────────────
  // Explicit host/HMR settings — without these, Vite's defaults (bind
  // only to 127.0.0.1, let the client guess the HMR websocket's host
  // and port from window.location) commonly break under WSL2, Docker,
  // remote/cloud dev environments (Codespaces, cloud IDEs), or behind
  // a reverse proxy — producing exactly a "failed to connect to
  // websocket" error in the browser console even though the page
  // itself loads fine over plain HTTP.
  server: {
    host: true,        // listen on 0.0.0.0, not just 127.0.0.1
    port: 5173,
    strictPort: true,  // fail fast instead of silently picking another port
    hmr: {
      clientPort: 5173, // the port the BROWSER should connect back on
    },
  },

  // ─── Build optimisations ──────────────────────────────────────────
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-icons':    ['lucide-react'],
          'vendor-charts':   ['recharts'],
          'vendor-faceapi':  ['face-api.js'],
        },
      },
    },
  },
};
