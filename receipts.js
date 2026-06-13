#!/usr/bin/env node
/**
 * BillsOnChain — Receipt PDF Generator v3 (Node.js)
 * Style: Clean A4 professional document (Monese-style)
 * - A4 portrait, Helvetica throughout
 * - Clean horizontal line separators
 * - Two-column header (logo left, details right)
 * - Bold section titles
 * - Label left / Amount right alignment
 * - Transactions table with column headers
 * - Footer: company info left, contact right
 */

'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const LOGO_DIR = path.join(__dirname, 'logos');

// ─── Helpers ────────────────────────────────────────────────────────────────
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sample = (arr, k) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, k);
};
const rupiah = (n) => 'Rp' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const rupiahRaw = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const padR = (s, w) => String(s).padStart(w);

// Indonesian fake data
const FIRST_NAMES = ['Budi', 'Siti', 'Dewi', 'Ahmad', 'Rina', 'Joko', 'Ani', 'Hendra', 'Lestari', 'Rudi', 'Maya', 'Andi', 'Wati', 'Agus', 'Sari', 'Dian', 'Eko', 'Fitri', 'Gilang', 'Hana', 'Rizki', 'Nurul', 'Tono', 'Wawan', 'Lia'];
const LAST_NAMES = ['Santoso', 'Wijaya', 'Pratama', 'Sari', 'Putra', 'Putri', 'Kusuma', 'Halim', 'Gunawan', 'Lestari', 'Rahayu', 'Nugroho', 'Setiawan', 'Hidayat', 'Purnama', 'Susanto', 'Hartono', 'Saputra', 'Anggraini', 'Permana'];
const CITIES = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Semarang', 'Makassar', 'Yogyakarta', 'Denpasar', 'Malang', 'Bogor', 'Tangerang', 'Bekasi', 'Depok', 'Solo', 'Palembang'];
const STREETS = ['Jl. Sudirman', 'Jl. Thamrin', 'Jl. Gatot Subroto', 'Jl. Diponegoro', 'Jl. Asia Afrika', 'Jl. Pahlawan', 'Jl. Merdeka', 'Jl. Imam Bonjol', 'Jl. Hayam Wuruk', 'Jl. Gajah Mada'];
const CASHIERS = ['ANI', 'DEWI', 'RINA', 'SITI', 'BUDI', 'AGUS', 'Tono', 'Wati', 'LIA', 'SARI', 'EKO', 'HENDRA', 'MAYA', 'RUDI', 'ANDI'];

const fakeName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
const fakeCity = () => pick(CITIES);
const fakeStreet = () => `${pick(STREETS)} No.${randInt(1, 200)}`;
const fakePhone = () => `08${randInt(10, 99)}${randInt(1000000, 99999999)}`;
const fakeEmail = () => `${pick(FIRST_NAMES).toLowerCase()}${randInt(1, 999)}@gmail.com`;
const fakePlat = () => `B ${randInt(1000, 9999)} ${pick(['A', 'B', 'C', 'D', 'E', 'F'])}`;
const now = () => new Date();
const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
const fmtDateEn = (d) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};
const fmtDateTime = (d) => `${fmtDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
const fmtTime = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
const fmtMonthYear = (d) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};
const fmtPeriod = (d) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${months[first.getMonth()]} ${first.getDate()}, ${first.getFullYear()} – ${months[last.getMonth()]} ${last.getDate()}, ${last.getFullYear()}`;
};

// ─── Clean A4 PDF Builder (Monese-style) ───────────────────────────────────
class ReceiptPDF {
  constructor(opts = {}) {
    this.W = 595.28;  // A4 width
    this.H = 841.89;  // A4 height
    this.marginL = 50;
    this.marginR = 50;
    this.contentW = this.W - this.marginL - this.marginR;  // 495pt
    this.y = 40;
    this.doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: this.marginL, right: this.marginR },
    });
  }

  // ── Header: logo left, info right ──
  header(logoFile, companyName, companyDetails, recipientName, recipientAddr, accountInfo) {
    // Logo + company name (left)
    if (logoFile) {
      const fp = path.join(LOGO_DIR, logoFile);
      if (fs.existsSync(fp)) {
        this.doc.image(fp, this.marginL, this.y, { width: 80 });
      }
    }
    this.doc.font('Helvetica-Bold').fontSize(12).fillColor('#000');
    if (!logoFile) {
      this.doc.text(companyName, this.marginL, this.y);
    }

    // Recipient address (right side)
    const rightX = this.marginL + 300;
    this.doc.font('Helvetica').fontSize(9).fillColor('#000');
    if (recipientName) {
      this.doc.text(recipientName, rightX, this.y, { width: 200, align: 'left' });
      this.y += 12;
    }
    if (recipientAddr) {
      for (const line of recipientAddr) {
        this.doc.text(line, rightX, this.y, { width: 200, align: 'left' });
        this.y += 11;
      }
    }

    // Account info block (far right)
    if (accountInfo && accountInfo.length > 0) {
      let infoY = this.y + 5;
      for (const [label, value] of accountInfo) {
        this.doc.font('Helvetica').fontSize(8).fillColor('#666').text(label, rightX, infoY, { width: 200 });
        infoY += 10;
        this.doc.font('Helvetica-Bold').fontSize(9).fillColor('#000').text(value, rightX, infoY, { width: 200 });
        infoY += 14;
      }
    }

    this.y = Math.max(this.y, this.y + 30);
    this.y += 10;
  }

  // ── Title + period ──
  title(bigTitle, period) {
    this.doc.font('Helvetica-Bold').fontSize(18).fillColor('#000');
    this.doc.text(bigTitle, this.marginL, this.y, { width: this.contentW });
    this.y += 24;
    if (period) {
      this.doc.font('Helvetica').fontSize(10).fillColor('#000');
      this.doc.text(period, this.marginL, this.y, { width: this.contentW });
      this.y += 16;
    }
    this._hr();
    this.y += 5;
  }

  // ── Horizontal rule ──
  _hr(color = '#000', width = 0.5) {
    this.doc.save()
      .moveTo(this.marginL, this.y)
      .lineTo(this.W - this.marginR, this.y)
      .lineWidth(width)
      .strokeColor(color)
      .stroke()
      .restore();
  }

  // ── Balance summary: label left, amount right ──
  summaryTable(rows, closingRow) {
    // rows: [[label, amount], ...]
    for (const [label, amount] of rows) {
      this.doc.font('Helvetica').fontSize(10).fillColor('#000');
      this.doc.text(label, this.marginL, this.y, { width: 300 });
      this.doc.text(amount, this.marginL + 300, this.y, { width: this.contentW - 300, align: 'right' });
      this.y += 16;
      this._hr('#ccc', 0.5);
      this.y += 4;
    }
    // Closing row (bold)
    if (closingRow) {
      this.doc.font('Helvetica-Bold').fontSize(10).fillColor('#000');
      this.doc.text(closingRow[0], this.marginL, this.y, { width: 300 });
      this.doc.text(closingRow[1], this.marginL + 300, this.y, { width: this.contentW - 300, align: 'right' });
      this.y += 18;
    }
    this.y += 5;
  }

  // ── Transactions table ──
  transactionsTable(columns, rows, closingRow) {
    // Section title
    this.doc.font('Helvetica-Bold').fontSize(14).fillColor('#000');
    this.doc.text('Transactions', this.marginL, this.y, { width: this.contentW });
    this.y += 18;

    // Column positions: {name, x, width, align}
    const colX = [];
    let cx = this.marginL;
    for (const col of columns) {
      colX.push({ ...col, x: cx });
      cx += col.w;
    }

    // Top line
    this._hr('#000', 0.5);
    this.y += 6;

    // Header row
    for (const col of colX) {
      this.doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
      this.doc.text(col.name, col.x, this.y, { width: col.w - 5, align: col.align || 'left' });
    }
    this.y += 14;

    // Bottom line
    this._hr('#000', 0.5);
    this.y += 6;

    // Data rows
    for (const row of rows) {
      for (let i = 0; i < colX.length; i++) {
        const col = colX[i];
        const cell = row[i] || '';
        if (typeof cell === 'object' && cell.sub) {
          // Main text + sub text
          this.doc.font('Helvetica').fontSize(9).fillColor('#000');
          this.doc.text(cell.main, col.x, this.y, { width: col.w - 5, align: col.align || 'left' });
          this.doc.font('Helvetica').fontSize(7).fillColor('#666');
          this.doc.text(cell.sub, col.x, this.y + 11, { width: col.w - 5, align: col.align || 'left' });
        } else {
          const isNeg = String(cell).startsWith('-');
          this.doc.font('Helvetica').fontSize(9).fillColor(isNeg ? '#c00' : '#000');
          this.doc.text(String(cell), col.x, this.y, { width: col.w - 5, align: col.align || 'left' });
        }
      }
      this.y += (row.some(c => typeof c === 'object' && c.sub)) ? 26 : 16;
    }

    // Bottom line
    this._hr('#000', 0.5);
    this.y += 6;

    // Closing row
    if (closingRow) {
      for (let i = 0; i < colX.length; i++) {
        const col = colX[i];
        const val = closingRow[i] || '';
        this.doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
        this.doc.text(String(val), col.x, this.y, { width: col.w - 5, align: col.align || 'left' });
      }
      this.y += 16;
    }

    this.y += 5;
  }

  // ── Simple key-value list (alternative to table) ──
  detailSection(title, items) {
    this.doc.font('Helvetica-Bold').fontSize(14).fillColor('#000');
    this.doc.text(title, this.marginL, this.y, { width: this.contentW });
    this.y += 16;
    this._hr('#000', 0.5);
    this.y += 6;

    for (const item of items) {
      if (item === '---') {
        this.y += 2;
        this._hr('#ccc', 0.3);
        this.y += 4;
      } else if (Array.isArray(item)) {
        const [label, value, opts = {}] = item;
        const bold = opts.bold;
        const indent = opts.indent || 0;
        const fontSize = opts.size || 10;
        const color = opts.color || '#000';
        this.doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize).fillColor(color);
        this.doc.text(label, this.marginL + indent, this.y, { width: 300 - indent });
        if (value !== undefined && value !== '') {
          this.doc.text(String(value), this.marginL + 300, this.y, { width: this.contentW - 300, align: 'right' });
        }
        this.y += fontSize + 5;
      } else {
        // Section header
        this.doc.font('Helvetica-Bold').fontSize(10).fillColor('#000');
        this.doc.text(item, this.marginL, this.y, { width: this.contentW });
        this.y += 14;
      }
    }
    this.y += 3;
  }

  // ── Footer ──
  footer(leftLines, rightLines) {
    const footerY = this.H - 60;
    this._hr('#000', 0.5);

    this.doc.font('Helvetica').fontSize(7).fillColor('#000');
    let ly = footerY + 6;
    for (const line of leftLines) {
      this.doc.text(line, this.marginL, ly, { width: 240 });
      ly += 9;
    }

    let ry = footerY + 6;
    for (const line of rightLines) {
      this.doc.text(line, this.marginL + 300, ry, { width: this.contentW - 300, align: 'left' });
      ry += 9;
    }
  }

  toBuffer() {
    this.doc.end();
    return new Promise((resolve, reject) => {
      const chunks = [];
      this.doc.on('data', c => chunks.push(c));
      this.doc.on('end', () => resolve(Buffer.concat(chunks)));
      this.doc.on('error', reject);
    });
  }
}

