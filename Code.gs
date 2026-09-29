/**
 * SURVEI HIJAB KOMUNITAS - Backend API (Apps Script)
 *
 * Skrip ini HANYA berfungsi sebagai jembatan ke Spreadsheet.
 * Tampilan (index.html + app.js) berdiri sendiri, bisa dihosting di mana saja
 * (GitHub Pages, Netlify, dibuka langsung dari komputer, dll).
 *
 * CARA PAKAI:
 * 1. Tempel file ini di Apps Script yang dibuka dari dalam Spreadsheet Anda
 *    (Ekstensi -> Apps Script), supaya otomatis terikat ke Spreadsheet itu.
 * 2. Deploy -> Deployment baru -> jenis "Aplikasi web".
 *    - Jalankan sebagai: Saya
 *    - Yang memiliki akses: Siapa saja
 * 3. Salin URL yang muncul setelah Deploy (bentuknya seperti
 *    https://script.google.com/macros/s/xxxxx/exec).
 * 4. Tempel URL itu ke variabel API_URL di app.js.
 *
 * Endpoint yang disediakan:
 *   POST <URL>              -> menyimpan satu jawaban survei (body: JSON)
 *   GET  <URL>?action=stats -> mengambil rangkuman statistik (JSON)
 */

const NAMA_SHEET = 'Jawaban';
const HEADER = [
  'Waktu', 'Nama', 'Produk', 'Merek', 'Jenis hijab', 'Bahan', 'Warna',
  'Harga (Rp)', 'Tempat beli', 'Situasi', 'Kepuasan', 'Kenyamanan',
  'Daya serap panas/keringat', 'Ketahanan warna & bahan', 'Beli lagi', 'Komentar'
];

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** GET: ?action=stats mengambil rangkuman. Tanpa parameter: cek API hidup. */
function doGet(e) {
  const aksi = e && e.parameter ? e.parameter.action : '';
  if (aksi === 'stats') {
    try {
      return json_({ ok: true, data: ambilStatistik_() });
    } catch (err) {
      return json_({ ok: false, error: err.message });
    }
  }
  return json_({ ok: true, pesan: 'API Survei Hijab aktif.' });
}

/** POST: body berupa JSON satu jawaban survei. */
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    simpanJawaban_(d);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

