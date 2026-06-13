#!/usr/bin/env node
/**
 * BillsOnChain — Receipt PDF Generator v2 (Node.js)
 * Realistic thermal receipt format — 9 categories, 32 real logos
 * v2: Added barcodes, cashier info, loyalty numbers, payment details,
 *     proper Indonesian receipt formatting, Helvetica font for OCR readability
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
const rupiah = (n) => 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const rupiahRaw = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const padR = (s, w) => String(s).padStart(w);
const padL = (s, w) => String(s).padEnd(w);

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
const fakeNIK = () => `${randInt(31, 36)}${randInt(10, 75)}${String(randInt(1, 12)).padStart(2, '0')}${String(randInt(1, 28)).padStart(2, '0')}${randInt(1000, 9999)}`;
const fakeNIP = () => `${randInt(1000000, 9999999)}${randInt(10, 20)}${randInt(1, 12)}${randInt(1, 28)}${randInt(1, 9)}`;
const fakeKK = () => `${randInt(31, 36)}${randInt(10, 75)}${randInt(10000000, 99999999)}`;
const fakeNoRek = () => `${randInt(100, 999)}.${randInt(100, 999)}.${randInt(100, 999)}`;
const fakeIDPLN = () => `${randInt(10000000000, 99999999999)}`;
const fakeVA = () => `${randInt(10000, 99999)}${randInt(100000000, 999999999)}`;
const now = () => new Date();
const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
const fmtDateDot = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
const fmtDateTime = (d) => `${fmtDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
const fmtTime = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
const fmtMonthYear = (d) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};

// ─── Receipt PDF Builder ────────────────────────────────────────────────────
class ReceiptPDF {
  constructor(width = 226.77) {
    this.width = width;
    this.margin = 12;
    this.contentWidth = width - (this.margin * 2);
    this.doc = new PDFDocument({
      size: [width, 1200],
      margins: { top: 10, bottom: 10, left: this.margin, right: this.margin }
    });
    this.y = 10;
  }

  // Centered logo
  logoCenter(filename, w = 80) {
    const fp = path.join(LOGO_DIR, filename);
    if (fs.existsSync(fp)) {
      const x = (this.width - w) / 2;
      this.doc.image(fp, x, this.y, { width: w });
      this.y += w * 0.4 + 5;
    }
  }

  // Right-aligned small logo
  logoSmall(filename, w = 50) {
    const fp = path.join(LOGO_DIR, filename);
    if (fs.existsSync(fp)) {
      this.doc.image(fp, this.width - this.margin - w, this.y, { width: w });
      this.y += w * 0.35 + 3;
    }
  }

  // Text with font control
  text(str, opts = {}) {
    const { align = 'left', size = 7, bold = false, font = 'Helvetica', indent = 0, spacing = 1.5 } = opts;
    this.doc.font(bold ? 'Helvetica-Bold' : font).fontSize(size);
    const x = this.margin + indent;
    const w = this.contentWidth - indent;
    this.doc.text(str, x, this.y, { width: w, align, lineGap: spacing });
    this.y += size + spacing + 1;
  }

  // Two-column text (label left, value right)
  row(label, value, opts = {}) {
    const { size = 7, bold = false, labelW = 90 } = opts;
    const font = bold ? 'Helvetica-Bold' : 'Helvetica';
    this.doc.font(font).fontSize(size);
    this.doc.text(label, this.margin, this.y, { width: labelW, align: 'left' });
    this.doc.text(value, this.margin + labelW, this.y, { width: this.contentWidth - labelW, align: 'right' });
    this.y += size + 2;
  }

  // Full-width divider line
  divider(style = 'dash') {
    const char = style === 'solid' ? '━' : style === 'dot' ? '·' : '─';
    this.text(char.repeat(Math.floor(this.contentWidth / 3.2)), { align: 'center', size: 6 });
  }

  // Double divider
  doubleDivider() {
    this.divider('solid');
    this.divider('solid');
  }

  blank(h = 5) { this.y += h; }

  // Barcode-like pattern (simple lines)
  barcode(data, h = 25) {
    const x = this.margin + 20;
    const w = this.contentWidth - 40;
    const barCount = 50;
    const barW = w / barCount;
    for (let i = 0; i < barCount; i++) {
      if (i % 3 !== 0) {
        const bw = (i % 5 === 0) ? barW * 1.5 : barW * 0.8;
        this.doc.rect(x + i * barW, this.y, bw, h).fill('#000');
      }
    }
    this.y += h + 2;
    this.text(data, { align: 'center', size: 6 });
  }

  // QR-like square pattern
  qrCode(size = 35) {
    const x = (this.width - size) / 2;
    const cellSize = size / 7;
    this.doc.rect(x, this.y, size, size).fill('#fff').stroke('#000');
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if ((r + c) % 2 === 0 || (r === 0 || r === 6 || c === 0 || c === 6)) {
          if (Math.random() > 0.35) {
            this.doc.rect(x + c * cellSize, this.y + r * cellSize, cellSize, cellSize).fill('#000');
          }
        }
      }
    }
    this.y += size + 3;
  }

  toBuffer() {
    // Trim page to actual content height
    this.doc.page.height = this.y + 20;
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
    {
      header: 'PT INDOMARCO PRISMATAMA',
      addr: 'MENARA INDOMARET LT.8\nJL. BOULEVARD ARTHA GADING\nJAKARTA UTARA 14240',
      npwp: '01.337.994.6-092.000',
      name: 'INDOMARET', logo: 'indomaret.png',
      phone: '(021) 2988 8899', cashier_prefix: 'KSR',
      store_code: 'IDM', svc: '0811 1500 280',
    },
    {
      header: 'PT SUMBER ALFARIA TRIJAYA TBK',
      addr: 'ALFAMART CENTRAL OFFICE\nJL. MH THAMRIN NO.9\nJAKARTA PUSAT 10230',
      npwp: '01.878.576.2-091.000',
      name: 'ALFAMART', logo: 'alfamart.png',
      phone: '(021) 2960 8888', cashier_prefix: 'ALFA',
      store_code: 'ALF', svc: '1500 959',
    },
    {
      header: 'PT MATAHARI PUTRA PRIMA TBK',
      addr: 'HYPERMARKET DIVISION\nJL. BOULEVARD PALEM RAYA\nTANGERANG 15810',
      npwp: '01.337.994.6-052.000',
      name: 'HYPERMART', logo: 'hypermart.png',
      phone: '(021) 5460 888', cashier_prefix: 'HY',
      store_code: 'HPM', svc: '0800 188 8888',
    },
  ];
  const store = pick(stores);
  const d = now();
  const storeNum = randInt(1000, 9999);
  const kasir = `${store.cashier_prefix}${randInt(1, 30)}`;
  const noNota = `${store.store_code}${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${randInt(100000, 999999)}`;

  const items = [
    ['INDOMIE GORENG 85G', 3200], ['AQUA 600ML', 3500], ['TEH BOTOL SOSRO 450ML', 6500],
    ['CHITATO SAPI 68G', 11500], ['SILVERQUEEN CHUNKY 100G', 22000], ['BIMOLI 2L', 38500],
    ['GULAKU 1KG', 17500], ['RINSO ANTI NODA 700G', 28500], ['LIFEBUOY BODY WASH 450ML', 24500],
    ['SUNLIGHT LIME 755ML', 14800], ['OREO VANILLA 137G', 9800], ['BEAR BRAND 189ML', 10500],
    ['NESCAFE CLASSIC 100G', 27500], ['ULTRA MILK STRAWBERRY 1L', 19500], ['BERAS ROJOLELE 5KG', 74500],
    ['POKKA GREEN TEA 500ML', 7200], ['COCA COLA 1.5L', 16500], ['PAMPERS M42', 54500],
    ['APEL FUJI 1KG', 38000], ['PISANG AMBON 1KG', 24500], ['MINYAK GORENG 2L', 29000],
    ['GULA PASIR 1KG', 15500], ['TELUR 1KG', 28000], ['SUSU DANCOW 400G', 32000],
    ['ROTI TAWAR GANDUM', 15000], ['KEJU KRAFT 165G', 23500], ['MENTEGA WYSMAN 227G', 25000],
    ['KOPI KAPAL API 165G', 14500], ['MIE SEDAAP GORENG 85G', 3100],
  ];

  const pdf = new ReceiptPDF();
  pdf.logoCenter(store.logo, 80);
  pdf.blank(2);
  pdf.text(store.header, { align: 'center', size: 7, bold: true });
  pdf.text(store.addr, { align: 'center', size: 6 });
  pdf.text(`NPWP: ${store.npwp}`, { align: 'center', size: 6 });
  pdf.text(store.phone, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.blank(2);

  // Transaction info
  const trxDate = `${fmtDateDot(d)} ${fmtTime(d)}`;
  pdf.text(`${trxDate} ${store.store_code}.${randInt(1, 5)}.${randInt(10, 99)}`, { align: 'center', size: 7 });
  pdf.text(`No: ${noNota}/${pick(CASHIERS)}`, { align: 'center', size: 7 });
  pdf.blank(2);
  pdf.divider();

  // Items
  const selected = sample(items, randInt(5, 14));
  let subtotal = 0;
  let itemCount = 0;
  for (const [name, basePrice] of selected) {
    const qty = randInt(1, 4);
    const price = basePrice + (Math.random() > 0.7 ? randInt(-500, 500) : 0);
    const lineTotal = price * qty;
    subtotal += lineTotal;
    itemCount += qty;

    // Item name on first line
    pdf.text(`${name}`, { size: 7 });
    // Qty x Price = Total on second line (indented)
    const lineStr = `${qty} ${rupiahRaw(price)} ${' '.repeat(5)} ${rupiahRaw(lineTotal)}`;
    pdf.text(lineStr, { size: 7, indent: 5 });
  }

  pdf.divider();

  // Totals
  const ppn = Math.floor(subtotal * 0.11);
  const grandTotal = subtotal + ppn;
  pdf.row('SUBTOTAL', `${rupiahRaw(subtotal)}`, { bold: true });
  pdf.row(`PPN 11%`, `${rupiahRaw(ppn)}`);
  pdf.row(`${itemCount} ITEM`, '', { size: 7 });
  pdf.doubleDivider();
  pdf.row('TOTAL', `${rupiahRaw(grandTotal)}`, { bold: true, size: 9 });
  pdf.blank(3);

  // Payment
  const tunai = Math.ceil(grandTotal / 5000) * 5000 + randInt(0, 2) * 5000;
  const kembali = tunai - grandTotal;
  pdf.divider();
  pdf.text('TUNAI / CASH', { size: 7 });
  pdf.row('TUNAI', `${rupiahRaw(tunai)}`);
  pdf.row('KEMBALIAN', `${rupiahRaw(kembali)}`);
  pdf.blank(5);

  // Footer
  pdf.divider('dot');
  pdf.text(`KASIR: ${kasir}`, { align: 'center', size: 6 });
  pdf.text(`Shift: ${pick(['PAGI', 'SIANG', 'SORE'])}`, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.text('TERIMA KASIH ATAS KUNJUNGAN ANDA', { align: 'center', size: 6, bold: true });
  pdf.text('BARANG YANG SUDAH DIBELI', { align: 'center', size: 6 });
  pdf.text('TIDAK DAPAT DITUKAR/DIKEMBALIKAN', { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.text(`Layanan Konsumen: ${store.svc}`, { align: 'center', size: 6 });
  pdf.text(`www.${store.name.toLowerCase()}.co.id`, { align: 'center', size: 6 });
  pdf.blank(8);
  pdf.barcode(noNota);

  return pdf;
}

function genTransportGrab() {
  const d = now();
  const invoice = `GRB-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${randInt(10000000, 99999999)}`;
  const driver = fakeName();
  const plat = fakePlat();
  const rating = pick([4.8, 4.9, 5.0, 4.7, 4.6]);
  const layanan = pick(['GrabCar', 'GrabCar', 'GrabBike', 'GrabCar Premium']);
  const dari = `${pick(STREETS)} No.${randInt(1, 150)}, ${fakeCity()}`;
  const ke = `${pick(STREETS)} No.${randInt(1, 150)}, ${fakeCity()}`;
  const jarak = (Math.random() * 22 + 1.5).toFixed(1);
  const durasi = randInt(8, 65);
  const tarif = randInt(18000, 95000);
  const diskon = pick([0, 0, 0, randInt(3000, 15000)]);
  const biayaAplikasi = 2500;
  const asuransi = 1000;
  const total = tarif - diskon + biayaAplikasi + asuransi;
  const bayar = pick(['GrabPay', 'OVO', 'GoPay', 'Tunai', 'Kartu Kredit']);

  const pdf = new ReceiptPDF();
  pdf.logoCenter('grab.png', 70);
  pdf.blank(2);
  pdf.text('PT GRAB TEKNOLOGI INDONESIA', { align: 'center', size: 7, bold: true });
  pdf.text('Jakarta, Indonesia', { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('INVOICE', { align: 'center', size: 9, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('No. Invoice', invoice);
  pdf.row('Tanggal', fmtDate(d));
  pdf.row('Waktu', fmtTime(d));
  pdf.row('Layanan', layanan);
  pdf.blank(3);
  pdf.divider();
  pdf.text('DETAIL PERJALANAN', { bold: true, size: 7 });
  pdf.blank(1);
  pdf.row('Dari', dari.substring(0, 40));
  pdf.row('Tujuan', ke.substring(0, 40));
  pdf.row('Jarak', `${jarak} km`);
  pdf.row('Durasi', `${durasi} menit`);
  pdf.blank(3);
  pdf.divider();
  pdf.text('DRIVER', { bold: true, size: 7 });
  pdf.blank(1);
  pdf.row('Nama', driver);
  pdf.row('Plat', plat);
  pdf.row('Rating', `${rating} ★`);
  pdf.blank(3);
  pdf.divider();
  pdf.text('RINCIAN BIAYA', { bold: true, size: 7 });
  pdf.blank(1);
  pdf.row('Tarif Perjalanan', rupiahRaw(tarif));
  if (diskon > 0) pdf.row('Diskon Promo', `-${rupiahRaw(diskon)}`);
  pdf.row('Biaya Aplikasi', rupiahRaw(biayaAplikasi));
  pdf.row('Asuransi Perjalanan', rupiahRaw(asuransi));
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL', rupiahRaw(total), { bold: true, size: 9 });
  pdf.blank(3);
  pdf.row('Metode Bayar', bayar);
  pdf.row('Status', 'LUNAS');
  pdf.blank(8);
  pdf.text('Terima kasih telah menggunakan Grab!', { align: 'center', size: 6 });
  pdf.text('Bantuan: help.grab.com | 021-80-648-777', { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(invoice);

  return pdf;
}

function genTransportGojek() {
  const d = now();
  const orderId = `GO-${randInt(10000000, 99999999)}`;
  const layanan = pick(['GoRide', 'GoCar', 'GoFood', 'GoSend', 'GoCar']);
  const driver = fakeName();
  const plat = fakePlat();
  const dari = `${pick(STREETS)}, ${fakeCity()}`;
  const ke = `${pick(STREETS)}, ${fakeCity()}`;
  const tarif = randInt(12000, 85000);
  const promo = pick([0, 0, 0, randInt(2000, 12000)]);
  const total = tarif - promo;
  const bayar = pick(['GoPay', 'GoPayLater', 'Tunai']);

  const pdf = new ReceiptPDF();
  pdf.logoCenter('gojek.png', 70);
  pdf.blank(2);
  pdf.text('PT GOJEK INDONESIA', { align: 'center', size: 7, bold: true });
  pdf.text('GoTo Complex, Jakarta Selatan', { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('BUKTI PEMBAYARAN', { align: 'center', size: 9, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('Order ID', orderId);
  pdf.row('Tanggal', fmtDateTime(d));
  pdf.row('Layanan', layanan);
  pdf.blank(3);
  pdf.divider();
  pdf.text('PERJALANAN', { bold: true, size: 7 });
  pdf.row('Titik Jemput', dari);
  pdf.row('Tujuan', ke);
  pdf.blank(3);
  pdf.divider();
  pdf.text('DRIVER', { bold: true, size: 7 });
  pdf.row('Nama', driver);
  pdf.row('Plat', plat);
  pdf.blank(3);
  pdf.divider();
  pdf.text('RINCIAN BIAYA', { bold: true, size: 7 });
  pdf.row('Tarif', rupiahRaw(tarif));
  if (promo > 0) pdf.row('Promo', `-${rupiahRaw(promo)}`);
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL', rupiahRaw(total), { bold: true, size: 9 });
  pdf.row('Pembayaran', bayar);
  pdf.row('Status', 'Berhasil');
  pdf.blank(5);
  pdf.text('Gojek — Pasti Ada Jalan', { align: 'center', size: 6 });
  pdf.text('Bantuan: gojek.com/help', { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(orderId);

  return pdf;
}

function genTransportToll() {
  const d = now();
  const gates_in = ['Cikampek', 'Cikunir', 'Pondok Ranji', 'Bintaro', 'Serpong', 'Karang Tengah', 'Kebon Jeruk'];
  const gates_out = ['Halim', 'Cawang', 'Tebet', 'Kuningan', 'Casablanca', 'Semanggi', 'Tanjung Priok'];
  const masuk = pick(gates_in);
  const keluar = pick(gates_out);
  const gol = pick(['I', 'I', 'I', 'II', 'II', 'III']);
  const tarif = pick([5000, 6500, 8000, 9500, 11000, 12500, 15000, 18000]);
  const noKartu = `${randInt(4000, 9999)} ${randInt(1000, 9999)} ${randInt(1000, 9999)} ${randInt(1000, 9999)}`;
  const noTrx = `TL${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${randInt(100000, 999999)}`;
  const waktuMasuk = new Date(d.getTime() - randInt(5, 45) * 60000);

  const pdf = new ReceiptPDF();
  pdf.text('PT JASA MARGA (PERSERO) TBK', { align: 'center', size: 7, bold: true });
  pdf.text('Jl. Meruya Selatan No.17, Jakarta Barat', { align: 'center', size: 6 });
  pdf.text('NPWP: 01.001.680.4-092.000', { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('STRUK PEMBAYARAN TOL', { align: 'center', size: 9, bold: true });
  pdf.text('GERBANG TOL ELEKTRONIK', { align: 'center', size: 7 });
  pdf.divider();
  pdf.blank(2);

  pdf.row('No. Transaksi', noTrx);
  pdf.row('Tanggal', fmtDate(d));
  pdf.blank(2);
  pdf.divider();
  pdf.text('RUTE', { bold: true, size: 7 });
  pdf.row('Gerbang Masuk', `GT ${masuk}`);
  pdf.row('Waktu Masuk', fmtDateTime(waktuMasuk));
  pdf.row('Gerbang Keluar', `GT ${keluar}`);
  pdf.row('Waktu Keluar', fmtDateTime(d));
  pdf.row('Golongan', gol);
  pdf.blank(3);
  pdf.divider();
  pdf.text('PEMBAYARAN', { bold: true, size: 7 });
  pdf.row('No. Kartu', noKartu);
  pdf.row('Jenis', pick(['e-Money Mandiri', 'Flazz BCA', 'Brizzi BRI', 'TapCash BNI']));
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TARIF TOL', rupiahRaw(tarif), { bold: true, size: 9 });
  pdf.row('Saldo Akhir', rupiahRaw(randInt(20000, 200000)));
  pdf.blank(5);
  pdf.text('PT Jasa Marga — Melayani Negeri', { align: 'center', size: 6 });
  pdf.text('www.jasamarga.com', { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noTrx);

  return pdf;
}

function genTransportParking() {
  const d = now();
  const masuk = new Date(d.getTime() - randInt(1, 6) * 3600000);
  const mall = pick(['MAL TAMAN ANGGREK', 'PLUIT VILLAGE', 'CENTRAL PARK MALL', 'SUMMARECON MALL SERPONG', 'AEON MALL JGC', 'MALL KELAPA GADING', 'PONDOK INDAH MALL']);
  const plat = fakePlat();
  const noTiket = `PK${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${randInt(10000, 99999)}`;
  const durasiJam = Math.ceil((d - masuk) / 3600000);
  const tarifPerJam = pick([4000, 5000, 6000]);
  const tarif = Math.min(durasiJam * tarifPerJam, 30000);
  const lokasi = pick(['B1', 'B2', 'P1', 'P2', 'L1', 'L2', 'LG']);

  const pdf = new ReceiptPDF();
  pdf.text('TIKET PARKIR', { align: 'center', size: 11, bold: true });
  pdf.text(mall, { align: 'center', size: 7, bold: true });
  pdf.text(`Area Parkir ${lokasi}`, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.blank(2);

  pdf.row('No. Tiket', noTiket);
  pdf.row('Plat Nomor', plat);
  pdf.blank(2);
  pdf.divider();
  pdf.row('Masuk', fmtDateTime(masuk));
  pdf.row('Keluar', fmtDateTime(d));
  pdf.row('Durasi', `${durasiJam} jam`);
  pdf.blank(3);
  pdf.divider();
  pdf.row('Tarif/jam', rupiahRaw(tarifPerJam));
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL PARKIR', rupiahRaw(tarif), { bold: true, size: 9 });
  pdf.blank(2);
  pdf.text('Pembayaran: Tunai / E-Money', { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.text('Tiket ini harus disimpan', { align: 'center', size: 6 });
  pdf.text('Hilang tiket dikenakan denda Rp 50.000', { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noTiket);

  return pdf;
}

function genTransport() { return pick([genTransportGrab, genTransportGojek, genTransportToll, genTransportParking])(); }

// ─── Utilities ──────────────────────────────────────────────────────────────

function genUtilPLN() {
  const d = now();
  const noRek = `${randInt(10000000000, 99999999999)}`;
  const nama = fakeName();
  const alamat = `${fakeStreet()}, ${fakeCity()}`;
  const daya = pick([1300, 2200, 2200, 3500, 4400, 5500]);
  const tarifListrik = daya <= 2200 ? 1444 : 1699;
  const pemakaian = randInt(60, 380);
  const total = pemakaian * tarifListrik;
  const biayaAdmin = 2500;
  const denda = pick([0, 0, 0, 0, randInt(5000, 25000)]);
  const grandTotal = total + biayaAdmin + denda;
  const idpel = `${noRek}`;
  const bulan = fmtMonthYear(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const noTrx = `PLN${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;
  const standAwal = randInt(10000, 50000);
  const standAkhir = standAwal + pemakaian;

  const pdf = new ReceiptPDF();
  pdf.logoCenter('pln.png', 90);
  pdf.blank(2);
  pdf.text('PT PLN (PERSERO)', { align: 'center', size: 8, bold: true });
  pdf.text('UNIT PELAYANAN LISTRIK', { align: 'center', size: 6 });
  pdf.text(`${fakeCity()}`, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('BUKTI PEMBAYARAN REKENING LISTRIK', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('No. Transaksi', noTrx);
  pdf.row('Tanggal Bayar', fmtDateTime(d));
  pdf.row('Periode', bulan);
  pdf.blank(2);
  pdf.divider();
  pdf.text('DATA PELANGGAN', { bold: true, size: 7 });
  pdf.row('ID Pelanggan', idpel);
  pdf.row('Nama', nama);
  pdf.row('Alamat', alamat.substring(0, 35));
  pdf.row('Daya', `${daya} VA`);
  pdf.row('Tarif', `R${daya <= 2200 ? '1' : '2'}`);
  pdf.blank(3);
  pdf.divider();
  pdf.text('RINCIAN PEMAKAIAN', { bold: true, size: 7 });
  pdf.row('Stand Meter Awal', standAwal.toString());
  pdf.row('Stand Meter Akhir', standAkhir.toString());
  pdf.row('Pemakaian', `${pemakaian} kWh`);
  pdf.row(`Tarif/kWh`, rupiahRaw(tarifListrik));
  pdf.row('Biaya Listrik', rupiahRaw(total));
  if (denda > 0) pdf.row('Denda Keterlambatan', rupiahRaw(denda));
  pdf.row('Biaya Administrasi', rupiahRaw(biayaAdmin));
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL TAGIHAN', rupiahRaw(grandTotal), { bold: true, size: 9 });
  pdf.blank(2);
  pdf.row('Status', 'LUNAS');
  pdf.row('Kasir', `PLN-${pick(CASHIERS)}`);
  pdf.blank(5);
  pdf.text('Terima kasih atas pembayaran Anda', { align: 'center', size: 6 });
  pdf.text('Bayar tepat waktu hindari denda', { align: 'center', size: 6 });
  pdf.text('www.pln.co.id | 123', { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noTrx);

  return pdf;
}

function genUtilInternet() {
  const d = now();
  const providers = [
    { name: 'INDIHOME', company: 'PT TELKOM INDONESIA (PERSERO) TBK', logo: 'indihome.png', addr: 'Jl. Japati No.1, Bandung', npwp: '01.000.398.5-091.000' },
    { name: 'BIZNET', company: 'PT BIZNET NETWORKS', logo: 'biznet.png', addr: 'Gedung Biznet, Jakarta Selatan', npwp: '02.186.436.2-091.000' },
  ];
  const p = pick(providers);
  const noPelanggan = `${randInt(10000000, 99999999)}`;
  const nama = fakeName();
  const paket = pick(['50 Mbps', '100 Mbps', '150 Mbps', '200 Mbps', '300 Mbps']);
  const harga = pick([275000, 320000, 380000, 450000, 575000, 750000, 900000]);
  const ppn = Math.floor(harga * 0.11);
  const biayaAdmin = 5000;
  const total = harga + ppn + biayaAdmin;
  const bulan = fmtMonthYear(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const noTrx = `INV${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;
  const jatuhTempo = new Date(d.getFullYear(), d.getMonth(), randInt(10, 20));

  const pdf = new ReceiptPDF();
  pdf.logoCenter(p.logo, 90);
  pdf.blank(2);
  pdf.text(p.company, { align: 'center', size: 7, bold: true });
  pdf.text(p.addr, { align: 'center', size: 6 });
  pdf.text(`NPWP: ${p.npwp}`, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('TAGIHAN INTERNET BULANAN', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('No. Invoice', noTrx);
  pdf.row('Tanggal', fmtDate(d));
  pdf.row('Jatuh Tempo', fmtDate(jatuhTempo));
  pdf.row('Periode', bulan);
  pdf.blank(2);
  pdf.divider();
  pdf.text('DATA PELANGGAN', { bold: true, size: 7 });
  pdf.row('No. Pelanggan', noPelanggan);
  pdf.row('Nama', nama);
  pdf.row('Paket', p.name + ' ' + paket);
  pdf.blank(3);
  pdf.divider();
  pdf.text('RINCIAN TAGIHAN', { bold: true, size: 7 });
  pdf.row(`Langganan ${paket}`, rupiahRaw(harga));
  pdf.row('PPN 11%', rupiahRaw(ppn));
  pdf.row('Biaya Admin', rupiahRaw(biayaAdmin));
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL TAGIHAN', rupiahRaw(total), { bold: true, size: 9 });
  pdf.blank(2);
  pdf.row('Status', 'LUNAS');
  pdf.row('Pembayaran', pick(['Auto-Debit BCA', 'Virtual Account', 'Transfer']));
  pdf.blank(5);
  pdf.text(`Layanan Pelanggan: 147 (${p.name})`, { align: 'center', size: 6 });
  pdf.text(`www.${p.name.toLowerCase()}.co.id`, { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noTrx);

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
    ['Paket Unlimited 7hr', 25000], ['Paket Combo 25GB+Min', 70000],
  ]);
  const [namaProduk, harga] = produk;
  const noTrx = `TRX${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${randInt(1000000, 9999999)}`;
  const sn = `${randInt(100000000000, 999999999999)}`;

  const pdf = new ReceiptPDF();
  pdf.logoCenter(op.logo, 80);
  pdf.blank(2);
  pdf.text(`PT ${op.name.toUpperCase()} INDONESIA`, { align: 'center', size: 7, bold: true });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('BUKTI PEMBELIAN PULSA / PAKET', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('No. Transaksi', noTrx);
  pdf.row('Tanggal', fmtDateTime(d));
  pdf.blank(2);
  pdf.divider();
  pdf.text('DETAIL PEMBELIAN', { bold: true, size: 7 });
  pdf.row('Nomor', noHP);
  pdf.row('Operator', op.name);
  pdf.row('Produk', namaProduk);
  pdf.row('S/N', sn);
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.row('HARGA', rupiahRaw(harga), { bold: true, size: 9 });
  pdf.blank(2);
  pdf.text(`Pembayaran: ${pick(['Tunai', 'OVO', 'GoPay', 'DANA', 'ShopeePay'])}`, { size: 7 });
  pdf.row('Status', 'BERHASIL');
  pdf.blank(5);
  pdf.text('Simpan struk ini sebagai bukti pembelian', { align: 'center', size: 6 });
  pdf.text(`Layanan: ${op.name} 188`, { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noTrx);

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
  pdf.text(pdam.toUpperCase(), { align: 'center', size: 9, bold: true });
  pdf.text('PERUSAHAAN DAERAH AIR MINUM', { align: 'center', size: 7 });
  pdf.text(`${fakeCity()}`, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('BUKTI PEMBAYARAN AIR BERSIH', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('No. Transaksi', noTrx);
  pdf.row('Tanggal Bayar', fmtDateTime(d));
  pdf.row('Periode', bulan);
  pdf.blank(2);
  pdf.divider();
  pdf.text('DATA PELANGGAN', { bold: true, size: 7 });
  pdf.row('No. Pelanggan', noPel);
  pdf.row('Nama', nama);
  pdf.row('Golongan', gol);
  pdf.blank(3);
  pdf.divider();
  pdf.text('RINCIAN PEMAKAIAN', { bold: true, size: 7 });
  pdf.row('Stand Meter Awal', standAwal.toString());
  pdf.row('Stand Meter Akhir', standAkhir.toString());
  pdf.row('Pemakaian', `${pemakaian} m³`);
  pdf.row('Tarif/m³', rupiahRaw(tarifPerM3));
  pdf.row('Biaya Air', rupiahRaw(total));
  if (denda > 0) pdf.row('Denda', rupiahRaw(denda));
  pdf.row('Biaya Admin', rupiahRaw(biayaAdmin));
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL TAGIHAN', rupiahRaw(grandTotal), { bold: true, size: 9 });
  pdf.row('Status', 'LUNAS');
  pdf.blank(5);
  pdf.text('Terima kasih atas pembayaran Anda', { align: 'center', size: 6 });
  pdf.text('Hemat air untuk masa depan', { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noTrx);

  return pdf;
}

function genUtilities() { return pick([genUtilPLN, genUtilInternet, genUtilPulsa, genUtilPDAM])(); }

// ─── Healthcare ─────────────────────────────────────────────────────────────

function genHealthApotek() {
  const d = now();
  const apoteks = [
    { name: 'APOTEK KIMIA FARMA', company: 'PT KIMIA FARMA TBK', logo: 'kimia_farma.png', npwp: '01.001.608.5-091.000' },
    { name: 'APOTEK GUARDIAN', company: 'PT HERO PHARMACO INDONESIA', logo: 'guardian.png', npwp: '01.735.775.1-091.000' },
    { name: 'CENTURY PHARMACY', company: 'PT CENTURY HEALTHCARE', logo: null, npwp: '01.894.435.7-091.000' },
  ];
  const a = pick(apoteks);
  const noNota = `FA${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;
  const nama = fakeName();
  const apoteker = `${pick(FIRST_NAMES)} ${pick(['S.Farm', 'Apt.', 'S.Kom'])}`;

  const obat = [
    ['AMOXICILLIN 500MG', '10 KAPLET', 15000], ['PARACETAMOL 500MG', '10 TABLET', 8000],
    ['BODREX TAB', '4 TABLET', 6500], ['ANTANGIN JRG CAIR', '5 SACHET', 7500],
    ['VIT-C 1000MG EFFERVESCENT', '10 TABLET', 25000], ['OMEPRAZOLE 20MG', '10 KAPLET', 18000],
    ['CETIRIZINE 10MG', '10 TABLET', 14000], ['INSTO EYE DROP 7.5ML', '1 BOTOL', 16000],
    ['BETADINE 15ML', '1 BOTOL', 19500], ['MIXAGRIPLU TAB', '4 TABLET', 18000],
    ['DECOLGEN TAB', '10 TABLET', 12000], ['NEOZEP FORTE', '4 TABLET', 6000],
    ['PANADOL EXTRA', '10 KAPLET', 22000], ['DULCOLAX TAB 5MG', '10 TABLET', 28000],
    ['SALONPAS HOT 10S', '1 PAK', 32000], ['VICKS VAPORUB 50G', '1 POT', 35000],
  ];

  const pdf = new ReceiptPDF();
  if (a.logo) pdf.logoCenter(a.logo, 80);
  else pdf.text(a.name, { align: 'center', size: 10, bold: true });
  pdf.text(a.company, { align: 'center', size: 6 });
  pdf.text(`${fakeStreet()}, ${fakeCity()}`, { align: 'center', size: 6 });
  pdf.text(`NPWP: ${a.npwp}`, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('NOTA APOTEK', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('No. Nota', noNota);
  pdf.row('Tanggal', fmtDateTime(d));
  pdf.row('Pasien', nama);
  pdf.blank(2);
  pdf.divider();

  const selected = sample(obat, randInt(2, 7));
  let subtotal = 0;
  for (const [nm, kemasan, harga] of selected) {
    const qty = randInt(1, 3);
    const lp = harga * qty;
    subtotal += lp;
    pdf.text(`${nm}`, { size: 7, bold: true });
    pdf.text(`${qty}x ${kemasan} @ ${rupiahRaw(harga)}`, { size: 7, indent: 5 });
    pdf.text(`${' '.repeat(30)}${rupiahRaw(lp)}`, { size: 7, align: 'right' });
  }

  pdf.divider();
  pdf.doubleDivider();
  pdf.row('TOTAL', rupiahRaw(subtotal), { bold: true, size: 9 });
  pdf.blank(2);
  pdf.text(`Pembayaran: ${pick(['Tunai', 'Debit BCA', 'GoPay', 'OVO'])}`, { size: 7 });
  pdf.blank(3);
  pdf.divider('dot');
  pdf.text(`Apoteker: ${apoteker}`, { align: 'center', size: 6 });
  pdf.text('Obat yang sudah dibeli tidak dapat dikembalikan', { align: 'center', size: 6 });
  pdf.text('Simpan nota untuk klaim asuransi', { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noNota);

  return pdf;
}

function genHealthKlinik() {
  const d = now();
  const klinik = pick(['KLINIK MITRA KELUARGA', 'KLINIK UTAMA', 'RUMAH SAKIT HERMINA', 'KLINIK PRATAMA MEDIKA']);
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
  pdf.text(klinik, { align: 'center', size: 9, bold: true });
  pdf.text(`${fakeStreet()}, ${fakeCity()}`, { align: 'center', size: 6 });
  pdf.text(`Telp: ${fakePhone()}`, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('KUITANSI PEMBAYARAN', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('No. Registrasi', noReg);
  pdf.row('Tanggal', fmtDateTime(d));
  pdf.row('Nama Pasien', nama);
  pdf.row('Dokter', dokter);
  pdf.blank(3);
  pdf.divider();
  pdf.text('RINCIAN BIAYA', { bold: true, size: 7 });
  pdf.row(layanan[0], rupiahRaw(layanan[1]));
  if (obat) pdf.row(obat[0], rupiahRaw(obat[1]));
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL', rupiahRaw(total), { bold: true, size: 9 });
  pdf.row('Pembayaran', pick(['Tunai', 'BPJS', 'Asuransi', 'Kartu Kredit']));
  pdf.row('Status', 'LUNAS');
  pdf.blank(5);
  pdf.text('Terima kasih, semoga lekas sembuh', { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noReg);

  return pdf;
}

function genHealthcare() { return pick([genHealthApotek, genHealthKlinik, genHealthApotek])(); }

// ─── Entertainment ──────────────────────────────────────────────────────────

function genEntCinema() {
  const d = now();
  const cinemas = [
    { name: 'XXI', logo: 'xxi.png', company: 'PT NUSANTARA SEJAHTERA RAYA' },
    { name: 'CGV', logo: 'cgv.png', company: 'PT CGV CINEMAS INDONESIA' },
  ];
  const c = pick(cinemas);
  const mall = `${fakeCity()} ${pick(['Town Square', 'Mall', 'Plaza', 'Central Park', 'City Walk'])}`;
  const film = pick(['Avengers: Secret Wars', 'Spider-Man: Beyond', 'The Batman Part II', 'Fast X Part 2', 'Jurassic World: Rebirth', 'Inside Out 3', 'Moana 2']);
  const jam = pick(['10:30', '12:45', '13:15', '15:30', '17:45', '19:30', '20:15', '21:45']);
  const studio = pick(['Studio 1', 'Studio 2', 'Studio 3', 'Studio 5', 'IMAX', 'PREMIERE']);
  const kursi = `${pick(['A', 'B', 'C', 'D', 'E', 'F', 'G'])}${randInt(1, 15)}`;
  const tiket = randInt(1, 4);
  const hargaTiket = pick([45000, 50000, 55000, 60000, 75000, 100000]);
  const subtotal = tiket * hargaTiket;
  const makanan = pick([null, null, ['Popcorn Large + 2 Drink', randInt(75000, 120000)]]);
  const total = subtotal + (makanan ? makanan[1] : 0);
  const noTrx = `${c.name}${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;
  const bookingId = `${randInt(100000000, 999999999)}`;

  const pdf = new ReceiptPDF();
  pdf.logoCenter(c.logo, 80);
  pdf.blank(2);
  pdf.text(c.company, { align: 'center', size: 6 });
  pdf.text(mall, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('E-TICKET / INVOICE', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('Booking ID', bookingId);
  pdf.row('No. Transaksi', noTrx);
  pdf.row('Tanggal', fmtDate(d));
  pdf.blank(2);
  pdf.divider();
  pdf.text('DETAIL TIKET', { bold: true, size: 7 });
  pdf.row('Film', film);
  pdf.row('Studio', studio);
  pdf.row('Jam Tayang', jam);
  pdf.row('Kursi', tiket > 1 ? `${tiket} tiket (${kursi} dkk)` : kursi);
  pdf.row('Harga/tiket', rupiahRaw(hargaTiket));
  pdf.row(`${tiket} tiket`, rupiahRaw(subtotal));
  if (makanan) {
    pdf.blank(2);
    pdf.text('F&B', { bold: true, size: 7 });
    pdf.row(makanan[0], rupiahRaw(makanan[1]));
  }
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL', rupiahRaw(total), { bold: true, size: 9 });
  pdf.row('Pembayaran', pick(['Kartu Kredit', 'GoPay', 'OVO', 'DANA']));
  pdf.blank(5);
  pdf.text('Tunjukkan e-ticket ini di pintu masuk', { align: 'center', size: 6 });
  pdf.text(`${c.name} — ${c.name === 'XXI' ? '21 Cineplex' : 'Cinema XXI'}`, { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(bookingId);

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
  const periodeMulai = new Date(d.getFullYear(), d.getMonth(), 1);
  const periodeAkhir = new Date(d.getFullYear(), d.getMonth() + 1, 0);

  const pdf = new ReceiptPDF();
  pdf.logoCenter(p.logo, 80);
  pdf.blank(2);
  pdf.text(p.company, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('INVOICE / TAGIHAN', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('Invoice No', noInv);
  pdf.row('Tanggal', fmtDate(d));
  pdf.blank(2);
  pdf.divider();
  pdf.text('DETAIL LANGGANAN', { bold: true, size: 7 });
  pdf.row('Layanan', `${p.name} — ${p.plan}`);
  pdf.row('Periode', `${fmtDate(periodeMulai)} — ${fmtDate(periodeAkhir)}`);
  pdf.row('Email', akun);
  pdf.blank(3);
  pdf.divider();
  pdf.text('RINCIAN TAGIHAN', { bold: true, size: 7 });
  pdf.row(`Langganan ${p.plan}`, rupiahRaw(p.harga));
  pdf.row('PPN 11%', rupiahRaw(ppn));
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL', rupiahRaw(total), { bold: true, size: 9 });
  pdf.row('Pembayaran', pick(['Kartu Kredit', 'GoPay', 'DANA', 'ShopeePay']));
  pdf.row('Status', 'LUNAS');
  pdf.blank(5);
  pdf.text(`Terima kasih berlangganan ${p.name}!`, { align: 'center', size: 6 });
  pdf.text(`${p.name.toLowerCase()}.com`, { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noInv);

  return pdf;
}

function genEntertainment() { return pick([genEntCinema, genEntStreaming])(); }

// ─── Shopping ───────────────────────────────────────────────────────────────

function genShopEcommerce() {
  const d = now();
  const platforms = [
    { name: 'SHOPEE', company: 'PT SHOPEE INTERNATIONAL INDONESIA', logo: 'shopee.png', npwp: '02.266.142.0-091.000' },
    { name: 'TOKOPEDIA', company: 'PT TOKOPEDIA', logo: 'tokopedia.png', npwp: '02.263.995.1-091.000' },
  ];
  const p = pick(platforms);
  const noInv = `${p.name.substring(0, 3).toUpperCase()}${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;
  const nama = fakeName();
  const alamat = `${fakeStreet()}, ${fakeCity()}`;
  const ekspedisi = pick(['JNE Regular', 'SiCepat REG', 'AnterAja', 'J&T Express', 'Pos Indonesia']);
  const noResi = `${pick(['JNE', 'SCT', 'ANT', 'JNT', 'POS'])}${randInt(1000000000, 9999999999)}`;

  const items = [
    ['Kaos Polos Cotton Combed 30s', 75000], ['Celana Chino Pria Slim Fit', 150000],
    ['Tas Ransel Laptop 15.6"', 185000], ['Charger USB-C 65W GaN', 120000],
    ['Mouse Wireless Logitech M240', 189000], ['Earphone TWS Bluetooth 5.3', 95000],
    ['Kemeja Flannel Pria Lengan Panjang', 135000], ['Tumbler Stainless 500ml', 65000],
    ['Phone Case Soft TPU Clear', 35000], ['LED Strip RGB 5 Meter', 48000],
  ];
  const selected = sample(items, randInt(1, 4));
  let subtotal = 0;
  const qtyMap = new Map();
  for (const [name, price] of selected) {
    const qty = randInt(1, 2);
    qtyMap.set(name, { price, qty });
    subtotal += price * qty;
  }
  const ongkir = pick([0, 0, 15000, 20000, 25000, 30000]);
  const asuransi = pick([0, 1500, 2500]);
  const diskon = pick([0, 0, 0, randInt(5000, 20000)]);
  const total = subtotal + ongkir + asuransi - diskon;

  const pdf = new ReceiptPDF();
  pdf.logoCenter(p.logo, 80);
  pdf.blank(2);
  pdf.text(p.company, { align: 'center', size: 6 });
  pdf.text(`NPWP: ${p.npwp}`, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('INVOICE PEMBELIAN', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('No. Invoice', noInv);
  pdf.row('Tanggal', fmtDateTime(d));
  pdf.blank(2);
  pdf.divider();
  pdf.text('PENERIMA', { bold: true, size: 7 });
  pdf.row('Nama', nama);
  pdf.row('Alamat', alamat.substring(0, 40));
  pdf.row('Pengiriman', ekspedisi);
  pdf.row('No. Resi', noResi);
  pdf.blank(3);
  pdf.divider();
  pdf.text('DETAIL PESANAN', { bold: true, size: 7 });
  for (const [name, { price, qty }] of qtyMap) {
    pdf.text(`${name}`, { size: 7 });
    pdf.text(`${qty}x ${rupiahRaw(price)} = ${rupiahRaw(price * qty)}`, { size: 7, indent: 5 });
  }
  pdf.blank(2);
  pdf.divider();
  pdf.row('Subtotal', rupiahRaw(subtotal));
  if (ongkir > 0) pdf.row('Ongkos Kirim', rupiahRaw(ongkir));
  if (asuransi > 0) pdf.row('Asuransi Pengiriman', rupiahRaw(asuransi));
  if (diskon > 0) pdf.row('Diskon/Free Ongkir', `-${rupiahRaw(diskon)}`);
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL PEMBAYARAN', rupiahRaw(total), { bold: true, size: 9 });
  pdf.row('Pembayaran', pick(['GoPay', 'OVO', 'DANA', 'Transfer BCA', 'Virtual Account']));
  pdf.row('Status', 'DIBAYAR');
  pdf.blank(5);
  pdf.text('Terima berbelanja!', { align: 'center', size: 6 });
  pdf.text(`${p.name.toLowerCase()}.co.id`, { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noInv);

  return pdf;
}

function genShopMall() {
  const d = now();
  const stores = [
    { name: 'ZARA', company: 'PT INDITEX INDONESIA', logo: 'zara.png' },
    { name: 'H&M', company: 'PT HENNES & MAURITZ INDONESIA', logo: 'hm.png' },
    { name: 'UNIQLO', company: 'PT FAST RETAILING INDONESIA', logo: 'uniqlo.png' },
    { name: 'MATAHARI', company: 'PT MATAHARI DEPARTMENT STORE TBK', logo: 'matahari.png' },
  ];
  const s = pick(stores);
  const mall = `${fakeCity()} ${pick(['Mall', 'Plaza', 'Central Park', 'Grand Indonesia', 'Pacific Place'])}`;
  const noNota = `${randInt(100000, 999999)}/${pick(['A', 'B', 'C'])}`;
  const kasir = pick(CASHIERS);
  const items = [
    ['Kemeja Flannel Lengan Panjang', 299000], ['Kaos Polo Pria', 199000],
    ['Celana Jeans Slim Fit', 399000], ['Jaket Hoodie Zipper', 349000],
    ['Sepatu Sneakers Canvas', 499000], ['Parfum EDT 100ml', 259000],
    ['Dress Wanita Casual', 329000], ['Rok Plisket Midi', 189000],
    ['Tas Selempang Kulit', 449000], ['Topi Baseball Cap', 129000],
  ];
  const selected = sample(items, randInt(1, 4));
  let subtotal = 0;
  for (const [, price] of selected) subtotal += price;
  const member = pick([null, null, 'MEMBER', 'MEMBER']);
  const diskonMember = member ? Math.floor(subtotal * pick([0.05, 0.10, 0.15])) : 0;
  const total = subtotal - diskonMember;
  const bayar = Math.ceil(total / 50000) * 50000;
  const kembali = bayar - total;

  const pdf = new ReceiptPDF();
  pdf.logoCenter(s.logo, 80);
  pdf.blank(2);
  pdf.text(s.company, { align: 'center', size: 6 });
  pdf.text(mall, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('NOTA PENJUALAN', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('No. Nota', noNota);
  pdf.row('Tanggal', fmtDateTime(d));
  if (member) pdf.row('Member', `${member} - ${randInt(10000000, 99999999)}`);
  pdf.blank(2);
  pdf.divider();

  for (const [name, price] of selected) {
    pdf.text(`${name}`, { size: 7 });
    pdf.text(`1  ${rupiahRaw(price)}`, { size: 7, indent: 5 });
  }
  pdf.blank(2);
  pdf.divider();
  pdf.row('Subtotal', rupiahRaw(subtotal));
  if (diskonMember > 0) pdf.row(`Diskon ${member} ${Math.floor(diskonMember / subtotal * 100)}%`, `-${rupiahRaw(diskonMember)}`);
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL', rupiahRaw(total), { bold: true, size: 9 });
  pdf.blank(2);
  pdf.row('Tunai', rupiahRaw(bayar));
  pdf.row('Kembali', rupiahRaw(kembali));
  pdf.row('Pembayaran', pick(['Tunai', 'Debit BCA', 'Kartu Kredit', 'GoPay']));
  pdf.blank(3);
  pdf.divider('dot');
  pdf.text(`Kasir: ${kasir}`, { align: 'center', size: 6 });
  pdf.text('Barang yang sudah dibeli tidak dapat ditukar', { align: 'center', size: 6 });
  pdf.text('kecuali ada perjanjian tertulis', { align: 'center', size: 6 });
  pdf.text('Tunjukkan nota untuk penukaran (7 hari)', { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noNota);

  return pdf;
}

function genShopMarket() {
  const d = now();
  const nama = fakeName();
  const items = [
    ['Beras Premium 5kg', 72000], ['Minyak Goreng 2L', 30000], ['Gula Pasir 1kg', 15500],
    ['Tepung Terigu 1kg', 12000], ['Telur 1kg', 28000], ['Ayam Potong 1kg', 38000],
    ['Daging Sapi 500g', 65000], ['Ikan Lele 1kg', 25000], ['Sayur Bayam 1 ikat', 4000],
    ['Tomat 500g', 8000], ['Cabai Merah 250g', 15000], ['Bawang Merah 500g', 18000],
  ];
  const selected = sample(items, randInt(4, 10));
  let subtotal = 0;
  for (const [, price] of selected) {
    subtotal += price + (Math.random() > 0.5 ? randInt(-2000, 2000) : 0);
  }
  const total = subtotal;
  const bayar = Math.ceil(total / 10000) * 10000;

  const pdf = new ReceiptPDF();
  pdf.text('PASAR TRADISIONAL', { align: 'center', size: 9, bold: true });
  pdf.text(`${fakeCity()}`, { align: 'center', size: 7 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('NOTA BELANJA', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('Tanggal', fmtDateTime(d));
  pdf.row('Pembeli', nama);
  pdf.blank(2);
  pdf.divider();

  for (const [name, price] of selected) {
    pdf.row(name, rupiahRaw(price));
  }
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL', rupiahRaw(total), { bold: true, size: 9 });
  pdf.row('Bayar', rupiahRaw(bayar));
  pdf.row('Kembali', rupiahRaw(bayar - total));
  pdf.blank(5);
  pdf.text('Terima kasih sudah berbelanja', { align: 'center', size: 6 });

  return pdf;
}

function genShopping() { return pick([genShopEcommerce, genShopMall, genShopMarket])(); }

// ─── Travel ─────────────────────────────────────────────────────────────────

function genTravelHotel() {
  const d = now();
  const hotels = [
    { name: 'HARRIS HOTEL', company: 'PT TIARA MEDIAWISATA', logo: null },
    { name: 'NOVOTEL', company: 'PT ACCOR INVESTMENT INTERNATIONAL', logo: null },
    { name: 'IBIS BUDGET', company: 'PT ACCOR INVESTMENT INTERNATIONAL', logo: null },
    { name: 'BEST WESTERN', company: 'PT BEST WESTERN INDONESIA', logo: null },
  ];
  const h = pick(hotels);
  const alamat = `${fakeStreet()}, ${fakeCity()}`;
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
  pdf.text(h.name, { align: 'center', size: 10, bold: true });
  pdf.text(h.company, { align: 'center', size: 6 });
  pdf.text(alamat, { align: 'center', size: 6 });
  pdf.text(`Telp: ${fakePhone()}`, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('INVOICE / FAKTUR', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('No. Invoice', noBooking);
  pdf.row('Tanggal Cetak', fmtDate(d));
  pdf.blank(2);
  pdf.divider();
  pdf.text('TAMU', { bold: true, size: 7 });
  pdf.row('Nama', nama);
  pdf.row('Check-in', fmtDate(checkin));
  pdf.row('Check-out', fmtDate(checkout));
  pdf.row(`${nights} Malam`, `${roomType}`);
  pdf.row('No. Kamar', `${randInt(1, 12)}${String(randInt(10, 35)).padStart(2, '0')}`);
  pdf.blank(3);
  pdf.divider();
  pdf.text('RINCIAN TAGIHAN', { bold: true, size: 7 });
  pdf.row(`${roomType} ${nights}x`, rupiahRaw(subtotal));
  pdf.row('Service Charge 10%', rupiahRaw(service));
  pdf.row('Pajak 11%', rupiahRaw(tax));
  if (minibar > 0) pdf.row('Minibar', rupiahRaw(minibar));
  if (laundry > 0) pdf.row('Laundry', rupiahRaw(laundry));
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL', rupiahRaw(total), { bold: true, size: 9 });
  pdf.row('Pembayaran', pick(['Kartu Kredit', 'Transfer', 'Tunai']));
  pdf.row('Status', 'LUNAS');
  pdf.blank(5);
  pdf.text('Terima kasih telah menginap bersama kami', { align: 'center', size: 6 });
  pdf.text(`www.${h.name.toLowerCase().replace(/ /g, '')}.com`, { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noBooking);

  return pdf;
}

function genTravelAirline() {
  const d = now();
  const airlines = [
    { name: 'LION AIR', company: 'PT LION MENTARI AIRLINES', logo: 'lion_air.png', code: 'JT' },
    { name: 'GARUDA INDONESIA', company: 'PT GARUDA INDONESIA (PERSERO) TBK', logo: 'garuda.png', code: 'GA' },
    { name: 'AIRASIA', company: 'PT AIRASIA INDONESIA', logo: 'airasia.png', code: 'QZ' },
  ];
  const a = pick(airlines);
  const nama = fakeName();
  const noBooking = `${a.code}${randInt(100000, 999999)}`;
  const routes = [
    ['CGK', 'Soekarno-Hatta', 'DPS', 'Ngurah Rai', 'Jakarta → Bali'],
    ['CGK', 'Soekarno-Hatta', 'SUB', 'Juanda', 'Jakarta → Surabaya'],
    ['CGK', 'Soekarno-Hatta', 'KNO', 'Kualanamu', 'Jakarta → Medan'],
    ['DPS', 'Ngurah Rai', 'CGK', 'Soekarno-Hatta', 'Bali → Jakarta'],
    ['SUB', 'Juanda', 'CGK', 'Soekarno-Hatta', 'Surabaya → Jakarta'],
  ];
  const [asal, bandaraAsal, tujuan, bandaraTujuan, rute] = pick(routes);
  const jam = pick(['06:00', '07:30', '08:15', '10:45', '13:00', '15:30', '17:00', '19:30', '21:15']);
  const durasi = randInt(1, 3) + 'j ' + randInt(10, 50) + 'm';
  const kelas = pick(['Economy', 'Economy', 'Economy', 'Premium Economy', 'Business']);
  const hargaTiket = pick([650000, 850000, 1200000, 1500000, 2000000, 3500000]);
  const airportTax = 150000;
  const fuelSurcharge = Math.floor(hargaTiket * 0.12);
  const insurance = pick([0, 25000, 35000]);
  const total = hargaTiket + airportTax + fuelSurcharge + insurance;

  const pdf = new ReceiptPDF();
  pdf.logoCenter(a.logo, 80);
  pdf.blank(2);
  pdf.text(a.company, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('E-TICKET / BOARDING PASS', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('Booking Ref', noBooking);
  pdf.row('Tanggal', fmtDate(d));
  pdf.blank(2);
  pdf.divider();
  pdf.text('PENUMPANG', { bold: true, size: 7 });
  pdf.row('Nama', nama);
  pdf.row('Kelas', kelas);
  pdf.blank(3);
  pdf.divider();
  pdf.text('PENERBANGAN', { bold: true, size: 7 });
  pdf.text(`Rute: ${rute}`, { size: 7 });
  pdf.row('Bandara Asal', `${bandaraAsal} (${asal})`);
  pdf.row('Bandara Tujuan', `${bandaraTujuan} (${tujuan})`);
  pdf.row('Jam Berangkat', jam);
  pdf.row('Durasi', durasi);
  pdf.row('No. Penerbangan', `${a.code}${randInt(100, 999)}`);
  pdf.blank(3);
  pdf.divider();
  pdf.text('RINCIAN HARGA', { bold: true, size: 7 });
  pdf.row('Harga Tiket', rupiahRaw(hargaTiket));
  pdf.row('Airport Tax', rupiahRaw(airportTax));
  pdf.row('Fuel Surcharge', rupiahRaw(fuelSurcharge));
  if (insurance > 0) pdf.row('Asuransi', rupiahRaw(insurance));
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL', rupiahRaw(total), { bold: true, size: 9 });
  pdf.row('Pembayaran', pick(['Kartu Kredit', 'Transfer', 'Virtual Account', 'Traveloka']));
  pdf.row('Status', 'ISSUED');
  pdf.blank(5);
  pdf.text('Harap tiba di bandara 2 jam sebelum keberangkatan', { align: 'center', size: 6 });
  pdf.text('Tunjukkan e-ticket & identitas diri saat check-in', { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noBooking);

  return pdf;
}

function genTravel() { return pick([genTravelHotel, genTravelAirline])(); }

// ─── Education ──────────────────────────────────────────────────────────────

function genEduCourse() {
  const d = now();
  const kursus = [
    { name: 'EF ENGLISH FIRST', company: 'PT EF EDUCATION INDONESIA', logo: 'gramedia.png' },
    { name: 'PRIMAGAMA', company: 'PT PRIMAGAMA UTAMA', logo: 'gramedia.png' },
    { name: 'LIA LANGUAGE CENTRE', company: 'YAYASAN LIA', logo: 'gramedia.png' },
  ];
  const k = pick(kursus);
  const nama = fakeName();
  const noKwitansi = `KW${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;
  const programs = [
    ['English Basic 3 Bulan', 2500000, '12 pertemuan x 90 menit'],
    ['IELTS Preparation 4 Bulan', 3500000, '16 pertemuan x 120 menit'],
    ['TOEFL Intensive 2 Bulan', 2800000, '8 pertemuan x 120 menit'],
    ['General English 6 Bulan', 4200000, '24 pertemuan x 90 menit'],
    ['Conversation Class 3 Bulan', 1800000, '12 pertemuan x 60 menit'],
  ];
  const [prog, harga, detail] = pick(programs);
  const ppn = Math.floor(harga * 0.11);
  const diskon = pick([0, 0, 0, Math.floor(harga * 0.1)]);
  const total = harga + ppn - diskon;

  const pdf = new ReceiptPDF();
  pdf.logoCenter(k.logo, 80);
  pdf.blank(2);
  pdf.text(k.company, { align: 'center', size: 6 });
  pdf.text(`${fakeStreet()}, ${fakeCity()}`, { align: 'center', size: 6 });
  pdf.text(`Telp: ${fakePhone()}`, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('KUITANSI PEMBAYARAN', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('No. Kwitansi', noKwitansi);
  pdf.row('Tanggal', fmtDate(d));
  pdf.blank(2);
  pdf.divider();
  pdf.text('DATA SISWA', { bold: true, size: 7 });
  pdf.row('Nama', nama);
  pdf.row('No. HP', fakePhone());
  pdf.blank(3);
  pdf.divider();
  pdf.text('DETAIL PROGRAM', { bold: true, size: 7 });
  pdf.row('Program', prog);
  pdf.row('Detail', detail);
  pdf.row('Mulai', fmtDate(d));
  pdf.blank(3);
  pdf.divider();
  pdf.text('RINCIAN BIAYA', { bold: true, size: 7 });
  pdf.row('Biaya Program', rupiahRaw(harga));
  pdf.row('PPN 11%', rupiahRaw(ppn));
  if (diskon > 0) pdf.row('Diskon', `-${rupiahRaw(diskon)}`);
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL', rupiahRaw(total), { bold: true, size: 9 });
  pdf.row('Pembayaran', pick(['Transfer BCA', 'Transfer Mandiri', 'Tunai', 'Kartu Kredit']));
  pdf.row('Status', 'LUNAS');
  pdf.blank(5);
  pdf.text('Terima kasih atas pembayaran Anda', { align: 'center', size: 6 });
  pdf.text('Simpan kwitansi ini sebagai bukti pembayaran', { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noKwitansi);

  return pdf;
}

function genEduBook() {
  const d = now();
  const stores = [
    { name: 'GRAMEDIA', company: 'PT GRAMEDIA ASRI MEDIA', logo: 'gramedia.png' },
    { name: 'KINOKUNIYA', company: 'PT KINOKUNIYA INDONESIA', logo: 'gramedia.png' },
  ];
  const s = pick(stores);
  const mall = `${fakeCity()} ${pick(['Mall', 'Plaza', 'Central'])}`;
  const noNota = `${randInt(100000, 999999)}`;
  const kasir = pick(CASHIERS);
  const books = [
    ['Atomic Habits — James Clear', 120000], ['Rich Dad Poor Dad — Kiyosaki', 95000],
    ['Sapiens — Yuval Harari', 145000], ['Clean Code — Robert Martin', 250000],
    ['Deep Work — Cal Newport', 105000], ['Laskar Pelangi — A. Hirata', 68000],
    ['Bumi Manusia — Pramoedya', 89000], ['Negeri 5 Menara — A. Fuadi', 79000],
    ['Thinking Fast & Slow — Kahneman', 135000], ['The Psychology of Money', 115000],
  ];
  const selected = sample(books, randInt(1, 5));
  let subtotal = 0;
  for (const [, price] of selected) subtotal += price;
  const member = pick([null, 'GRATIS 5%']);
  const diskon = member ? Math.floor(subtotal * 0.05) : 0;
  const total = subtotal - diskon;

  const pdf = new ReceiptPDF();
  pdf.logoCenter(s.logo, 80);
  pdf.blank(2);
  pdf.text(s.company, { align: 'center', size: 6 });
  pdf.text(mall, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('NOTA PENJUALAN', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('No. Nota', noNota);
  pdf.row('Tanggal', fmtDateTime(d));
  pdf.blank(2);
  pdf.divider();

  for (const [name, price] of selected) {
    pdf.text(`${name}`, { size: 7 });
    pdf.text(`1  ${rupiahRaw(price)}`, { size: 7, indent: 5 });
  }
  pdf.blank(2);
  pdf.divider();
  pdf.row('Subtotal', rupiahRaw(subtotal));
  if (diskon > 0) pdf.row('Diskon Member', `-${rupiahRaw(diskon)}`);
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL', rupiahRaw(total), { bold: true, size: 9 });
  pdf.row('Pembayaran', pick(['Tunai', 'Debit', 'GoPay', 'OVO']));
  pdf.blank(3);
  pdf.divider('dot');
  pdf.text(`Kasir: ${kasir}`, { align: 'center', size: 6 });
  pdf.text('Barang yang sudah dibeli tidak dapat ditukar/dikembalikan', { align: 'center', size: 6 });
  pdf.text(`www.${s.name.toLowerCase()}.co.id`, { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noNota);

  return pdf;
}

function genEducation() { return pick([genEduCourse, genEduBook])(); }

// ─── Subscriptions ──────────────────────────────────────────────────────────

function genSubSoftware() {
  const d = now();
  const softwares = [
    { name: 'MICROSOFT 365', company: 'PT MICROSOFT INDONESIA', harga: 1199000, logo: 'microsoft.png', plan: pick(['Personal', 'Family']) },
    { name: 'ADOBE CREATIVE CLOUD', company: 'Adobe Inc.', harga: 899000, logo: 'adobe.png', plan: pick(['Photography', 'All Apps']) },
    { name: 'CANVA PRO', company: 'Canva Pty Ltd', harga: 749000, logo: 'canva.png', plan: 'Pro' },
  ];
  const s = pick(softwares);
  const noInv = `INV-${s.name.substring(0, 3).toUpperCase()}-${d.getFullYear()}${randInt(10000, 99999)}`;
  const ppn = Math.floor(s.harga * 0.11);
  const total = s.harga + ppn;
  const periodeStart = new Date(d.getFullYear(), d.getMonth(), 1);
  const periodeEnd = new Date(d.getFullYear() + 1, d.getMonth(), 0);

  const pdf = new ReceiptPDF();
  pdf.logoCenter(s.logo, 80);
  pdf.blank(2);
  pdf.text(s.company, { align: 'center', size: 6 });
  pdf.blank(3);
  pdf.doubleDivider();
  pdf.text('INVOICE / TAGIHAN', { align: 'center', size: 8, bold: true });
  pdf.divider();
  pdf.blank(2);

  pdf.row('Invoice No', noInv);
  pdf.row('Tanggal', fmtDate(d));
  pdf.blank(2);
  pdf.divider();
  pdf.text('DETAIL LANGGANAN', { bold: true, size: 7 });
  pdf.row('Produk', `${s.name}`);
  pdf.row('Plan', s.plan);
  pdf.row('Periode', `${fmtDate(periodeStart)} — ${fmtDate(periodeEnd)}`);
  pdf.row('Email', fakeEmail());
  pdf.blank(3);
  pdf.divider();
  pdf.text('RINCIAN', { bold: true, size: 7 });
  pdf.row(`Langganan Tahunan`, rupiahRaw(s.harga));
  pdf.row('PPN 11%', rupiahRaw(ppn));
  pdf.blank(2);
  pdf.doubleDivider();
  pdf.row('TOTAL', rupiahRaw(total), { bold: true, size: 9 });
  pdf.row('Pembayaran', pick(['Kartu Kredit', 'PayPal', 'GoPay']));
  pdf.row('Status', 'LUNAS');
  pdf.blank(5);
  pdf.text('Terima kasih atas pembelian Anda', { align: 'center', size: 6 });
  pdf.text(`${s.name.toLowerCase().replace(/ /g, '')}.com`, { align: 'center', size: 6 });
  pdf.blank(5);
  pdf.barcode(noInv);

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
