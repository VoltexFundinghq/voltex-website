require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Matches the real, established pricing table — used only to map a
// purchase's known price back to its account size for allocation.
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

    const realStatus = result.data.orderStatus;

    if (realStatus !== 2) {
      console.log(`  PalmPay shows orderStatus ${realStatus} (not yet completed) — leaving as pending.`);
      continue;
    }

    console.log(`  PalmPay confirms this order is genuinely completed. Reconciling...`);

    // Same atomic guard the webhook itself uses — only proceed if we're
    // the one actually flipping it, protecting against any double-run.
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
    }
  }

  console.log('\nReconciliation complete.');
}

reconcile().catch((err) => {
  console.error('Script crashed:', err);
  process.exit(1);
});
