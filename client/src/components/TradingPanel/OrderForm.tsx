import { useState } from 'react';
import { useTradingStore } from '../../store/tradingStore';
import type { OrderType, OrderSide } from '../../types/order';
import { formatPrice } from '../../utils/formatters';

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: 'market', label: 'Market' },
  { value: 'limit', label: 'Limit' },
  { value: 'stop_loss', label: 'SL' },
  { value: 'take_profit', label: 'TP' },
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

    placeOrder({
      type: orderType,
      side,
      price: orderPrice,
      size: orderSize,
    });
    setSize('');
    setPrice('');
  };

  const presetSizes = [100, 500, 1000, 5000];

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      <div className="text-xs font-bold text-text-secondary">ORDER</div>

      {/* Order type tabs */}
      <div className="flex gap-1">
        {ORDER_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setOrderType(t.value)}
            className={`flex-1 py-1 text-[10px] font-medium rounded transition-all cursor-pointer ${
              orderType === t.value
                ? 'bg-purple text-white'
                : 'bg-bg-surface-light text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Price input */}
      {orderType !== 'market' && (
        <div>
          <label className="text-[10px] text-text-muted mb-1 block">Price (USDT)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={ticker ? formatPrice(ticker.last, selectedPair) : '0.00'}
            className="w-full bg-bg-surface-light border border-border rounded px-2 py-1.5 text-sm font-tabular text-text-primary placeholder-text-muted outline-none focus:border-purple transition-colors"
          />
        </div>
      )}

      {orderType === 'market' && ticker && (
        <div className="text-xs text-text-muted">
          Price: <span className="text-text-primary font-tabular">${formatPrice(ticker.last, selectedPair)}</span>
        </div>
      )}

      {/* Size input */}
      <div>
        <label className="text-[10px] text-text-muted mb-1 block">Size (USDT)</label>
        <input
          type="number"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="0.00"
          className="w-full bg-bg-surface-light border border-border rounded px-2 py-1.5 text-sm font-tabular text-text-primary placeholder-text-muted outline-none focus:border-purple transition-colors"
        />
        <div className="flex gap-1 mt-1.5">
          {presetSizes.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s.toString())}
              className="flex-1 py-0.5 text-[10px] bg-bg-surface-light rounded text-text-secondary hover:text-text-primary hover:bg-bg-surface-lighter transition-all cursor-pointer"
            >
              ${s >= 1000 ? `${s / 1000}K` : s}
            </button>
          ))}
        </div>
      </div>

      {/* Leverage */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-text-muted">Leverage</label>
          <span className="text-xs font-bold text-yellow">{leverage}x</span>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={leverage}
          onChange={(e) => setLeverage(parseInt(e.target.value))}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #FBBF24 ${((leverage - 1) / 4) * 100}%, #241d40 ${((leverage - 1) / 4) * 100}%)`,
          }}
        />
        <div className="flex justify-between text-[9px] text-text-muted mt-0.5">
          {[1, 2, 3, 4, 5].map((l) => (
            <span key={l}>{l}x</span>
          ))}
        </div>
      </div>

      {/* Buy/Sell buttons */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => handleOrder('long')}
          className="flex-1 py-2 rounded font-bold text-sm bg-green hover:bg-green-dark text-white transition-all cursor-pointer active:scale-[0.97]"
        >
          Long
        </button>
        <button
          onClick={() => handleOrder('short')}
          className="flex-1 py-2 rounded font-bold text-sm bg-red hover:bg-red-dark text-white transition-all cursor-pointer active:scale-[0.97]"
        >
          Short
        </button>
      </div>

      {/* Estimated cost */}
      {size && ticker && (
        <div className="text-[10px] text-text-muted text-center">
          Margin: ${(parseFloat(size) || 0).toFixed(2)} · Buying Power: $
          {((parseFloat(size) || 0) * leverage).toFixed(2)}
        </div>
      )}
    </div>
  );
}
