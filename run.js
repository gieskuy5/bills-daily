#!/usr/bin/env node
/**
 * BillsOnChain — Unified Login + Upload Pipeline (Node.js)
 *
 * Flow per account:
 *   1. HTTP login (Capsolver Turnstile → API, cookie from Set-Cookie header)
 *   2. Save session → sessions.json
 *   3. Playwright + CloakBrowser upload (cookie inject, skip browser login)
 *   4. Random receipts each upload, 9 categories, real logos
 *
 * Usage:
 *   node run.js                     # All accounts, 3 uploads each
 *   node run.js --upload 10         # 10 receipts per account
 *   node run.js --count 5           # First 5 accounts
 *   node run.js --email user@x.com  # Specific account
 */

'use strict';

const fs = require('fs');
const path = require('path');
// execSync no longer needed — receipts are pure Node.js

// ─── Config ─────────────────────────────────────────────────────────────────
const DIR = __dirname;
const CFG = JSON.parse(fs.readFileSync(path.join(DIR, 'config.json'), 'utf8'));
const {
  api_base: API_BASE,
  site_url: SITE_URL,
  capsolver_key: CAPSOLVER_KEY,
  callback_url: CALLBACK
} = CFG;

const TURNSTILE_KEY = '0x4AAAAAADKR0bu1HvcUPYJ1';
const CLOAKBROWSER_BIN = '/home/ubuntu/.cloakbrowser/chromium-146.0.7680.177.5/chrome';
const SESSIONS_FILE = path.join(DIR, 'sessions.json');

// ─── CLI Args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? (isNaN(args[idx + 1]) ? args[idx + 1] : parseInt(args[idx + 1])) : def;
};

