import express from "express";
import path from "path";
import YahooFinance from "yahoo-finance2";

const yahoo = new (YahooFinance as any)();

// Tickers categorized
const TICKERS = {
  INDICES: ["SPY", "QQQ", "DIA", "IWM"],
  SECTORS: ["XLK", "XLV", "XLF", "XLE", "XLI", "XLP", "XLU", "XLRE", "XLB"],
  LEVERAGE: ["TQQQ", "SOXL", "UPRO", "SQQQ", "TMF"],
  STOCKS: ["QQQM", "MAGS", "SMH", "NASA", "ASTS", "CC", "ATOM", "DRAM", "KORU", "DFEN", "SPYM"],
};

const ALL_TICKERS = [...TICKERS.INDICES, ...TICKERS.SECTORS, ...TICKERS.LEVERAGE, ...TICKERS.STOCKS];

async function fetchMarketData() {
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const promises = ALL_TICKERS.map(async (symbol) => {
    try {
      const result = await yahoo.chart(symbol, { 
        period1: oneYearAgo,
        interval: "1d"
      });

      if (!result || !result.quotes || result.quotes.length < 20) {
        return null;
      }

      const history = result.quotes.filter((d: any) => d.close !== null && d.close !== undefined);
      if (history.length < 20) return null;

      const quote = await yahoo.quote(symbol);
      const currentPrice = (quote.regularMarketPrice || history[history.length - 1].close) as number;
      const prevClose = (quote.regularMarketPreviousClose || history[history.length - 2].close) as number;
      const dailyChange = ((currentPrice - prevClose) / prevClose) * 100;

      // --- Bollinger Bands Calculation (Recent 20 days) ---
      const last20Prices = history.slice(-20).map((d: any) => d.close);
      const sma20 = last20Prices.reduce((a, b) => a + b, 0) / 20;
      const variance20 = last20Prices.reduce((a, b) => a + Math.pow(b - sma20, 2), 0) / 20;
      const stdDev20 = Math.sqrt(variance20);

      const upperBand = sma20 + 2 * stdDev20;
      const lowerBand = sma20 - 2 * stdDev20;

      let bbStatus = "Neutral";
      if (currentPrice > upperBand) bbStatus = "Upper Breakout";
      else if (currentPrice < lowerBand) bbStatus = "Lower Breakout";

      // --- 1-Year Historical Volatility (Sigma Levels) ---
      // Daily Returns = (Pt / Pt-1) - 1
      const returns = [];
      for (let i = 1; i < history.length; i++) {
        const r = (history[i].close / history[i - 1].close) - 1;
        returns.push(r);
      }

      const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const returnVariance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
      const returnStdDev = Math.sqrt(returnVariance);

      // Sigma levels in % (Daily Volatility)
      const prob1SD = returnStdDev * 100;
      const prob2SD = returnStdDev * 2 * 100;

      return {
        symbol,
        name: (quote.shortName || symbol) as string,
        price: currentPrice,
        change: dailyChange,
        sma20,
        stdDev: returnStdDev, // Showing return std dev
        upperBand,
        lowerBand,
        bbStatus,
        prob1SD,
        prob2SD,
        category: getCategory(symbol),
      };
    } catch (error) {
      console.error(`Error fetching ${symbol}:`, error);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter((r) => r !== null);
}

function getCategory(symbol: string) {
  if (TICKERS.INDICES.includes(symbol)) return "Index";
  if (TICKERS.SECTORS.includes(symbol)) return "Sector";
  if (TICKERS.LEVERAGE.includes(symbol)) return "Leverage";
  if (TICKERS.STOCKS.includes(symbol)) return "Stock";
  return "Other";
}

const app = express();

async function startServer() {
  const PORT = 3000;

  // API Routes
  app.get("/api/market-data", async (req, res) => {
    try {
      const data = await fetchMarketData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch market data" });
    }
  });

  app.get("/api/stock-analysis/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const now = new Date();
    const twoYearsAgo = new Date(now.getTime() - 500 * 24 * 60 * 60 * 1000);

    try {
      const result = await yahoo.chart(symbol, { 
        period1: twoYearsAgo,
        interval: "1d"
      });

      if (!result || !result.quotes || result.quotes.length < 20) {
        return res.status(404).json({ error: "Insufficient data" });
      }

      const history = result.quotes.filter((d: any) => d.close !== null && d.close !== undefined);
      const quote = await yahoo.quote(symbol);
      
      // Calculate returns for sigma levels based on 1 year data
      const returns = [];
      for (let i = 1; i < history.length; i++) {
        returns.push((history[i].close / history[i - 1].close) - 1);
      }
      const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const returnVariance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
      const sigma1 = Math.sqrt(returnVariance);
      const sigma2 = sigma1 * 2;

      // Calculate chart data for last 100 days
      const chartData = history.slice(-100).map((d: any, i: number, arr: any[]) => {
        return {
          date: d.date.toISOString().split("T")[0],
          price: d.close,
          return: i > 0 ? (d.close / arr[i-1].close) - 1 : 0
        };
      });

      const fullHistory = history.map((d: any) => d.close);
      const finalChartData = chartData.map((point: any, idx: number) => {
        const actualIdx = history.length - 100 + idx;
        
        const getSMA = (days: number) => {
          const slice = fullHistory.slice(Math.max(0, actualIdx - (days - 1)), actualIdx + 1);
          return slice.reduce((a, b) => a + b, 0) / slice.length;
        };

        const sma5 = getSMA(5);
        const sma20 = getSMA(20);
        const sma50 = getSMA(50);
        const sma100 = getSMA(100);
        const sma200 = getSMA(200);

        const slice20 = fullHistory.slice(Math.max(0, actualIdx - 19), actualIdx + 1);
        const variance20 = slice20.reduce((a, b) => a + Math.pow(b - sma20, 2), 0) / slice20.length;
        const stdDev20 = Math.sqrt(variance20);
        
        return {
          ...point,
          sma5,
          sma20,
          sma50,
          sma100,
          sma200,
          upper: sma20 + 2 * stdDev20,
          lower: sma20 - 2 * stdDev20,
          isBreakout: point.price > (sma20 + 2*stdDev20) || point.price < (sma20 - 2*stdDev20)
        };
      });

      res.json({
        symbol,
        currentPrice: (quote.regularMarketPrice || history[history.length - 1].close) as number,
        change: (((quote.regularMarketPrice || history[history.length - 1].close) - (quote.regularMarketPreviousClose || history[history.length - 2].close)) / (quote.regularMarketPreviousClose || history[history.length - 2].close)) * 100,
        name: (quote.shortName || symbol) as string,
        sigma1,
        sigma2,
        chartData: finalChartData
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze stock" });
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
