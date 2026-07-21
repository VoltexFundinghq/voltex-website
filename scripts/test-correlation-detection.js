function detectCrossAccountCorrelations(accounts) {
  const TIME_WINDOW_SECONDS = 60;
  const SIZE_SIMILARITY_TOLERANCE = 0.3;
  const flags = [];

  for (let i = 0; i < accounts.length; i++) {
    for (let j = i + 1; j < accounts.length; j++) {
      const a = accounts[i], b = accounts[j];
      if (a.userId === b.userId) continue;

      for (const tradeA of a.trades) {
        for (const tradeB of b.trades) {
          if (tradeA.symbol !== tradeB.symbol) continue;
          const timeGapSeconds = Math.abs(tradeA.openTime - tradeB.openTime) / 1000;
          if (timeGapSeconds > TIME_WINDOW_SECONDS) continue;
          const largerVolume = Math.max(tradeA.volume, tradeB.volume);
          const volumeDiff = Math.abs(tradeA.volume - tradeB.volume);
          if (largerVolume === 0 || volumeDiff / largerVolume > SIZE_SIMILARITY_TOLERANCE) continue;
          const sameDirection = tradeA.direction === tradeB.direction;
          flags.push({
            correlationType: sameDirection ? 'copy_trading' : 'reverse_hedging',
            userAId: a.userId, userBId: b.userId,
            tradeAId: tradeA.id, tradeBId: tradeB.id,
            symbol: tradeA.symbol, timeGapSeconds,
          });
        }
      }
    }
  }
  return flags;
}

function trade(id, symbol, direction, openTime, volume) {
  return { id, symbol, direction, openTime: new Date(openTime).getTime(), volume };
}

console.log('\n=== Scenario 1: Real copy-trading match between two DIFFERENT traders ===');
console.log(detectCrossAccountCorrelations([
  { userId: 'user-A', accountLogin: '111', trades: [trade('t1', 'EURUSD', 'buy', '2026-01-01T09:00:00Z', 1.0)] },
  { userId: 'user-B', accountLogin: '222', trades: [trade('t2', 'EURUSD', 'buy', '2026-01-01T09:00:15Z', 1.0)] },
]));
console.log('(Expected: 1 copy_trading flag)');

console.log('\n=== Scenario 2: SAME trader, two of their own accounts — must NOT flag ===');
console.log(detectCrossAccountCorrelations([
  { userId: 'user-A', accountLogin: '111', trades: [trade('t1', 'EURUSD', 'buy', '2026-01-01T09:00:00Z', 1.0)] },
  { userId: 'user-A', accountLogin: '333', trades: [trade('t3', 'EURUSD', 'buy', '2026-01-01T09:00:15Z', 1.0)] },
]));
console.log('(Expected: empty array — same user is always allowed)');

console.log('\n=== Scenario 3: Two unrelated traders, same symbol, but hours apart — must NOT flag ===');
console.log(detectCrossAccountCorrelations([
  { userId: 'user-A', accountLogin: '111', trades: [trade('t1', 'EURUSD', 'buy', '2026-01-01T09:00:00Z', 1.0)] },
  { userId: 'user-B', accountLogin: '222', trades: [trade('t2', 'EURUSD', 'buy', '2026-01-01T14:00:00Z', 1.0)] },
]));
console.log('(Expected: empty array — timing too far apart)');

console.log('\n=== Scenario 4: Reverse hedging — opposite direction, matching timing/size ===');
console.log(detectCrossAccountCorrelations([
  { userId: 'user-A', accountLogin: '111', trades: [trade('t1', 'XAUUSD', 'buy', '2026-01-01T09:00:00Z', 2.0)] },
  { userId: 'user-B', accountLogin: '222', trades: [trade('t2', 'XAUUSD', 'sell', '2026-01-01T09:00:10Z', 2.0)] },
]));
console.log('(Expected: 1 reverse_hedging flag)');
