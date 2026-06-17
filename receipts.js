#!/usr/bin/env node
/**
 * BillsOnChain — Indomaret Thermal Receipt Generator
 * Style: 80mm thermal receipt (Indomaret POS)
 * - Courier monospace throughout
 * - Logo + company header
 * - Random Indonesian grocery items
 * - PPN 11%, cash payment
 */

'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const LOGO_BW = path.join(__dirname, 'logos', 'indomaret_bw.png');
const LOGO_COLOR = path.join(__dirname, 'logos', 'indomaret.png');

// ─── Helpers ────────────────────────────────────────────────────────────────
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sample = (arr, k) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, k);
};
const formatRupiah = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const padL = (s, w) => String(s).padEnd(w);
const padR = (s, w) => String(s).padStart(w);

// ─── Fake Data ──────────────────────────────────────────────────────────────
const FIRST_NAMES = ['Budi', 'Siti', 'Dewi', 'Ahmad', 'Rina', 'Joko', 'Ani', 'Hendra', 'Lestari', 'Rudi',
  'Maya', 'Andi', 'Wati', 'Agus', 'Sari', 'Dian', 'Eko', 'Fitri', 'Gilang', 'Hana',
  'Rizki', 'Nurul', 'Tono', 'Wawan', 'Lia', 'Hadi', 'Ratna', 'Yanto', 'Susi', 'Dani'];

// ─── Store Codes & Addresses ────────────────────────────────────────────────
const STORES = [
  { code: '088290520206', name: 'RAYA KUTRUK', addr: 'KP. KUTRUK RT 03/RW 01 KEL. KUTRUK', area: 'KEC. JAMBE KAB TANGERANG, 15720' },
  { code: '088120410101', name: 'MERUYA SELATAN', addr: 'JL. MERUYA SELATAN RT 05/RW 06 NO. 23', area: 'KEC. KEMBANGAN JAKARTA BARAT, 11650' },
  { code: '088230650304', name: 'PONDOK AREN', addr: 'JL. GRAHA RAYA BINTARO RT 02/RW 08', area: 'KEC. PONDOK AREN TANGERANG SELATAN, 15224' },
  { code: '088150320201', name: 'TANJUNG DUREN', addr: 'JL. TANJUNG DUREN RAYA NO. 88 RT 04/RW 03', area: 'KEC. GROGOL PETAMBURAN JAKARTA BARAT, 11470' },
  { code: '088310120105', name: 'CIPUTAT', addr: 'JL. IR. H. JUANDA RT 01/RW 02 NO. 15', area: 'KEC. CIPUTAT TANGERANG SELATAN, 15411' },
  { code: '088200510203', name: 'KEBON JERUK', addr: 'JL. PANJANG ARTERI RT 07/RW 04 NO. 32', area: 'KEC. KEBON JERUK JAKARTA BARAT, 11530' },
  { code: '088270430102', name: 'SERPONG', addr: 'JL. RAYA SERPONG RT 03/RW 05 NO. 10', area: 'KEC. SERPONG TANGERANG SELATAN, 15310' },
  { code: '088180250401', name: 'KEMANGGISAN', addr: 'JL. KEMANGGISAN RAYA RT 02/RW 07 NO. 45', area: 'KEC. PALMERAH JAKARTA BARAT, 11480' },
];