/** Mengambil sheet "Jawaban"; dibuat otomatis bila belum ada. */
function ambilSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(NAMA_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(NAMA_SHEET);
    sheet.appendRow(HEADER);
    sheet.getRange(1, 1, 1, HEADER.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Membersihkan teks dari peserta: batasi panjang, cegah rumus di Spreadsheet. */
function bersih_(teks, maks) {
  let s = String(teks === undefined || teks === null ? '' : teks).trim().slice(0, maks);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

/** Validasi lalu simpan satu baris jawaban. */
function simpanJawaban_(d) {
  const wajibTeks = ['produk', 'merek', 'jenis', 'bahan', 'warna', 'tempat', 'beliLagi'];
  wajibTeks.forEach(k => {
    if (!d[k] || String(d[k]).trim() === '') throw new Error('Ada isian wajib yang belum diisi.');
  });

  const harga = Number(d.harga);
  if (!(harga > 0)) throw new Error('Harga harus berupa angka lebih dari 0.');

  ['puas', 'nyaman', 'serap', 'tahan'].forEach(k => {
    const v = Number(d[k]);
    if (!(v >= 1 && v <= 5)) throw new Error('Semua penilaian harus diisi dengan skala 1-5.');
  });

  const situasi = Array.isArray(d.situasi) ? d.situasi : [];

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    ambilSheet_().appendRow([
      new Date(),
      bersih_(d.nama, 60),
      bersih_(d.produk, 80),
      bersih_(d.merek, 60),
      bersih_(d.jenis, 40),
      bersih_(d.bahan, 40),
      bersih_(d.warna, 40),
      harga,
      bersih_(d.tempat, 40),
      situasi.map(a => bersih_(a, 30)).join(', '),
      Number(d.puas),
      Number(d.nyaman),
      Number(d.serap),
      Number(d.tahan),
      bersih_(d.beliLagi, 20),
      bersih_(d.komentar, 500)
    ]);
  } finally {
    lock.releaseLock();
  }
}

/** Menghitung semua statistik dari sheet "Jawaban". */
function ambilStatistik_() {
  const values = ambilSheet_().getDataRange().getValues();
  const baris = values.slice(1).filter(r => String(r[2]).trim() !== '');
  const n = baris.length;
  if (n === 0) return { n: 0 };

  const data = baris.map(r => ({
    produk: String(r[2]),
    merek: String(r[3]),
    jenis: String(r[4]),
    bahan: String(r[5]),
    warna: String(r[6]),
    harga: Number(r[7]),
    tempat: String(r[8]),
    situasi: String(r[9]),
    puas: Number(r[10]),
    nyaman: Number(r[11]),
    serap: Number(r[12]),
    tahan: Number(r[13]),
    beliLagi: String(r[14])
  }));

  const harga = data.filter(d => d.harga > 0).map(d => d.harga);

  const grup = {};
  data.forEach(d => {
    const key = (d.merek + ' ' + d.produk).toLowerCase().replace(/\s+/g, ' ');
    if (!grup[key]) grup[key] = { nama: d.merek + ' ' + d.produk, puas: [], harga: [] };
    grup[key].puas.push(d.puas);
    if (d.harga > 0) grup[key].harga.push(d.harga);
  });
  const top = Object.values(grup)
    .sort((a, b) => b.puas.length - a.puas.length || rata_(b.puas) - rata_(a.puas))
    .slice(0, 10)
    .map(g => ({
      nama: g.nama,
      jumlah: g.puas.length,
      puas: rata_(g.puas),
      harga: g.harga.length ? rata_(g.harga) : 0
    }));

  const batas = [
    ['Di bawah Rp30 ribu', 0, 30000],
    ['Rp30 - 59 ribu', 30000, 60000],
    ['Rp60 - 99 ribu', 60000, 100000],
    ['Rp100 - 199 ribu', 100000, 200000],
    ['Rp200 ribu ke atas', 200000, Infinity]
  ];
  const rentang = batas.map(([label, min, max]) => {
    const isi = data.filter(d => d.harga >= min && d.harga < max);
    return { label: label, jumlah: isi.length, puas: isi.length ? rata_(isi.map(d => d.puas)) : 0 };
  });

  const puasDist = [5, 4, 3, 2, 1].map(s => ({
    label: s + ' bintang',
    jumlah: data.filter(d => d.puas === s).length
  }));

  return {
    n: n,
    rataPuas: rata_(data.map(d => d.puas)),
    rataNyaman: rata_(data.map(d => d.nyaman)),
    rataSerap: rata_(data.map(d => d.serap)),
    rataTahan: rata_(data.map(d => d.tahan)),
    harga: harga.length ? {
      min: Math.min.apply(null, harga),
      max: Math.max.apply(null, harga),
      rata: rata_(harga),
      median: median_(harga)
    } : null,
    top: top,
    rentang: rentang,
    puasDist: puasDist,
    jenis: hitung_(data, 'jenis', false),
    bahan: hitung_(data, 'bahan', false),
    tempat: hitung_(data, 'tempat', false),
    situasi: hitung_(data, 'situasi', true),
    beliLagi: hitung_(data, 'beliLagi', false)
  };
}

function rata_(arr) {
  const a = arr.filter(x => !isNaN(x));
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
}

function median_(arr) {
  const a = arr.slice().sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function hitung_(data, field, banyak) {
  const h = {};
  data.forEach(d => {
    const daftar = banyak ? d[field].split(',') : [d[field]];
    daftar.map(x => x.trim()).filter(x => x).forEach(x => { h[x] = (h[x] || 0) + 1; });
  });
  return Object.keys(h)
    .map(k => ({ label: k, jumlah: h[k] }))
    .sort((a, b) => b.jumlah - a.jumlah);
}
