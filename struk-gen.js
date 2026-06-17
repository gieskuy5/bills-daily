/**
 * Struk Generator — Indonesian thermal receipt PDF generator
 * Ported from https://struk-app-kohl.vercel.app/
 * Pure Node.js with jsPDF — zero browser dependency
 */

const { jsPDF } = require('jspdf');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rupiah = (n) => 'Rp ' + n.toLocaleString('id-ID');

// ─── Store Templates ───────────────────────────────────────────────────────
const STORES = [
  { name: 'TOKO MAKMUR', phone: '021-5551234', addr: 'Jl. Merdeka No. 123', npwp: '01.234.567.8-999.000' },
  { name: 'TOKO BERKAH', phone: '021-5559876', addr: 'Jl. Sudirman No. 45', npwp: '02.345.678.9-001.000' },
  { name: 'MINIMARKET SEGAR', phone: '021-5552468', addr: 'Jl. Thamrin No. 78', npwp: '03.456.789.0-112.000' },
  { name: 'TOKO SINAR JAYA', phone: '021-5553691', addr: 'Jl. Gatot Subroto No. 12', npwp: '04.567.890.1-223.000' },
  { name: 'PASAR SWALAYAN', phone: '021-5554802', addr: 'Jl. Diponegoro No. 56', npwp: '05.678.901.2-334.000' },
  { name: 'TOKO SENTOSA', phone: '021-5557418', addr: 'Jl. Ahmad Yani No. 89', npwp: '06.789.012.3-445.000' },
  { name: 'HYPERMARKET JAYA', phone: '021-5558529', addr: 'Jl. Rasuna Said No. 34', npwp: '07.890.123.4-556.000' },
  { name: 'TOKO PRIMA', phone: '021-5559630', addr: 'Jl. Kuningan No. 67', npwp: '08.901.234.5-667.000' },
  { name: 'WARUNG NUSANTARA', phone: '021-5551741', addr: 'Jl. Mangkubumi No. 90', npwp: '09.012.345.6-778.000' },
  { name: 'TOKO MAJU MUNDUR', phone: '021-5552852', addr: 'Jl. Veteran No. 23', npwp: '10.123.456.7-889.000' },
];

const CASHIERS = ['ADE', 'SITI', 'BUDI', 'RINA', 'DEWI', 'ANDI', 'RATNA', 'EKO', 'MAYA', 'FAJAR', 'CITRA', 'YOGA'];

// ─── Product Categories ────────────────────────────────────────────────────
const CATEGORIES = {
  'food': {
    label: 'Makanan & Minuman',
    items: ['Nasi Goreng','Mie Goreng','Ayam Goreng','Sate Ayam','Bakso','Mie Ayam','Soto Ayam','Rendang',
      'Gudeg','Kopi Susu','Teh Manis','Es Jeruk','Air Mineral','Nasi Padang','Nasi Uduk','Bubur Ayam',
      'Siomay','Batagor','Martabak','Pempek','Ikan Bakar','Udang Goreng','Ayam Penyet','Bebek Goreng',
      'Es Campur','Roti Bakar','Pisang Goreng','Seblak','Cilok','Gorengan','Tahu Isi','Tempe Mendoan'],
    minPrice: 3000, maxPrice: 50000,
  },
  'transport': {
    label: 'Transport',
    items: ['Gojek','GrabCar','Taxi','Angkot','Busway','Kereta Ekonomi','MRT','KRL','Bensin Pertalite',
      'Bensin Pertamax','Parkir','Tol','Grab Bike','Transjakarta','LRT','Ojek Online'],
    minPrice: 5000, maxPrice: 200000,
  },
  'utilities': {
    label: 'Utilities',
    items: ['Token Listrik 50rb','Token Listrik 100rb','Air PDAM','Gas 5.5kg','Pulsa 25rb','Pulsa 50rb',
      'Kuota 5GB','Kuota 10GB','Internet Fiber','Tagihan Listrik','BPJS Kesehatan','Tagihan Air'],
    minPrice: 20000, maxPrice: 500000,
  },
  'healthcare': {
    label: 'Healthcare',
    items: ['Dokter Umum','Obat Batuk','Obat Flu','Vitamin C','Multivitamin','Masker Medis','Hand Sanitizer',
      'Obat Maag','Obat Demam','Obat Alergi','Pasta Gigi','Sabun Antiseptik','Termometer'],
    minPrice: 10000, maxPrice: 200000,
  },
  'entertainment': {
    label: 'Entertainment',
    items: ['Tiket Bioskop','Netflix','Spotify','Game Online','Karaoke','Futsal','Gym','Bowling',
      'PlayStation','Steam Wallet','Konser','Taman Hiburan','Museum','Arcade'],
    minPrice: 25000, maxPrice: 150000,
  },
  'shopping': {
    label: 'Shopping',
    items: ['Beras 5kg','Minyak Goreng 1L','Gula 1kg','Telur 1kg','Sabun Mandi','Shampoo','Mie Instan',
      'Baju Kaos','Celana Jeans','Sepatu','Tas Ransel','Handuk','Sprei','Rice Cooker','Blender',
      'Daging Ayam','Ikan Segar','Tahu','Tempe','Kopi Bubuk','Teh Celup','Susu Kental Manis'],
    minPrice: 3500, maxPrice: 250000,
  },
  'electronics': {
    label: 'Electronics',
    items: ['Kabel Charger','Power Bank','Headset BT','Flashdisk','Mouse','Speaker BT','Keyboard',
      'Webcam','Earbuds','TWS','Charger Laptop','SSD','RAM','Micro SD'],
    minPrice: 10000, maxPrice: 500000,
  },
  'travel': {
    label: 'Travel',
    items: ['Hotel','Tiket Pesawat','Tiket Kereta','Sewa Mobil','Homestay','Hostel','Travel',
      'Shuttle','Tiket Kapal','Koper','Neck Pillow','Sunscreen'],
    minPrice: 50000, maxPrice: 1000000,
  },
  'education': {
    label: 'Education',
    items: ['Buku Pelajaran','Kursus Online','Alat Tulis','Bimbel','Buku Tulis','Pulpen','Spidol',
      'Kalkulator','Les Matematika','Les Bahasa Inggris','Webinar','Seminar','Sertifikasi'],
    minPrice: 15000, maxPrice: 350000,
  },
  'subscriptions': {
    label: 'Subscriptions',
    items: ['YouTube Premium','Netflix','Spotify','iCloud 50GB','Microsoft 365','Disney+','Canva Pro',
      'Adobe CC','Google One','Dropbox','Zoom Pro','Notion','Figma','ChatGPT Plus','GitHub Copilot'],
    minPrice: 25000, maxPrice: 400000,
  },
};