const OPT = {
  count: getArg('count', 999),
  upload: getArg('upload', 3),
  email: getArg('email', null),
  delayMin: getArg('delay-min', 5),
  delayMax: getArg('delay-max', 15),
  accountDelay: getArg('account-delay', 10),
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// ═══════════════════════════════════════════════════════════════════════════
// FINGERPRINT SYSTEM (10 rotating)
// ═══════════════════════════════════════════════════════════════════════════

const FINGERPRINTS = [
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', secCh: '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"', platform: '"Windows"', lang: 'en-US,en;q=0.9' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', secCh: '"Chromium";v="145", "Not.A/Brand";v="8", "Google Chrome";v="145"', platform: '"Windows"', lang: 'en-US,en;q=0.9' },
  { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', secCh: '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"', platform: '"macOS"', lang: 'en-US,en;q=0.9' },
  { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', secCh: '"Microsoft Edge";v="145", "Not.A/Brand";v="8", "Chromium";v="145"', platform: '"macOS"', lang: 'en-US,en;q=0.9' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0', secCh: '"Microsoft Edge";v="144", "Not.A/Brand";v="8", "Chromium";v="144"', platform: '"Windows"', lang: 'en-US,en;q=0.9' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', secCh: '"Chromium";v="146", "Google Chrome";v="146", "Not-A.Brand";v="99"', platform: '"Windows"', lang: 'en-GB,en;q=0.9' },
  { ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', secCh: '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"', platform: '"Linux"', lang: 'en-US,en;q=0.9' },
  { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', secCh: '"Chromium";v="143", "Not.A/Brand";v="24", "Google Chrome";v="143"', platform: '"macOS"', lang: 'en-AU,en;q=0.9' },
  { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', secCh: '"Chromium";v="147", "Not-A.Brand";v="24", "Google Chrome";v="147"', platform: '"Windows"', lang: 'en-US,en;q=0.9' },
  { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', secCh: '"Chromium";v="147", "Not-A.Brand";v="24", "Google Chrome";v="147"', platform: '"macOS"', lang: 'en-US,en;q=0.9' },
];

let fpIdx = 0;
function nextFp() { return FINGERPRINTS[fpIdx++ % FINGERPRINTS.length]; }

function buildHeaders(fp) {
  return {
    'Content-Type': 'application/json',
    'Origin': SITE_URL,
    'Referer': `${SITE_URL}/`,
    'User-Agent': fp.ua,
    'Accept': 'application/json',
    'Accept-Language': fp.lang,
    'sec-ch-ua': fp.secCh,
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': fp.platform,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PROXY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

function loadProxies() {
  const file = path.join(DIR, 'proxy.txt');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(parseProxy).filter(Boolean);
}

function parseProxy(raw) {
  let str = raw.trim();
  if (!str.includes('://')) str = 'http://' + str;
  try {
    const u = new URL(str);
    const protocol = u.protocol.replace(':', '').toLowerCase();
    return {
      type: protocol.startsWith('socks') ? protocol : 'http',
      server: str,
      host: u.hostname,
      port: parseInt(u.port) || (protocol.includes('socks') ? 1080 : 8080),
      username: u.username || null,
      password: u.password || null,
      label: `${protocol}://${u.hostname}:${u.port}`,
    };
  } catch { return null; }
}

let pxIdx = 0;
function nextProxy(proxies) {
  if (!proxies.length) return null;
  return proxies[pxIdx++ % proxies.length];
}

function proxyFetchOpts(proxy) {
  if (!proxy) return {};
  // For undici ProxyAgent or socks
  return { proxy };
}

// ═══════════════════════════════════════════════════════════════════════════
// CAPSOLVER TURNSTILE
// ═══════════════════════════════════════════════════════════════════════════

async function solveTurnstile() {
  console.log(`  🧩 Solving Turnstile...`);

  const createRes = await fetchJSON('https://api.capsolver.com/createTask', {
    clientKey: CAPSOLVER_KEY,
    task: {
      type: 'AntiTurnstileTaskProxyLess',
      websiteURL: `${SITE_URL}/login`,
      websiteKey: TURNSTILE_KEY,
      metadata: { action: '' }
    }
  });

  if (createRes.errorId !== 0) throw new Error(`Capsolver create: ${JSON.stringify(createRes)}`);
  const taskId = createRes.taskId;

  for (let i = 0; i < 60; i++) {
    await sleep(2000);
    const pollRes = await fetchJSON('https://api.capsolver.com/getTaskResult', {
      clientKey: CAPSOLVER_KEY, taskId
    });
    if (pollRes.errorId !== 0) throw new Error(`Capsolver poll: ${JSON.stringify(pollRes)}`);
    if (pollRes.status === 'ready') {
      const token = pollRes.solution.token;
      console.log(`  ✅ Turnstile solved (${token.length} chars)`);
      return token;
    }
  }
  throw new Error('Capsolver timeout (120s)');
}

async function fetchJSON(url, body, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.json();
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error(`Timeout (${timeout}ms)`);
    throw e;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HTTP LOGIN (cookie from Set-Cookie header)
// ═══════════════════════════════════════════════════════════════════════════

async function httpLogin(email, password, fp, proxy) {
  const headers = { ...buildHeaders(fp) };

  // Solve turnstile
  const turnstileToken = await solveTurnstile();
  headers['x-turnstile-token'] = turnstileToken;

  // Create dispatcher for proxy
  let dispatcher;
  if (proxy) {
    try {
      dispatcher = await createDispatcher(proxy);
    } catch (e) {
      console.log(`  ⚠️ Proxy setup failed: ${e.message}, using LOCAL`);
    }
  }

  // Sign in
  console.log(`  Signing in...`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  let res;
  try {
    res = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password, callbackURL: CALLBACK }),
      signal: controller.signal,
      redirect: 'manual',  // Don't follow redirect — we need Set-Cookie
      dispatcher,
    });
    clearTimeout(timer);
  } catch (e) {
    clearTimeout(timer);
    throw new Error(`Login request failed: ${e.message}`);
  }

  // Extract session token from Set-Cookie header
  let sessionToken = null;
  const setCookie = res.headers.get('set-cookie') || '';
  for (const part of setCookie.split(',')) {
    const match = part.match(/__Secure-better-auth\.session_token=([^;]+)/);
    if (match && match[1]) {
      sessionToken = decodeURIComponent(match[1].trim());
      break;
    }
  }

  if (!sessionToken) {
    // Check JSON body for error
    let data = {};
    try { data = await res.json(); } catch {}
    if (data.error) throw new Error(`Login failed: ${JSON.stringify(data.error)}`);
    throw new Error(`No session cookie. Status: ${res.status}`);
  }

  // Parse user info from JSON body
  let user = {};
  try {
    const data = await res.json();
    user = data.user || {};
  } catch {}

  console.log(`  Logged in! ${user.name || 'N/A'} | Ref: ${user.referralCode || 'N/A'}`);
  return { sessionToken, user };
}

// ═══════════════════════════════════════════════════════════════════════════
// GET STATS
// ═══════════════════════════════════════════════════════════════════════════

async function getUserStats(sessionToken, fp, dispatcher) {
  const headers = buildHeaders(fp);
  headers['Cookie'] = `__Secure-better-auth.session_token=${sessionToken}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${API_BASE}/api/user/stats`, {
      headers, signal: controller.signal, dispatcher,
    });
    clearTimeout(timer);
    const data = await res.json();
    if (data.ok && data.data) {
      const d = data.data;
      console.log(`  📊 Bills: ${d.totalBills || 0} | NFTs: ${d.nftsMinted || 0} | Rewards: $${d.rewardBalance || 0}`);
      return d;
    }
  } catch (e) {
    console.log(`  ⚠️ Stats failed: ${e.message}`);
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROXY DISPATCHER (undici + socks)
// ═══════════════════════════════════════════════════════════════════════════

async function createDispatcher(proxy) {
  if (!proxy) return undefined;
  if (proxy.type === 'http') {
    const { ProxyAgent } = require('undici');
    const url = proxy.username
      ? `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
      : `http://${proxy.host}:${proxy.port}`;
    return new ProxyAgent(url);
  }
  if (proxy.type === 'socks4' || proxy.type === 'socks5') {
    const { Agent } = require('undici');
    const { SocksClient } = require('socks');
    return new Agent({
      connect: async (opts, callback) => {
        try {
          const { socket } = await SocksClient.createConnection({
            proxy: {
              host: proxy.host, port: proxy.port,
              type: proxy.type === 'socks4' ? 4 : 5,
              userId: proxy.username || undefined,
              password: proxy.password || undefined,
            },
            destination: { host: opts.hostname, port: Number(opts.port) || 443 },
            command: 'connect',
          });
          callback(null, socket);
        } catch (err) { callback(err, null); }
      }
    });
  }
  return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// RECEIPT GENERATOR (pure Node.js)
// ═══════════════════════════════════════════════════════════════════════════

const { generateRandomReceipt: generateReceipt } = require('./receipts.js');

// ═══════════════════════════════════════════════════════════════════════════
// CLOAKBROWSER UPLOAD (Playwright + CloakBrowser binary)
// ═══════════════════════════════════════════════════════════════════════════

async function cloakUpload(sessionToken, fp, proxy, count) {
  const { chromium } = require('playwright-core');

  // Build Playwright proxy config
  let pwProxy = undefined;
  if (proxy) {
    pwProxy = { server: proxy.server };
    if (proxy.username) {
      pwProxy.username = proxy.username;
      pwProxy.password = proxy.password;
    }
  }

  // Launch CloakBrowser's stealth Chromium
  const browser = await chromium.launch({
    executablePath: CLOAKBROWSER_BIN,
    headless: true,
    args: [
      '--headless=new',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
    proxy: pwProxy,
  });

  const context = await browser.newContext({
    userAgent: fp.ua,
    locale: 'en-US',
    viewport: { width: 1366, height: 768 },
  });

  // Set session cookie (skip browser login)
  await context.addCookies([{
    name: '__Secure-better-auth.session_token',
    value: sessionToken,
    domain: '.billsonchain.io',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Lax',
  }]);

  // Set fingerprint headers
  await context.setExtraHTTPHeaders({
    'User-Agent': fp.ua,
    'Accept-Language': fp.lang,
    'sec-ch-ua': fp.secCh,
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': fp.platform,
  });

  const page = await context.newPage();

  // Verify login
  await page.goto(`${SITE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  if (page.url().includes('login')) {
    console.log('  ❌ Cookie invalid, not logged in!');
    await browser.close();
    return { success: 0, failed: count, categories: {} };
  }

  console.log(`  ✅ Browser session OK: ${page.url()}`);

  let success = 0, failed = 0;
  const catStats = {};

  for (let i = 0; i < count; i++) {
    // Generate receipt via Python
    let receipt;
    try {
      receipt = await generateReceipt();
    } catch (e) {
      console.log(`  [-] Receipt gen failed: ${e.message}`);
      failed++;
      continue;
    }

    const { filepath, size, category } = receipt;
    const filename = path.basename(filepath);
    console.log(`\n  --- [${i + 1}/${count}] [${category}] ---`);
    console.log(`    [1] PDF: ${filename} (${size} bytes)`);

    try {
      // Init upload (in-page fetch with cookies)
      const initResult = await page.evaluate(async ([filename, fileSize]) => {
        try {
          const r = await fetch('https://bocapi.billsonchain.io/api/bill/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ filename, contentType: 'application/pdf', fileSizeBytes: fileSize }),
          });
          return await r.json();
        } catch (e) { return { ok: false, error: { message: e.message } }; }
      }, [filename, size]);

      if (!initResult.ok) {
        console.log(`    [-] Init failed: ${JSON.stringify(initResult)}`);
        failed++;
        continue;
      }

      const billId = initResult.data.billId;
      const uploadUrl = initResult.data.uploadUrl;
      console.log(`    [2] Init OK: ${billId}`);

      // S3 upload (direct from Node.js)
      const pdfData = fs.readFileSync(filepath);
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: pdfData,
      });
      if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);
      console.log(`    [3] S3 upload OK`);

      // Confirm
      const confirmResult = await page.evaluate(async (billId) => {
        try {
          const r = await fetch(`https://bocapi.billsonchain.io/api/bill/${billId}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: null,
          });
          return await r.json();
        } catch (e) { return { ok: false, error: { message: e.message } }; }
      }, billId);

      if (confirmResult.ok) {
        const status = confirmResult.data?.status || 'unknown';
        console.log(`    [4] ✅ Confirmed! Status: ${status}`);
        success++;
        catStats[category] = (catStats[category] || 0) + 1;
      } else {
        console.log(`    [-] Confirm failed: ${JSON.stringify(confirmResult)}`);
        failed++;
      }

      // Cleanup temp file
      try { fs.unlinkSync(filepath); } catch {}

    } catch (e) {
      console.log(`    [-] Error: ${e.message}`);
      failed++;
    }

    // Delay between uploads
    if (i < count - 1) {
      const delay = randInt(OPT.delayMin, OPT.delayMax);
      console.log(`    [~] Waiting ${delay}s...`);
      await sleep(delay * 1000);
    }
  }

  await browser.close();
  return { success, failed, categories: catStats };
}

// ═══════════════════════════════════════════════════════════════════════════
// LOAD ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════

function loadAccounts() {
  const file = path.join(DIR, 'account.txt');
  if (!fs.existsSync(file)) {
    console.log('❌ account.txt not found');
    process.exit(1);
  }
  let accounts = fs.readFileSync(file, 'utf8').split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf(':');
      if (idx === -1) return null;  // skip lines without password
      return { email: l.slice(0, idx), password: l.slice(idx + 1) };
    })
    .filter(Boolean);

  if (OPT.email) accounts = accounts.filter(a => a.email === OPT.email);
  return accounts.slice(0, OPT.count);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const proxies = loadProxies();
  const accounts = loadAccounts();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  BillsOnChain — Login + Upload Pipeline (Node.js)`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Accounts:     ${accounts.length}`);
  console.log(`  Upload/acct:  ${OPT.upload}`);
  console.log(`  Proxies:      ${proxies.length || 'none (local)'}`);
  console.log(`  Fingerprints: ${FINGERPRINTS.length} rotating`);
  console.log(`${'═'.repeat(60)}\n`);

  const results = [];
  let totalSuccess = 0, totalFailed = 0;

  for (let i = 0; i < accounts.length; i++) {
    const { email, password } = accounts[i];
    const fp = nextFp();
    const proxy = nextProxy(proxies);

    console.log(`${'─'.repeat(60)}`);
    console.log(`[${i + 1}/${accounts.length}] ${email}`);
    console.log(`  UA: ${fp.ua.slice(0, 60)}...`);
    console.log(`  Proxy: ${proxy ? proxy.label : 'LOCAL'}`);

    const result = {
      email,
      fingerprint: fp.ua.slice(0, 50),
      proxy: proxy ? proxy.label : 'LOCAL',
      status: 'failed',
      token: null,
      user: null,
      stats: null,
      upload: { success: 0, failed: 0, categories: {} },
      error: null,
    };

    try {
      // Step 1: HTTP Login
      const { sessionToken, user } = await httpLogin(email, password, fp, proxy);
      result.token = sessionToken;
      result.user = user;
      result.status = 'success';

      // Step 2: Get stats
      let dispatcher;
      try { dispatcher = await createDispatcher(proxy); } catch {}
      const stats = await getUserStats(sessionToken, fp, dispatcher);
      result.stats = stats;

      // Step 3: Upload via CloakBrowser
      if (OPT.upload > 0) {
        console.log(`\n  📤 Uploading ${OPT.upload} receipt(s)...`);
        const uploadResult = await cloakUpload(sessionToken, fp, proxy, OPT.upload);
        result.upload = uploadResult;
        totalSuccess += uploadResult.success;
        totalFailed += uploadResult.failed;
      }

    } catch (e) {
      result.error = e.message?.slice(0, 300) || String(e);
      console.log(`  ❌ Error: ${result.error}`);
    }

    results.push(result);

    // Save incrementally
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(results, null, 2));

    // Delay between accounts
    if (i < accounts.length - 1) {
      const delay = randInt(OPT.accountDelay, OPT.accountDelay + 10);
      console.log(`\n  ⏳ Next account in ${delay}s...`);
      await sleep(delay * 1000);
    }
  }

  // Summary
  const ok = results.filter(r => r.status === 'success').length;
  const fail = results.filter(r => r.status === 'failed').length;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  📊 SUMMARY`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Accounts:  ${ok} success / ${fail} failed`);
  console.log(`  Uploads:   ${totalSuccess} success / ${totalFailed} failed`);
  console.log(`  Sessions:  ${SESSIONS_FILE}`);
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch(err => {
  console.error(`\n💥 Fatal: ${err.message}`);
  process.exit(1);
});