// ─── Product Catalog (Indomaret items with real prices) ─────────────────────
const ALL_ITEMS = [
  // FRUITS & VEGETABLES
  ['APEL FUJI MTR 1KG', 38000], ['PISANG AMBON SISIR', 24500], ['ANGGUR MERAH KG', 69000],
  ['MANGGA HARUMANIS KG', 26500], ['STRAWBERRY PACK 250', 19900], ['JERUK MEDAN SUPER K', 32000],
  ['PEAR CENTURY KG', 28500], ['LEMON IMPOR KG', 42000], ['SEMANGKA TANPA BIJI', 21000],
  ['MELON SKY ROCKET KG', 18500], ['BUAH NAGA MERAH KG', 24000], ['ALPUKAT MENTEGA KG', 35000],
  ['TOMAT FRESH PACK', 8500], ['BAWANG MERAH BKS 25', 14500], ['BAWANG PUTIH BKS 25', 16000],
  ['CABE RAWIT MERAH 10', 12500], ['KENTANG DIENG 1KG', 22000], ['WORTEL LOKAL PCH', 9500],
  // SNACKS & BISCUITS
  ['CHITATO SAPI PANGGNG', 11500], ['POTABEE SEAWEED 68G', 10500], ['LAY\'S RUMPUT LAUT', 12500],
  ['TARO NET R.LAUT 65G', 8500], ['PRINGLES POTATO 107', 24200], ['KUSUKA KERIPIK KONG', 7900],
  ['OREO VANILLA 133G', 9800], ['ROMA BISKUIT KELAPA', 11500], ['GOOD TIME CHOCOCHIP', 8900],
  ['SILVERQUEEN CHUNKY', 22000], ['CADBURY DAIRY MILK', 16500], ['BENG BENG SHARE IT', 14200],
  ['KINDER JOY BOYS/GRL', 14500], ['KIT KAT CHOCO 4F 35', 11200], ['CHUNKY BAR MINIS', 18500],
  ['GARUDA KACANG ATOM', 9800], ['REBO KWACI KUACI 15', 16500],
  ['KUSUKA BALADO 180G', 16200], ['QTELA KERIPIK SINGK', 7800], ['PIATTOS SAPI PANGG', 10200],
  ['CHIKI BALLS KEJU 55G', 6700], ['TWISTKO JAGUNG BAKAR', 7200], ['JETZ CHOCO HOLLOW 4', 6500],
  ['GERY SALUUT MALKIST', 7900], ['SLAI OLAI STRAWBERR', 8200], ['NISSIN WAFER COKLAT', 14500],
  ['TANGO WAFER VANILA', 9300], ['KHONG GUAN BISKUIT', 52500], ['NEXTAR PINEAPPLE 8P', 8800],
  ['MENTOS MINT ROLL 29G', 4500], ['SUGUS JADUL BAG 90G', 9500], ['FOX CANDY SPRING 90', 10500],
  // BEVERAGES
  ['AQUA AIR MINERAL 600', 3500], ['AQUA GALON 19L', 22000], ['TEH BOTOL SOSRO 450', 6500],
  ['POKKA GREEN TEA 450', 7200], ['COCA COLA PET 1.5L', 16500], ['BEAR BRAND 189ML', 10500],
  ['ULTRA MILK COKLAT 1L', 19500], ['INDOMILK UHT PLAIN', 18200], ['NESCAFE CAN 240ML', 11000],
  ['SPRITE PLASTIC BTL 1', 15800], ['FANTA STRAWBERRY 1L', 15800], ['FRESTEA JASMINE 500', 6200],
  ['NU GREEN TEA HONEY 4', 6400], ['TEH PUCUK HARUM 350', 4000], ['C1000 LEMON WATER', 8700],
  ['PULPY ORANGE 300ML', 7500], ['BUAVITA MANGO 250ML', 9500], ['MILO UHT COKLAT 190', 5400],
  ['CIMORY YOGURT DRINK', 9300], ['YAKULT PACK 5X50ML', 10500], ['ICHITAN THAI TEA 31', 8900],
  ['GOLDDA CAFE LATTE 25', 3800], ['KAPAL API SIGNATURE', 6500], ['HYDRO COCO PET 330', 7200],
  ['ADES MINERAL H2O 600', 3300], ['POCARI SWEAT BTL 50', 9200], ['KATINGA AIR KELAPA', 8500],
  ['MILK LIFE FRESH 200', 6800], ['KIN FRESH MILK COKL', 12500], ['OVALTINE UHT 200ML', 6900],
  // FROZEN FOOD
  ['WALLS SELECTION CHOC', 36500], ['CAMPINA NEAPOLITAN', 34000], ['AICE SWEET CORN 52G', 4500],
  ['GELATO CORNETTO DISC', 12000], ['SO GOOD NUGGET 400G', 46500], ['FIESTA NUGGET 500G', 54000],
  ['BEEF BURGER PATTY 6S', 32000], ['CEDEA CHIKUWA 250G', 21500], ['KANZLER COCKTAIL SM', 48500],
  ['KANZLER SINGLES HOT', 9300], ['BERNARDI BAKSO SAPI', 51000],
  // GROCERIES
  ['BIMOLI MINYAK G 2L', 38500], ['SANIA MINYAK GORD 2L', 37900], ['GULAKU TEBU 1KG', 17500],
  ['INDOMIE GORENG SPESL', 3100], ['INDOMIE AYAM BAWANG', 3000], ['SEDAAP SOTO MIE 5P', 14500],
  ['ABC KECAP MANIS 520', 21000], ['ROYCO KALDU AYAM 230', 11200], ['BLUE BAND SERBAGUNA', 13500],
  ['SASA TEPUNG BUMBU', 6300], ['BUMBU RACIK SAYUR S', 2800],
  ['SAORI SAUS TIRAM 13', 11500], ['SARIWANGI TEH CELUP', 7500], ['KAPAL API BUBUK 165', 15800],
  ['LUWAK WHITE KOFFIE', 14900], ['NESCAFE CLASSIC 100', 36500], ['CERELAC BUBUR BAYI', 12500],
  ['KRAFT CHEDDAR ALL-I', 22500], ['PROCHIZ CHEESE 170G', 13800],
  ['BERAS LARMENT 5KG', 74500], ['FARMER BRAND JASMINE', 88000],
  ['PRANAS CORNED BEEF', 28900], ['ABC SARDINES TOMATO', 12200], ['LA FONTE SPAGHETTI', 11800],
  ['SAMBAL ABC ASLI 335', 16800], ['DEL MONTE CHILI PCH', 12500], ['FORVITA MARGARIN 2', 8200],
  // HOUSEHOLD
  ['SOFNY TISSUE 2 PLY', 14500], ['STELLA AIR FRESHNER', 18500], ['BAYGON AEROSOL 600', 42500],
  ['MAMY POKO PANTS L', 69000], ['CHARM BODY FIT 20P', 16000],
  ['PAMPERS BABY HAPPY M', 54500], ['WIPOL KARBOL WANGI', 16500], ['SOKLIN LANTAI CITRUS', 12300],
  ['SUNLIGHT JERUK NIPIS', 14800], ['RINSO ANTI NODA 700', 28500],
  ['SOKLIN LIQUID DET 7', 21000], ['ATTACK JAZ1 DETERG', 17500], ['DOWNY SUNRISE FRESH', 29900],
  ['MOLTO SEKALI BILAS', 26000], ['GLADE SCENT GEL 180', 19500], ['HIT AEROSOL LILY 60', 39800],
  ['BATERE ENERGIZER AA2', 18500], ['ABC ALKALINE AAA 2P', 16200],
  // PERSONAL CARE
  ['LIFEBUOY TOTAL 10', 24500], ['BIORE BODY WASH 450', 27000], ['PANTENE SHAMP ANTIED', 32000],
  ['CLEAR MEN MENTHOL', 34500], ['PEPSODENT JUMBO 190', 14500], ['LISTERINE COOL MINT', 26500],
  ['SENSODYNE REPAIR PR', 34800], ['CLOSE UP GREEN 160G', 17200],
  ['POSH MEN SPRAY COLO', 23000], ['AXE DEODORANT BODY', 38500], ['REXONA MEN ROLL ON', 19800],
  ['NIVEA BODY LOTION 2', 29000], ['VASELINE LPT JELLY', 27500],
  ['GARNIER MEN TURBO L', 33500], ['DETTOL LIQUID SOAP', 29500],
  ['WARDAH LIGHTENING F', 28500], ['KAHF FACE WASH 100M', 36900],
  ['GATSBY HAIR STYLING', 12500], ['MAKARIZO HAIR SCENT', 24200],
  // PHARMACY
  ['PANADOL EXTRA 10S', 14500], ['PROMAG OBAT MAAG 12', 9200], ['DIAPET KAPSUL BLST', 7500],
  ['TOLAK ANGIN CAIR 5S', 22000], ['SANGOBION CAPS 10S', 24000], ['HANSAPLAST KAIN 10S', 7800],
  ['BETADINE SOL 15ML', 19500], ['MINYAK KAYU PUTIH 6', 26000], ['MINYAK TELON LANG 6', 24500],
  ['ROHTO EYE DROP 7ML', 16000], ['VICKS VAPORUB 25G', 21800],
  ['FRESH CARE ROLL ON', 13500], ['STREPSILS LOZENGES', 18200],
];

