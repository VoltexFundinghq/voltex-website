require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function confirmReset(login) {
  console.log(`Looking up account with login "${login}"...\n`);

  const { data: account, error: lookupError } = await supabase
    .from('trading_accounts')
    .select('*')
    .eq('login', login)
    .single();

  if (lookupError || !account) {
    console.error(`No account found with login "${login}".`);
    process.exit(1);
  }

  console.log(`Found account:`);
  console.log(`  ID:      ${account.id}`);
  console.log(`  Status:  ${account.status}`);
  console.log(`  Size:    ${account.account_size}`);
  console.log(`  Broker:  ${account.broker}\n`);

  if (account.status !== 'resetting') {
    console.warn(`WARNING: this account's status is "${account.status}", not "resetting".`);
    console.warn(`Confirming a reset on an account that isn't actually pending one may be a mistake.\n`);
  }

  const { error: rpcError } = await supabase.rpc('mark_account_available', {
    p_account_id: account.id,
  });

  if (rpcError) {
    console.error('Failed to confirm reset:', rpcError.message);
    process.exit(1);
  }

  console.log(`✓ Account "${login}" confirmed reset — status is now "available" and ready for reassignment.`);
}

const login = process.argv[2];
if (!login) {
  console.error('Usage: node scripts/confirm-account-reset.js <login>');
  console.error('Example: node scripts/confirm-account-reset.js 436886835');
  process.exit(1);
}

confirmReset(login).catch((err) => {
  console.error('Script crashed:', err);
  process.exit(1);
});
