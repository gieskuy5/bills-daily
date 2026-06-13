# BillsOnChain — Login + Upload Pipeline

Automated bill upload pipeline for BillsOnChain. Full HTTP — login, captcha solving, receipt upload via pure `fetch()`. Zero browser dependency.

## Features

- **HTTP Login** — Turnstile solving (Capsolver / 2Captcha), session cookie extraction
- **Full HTTP Upload** — PDF receipt upload via `fetch()` with cookie auth, zero browser
- **9 Receipt Categories** — Food, Transport, Utilities, Healthcare, Entertainment, Shopping, Travel, Education, Subscriptions
- **32 Real Brand Logos** — Indomaret, Alfamart, Grab, Gojek, PLN, Netflix, etc.
- **Multi-Account** — Process multiple accounts from `account.txt`
- **Fingerprint Rotation** — 10 unique header fingerprints (Chrome/Edge, Win/Mac/Linux)
- **Proxy Support** — HTTP, SOCKS4, SOCKS5 with auto-fallback to local

## Setup

```bash
npm install
cp config.example.json config.json
cp account.example.txt account.txt
cp proxy.example.txt proxy.txt
# Edit config.json with your Capsolver API key
# Edit account.txt with your accounts (email:password)
```

## Usage

```bash
node run.js                     # All accounts, 3 uploads each
node run.js --upload 10         # 10 receipts per account
node run.js --count 5           # First 5 accounts
node run.js --email user@x.com  # Specific account
node run.js --delay-min 3 --delay-max 8  # Custom delay between uploads
```

## File Structure

```
├── run.js              Main pipeline (login + upload orchestration)
├── receipts.js         Receipt PDF generator (9 categories)
├── config.json         API config (gitignored)
├── account.txt         Account list (gitignored)
├── proxy.txt           Proxy list (gitignored)
├── sessions.json       Saved sessions (gitignored)
├── logos/              Real brand logos from Wikipedia
├── config.example.json Config template
├── account.example.txt Account template
└── proxy.example.txt   Proxy template
```

## Requirements

- Node.js 18+
- Capsolver or 2Captcha API key for Turnstile solving
