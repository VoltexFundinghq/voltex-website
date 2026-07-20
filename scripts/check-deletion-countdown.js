require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCountdown() {
  const { data: accounts, error } = await supabase
    .from('trading_accounts')
    .select('login, account_size, last_known_activity_at')
    .eq('status', 'resetting')
    .not('last_known_activity_at', 'is', null)
    .order('last_known_activity_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch accounts:', error.message);
    process.exit(1);
  }

  if (!accounts || accounts.length === 0) {
    console.log('No accounts currently retiring.');
    return;
  }

  console.log(`${accounts.length} account(s) awaiting Exness auto-deletion:\n`);

  for (const acc of accounts) {
    const lastActivity = new Date(acc.last_known_activity_at);
    const daysSince = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = 21 - daysSince;

    const status = daysRemaining <= 0
      ? '⚠️  likely already deleted by Exness'
      : `~${daysRemaining} day(s) remaining (estimate)`;

    console.log(`  Login ${acc.login} (${acc.account_size}) — ${status}`);
  }

  console.log('\nNote: these are estimates based on our own records, not a live');
  console.log('sync with Exness. Logging into a retired account does NOT reset');
  console.log('the real clock — only an actual trade being placed or closed does.');
  console.log('The main risk is a trader attempting to keep trading after failure.');
}

checkCountdown().catch((err) => {
  console.error('Script crashed:', err);
  process.exit(1);
});
