require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function summarize() {
  const { data: accounts, error } = await supabase
    .from('trading_accounts')
    .select('pa_label, status');

  if (error) {
    console.error('Failed to fetch accounts:', error.message);
    process.exit(1);
  }

  const byPa = {};
  for (const acc of accounts) {
    const label = acc.pa_label || 'UNLABELED';
    if (!byPa[label]) byPa[label] = { available: 0, reserved: 0, assigned: 0, resetting: 0, expired: 0, total: 0 };
    byPa[label][acc.status] = (byPa[label][acc.status] || 0) + 1;
    byPa[label].total += 1;
  }

  console.log('=== Inventory summary by Exness Personal Area ===\n');
  for (const [label, counts] of Object.entries(byPa)) {
    console.log(`${label}: ${counts.total}/100 MT5 demo slots used`);
    console.log(`  Available:  ${counts.available || 0}`);
    console.log(`  Assigned:   ${counts.assigned || 0}`);
    console.log(`  Resetting:  ${counts.resetting || 0} (pending Exness auto-deletion)`);
    console.log(`  Expired:    ${counts.expired || 0}`);
    console.log('');
  }
}

summarize().catch((err) => {
  console.error('Script crashed:', err);
  process.exit(1);
});
