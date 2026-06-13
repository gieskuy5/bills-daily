#!/usr/bin/env node
/**
 * BillsOnChain — Receipt PDF Generator (Node.js)
 * 9 categories, 32 real logos, thermal receipt style
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
const rupiah = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Indonesian fake data
const FIRST_NAMES = ['Budi', 'Siti', 'Dewi', 'Ahmad', 'Rina', 'Joko', 'Ani', 'Hendra', 'Lestari', 'Rudi', 'Maya', 'Andi', 'Wati', 'Agus', 'Sari', 'Dian', 'Eko', 'Fitri', 'Gilang', 'Hana'];
const LAST_NAMES = ['Santoso', 'Wijaya', 'Pratama', 'Sari', 'Putra', 'Putri', 'Kusuma', 'Halim', 'Gunawan', 'Lestari', 'Rahayu', 'Nugroho', 'Setiawan', 'Hidayat', 'Purnama'];
const CITIES = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Semarang', 'Makassar', 'Yogyakarta', 'Denpasar', 'Malang', 'Bogor', 'Tangerang', 'Bekasi', 'Depok', 'Solo', 'Palembang'];
const STREETS = ['Jl. Sudirman', 'Jl. Thamrin', 'Jl. Gatot Subroto', 'Jl. Diponegoro', 'Jl. Asia Afrika', 'Jl. Pahlawan', 'Jl. Merdeka', 'Jl. Imam Bonjol', 'Jl. Hayam Wuruk', 'Jl. Gajah Mada'];

const fakeName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
const fakeCity = () => pick(CITIES);
const fakeStreet = () => `${pick(STREETS)} No.${randInt(1, 200)}`;
const fakePhone = () => `08${randInt(10, 99)}${randInt(100000, 9999999)}`;
const fakeEmail = () => `${pick(FIRST_NAMES).toLowerCase()}${randInt(1, 999)}@gmail.com`;
const fakePlat = () => `B ${randInt(1000, 9999)} ${pick(['A', 'B', 'C', 'D', 'E', 'F'])}`;
const now = () => new Date();
const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
const fmtDateTime = (d) => `${fmtDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// ─── Receipt PDF Builder ────────────────────────────────────────────────────
class ReceiptPDF {
  constructor() {
    this.doc = new PDFDocument({ size: [226.77, 850], margins: { top: 14, bottom: 14, left: 14, right: 14 } }); // 80mm wide
    this.y = 14;
    this.fontUsed = false;
  }

  logo(filename, x = 140, y = 10, w = 70) {
    const fp = path.join(LOGO_DIR, filename);
    if (fs.existsSync(fp)) {
      this.doc.image(fp, x, y, { width: w });
      this.y = Math.max(this.y, y + 20);
    }
  }

  logoFull(filename, x = 40, y = 10, w = 120) {
    const fp = path.join(LOGO_DIR, filename);
    if (fs.existsSync(fp)) {
      this.doc.image(fp, x, y, { width: w });
      this.y = Math.max(this.y, y + 45);
    }
  }

  text(str, opts = {}) {
    const { align = 'left', size = 8, bold = false, x } = opts;
    this.doc.font(bold ? 'Courier-Bold' : 'Courier').fontSize(size);
    const xPos = x || 14;
    this.doc.text(str, xPos, this.y, { width: 198, align });
    this.y += size + 2;
  }

  divider() { this.text('-'.repeat(42), { align: 'center' }); }
  blank(h = 8) { this.y += h; }

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
    { header: 'PT.INDOMARCO PRISMATAMA\nMENARA INDOMARET\nJAKARTA UTARA\nNPWP: 01.337.994.6-092.000', name: 'INDOMARET', logo: 'indomaret.png' },
    { header: 'PT.SUMBER ALFARIA TRIJAYA\nALFAMART CENTRAL\nJAKARTA BARAT\nNPWP: 01.878.576.2-091.000', name: 'ALFAMART', logo: 'alfamart.png' },
    { header: 'PT.MATAHARI PUTRA PRIMA\nHYPERMARKET\nTANGERANG\nNPWP: 01.337.994.6-052.000', name: 'HYPERMART', logo: 'hypermart.png' },
  ];
  const items = [
    ['APEL FUJI 1KG', 38000], ['PISANG AMBON', 24500], ['INDOMIE GORENG', 3100], ['AQUA 600ML', 3500],
    ['TEH BOTOL SOSRO', 6500], ['CHITATO SAPI', 11500], ['SILVERQUEEN', 22000], ['BIMOLI 2L', 38500],
    ['GULAKU 1KG', 17500], ['RINSO 700G', 28500], ['LIFEBUOY SOAP', 24500], ['SUNLIGHT', 14800],
    ['OREO VANILLA', 9800], ['BEAR BRAND', 10500], ['NESCAFE CAN', 11000], ['ULTRA MILK 1L', 19500],
    ['BERAS 5KG', 74500], ['POKKA GREEN TEA', 7200], ['COCA COLA 1.5L', 16500], ['PAMPERS M', 54500],
  ];

  const store = pick(stores);
  const pdf = new ReceiptPDF();
  if (store.logo) pdf.logo(store.logo);
  pdf.text(store.header, { size: 6, x: 14 });
  pdf.blank(6);
  pdf.divider();
  const d = now();
  pdf.text(`${fmtDate(d).replace(/\//g, '.')}-${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}/3.0.${randInt(10, 99)}/TW${randInt(100000, 999999)}/${pick(FIRST_NAMES).toUpperCase()}/${randInt(1, 3)}`, { align: 'center', size: 7 });
  pdf.divider();

  const selected = sample(items, randInt(5, 12));
  let total = 0;
  for (const [name, price] of selected) {
    const qty = randInt(1, 5);
    const lp = price * qty;
    total += lp;
    pdf.text(` ${name.padEnd(19)} ${String(qty).padStart(3)} ${rupiah(price).padStart(9)} ${rupiah(lp).padStart(8)}`, { size: 7 });
  }
  pdf.divider();
  const ppn = Math.floor(total * 0.11);
  const totalAll = total + ppn;
  const tunai = totalAll + randInt(5000, 50000);
  pdf.text(`${'TOTAL'.padStart(10)}:  ${rupiah(total).padStart(9)}`, { align: 'right', bold: true });
  pdf.text(`${'PPN 11%'.padStart(10)}: ${rupiah(ppn).padStart(10)}`, { align: 'right' });
  pdf.text(`${'TUNAI'.padStart(10)}: ${rupiah(tunai).padStart(10)}`, { align: 'right' });
  pdf.text(`${'KEMBALI'.padStart(10)}: ${rupiah(tunai - totalAll).padStart(10)}`, { align: 'right' });
  pdf.blank(10);
  pdf.text('LAYANAN KONSUMEN', { align: 'center' });
  pdf.text('SMS/WA 0811.1500.280', { align: 'center' });
  return pdf;
}

function genTransportGrab() {
  const pdf = new ReceiptPDF();
  pdf.logoFull('grab.png', 60, 10, 100);
  pdf.text('PT.GRAB TEKNOLOGI INDONESIA', { align: 'center', size: 7 });
  pdf.blank(3); pdf.divider();
  pdf.text(`Tanggal: ${fmtDateTime(now())}`);
  pdf.text(`Invoice: GRB-${randInt(100000, 999999)}`);
  pdf.text(`Driver: ${fakeName()}`);
  pdf.text(`Plat: ${fakePlat()}`);
  pdf.divider();
  pdf.text(`Dari: ${fakeStreet().slice(0, 30)}`);
  pdf.text(`Ke: ${fakeStreet().slice(0, 30)}`);
  const jarak = (Math.random() * 22 + 3).toFixed(1);
  const tarif = randInt(15000, 85000);
  const diskon = pick([0, 0, randInt(2000, 10000)]);
  pdf.text(`Jarak: ${jarak} km`);
  pdf.text(`Tarif dasar:   ${rupiah(tarif)}`);
  if (diskon) pdf.text(`Diskon:       -${rupiah(diskon)}`);
  pdf.divider();
  pdf.text(`TOTAL:         ${rupiah(tarif - diskon)}`, { bold: true });
  pdf.text('Pembayaran: GrabPay');
  return pdf;
}

function genTransportGojek() {
  const pdf = new ReceiptPDF();
  pdf.logoFull('gojek.png', 60, 10, 100);
  pdf.text('PT.GOJEK INDONESIA', { align: 'center', size: 7 });
  pdf.blank(3); pdf.divider();
  pdf.text(`Tanggal: ${fmtDateTime(now())}`);
  pdf.text(`Order: GO-${randInt(10000000, 99999999)}`);
  pdf.text(`Driver: ${fakeName()}`);
  pdf.divider();
  pdf.text(`Layanan: ${pick(['GoRide', 'GoCar', 'GoFood', 'GoSend'])}`);
  pdf.text(`Dari: ${fakeStreet().slice(0, 30)}`);
  pdf.text(`Ke: ${fakeStreet().slice(0, 30)}`);
  const tarif = randInt(12000, 75000);
  pdf.divider();
  pdf.text(`TOTAL:          ${rupiah(tarif)}`, { bold: true });
  pdf.text('Bayar: GoPay');
  return pdf;
}

function genTransportToll() {
  const pdf = new ReceiptPDF();
  pdf.logo('grab.png', 14, 10, 80);
  pdf.y = 30;
  pdf.text('PT.JASA MARGA (PERSERO) TBK', { align: 'center', size: 7 });
  pdf.blank(3); pdf.divider();
  pdf.text(`Tanggal: ${fmtDateTime(now())}`);
  pdf.text(`Masuk: GT ${pick(['Cikampek', 'Cikunir', 'Pondok Ranji', 'Bintaro', 'Serpong'])}`);
  pdf.text(`Keluar: GT ${pick(['Halim', 'Cawang', 'Tebet', 'Kuningan', 'Casablanca', 'Semanggi'])}`);
  pdf.text(`Golongan: ${pick(['I', 'II', 'III'])}`);
  pdf.divider();
  const tarif = pick([5000, 6500, 8000, 9500, 11000, 12500, 15000]);
  pdf.text(`TOLL FEE:       ${rupiah(tarif)}`, { bold: true });
  pdf.text('Bayar: e-Money / Flazz');
  return pdf;
}

function genTransportParking() {
  const pdf = new ReceiptPDF();
  pdf.text('TIKET PARKIR', { align: 'center', size: 12, bold: true });
  pdf.text(pick(['MAL TAMAN ANGGREK', 'PLUIT VILLAGE', 'CENTRAL PARK', 'SUMMARECON MALL', 'AEON MALL']), { align: 'center' });
  pdf.blank(3); pdf.divider();
  const d = now();
  const masuk = new Date(d.getTime() - randInt(1, 5) * 3600000);
  pdf.text(`Masuk: ${fmtDateTime(masuk)}`);
  pdf.text(`Keluar: ${fmtDateTime(d)}`);
  pdf.text(`Plat: ${fakePlat()}`);
  pdf.divider();
  const tarif = pick([5000, 8000, 10000, 12000, 15000, 20000]);
  pdf.text(`BIAYA PARKIR:   ${rupiah(tarif)}`, { bold: true });
  return pdf;
}

function genTransport() { return pick([genTransportGrab, genTransportGojek, genTransportToll, genTransportParking])(); }

function genUtilPLN() {
  const pdf = new ReceiptPDF();
  pdf.logoFull('pln.png', 40, 10, 130);
  pdf.text('PEMBAYARAN LISTRIK PASCABAYAR', { align: 'center', size: 8 });
  pdf.blank(3); pdf.divider();
  pdf.text(`Tanggal: ${fmtDate(now())}`);
  pdf.text(`No. Rekening: ${randInt(100000000, 999999999)}`);
  pdf.text(`Nama: ${fakeName()}`);
  pdf.text(`Daya: ${pick([1300, 2200, 3500, 4400, 5500])} VA`);
  pdf.divider();
  const pemakaian = randInt(80, 400);
  const tarif = pick([1444, 1444, 1699, 1699]);
  const total = pemakaian * tarif;
  pdf.text(`Pemakaian: ${pemakaian} kWh`);
  pdf.text(`Tarif/kWh: ${rupiah(tarif)}`);
  pdf.divider();
  pdf.text(`TOTAL:     ${rupiah(total)}`, { bold: true });
  return pdf;
}

function genUtilInternet() {
  const providers = [
    { name: 'INDIHOME', company: 'PT.TELKOM INDONESIA', logo: 'indihome.png' },
    { name: 'BIZNET', company: 'PT.BIZNET NETWORKS', logo: 'biznet.png' },
    { name: 'MYREPUBLIC', company: 'PT.MY REPUBLIC INDONESIA', logo: null },
  ];
  const p = pick(providers);
  const pdf = new ReceiptPDF();
  if (p.logo) pdf.logoFull(p.logo, 40, 10, 130);
  else pdf.text(p.name, { align: 'center', size: 14, bold: true });
  pdf.text(p.company, { align: 'center', size: 7 });
  pdf.blank(3); pdf.divider();
  pdf.text(`Tanggal: ${fmtDate(now())}`);
  pdf.text(`No. Pelanggan: ${randInt(10000000, 99999999)}`);
  pdf.text(`Nama: ${fakeName()}`);
  pdf.text(`Paket: ${pick(['50 Mbps', '100 Mbps', '200 Mbps', '300 Mbps'])}`);
  pdf.divider();
  const harga = pick([275000, 320000, 450000, 575000, 750000, 900000]);
  const ppn = Math.floor(harga * 0.11);
  pdf.text(`Langganan: ${rupiah(harga)}`);
  pdf.text(`PPN 11%:   ${rupiah(ppn)}`);
  pdf.divider();
  pdf.text(`TOTAL:     ${rupiah(harga + ppn)}`, { bold: true });
  return pdf;
}

function genUtilPulsa() {
  const pdf = new ReceiptPDF();
  pdf.text('PEMBELIAN PULSA / PAKET DATA', { align: 'center', size: 9, bold: true });
  pdf.blank(2); pdf.divider();
  pdf.text(`Tanggal: ${fmtDateTime(now())}`);
  pdf.text(`ID: TRX${randInt(100000000, 999999999)}`);
  const op = pick(['Telkomsel', 'Indosat', 'XL Axiata', 'Tri', 'Smartfren']);
  const opLogos = { Telkomsel: 'telkomsel.png', Indosat: 'indosat.png', 'XL Axiata': 'xl_axiata.png' };
  if (opLogos[op]) { pdf.logo(opLogos[op], 60, 10, 100); pdf.y = 30; }
  pdf.text(`Operator: ${op}`);
  pdf.text(`No: 08${randInt(10000000, 99999999)}`);
  const [produk, harga] = pick([['Pulsa 50K', 52000], ['Pulsa 100K', 102000], ['Data 15GB', 55000], ['Data 30GB', 80000], ['Data 50GB', 120000]]);
  pdf.text(`Produk: ${produk}`);
  pdf.divider();
  pdf.text(`TOTAL:     ${rupiah(harga)}`, { bold: true });
  return pdf;
}

function genUtilities() { return pick([genUtilPLN, genUtilInternet, genUtilPulsa])(); }

function genHealthApotek() {
  const apoteks = [
    { name: 'APOTEK KIMIA FARMA', logo: 'kimia_farma.png' },
    { name: 'APOTEK GUARDIAN', logo: 'guardian.png' },
    { name: 'CENTURY PHARMACY', logo: null },
  ];
  const a = pick(apoteks);
  const pdf = new ReceiptPDF();
  if (a.logo) pdf.logoFull(a.logo, 40, 10, 130);
  else pdf.text(a.name, { align: 'center', size: 12, bold: true });
  pdf.text(`Cabang: ${fakeCity()}`, { align: 'center', size: 7 });
  pdf.blank(3); pdf.divider();
  pdf.text(`Tanggal: ${fmtDateTime(now())}`);
  pdf.text(`Nota: FAR-${randInt(100000, 999999)}`);
  pdf.text(`Apoteker: ${fakeName()}`);
  pdf.divider();
  const obat = [
    ['AMOXICILLIN 500MG', 15000], ['PARACETAMOL 500MG', 8000], ['BODREX TAB', 12000],
    ['ANTANGIN JRG CAIR', 7500], ['VIT-C 1000MG', 25000], ['OMEPRAZOLE 20MG', 18000],
    ['CETIRIZINE 10MG', 14000], ['INSTO EYE DROP', 16000], ['BETADINE 15ML', 19500],
  ];
  const selected = sample(obat, randInt(2, 6));
  let total = 0;
  for (const [name, price] of selected) {
    const qty = randInt(1, 3);
    const lp = price * qty; total += lp;
    pdf.text(` ${name.padEnd(20)} ${qty}x ${rupiah(price).padStart(9)} ${rupiah(lp).padStart(8)}`, { size: 7 });
  }
  pdf.divider();
  pdf.text(`TOTAL:         ${rupiah(total)}`, { bold: true });
  return pdf;
}

function genHealthcare() { return genHealthApotek(); }

function genEntCinema() {
  const cinemas = [
    { name: 'XXI', logo: 'xxi.png' },
    { name: 'CGV', logo: 'cgv.png' },
    { name: 'CINEMAXX', logo: null },
  ];
  const c = pick(cinemas);
  const pdf = new ReceiptPDF();
  if (c.logo) pdf.logoFull(c.logo, 40, 10, 130);
  else pdf.text(`BIOSKOP ${c.name}`, { align: 'center', size: 12, bold: true });
  pdf.text(`Mall: ${fakeCity()} Town Square`, { align: 'center', size: 7 });
  pdf.blank(3); pdf.divider();
  pdf.text(`Tanggal: ${fmtDate(now())}`);
  pdf.text(`Order: ${c.name}-${randInt(100000, 999999)}`);
  pdf.text(`Film: ${pick(['Avengers: Secret Wars', 'Spider-Man 4', 'The Batman 2', 'Fast X2', 'Jurassic World 4'])}`);
  pdf.text(`Jam: ${pick(['13:30', '15:45', '18:00', '20:15', '21:30'])}`);
  const tiket = randInt(1, 4);
  const harga = pick([45000, 50000, 55000, 60000, 75000]);
  pdf.text(`Kursi: ${tiket}x (${rupiah(harga)}/tiket)`);
  pdf.divider();
  pdf.text(`TOTAL:         ${rupiah(tiket * harga)}`, { bold: true });
  return pdf;
}

function genEntStreaming() {
  const platforms = [
    { name: 'NETFLIX', company: 'Netflix Indonesia', harga: pick([65000, 120000, 186000]), logo: 'netflix.png' },
    { name: 'SPOTIFY', company: 'Spotify AB', harga: pick([54990, 85990]), logo: 'spotify.png' },
    { name: 'DISNEY+ HOTSTAR', company: 'The Walt Disney Co', harga: pick([39000, 79000]), logo: 'disney.png' },
  ];
  const p = pick(platforms);
  const pdf = new ReceiptPDF();
  pdf.logoFull(p.logo, 40, 10, 130);
  pdf.text(p.company, { align: 'center', size: 7 });
  pdf.blank(3); pdf.divider();
  pdf.text(`Tanggal: ${fmtDate(now())}`);
  pdf.text(`Invoice: INV-${randInt(100000, 999999)}`);
  pdf.text(`Akun: ${fakeEmail()}`);
  pdf.divider();
  pdf.text(`TOTAL:         ${rupiah(p.harga)}`, { bold: true });
  return pdf;
}

function genEntertainment() { return pick([genEntCinema, genEntStreaming])(); }

function genShopEcommerce() {
  const platforms = [
    { name: 'SHOPEE', logo: 'shopee.png' },
    { name: 'TOKOPEDIA', logo: 'tokopedia.png' },
    { name: 'LAZADA', logo: null },
  ];
  const p = pick(platforms);
  const pdf = new ReceiptPDF();
  if (p.logo) pdf.logoFull(p.logo, 40, 10, 130);
  else pdf.text(p.name, { align: 'center', size: 14, bold: true });
  pdf.text(`PT.${p.name} INDONESIA`, { align: 'center', size: 7 });
  pdf.blank(3); pdf.divider();
  pdf.text(`Tanggal: ${fmtDate(now())}`);
  pdf.text(`INV/${randInt(100000000, 999999999)}`);
  pdf.divider();
  const items = [
    ['Kaos Polos Cotton', 75000], ['Celana Chino Pria', 150000], ['Tas Ransel Laptop', 185000],
    ['Charger USB-C 65W', 120000], ['Mouse Wireless', 89000], ['Earphone TWS', 95000],
  ];
  const selected = sample(items, randInt(1, 4));
  let subtotal = 0;
  for (const [name, price] of selected) {
    const qty = randInt(1, 2); const lp = price * qty; subtotal += lp;
    pdf.text(` ${name.padEnd(25)} ${qty} ${rupiah(lp).padStart(10)}`, { size: 7 });
  }
  const ongkir = pick([0, 15000, 20000, 25000, 30000]);
  pdf.divider();
  pdf.text(`Subtotal:      ${rupiah(subtotal)}`);
  if (ongkir) pdf.text(`Ongkir:        ${rupiah(ongkir)}`);
  pdf.divider();
  pdf.text(`TOTAL:         ${rupiah(subtotal + ongkir)}`, { bold: true });
  return pdf;
}

function genShopMall() {
  const stores = [
    { name: 'ZARA', logo: 'zara.png' }, { name: 'H&M', logo: 'hm.png' },
    { name: 'UNIQLO', logo: 'uniqlo.png' }, { name: 'MATAHARI', logo: 'matahari.png' },
  ];
  const s = pick(stores);
  const pdf = new ReceiptPDF();
  pdf.logoFull(s.logo, 40, 10, 130);
  pdf.text(`Mall: ${fakeCity()} Mall`, { align: 'center', size: 7 });
  pdf.blank(3); pdf.divider();
  pdf.text(`Tanggal: ${fmtDateTime(now())}`);
  pdf.text(`Nota: ${randInt(100000, 999999)}`);
  pdf.divider();
  const items = [
    ['Kemeja Flannel', 299000], ['Kaos Polo', 199000], ['Celana Jeans', 399000],
    ['Jaket Hoodie', 349000], ['Sepatu Sneakers', 499000], ['Parfum 100ml', 259000],
  ];
  const selected = sample(items, randInt(1, 3));
  let total = 0;
  for (const [name, price] of selected) { total += price; pdf.text(` ${name.padEnd(25)} ${rupiah(price).padStart(10)}`, { size: 7 }); }
  pdf.divider();
  pdf.text(`TOTAL:         ${rupiah(total)}`, { bold: true });
  return pdf;
}

function genShopping() { return pick([genShopEcommerce, genShopMall])(); }

function genTravelHotel() {
  const pdf = new ReceiptPDF();
  pdf.text(pick(['HARRIS HOTEL', 'NOVOTEL', 'BEST WESTERN', 'IBIS BUDGET', 'FAVEHOTEL']), { align: 'center', size: 12, bold: true });
  pdf.text(`Jl. ${fakeStreet().slice(0, 35)}`, { align: 'center', size: 7 });
  pdf.blank(3); pdf.divider();
  const d = now();
  const nights = randInt(1, 4);
  pdf.text(`Check-in:  ${fmtDate(new Date(d.getTime() - randInt(1, 5) * 86400000))}`);
  pdf.text(`Check-out: ${fmtDate(d)}`);
  pdf.text(`Guest: ${fakeName()}`);
  pdf.text(`Room: ${pick(['Standard', 'Superior', 'Deluxe'])} x${nights} malam`);
  pdf.divider();
  const hargaMalam = pick([350000, 450000, 550000, 750000, 950000]);
  const subtotal = hargaMalam * nights;
  const service = Math.floor(subtotal * 0.1);
  const tax = Math.floor(subtotal * 0.11);
  pdf.text(`Room: ${nights}x ${rupiah(hargaMalam)} = ${rupiah(subtotal)}`);
  pdf.text(`Service 10%:   ${rupiah(service)}`);
  pdf.text(`Tax 11%:       ${rupiah(tax)}`);
  pdf.divider();
  pdf.text(`TOTAL:         ${rupiah(subtotal + service + tax)}`, { bold: true });
  return pdf;
}

function genTravelAirline() {
  const airlines = [
    { name: 'LION AIR', logo: 'lion_air.png' }, { name: 'GARUDA INDONESIA', logo: 'garuda.png' },
    { name: 'AIRASIA', logo: 'airasia.png' },
  ];
  const a = pick(airlines);
  const pdf = new ReceiptPDF();
  pdf.logoFull(a.logo, 40, 10, 130);
  pdf.text('E-TICKET / INVOICE', { align: 'center', size: 8 });
  pdf.blank(3); pdf.divider();
  pdf.text(`Tanggal: ${fmtDate(now())}`);
  pdf.text(`Booking: ${randInt(100000, 999999)}`);
  pdf.text(`Penumpang: ${fakeName()}`);
  pdf.divider();
  const [asal, tujuan] = pick([['CGK', 'DPS'], ['CGK', 'SUB'], ['CGK', 'KNO'], ['DPS', 'CGK'], ['SUB', 'CGK']]);
  pdf.text(`Rute: ${asal} -> ${tujuan}`);
  pdf.text(`Jam: ${pick(['06:00', '08:30', '11:00', '14:15', '17:00', '20:30'])}`);
  pdf.divider();
  const harga = pick([450000, 650000, 850000, 1200000, 1500000, 2000000]);
  const tax = Math.floor(harga * 0.15);
  pdf.text(`Tiket:         ${rupiah(harga)}`);
  pdf.text(`Tax & Fee:     ${rupiah(tax)}`);
  pdf.divider();
  pdf.text(`TOTAL:         ${rupiah(harga + tax)}`, { bold: true });
  return pdf;
}

function genTravel() { return pick([genTravelHotel, genTravelAirline])(); }

function genEduCourse() {
  const kursus = [
    { name: 'EF ENGLISH FIRST', logo: 'gramedia.png' }, { name: 'PRIMAGAMA', logo: 'gramedia.png' },
    { name: 'CODEPOLITAN', logo: null },
  ];
  const k = pick(kursus);
  const pdf = new ReceiptPDF();
  if (k.logo) pdf.logoFull(k.logo, 40, 10, 130);
  else pdf.text(k.name, { align: 'center', size: 12, bold: true });
  pdf.text(`Cabang: ${fakeCity()}`, { align: 'center', size: 7 });
  pdf.blank(3); pdf.divider();
  pdf.text(`Tanggal: ${fmtDate(now())}`);
  pdf.text(`No. Kwitansi: KW-${randInt(100000, 999999)}`);
  pdf.divider();
  const [prog, harga] = pick([
    ['English Basic 3 Bulan', 2500000], ['IELTS Preparation', 3500000],
    ['Digital Marketing', 1800000], ['Web Development', 4500000],
  ]);
  pdf.text(`Program: ${prog}`);
  pdf.divider();
  pdf.text(`TOTAL:         ${rupiah(harga)}`, { bold: true });
  return pdf;
}

function genEduBook() {
  const stores = [
    { name: 'GRAMEDIA', logo: 'gramedia.png' }, { name: 'KINOKUNIA', logo: 'gramedia.png' },
  ];
  const s = pick(stores);
  const pdf = new ReceiptPDF();
  pdf.logoFull(s.logo, 40, 10, 130);
  pdf.text(`Mall: ${fakeCity()}`, { align: 'center', size: 7 });
  pdf.blank(3); pdf.divider();
  pdf.text(`Tanggal: ${fmtDateTime(now())}`);
  pdf.divider();
  const books = [
    ['Atomic Habits', 120000], ['Rich Dad Poor Dad', 95000], ['Sapiens', 145000],
    ['Clean Code', 250000], ['Deep Work', 105000], ['Laskar Pelangi', 68000],
  ];
  const selected = sample(books, randInt(1, 4));
  let total = 0;
  for (const [name, price] of selected) { total += price; pdf.text(` ${name.padEnd(28)} ${rupiah(price).padStart(10)}`, { size: 7 }); }
  pdf.divider();
  pdf.text(`TOTAL:         ${rupiah(total)}`, { bold: true });
  return pdf;
}

function genEducation() { return pick([genEduCourse, genEduBook])(); }

function genSubSoftware() {
  const softwares = [
    { name: 'MICROSOFT 365', company: 'PT.Microsoft Indonesia', harga: 1199000, logo: 'microsoft.png' },
    { name: 'ADOBE CREATIVE', company: 'Adobe Inc.', harga: 899000, logo: 'adobe.png' },
    { name: 'CANVA PRO', company: 'Canva Pty Ltd', harga: 749000, logo: 'canva.png' },
  ];
  const s = pick(softwares);
  const pdf = new ReceiptPDF();
  pdf.logoFull(s.logo, 40, 10, 130);
  pdf.text(s.company, { align: 'center', size: 7 });
  pdf.blank(3); pdf.divider();
  pdf.text(`Tanggal: ${fmtDate(now())}`);
  pdf.text(`Invoice: INV-${randInt(100000, 999999)}`);
  pdf.divider();
  pdf.text(`TOTAL:         ${rupiah(s.harga)}`, { bold: true });
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
