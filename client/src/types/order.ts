export type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit';
export type OrderSide = 'long' | 'short';

export interface Order {
  id: string;
  pair: string;
  type: OrderType;
  side: OrderSide;
  price: number;
  size: number;
  leverage: number;
  timestamp: number;
  status: 'open' | 'filled' | 'cancelled';
}

export interface Position {
  id: string;
  pair: string;
  side: OrderSide;
  entryPrice: number;
  size: number;
  leverage: number;
  timestamp: number;
}
