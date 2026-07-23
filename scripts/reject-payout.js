require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function rejectPayout(accountLogin, reason) {
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

  const { data: pendingRequest, error: fetchError } = await supabase
    .from('payout_requests')
    .select('*')
    .eq('user_challenge_id', challenge.id)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !pendingRequest) {
    console.error('No pending payout request found for this account. Nothing to reject.', fetchError?.message);
    return;
  }

  const { error: updateError } = await supabase
    .from('payout_requests')
    .update({ status: 'rejected', processed_at: new Date().toISOString() })
    .eq('id', pendingRequest.id);

  if (updateError) {
    console.error('Failed to update payout request:', updateError.message);
    return;
  }

  // No balance reset is coming for a rejected payout, so we reset
  // eligibility directly here — otherwise it would stay stuck "true"
  // forever with no natural event to clear it.
  await supabase
    .from('user_challenges')
    .update({ payout_eligible: false })
    .eq('id', challenge.id);

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
        subject: 'Payout Request Update',
        html: `<div style="background:#0a0a0a;padding:32px;font-family:Arial,sans-serif;color:#fff;"><h2>Payout Request Update</h2><p>Your recent payout eligibility has been reviewed and was not approved at this time.${reason ? ` Reason: ${reason}` : ''} Please continue trading, and reach out to support if you have any questions.</p></div>`,
      }),
    });
    const result = await response.json();
    console.log('Rejection email sent:', result.id ? 'success' : result);
  }

  console.log(`Payout request rejected for account ${accountLogin}. Eligibility flag reset — trader can become eligible again on their next qualifying gain.`);
}

const [,, accountLogin, ...reasonParts] = process.argv;
const reason = reasonParts.join(' ');
if (!accountLogin) {
  console.error('Usage: node scripts/reject-payout.js <accountLogin> [reason text]');
  process.exit(1);
}

rejectPayout(accountLogin, reason).catch(console.error);
