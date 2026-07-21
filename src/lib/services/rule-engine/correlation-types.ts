export type TradeDirection = "buy" | "sell";

export interface CorrelationTrade {
  id: string;
  symbol: string;
  direction: TradeDirection;
  openTime: Date;
  volume: number;
}

export interface AccountTradeSet {
  userId: string;
  accountLogin: string;
  trades: CorrelationTrade[];
}

export type CorrelationType = "copy_trading" | "reverse_hedging";

export interface CorrelationFlag {
  correlationType: CorrelationType;
  userAId: string;
  userBId: string;
  tradeAId: string;
  tradeBId: string;
  symbol: string;
  timeGapSeconds: number;
  volumeA: number;
  volumeB: number;
}