// ─── Category Generators ────────────────────────────────────────────────────

function genFoodDining() {
  const stores = [
    { name: 'INDOMARET', logo: 'indomaret.png', company: 'PT Indomarco Prismatama', addr: ['Menara Indomaret Lt.8', 'Jl. Boulevard Barat Raya Blok G', 'Jakarta Utara 14240'], npwp: '01.337.994.6-092.000', phone: '(021) 2988 8899', svc: '0811 1500 280', storePrefix: 'IDM' },
    { name: 'ALFAMART', logo: 'alfamart.png', company: 'PT Sumber Alfaria Trijaya Tbk', addr: ['Alfamart Central Office', 'Jl. MH Thamrin No.9', 'Jakarta Pusat 10230'], npwp: '01.878.576.2-091.000', phone: '(021) 2960 8888', svc: '1500 959', storePrefix: 'ALF' },
    { name: 'HYPERMART', logo: 'hypermart.png', company: 'PT Matahari Putra Prima Tbk', addr: ['Hypermart Division', 'Jl. Boulevard Palem Raya', 'Tangerang 15810'], npwp: '01.337.994.6-052.000', phone: '(021) 5460 888', svc: '0800 188 8888', storePrefix: 'HPM' },
  ];
  const s = pick(stores);
  const d = now();
  const noNota = `${s.storePrefix}${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${randInt(100000, 999999)}`;
  const kasir = pick(CASHIERS);
  const nama = fakeName();

  const items = [
    ['INDOMIE GORENG 85G', 3200], ['AQUA 600ML', 3500], ['TEH BOTOL SOSRO 450ML', 6500],
    ['CHITATO SAPI 68G', 11500], ['SILVERQUEEN CHUNKY 100G', 22000], ['BIMOLI 2L', 38500],
    ['GULAKU 1KG', 17500], ['RINSO ANTI NODA 700G', 28500], ['LIFEBUOY BODY WASH 450ML', 24500],
    ['SUNLIGHT LIME 755ML', 14800], ['OREO VANILLA 137G', 9800], ['BEAR BRAND 189ML', 10500],
    ['NESCAFE CLASSIC 100G', 27500], ['ULTRA MILK STRAWBERRY 1L', 19500], ['BERAS ROJOLELE 5KG', 74500],
    ['POKKA GREEN TEA 500ML', 7200], ['COCA COLA 1.5L', 16500], ['PAMPERS M42', 54500],
    ['APEL FUJI 1KG', 38000], ['PISANG AMBON 1KG', 24500], ['MINYAK GORENG 2L', 29000],
    ['GULA PASIR 1KG', 15500], ['TELUR 1KG', 28000], ['SUSU DANCOW 400G', 32000],
    ['ROTI TAWAR GANDUM', 15000], ['KEJU KRAFT 165G', 23500], ['KOPI KAPAL API 165G', 14500],
  ];
  const selected = sample(items, randInt(5, 14));
  let subtotal = 0;
  let itemCount = 0;
  const txRows = [];
  for (const [name, basePrice] of selected) {
    const qty = randInt(1, 4);
    const price = basePrice + (Math.random() > 0.7 ? randInt(-500, 500) : 0);
    const lineTotal = price * qty;
    subtotal += lineTotal;
    itemCount += qty;
    txRows.push([name, `${qty}`, `${rupiahRaw(price)}`, `${rupiahRaw(lineTotal)}`, '']);
  }
  const ppn = Math.floor(subtotal * 0.11);
  const grandTotal = subtotal + ppn;
  const tunai = Math.ceil(grandTotal / 5000) * 5000 + randInt(0, 2) * 5000;
  const kembali = tunai - grandTotal;

  const pdf = new ReceiptPDF();
  // Header
  pdf.header(s.logo, s.company, s.addr.concat([`NPWP: ${s.npwp}`, `Telp: ${s.phone}`]),
    nama, [`${fakeStreet()}, ${fakeCity()}`],
    [['No. Nota', noNota], ['Tanggal', fmtDateTime(d)], ['Kasir', kasir]]
  );
  // Title
  pdf.title(`${s.name} — SALES RECEIPT`, fmtPeriod(d));

  // Items table
  pdf.transactionsTable(
    [
      { name: 'Item', w: 180, align: 'left' },
      { name: 'Qty', w: 40, align: 'center' },
      { name: 'Harga', w: 80, align: 'right' },
      { name: 'Total', w: 90, align: 'right' },
      { name: '', w: 105, align: 'left' },
    ],
    txRows,
    null
  );

  // Summary
  pdf.summaryTable(
    [
      ['Subtotal', `${rupiahRaw(subtotal)}`],
      [`PPN 11%`, `${rupiahRaw(ppn)}`],
      [`${itemCount} item(s)`, ''],
    ],
    ['TOTAL', `${rupiahRaw(grandTotal)}`]
  );

  // Payment
  pdf.detailSection('Payment', [
    ['Tunai', `${rupiahRaw(tunai)}`],
    ['Kembalian', `${rupiahRaw(kembali)}`],
    ['Metode', 'Tunai / Cash'],
    ['Status', 'LUNAS'],
  ]);

  // Footer
  pdf.footer(
    [s.company, ...s.addr, `NPWP: ${s.npwp}`],
    ['Terima kasih atas kunjungan Anda', `Layanan Konsumen: ${s.svc}`, `www.${s.name.toLowerCase()}.co.id`]
  );

  return pdf;
}

