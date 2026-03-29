import { Router, Request, Response } from 'express';

const router = Router();

router.get('/candles', async (req: Request, res: Response) => {
  const { instId = 'BTC-USDT', bar = '1m', limit = '300', after, before } = req.query;
  try {
    const params = new URLSearchParams({
      instId: String(instId),
      bar: String(bar),
      limit: String(limit),
    });
    if (after) params.set('after', String(after));
    if (before) params.set('before', String(before));

    const url = `https://www.okx.com/api/v5/market/candles?${params}`;
    const response = await fetch(url);
    const json: any = await response.json();

    if (json.code !== '0') {
      res.status(400).json({ error: json.msg });
      return;
    }

    const candles = json.data
      .map((d: string[]) => ({
        time: Math.floor(Number(d[0]) / 1000),
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5]),
      }))
      .reverse();

    res.json(candles);
  } catch (err) {
    console.error('OKX candles error:', err);
    res.status(500).json({ error: 'Failed to fetch candles' });
  }
});

router.get('/ticker', async (req: Request, res: Response) => {
  const { instId = 'BTC-USDT' } = req.query;
  try {
    const url = `https://www.okx.com/api/v5/market/ticker?instId=${instId}`;
    const response = await fetch(url);
    const json: any = await response.json();

    if (json.code !== '0') {
      res.status(400).json({ error: json.msg });
      return;
    }

    const d = json.data[0];
    res.json({
      instId: d.instId,
      last: parseFloat(d.last),
      open24h: parseFloat(d.open24h),
      high24h: parseFloat(d.high24h),
      low24h: parseFloat(d.low24h),
      vol24h: parseFloat(d.vol24h),
      change24h: ((parseFloat(d.last) - parseFloat(d.open24h)) / parseFloat(d.open24h)) * 100,
    });
  } catch (err) {
    console.error('OKX ticker error:', err);
    res.status(500).json({ error: 'Failed to fetch ticker' });
  }
});

export default router;
