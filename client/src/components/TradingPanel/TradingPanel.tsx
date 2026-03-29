import { useTradingStore } from '../../store/tradingStore';
import Chart from './Chart';
import OrderBook from './OrderBook';
import OrderForm from './OrderForm';
import OpenPositions from './OpenPositions';

export default function TradingPanel() {
  const posCount = useTradingStore((s) => s.positions.length);

  return (
    <div className="flex flex-col h-full">
      {/* Chart */}
      <div className="flex-[6] min-h-0 border-b border-border">
        <Chart />
      </div>

      {/* Order Book + Order Form */}
      <div className="flex-[3] min-h-0 flex border-b border-border">
        <div className="w-[45%] border-r border-border overflow-hidden">
          <OrderBook />
        </div>
        <div className="w-[55%] overflow-hidden">
          <OrderForm />
        </div>
      </div>

      {/* Positions */}
      <div className="flex-[1.5] min-h-0 flex flex-col">
        <div className="flex items-center gap-2 px-3 py-1 border-b border-border shrink-0">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Positions</span>
          <span className="text-[9px] text-text-muted bg-bg-surface-light px-1.5 py-0.5 rounded">
            {posCount}
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <OpenPositions />
        </div>
      </div>
    </div>
  );
}
