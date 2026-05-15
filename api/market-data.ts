import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchMarketData } from '../src/services/market-service';

export const config = {
  maxDuration: 30, // Increase duration for Yahoo Finance requests
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const data = await fetchMarketData();
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch market data" });
  }
}
