/**
 * app.js - Survei Hijab Komunitas
 *
 * =========================================================
 *  ISI DI SINI: tempel URL Apps Script Anda (hasil Deploy)
 * =========================================================
 * Bentuknya seperti: https://script.google.com/macros/s/xxxxxxxx/exec
 * Lihat Code.gs untuk cara mendapatkannya.
 */
const API_URL = 'https://script.google.com/macros/s/AKfycbwDX1v9kkTDQiOfAv39hvOhJrSATablFmblQeuoRNvTuvTANyOAiCx1VrpvrRJc9Hfqiw/exec';

(function () {
  'use strict';

  // =========================================================
  //  PINDAH TAB
  // =========================================================
  document.querySelectorAll('.tab-nav button').forEach(function (tombol) {
    tombol.addEventListener('click', function () {
      document.querySelectorAll('.tab-nav button').forEach(b => b.classList.remove('aktif'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('aktif'));
      tombol.classList.add('aktif');
      document.getElementById('tab-' + tombol.dataset.tab).classList.add('aktif');
      if (tombol.dataset.tab === 'hasil') muatStatistik();
    });
  });
  document.getElementById('keHasil').addEventListener('click', function () {
    document.querySelector('[data-tab="hasil"]').click();
  });

  function cekApiUrl() {
    if (!API_URL || API_URL.indexOf('TEMPEL_URL') !== -1) {
      throw new Error('API_URL belum diisi. Buka app.js dan tempel URL Web App Anda di baris atas.');
    }
  }

  // =========================================================
  //  FORM
  // =========================================================
  var PILIHAN_SITUASI = ['Harian', 'Kerja / kantor', 'Kuliah / sekolah', 'Olahraga', 'Acara formal', 'Pesta / kondangan'];

  function buatChips(id, daftar, tipe, nama) {
    var wadah = document.getElementById(id);
    daftar.forEach(function (isi) {
      var label = document.createElement('label');
      var input = document.createElement('input');
      input.type = tipe;
      input.name = nama;
      input.value = isi;
      var span = document.createElement('span');
      span.textContent = isi;
      label.appendChild(input);
      label.appendChild(span);
      wadah.appendChild(label);
    });
  }
  buatChips('situasi', PILIHAN_SITUASI, 'checkbox', 'situasi');
  buatChips('beliLagi', ['Ya', 'Mungkin', 'Tidak'], 'radio', 'beliLagi');

  document.querySelectorAll('.skala').forEach(function (wadah) {
    var nama = wadah.dataset.nama;
    for (var i = 1; i <= 5; i++) {
      var label = document.createElement('label');
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = nama;
      input.value = i;
      var span = document.createElement('span');
      span.textContent = i;
      label.appendChild(input);
      label.appendChild(span);
      wadah.appendChild(label);
    }
  });

  function nilaiTerpilih(nama) {
    var el = document.querySelector('input[name="' + nama + '"]:checked');
    return el ? el.value : '';
  }
  function daftarTerpilih(nama) {
    return Array.from(document.querySelectorAll('input[name="' + nama + '"]:checked')).map(el => el.value);
  }
  function tampilkanGalat(pesan) {
    var kotak = document.getElementById('galat');
    kotak.textContent = pesan;
    kotak.style.display = pesan ? 'block' : 'none';
    if (pesan) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('form').addEventListener('submit', function (e) {
    e.preventDefault();
    tampilkanGalat('');

    var data = {
      nama: document.getElementById('nama').value.trim(),
      produk: document.getElementById('produk').value.trim(),
      merek: document.getElementById('merek').value.trim(),
      jenis: document.getElementById('jenis').value,
      bahan: document.getElementById('bahan').value,
      warna: document.getElementById('warna').value.trim(),
      harga: document.getElementById('harga').value,
      tempat: document.getElementById('tempat').value,
      situasi: daftarTerpilih('situasi'),
      puas: nilaiTerpilih('puas'),
      nyaman: nilaiTerpilih('nyaman'),
      serap: nilaiTerpilih('serap'),
      tahan: nilaiTerpilih('tahan'),
      beliLagi: nilaiTerpilih('beliLagi'),
      komentar: document.getElementById('komentar').value.trim()
    };

    if (!data.produk || !data.merek) return tampilkanGalat('Nama produk dan merek wajib diisi.');
    if (!data.jenis) return tampilkanGalat('Pilih jenis hijab.');
    if (!data.bahan) return tampilkanGalat('Pilih jenis bahan.');
    if (!data.warna) return tampilkanGalat('Isi warna produk.');
    if (!(Number(data.harga) > 0)) return tampilkanGalat('Isi harga beli dengan angka lebih dari 0.');
    if (!data.tempat) return tampilkanGalat('Pilih tempat membeli.');
    if (!data.puas || !data.nyaman || !data.serap || !data.tahan) return tampilkanGalat('Lengkapi keempat penilaian 1-5.');
    if (!data.beliLagi) return tampilkanGalat('Pilih apakah kamu akan membeli lagi.');

    try {
      cekApiUrl();
    } catch (err) {
      return tampilkanGalat(err.message);
    }

    var tombol = document.getElementById('kirim');
    tombol.disabled = true;
    tombol.textContent = 'Mengirim...';

    // Content-Type text/plain sengaja dipakai agar browser tidak mengirim
    // permintaan "preflight" OPTIONS, yang tidak didukung Apps Script.
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    })
      .then(function (res) { return res.json(); })
      .then(function (hasil) {
        if (!hasil.ok) throw new Error(hasil.error || 'Gagal menyimpan.');
        document.getElementById('formArea').style.display = 'none';
        document.getElementById('sukses').style.display = 'block';
        window.scrollTo({ top: 0 });
      })
      .catch(function (err) {
        tombol.disabled = false;
        tombol.textContent = 'Kirim jawaban';
        tampilkanGalat(err.message || 'Gagal mengirim. Periksa koneksi atau URL API.');
      });
  });

  document.getElementById('lagi').addEventListener('click', function () {
    document.getElementById('form').reset();
    var tombol = document.getElementById('kirim');
    tombol.disabled = false;
    tombol.textContent = 'Kirim jawaban';
    document.getElementById('sukses').style.display = 'none';
    document.getElementById('formArea').style.display = 'block';
    window.scrollTo({ top: 0 });
  });

  // =========================================================
  //  HASIL
  // =========================================================
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function rp(n) { return 'Rp' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function desimal(n) { return Number(n).toFixed(2).replace('.', ','); }
  function persen(a, total) { return total ? Math.round(a / total * 100) : 0; }
  function kpi(angka, label) {
    return '<div class="kpi"><div class="angka">' + esc(angka) + '</div><div class="label">' + esc(label) + '</div></div>';
  }
  function bars(items, total) {
    if (!items.length) return '<div class="bantu">Belum ada data.</div>';
    return items.map(function (i) {
      var p = persen(i.jumlah, total);
      return '<div class="bar-row"><span class="bar-label">' + esc(i.label) + '</span>' +
        '<div class="bar"><div style="width:' + p + '%"></div></div>' +
        '<span class="bar-val">' + i.jumlah + ' (' + p + '%)</span></div>';
    }).join('');
  }
  function kartuBar(judul, items, total) {
    return '<div class="kartu"><h2>' + esc(judul) + '</h2>' + bars(items, total) + '</div>';
  }

  function render(s) {
    var isi = document.getElementById('isi');
    if (!s.n) {
      isi.innerHTML = '<div class="kartu kosong">Belum ada jawaban yang masuk.</div>';
      return;
    }
    var html = '<div class="kartu"><div class="grid">' +
      kpi(s.n, 'Jumlah jawaban') +
      kpi(desimal(s.rataPuas) + ' / 5', 'Rata-rata kepuasan') +
      kpi(desimal(s.rataNyaman) + ' / 5', 'Rata-rata kenyamanan') +
      kpi(desimal(s.rataSerap) + ' / 5', 'Rata-rata daya serap') +
      kpi(desimal(s.rataTahan) + ' / 5', 'Rata-rata ketahanan') +
      '</div></div>';

    html += '<div class="kartu"><h2>10 produk favorit</h2><div class="gulir"><table>' +
      '<tr><th>#</th><th>Produk</th><th class="num">Pengguna</th><th class="num">Kepuasan</th><th class="num">Rata-rata harga</th></tr>' +
      s.top.map(function (t, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(t.nama) + '</td><td class="num">' + t.jumlah +
          '</td><td class="num">' + desimal(t.puas) + '</td><td class="num">' + (t.harga ? rp(t.harga) : '-') + '</td></tr>';
      }).join('') + '</table></div></div>';

    if (s.harga) {
      html += '<div class="kartu"><h2>Statistik harga</h2><div class="grid">' +
        kpi(rp(s.harga.min), 'Termurah') + kpi(rp(s.harga.max), 'Termahal') +
        kpi(rp(s.harga.rata), 'Rata-rata') + kpi(rp(s.harga.median), 'Median') +
        '</div></div>';
    }

    html += '<div class="kartu"><h2>Rentang harga dan kepuasan</h2><div class="gulir"><table>' +
      '<tr><th>Rentang</th><th class="num">Jumlah</th><th class="num">Persen</th><th class="num">Kepuasan rata-rata</th></tr>' +
      s.rentang.map(function (r) {
        return '<tr><td>' + esc(r.label) + '</td><td class="num">' + r.jumlah + '</td><td class="num">' +
          persen(r.jumlah, s.n) + '%</td><td class="num">' + (r.jumlah ? desimal(r.puas) : '-') + '</td></tr>';
      }).join('') + '</table></div></div>';

    html += '<div class="dua">' +
      kartuBar('Sebaran kepuasan', s.puasDist, s.n) + kartuBar('Jenis hijab', s.jenis, s.n) +
      '</div><div style="height:14px"></div><div class="dua">' +
      kartuBar('Jenis bahan', s.bahan, s.n) + kartuBar('Tempat membeli', s.tempat, s.n) +
      '</div><div style="height:14px"></div><div class="dua">' +
      kartuBar('Situasi pemakaian', s.situasi, s.n) + kartuBar('Akan membeli lagi?', s.beliLagi, s.n) +
      '</div>';

    isi.innerHTML = html;
  }

  function muatStatistik() {
    var tombol = document.getElementById('muat');
    var isi = document.getElementById('isi');
    try {
      cekApiUrl();
    } catch (err) {
      isi.innerHTML = '<div class="galat" style="display:block">' + esc(err.message) + '</div>';
      return;
    }
    tombol.disabled = true;
    tombol.textContent = 'Memuat...';
    fetch(API_URL + '?action=stats')
      .then(function (res) { return res.json(); })
      .then(function (hasil) {
        if (!hasil.ok) throw new Error(hasil.error || 'Gagal mengambil data.');
        render(hasil.data);
      })
      .catch(function (err) {
        isi.innerHTML = '<div class="galat" style="display:block">Gagal memuat data: ' + esc(err.message) + '</div>';
      })
      .finally(function () {
        tombol.disabled = false;
        tombol.textContent = 'Perbarui data';
      });
  }

  document.getElementById('muat').addEventListener('click', muatStatistik);
})();