// ─── Receipt Code Generator ─────────────────────────────────────────────────
function generateCode() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(2);
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const versi = '3.0.22';
  const kode = `TW${randInt(100000, 999999)}`;
  const nama = pick(FIRST_NAMES).toUpperCase();
  const shift = String(randInt(1, 3)).padStart(2, '0');
  return `${dd}.${mm}.${yy}-${hh}:${mi}/${versi}/${kode}/${nama}/${shift}`;
}

// ─── Generate Receipt PDF ───────────────────────────────────────────────────
function generateReceipt(useColor = false) {
  const store = pick(STORES);
  const logoPath = useColor ? LOGO_COLOR : LOGO_BW;
  const hasLogo = fs.existsSync(logoPath);

  // Random date 1-7 days ago
  const receiptDate = new Date();
  receiptDate.setDate(receiptDate.getDate() - randInt(1, 7));

  const tmpDir = path.join(__dirname, 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const filepath = path.join(tmpDir, `struk_${Date.now()}_${randInt(1000, 9999)}.pdf`);

  // 80mm thermal receipt
  const doc = new PDFDocument({
    size: [80 * 2.8346, 250 * 2.8346], // 80mm x 250mm in points
    margins: { top: 14, bottom: 14, left: 14, right: 14 },
  });

  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  const W = 80 * 2.8346 - 28; // usable width
  const font = 'Courier';
  const fontSize = 8;

  // ─── Header: Company Info + Logo ───
  doc.font(font).fontSize(7);
  const headerX = 14;
  const headerY = 14;
  const headerLineH = 8;
  doc.text('PT.INDOMARCO PRISMATAMA', headerX, headerY, { width: W * 0.55, lineBreak: false });
  doc.text('MENARA INDOMARET', headerX, headerY + headerLineH, { width: W * 0.55, lineBreak: false });
  doc.text('BOULEVARD PANTAI INDAH KAPUK', headerX, headerY + headerLineH * 2, { width: W * 0.55, lineBreak: false });
  doc.text('JAKARTA UTARA', headerX, headerY + headerLineH * 3, { width: W * 0.55, lineBreak: false });
  doc.text('NPWP: 01.337.994.6-092.000', headerX, headerY + headerLineH * 4, { width: W * 0.55, lineBreak: false });

  if (hasLogo) {
    try {
      // Logo di pojok kanan atas, sejajar dengan baris pertama
      const logoW = W * 0.38;
      const logoX = headerX + W * 0.58;
      const logoY = headerY - 2;
      doc.image(logoPath, logoX, logoY, { width: logoW });
    } catch {}
  }

  doc.y = headerY + headerLineH * 5 + 6;
  doc.fontSize(fontSize);

  // ─── Store Info ───
  const storeLine = `${store.name} ${store.code}`;
  doc.text(storeLine, { align: 'center' });
  doc.text(store.addr, { align: 'center' });
  doc.text(store.area, { align: 'center' });

  // ─── Separator ───
  doc.text('-'.repeat(42), { align: 'center' });
  doc.text(generateCode(), { align: 'center' });
  doc.text('-'.repeat(42), { align: 'center' });

  // ─── Items ───
  const selectedItems = sample(ALL_ITEMS, randInt(10, 20));
  let totalPrice = 0;

  for (const [name, price] of selectedItems) {
    const qty = randInt(5, 10);
    const linePrice = price * qty;
    totalPrice += linePrice;

    const nameCol = name.substring(0, 19).padEnd(19);
    const qtyCol = String(qty).padStart(3);
    const priceCol = formatRupiah(price).padStart(9);
    const totalCol = formatRupiah(linePrice).padStart(8);
    const line = `  ${nameCol} ${qtyCol} ${priceCol} ${totalCol}`;
    doc.text(line, { lineBreak: true });
  }

  // ─── Totals ───
  doc.text(' '.repeat(17) + '-'.repeat(21));
  doc.text(`${'TOTAL BELANJA'.padEnd(10)}:  ${formatRupiah(totalPrice).padStart(9)}  `, { align: 'right' });
  doc.text(' '.repeat(17) + '-'.repeat(21));

  const ppn = Math.floor(totalPrice * 0.11);
  const totalWithPpn = totalPrice + ppn;
  const tunai = totalWithPpn + randInt(5000, 20000);
  const kembali = tunai - totalWithPpn;

  doc.text(`${'PPN (11%)'.padEnd(5)}  : ${formatRupiah(ppn).padStart(10)}  `, { align: 'right' });
  doc.text(`${'TUNAI'.padEnd(9)}  : ${formatRupiah(tunai).padStart(10)}  `, { align: 'right' });
  doc.text(`${'KEMBALI'.padEnd(9)}  : ${formatRupiah(kembali).padStart(10)}  `, { align: 'right' });

  // ─── Footer ───
  doc.moveDown(2);
  doc.text('LAYANAN KONSUMEN', { align: 'center' });
  doc.text('SMS/WA 0811.1500.280 TELP 1500280', { align: 'center' });
  doc.text('KONTAK@INDOMARET.CO.ID', { align: 'center' });
  doc.moveDown(3);
  doc.font(`${font}-Bold`).fontSize(8);
  doc.text('Isi Pulsa Gratis Admin!', { align: 'center' });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      const size = fs.statSync(filepath).size;
      resolve({ filepath, size, category: 'food', storeName: store.name });
    });
    stream.on('error', reject);
  });
}

// ─── Export ──────────────────────────────────────────────────────────────────
module.exports = { generateRandomReceipt: generateReceipt };

// Direct run
if (require.main === module) {
  generateReceipt().then(r => {
    console.log(`Receipt: ${r.filepath} (${r.size} bytes)`);
  }).catch(e => console.error(e));
}
