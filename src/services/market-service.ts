import YahooFinance from "yahoo-finance2";

const yahoo = new (YahooFinance as any)();

export const TICKERS = {
  INDICES: ["SPY", "QQQ", "DIA", "IWM"],
  SECTORS: ["XLK", "XLV", "XLF", "XLE", "XLI", "XLP", "XLU", "XLRE", "XLB"],
  LEVERAGE: ["TQQQ", "SOXL", "UPRO", "SQQQ", "TMF"],
  STOCKS: ["QQQM", "MAGS", "SMH", "NASA", "ASTS", "CC", "ATOM", "DRAM", "KORU", "DFEN", "SPYM"],
};

export const ALL_TICKERS = [...TICKERS.INDICES, ...TICKERS.SECTORS, ...TICKERS.LEVERAGE, ...TICKERS.STOCKS];

export function getCategory(symbol: string) {
  if (TICKERS.INDICES.includes(symbol)) return "Index";
  if (TICKERS.SECTORS.includes(symbol)) return "Sector";
  if (TICKERS.LEVERAGE.includes(symbol)) return "Leverage";
  if (TICKERS.STOCKS.includes(symbol)) return "Stock";
  return "Other";
}

export async function fetchMarketData() {
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

      const last20Prices = history.slice(-20).map((d: any) => d.close);
      const sma20 = last20Prices.reduce((a, b) => a + b, 0) / 20;
      const variance20 = last20Prices.reduce((a, b) => a + Math.pow(b - sma20, 2), 0) / 20;
      const stdDev20 = Math.sqrt(variance20);

      const upperBand = sma20 + 2 * stdDev20;
      const lowerBand = sma20 - 2 * stdDev20;

      let bbStatus = "Neutral";
      if (currentPrice > upperBand) bbStatus = "Upper Breakout";
      else if (currentPrice < lowerBand) bbStatus = "Lower Breakout";

      const returns = [];
      for (let i = 1; i < history.length; i++) {
        const r = (history[i].close / history[i - 1].close) - 1;
        returns.push(r);
      }

      const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const returnVariance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
      const returnStdDev = Math.sqrt(returnVariance);

      return {
        symbol,
        name: (quote.shortName || symbol) as string,
        price: currentPrice,
        change: dailyChange,
        sma20,
        stdDev: returnStdDev,
        upperBand,
        lowerBand,
        bbStatus,
        prob1SD: returnStdDev * 100,
        prob2SD: returnStdDev * 2 * 100,
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

export async function fetchStockAnalysis(symbol: string) {
  const now = new Date();
  const twoYearsAgo = new Date(now.getTime() - 500 * 24 * 60 * 60 * 1000);

  const result = await yahoo.chart(symbol, { 
    period1: twoYearsAgo,
    interval: "1d"
  });

  if (!result || !result.quotes || result.quotes.length < 20) {
    throw new Error("Insufficient data");
  }

  const history = result.quotes.filter((d: any) => d.close !== null && d.close !== undefined);
  const quote = await yahoo.quote(symbol);
  
  const returns = [];
  for (let i = 1; i < history.length; i++) {
    returns.push((history[i].close / history[i - 1].close) - 1);
  }
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const returnVariance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
  const sigma1 = Math.sqrt(returnVariance);
  const sigma2 = sigma1 * 2;

  const chartDataCount = 100;
  const chartHistory = history.slice(-chartDataCount);
  const fullHistory = history.map((d: any) => d.close);

  const finalChartData = chartHistory.map((d: any, i: number, arr: any[]) => {
    const actualIdx = history.length - chartDataCount + i;
    
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

    const point = {
      date: d.date.toISOString().split("T")[0],
      price: d.close,
      return: i > 0 ? (d.close / arr[i-1].close) - 1 : 0
    };

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

  return {
    symbol,
    currentPrice: (quote.regularMarketPrice || history[history.length - 1].close) as number,
    change: (((quote.regularMarketPrice || history[history.length - 1].close) - (quote.regularMarketPreviousClose || history[history.length - 2].close)) / (quote.regularMarketPreviousClose || history[history.length - 2].close)) * 100,
    name: (quote.shortName || symbol) as string,
    sigma1,
    sigma2,
    chartData: finalChartData
  };
}
