require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

async function preview() {
  const { data: users } = await supabase.from('users').select('id, email').eq('is_admin', false);
  const { count: purchaseCount } = await supabase.from('challenge_purchases').select('*', { count: 'exact', head: true });
  const { count: challengeCount } = await supabase.from('user_challenges').select('*', { count: 'exact', head: true });
  const { data: usedAccounts } = await supabase.from('trading_accounts').select('login, status').neq('status', 'available');
  const { count: availableCount } = await supabase.from('trading_accounts').select('*', { count: 'exact', head: true }).eq('status', 'available');

  console.log('\n=== PRE-LAUNCH RESET — PREVIEW (nothing deleted yet) ===\n');
  console.log(`Non-admin accounts to delete: ${users?.length ?? 0}`);
  (users ?? []).forEach((u) => console.log(`  - ${u.email}`));
  console.log(`\nPurchases to delete: ${purchaseCount ?? 0}`);
  console.log(`Challenges to delete: ${challengeCount ?? 0}`);
  console.log(`\nTrading accounts to DELETE (have real history): ${usedAccounts?.length ?? 0}`);
  (usedAccounts ?? []).forEach((a) => console.log(`  - ${a.login} (${a.status})`));
  console.log(`\nTrading accounts to KEEP (genuinely untouched, status=available): ${availableCount ?? 0}`);
  console.log('\nKEPT UNTOUCHED: Personal Areas config, Platform Settings, VPS Machines, Admins.');
  console.log('Audit Logs will also be cleared — pre-launch exception, since nothing in them is real activity yet.\n');

  return { userIds: (users ?? []).map((u) => u.id) };
}

async function reset(userIds) {
  console.log('\nDeleting...');

  const { data: challenges } = await supabase.from('user_challenges').select('id, trading_account_id');
  const challengeIds = (challenges ?? []).map((c) => c.id);

  if (challengeIds.length > 0) {
    await supabase.from('recorded_trades').delete().in('user_challenge_id', challengeIds);
    await supabase.from('violation_reviews').delete().in('user_challenge_id', challengeIds);
  }

  const { data: reviews } = await supabase.from('manual_reviews').select('id');
  const reviewIds = (reviews ?? []).map((r) => r.id);
  if (reviewIds.length > 0) {
    await supabase.from('manual_review_notes').delete().in('review_id', reviewIds);
    await supabase.from('manual_review_events').delete().in('review_id', reviewIds);
    await supabase.from('manual_reviews').delete().in('id', reviewIds);
  }

  await supabase.from('payout_requests').delete().not('id', 'is', null);
  await supabase.from('terms_acceptances').delete().not('id', 'is', null);
  await supabase.from('notifications').delete().not('id', 'is', null);
  await supabase.from('challenge_purchases').delete().not('id', 'is', null);
  await supabase.from('user_challenges').delete().not('id', 'is', null);
  await supabase.from('correlation_flags').delete().not('id', 'is', null);

  await supabase.from('trading_accounts').delete().neq('status', 'available');
  await supabase.from('vps_slots').update({ current_user_challenge_id: null }).not('id', 'is', null);
  await supabase.from('audit_events').delete().not('id', 'is', null);

  for (const userId of userIds) {
    await supabase.from('users').delete().eq('id', userId);
    await supabase.auth.admin.deleteUser(userId);
  }

  console.log('\nDone. Personal Areas, Platform Settings, VPS Machines, and Admins were left untouched.');
  console.log('Remaining trading_accounts are all genuinely available, untouched inventory.\n');
}

async function main() {
  const { userIds } = await preview();
  const answer = await ask('Type RESET to permanently proceed, anything else to cancel: ');
  if (answer.trim() !== 'RESET') {
    console.log('Cancelled — nothing was deleted.');
    return;
  }
  await reset(userIds);
}

main().catch((err) => {
  console.error('Script crashed:', err);
  process.exit(1);
});