function genTransportGrab() {
  const d = now();
  const invoice = `GRB-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${randInt(10000000, 99999999)}`;
  const nama = fakeName();
  const driver = fakeName();
  const plat = fakePlat();
  const rating = pick([4.8, 4.9, 5.0, 4.7]);
  const layanan = pick(['GrabCar', 'GrabBike', 'GrabCar Premium']);
  const dari = `${pick(STREETS)} No.${randInt(1, 150)}, ${fakeCity()}`;
  const ke = `${pick(STREETS)} No.${randInt(1, 150)}, ${fakeCity()}`;
  const jarak = (Math.random() * 22 + 1.5).toFixed(1);
  const durasi = randInt(8, 65);
  const tarif = randInt(18000, 95000);
  const diskon = pick([0, 0, 0, randInt(3000, 15000)]);
  const biayaAplikasi = 2500;
  const asuransi = 1000;
  const total = tarif - diskon + biayaAplikasi + asuransi;
  const bayar = pick(['GrabPay', 'OVO', 'GoPay', 'Kartu Kredit']);

  const pdf = new ReceiptPDF();
  pdf.header('grab.png', 'PT Grab Teknologi Indonesia',
    ['Jakarta, Indonesia'],
    nama, [],
    [['No. Invoice', invoice], ['Tanggal', fmtDateTime(d)], ['Layanan', layanan]]
  );
  pdf.title('INVOICE', `${fmtDateEn(d)}`);

  // Trip details
  pdf.detailSection('Trip Details', [
    ['Dari', dari],
    ['Tujuan', ke],
    ['Jarak', `${jarak} km`],
    ['Durasi', `${durasi} menit`],
    '---',
    ['Driver', driver],
    ['Plat', plat],
    ['Rating', `${rating} ★`],
  ]);

  // Cost breakdown
  pdf.detailSection('Cost Breakdown', [
    ['Tarif Perjalanan', `${rupiahRaw(tarif)}`],
    ...(diskon > 0 ? [['Diskon Promo', `-${rupiahRaw(diskon)}`]] : []),
    ['Biaya Aplikasi', `${rupiahRaw(biayaAplikasi)}`],
    ['Asuransi Perjalanan', `${rupiahRaw(asuransi)}`],
  ]);

  pdf.summaryTable([], ['TOTAL', `${rupiahRaw(total)}`]);
  pdf.detailSection('Payment', [
    ['Metode', bayar],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer(
    ['PT Grab Teknologi Indonesia', 'Jakarta, Indonesia'],
    ['Bantuan: help.grab.com', '021-80-648-777', 'support@grab.com']
  );
  return pdf;
}

function genTransportGojek() {
  const d = now();
  const orderId = `GO-${randInt(10000000, 99999999)}`;
  const layanan = pick(['GoRide', 'GoCar', 'GoFood', 'GoSend']);
  const nama = fakeName();
  const driver = fakeName();
  const plat = fakePlat();
  const dari = `${pick(STREETS)}, ${fakeCity()}`;
  const ke = `${pick(STREETS)}, ${fakeCity()}`;
  const tarif = randInt(12000, 85000);
  const promo = pick([0, 0, 0, randInt(2000, 12000)]);
  const total = tarif - promo;
  const bayar = pick(['GoPay', 'GoPayLater', 'Tunai']);

  const pdf = new ReceiptPDF();
  pdf.header('gojek.png', 'PT Gojek Indonesia', ['GoTo Complex, Jakarta Selatan'],
    nama, [],
    [['Order ID', orderId], ['Tanggal', fmtDateTime(d)], ['Layanan', layanan]]
  );
  pdf.title('BUKTI PEMBAYARAN', fmtDateEn(d));

  pdf.detailSection('Trip Details', [
    ['Titik Jemput', dari],
    ['Tujuan', ke],
    '---',
    ['Driver', driver],
    ['Plat', plat],
  ]);

  pdf.detailSection('Cost Breakdown', [
    ['Tarif', `${rupiahRaw(tarif)}`],
    ...(promo > 0 ? [['Promo', `-${rupiahRaw(promo)}`]] : []),
  ]);

  pdf.summaryTable([], ['TOTAL', `${rupiahRaw(total)}`]);
  pdf.detailSection('Payment', [
    ['Metode', bayar],
    ['Status', 'Berhasil'],
  ]);

  pdf.footer(
    ['PT Gojek Indonesia', 'GoTo Complex, Jakarta Selatan'],
    ['Gojek — Pasti Ada Jalan', 'Bantuan: gojek.com/help', 'support@gojek.com']
  );
  return pdf;
}

function genTransportToll() {
  const d = now();
  const masuk = pick(['Cikampek', 'Cikunir', 'Pondok Ranji', 'Bintaro', 'Serpong']);
  const keluar = pick(['Halim', 'Cawang', 'Tebet', 'Kuningan', 'Casablanca', 'Semanggi']);
  const gol = pick(['I', 'I', 'I', 'II', 'II', 'III']);
  const tarif = pick([5000, 6500, 8000, 9500, 11000, 12500, 15000, 18000]);
  const noTrx = `TL${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${randInt(100000, 999999)}`;
  const waktuMasuk = new Date(d.getTime() - randInt(5, 45) * 60000);
  const noKartu = `${randInt(4000, 9999)} ${randInt(1000, 9999)} ${randInt(1000, 9999)} ${randInt(1000, 9999)}`;
  const kartu = pick(['e-Money Mandiri', 'Flazz BCA', 'Brizzi BRI', 'TapCash BNI']);

  const pdf = new ReceiptPDF();
  pdf.header(null, 'PT Jasa Marga (Persero) Tbk',
    ['Jl. Meruya Selatan No.17, Jakarta Barat', 'NPWP: 01.001.680.4-092.000'],
    null, [],
    [['No. Transaksi', noTrx], ['Tanggal', fmtDate(d)]]
  );
  pdf.title('STRUK PEMBAYARAN TOL', 'Gerbang Tol Elektronik');

  pdf.detailSection('Route Details', [
    ['Gerbang Masuk', `GT ${masuk}`],
    ['Waktu Masuk', fmtDateTime(waktuMasuk)],
    ['Gerbang Keluar', `GT ${keluar}`],
    ['Waktu Keluar', fmtDateTime(d)],
    ['Golongan', gol],
  ]);

  pdf.detailSection('Payment', [
    ['No. Kartu', noKartu],
    ['Jenis', kartu],
    ['Tarif TOL', `${rupiahRaw(tarif)}`],
    ['Saldo Akhir', `${rupiahRaw(randInt(20000, 200000))}`],
  ]);

  pdf.summaryTable([], ['TOTAL', `${rupiahRaw(tarif)}`]);

  pdf.footer(
    ['PT Jasa Marga (Persero) Tbk', 'Jl. Meruya Selatan No.17, Jakarta Barat'],
    ['Melayani Negeri', 'www.jasamarga.com', '14045']
  );
  return pdf;
}

function genTransportParking() {
  const d = now();
  const masuk = new Date(d.getTime() - randInt(1, 6) * 3600000);
  const mall = pick(['Mal Taman Anggrek', 'Pluit Village', 'Central Park Mall', 'Summarecon Mall Serpong', 'AEON Mall JGC', 'Mall Kelapa Gading', 'Pondok Indah Mall']);
  const plat = fakePlat();
  const noTiket = `PK${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${randInt(10000, 99999)}`;
  const durasiJam = Math.ceil((d - masuk) / 3600000);
  const tarifPerJam = pick([4000, 5000, 6000]);
  const tarif = Math.min(durasiJam * tarifPerJam, 30000);

  const pdf = new ReceiptPDF();
  pdf.header(null, mall, [`Area Parkir ${pick(['B1', 'B2', 'P1', 'P2', 'L1', 'L2', 'LG'])}`],
    null, [],
    [['No. Tiket', noTiket], ['Tanggal', fmtDate(d)]]
  );
  pdf.title('TIKET PARKIR', '');

  pdf.detailSection('Details', [
    ['Plat Nomor', plat],
    ['Masuk', fmtDateTime(masuk)],
    ['Keluar', fmtDateTime(d)],
    ['Durasi', `${durasiJam} jam`],
    '---',
    ['Tarif per jam', `${rupiahRaw(tarifPerJam)}`],
  ]);

  pdf.summaryTable([], ['TOTAL PARKIR', `${rupiahRaw(tarif)}`]);
  pdf.detailSection('Payment', [
    ['Metode', 'Tunai / E-Money'],
  ]);

  pdf.footer(
    [mall, ''],
    ['Tiket ini harus disimpan', 'Hilang tiket dikenakan denda Rp50.000']
  );
  return pdf;
}

function genTransport() { return pick([genTransportGrab, genTransportGojek, genTransportToll, genTransportParking])(); }

function genUtilPLN() {
  const d = now();
  const noRek = `${randInt(10000000000, 99999999999)}`;
  const nama = fakeName();
  const alamat = `${fakeStreet()}, ${fakeCity()}`;
  const daya = pick([1300, 2200, 2200, 3500, 4400, 5500]);
  const tarifPerKwh = daya <= 2200 ? 1444 : 1699;
  const pemakaian = randInt(60, 380);
  const standAwal = randInt(10000, 50000);
  const standAkhir = standAwal + pemakaian;
  const total = pemakaian * tarifPerKwh;
  const biayaAdmin = 2500;
  const denda = pick([0, 0, 0, 0, randInt(5000, 25000)]);
  const grandTotal = total + biayaAdmin + denda;
  const noTrx = `PLN${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;
  const bulan = fmtMonthYear(new Date(d.getFullYear(), d.getMonth() - 1, 1));

  const pdf = new ReceiptPDF();
  pdf.header('pln.png', 'PT PLN (Persero)', ['Unit Pelayanan Listrik', fakeCity()],
    nama, [alamat],
    [['ID Pelanggan', noRek], ['No. Transaksi', noTrx], ['Tanggal Bayar', fmtDateTime(d)]]
  );
  pdf.title('BUKTI PEMBAYARAN REKENING LISTRIK', `Periode: ${bulan}`);

  pdf.detailSection('Customer Details', [
    ['Nama', nama],
    ['Alamat', alamat],
    ['Daya', `${daya} VA`],
    ['Tarif', `R${daya <= 2200 ? '1' : '2'}`],
  ]);

  pdf.detailSection('Usage Details', [
    ['Stand Meter Awal', standAwal.toString()],
    ['Stand Meter Akhir', standAkhir.toString()],
    ['Pemakaian', `${pemakaian} kWh`],
    ['Tarif per kWh', `${rupiahRaw(tarifPerKwh)}`],
    ['Biaya Listrik', `${rupiahRaw(total)}`],
    ...(denda > 0 ? [['Denda Keterlambatan', `${rupiahRaw(denda)}`]] : []),
    ['Biaya Administrasi', `${rupiahRaw(biayaAdmin)}`],
  ]);

  pdf.summaryTable([], ['TOTAL TAGIHAN', `${rupiahRaw(grandTotal)}`]);
  pdf.detailSection('Payment', [
    ['Status', 'LUNAS'],
    ['Kasir', `PLN-${pick(CASHIERS)}`],
  ]);

  pdf.footer(
    ['PT PLN (Persero)', 'Unit Pelayanan Listrik', fakeCity()],
    ['Bayar tepat waktu hindari denda', 'www.pln.co.id', '123']
  );
  return pdf;
}

function genUtilInternet() {
  const d = now();
  const providers = [
    { name: 'INDIHOME', company: 'PT Telkom Indonesia (Persero) Tbk', logo: 'indihome.png', addr: 'Jl. Japati No.1, Bandung', npwp: '01.000.398.5-091.000' },
    { name: 'BIZNET', company: 'PT Biznet Networks', logo: 'biznet.png', addr: 'Gedung Biznet, Jakarta Selatan', npwp: '02.186.436.2-091.000' },
  ];
  const p = pick(providers);
  const noPelanggan = `${randInt(10000000, 99999999)}`;
  const nama = fakeName();
  const paket = pick(['50 Mbps', '100 Mbps', '150 Mbps', '200 Mbps', '300 Mbps']);
  const harga = pick([275000, 320000, 380000, 450000, 575000, 750000]);
  const ppn = Math.floor(harga * 0.11);
  const biayaAdmin = 5000;
  const total = harga + ppn + biayaAdmin;
  const bulan = fmtMonthYear(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const noTrx = `INV${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;
  const jatuhTempo = new Date(d.getFullYear(), d.getMonth(), randInt(10, 20));

  const pdf = new ReceiptPDF();
  pdf.header(p.logo, p.company, [p.addr, `NPWP: ${p.npwp}`],
    nama, [`${fakeStreet()}, ${fakeCity()}`],
    [['No. Pelanggan', noPelanggan], ['No. Invoice', noTrx], ['Jatuh Tempo', fmtDate(jatuhTempo)]]
  );
  pdf.title(`TAGIHAN INTERNET ${p.name}`, `Periode: ${bulan}`);

  pdf.detailSection('Subscription Details', [
    ['Paket', `${p.name} ${paket}`],
    ['Langganan', `${rupiahRaw(harga)}`],
    ['PPN 11%', `${rupiahRaw(ppn)}`],
    ['Biaya Admin', `${rupiahRaw(biayaAdmin)}`],
  ]);

  pdf.summaryTable([], ['TOTAL TAGIHAN', `${rupiahRaw(total)}`]);
  pdf.detailSection('Payment', [
    ['Status', 'LUNAS'],
    ['Pembayaran', pick(['Auto-Debit BCA', 'Virtual Account', 'Transfer'])],
  ]);

  pdf.footer(
    [p.company, p.addr, `NPWP: ${p.npwp}`],
    ['Layanan Pelanggan: 147', `www.${p.name.toLowerCase()}.co.id`]
  );
  return pdf;
}

function genUtilPulsa() {
  const d = now();
  const operators = [
    { name: 'Telkomsel', logo: 'telkomsel.png', prefix: ['0811', '0812', '0813', '0821', '0822', '0852'] },
    { name: 'Indosat', logo: 'indosat.png', prefix: ['0814', '0815', '0816', '0855', '0856'] },
    { name: 'XL Axiata', logo: 'xl_axiata.png', prefix: ['0817', '0818', '0819', '0859', '0877', '0878'] },
  ];
  const op = pick(operators);
  const noHP = `${pick(op.prefix)}${randInt(10000000, 99999999)}`;
  const produk = pick([
    ['Pulsa Rp50.000', 52000], ['Pulsa Rp100.000', 102000], ['Pulsa Rp200.000', 202000],
    ['Paket Data 15GB/30hr', 55000], ['Paket Data 30GB/30hr', 80000], ['Paket Data 50GB/30hr', 120000],
  ]);
  const [namaProduk, harga] = produk;
  const noTrx = `TRX${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${randInt(1000000, 9999999)}`;
  const sn = `${randInt(100000000000, 999999999999)}`;

  const pdf = new ReceiptPDF();
  pdf.header(op.logo, `PT ${op.name} Indonesia`, [],
    null, [],
    [['No. Transaksi', noTrx], ['Tanggal', fmtDateTime(d)]]
  );
  pdf.title('BUKTI PEMBELIAN PULSA / PAKET', '');

  pdf.detailSection('Purchase Details', [
    ['Nomor', noHP],
    ['Operator', op.name],
    ['Produk', namaProduk],
    ['S/N', sn],
  ]);

  pdf.summaryTable([], ['HARGA', `${rupiahRaw(harga)}`]);
  pdf.detailSection('Payment', [
    ['Metode', pick(['Tunai', 'OVO', 'GoPay', 'DANA'])],
    ['Status', 'BERHASIL'],
  ]);

  pdf.footer(
    [`PT ${op.name} Indonesia`, ''],
    ['Simpan struk ini sebagai bukti pembelian', `Layanan: ${op.name} 188`]
  );
  return pdf;
}

function genUtilPDAM() {
  const d = now();
  const pdam = pick(['PDAM Jaya', 'PDAM Tirta Patriot', 'PDAM Tirta Kerta Raharja', 'PDAM Surya Sembada']);
  const noPel = `${randInt(1000000000, 9999999999)}`;
  const nama = fakeName();
  const gol = pick(['R-1', 'R-2', 'R-3']);
  const standAwal = randInt(100, 5000);
  const pemakaian = randInt(10, 80);
  const standAkhir = standAwal + pemakaian;
  const tarifPerM3 = pick([3500, 4200, 5800, 7500]);
  const total = pemakaian * tarifPerM3;
  const biayaAdmin = 2500;
  const denda = pick([0, 0, 0, randInt(5000, 20000)]);
  const grandTotal = total + biayaAdmin + denda;
  const bulan = fmtMonthYear(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const noTrx = `PDAM${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;

  const pdf = new ReceiptPDF();
  pdf.header(null, pdam.toUpperCase(), ['Perusahaan Daerah Air Minum', fakeCity()],
    nama, [`${fakeStreet()}, ${fakeCity()}`],
    [['No. Pelanggan', noPel], ['No. Transaksi', noTrx], ['Tanggal', fmtDateTime(d)]]
  );
  pdf.title('BUKTI PEMBAYARAN AIR BERSIH', `Periode: ${bulan}`);

  pdf.detailSection('Customer Details', [
    ['Nama', nama],
    ['Golongan', gol],
  ]);

  pdf.detailSection('Usage Details', [
    ['Stand Meter Awal', standAwal.toString()],
    ['Stand Meter Akhir', standAkhir.toString()],
    ['Pemakaian', `${pemakaian} m³`],
    ['Tarif per m³', `${rupiahRaw(tarifPerM3)}`],
    ['Biaya Air', `${rupiahRaw(total)}`],
    ...(denda > 0 ? [['Denda', `${rupiahRaw(denda)}`]] : []),
    ['Biaya Admin', `${rupiahRaw(biayaAdmin)}`],
  ]);

  pdf.summaryTable([], ['TOTAL TAGIHAN', `${rupiahRaw(grandTotal)}`]);
  pdf.detailSection('Payment', [
    ['Status', 'LUNAS'],
  ]);

  pdf.footer(
    [pdam.toUpperCase(), 'Perusahaan Daerah Air Minum', fakeCity()],
    ['Hemat air untuk masa depan', 'www.pdam.co.id']
  );
  return pdf;
}

function genUtilities() { return pick([genUtilPLN, genUtilInternet, genUtilPulsa, genUtilPDAM])(); }

function genHealthApotek() {
  const d = now();
  const apoteks = [
    { name: 'APOTEK KIMIA FARMA', company: 'PT Kimia Farma Tbk', logo: 'kimia_farma.png', npwp: '01.001.608.5-091.000' },
    { name: 'APOTEK GUARDIAN', company: 'PT Hero Pharmaco Indonesia', logo: 'guardian.png', npwp: '01.735.775.1-091.000' },
    { name: 'CENTURY PHARMACY', company: 'PT Century Healthcare', logo: null, npwp: '01.894.435.7-091.000' },
  ];
  const a = pick(apoteks);
  const noNota = `FA${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;
  const nama = fakeName();
  const apoteker = `${pick(FIRST_NAMES)} ${pick(['S.Farm', 'Apt.', 'S.Kom'])}`;

  const obat = [
    ['AMOXICILLIN 500MG', '10 Kaplet', 15000], ['PARACETAMOL 500MG', '10 Tablet', 8000],
    ['BODREX TAB', '4 Tablet', 6500], ['ANTANGIN JRG CAIR', '5 Sachet', 7500],
    ['VIT-C 1000MG EFFERVESCENT', '10 Tablet', 25000], ['OMEPRAZOLE 20MG', '10 Kaplet', 18000],
    ['CETIRIZINE 10MG', '10 Tablet', 14000], ['INSTO EYE DROP 7.5ML', '1 Botol', 16000],
    ['BETADINE 15ML', '1 Botol', 19500], ['MIXAGRIPLU TAB', '4 Tablet', 18000],
    ['PANADOL EXTRA', '10 Kaplet', 22000], ['SALONPAS HOT 10S', '1 Pak', 32000],
  ];
  const selected = sample(obat, randInt(2, 7));
  const txRows = [];
  let subtotal = 0;
  for (const [nm, kemasan, harga] of selected) {
    const qty = randInt(1, 3);
    const lp = harga * qty;
    subtotal += lp;
    txRows.push([nm, `${qty}`, kemasan, `${rupiahRaw(harga)}`, `${rupiahRaw(lp)}`]);
  }

  const pdf = new ReceiptPDF();
  pdf.header(a.logo, a.name, [a.company, `${fakeStreet()}, ${fakeCity()}`, `NPWP: ${a.npwp}`],
    nama, [],
    [['No. Nota', noNota], ['Tanggal', fmtDateTime(d)], ['Apoteker', apoteker]]
  );
  pdf.title('NOTA APOTEK', '');

  pdf.transactionsTable(
    [
      { name: 'Obat', w: 150, align: 'left' },
      { name: 'Qty', w: 35, align: 'center' },
      { name: 'Kemasan', w: 80, align: 'left' },
      { name: 'Harga', w: 70, align: 'right' },
      { name: 'Total', w: 80, align: 'right' },
    ],
    txRows,
    ['', '', '', 'TOTAL', `${rupiahRaw(subtotal)}`]
  );

  pdf.summaryTable([], ['TOTAL', `${rupiahRaw(subtotal)}`]);
  pdf.detailSection('Payment', [
    ['Metode', pick(['Tunai', 'Debit BCA', 'GoPay', 'OVO'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer(
    [a.company, `${fakeStreet()}, ${fakeCity()}`, `NPWP: ${a.npwp}`],
    ['Obat yang sudah dibeli tidak dapat dikembalikan', 'Simpan nota untuk klaim asuransi']
  );
  return pdf;
}

function genHealthKlinik() {
  const d = now();
  const klinik = pick(['Klinik Mitra Keluarga', 'Klinik Utama', 'Rumah Sakit Hermina', 'Klinik Pratama Medika']);
  const nama = fakeName();
  const dokter = `dr. ${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}, ${pick(['Sp.PD', 'Sp.A', 'Sp.OG', 'Umum'])}`;
  const noReg = `REG${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(10000, 99999)}`;
  const layanan = pick([
    ['Konsultasi Dokter Umum', 150000], ['Konsultasi Dokter Spesialis', 300000],
    ['Pemeriksaan Lab', 185000], ['USG', 350000], ['Rontgen', 250000],
  ]);
  const obat = pick([null, ['Obat Racikan', randInt(50000, 200000)]]);
  const total = layanan[1] + (obat ? obat[1] : 0);

  const pdf = new ReceiptPDF();
  pdf.header(null, klinik, [`${fakeStreet()}, ${fakeCity()}`, `Telp: ${fakePhone()}`],
    nama, [],
    [['No. Registrasi', noReg], ['Tanggal', fmtDateTime(d)], ['Dokter', dokter]]
  );
  pdf.title('KUITANSI PEMBAYARAN', '');

  pdf.detailSection('Rincian Biaya', [
    [layanan[0], `${rupiahRaw(layanan[1])}`],
    ...(obat ? [[obat[0], `${rupiahRaw(obat[1])}`]] : []),
  ]);

  pdf.summaryTable([], ['TOTAL', `${rupiahRaw(total)}`]);
  pdf.detailSection('Payment', [
    ['Metode', pick(['Tunai', 'BPJS', 'Asuransi', 'Kartu Kredit'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer(
    [klinik, `${fakeStreet()}, ${fakeCity()}`],
    ['Terima kasih, semoga lekas sembuh', '']
  );
  return pdf;
}

function genHealthcare() { return pick([genHealthApotek, genHealthKlinik, genHealthApotek])(); }

function genEntCinema() {
  const d = now();
  const cinemas = [
    { name: 'XXI', logo: 'xxi.png', company: 'PT Nusantara Sejahtera Raya' },
    { name: 'CGV', logo: 'cgv.png', company: 'PT CGV Cinemas Indonesia' },
  ];
  const c = pick(cinemas);
  const mall = `${fakeCity()} ${pick(['Town Square', 'Mall', 'Plaza', 'Central Park'])}`;
  const film = pick(['Avengers: Secret Wars', 'Spider-Man: Beyond', 'The Batman Part II', 'Fast X Part 2', 'Jurassic World: Rebirth']);
  const jam = pick(['10:30', '12:45', '13:15', '15:30', '17:45', '19:30', '21:45']);
  const studio = pick(['Studio 1', 'Studio 2', 'Studio 3', 'IMAX', 'PREMIERE']);
  const kursi = `${pick(['A', 'B', 'C', 'D', 'E', 'F', 'G'])}${randInt(1, 15)}`;
  const tiket = randInt(1, 4);
  const hargaTiket = pick([45000, 50000, 55000, 60000, 75000, 100000]);
  const subtotal = tiket * hargaTiket;
  const makanan = pick([null, null, ['Popcorn Large + 2 Drink', randInt(75000, 120000)]]);
  const total = subtotal + (makanan ? makanan[1] : 0);
  const bookingId = `${randInt(100000000, 999999999)}`;

  const pdf = new ReceiptPDF();
  pdf.header(c.logo, c.company, [mall],
    null, [],
    [['Booking ID', bookingId], ['Tanggal', fmtDate(d)]]
  );
  pdf.title('E-TICKET / INVOICE', '');

  pdf.detailSection('Ticket Details', [
    ['Film', film],
    ['Studio', studio],
    ['Jam Tayang', jam],
    ['Kursi', tiket > 1 ? `${tiket} tiket (${kursi} dkk)` : kursi],
    ['Harga per tiket', `${rupiahRaw(hargaTiket)}`],
    [`${tiket} tiket`, `${rupiahRaw(subtotal)}`],
    ...(makanan ? [['---'], ['F&B', makanan[0]], ['', `${rupiahRaw(makanan[1])}`]] : []),
  ]);

  pdf.summaryTable([], ['TOTAL', `${rupiahRaw(total)}`]);
  pdf.detailSection('Payment', [
    ['Metode', pick(['Kartu Kredit', 'GoPay', 'OVO', 'DANA'])],
  ]);

  pdf.footer(
    [c.company, mall],
    ['Tunjukkan e-ticket ini di pintu masuk', `${c.name} Cinema`]
  );
  return pdf;
}

function genEntStreaming() {
  const d = now();
  const platforms = [
    { name: 'NETFLIX', company: 'Netflix Inc.', harga: pick([65000, 120000, 186000]), logo: 'netflix.png', plan: pick(['Mobile', 'Basic', 'Standard', 'Premium']) },
    { name: 'SPOTIFY', company: 'Spotify AB', harga: pick([54990, 85990]), logo: 'spotify.png', plan: pick(['Individual', 'Duo', 'Family']) },
    { name: 'DISNEY+ HOTSTAR', company: 'The Walt Disney Company', harga: pick([39000, 79000]), logo: 'disney.png', plan: pick(['Mobile', 'Premium']) },
  ];
  const p = pick(platforms);
  const noInv = `INV-${p.name.substring(0, 3).toUpperCase()}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(10000, 99999)}`;
  const akun = fakeEmail();
  const ppn = Math.floor(p.harga * 0.11);
  const total = p.harga + ppn;

  const pdf = new ReceiptPDF();
  pdf.header(p.logo, p.company, [],
    null, [],
    [['Invoice No', noInv], ['Tanggal', fmtDate(d)]]
  );
  pdf.title('INVOICE / TAGIHAN', '');

  pdf.detailSection('Subscription Details', [
    ['Layanan', `${p.name} — ${p.plan}`],
    ['Periode', fmtPeriod(d)],
    ['Email', akun],
  ]);

  pdf.detailSection('Billing', [
    [`Langganan ${p.plan}`, `${rupiahRaw(p.harga)}`],
    ['PPN 11%', `${rupiahRaw(ppn)}`],
  ]);

  pdf.summaryTable([], ['TOTAL', `${rupiahRaw(total)}`]);
  pdf.detailSection('Payment', [
    ['Metode', pick(['Kartu Kredit', 'GoPay', 'DANA'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer(
    [p.company, ''],
    [`Terima kasih berlangganan ${p.name}!`, `${p.name.toLowerCase()}.com`]
  );
  return pdf;
}

function genEntertainment() { return pick([genEntCinema, genEntStreaming])(); }

function genShopEcommerce() {
  const d = now();
  const platforms = [
    { name: 'SHOPEE', company: 'PT Shopee International Indonesia', logo: 'shopee.png', npwp: '02.266.142.0-091.000' },
    { name: 'TOKOPEDIA', company: 'PT Tokopedia', logo: 'tokopedia.png', npwp: '02.263.995.1-091.000' },
  ];
  const p = pick(platforms);
  const noInv = `${p.name.substring(0, 3).toUpperCase()}${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;
  const nama = fakeName();
  const alamat = `${fakeStreet()}, ${fakeCity()}`;
  const ekspedisi = pick(['JNE Regular', 'SiCepat REG', 'AnterAja', 'J&T Express']);
  const noResi = `${pick(['JNE', 'SCT', 'ANT', 'JNT'])}${randInt(1000000000, 9999999999)}`;

  const items = [
    ['Kaos Polos Cotton Combed 30s', 75000], ['Celana Chino Pria Slim Fit', 150000],
    ['Tas Ransel Laptop 15.6"', 185000], ['Charger USB-C 65W GaN', 120000],
    ['Mouse Wireless Logitech M240', 189000], ['Earphone TWS Bluetooth 5.3', 95000],
    ['Kemeja Flannel Lengan Panjang', 135000], ['Tumbler Stainless 500ml', 65000],
    ['Phone Case Soft TPU Clear', 35000], ['LED Strip RGB 5 Meter', 48000],
  ];
  const selected = sample(items, randInt(1, 4));
  const txRows = [];
  let subtotal = 0;
  for (const [name, price] of selected) {
    const qty = randInt(1, 2);
    const lp = price * qty;
    subtotal += lp;
    txRows.push([name, `${qty}`, `${rupiahRaw(price)}`, `${rupiahRaw(lp)}`]);
  }
  const ongkir = pick([0, 0, 15000, 20000, 25000]);
  const diskon = pick([0, 0, 0, randInt(5000, 20000)]);
  const total = subtotal + ongkir - diskon;

  const pdf = new ReceiptPDF();
  pdf.header(p.logo, p.company, [`NPWP: ${p.npwp}`],
    nama, [alamat],
    [['No. Invoice', noInv], ['Tanggal', fmtDateTime(d)], ['Pengiriman', ekspedisi]]
  );
  pdf.title('INVOICE PEMBELIAN', '');

  pdf.transactionsTable(
    [
      { name: 'Item', w: 200, align: 'left' },
      { name: 'Qty', w: 40, align: 'center' },
      { name: 'Harga', w: 90, align: 'right' },
      { name: 'Total', w: 90, align: 'right' },
      { name: '', w: 75, align: 'left' },
    ],
    txRows,
    null
  );

  pdf.detailSection('Cost Breakdown', [
    ['Subtotal', `${rupiahRaw(subtotal)}`],
    ...(ongkir > 0 ? [['Ongkos Kirim', `${rupiahRaw(ongkir)}`]] : []),
    ...(diskon > 0 ? [['Diskon/Free Ongkir', `-${rupiahRaw(diskon)}`]] : []),
  ]);

  pdf.summaryTable([], ['TOTAL PEMBAYARAN', `${rupiahRaw(total)}`]);
  pdf.detailSection('Payment', [
    ['Metode', pick(['GoPay', 'OVO', 'DANA', 'Transfer BCA', 'Virtual Account'])],
    ['Status', 'DIBAYAR'],
    ['No. Resi', noResi],
  ]);

  pdf.footer(
    [p.company, `NPWP: ${p.npwp}`],
    ['Terima kasih sudah berbelanja!', `${p.name.toLowerCase()}.co.id`]
  );
  return pdf;
}

function genShopMall() {
  const d = now();
  const stores = [
    { name: 'ZARA', company: 'PT Inditex Indonesia', logo: 'zara.png' },
    { name: 'H&M', company: 'PT Hennes & Mauritz Indonesia', logo: 'hm.png' },
    { name: 'UNIQLO', company: 'PT Fast Retailing Indonesia', logo: 'uniqlo.png' },
    { name: 'MATAHARI', company: 'PT Matahari Department Store Tbk', logo: 'matahari.png' },
  ];
  const s = pick(stores);
  const mall = `${fakeCity()} ${pick(['Mall', 'Plaza', 'Grand Indonesia', 'Pacific Place'])}`;
  const noNota = `${randInt(100000, 999999)}/${pick(['A', 'B', 'C'])}`;
  const kasir = pick(CASHIERS);
  const items = [
    ['Kemeja Flannel Lengan Panjang', 299000], ['Kaos Polo Pria', 199000],
    ['Celana Jeans Slim Fit', 399000], ['Jaket Hoodie Zipper', 349000],
    ['Sepatu Sneakers Canvas', 499000], ['Parfum EDT 100ml', 259000],
    ['Dress Wanita Casual', 329000], ['Tas Selempang Kulit', 449000],
  ];
  const selected = sample(items, randInt(1, 4));
  const txRows = [];
  let subtotal = 0;
  for (const [name, price] of selected) {
    subtotal += price;
    txRows.push([name, '1', `${rupiahRaw(price)}`]);
  }
  const member = pick([null, null, 'MEMBER']);
  const diskonMember = member ? Math.floor(subtotal * pick([0.05, 0.10, 0.15])) : 0;
  const total = subtotal - diskonMember;
  const bayar = Math.ceil(total / 50000) * 50000;

  const pdf = new ReceiptPDF();
  pdf.header(s.logo, s.company, [mall],
    null, [],
    [['No. Nota', noNota], ['Tanggal', fmtDateTime(d)], ...(member ? [['Member', `${member} ${randInt(10000000, 99999999)}`]] : [])]
  );
  pdf.title('NOTA PENJUALAN', '');

  pdf.transactionsTable(
    [
      { name: 'Item', w: 250, align: 'left' },
      { name: 'Qty', w: 40, align: 'center' },
      { name: 'Harga', w: 110, align: 'right' },
      { name: '', w: 95, align: 'left' },
    ],
    txRows,
    null
  );

  pdf.detailSection('Cost Breakdown', [
    ['Subtotal', `${rupiahRaw(subtotal)}`],
    ...(diskonMember > 0 ? [[`Diskon ${member} ${Math.floor(diskonMember / subtotal * 100)}%`, `-${rupiahRaw(diskonMember)}`]] : []),
  ]);

  pdf.summaryTable([], ['TOTAL', `${rupiahRaw(total)}`]);
  pdf.detailSection('Payment', [
    ['Tunai', `${rupiahRaw(bayar)}`],
    ['Kembalian', `${rupiahRaw(bayar - total)}`],
    ['Metode', pick(['Tunai', 'Debit BCA', 'Kartu Kredit'])],
  ]);

  pdf.footer(
    [s.company, mall],
    ['Barang yang sudah dibeli tidak dapat ditukar', 'Tunjukkan nota untuk penukaran (7 hari)']
  );
  return pdf;
}

function genShopping() { return pick([genShopEcommerce, genShopMall])(); }

function genTravelHotel() {
  const d = now();
  const hotels = [
    { name: 'HARRIS HOTEL', company: 'PT Tiara Mediawisata' },
    { name: 'NOVOTEL', company: 'PT Accor Investment International' },
    { name: 'IBIS BUDGET', company: 'PT Accor Investment International' },
  ];
  const h = pick(hotels);
  const noBooking = `HTL${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;
  const nama = fakeName();
  const checkin = new Date(d.getTime() - randInt(1, 3) * 86400000);
  const checkout = new Date(checkin.getTime() + randInt(1, 4) * 86400000);
  const nights = Math.ceil((checkout - checkin) / 86400000);
  const roomType = pick(['Standard', 'Superior', 'Deluxe', 'Junior Suite']);
  const hargaMalam = pick([450000, 550000, 750000, 950000, 1200000]);
  const subtotal = hargaMalam * nights;
  const service = Math.floor(subtotal * 0.1);
  const tax = Math.floor(subtotal * 0.11);
  const minibar = pick([0, 0, 0, randInt(50000, 200000)]);
  const laundry = pick([0, 0, 0, randInt(30000, 100000)]);
  const total = subtotal + service + tax + minibar + laundry;

  const pdf = new ReceiptPDF();
  pdf.header(null, h.name, [h.company, `${fakeStreet()}, ${fakeCity()}`, `Telp: ${fakePhone()}`],
    nama, [],
    [['No. Invoice', noBooking], ['Tanggal', fmtDate(d)]]
  );
  pdf.title('INVOICE / FAKTUR', '');

  pdf.detailSection('Guest Details', [
    ['Nama', nama],
    ['Check-in', fmtDate(checkin)],
    ['Check-out', fmtDate(checkout)],
    ['Durasi', `${nights} Malam`],
    ['Tipe Kamar', roomType],
    ['No. Kamar', `${randInt(1, 12)}${String(randInt(10, 35)).padStart(2, '0')}`],
  ]);

  pdf.detailSection('Billing Details', [
    [`${roomType} ${nights}x`, `${rupiahRaw(subtotal)}`],
    ['Service Charge 10%', `${rupiahRaw(service)}`],
    ['Pajak 11%', `${rupiahRaw(tax)}`],
    ...(minibar > 0 ? [['Minibar', `${rupiahRaw(minibar)}`]] : []),
    ...(laundry > 0 ? [['Laundry', `${rupiahRaw(laundry)}`]] : []),
  ]);

  pdf.summaryTable([], ['TOTAL', `${rupiahRaw(total)}`]);
  pdf.detailSection('Payment', [
    ['Metode', pick(['Kartu Kredit', 'Transfer', 'Tunai'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer(
    [h.company, `${fakeStreet()}, ${fakeCity()}`],
    ['Terima kasih telah menginap bersama kami', `www.${h.name.toLowerCase().replace(/ /g, '')}.com`]
  );
  return pdf;
}

function genTravelAirline() {
  const d = now();
  const airlines = [
    { name: 'LION AIR', company: 'PT Lion Mentari Airlines', logo: 'lion_air.png', code: 'JT' },
    { name: 'GARUDA INDONESIA', company: 'PT Garuda Indonesia (Persero) Tbk', logo: 'garuda.png', code: 'GA' },
    { name: 'AIRASIA', company: 'PT Airasia Indonesia', logo: 'airasia.png', code: 'QZ' },
  ];
  const a = pick(airlines);
  const nama = fakeName();
  const noBooking = `${a.code}${randInt(100000, 999999)}`;
  const routes = [
    ['CGK', 'Soekarno-Hatta', 'DPS', 'Ngurah Rai', 'Jakarta → Bali'],
    ['CGK', 'Soekarno-Hatta', 'SUB', 'Juanda', 'Jakarta → Surabaya'],
    ['CGK', 'Soekarno-Hatta', 'KNO', 'Kualanamu', 'Jakarta → Medan'],
    ['DPS', 'Ngurah Rai', 'CGK', 'Soekarno-Hatta', 'Bali → Jakarta'],
  ];
  const [, bandaraAsal, , bandaraTujuan, rute] = pick(routes);
  const jam = pick(['06:00', '07:30', '08:15', '10:45', '13:00', '15:30', '19:30', '21:15']);
  const durasi = `${randInt(1, 3)}j ${randInt(10, 50)}m`;
  const kelas = pick(['Economy', 'Economy', 'Premium Economy', 'Business']);
  const hargaTiket = pick([650000, 850000, 1200000, 1500000, 2000000, 3500000]);
  const airportTax = 150000;
  const fuelSurcharge = Math.floor(hargaTiket * 0.12);
  const insurance = pick([0, 25000, 35000]);
  const total = hargaTiket + airportTax + fuelSurcharge + insurance;

  const pdf = new ReceiptPDF();
  pdf.header(a.logo, a.company, [],
    nama, [],
    [['Booking Ref', noBooking], ['Tanggal', fmtDate(d)], ['Kelas', kelas]]
  );
  pdf.title('E-TICKET / BOARDING PASS', rute);

  pdf.detailSection('Flight Details', [
    ['Bandara Asal', `${bandaraAsal} (${rute.split(' → ')[0]})`],
    ['Bandara Tujuan', `${bandaraTujuan} (${rute.split(' → ')[1]})`],
    ['Jam Berangkat', jam],
    ['Durasi', durasi],
    ['No. Penerbangan', `${a.code}${randInt(100, 999)}`],
  ]);

  pdf.detailSection('Price Breakdown', [
    ['Harga Tiket', `${rupiahRaw(hargaTiket)}`],
    ['Airport Tax', `${rupiahRaw(airportTax)}`],
    ['Fuel Surcharge', `${rupiahRaw(fuelSurcharge)}`],
    ...(insurance > 0 ? [['Asuransi', `${rupiahRaw(insurance)}`]] : []),
  ]);

  pdf.summaryTable([], ['TOTAL', `${rupiahRaw(total)}`]);
  pdf.detailSection('Payment', [
    ['Metode', pick(['Kartu Kredit', 'Transfer', 'Virtual Account', 'Traveloka'])],
    ['Status', 'ISSUED'],
  ]);

  pdf.footer(
    [a.company, ''],
    ['Harap tiba di bandara 2 jam sebelum keberangkatan', 'Tunjukkan e-ticket & identitas saat check-in']
  );
  return pdf;
}

function genTravel() { return pick([genTravelHotel, genTravelAirline])(); }

function genEduCourse() {
  const d = now();
  const kursus = [
    { name: 'EF ENGLISH FIRST', company: 'PT EF Education Indonesia', logo: 'gramedia.png' },
    { name: 'PRIMAGAMA', company: 'PT Primagama Utama', logo: 'gramedia.png' },
  ];
  const k = pick(kursus);
  const nama = fakeName();
  const noKwitansi = `KW${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;
  const programs = [
    ['English Basic 3 Bulan', 2500000, '12 pertemuan × 90 menit'],
    ['IELTS Preparation 4 Bulan', 3500000, '16 pertemuan × 120 menit'],
    ['General English 6 Bulan', 4200000, '24 pertemuan × 90 menit'],
  ];
  const [prog, harga, detail] = pick(programs);
  const ppn = Math.floor(harga * 0.11);
  const diskon = pick([0, 0, 0, Math.floor(harga * 0.1)]);
  const total = harga + ppn - diskon;

  const pdf = new ReceiptPDF();
  pdf.header(k.logo, k.company, [`${fakeStreet()}, ${fakeCity()}`, `Telp: ${fakePhone()}`],
    nama, [],
    [['No. Kwitansi', noKwitansi], ['Tanggal', fmtDate(d)]]
  );
  pdf.title('KUITANSI PEMBAYARAN', '');

  pdf.detailSection('Student Details', [
    ['Nama', nama],
    ['No. HP', fakePhone()],
  ]);

  pdf.detailSection('Program Details', [
    ['Program', prog],
    ['Detail', detail],
    ['Mulai', fmtDate(d)],
  ]);

  pdf.detailSection('Cost Breakdown', [
    ['Biaya Program', `${rupiahRaw(harga)}`],
    ['PPN 11%', `${rupiahRaw(ppn)}`],
    ...(diskon > 0 ? [['Diskon', `-${rupiahRaw(diskon)}`]] : []),
  ]);

  pdf.summaryTable([], ['TOTAL', `${rupiahRaw(total)}`]);
  pdf.detailSection('Payment', [
    ['Metode', pick(['Transfer BCA', 'Transfer Mandiri', 'Tunai'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer(
    [k.company, `${fakeStreet()}, ${fakeCity()}`],
    ['Terima kasih atas pembayaran Anda', 'Simpan kwitansi ini sebagai bukti pembayaran']
  );
  return pdf;
}

function genEduBook() {
  const d = now();
  const stores = [
    { name: 'GRAMEDIA', company: 'PT Gramedia Asri Media', logo: 'gramedia.png' },
    { name: 'KINOKUNIYA', company: 'PT Kinokuniya Indonesia', logo: 'gramedia.png' },
  ];
  const s = pick(stores);
  const mall = `${fakeCity()} ${pick(['Mall', 'Plaza'])}`;
  const noNota = `${randInt(100000, 999999)}`;
  const books = [
    ['Atomic Habits — James Clear', 120000], ['Rich Dad Poor Dad — Kiyosaki', 95000],
    ['Sapiens — Yuval Harari', 145000], ['Clean Code — Robert Martin', 250000],
    ['Deep Work — Cal Newport', 105000], ['Laskar Pelangi — A. Hirata', 68000],
    ['Bumi Manusia — Pramoedya', 89000], ['Thinking Fast & Slow — Kahneman', 135000],
  ];
  const selected = sample(books, randInt(1, 5));
  const txRows = [];
  let subtotal = 0;
  for (const [name, price] of selected) {
    subtotal += price;
    txRows.push([name, '1', `${rupiahRaw(price)}`]);
  }
  const member = pick([null, 'GRATIS 5%']);
  const diskon = member ? Math.floor(subtotal * 0.05) : 0;
  const total = subtotal - diskon;

  const pdf = new ReceiptPDF();
  pdf.header(s.logo, s.company, [mall],
    null, [],
    [['No. Nota', noNota], ['Tanggal', fmtDateTime(d)], ['Kasir', pick(CASHIERS)]]
  );
  pdf.title('NOTA PENJUALAN', '');

  pdf.transactionsTable(
    [
      { name: 'Judul Buku', w: 300, align: 'left' },
      { name: 'Qty', w: 40, align: 'center' },
      { name: 'Harga', w: 90, align: 'right' },
      { name: '', w: 65, align: 'left' },
    ],
    txRows,
    null
  );

  pdf.detailSection('Cost Breakdown', [
    ['Subtotal', `${rupiahRaw(subtotal)}`],
    ...(diskon > 0 ? [['Diskon Member', `-${rupiahRaw(diskon)}`]] : []),
  ]);

  pdf.summaryTable([], ['TOTAL', `${rupiahRaw(total)}`]);
  pdf.detailSection('Payment', [
    ['Metode', pick(['Tunai', 'Debit', 'GoPay', 'OVO'])],
  ]);

  pdf.footer(
    [s.company, mall],
    ['Barang yang sudah dibeli tidak dapat ditukar/dikembalikan', `www.${s.name.toLowerCase()}.co.id`]
  );
  return pdf;
}

function genEducation() { return pick([genEduCourse, genEduBook])(); }

function genSubSoftware() {
  const d = now();
  const softwares = [
    { name: 'MICROSOFT 365', company: 'PT Microsoft Indonesia', harga: 1199000, logo: 'microsoft.png', plan: pick(['Personal', 'Family']) },
    { name: 'ADOBE CREATIVE CLOUD', company: 'Adobe Inc.', harga: 899000, logo: 'adobe.png', plan: pick(['Photography', 'All Apps']) },
    { name: 'CANVA PRO', company: 'Canva Pty Ltd', harga: 749000, logo: 'canva.png', plan: 'Pro' },
  ];
  const s = pick(softwares);
  const noInv = `INV-${s.name.substring(0, 3).toUpperCase()}-${d.getFullYear()}${randInt(10000, 99999)}`;
  const ppn = Math.floor(s.harga * 0.11);
  const total = s.harga + ppn;

  const pdf = new ReceiptPDF();
  pdf.header(s.logo, s.company, [],
    null, [],
    [['Invoice No', noInv], ['Tanggal', fmtDate(d)]]
  );
  pdf.title('INVOICE / TAGIHAN', '');

  pdf.detailSection('Subscription Details', [
    ['Produk', s.name],
    ['Plan', s.plan],
    ['Periode', `${fmtDate(new Date(d.getFullYear(), d.getMonth(), 1))} — ${fmtDate(new Date(d.getFullYear() + 1, d.getMonth(), 0))}`],
    ['Email', fakeEmail()],
  ]);

  pdf.detailSection('Billing', [
    ['Langganan Tahunan', `${rupiahRaw(s.harga)}`],
    ['PPN 11%', `${rupiahRaw(ppn)}`],
  ]);

  pdf.summaryTable([], ['TOTAL', `${rupiahRaw(total)}`]);
  pdf.detailSection('Payment', [
    ['Metode', pick(['Kartu Kredit', 'PayPal', 'GoPay'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer(
    [s.company, ''],
    ['Terima kasih atas pembelian Anda', `${s.name.toLowerCase().replace(/ /g, '')}.com`]
  );
  return pdf;
}

function genSubscriptions() { return genSubSoftware(); }

// ─── Category Map ───────────────────────────────────────────────────────────
const CATEGORIES = [
  ['food_dining', genFoodDining],
  ['transport', genTransport],
  ['utilities', genUtilities],
  ['healthcare', genHealthcare],
  ['entertainment', genEntertainment],
  ['shopping', genShopping],
  ['travel', genTravel],
  ['education', genEducation],
  ['subscriptions', genSubscriptions],
];

// ─── Main Export ────────────────────────────────────────────────────────────
async function generateRandomReceipt() {
  const [category, genFunc] = pick(CATEGORIES);
  const pdf = genFunc();
  const filepath = `/tmp/receipt_${category.replace('_', '')}_${randInt(1000, 9999)}.pdf`;
  const buffer = await pdf.toBuffer();
  fs.writeFileSync(filepath, buffer);
  const size = fs.statSync(filepath).size;
  return { filepath, size, category };
}

// CLI mode
if (require.main === module) {
  generateRandomReceipt().then(({ filepath, size, category }) => {
    console.log(`${filepath}|${size}|${category}`);
  });
}

module.exports = { generateRandomReceipt };
