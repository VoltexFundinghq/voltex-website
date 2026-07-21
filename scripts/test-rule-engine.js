function evaluateChallenge({ startingBalance, closedTrades, challengeStartDate, evaluationDate, priorHoldTimeWarnings }) {
  const PROFIT_TARGET_PERCENT = 10;
  const DRAWDOWN_LIMIT_PERCENT = 20;
  const MIN_HOLD_TIME_MINUTES = 3;
  const MAX_HOLD_TIME_WARNINGS = 4;
  const INACTIVITY_LIMIT_DAYS = 5;

  const minutesBetween = (a, b) => Math.abs(b - a) / (1000 * 60);
  const daysBetween = (a, b) => Math.abs(b - a) / (1000 * 60 * 60 * 24);

  const violations = [];
  let breachedRule = null;
  let holdTimeWarnings = priorHoldTimeWarnings;
  let balance = startingBalance;
  let peak = startingBalance;

  for (const trade of closedTrades) {
    if (breachedRule) break;

    balance += trade.profit;
    if (balance > peak) peak = balance;

    const holdMinutes = minutesBetween(trade.openTime, trade.closeTime);
    if (holdMinutes < MIN_HOLD_TIME_MINUTES) {
      holdTimeWarnings += 1;
      const isFatal = holdTimeWarnings > MAX_HOLD_TIME_WARNINGS;
      violations.push({ rule: 'min_hold_time', message: `Trade ${trade.id}: held ${holdMinutes.toFixed(1)} min. Warning ${holdTimeWarnings}/${MAX_HOLD_TIME_WARNINGS}${isFatal ? ' -> ACCOUNT FAILED' : ''}`, profit: trade.profit });
      if (isFatal) breachedRule = 'min_hold_time';
    }

    if (breachedRule) break;

    const drawdownFloor = peak * (1 - DRAWDOWN_LIMIT_PERCENT / 100);
    if (balance <= drawdownFloor) {
      violations.push({ rule: 'trailing_drawdown', message: `Balance ${balance.toFixed(2)} <= floor ${drawdownFloor.toFixed(2)} (peak ${peak.toFixed(2)})`, profit: trade.profit });
      breachedRule = 'trailing_drawdown';
    }
  }

  if (!breachedRule) {
    const timelinePoints = [challengeStartDate, ...closedTrades.map(t => t.openTime), evaluationDate].sort((a, b) => a - b);
    for (let i = 1; i < timelinePoints.length; i++) {
      const gapDays = daysBetween(timelinePoints[i - 1], timelinePoints[i]);
      if (gapDays > INACTIVITY_LIMIT_DAYS) {
        violations.push({ rule: 'inactivity', message: `Gap of ${gapDays.toFixed(1)} days (max ${INACTIVITY_LIMIT_DAYS}) -> ACCOUNT FAILED` });
        breachedRule = 'inactivity';
        break;
      }
    }
  }

  const currentProfitPercent = ((balance - startingBalance) / startingBalance) * 100;
  const profitTargetMet = currentProfitPercent >= PROFIT_TARGET_PERCENT;
  const currentDrawdownPercent = peak > 0 ? Math.max(0, ((peak - balance) / peak) * 100) : 0;

  let outcome = 'in_progress';
  if (breachedRule) outcome = 'failed';
  else if (profitTargetMet) outcome = 'passed';

  return { outcome, finalBalance: balance, currentProfitPercent, profitTargetMet, peakClosedBalance: peak, currentDrawdownPercent, violations, breachedRule, totalHoldTimeWarnings: holdTimeWarnings };
}

function trade(id, symbol, openTime, closeTime, profit) {
  return { id, symbol, openTime: new Date(openTime), closeTime: new Date(closeTime), profit };
}

console.log('\n=== Scenario 1: Clean pass ===');
console.log(evaluateChallenge({
  startingBalance: 300000, priorHoldTimeWarnings: 0,
  challengeStartDate: new Date('2026-01-01T00:00:00Z'),
  evaluationDate: new Date('2026-01-10T00:00:00Z'),
  closedTrades: [
    trade('t1', 'EURUSD', '2026-01-02T09:00:00Z', '2026-01-02T09:30:00Z', 15000),
    trade('t2', 'GBPUSD', '2026-01-04T10:00:00Z', '2026-01-04T11:00:00Z', 12000),
    trade('t3', 'XAUUSD', '2026-01-06T08:00:00Z', '2026-01-06T09:15:00Z', 5000),
  ],
}));

console.log('\n=== Scenario 2: Trailing drawdown breach ===');
console.log(evaluateChallenge({
  startingBalance: 300000, priorHoldTimeWarnings: 0,
  challengeStartDate: new Date('2026-01-01T00:00:00Z'),
  evaluationDate: new Date('2026-01-10T00:00:00Z'),
  closedTrades: [
    trade('t1', 'EURUSD', '2026-01-02T09:00:00Z', '2026-01-02T09:30:00Z', 40000),
    trade('t2', 'GBPUSD', '2026-01-04T10:00:00Z', '2026-01-04T11:00:00Z', -70000),
  ],
}));

console.log('\n=== Scenario 3: Hold-time warning, isolated — should NOT fail ===');
console.log(evaluateChallenge({
  startingBalance: 300000, priorHoldTimeWarnings: 1,
  challengeStartDate: new Date('2026-01-01T00:00:00Z'),
  evaluationDate: new Date('2026-01-03T00:00:00Z'),
  closedTrades: [
    trade('t1', 'EURUSD', '2026-01-02T09:00:00Z', '2026-01-02T09:01:30Z', 3000),
  ],
}));

console.log('\n=== Scenario 4: Hold-time 5th offense — fatal, but P&L still counts ===');
console.log(evaluateChallenge({
  startingBalance: 300000, priorHoldTimeWarnings: 4,
  challengeStartDate: new Date('2026-01-01T00:00:00Z'),
  evaluationDate: new Date('2026-01-03T00:00:00Z'),
  closedTrades: [
    trade('t1', 'EURUSD', '2026-01-02T09:00:00Z', '2026-01-02T09:01:30Z', 3000),
  ],
}));

console.log('\n=== Scenario 5: 5-day inactivity gap ===');
console.log(evaluateChallenge({
  startingBalance: 300000, priorHoldTimeWarnings: 0,
  challengeStartDate: new Date('2026-01-01T00:00:00Z'),
  evaluationDate: new Date('2026-01-15T00:00:00Z'),
  closedTrades: [
    trade('t1', 'EURUSD', '2026-01-02T09:00:00Z', '2026-01-02T09:30:00Z', 5000),
  ],
}));
