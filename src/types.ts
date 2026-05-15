export interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  sma20: number;
  stdDev: number;
  upperBand: number;
  lowerBand: number;
  bbStatus: "Upper Breakout" | "Lower Breakout" | "Neutral";
  prob1SD: number;
  prob2SD: number;
  category: "Index" | "Sector" | "Leverage" | "Other";
}

export type CategoryFilter = "All" | "Index" | "Sector" | "Leverage" | "Stock";
