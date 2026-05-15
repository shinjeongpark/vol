import express from "express";
import path from "path";
import { fetchMarketData, fetchStockAnalysis } from "./src/services/market-service";

const app = express();

async function startServer() {
  const PORT = 3000;

  // API Routes
  app.get("/api/market-data", async (req, res) => {
    try {
      const data = await fetchMarketData();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch market data" });
    }
  });

  app.get("/api/stock-analysis/:symbol", async (req, res) => {
    const { symbol } = req.params;
    try {
      const data = await fetchStockAnalysis(symbol);
      res.json(data);
    } catch (error: any) {
      res.status(error.message === "Insufficient data" ? 404 : 500).json({ error: error.message || "Failed to analyze stock" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen in local development or if running as a main script
  if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
