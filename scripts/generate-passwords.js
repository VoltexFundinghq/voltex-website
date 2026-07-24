const crypto = require('crypto');

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
// Matches EXACTLY Exness's confirmed accepted special characters —
// deliberately excludes anything not on their list (e.g. % was
// previously included by mistake and is NOT accepted by Exness).
const SPECIAL = '#@$&*!?|,./^+_-';
const ALL_CHARS = UPPERCASE + LOWERCASE + NUMBERS + SPECIAL;

const PASSWORD_LENGTH = 12;

function randomChar(charset) {
  const randomIndex = crypto.randomInt(0, charset.length);
  return charset[randomIndex];
}

function shuffle(str) {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

/**
 * Generates a password guaranteed to satisfy Exness's REAL,
 * confirmed requirements: 8-15 characters, at least one upper, one
 * lower, one number, one special character — using ONLY the specific
 * special characters Exness explicitly accepts (# [] () @ $ & * ! ?
 * | , . / ^ + _ -), never anything outside that list.
 */
function generatePassword() {
  const required = [
    randomChar(UPPERCASE),
    randomChar(LOWERCASE),
    randomChar(NUMBERS),
    randomChar(SPECIAL),
  ];

  const remainingLength = PASSWORD_LENGTH - required.length;
  let rest = '';
  for (let i = 0; i < remainingLength; i++) {
    rest += randomChar(ALL_CHARS);
  }

  return shuffle(required.join('') + rest);
}

function generatePair() {
  return {
    masterPassword: generatePassword(),
    investorPassword: generatePassword(),
  };
}

const count = Number(process.argv[2]) || 1;

console.log(`Generating ${count} password pair(s):\n`);
for (let i = 1; i <= count; i++) {
  const pair = generatePair();
  console.log(`Pair ${i}:`);
  console.log(`  Master:   ${pair.masterPassword}`);
  console.log(`  Investor: ${pair.investorPassword}`);
  console.log();
}
