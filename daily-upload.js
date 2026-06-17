#!/usr/bin/env node
/**
 * BillsOnChain — Daily 50 Upload Scheduler
 *
 * Human-like behavior:
 *   - 3-8 min random delay between uploads
 *   - Occasional "break" (15-30 min) every 10-15 uploads
 *   - Active hours only (08:00-23:00 WIB)
 *   - After 50 uploads done → sleep until next day + random offset
 *   - State persisted to daily-state.json (resumable)
 *
 * Usage:
 *   node daily-upload.js                # Run daily scheduler (continuous)
 *   node daily-upload.js --once         # Upload 50 then exit (no loop)
 *   node daily-upload.js --status       # Show current state
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Import from run.js ─────────────────────────────────────────────────────
const { uploadBills, httpLogin, getUserStats, solveTurnstile } = require('./run.js');

const DIR = __dirname;
const STATE_FILE = path.join(DIR, 'daily-state.json');
const LOG_FILE = path.join(DIR, 'daily-upload.log');
const SESSIONS_FILE = path.join(DIR, 'sessions.json');
const ACCOUNT_FILE = path.join(DIR, 'account.txt');

// ─── Config ─────────────────────────────────────────────────────────────────
const DAILY_TARGET = 30;
const MIN_DELAY_MS = 3 * 60 * 1000;      // 3 min minimum
const MAX_DELAY_MS = 8 * 60 * 1000;      // 8 min maximum
const BREAK_EVERY_MIN = 10;               // break every 10-15 uploads
const BREAK_EVERY_MAX = 15;
const BREAK_MIN_MS = 15 * 60 * 1000;     // break 15-30 min
const BREAK_MAX_MS = 30 * 60 * 1000;
const ACTIVE_HOUR_START = 8;              // 08:00 WIB
const ACTIVE_HOUR_END = 23;              // 23:00 WIB
const NEXT_DAY_MIN_HOURS = 20;            // min hours until next cycle
const NEXT_DAY_MAX_HOURS = 26;            // max hours until next cycle

// Fingerprint pool (subset from run.js)
const FINGERPRINTS = [
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', secCh: '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"', platform: '"Windows"', lang: 'en-US,en;q=0.9' },
  { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', secCh: '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"', platform: '"macOS"', lang: 'en-US,en;q=0.9' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', secCh: '"Chromium";v="145", "Not.A/Brand";v="8", "Google Chrome";v="145"', platform: '"Windows"', lang: 'en-US,en;q=0.9' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', secCh: '"Chromium";v="147", "Not-A.Brand";v="24", "Google Chrome";v="147"', platform: '"Windows"', lang: 'en-US,en;q=0.9' },
  { ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', secCh: '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"', platform: '"Linux"', lang: 'en-US,en;q=0.9' },
];

let fpIdx = Math.floor(Math.random() * FINGERPRINTS.length);
function nextFp() { return FINGERPRINTS[fpIdx++ % FINGERPRINTS.length]; }

// ─── Helpers ────────────────────────────────────────────────────────────────
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randMs(minMs, maxMs) { return rand(minMs, maxMs); }
function fmt(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m ${s%60}s`;
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  return `${h}h ${m}m`;
}

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { date: null, uploaded: 0, failed: 0, lastUpload: null, nextRun: null };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getWIBHour() {
  return (new Date().getUTCHours() + 7) % 24;
}

function getWIBDate() {
  const wib = new Date(Date.now() + 7 * 3600 * 1000);
  return wib.toISOString().slice(0, 10);
}

function isWithinActiveHours() {
  const h = getWIBHour();
  return h >= ACTIVE_HOUR_START && h < ACTIVE_HOUR_END;
}

function msUntilActiveHours() {
  const h = getWIBHour();
  if (h >= ACTIVE_HOUR_START && h < ACTIVE_HOUR_END) return 0;
  let targetH = ACTIVE_HOUR_START;
  if (h >= ACTIVE_HOUR_END) targetH = ACTIVE_HOUR_START + 24;
  return ((targetH - h + 24) % 24) * 3600 * 1000 || 24 * 3600 * 1000;
}

// ─── Account management ─────────────────────────────────────────────────────
function loadAccounts() {
  if (!fs.existsSync(ACCOUNT_FILE)) return [];
  return fs.readFileSync(ACCOUNT_FILE, 'utf8').split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf(':');
      if (idx === -1) return null;
      return { email: l.slice(0, idx), password: l.slice(idx + 1) };
    })
    .filter(Boolean);
}

function loadSessions() {
  try { return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8')); } catch { return {}; }
}

function saveSessions(s) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(s, null, 2));
}

// ─── Upload one bill ─────────────────────────────────────────────────────────
async function uploadOneBill() {
  const accounts = loadAccounts();
  if (!accounts.length) throw new Error('No accounts in account.txt');

  // Pick random account
  const acct = accounts[rand(0, accounts.length - 1)];
  const fp = nextFp();

  // Login to get fresh session token
  log(`  🔑 Login: ${acct.email}`);
  const { sessionToken } = await httpLogin(acct.email, acct.password, fp, null);

  // Upload 1 bill
  const result = await uploadBills(sessionToken, fp, null, 1);

  if (result.success > 0) {
    return { success: true, email: acct.email };
  } else {
    return { success: false, email: acct.email, error: `0/${result.success + result.failed} uploaded` };
  }
}

// ─── Daily scheduler ────────────────────────────────────────────────────────
async function runDaily() {
  const state = loadState();
  const today = getWIBDate();

  // Reset if new day
  if (state.date !== today) {
    log(`📅 New day: ${today} (prev: ${state.date || 'none'})`);
    state.date = today;
    state.uploaded = 0;
    state.failed = 0;
    saveState(state);
  }

  // Already done?
  if (state.uploaded >= DAILY_TARGET) {
    log(`✅ Daily target reached (${state.uploaded}/${DAILY_TARGET}). Done for today.`);
    return 'done';
  }

  // Wait for active hours
  while (!isWithinActiveHours()) {
    const waitMs = msUntilActiveHours();
    log(`🌙 Outside active hours (WIB ${ACTIVE_HOUR_START}:00-${ACTIVE_HOUR_END}:00). Sleeping ${fmt(waitMs)}...`);
    await new Promise(r => setTimeout(r, Math.min(waitMs, 60 * 60 * 1000)));
  }

  const remaining = DAILY_TARGET - state.uploaded;
  const nextBreak = rand(BREAK_EVERY_MIN, BREAK_EVERY_MAX);
  log(`\n🚀 Daily uploads: ${state.uploaded}/${DAILY_TARGET} done, ${remaining} remaining`);
  log(`  ⏱  Delay: ${fmt(MIN_DELAY_MS)}-${fmt(MAX_DELAY_MS)} between uploads`);
  log(`  ☕ Break every ~${nextBreak} uploads (${fmt(BREAK_MIN_MS)}-${fmt(BREAK_MAX_MS)})`);

  let uploadsSinceBreak = 0;
  let breakTarget = nextBreak;

  for (let i = 0; i < remaining; i++) {
    if (!isWithinActiveHours()) {
      log(`🌙 Exited active hours. Pausing.`);
      saveState(state);
      return 'paused';
    }

    const num = state.uploaded + 1;
    log(`\n📤 [${num}/${DAILY_TARGET}] Uploading...`);

    try {
      const result = await uploadOneBill();
      if (result.success) {
        state.uploaded++;
        state.lastUpload = new Date().toISOString();
        log(`  ✅ Done (${result.email})`);
      } else {
        state.failed++;
        log(`  ❌ Failed: ${result.error}`);
      }
    } catch (err) {
      state.failed++;
      log(`  ❌ Error: ${err.message?.slice(0, 200)}`);
    }

    saveState(state);
    uploadsSinceBreak++;

    // Target reached?
    if (state.uploaded >= DAILY_TARGET) {
      log(`\n🎉 Daily target reached! ${state.uploaded}/${DAILY_TARGET} uploaded, ${state.failed} failed.`);
      return 'done';
    }

    // Break?
    if (uploadsSinceBreak >= breakTarget) {
      const breakMs = randMs(BREAK_MIN_MS, BREAK_MAX_MS);
      log(`  ☕ Break! ${fmt(breakMs)} (${uploadsSinceBreak} uploads since last break)`);
      await new Promise(r => setTimeout(r, breakMs));
      uploadsSinceBreak = 0;
      breakTarget = rand(BREAK_EVERY_MIN, BREAK_EVERY_MAX);
      log(`  ▶️  Resumed. Next break in ~${breakTarget} uploads.`);
    } else {
      const delay = randMs(MIN_DELAY_MS, MAX_DELAY_MS);
      log(`  ⏳ Next in ${fmt(delay)}...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  return 'done';
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--status')) {
    const state = loadState();
    const today = getWIBDate();
    const isActive = state.date === today && state.uploaded < DAILY_TARGET;
    console.log(`\n📊 BillsOnChain Daily Upload Status`);
    console.log(`  Date: ${state.date || 'none'}`);
    console.log(`  Uploaded: ${state.uploaded}/${DAILY_TARGET}`);
    console.log(`  Failed: ${state.failed}`);
    console.log(`  Last upload: ${state.lastUpload || 'never'}`);
    console.log(`  Next run: ${state.nextRun || 'now'}`);
    console.log(`  Active: ${isActive ? 'YES' : 'NO (new cycle)'}`);
    console.log(`  WIB Hour: ${getWIBHour()}:xx`);
    return;
  }

  const once = args.includes('--once');

  log(`\n${'═'.repeat(60)}`);
  log(`BillsOnChain Daily Upload Scheduler`);
  log(`Target: ${DAILY_TARGET}/day | Delay: ${fmt(MIN_DELAY_MS)}-${fmt(MAX_DELAY_MS)}`);
  log(`Active hours: ${ACTIVE_HOUR_START}:00-${ACTIVE_HOUR_END}:00 WIB`);
  log(`Mode: ${once ? 'single run' : 'continuous'}`);
  log(`${'═'.repeat(60)}\n`);

  if (once) {
    await runDaily();
    log('\n✅ Single run complete.');
    return;
  }

  // Continuous loop
  while (true) {
    const result = await runDaily();

    if (result === 'done') {
      const sleepHours = randMs(NEXT_DAY_MIN_HOURS * 3600 * 1000, NEXT_DAY_MAX_HOURS * 3600 * 1000);
      const nextRun = new Date(Date.now() + sleepHours);
      log(`\n😴 All done! Sleeping ${fmt(sleepHours)} until ~${nextRun.toISOString().replace('T', ' ').slice(0, 19)}`);

      const state = loadState();
      state.nextRun = nextRun.toISOString();
      saveState(state);

      let remaining = sleepHours;
      while (remaining > 0) {
        const chunk = Math.min(remaining, 60 * 60 * 1000);
        await new Promise(r => setTimeout(r, chunk));
        remaining -= chunk;
        if (remaining > 0) log(`  💤 ...${fmt(remaining)} remaining`);
      }
    } else if (result === 'paused') {
      const waitMs = msUntilActiveHours();
      log(`\n🌙 Paused. Waiting ${fmt(waitMs)} for active hours.`);
      await new Promise(r => setTimeout(r, waitMs));
    }

    log('\n🔄 New cycle...');
  }
}

main().catch(err => {
  log(`❌ Fatal: ${err.message}`);
  process.exit(1);
});
