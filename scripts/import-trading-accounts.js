require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importAccounts(csvPath) {
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Found ${records.length} account(s) in ${csvPath}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const [index, row] of records.entries()) {
    const { login, password, investor_password, server, broker, account_size, currency, pa_label } = row;

    if (!login || !password || !investor_password || !server || !broker || !account_size || !pa_label) {
      console.error(`Row ${index + 1}: SKIPPED — missing a required field (including pa_label). Row data:`, row);
      failCount++;
      continue;
    }

    const parsedSize = Number(account_size);
    if (isNaN(parsedSize) || parsedSize <= 0) {
      console.error(`Row ${index + 1}: SKIPPED — invalid account_size "${account_size}"`);
      failCount++;
      continue;
    }

    const { error } = await supabase.from('trading_accounts').insert({
      login: String(login),
      password: String(password),
      investor_password: String(investor_password),
      server: String(server),
      broker: String(broker),
      account_size: parsedSize,
      currency: currency ? String(currency) : 'NGN',
      pa_label: String(pa_label),
      status: 'available',
    });

    if (error) {
      console.error(`Row ${index + 1} (login ${login}): FAILED —`, error.message);
      failCount++;
    } else {
      console.log(`Row ${index + 1} (login ${login}, ${pa_label}): imported successfully`);
      successCount++;
    }
  }

  console.log(`\n=== Import complete: ${successCount} succeeded, ${failCount} failed/skipped ===`);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/import-trading-accounts.js path/to/accounts.csv');
  process.exit(1);
}

importAccounts(csvPath).catch((err) => {
  console.error('Import script crashed:', err);
  process.exit(1);
});
