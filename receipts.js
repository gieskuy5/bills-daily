#!/usr/bin/env node
/**
 * BillsOnChain — Receipt PDF Generator v4
 * Style: Realistic Indonesian thermal receipt
 * - Centered store header with logo
 * - Dashed line separators
 * - Monospace item rows with right-aligned prices
 * - Clean font hierarchy
 * - Authentic Indonesian receipt format
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
const now = () => { const d = new Date(); d.setDate(d.getDate() - (Math.floor(Math.random() * 7) + 1)); return d; };
const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
const fmtDateEn = (d) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};
const fmtDateTime = (d) => `${fmtDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
const fmtTime = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const fmtMonthYear = (d) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};

// ─── Thermal Receipt PDF Builder (80mm thermal paper) ─────────────────────
class ReceiptPDF {
  constructor(opts = {}) {
    // 80mm thermal paper = ~226pt wide, variable height
    this.W = 226;
    this.lx = 8;   // left margin
    this.rx = this.W - 8;  // right margin
    this.colW = this.W - 16;  // content width
    this.cx = this.W / 2;    // center
    this.y = 10;
    this.doc = new PDFDocument({
      size: [this.W, 841.89],  // narrow thermal, A4 height (will auto-expand)
      margins: { top: 10, bottom: 10, left: this.lx, right: this.lx },
    });
    this._receiptDate = null;  // set by generators
  }

  // ── Centered text ──
  _center(text, y, font = 'Courier', size = 7, color = '#000') {
    this.doc.font(font).fontSize(size).fillColor(color);
    this.doc.text(String(text), this.lx, y, { width: this.colW, align: 'center' });
  }

  // ── Left-right row ──
  _row(left, right, y, font = 'Courier', size = 7, color = '#000') {
    this.doc.font(font).fontSize(size).fillColor(color);
    this.doc.text(String(left), this.lx, y, { width: 130, align: 'left' });
    this.doc.text(String(right), this.lx, y, { width: this.colW, align: 'right' });
  }

  // ── Key-value row ──
  _kv(label, value) {
    this.doc.font('Courier').fontSize(6.5).fillColor('#000');
    this.doc.text(String(label), this.lx, this.y, { width: 52, align: 'left' });
    this.doc.text(String(value), this.lx + 52, this.y, { width: this.colW - 52, align: 'left' });
    this.y += 9;
  }

  // ── Dashed separator ──
  _dash() {
    this._center('-------------------------------------------', this.y, 'Courier', 6);
    this.y += 8;
  }

  // ── Solid line ──
  _line() {
    this._center('===========================================', this.y, 'Courier', 6);
    this.y += 8;
  }

  // ── Double line ──
  _dline() {
    this._center('===========================================', this.y, 'Courier', 6);
    this.y += 3;
    this._center('===========================================', this.y, 'Courier', 6);
    this.y += 8;
  }

  // ── Store header: logo + name + address (all centered) ──
  storeHeader(logoFile, storeName, address, extraLines = []) {
    if (logoFile) {
      const fp = path.join(LOGO_DIR, logoFile);
      if (fs.existsSync(fp)) {
        const logoW = 90;
        this.doc.image(fp, this.cx - logoW / 2, this.y, { width: logoW });
        this.y += 72;
      }
    }

    this._center(storeName, this.y, 'Helvetica-Bold', 8);
    this.y += 11;

    for (const line of address) {
      this._center(line, this.y, 'Courier', 5.5, '#333');
      this.y += 8;
    }
    for (const line of extraLines) {
      this._center(line, this.y, 'Courier', 5, '#555');
      this.y += 7;
    }

    this._line();
  }

  // ── Transaction info ──
  transInfo(pairs) {
    for (const [label, value] of pairs) {
      this._kv(label, value);
    }
    this._dash();
  }

  // ── Items list ──
  itemsList(items, showQty = true) {
    for (const item of items) {
      const qty = item.qty || 1;
      const total = item.total || item.price * qty;

      if (showQty && qty > 1) {
        // Qty x Name
        this.doc.font('Courier').fontSize(6.5).fillColor('#000');
        this.doc.text(`${qty}x ${item.name}`, this.lx, this.y, { width: 140, align: 'left' });
        this.doc.text(`${rupiahRaw(total)}`, this.lx, this.y, { width: this.colW, align: 'right' });
        this.y += 9;
        // Unit price
        this.doc.font('Courier').fontSize(5.5).fillColor('#555');
        this.doc.text(`  @${rupiahRaw(item.price)}`, this.lx, this.y, { width: 140, align: 'left' });
        this.y += 8;
      } else {
        this.doc.font('Courier').fontSize(6.5).fillColor('#000');
        this.doc.text(item.name, this.lx, this.y, { width: 140, align: 'left' });
        this.doc.text(`${rupiahRaw(total)}`, this.lx, this.y, { width: this.colW, align: 'right' });
        this.y += 9;
      }
    }
  }

  // ── Summary ──
  summary(rows, totalRow) {
    this._dash();
    for (const [label, value] of rows) {
      this._row(label, value, this.y, 'Courier', 6.5);
      this.y += 9;
    }
    if (totalRow) {
      this._dline();
      this._row(totalRow[0], totalRow[1], this.y, 'Helvetica-Bold', 8);
      this.y += 12;
    }
  }

  // ── Payment ──
  payment(pairs) {
    this._dash();
    for (const [label, value] of pairs) {
      this._kv(label, value);
    }
  }

  // ── Barcode ──
  barcode(code) {
    this._dash();
    this._center(code, this.y, 'Courier', 7);
    this.y += 10;
  }

  // ── Footer ──
  footer(lines = []) {
    this._line();
    this._center('TERIMA KASIH ATAS KUNJUNGAN ANDA', this.y, 'Helvetica-Bold', 6);
    this.y += 10;
    for (const line of lines) {
      this._center(line, this.y, 'Courier', 5, '#555');
      this.y += 7;
    }
  }

  // ── Invoice header (for digital receipts like Grab, Shopee) ──
  invoiceHeader(logoFile, companyName, companyAddr, invoiceInfo) {
    if (logoFile) {
      const fp = path.join(LOGO_DIR, logoFile);
      if (fs.existsSync(fp)) {
        const logoW = 80;
        this.doc.image(fp, this.cx - logoW / 2, this.y, { width: logoW });
        this.y += 62;
      }
    }

    this._center(companyName, this.y, 'Helvetica-Bold', 7.5);
    this.y += 10;
    for (const line of companyAddr) {
      this._center(line, this.y, 'Courier', 5, '#444');
      this.y += 7;
    }

    this.y += 3;
    this._dash();
    for (const [label, value] of invoiceInfo) {
      this._kv(label, value);
    }
    this._dash();
  }

  // ── Section title ──
  section(title) {
    this.doc.font('Helvetica-Bold').fontSize(7).fillColor('#000');
    this.doc.text(title.toUpperCase(), this.lx, this.y, { width: this.colW, align: 'left' });
    this.y += 10;
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

// ═══ FOOD / DINING ═══════════════════════════════════════════════════════════
function genFoodDining() {
  const stores = [
    {
      name: 'INDOMARET', logo: 'indomaret.png',
      company: 'PT Indomarco Prismatama',
      addr: 'Jl. Boulevard Barat Raya Blok G, Jakarta Utara 14240',
      npwp: '01.337.994.6-092.000', phone: '(021) 2988 8899', svc: '0811 1500 280',
      prefix: 'IDM',
    },
    {
      name: 'ALFAMART', logo: 'alfamart.png',
      company: 'PT Sumber Alfaria Trijaya Tbk',
      addr: 'Jl. MH Thamrin No.9, Jakarta Pusat 10230',
      npwp: '01.878.576.2-091.000', phone: '(021) 2960 8888', svc: '1500 959',
      prefix: 'ALF',
    },
    {
      name: 'HYPERMART', logo: 'hypermart.png',
      company: 'PT Matahari Putra Prima Tbk',
      addr: 'Jl. Boulevard Palem Raya, Tangerang 15810',
      npwp: '01.337.994.6-052.000', phone: '(021) 5460 888', svc: '0800 188 8888',
      prefix: 'HPM',
    },
  ];
  const s = pick(stores);
  const d = now();
  const noNota = `${s.prefix}${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${randInt(100000, 999999)}`;
  const kasir = pick(CASHIERS);
  const nama = fakeName();
  const storeNum = randInt(1, 999);

  const allItems = [
    { name: 'INDOMIE GORENG 85G', price: 3200 },
    { name: 'AQUA 600ML', price: 3500 },
    { name: 'TEH BOTOL SOSRO 450ML', price: 6500 },
    { name: 'CHITATO SAPI 68G', price: 11500 },
    { name: 'SILVERQUEEN CHUNKY 100G', price: 22000 },
    { name: 'BIMOLI 2L', price: 38500 },
    { name: 'GULAKU 1KG', price: 17500 },
    { name: 'RINSO ANTI NODA 700G', price: 28500 },
    { name: 'LIFEBUOY BW 450ML', price: 24500 },
    { name: 'SUNLIGHT LIME 755ML', price: 14800 },
    { name: 'OREO VANILLA 137G', price: 9800 },
    { name: 'BEAR BRAND 189ML', price: 10500 },
    { name: 'NESCAFE CLASSIC 100G', price: 27500 },
    { name: 'ULTRA MILK STRAWBERRY 1L', price: 19500 },
    { name: 'BERAS ROJOLELE 5KG', price: 74500 },
    { name: 'POKKA GREEN TEA 500ML', price: 7200 },
    { name: 'COCA COLA 1.5L', price: 16500 },
    { name: 'PAMPERS M42', price: 54500 },
    { name: 'APEL FUJI 1KG', price: 38000 },
    { name: 'MINYAK GORENG 2L', price: 29000 },
    { name: 'GULA PASIR 1KG', price: 15500 },
    { name: 'TELUR 1KG', price: 28000 },
    { name: 'ROTI TAWAR GANDUM', price: 15000 },
    { name: 'KOPI KAPAL API 165G', price: 14500 },
  ];
  const selected = sample(allItems, randInt(5, 12));
  const items = [];
  let subtotal = 0;
  let itemCount = 0;
  for (const si of selected) {
    const qty = randInt(1, 3);
    const price = si.price + (Math.random() > 0.7 ? randInt(-200, 200) * 5 : 0);
    const total = price * qty;
    subtotal += total;
    itemCount += qty;
    items.push({ name: si.name, qty, price, total });
  }
  const ppn = Math.floor(subtotal * 0.11);
  const grandTotal = subtotal + ppn;
  const tunai = Math.ceil(grandTotal / 5000) * 5000 + randInt(0, 2) * 5000;
  const kembali = tunai - grandTotal;

  const pdf = new ReceiptPDF();
  pdf.storeHeader(s.logo, s.company, [s.addr, `NPWP: ${s.npwp}`, `Telp: ${s.phone}`],
    [`Store ${String(storeNum).padStart(3, '0')}`]);

  pdf.transInfo([
    ['No Nota', noNota],
    ['Tanggal', fmtDate(d)],
    ['Jam', fmtTime(d)],
    ['Kasir', kasir],
    ['Customer', nama],
  ]);

  pdf.itemsList(items, true);
  pdf.summary(
    [
      [`Subtotal (${itemCount} item)`, rupiahRaw(subtotal)],
      ['PPN 11%', rupiahRaw(ppn)],
    ],
    ['TOTAL', rupiahRaw(grandTotal)]
  );

  pdf.payment([
    ['Tunai', rupiahRaw(tunai)],
    ['Kembalian', rupiahRaw(kembali)],
  ]);

  pdf.barcode(noNota);
  pdf.footer([
    `${s.name} - ${s.company}`,
    `Layanan Konsumen: ${s.svc}`,
    `${s.name.toLowerCase()}.co.id`,
  ]);

  return pdf;
}

// ═══ TRANSPORT ═══════════════════════════════════════════════════════════════
function genTransportGrab() {
  const d = now();
  const invoice = `GRB-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${randInt(10000000, 99999999)}`;
  const nama = fakeName();
  const driver = fakeName();
  const plat = fakePlat();
  const layanan = pick(['GrabCar', 'GrabBike', 'GrabFood']);
  const jarak = (randInt(3, 25) + Math.random()).toFixed(1);
  const durasi = randInt(8, 45);
  const tarifDasar = layanan === 'GrabBike' ? randInt(8000, 15000) : randInt(15000, 35000);
  const perKm = layanan === 'GrabBike' ? 2500 : 4000;
  const biayaJarak = Math.floor(jarak * perKm);
  const biayaDurasi = durasi * 300;
  const promo = pick([0, 0, randInt(2000, 8000)]);
  const total = tarifDasar + biayaJarak + biayaDurasi - promo;
  const asal = `${pick(STREETS)} ${fakeCity()}`;
  const tujuan = `${pick(STREETS)} ${fakeCity()}`;

  const pdf = new ReceiptPDF();
  pdf.invoiceHeader('grab.png', 'PT Grab Indonesia', ['Jakarta, Indonesia'], [
    ['Invoice', invoice],
    ['Tanggal', fmtDate(d)],
    ['Jam', fmtTime(d)],
    ['Layanan', layanan],
  ]);

  pdf.section('Perjalanan');
  pdf._kv('Penumpang', nama);
  pdf._kv('Driver', driver);
  pdf._kv('Kendaraan', `${plat}`);
  pdf._kv('Asal', asal);
  pdf._kv('Tujuan', tujuan);
  pdf._kv('Jarak', `${jarak} km`);
  pdf._kv('Durasi', `${durasi} menit`);
  pdf.y += 3;

  pdf.summary(
    [
      ['Tarif Dasar', rupiahRaw(tarifDasar)],
      [`Biaya Jarak (${jarak} km)`, rupiahRaw(biayaJarak)],
      [`Biaya Waktu (${durasi} min)`, rupiahRaw(biayaDurasi)],
      ...(promo > 0 ? [['Promo', `-${rupiahRaw(promo)}`]] : []),
    ],
    ['TOTAL', rupiahRaw(total)]
  );

  pdf.payment([
    ['Metode', pick(['GrabPay', 'OVO', 'Tunai', 'GoPay'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer(['PT Grab Indonesia', 'grab.com']);
  return pdf;
}

function genTransportGojek() {
  const d = now();
  const orderId = `GO-${randInt(10000000, 99999999)}`;
  const layanan = pick(['GoRide', 'GoCar', 'GoFood', 'GoSend']);
  const nama = fakeName();
  const driver = fakeName();
  const plat = fakePlat();
  const tarif = layanan === 'GoRide' ? randInt(8000, 20000) : randInt(15000, 40000);
  const diskon = pick([0, 0, randInt(1000, 5000)]);
  const total = tarif - diskon;

  const pdf = new ReceiptPDF();
  pdf.invoiceHeader('gojek.png', 'PT Gojek Indonesia', ['Jakarta, Indonesia'], [
    ['Order ID', orderId],
    ['Tanggal', fmtDate(d)],
    ['Jam', fmtTime(d)],
    ['Layanan', layanan],
  ]);

  pdf.section('Detail Perjalanan');
  pdf._kv('Pelanggan', nama);
  pdf._kv('Driver', driver);
  pdf._kv('Plat', plat);
  pdf.y += 3;

  pdf.summary(
    [
      ['Tarif', rupiahRaw(tarif)],
      ...(diskon > 0 ? [['Diskon', `-${rupiahRaw(diskon)}`]] : []),
    ],
    ['TOTAL', rupiahRaw(total)]
  );

  pdf.payment([
    ['Metode', pick(['GoPay', 'OVO', 'Tunai'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer(['PT Gojek Indonesia', 'gojek.com']);
  return pdf;
}

function genTransportToll() {
  const d = now();
  const pintuMasuk = pick(['Cikampek', 'Cikunir', 'Pondok Ranji', 'Bintaro', 'Serpong']);
  const pintuKeluar = pick(['Halim', 'Cawang', 'Tebet', 'Kuningan', 'Casablanca', 'Semanggi']);
  const golongan = pick(['I', 'I', 'I', 'II', 'II', 'III']);
  const tarif = pick([5000, 6500, 8000, 9500, 11000, 12500, 15000, 18000]);
  const noTiket = `TL${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${randInt(100000, 999999)}`;
  const waktuMasuk = new Date(d.getTime() - randInt(5, 45) * 60000);

  const pdf = new ReceiptPDF();
  pdf.storeHeader(null, 'JASA MARGA', ['PT Jasa Marga (Persero) Tbk', 'Jl. Meruya Selatan No.9, Jakarta 11650'], []);

  pdf.transInfo([
    ['No Transaksi', noTiket],
    ['Tanggal', fmtDate(d)],
    ['Gerbang Masuk', pintuMasuk],
    ['Waktu Masuk', fmtTime(waktuMasuk)],
    ['Gerbang Keluar', pintuKeluar],
    ['Waktu Keluar', fmtTime(d)],
    ['Golongan', golongan],
  ]);

  pdf.summary([], ['TOTAL TOLL', rupiahRaw(tarif)]);

  pdf.payment([
    ['Metode', pick(['Tunai', 'e-Toll', 'Flazz BCA', 'Mandiri e-Money'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer(['PT Jasa Marga (Persero) Tbk', 'jasamarga.co.id']);
  return pdf;
}

function genTransportParking() {
  const d = now();
  const masuk = new Date(d.getTime() - randInt(1, 6) * 3600000);
  const mall = pick(['Mal Taman Anggrek', 'Pluit Village', 'Central Park Mall', 'Summarecon Mall Serpong', 'AEON Mall JGC', 'Mall Kelapa Gading', 'Pondok Indah Mall']);
  const plat = fakePlat();
  const noTiket = `PK${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${randInt(10000, 99999)}`;
  const durasi = Math.ceil((d - masuk) / 3600000);
  const tarif = durasi <= 1 ? 5000 : 5000 + (durasi - 1) * 3000;
  const tarifMax = 25000;
  const bayar = Math.min(tarif, tarifMax);

  const pdf = new ReceiptPDF();
  pdf.storeHeader(null, mall.toUpperCase(), [`Manajemen Parkir ${mall}`], []);

  pdf.transInfo([
    ['No Tiket', noTiket],
    ['Plat Nomor', plat],
    ['Masuk', fmtDateTime(masuk)],
    ['Keluar', fmtDateTime(d)],
    ['Durasi', `${durasi} jam`],
  ]);

  pdf.summary([], ['TARIF PARKIR', rupiahRaw(bayar)]);

  pdf.payment([
    ['Metode', pick(['Tunai', 'Kartu Parkir'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer([`${mall} - Area Parkir`]);
  return pdf;
}

function genTransport() { return pick([genTransportGrab, genTransportGojek, genTransportToll, genTransportParking])(); }

// ═══ UTILITIES ═══════════════════════════════════════════════════════════════
function genUtilPLN() {
  const d = now();
  const noRek = `${randInt(10000000000, 99999999999)}`;
  const noTrx = `PLN${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;
  const nama = fakeName();
  const daya = pick([1300, 2200, 3500, 5500, 7700, 11000]);
  const bulan = fmtMonthYear(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const pemakaian = randInt(50, 350);
  const tarifPerKwh = daya <= 1300 ? 1444.70 : (daya <= 2200 ? 1444.70 : 1699.53);
  const biayaListrik = Math.floor(pemakaian * tarifPerKwh);
  const biayaAdmin = 2500;
  const ppn = Math.floor(biayaListrik * 0.10);
  const total = biayaListrik + biayaAdmin + ppn;

  const pdf = new ReceiptPDF();
  pdf.invoiceHeader('pln.png', 'PT PLN (Persero)', ['Jakarta, Indonesia'], [
    ['No Pelanggan', noRek],
    ['No Transaksi', noTrx],
    ['Tanggal Bayar', fmtDate(d)],
    ['Periode', bulan],
    ['Daya', `${daya} VA`],
  ]);

  pdf.section('Tagihan Listrik');
  pdf._kv('Nama', nama);
  pdf._kv('Pemakaian', `${pemakaian} kWh`);
  pdf._kv('Tarif', `Rp${rupiahRaw(Math.floor(tarifPerKwh))}/kWh`);
  pdf.y += 3;

  pdf.summary(
    [
      ['Biaya Listrik', rupiahRaw(biayaListrik)],
      ['PPN 10%', rupiahRaw(ppn)],
      ['Biaya Administrasi', rupiahRaw(biayaAdmin)],
    ],
    ['TOTAL TAGIHAN', rupiahRaw(total)]
  );

  pdf.payment([
    ['Metode', pick(['Tunai', 'Transfer BCA', 'Virtual Account', 'GoPay', 'OVO'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer(['PT PLN (Persero)', 'pln.co.id']);
  return pdf;
}

function genUtilInternet() {
  const d = now();
  const providers = [
    { name: 'INDIHOME', logo: 'indihome.png', company: 'PT Telkom Indonesia' },
    { name: 'BIZNET', logo: 'biznet.png', company: 'PT Biznet Networks' },
  ];
  const p = pick(providers);
  const noPelanggan = `${randInt(10000000, 99999999)}`;
  const noTrx = `${p.name.substring(0, 3).toUpperCase()}${d.getFullYear()}${randInt(100000, 999999)}`;
  const nama = fakeName();
  const bulan = fmtMonthYear(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const jatuhTempo = new Date(d.getFullYear(), d.getMonth(), randInt(10, 20));
  const paket = pick(['50 Mbps', '100 Mbps', '200 Mbps', '300 Mbps']);
  const biaya = pick([350000, 450000, 600000, 850000, 1200000]);
  const ppn = Math.floor(biaya * 0.11);
  const biayaAdmin = 2500;
  const total = biaya + ppn + biayaAdmin;

  const pdf = new ReceiptPDF();
  pdf.invoiceHeader(p.logo, p.company, ['Jakarta, Indonesia'], [
    ['No Pelanggan', noPelanggan],
    ['No Invoice', noTrx],
    ['Periode', bulan],
    ['Jatuh Tempo', fmtDate(jatuhTempo)],
  ]);

  pdf.section('Tagihan Internet');
  pdf._kv('Nama', nama);
  pdf._kv('Paket', paket);
  pdf.y += 3;

  pdf.summary(
    [
      ['Biaya Langganan', rupiahRaw(biaya)],
      ['PPN 11%', rupiahRaw(ppn)],
      ['Biaya Administrasi', rupiahRaw(biayaAdmin)],
    ],
    ['TOTAL TAGIHAN', rupiahRaw(total)]
  );

  pdf.payment([
    ['Metode', pick(['Auto-Debit BCA', 'Transfer', 'Virtual Account'])],
    ['Status', 'LUNAS'],
    ['Tanggal Bayar', fmtDate(d)],
  ]);

  pdf.footer([p.company, `${p.name.toLowerCase()}.co.id`]);
  return pdf;
}

function genUtilPulsa() {
  const d = now();
  const operators = [
    { name: 'TELKOMSEL', logo: 'telkomsel.png', prefix: ['0811', '0812', '0813', '0821', '0822', '0851', '0852', '0853'] },
    { name: 'INDOSAT', logo: 'indosat.png', prefix: ['0814', '0815', '0816', '0855', '0856', '0857', '0858'] },
    { name: 'XL', logo: 'xl_axiata.png', prefix: ['0817', '0818', '0819', '0859', '0877', '0878'] },
  ];
  const op = pick(operators);
  const noHP = `${pick(op.prefix)}${randInt(10000000, 99999999)}`;
  const nominal = pick([15000, 25000, 50000, 100000, 150000, 200000]);
  const harga = nominal + pick([0, 500, 1000, 1500, 2000]);
  const noTrx = `${randInt(100000000, 999999999)}`;

  const pdf = new ReceiptPDF();
  pdf.storeHeader(op.logo, op.name, [`PT ${op.name} Tbk`], []);

  pdf.transInfo([
    ['No Transaksi', noTrx],
    ['Tanggal', fmtDate(d)],
    ['Jam', fmtTime(d)],
    ['No HP', noHP],
    ['Nominal', rupiah(nominal)],
  ]);

  pdf.summary([], ['TOTAL BAYAR', rupiahRaw(harga)]);

  pdf.payment([
    ['Metode', pick(['Tunai', 'GoPay', 'OVO', 'DANA'])],
    ['Status', 'BERHASIL'],
  ]);

  pdf.footer([`Layanan ${op.name}`, 'Pembelian pulsa berhasil']);
  return pdf;
}

function genUtilPDAM() {
  const d = now();
  const pdam = pick(['PDAM Jaya', 'PDAM Tirta Kerta Raharja', 'PDAM Tirta Asasta']);
  const noPelanggan = `${randInt(1000000, 9999999)}`;
  const noTrx = `PDAM${d.getFullYear()}${randInt(100000, 999999)}`;
  const nama = fakeName();
  const bulan = fmtMonthYear(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const pemakaian = randInt(5, 40);
  const tarif = pick([3500, 4200, 5800, 7500]);
  const biaya = pemakaian * tarif * 1000;
  const biayaAdmin = 2500;
  const total = biaya + biayaAdmin;

  const pdf = new ReceiptPDF();
  pdf.storeHeader(null, pdam.toUpperCase(), [`${pdam} - Cabang ${fakeCity()}`], []);

  pdf.transInfo([
    ['No Pelanggan', noPelanggan],
    ['No Transaksi', noTrx],
    ['Tanggal Bayar', fmtDate(d)],
    ['Periode', bulan],
  ]);

  pdf.section('Tagihan Air');
  pdf._kv('Nama', nama);
  pdf._kv('Pemakaian', `${pemakaian} m³`);
  pdf.y += 3;

  pdf.summary(
    [
      ['Biaya Air', rupiahRaw(biaya)],
      ['Biaya Administrasi', rupiahRaw(biayaAdmin)],
    ],
    ['TOTAL TAGIHAN', rupiahRaw(total)]
  );

  pdf.payment([
    ['Metode', pick(['Tunai', 'Transfer', 'GoPay'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer([pdam]);
  return pdf;
}

function genUtilities() { return pick([genUtilPLN, genUtilInternet, genUtilPulsa, genUtilPDAM])(); }

// ═══ HEALTHCARE ══════════════════════════════════════════════════════════════
function genHealthApotek() {
  const d = now();
  const stores = [
    { name: 'KIMIA FARMA', logo: 'kimia_farma.png', company: 'PT Kimia Farma Tbk' },
    { name: 'GUARDIAN', logo: 'guardian.png', company: 'PT Guardian Health & Beauty' },
  ];
  const s = pick(stores);
  const noNota = `AP${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;
  const kasir = pick(CASHIERS);

  const allMeds = [
    { name: 'PARACETAMOL 500MG 10TAB', price: 8500 },
    { name: 'AMOXICILLIN 500MG 10TAB', price: 18000 },
    { name: 'CTM 4MG 10TAB', price: 5500 },
    { name: 'OBH COMBI 100ML', price: 22000 },
    { name: 'BODREX TAB 10TAB', price: 12000 },
    { name: 'ANTANGIN JRG 15ML', price: 3500 },
    { name: 'VIT C 1000MG 10TAB', price: 35000 },
    { name: 'MASKER MEDIS 50PCS', price: 28000 },
    { name: 'HAND SANITIZER 500ML', price: 25000 },
    { name: 'P3K KOTAK LENGKAP', price: 85000 },
    { name: 'PROMAG 10TAB', price: 15000 },
    { name: 'MINYAK KAYU PUTIH 60ML', price: 18500 },
  ];
  const selected = sample(allMeds, randInt(2, 5));
  const items = [];
  let subtotal = 0;
  for (const m of selected) {
    const qty = randInt(1, 2);
    const total = m.price * qty;
    subtotal += total;
    items.push({ name: m.name, qty, price: m.price, total });
  }
  const ppn = Math.floor(subtotal * 0.11);
  const grandTotal = subtotal + ppn;
  const tunai = Math.ceil(grandTotal / 5000) * 5000;

  const pdf = new ReceiptPDF();
  pdf.storeHeader(s.logo, s.company, [`Apotek ${s.name}`], []);

  pdf.transInfo([
    ['No Nota', noNota],
    ['Tanggal', fmtDate(d)],
    ['Jam', fmtTime(d)],
    ['Kasir', kasir],
  ]);

  pdf.itemsList(items, true);
  pdf.summary(
    [
      ['Subtotal', rupiahRaw(subtotal)],
      ['PPN 11%', rupiahRaw(ppn)],
    ],
    ['TOTAL', rupiahRaw(grandTotal)]
  );

  pdf.payment([
    ['Tunai', rupiahRaw(tunai)],
    ['Kembalian', rupiahRaw(tunai - grandTotal)],
  ]);

  pdf.footer([s.company, 'Barang yang sudah dibeli tidak dapat dikembalikan']);
  return pdf;
}

function genHealthKlinik() {
  const d = now();
  const klinik = pick(['Klinik Pratama Sehat', 'Klinik Utama Medika', 'Klinik Family Care']);
  const noTrx = `KL${d.getFullYear()}${randInt(100000, 999999)}`;
  const nama = fakeName();
  const dokter = `dr. ${fakeName().split(' ')[0]}`;
  const layanan = pick(['Konsultasi Umum', 'Pemeriksaan Lab', 'Vaksinasi', 'Medical Check-up']);
  const biayaKonsul = pick([75000, 100000, 150000, 200000]);
  const biayaObat = pick([0, 25000, 50000, 85000, 120000]);
  const total = biayaKonsul + biayaObat;

  const pdf = new ReceiptPDF();
  pdf.storeHeader(null, klinik.toUpperCase(), [`Jl. ${pick(STREETS)} ${fakeCity()}`], []);

  pdf.transInfo([
    ['No Transaksi', noTrx],
    ['Tanggal', fmtDate(d)],
    ['Pasien', nama],
    ['Dokter', dokter],
    ['Layanan', layanan],
  ]);

  pdf.summary(
    [
      ['Biaya Konsultasi', rupiahRaw(biayaKonsul)],
      ...(biayaObat > 0 ? [['Biaya Obat', rupiahRaw(biayaObat)]] : []),
    ],
    ['TOTAL', rupiahRaw(total)]
  );

  pdf.payment([
    ['Metode', pick(['Tunai', 'BPJS', 'Asuransi', 'Kartu Kredit'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer([klinik, 'Simpan bukti ini untuk klaim asuransi']);
  return pdf;
}

function genHealthcare() { return pick([genHealthApotek, genHealthKlinik, genHealthApotek])(); }

// ═══ ENTERTAINMENT ═══════════════════════════════════════════════════════════
function genEntCinema() {
  const d = now();
  const cinemas = [
    { name: 'XXI', logo: 'xxi.png', company: 'PT Nusantara Sejahtera Raya' },
    { name: 'CGV', logo: 'cgv.png', company: 'PT CGV Cinemas Indonesia' },
  ];
  const c = pick(cinemas);
  const noTiket = `${randInt(100000000, 999999999)}`;
  const film = pick(['Avengers: Secret Wars', 'Spider-Man: Beyond', 'The Batman 2', 'Fast X Part 2', 'John Wick 5', 'Inside Out 3']);
  const studio = `${randInt(1, 12)}`;
  const kursi = `${pick(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])}${randInt(1, 15)}`;
  const jamTayang = pick(['10:30', '13:15', '15:45', '18:00', '20:30', '22:00']);
  const harga = pick([45000, 50000, 55000, 65000, 75000]);
  const qty = randInt(1, 3);
  const total = harga * qty;

  const pdf = new ReceiptPDF();
  pdf.storeHeader(c.logo, `${c.name} CINEMA`, [c.company], []);

  pdf.transInfo([
    ['No Tiket', noTiket],
    ['Tanggal', fmtDate(d)],
    ['Film', film],
    ['Studio', `Studio ${studio}`],
    ['Jam', jamTayang],
    ['Kursi', kursi],
    ['Qty', `${qty} tiket`],
  ]);

  pdf.summary([], ['TOTAL', rupiahRaw(total)]);

  pdf.payment([
    ['Metode', pick(['Tunai', 'GoPay', 'OVO', 'Kartu Kredit'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer([`${c.name} Cinema`, `${c.name.toLowerCase()}.co.id`]);
  return pdf;
}

function genEntStreaming() {
  const d = now();
  const services = [
    { name: 'NETFLIX', logo: 'netflix.png', company: 'Netflix Inc.', plans: [{ name: 'Basic', price: 65000 }, { name: 'Standard', price: 120000 }, { name: 'Premium', price: 186000 }] },
    { name: 'SPOTIFY', logo: 'spotify.png', company: 'Spotify AB', plans: [{ name: 'Individual', price: 54990 }, { name: 'Duo', price: 75990 }, { name: 'Family', price: 99990 }] },
    { name: 'DISNEY+', logo: 'disney.png', company: 'The Walt Disney Company', plans: [{ name: 'Mobile', price: 49900 }, { name: 'Premium', price: 119900 }] },
  ];
  const svc = pick(services);
  const plan = pick(svc.plans);
  const ppn = Math.floor(plan.price * 0.11);
  const total = plan.price + ppn;
  const email = fakeEmail();
  const noInv = `INV-${svc.name.substring(0, 3).toUpperCase()}-${d.getFullYear()}${randInt(10000, 99999)}`;

  const pdf = new ReceiptPDF();
  pdf.invoiceHeader(svc.logo, svc.company, [], [
    ['Invoice No', noInv],
    ['Tanggal', fmtDate(d)],
    ['Layanan', svc.name],
    ['Paket', plan.name],
    ['Email', email],
  ]);

  pdf.summary(
    [
      ['Langganan Bulanan', rupiahRaw(plan.price)],
      ['PPN 11%', rupiahRaw(ppn)],
    ],
    ['TOTAL', rupiahRaw(total)]
  );

  pdf.payment([
    ['Metode', pick(['Kartu Kredit', 'GoPay', 'DANA'])],
    ['Status', 'LUNAS'],
    ['Periode', `${fmtDate(new Date(d.getFullYear(), d.getMonth(), 1))} - ${fmtDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))}`],
  ]);

  pdf.footer([svc.company, `${svc.name.toLowerCase()}.com`]);
  return pdf;
}

function genEntertainment() { return pick([genEntCinema, genEntStreaming])(); }

// ═══ SHOPPING ════════════════════════════════════════════════════════════════
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

  const allItems = [
    { name: 'Kaos Polos Cotton Combed 30s', price: 75000 },
    { name: 'Celana Chino Pria Slim Fit', price: 150000 },
    { name: 'Tas Ransel Laptop 15.6"', price: 185000 },
    { name: 'Charger USB-C 65W GaN', price: 120000 },
    { name: 'Mouse Wireless Logitech M240', price: 189000 },
    { name: 'Earphone TWS Bluetooth 5.3', price: 95000 },
    { name: 'Kemeja Flannel Lengan Panjang', price: 135000 },
    { name: 'Tumbler Stainless 500ml', price: 65000 },
    { name: 'Phone Case Soft TPU Clear', price: 35000 },
    { name: 'LED Strip RGB 5 Meter', price: 48000 },
  ];
  const selected = sample(allItems, randInt(1, 4));
  const items = [];
  let subtotal = 0;
  for (const si of selected) {
    const qty = randInt(1, 2);
    const total = si.price * qty;
    subtotal += total;
    items.push({ name: si.name, qty, price: si.price, total });
  }
  const ongkir = pick([0, 0, 15000, 20000, 25000]);
  const diskon = pick([0, 0, 0, randInt(5000, 20000)]);
  const total = subtotal + ongkir - diskon;

  const pdf = new ReceiptPDF();
  pdf.invoiceHeader(p.logo, p.company, [`NPWP: ${p.npwp}`], [
    ['No Invoice', noInv],
    ['Tanggal', fmtDate(d)],
    ['Pengiriman', ekspedisi],
    ['No Resi', noResi],
  ]);

  pdf.section('Detail Pengiriman');
  pdf._kv('Penerima', nama);
  pdf._kv('Alamat', alamat);
  pdf.y += 3;

  pdf.section('Pesanan');
  pdf.itemsList(items, true);

  pdf.summary(
    [
      ['Subtotal', rupiahRaw(subtotal)],
      ...(ongkir > 0 ? [['Ongkos Kirim', rupiahRaw(ongkir)]] : []),
      ...(diskon > 0 ? [['Diskon/Free Ongkir', `-${rupiahRaw(diskon)}`]] : []),
    ],
    ['TOTAL PEMBAYARAN', rupiahRaw(total)]
  );

  pdf.payment([
    ['Metode', pick(['GoPay', 'OVO', 'DANA', 'Transfer BCA', 'Virtual Account'])],
    ['Status', 'DIBAYAR'],
  ]);

  pdf.footer([p.company, `${p.name.toLowerCase()}.co.id`]);
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
  const mall = `${fakeCity()} ${pick(['Mall', 'Plaza', 'Grand Indonesia', 'Pacific Place', 'Central Park'])}`;
  const noNota = `${randInt(100000, 999999)}/${pick(['A', 'B', 'C'])}`;
  const kasir = pick(CASHIERS);

  const allItems = [
    { name: 'Kemeja Flannel Lengan Panjang', price: 299000 },
    { name: 'Kaos Polo Pria', price: 199000 },
    { name: 'Celana Jeans Slim Fit', price: 399000 },
    { name: 'Jaket Hoodie Zipper', price: 349000 },
    { name: 'Sepatu Sneakers Canvas', price: 499000 },
    { name: 'Parfum EDT 100ml', price: 259000 },
    { name: 'Dress Wanita Casual', price: 329000 },
    { name: 'Tas Selempang Kulit', price: 449000 },
  ];
  const selected = sample(allItems, randInt(1, 3));
  const items = [];
  let subtotal = 0;
  for (const si of selected) {
    subtotal += si.price;
    items.push({ name: si.name, qty: 1, price: si.price, total: si.price });
  }
  const member = pick([null, null, 'MEMBER']);
  const diskonMember = member ? Math.floor(subtotal * pick([0.05, 0.10, 0.15])) : 0;
  const total = subtotal - diskonMember;
  const bayar = Math.ceil(total / 50000) * 50000;

  const pdf = new ReceiptPDF();
  pdf.storeHeader(s.logo, s.name, [mall, s.company], []);

  pdf.transInfo([
    ['No Nota', noNota],
    ['Tanggal', fmtDate(d)],
    ['Jam', fmtTime(d)],
    ['Kasir', kasir],
    ...(member ? [[`Member ${member}`, `${randInt(10000000, 99999999)}`]] : []),
  ]);

  pdf.itemsList(items, true);

  const summaryRows = [];
  if (diskonMember > 0) summaryRows.push([`Diskon ${member} ${Math.floor(diskonMember / subtotal * 100)}%`, `-${rupiahRaw(diskonMember)}`]);
  pdf.summary(summaryRows, ['TOTAL', rupiahRaw(total)]);

  const metode = pick(['Tunai', 'Debit BCA', 'Kartu Kredit']);
  if (metode === 'Tunai') {
    pdf.payment([
      ['Tunai', rupiahRaw(bayar)],
      ['Kembalian', rupiahRaw(bayar - total)],
      ['Metode', metode],
    ]);
  } else {
    pdf.payment([
      ['Metode', metode],
      ['No. Kartu', `****${randInt(1000, 9999)}`],
      ['Status', 'APPROVED'],
    ]);
  }

  pdf.footer([s.company, mall, 'Barang yang sudah dibeli tidak dapat ditukar']);
  return pdf;
}

function genShopping() { return pick([genShopEcommerce, genShopMall])(); }

// ═══ TRAVEL ══════════════════════════════════════════════════════════════════
function genTravelFlight() {
  const d = now();
  const maskapai = pick([
    { name: 'GARUDA INDONESIA', logo: 'garuda.png', code: 'GA' },
    { name: 'LION AIR', logo: 'lion_air.png', code: 'JT' },
    { name: 'CITILINK', logo: 'citilink.png', code: 'QG' },
    { name: 'AIRASIA', logo: 'airasia.png', code: 'QZ' },
  ]);
  const rute = pick([
    { from: 'CGK (Jakarta)', to: 'DPS (Bali)', code: 'GA' },
    { from: 'CGK (Jakarta)', to: 'SUB (Surabaya)', code: 'JT' },
    { from: 'CGK (Jakarta)', to: 'KNO (Medan)', code: 'QG' },
    { from: 'DPS (Bali)', to: 'CGK (Jakarta)', code: 'QZ' },
  ]);
  const noBooking = `${maskapai.code}${randInt(100000, 999999)}`;
  const nama = fakeName();
  const kelas = pick(['Economy', 'Economy', 'Business']);
  const harga = kelas === 'Business' ? randInt(2500000, 8000000) : randInt(800000, 3000000);
  const pajak = Math.floor(harga * 0.10);
  const biayaAdmin = 25000;
  const total = harga + pajak + biayaAdmin;

  const pdf = new ReceiptPDF();
  pdf.invoiceHeader(maskapai.logo, maskapai.name, [], [
    ['Booking Ref', noBooking],
    ['Tanggal', fmtDate(d)],
    ['Penumpang', nama],
    ['Rute', `${rute.from} → ${rute.to}`],
    ['Kelas', kelas],
  ]);

  pdf.summary(
    [
      ['Harga Tiket', rupiahRaw(harga)],
      ['Pajak & Surcharge', rupiahRaw(pajak)],
      ['Biaya Administrasi', rupiahRaw(biayaAdmin)],
    ],
    ['TOTAL', rupiahRaw(total)]
  );

  pdf.payment([
    ['Metode', pick(['Kartu Kredit', 'Transfer', 'Virtual Account'])],
    ['Status', 'TICKET ISSUED'],
  ]);

  pdf.footer([maskapai.name, 'Simpan bukti ini untuk check-in']);
  return pdf;
}

function genTravelHotel() {
  const d = now();
  const hotel = pick([
    { name: 'Hotel Santika', bintang: 3 },
    { name: 'Aston Hotel', bintang: 4 },
    { name: 'Pullman Hotel', bintang: 5 },
    { name: 'Harris Hotel', bintang: 3 },
    { name: 'Swiss-Belhotel', bintang: 4 },
  ]);
  const noBooking = `HTL${d.getFullYear()}${randInt(100000, 999999)}`;
  const nama = fakeName();
  const checkin = new Date(d.getTime() + randInt(3, 30) * 86400000);
  const malam = randInt(1, 4);
  const checkout = new Date(checkin.getTime() + malam * 86400000);
  const hargaPerMalam = hotel.bintang <= 3 ? randInt(400000, 800000) : randInt(800000, 2500000);
  const subtotal = hargaPerMalam * malam;
  const pajak = Math.floor(subtotal * 0.11);
  const total = subtotal + pajak;

  const pdf = new ReceiptPDF();
  pdf.storeHeader(null, hotel.name.toUpperCase(), [`⭐⭐⭐${'⭐'.repeat(hotel.bintang - 3)}`], []);

  pdf.transInfo([
    ['Booking Ref', noBooking],
    ['Tanggal Booking', fmtDate(d)],
    ['Tamu', nama],
    ['Check-in', fmtDate(checkin)],
    ['Check-out', fmtDate(checkout)],
    ['Durasi', `${malam} malam`],
    ['Tipe Kamar', pick(['Superior', 'Deluxe', 'Standard'])],
  ]);

  pdf.summary(
    [
      [`${rupiahRaw(hargaPerMalam)} x ${malam} malam`, rupiahRaw(subtotal)],
      ['Pajak & Service 11%', rupiahRaw(pajak)],
    ],
    ['TOTAL', rupiahRaw(total)]
  );

  pdf.payment([
    ['Metode', pick(['Kartu Kredit', 'Transfer', 'Booking.com', 'Traveloka'])],
    ['Status', 'CONFIRMED'],
  ]);

  pdf.footer([hotel.name, 'Simpan bukti ini untuk check-in']);
  return pdf;
}

function genTravel() { return pick([genTravelFlight, genTravelHotel])(); }

// ═══ EDUCATION ═══════════════════════════════════════════════════════════════
function genEduGramedia() {
  const d = now();
  const noNota = `GRM${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${randInt(100000, 999999)}`;
  const kasir = pick(CASHIERS);
  const cabang = `Gramedia ${fakeCity()}`;

  const allBooks = [
    { name: 'LASKAR PELANGI - A. Hirata', price: 88000 },
    { name: 'BUMI MANUSIA - P. Ananta Toer', price: 95000 },
    { name: 'FILOSOFI TERAS - H. Mahardhika', price: 89000 },
    { name: 'ATOMIC BIRDS - James Clear', price: 109000 },
    { name: 'RICH DAD POOR DAD - R. Kiyosaki', price: 99000 },
    { name: 'SAPIENS - Y.N. Harari', price: 139000 },
    { name: 'THINK GROW RICH - N. Hill', price: 75000 },
    { name: 'PULANG - T. Liye', price: 82000 },
    { name: 'NEGERI 5 MENARA - A. Fuadi', price: 79000 },
    { name: 'BICARA ITU ADA SENINYA - S. Kang', price: 72000 },
  ];
  const selected = sample(allBooks, randInt(1, 4));
  const items = [];
  let subtotal = 0;
  for (const b of selected) {
    const qty = randInt(1, 2);
    const total = b.price * qty;
    subtotal += total;
    items.push({ name: b.name, qty, price: b.price, total });
  }
  const member = pick([null, null, 'MEMBER']);
  const diskon = member ? Math.floor(subtotal * 0.10) : 0;
  const total = subtotal - diskon;
  const bayar = Math.ceil(total / 10000) * 10000;

  const pdf = new ReceiptPDF();
  pdf.storeHeader('gramedia.png', 'GRAMEDIA', [cabang, 'PT Gramedia Asri Media'], []);

  pdf.transInfo([
    ['No Nota', noNota],
    ['Tanggal', fmtDate(d)],
    ['Jam', fmtTime(d)],
    ['Kasir', kasir],
    ...(member ? [['Member', `${randInt(10000000, 99999999)}`]] : []),
  ]);

  pdf.itemsList(items, true);

  const summaryRows = [];
  if (diskon > 0) summaryRows.push(['Diskon Member 10%', `-${rupiahRaw(diskon)}`]);
  pdf.summary(summaryRows, ['TOTAL', rupiahRaw(total)]);

  pdf.payment([
    ['Tunai', rupiahRaw(bayar)],
    ['Kembalian', rupiahRaw(bayar - total)],
    ['Metode', pick(['Tunai', 'Debit BCA', 'Gopay'])],
  ]);

  pdf.footer(['Gramedia - Toko Buku Terlengkap', 'gramedia.com']);
  return pdf;
}

function genEduCourse() {
  const d = now();
  const platform = pick([
    { name: 'SKILL ACADEMY', company: 'PT Ruang Raya Indonesia' },
    { name: 'COURSERA', company: 'Coursera Inc.' },
    { name: 'UDEMY', company: 'Udemy Inc.' },
  ]);
  const course = pick(['Data Science Bootcamp', 'Digital Marketing', 'UI/UX Design', 'Web Development', 'Python Programming']);
  const noInv = `EDU${d.getFullYear()}${randInt(100000, 999999)}`;
  const harga = pick([299000, 499000, 799000, 1499000, 2999000]);
  const diskon = pick([0, 0, Math.floor(harga * 0.20), Math.floor(harga * 0.30)]);
  const total = harga - diskon;

  const pdf = new ReceiptPDF();
  pdf.invoiceHeader(null, platform.name, [platform.company], [
    ['Invoice No', noInv],
    ['Tanggal', fmtDate(d)],
    ['Kursus', course],
    ['Email', fakeEmail()],
  ]);

  pdf.summary(
    [
      ['Harga Kursus', rupiahRaw(harga)],
      ...(diskon > 0 ? [['Diskon', `-${rupiahRaw(diskon)}`]] : []),
    ],
    ['TOTAL', rupiahRaw(total)]
  );

  pdf.payment([
    ['Metode', pick(['Kartu Kredit', 'GoPay', 'Transfer'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer([platform.company, `${platform.name.toLowerCase()}.com`]);
  return pdf;
}

function genEducation() { return pick([genEduGramedia, genEduCourse])(); }

// ═══ SUBSCRIPTIONS ═══════════════════════════════════════════════════════════
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
  pdf.invoiceHeader(s.logo, s.company, [], [
    ['Invoice No', noInv],
    ['Tanggal', fmtDate(d)],
    ['Produk', s.name],
    ['Plan', s.plan],
    ['Email', fakeEmail()],
  ]);

  pdf.section('Subscription Details');
  pdf._kv('Periode', `${fmtDate(new Date(d.getFullYear(), d.getMonth(), 1))} — ${fmtDate(new Date(d.getFullYear() + 1, d.getMonth(), 0))}`);
  pdf.y += 3;

  pdf.summary(
    [
      ['Langganan Tahunan', rupiahRaw(s.harga)],
      ['PPN 11%', rupiahRaw(ppn)],
    ],
    ['TOTAL', rupiahRaw(total)]
  );

  pdf.payment([
    ['Metode', pick(['Kartu Kredit', 'PayPal', 'GoPay'])],
    ['Status', 'LUNAS'],
  ]);

  pdf.footer([s.company, `${s.name.toLowerCase().replace(/ /g, '')}.com`]);
  return pdf;
}

function genSubscriptions() { return genSubSoftware(); }

// ─── Category Map ───────────────────────────────────────────────────────────
const CATEGORIES = [
  ['food_dining', genFoodDining],     // $3 — highest reward
  ['food_dining', genFoodDining],     // $3 — duplicate for weight
  ['food_dining', genFoodDining],     // $3 — duplicate for weight
  ['shopping', genShopping],          // $3 — highest reward
  ['shopping', genShopping],          // $3 — duplicate for weight
  ['shopping', genShopping],          // $3 — duplicate for weight
  ['subscriptions', genSubscriptions], // $2
  ['subscriptions', genSubscriptions], // $2 — duplicate for weight
  ['transport', genTransport],
  ['utilities', genUtilities],        // $1
  ['healthcare', genHealthcare],
  ['entertainment', genEntertainment],
  ['travel', genTravel],
  ['education', genEducation],
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
