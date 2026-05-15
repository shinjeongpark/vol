import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchStockAnalysis } from '../src/services/market-service';

export const config = {
  maxDuration: 30, // Increase duration for Yahoo Finance requests
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol } = req.query;

  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: "Symbol is required" });
  }

  try {
    const data = await fetchStockAnalysis(symbol);
    res.status(200).json(data);
  } catch (error: any) {
    res.status(error.message === "Insufficient data" ? 404 : 500).json({ error: error.message || "Failed to analyze stock" });
  }
}
