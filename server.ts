import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";

const _dirname = typeof __dirname !== "undefined" && __dirname ? __dirname : process.cwd();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Serve API routes first if any are added in the future
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development, static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        // Read index.html from disk
        let template = await fs.readFile(path.resolve(_dirname, "index.html"), "utf-8");
        // Apply Vite HTML transformations (inject HMR scripts, bundles, etc.)
        template = await vite.transformIndexHtml(url, template);
        // Serve the processed template
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
