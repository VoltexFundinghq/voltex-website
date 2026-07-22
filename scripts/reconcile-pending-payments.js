require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PRICE_TO_ACCOUNT_SIZE = {
  8900: 200000,
  13900: 300000,
  22900: 500000,
  27900: 700000,
  34900: 800000,
};

function buildSignString(params) {
  const keys = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null && params[k] !== "").sort();
  return keys.map(k => `${k}=${String(params[k]).trim()}`).join('&');
}

function md5Uppercase(input) {
  return crypto.createHash('md5').update(input, 'utf8').digest('hex').toUpperCase();
}

const privateKey = crypto.createPrivateKey({
  key: Buffer.from(process.env.PALMPAY_PRIVATE_KEY, 'base64'),
  format: 'der',
  type: 'pkcs8',
});

async function queryPalmPay(orderId) {
  const body = {
    requestTime: Date.now(),
    version: "V2.0",
    nonceStr: crypto.randomBytes(16).toString('hex'),
    orderId,
  };
  const strA = buildSignString(body);
  const md5Str = md5Uppercase(strA);
  const signer = crypto.createSign('RSA-SHA1');
  signer.update(md5Str, 'utf8');
  const signature = signer.sign(privateKey, 'base64');

  const response = await fetch('https://open-gw-sandbox.palmpay-inc.com/api/v2/payment/merchant/order/queryStatus', {
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'CountryCode': 'NG',
      'Authorization': `Bearer ${process.env.PALMPAY_APP_ID}`,
      'Signature': signature,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return response.json();
}

async function sendCredentialsEmail(toEmail, challengeName, account) {
  const html = `
    <div style="background:#0a0a0a;padding:32px 16px;font-family:Arial,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#111;border:1px solid #D4AF3733;border-radius:16px;padding:32px;color:#fff;">
        <p style="color:#D4AF37;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">Voltex Funding</p>
        <h2 style="margin:0 0 12px;">Your Trading Account Is Ready</h2>
        <p style="color:#ccc;line-height:1.6;">Your ${challengeName} account has been set up. Here are your MT5 details:</p>
        <table style="width:100%;margin-top:16px;font-size:14px;color:#fff;">
          <tr><td style="padding:6px 0;color:#888;">Login</td><td style="padding:6px 0;text-align:right;">${account.login}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Password</td><td style="padding:6px 0;text-align:right;">${account.password}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Investor Password</td><td style="padding:6px 0;text-align:right;">${account.investor_password}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Server</td><td style="padding:6px 0;text-align:right;">${account.server}</td></tr>
          <tr><td style="padding:6px 0;color:#888;">Broker</td><td style="padding:6px 0;text-align:right;">${account.broker}</td></tr>
        </table>
        <p style="color:#ccc;line-height:1.6;margin-top:20px;">Download MT5 and log in with the details above to begin trading.</p>
      </div>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Voltex Funding <support@voltexfunding.com>',
      to: toEmail,
      subject: 'Your Voltex Funding MT5 Account Details',
      html,
    }),
  });
  return response.json();
}

async function reconcile() {
  const { data: pendingPurchases, error } = await supabase
    .from('challenge_purchases')
    .select('*')
    .eq('payment_status', 'pending');

  if (error) {
    console.error('Failed to fetch pending purchases:', error.message);
    process.exit(1);
  }

  console.log(`Found ${pendingPurchases.length} pending purchase(s) to check.\n`);

  for (const purchase of pendingPurchases) {
    console.log(`--- Checking ${purchase.payment_reference} ---`);
    const result = await queryPalmPay(purchase.payment_reference);

    if (result.respCode !== '00000000') {
      console.log(`  PalmPay query failed: ${result.respMsg} — skipping.`);
      continue;
    }

    if (result.data.orderStatus !== 2) {
      console.log(`  PalmPay shows orderStatus ${result.data.orderStatus} (not yet completed) — leaving as pending.`);
      continue;
    }

    console.log(`  PalmPay confirms this order is genuinely completed. Reconciling...`);

    const { data: updatedRows, error: updateError } = await supabase
      .from('challenge_purchases')
      .update({ payment_status: 'completed' })
      .eq('id', purchase.id)
      .neq('payment_status', 'completed')
      .select();

    if (updateError || !updatedRows || updatedRows.length === 0) {
      console.log(`  Update skipped or failed (already handled?):`, updateError?.message);
      continue;
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('email')
      .eq('id', purchase.user_id)
      .single();

    await supabase.from('notifications').insert({
      user_id: purchase.user_id,
      title: 'Payment Received',
      message: `We've received your payment of N${purchase.price_paid.toLocaleString()} for the ${purchase.challenge_size}.`,
      is_read: false,
    });
    await supabase.from('notifications').insert({
      user_id: purchase.user_id,
      title: 'Purchase Confirmed',
      message: `Your ${purchase.challenge_size} purchase is confirmed. Your challenge account will be set up shortly.`,
      is_read: false,
    });

    if (!purchase.challenge_config_id) {
      console.log(`  No challenge_config_id on this purchase — cannot auto-provision. Marked completed only.`);
      continue;
    }

    const accountSize = PRICE_TO_ACCOUNT_SIZE[Number(purchase.price_paid)];
    if (!accountSize) {
      console.log(`  Could not map price ${purchase.price_paid} to a known account size — skipping provisioning.`);
      continue;
    }

    const { data: userChallenge, error: createError } = await supabase
      .from('user_challenges')
      .insert({
        user_id: purchase.user_id,
        challenge_id: purchase.challenge_config_id,
        status: 'awaiting_allocation',
        profit_target: 10.00,
        drawdown_limit: 20.00,
        profit_split: 80.00,
      })
      .select()
      .single();

    if (createError || !userChallenge) {
      console.log(`  Failed to create user_challenge:`, createError?.message);
      continue;
    }

    const { data: allocation, error: allocError } = await supabase.rpc('allocate_trading_account', {
      p_user_challenge_id: userChallenge.id,
      p_account_size: accountSize,
    });

    if (allocError) {
      console.log(`  Allocation RPC failed:`, allocError.message);
    } else if (!allocation || allocation.length === 0) {
      console.log(`  No available ${accountSize} account right now — left as awaiting_allocation.`);
    } else {
      console.log(`  Successfully allocated account login ${allocation[0].login}.`);

      if (userRow?.email) {
        const emailResult = await sendCredentialsEmail(userRow.email, purchase.challenge_size, allocation[0]);
        console.log(`  Credentials email sent:`, emailResult.id ? 'success' : emailResult);
      } else {
        console.log(`  WARNING: no user email found — could not send credentials email.`);
      }
    }
  }

  console.log('\nReconciliation complete.');
}

reconcile().catch((err) => {
  console.error('Script crashed:', err);
  process.exit(1);
});
