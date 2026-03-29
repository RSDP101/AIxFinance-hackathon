import { useState } from 'react';
import { useTradingStore } from '../../store/tradingStore';
import type { OrderType, OrderSide } from '../../types/order';
import { formatPrice } from '../../utils/formatters';

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: 'market', label: 'Market' },
  { value: 'limit', label: 'Limit' },
  { value: 'stop_loss', label: 'Stop Loss' },
  { value: 'take_profit', label: 'Take Profit' },
];

export default function OrderForm() {
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');

  const selectedPair = useTradingStore((s) => s.selectedPair);
  const ticker = useTradingStore((s) => s.tickers[s.selectedPair]);
  const leverage = useTradingStore((s) => s.leverage);
  const setLeverage = useTradingStore((s) => s.setLeverage);
  const placeOrder = useTradingStore((s) => s.placeOrder);

  const handleOrder = (side: OrderSide) => {
    const orderPrice = orderType === 'market' ? (ticker?.last ?? 0) : parseFloat(price);
    const orderSize = parseFloat(size);
    if (!orderPrice || !orderSize) return;

    placeOrder({ type: orderType, side, price: orderPrice, size: orderSize });
    setSize('');
    setPrice('');
  };

  const presetSizes = [100, 500, 1000, 5000];

  return (
    <div className="flex flex-col h-full p-3 gap-2.5">
      <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
        Place Order
      </div>

      {/* Order type tabs */}
      <div className="grid grid-cols-4 gap-1 bg-bg-primary rounded-md p-0.5">
        {ORDER_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setOrderType(t.value)}
            className={`py-1 text-[10px] font-medium rounded cursor-pointer ${
              orderType === t.value
                ? 'bg-purple text-white shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Price */}
      {orderType !== 'market' ? (
        <div>
          <label className="text-[10px] text-text-muted mb-1 block">Price (USDT)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={ticker ? formatPrice(ticker.last, selectedPair) : '0.00'}
            className="w-full bg-bg-primary border border-border rounded-md px-2.5 py-1.5 text-sm font-tabular text-text-primary placeholder-text-muted"
          />
        </div>
      ) : (
        ticker && (
          <div className="flex items-center justify-between bg-bg-primary rounded-md px-2.5 py-1.5 border border-border/50">
            <span className="text-[10px] text-text-muted">Market Price</span>
            <span className="text-sm font-bold text-text-primary font-tabular">${formatPrice(ticker.last, selectedPair)}</span>
          </div>
        )
      )}

      {/* Size */}
      <div>
        <label className="text-[10px] text-text-muted mb-1 block">Amount (USDT)</label>
        <input
          type="number"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="0.00"
          className="w-full bg-bg-primary border border-border rounded-md px-2.5 py-1.5 text-sm font-tabular text-text-primary placeholder-text-muted"
        />
        <div className="grid grid-cols-4 gap-1 mt-1.5">
          {presetSizes.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s.toString())}
              className="py-1 text-[10px] bg-bg-primary border border-border/50 rounded text-text-muted hover:text-text-primary hover:border-purple/50 cursor-pointer"
            >
              ${s >= 1000 ? `${s / 1000}K` : s}
            </button>
          ))}
        </div>
      </div>

      {/* Leverage */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] text-text-muted">Leverage</label>
          <span className="text-xs font-bold text-yellow px-1.5 py-0.5 bg-yellow/10 rounded">{leverage}x</span>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={leverage}
          onChange={(e) => setLeverage(parseInt(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #FBBF24 ${((leverage - 1) / 4) * 100}%, #1a1333 ${((leverage - 1) / 4) * 100}%)`,
          }}
        />
        <div className="flex justify-between text-[9px] text-text-muted mt-1">
          {[1, 2, 3, 4, 5].map((l) => (
            <span key={l} className={l === leverage ? 'text-yellow font-bold' : ''}>{l}x</span>
          ))}
        </div>
      </div>

      {/* Buy/Sell buttons */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => handleOrder('long')}
          className="flex-1 py-2.5 rounded-md font-bold text-sm text-white cursor-pointer active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
        >
          Long / Buy
        </button>
        <button
          onClick={() => handleOrder('short')}
          className="flex-1 py-2.5 rounded-md font-bold text-sm text-white cursor-pointer active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
        >
          Short / Sell
        </button>
      </div>

      {/* Cost estimate */}
      {size && ticker && (
        <div className="text-[10px] text-text-muted text-center bg-bg-primary rounded px-2 py-1">
          Margin: <span className="text-text-secondary">${(parseFloat(size) || 0).toFixed(2)}</span>
          {' · '}
          Position: <span className="text-text-secondary">${((parseFloat(size) || 0) * leverage).toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
