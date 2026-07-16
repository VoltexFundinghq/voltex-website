/**
 * MetaApi integration — PHASE 2, NOT YET IMPLEMENTED.
 * Defines the contract for reading live trading data (balance, equity,
 * open trades, drawdown) from a provisioned MT5 account via MetaApi,
 * which the Rule Engine and Trader Dashboard will both depend on.
 */

export interface AccountMetrics {
  balance: number;
  equity: number;
  openTradesCount: number;
  highestClosedBalance: number;
}

export async function getAccountMetrics(_mt5Login: string): Promise<AccountMetrics> {
  throw new Error("getAccountMetrics is not implemented yet — Phase 2 (MetaApi Integration).");
}

export async function connectAccount(_mt5Login: string, _investorPassword: string, _server: string): Promise<void> {
  throw new Error("connectAccount is not implemented yet — Phase 2 (MetaApi Integration).");
}