const PAYMENT_METHODS = ['Tunai','Kartu Debit','QRIS','GoPay','OVO','Dana'];

// ─── Generate Random Receipt Data ──────────────────────────────────────────
function generateReceiptData(categoryFilter) {
  const store = pick(STORES);
  const cashier = pick(CASHIERS);
  
  // Random date 1-3 months back
  const now = new Date();
  const monthsBack = 1 + Math.floor(Math.random() * 3);
  const daysBack = Math.floor(Math.random() * 30);
  const receiptDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, now.getDate() - daysBack);
  const receiptHour = rand(8, 21);
  const receiptMinute = rand(0, 59);
  
  const dateISO = `${receiptDate.getFullYear()}${String(receiptDate.getMonth()+1).padStart(2,'0')}${String(receiptDate.getDate()).padStart(2,'0')}`;
  const transNo = `POS/${dateISO}/${rand(10,99)}`;
  
  // Pick category
  let catKey = categoryFilter || pick(Object.keys(CATEGORIES));
  const cat = CATEGORIES[catKey];
  
  // Pick 1-5 random items
  const count = rand(1, 5);
  const chosenItems = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    let item;
    do { item = pick(cat.items); } while (used.has(item));
    used.add(item);
    const price = Math.round((cat.minPrice + Math.random() * (cat.maxPrice - cat.minPrice)) / 100) * 100;
    const qty = rand(1, 3);
    chosenItems.push({ name: item, qty, price: Math.max(500, price) });
  }
  
  const discount = pick([0, 0, 0, 5, 10, 15]);
  const tax = pick([0, 0, 0, 10, 11]);
  const fee = pick([0, 0, 0, 5000, 10000]);
  const payment = pick(PAYMENT_METHODS);
  
  return { store, cashier, transNo, category: catKey, categoryLabel: cat.label, items: chosenItems, discount, tax, fee, payment, receiptDate, receiptHour, receiptMinute };
}

