import Chart from './Chart';
import OrderBook from './OrderBook';
import OrderForm from './OrderForm';
import OpenPositions from './OpenPositions';

export default function TradingPanel() {
  return (
    <div className="flex flex-col h-full">
      {/* Chart - 55% height */}
      <div className="h-[55%] border-b border-border">
        <Chart />
      </div>

      {/* Order Book + Order Form - 30% height */}
      <div className="h-[30%] flex border-b border-border">
        <div className="w-1/2 border-r border-border">
          <OrderBook />
        </div>
        <div className="w-1/2">
          <OrderForm />
        </div>
      </div>

      {/* Positions - 15% height */}
      <div className="h-[15%]">
        <div className="flex items-center px-3 py-1.5 border-b border-border">
          <span className="text-xs font-bold text-text-secondary">POSITIONS</span>
        </div>
        <OpenPositions />
      </div>
    </div>
  );
}
