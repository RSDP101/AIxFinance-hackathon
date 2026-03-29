import { useTradingStore } from '../../store/tradingStore';
import { formatPrice, formatPnl, formatPercent } from '../../utils/formatters';
import { X } from 'lucide-react';

export default function OpenPositions() {
  const positions = useTradingStore((s) => s.positions);
  const tickers = useTradingStore((s) => s.tickers);
  const closePosition = useTradingStore((s) => s.closePosition);

  if (positions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-xs">
        No open positions
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-text-muted border-b border-border">
            <th className="text-left px-3 py-1.5 font-medium">Pair</th>
            <th className="text-left px-2 py-1.5 font-medium">Side</th>
            <th className="text-right px-2 py-1.5 font-medium">Size</th>
            <th className="text-right px-2 py-1.5 font-medium">Entry</th>
            <th className="text-right px-2 py-1.5 font-medium">Current</th>
            <th className="text-right px-2 py-1.5 font-medium">PnL</th>
            <th className="text-right px-2 py-1.5 font-medium">Lev</th>
            <th className="px-2 py-1.5"></th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => {
            const ticker = tickers[pos.pair];
            const currentPrice = ticker?.last ?? pos.entryPrice;
            const dir = pos.side === 'long' ? 1 : -1;
            const pnl = dir * ((currentPrice - pos.entryPrice) / pos.entryPrice) * pos.size * pos.leverage;
            const pnlPct = dir * ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100 * pos.leverage;

            return (
              <tr key={pos.id} className="border-b border-border/50 hover:bg-bg-surface-light/50">
                <td className="px-3 py-1.5 font-medium">{pos.pair.replace('-', '/')}</td>
                <td className={`px-2 py-1.5 font-bold ${pos.side === 'long' ? 'text-green' : 'text-red'}`}>
                  {pos.side.toUpperCase()}
                </td>
                <td className="px-2 py-1.5 text-right font-tabular">${pos.size.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-right font-tabular">{formatPrice(pos.entryPrice, pos.pair)}</td>
                <td className="px-2 py-1.5 text-right font-tabular">{formatPrice(currentPrice, pos.pair)}</td>
                <td className={`px-2 py-1.5 text-right font-tabular font-bold ${pnl >= 0 ? 'text-green' : 'text-red'}`}>
                  {formatPnl(pnl)} ({formatPercent(pnlPct)})
                </td>
                <td className="px-2 py-1.5 text-right text-yellow font-bold">{pos.leverage}x</td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => closePosition(pos.id)}
                    className="p-0.5 rounded hover:bg-red/20 text-text-muted hover:text-red transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
