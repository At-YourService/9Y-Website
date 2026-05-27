#!/usr/bin/env node
/**
 * CLI test for the DevRev contact form integration.
 *
 * Usage — interactive prompts:
 *   node test-contact.js
 *
 * Usage — inline arguments (skip the prompts):
 *   node test-contact.js --name="John Doe" --email="john@example.com" --message="Hello!"
 *
 * Reads DEVREV_API_KEY and DEVREV_PART_ID from .env (same file as sendmail.php).
 */

import { readFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Colours ────────────────────────────────────────────────────────────────
const c = {
  green:  s => `\x1b[32m${s}\x1b[0m`,
  red:    s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  grey:   s => `\x1b[90m${s}\x1b[0m`,
};
const info = msg => console.log(c.cyan('  ℹ  ') + msg);
const ok   = msg => console.log(c.green('  ✔  ') + msg);
const warn = msg => console.log(c.yellow('  ⚠  ') + msg);
const fail = msg => console.log(c.red('  ✘  ') + msg);
const dim  = msg => console.log(c.grey(msg));

// ── Load .env ──────────────────────────────────────────────────────────────
const envPath = existsSync(resolve(__dirname, '.env'))
  ? resolve(__dirname, '.env')
  : resolve(__dirname, '../../.env');

if (!existsSync(envPath)) {
  fail('.env file not found. Copy .env.example to .env and fill in your keys.');
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const API_KEY = env['DEVREV_API_KEY'] ?? '';
const PART_ID = env['DEVREV_PART_ID'] ?? '';

if (!API_KEY) { fail('DEVREV_API_KEY is missing in .env'); process.exit(1); }
if (!PART_ID) { fail('DEVREV_PART_ID is missing in .env'); process.exit(1); }

ok('.env loaded');
dim(`   Key : ${API_KEY.slice(0, 12)}...`);
dim(`   Part: ${PART_ID}`);
console.log();

// ── Parse CLI args or prompt interactively ─────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)]; })
);

async function prompt(label, existing) {
  if (existing) return existing;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(c.cyan('  ?  ') + label + ': ', answer => {
      rl.close();
      if (!answer.trim()) { fail('Input cannot be empty.'); process.exit(1); }
      resolve(answer.trim());
    });
  });
}

const name    = await prompt('Name',    args.name);
const email   = await prompt('Email',   args.email);
const message = await prompt('Message', args.message);

// ── Validate ───────────────────────────────────────────────────────────────
console.log();
const errors = [];
if (name.length < 2 || name.length > 100)      errors.push('Name must be 2–100 characters.');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid e-mail address.');
if (message.length < 10 || message.length > 5000) errors.push('Message must be 10–5000 characters.');

if (errors.length) { errors.forEach(fail); process.exit(1); }

ok('Input valid');
dim(`   Name   : ${name}`);
dim(`   Email  : ${email}`);
dim(`   Message: ${message.slice(0, 60)}${message.length > 60 ? '…' : ''}`);
console.log();

// ── Helper: DevRev API call ────────────────────────────────────────────────
async function devrev(method, path, body) {
  const res = await fetch(`https://api.devrev.ai${path}`, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

// ── Step 1: Look up rev-user by e-mail ─────────────────────────────────────
info(`Looking up rev-user for ${email} …`);

const lookup = await devrev('GET', `/rev-users.list?email=${encodeURIComponent(email)}`);
dim(`   HTTP ${lookup.status}`);

let revUserId = null;
if (lookup.status === 200) {
  const users = lookup.body?.rev_users ?? [];
  revUserId = users[0]?.id ?? null;
  if (revUserId) {
    ok(`Rev-user found: ${users[0].display_name ?? revUserId}`);
    dim(`   ID: ${revUserId}`);
  } else {
    warn('No rev-user found for this email — ticket will be created without reported_by');
  }
} else {
  warn(`Unexpected response from rev-users.list (HTTP ${lookup.status}) — continuing without rev-user`);
  dim(`   ${JSON.stringify(lookup.body)}`);
}

console.log();

// ── Step 2: Create DevRev ticket ───────────────────────────────────────────
info('Creating DevRev ticket …');

const payload = {
  type:            'ticket',
  title:           `Contact form submission from ${name}`,
  body:            `${email}\n\n${name} wrote:\n\n${message}`,
  applies_to_part: PART_ID,
  ...(revUserId ? { reported_by: [revUserId] } : {}),
};

dim('   Payload: ' + JSON.stringify(payload, null, 2).replace(/\n/g, '\n   '));
console.log();

const ticket = await devrev('POST', '/works.create', payload);
dim(`   HTTP ${ticket.status}`);

if (ticket.status >= 200 && ticket.status < 300) {
  const work = ticket.body?.work ?? {};
  ok('Ticket created successfully!');
  dim(`   ID      : ${work.id         ?? '—'}`);
  dim(`   Display : ${work.display_id  ?? '—'}`);
  dim(`   Title   : ${work.title       ?? '—'}`);
} else {
  fail(`Ticket creation failed (HTTP ${ticket.status})`);
  dim('   Response: ' + JSON.stringify(ticket.body, null, 2));
  process.exit(1);
}

console.log();
