'use strict';

/**
 * Usage:
 *   node scripts/createAdmin.js
 *   node scripts/createAdmin.js --email admin@example.com --password secret123
 *   node scripts/createAdmin.js --email admin@example.com --password secret123 --firstName John --lastName Doe
 *
 * Creates an admin user directly in MongoDB. Skips the HTTP layer entirely.
 * Safe to run multiple times — each call creates a separate admin (emails must be unique).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const readline = require('readline');
const User = require('../models/User');

const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function promptPassword(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  process.stdout.write(question);
  return new Promise((resolve) => {
    let pw = '';
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function handler(ch) {
      if (ch === '\r' || ch === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', handler);
        process.stdout.write('\n');
        rl.close();
        resolve(pw);
      } else if (ch === '') {
        process.exit();
      } else if (ch === '') {
        pw = pw.slice(0, -1);
      } else {
        pw += ch;
      }
    });
  });
}

async function main() {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('ERROR: MONGODB_URI not set in .env');
    process.exit(1);
  }

  let email = get('--email');
  let password = get('--password');
  let firstName = get('--firstName') || 'IFOA';
  let lastName = get('--lastName') || 'Admin';

  if (!email) email = await prompt('Email: ');
  if (!password) {
    try {
      password = await promptPassword('Password (hidden): ');
    } catch {
      password = await prompt('Password: ');
    }
  }

  if (!email || !password) {
    console.error('ERROR: email and password required');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ERROR: password must be at least 8 characters');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error(`ERROR: user with email ${email} already exists`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const admin = await User.create({
    email: email.toLowerCase(),
    password,
    role: 'admin',
    firstName,
    lastName,
  });

  console.log(`Admin created: ${admin.email} (id: ${admin._id})`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
