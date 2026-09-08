import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import app from "./src/server/index.ts";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "hono-api-dev-server",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith("/api")) {
            try {
              const url = new URL(req.url, `http://${req.headers.host || "localhost:5173"}`);
              const headers = new Headers();
              for (const [k, v] of Object.entries(req.headers)) {
                if (v) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
              }

              let body: Uint8Array | undefined = undefined;
              if (req.method !== "GET" && req.method !== "HEAD") {
                const chunks: Buffer[] = [];
                for await (const chunk of req) {
                  chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
                }
                body = Buffer.concat(chunks);
              }

              const webRequest = new Request(url.toString(), {
                method: req.method,
                headers,
                body: body && body.length > 0 ? body : undefined
              });

              // Локальный Hono fetch
              const webResponse = await app.fetch(webRequest);

              res.statusCode = webResponse.status;
              webResponse.headers.forEach((val, key) => {
                res.setHeader(key, val);
              });

              const arrayBuffer = await webResponse.arrayBuffer();
              res.end(Buffer.from(arrayBuffer));
            } catch (err: any) {
              console.error("API dev middleware error:", err);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err.message }));
            }
          } else {
            next();
          }
        });
      }
    }
  ],
  resolve: {
    alias: {
      "@": "/src"
    }
  }
});
