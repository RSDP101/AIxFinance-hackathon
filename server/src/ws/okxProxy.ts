import WebSocket, { WebSocketServer } from 'ws';

const OKX_WS_URL = 'wss://ws.okx.com:8443/ws/v5/public';
const PAIRS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'TAO-USDT'];

interface TickerData {
  instId: string;
  last: number;
  open24h: number;
  high24h: number;
  low24h: number;
  vol24h: number;
  change24h: number;
  ts: number;
}

let okxWs: WebSocket | null = null;
const latestTickers: Map<string, TickerData> = new Map();

function connectToOkx(wss: WebSocketServer) {
  if (okxWs) try { okxWs.close(); } catch {}

  console.log('Connecting to OKX WebSocket...');
  okxWs = new WebSocket(OKX_WS_URL);

  okxWs.on('open', () => {
    console.log('Connected to OKX WebSocket');
    const tickerArgs = PAIRS.map(p => ({ channel: 'tickers', instId: p }));
    okxWs!.send(JSON.stringify({ op: 'subscribe', args: tickerArgs }));
    const candleArgs = PAIRS.map(p => ({ channel: 'candle1m', instId: p }));
    okxWs!.send(JSON.stringify({ op: 'subscribe', args: candleArgs }));
  });

  okxWs.on('message', (data) => {
    const msg = data.toString();
    if (msg === 'pong') return;

    try {
      const parsed = JSON.parse(msg);
      if (parsed.event) return;

      if (parsed.arg?.channel === 'tickers' && parsed.data) {
        const d = parsed.data[0];
        const ticker: TickerData = {
          instId: d.instId,
          last: parseFloat(d.last),
          open24h: parseFloat(d.open24h),
          high24h: parseFloat(d.high24h),
          low24h: parseFloat(d.low24h),
          vol24h: parseFloat(d.vol24h),
          change24h: ((parseFloat(d.last) - parseFloat(d.open24h)) / parseFloat(d.open24h)) * 100,
          ts: parseInt(d.ts),
        };
        latestTickers.set(d.instId, ticker);
        const payload = JSON.stringify({ type: 'ticker', data: ticker });
        wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(payload); });
      }

      if (parsed.arg?.channel === 'candle1m' && parsed.data) {
        const d = parsed.data[0];
        const candle = {
          instId: parsed.arg.instId,
          time: Math.floor(Number(d[0]) / 1000),
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5]),
        };
        const payload = JSON.stringify({ type: 'candle', data: candle });
        wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(payload); });
      }
    } catch {}
  });

  const pingInterval = setInterval(() => {
    if (okxWs && okxWs.readyState === WebSocket.OPEN) okxWs.send('ping');
  }, 25000);

  okxWs.on('close', () => {
    console.log('OKX disconnected, reconnecting in 3s...');
    clearInterval(pingInterval);
    setTimeout(() => connectToOkx(wss), 3000);
  });

  okxWs.on('error', (err) => {
    console.error('OKX WS error:', err.message);
  });
}

export function setupOkxProxy(wss: WebSocketServer) {
  connectToOkx(wss);
  wss.on('connection', (ws) => {
    console.log('Client connected to market WS');
    latestTickers.forEach(ticker => {
      ws.send(JSON.stringify({ type: 'ticker', data: ticker }));
    });
    ws.on('close', () => console.log('Client disconnected from market WS'));
  });
}