// ─── Generate PDF Receipt ──────────────────────────────────────────────────
function generateReceiptPDF(data) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 200] }); // thermal receipt size
  let y = 5;
  const w = 80;
  const cx = w / 2;
  const lm = 4; // left margin
  const rm = w - 4; // right margin
  const lineW = rm - lm;

  // Font setup (Courier for monospace receipt look)
  doc.setFont('courier', 'bold');
  doc.setFontSize(10);

  // Store name
  doc.text(data.store.name, cx, y, { align: 'center' });
  y += 5;
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.text(data.store.addr, cx, y, { align: 'center' });
  y += 4;
  doc.text('Telp: ' + data.store.phone, cx, y, { align: 'center' });
  y += 4;
  doc.text('NPWP: ' + data.store.npwp, cx, y, { align: 'center' });
  y += 5;

  // Separator
  doc.setLineWidth(0.3);
  doc.line(lm, y, rm, y);
  y += 3;

  // Transaction info
  doc.setFontSize(6.5);
  doc.text('KASIR: ' + data.cashier, lm, y);
  y += 3.5;
  doc.text(data.transNo, lm, y);
  y += 3.5;
  const now = new Date();
  const rd = data.receiptDate || now;
  const rHour = data.receiptHour ?? now.getHours();
  const rMin = data.receiptMinute ?? now.getMinutes();
  const dateStr = `${rd.getDate()}/${rd.getMonth()+1}/${rd.getFullYear()}  ${String(rHour).padStart(2,'0')}.${String(rMin).padStart(2,'0')}`;
  doc.text(dateStr, lm, y);
  y += 4;

  // Separator
  doc.line(lm, y, rm, y);
  y += 3;

  // Items
  let subtotal = 0;
  doc.setFontSize(7);
  for (const item of data.items) {
    const total = item.qty * item.price;
    subtotal += total;
    
    // Item name (truncate if too long)
    const displayName = item.name.length > 22 ? item.name.substring(0, 22) : item.name;
    doc.text(displayName, lm, y);
    doc.text(rupiah(total), rm, y, { align: 'right' });
    y += 3.5;
    doc.setFontSize(6);
    doc.text(`  ${item.qty} x ${rupiah(item.price)}`, lm, y);
    doc.setFontSize(7);
    y += 4;
  }

  // Separator
  doc.line(lm, y, rm, y);
  y += 3;

  // Subtotal
  doc.text('Subtotal', lm, y);
  doc.text(rupiah(subtotal), rm, y, { align: 'right' });
  y += 4;

  let total = subtotal;

  // Discount
  if (data.discount > 0) {
    const discAmt = Math.round(subtotal * data.discount / 100);
    total -= discAmt;
    doc.text(`Diskon (${data.discount}%)`, lm, y);
    doc.text('- ' + rupiah(discAmt), rm, y, { align: 'right' });
    y += 4;
  }

  // Tax
  if (data.tax > 0) {
    const taxAmt = Math.round(total * data.tax / 100);
    total += taxAmt;
    doc.text(`PPN (${data.tax}%)`, lm, y);
    doc.text(rupiah(taxAmt), rm, y, { align: 'right' });
    y += 4;
  }

  // Fee
  if (data.fee > 0) {
    total += data.fee;
    doc.text('Biaya Layanan', lm, y);
    doc.text(rupiah(data.fee), rm, y, { align: 'right' });
    y += 4;
  }

  // Double separator for total
  doc.line(lm, y, rm, y);
  y += 1;
  doc.line(lm, y, rm, y);
  y += 4;

  // TOTAL
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL', lm, y);
  doc.text(rupiah(total), rm, y, { align: 'right' });
  y += 5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(7);

  // Payment
  if (data.payment === 'Tunai') {
    const paid = Math.ceil(total / 1000) * 1000;
    const change = paid - total;
    doc.text('Tunai', lm, y);
    doc.text(rupiah(paid), rm, y, { align: 'right' });
    y += 4;
    doc.text('Kembalian', lm, y);
    doc.text(rupiah(change), rm, y, { align: 'right' });
    y += 4;
  } else {
    doc.text(data.payment, lm, y);
    doc.text(rupiah(total), rm, y, { align: 'right' });
    y += 4;
  }

  // Footer
  y += 2;
  doc.line(lm, y, rm, y);
  y += 4;
  doc.text('Terima Kasih Atas Kunjungan Anda', cx, y, { align: 'center' });
  y += 4;
  doc.text('Barang yang sudah dibeli', cx, y, { align: 'center' });
  y += 3.5;
  doc.text('tidak dapat dikembalikan', cx, y, { align: 'center' });

  return doc;
}

// ─── Main: Generate and save PDF ───────────────────────────────────────────
function generateReceipt(categoryFilter) {
  const data = generateReceiptData(categoryFilter);
  const doc = generateReceiptPDF(data);
  
  const tmpDir = path.join(__dirname, 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  
  const filename = `struk_${data.category}_${Date.now()}_${rand(1000,9999)}.pdf`;
  const filepath = path.join(tmpDir, filename);
  
  const pdfBytes = doc.output('arraybuffer');
  fs.writeFileSync(filepath, Buffer.from(pdfBytes));
  
  const size = fs.statSync(filepath).size;
  
  return { filepath, size, category: data.category, filename, data };
}

module.exports = { generateReceipt, CATEGORIES };
