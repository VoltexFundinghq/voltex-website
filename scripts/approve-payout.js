require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function approvePayout(accountLogin, amount) {
  const { data: challenge, error } = await supabase
    .from('user_challenges')
    .select('*')
    .eq('account_login', accountLogin)
    .eq('status', 'active')
    .eq('current_phase', 3)
    .single();

  if (error || !challenge) {
    console.error('Could not find an active funded challenge for this account:', error?.message);
    return;
  }

  if (!challenge.payout_eligible) {
    console.warn('WARNING: this account is not currently flagged payout_eligible — confirming anyway, since you know best, but double-check this is correct.');
  }

  const { error: insertError } = await supabase.from('payout_requests').insert({
    user_id: challenge.user_id,
    amount: amount,
    status: 'approved',
    processed_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error('Failed to record payout request:', insertError.message);
    return;
  }

  const { data: userRow } = await supabase.from('users').select('email').eq('id', challenge.user_id).single();

  if (userRow?.email) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Voltex Funding <support@voltexfunding.com>',
        to: userRow.email,
        subject: 'Payout Approved!',
        html: `<div style="background:#0a0a0a;padding:32px;font-family:Arial,sans-serif;color:#fff;"><h2>Payout Approved!</h2><p>Congratulations — your payout of N${Number(amount).toLocaleString()} has been approved. We'll process your withdrawal shortly, and reset your account balance so you can continue trading toward your next payout.</p></div>`,
      }),
    });
    const result = await response.json();
    console.log('Approval email sent:', result.id ? 'success' : result);
  }

  console.log(`Payout of N${amount.toLocaleString()} approved and recorded for account ${accountLogin}.`);
  console.log('Reminder: after processing the real withdrawal on Exness, our system will automatically detect the balance reset and notify the trader to continue trading.');
}

const [,, accountLogin, amount] = process.argv;
if (!accountLogin || !amount) {
  console.error('Usage: node scripts/approve-payout.js <accountLogin> <amount>');
  process.exit(1);
}

approvePayout(accountLogin, Number(amount)).catch(console.error);
