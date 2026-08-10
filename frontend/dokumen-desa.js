// =================================================================
// SYSTEM DOKUMEN RKP DESA BATETANGNGA - GOOGLE DOCS ENGINE & TEMPLATE CRUD
// Optimized for Fast Performance, Iframe Embed Preview & Dynamic Field Sync
// =================================================================

// 1. DAFTAR 18 TEMPLATE RESMI RKP DESA DENGAN ID GOOGLE DOCS REAL
const DEFAULT_MASTER_DOC_ID = '1MQJsTZCMPoYNFD8dg6J0g5tY-KEf8Iu0U6uNRZJ-MnY';

let RKP_TEMPLATES = [
  // TAHAP A
  { code: 'DOC-01', stage: 'A', name: 'Kata Pengantar RKP Desa', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: false, fields: [], tableHeaders: [] },
  { code: 'DOC-02A', stage: 'A', name: 'BA Pembentukan Tim', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: false, fields: [], tableHeaders: [] },
  { code: 'DOC-02B', stage: 'A', name: 'SK Tim Penyusun ⭐', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: true, fields: [], tableHeaders: ['No', 'Nama', 'Tempat, Tanggal Lahir', 'Jabatan', 'Unsur'] },
  { code: 'DOC-03', stage: 'A', name: 'SK Kades Tim Penyusun', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: false, fields: [], tableHeaders: [] },

  // TAHAP B
  { code: 'DOC-19', stage: 'B', name: 'SK BPD Panitia Musdes', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: false, fields: [], tableHeaders: [] },
  { code: 'DOC-20', stage: 'B', name: 'BA & Daftar Hadir Musdes', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: true, fields: [], tableHeaders: ['No', 'Nama Peserta', 'Alamat / Dusun', 'Jabatan / Unsur', 'Tanda Tangan'] },
  { code: 'DOC-21', stage: 'B', name: 'Pandangan Resmi BPD', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: false, fields: [], tableHeaders: [] },
  { code: 'DOC-22', stage: 'B', name: 'BA Musdes Penetapan RKP', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: false, fields: [], tableHeaders: [] },

  // TAHAP C
  { code: 'DOC-24', stage: 'C', name: 'SK Kades Panitia Musrenbang', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: false, fields: [], tableHeaders: [] },
  { code: 'DOC-25', stage: 'C', name: 'Tata Tertib Musrenbang', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: false, fields: [], tableHeaders: [] },
  { code: 'DOC-27', stage: 'C', name: 'BA Musrenbang', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: true, fields: [], tableHeaders: ['No', 'Jenis Kegiatan', 'Lokasi Kegiatan', 'Volume / Satuan', 'Pagu Indikatif (Rp)', 'Sumber Dana'] },

  // TAHAP D
  { code: 'DOC-28', stage: 'D', name: 'Rancangan Perdes RKPDesa', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: false, fields: [], tableHeaders: [] },
  { code: 'DOC-29', stage: 'D', name: 'SK BPD Panitia Musdes', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: false, fields: [], tableHeaders: [] },
  { code: 'DOC-30', stage: 'D', name: 'Berita Kesepakatan BPD', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: false, fields: [], tableHeaders: [] },
  { code: 'DOC-31', stage: 'D', name: 'Perdes RKPDesa Final', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: false, fields: [], tableHeaders: [] },
  { code: 'DOC-39', stage: 'D', name: 'SK BPD Persetujuan Perdes', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: false, fields: [], tableHeaders: [] },

  // TAHAP E
  { code: 'DOC-33', stage: 'E', name: 'SK Kades Tim Verifikasi', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: false, fields: [], tableHeaders: [] },
  { code: 'DOC-34', stage: 'E', name: 'BA Pembentukan Tim Verifikasi', documentId: DEFAULT_MASTER_DOC_ID, isReal: true, hasTable: true, fields: [], tableHeaders: ['No', 'Nama Tim Verifikasi', 'Jabatan / Instansi', 'Keterangan'] }
];

let appState = {
  currentRoute: '/admin/templates',
  activeDocCode: 'DOC-02B',
  activeTahun: localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || '2027',
  globalSharedFields: JSON.parse(localStorage.getItem('GLOBAL_SHARED_FIELDS') || '{}'),
  globalSharedTables: JSON.parse(localStorage.getItem('GLOBAL_SHARED_TABLES') || '[]'),
  documentFields: {},
  documentTables: {},
  autoSaveTimer: null
};

window.addEventListener('tahunChanged', (e) => {
  if (e && e.detail && e.detail.tahun) {
    appState.activeTahun = String(e.detail.tahun);
    if (appState.activeDocCode) {
      bukaDokumenEdit(appState.activeDocCode);
    }
  }
});

const MASTER_SHARED_DEFAULTS = {
  get tahun() { return localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || '2027'; },
  get tahun1() { return localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || '2027'; },
  get tahun_anggaran() { return localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || '2027'; },
  nama_desa: 'Desa Batetangnga',
  kades: 'SUMAILA DAMANG',
  nama_kepala_desa: 'SUMAILA DAMANG',
  nama_ketua_bpd: 'HAERUDDIN, S.Pd.',
  tempat: 'Aula Kantor Desa Batetangnga',
  tempat_musrembang: 'Aula Kantor Desa Batetangnga',
  sk_tim: '188.4/05/SK-DES/X/2024',
  ska: '188.4/05/SK-DES/X/2024',
  pimpinan_musrembang: 'SUMAILA DAMANG',
  tgl_musdes_tim_hari: 'Kamis, 15 Oktober 2024',
  tgl_musdes_tim_bulan: '15 Oktober 2024',
  tgl_musdes_tim_terbilang: 'Lima belas bulan Oktober tahun dua ribu dua puluh empat',
  tgl_surat_tim: '15 Oktober 2024',
  tgl_musrembang_hari: 'Kamis, 24 Oktober 2024',
  tgl_tatip_bulan: '24 Oktober 2024',
  rpjmdes1: 'Rencana Pembangunan Jangka Menengah Desa Batetangnga Tahun 2020-2026',
  kewenangan1: 'Peraturan Desa Batetangnga Nomor 03 Tahun 2021 tentang Kewenangan Desa',
  apbdes1: 'Anggaran Pendapatan dan Belanja Desa (APBDes) Batetangnga Tahun 2025',
  kecamatan: 'Binuang',
  kabupaten: 'Polewali Mandar',
  provinsi: 'Sulawesi Barat',
  alamat_kantor: 'Jl. Poros Batetangnga No. 01, Desa Batetangnga'
};

// State for the template settings module
let templateSettingsState = {
  activeCode: 'DOC-02B',
  fields: [],
  tableHeaders: ['No', 'Nama', 'Tempat, Tanggal Lahir', 'Jabatan', 'Unsur']
};

function saveStateToLocalStorage() {
  try {
    const key = `docEngineState_${appState.activeDocCode}_${appState.activeTahun}`;
    const stateToSave = {
      documentFields: appState.documentFields,
      documentTables: appState.documentTables
    };
    localStorage.setItem(key, JSON.stringify(stateToSave));
  } catch (e) {
    console.warn('Could not save state to localStorage:', e);
  }
}

function loadStateFromLocalStorage(docCode, tahun) {
  const key = `docEngineState_${docCode}_${tahun}`;
  const savedState = localStorage.getItem(key);
  return savedState ? JSON.parse(savedState) : { documentFields: {}, documentTables: {} };
}

function clearStateFromLocalStorage(docCode, tahun) {
  try {
    const key = `docEngineState_${docCode}_${tahun}`;
    localStorage.removeItem(key);
    console.log(`[LocalStorage] State for document ${docCode} (${tahun}) has been cleared.`);
  } catch (e) {
    console.warn(`Could not clear state for ${docCode} (${tahun}) from localStorage:`, e);
  }
}



function getApiBase() {
  return window.APP_CONFIG?.API_BASE || '';
}

// 2. INITIALIZATION
async function initApp() {
  console.log('⚡ Initializing Google Docs Engine & Template CRUD System...');
  await loadTemplatesFromStorageOrBackend();
  renderTemplatesTable();
  populateTemplateSelector();
}

async function loadTemplatesFromStorageOrBackend() {
  try {
    const res = await fetch(`${getApiBase()}/api/templates`);
    const result = await res.json();
    if (result.success && result.templates && result.templates.length > 0) {
      // Merge backend updates
      result.templates.forEach(t => {
        const item = RKP_TEMPLATES.find(x => x.code === t.code);
        if (item) {
          // Always use the value from the backend as the source of truth.
          item.documentId = t.documentId || t.documentid || '';
          
          // isReal is determined by whether the backend provides a valid, non-empty ID.
          item.isReal = !!(item.documentId && String(item.documentId).trim());
          
          item.fields = t.fields || item.fields || [];
          item.tableHeaders = t.tableHeaders || item.tableHeaders || [];
        } else {
          RKP_TEMPLATES.push({
            code: t.code,
            name: t.name || t.code,
            stage: t.stage || 'A',
            documentId: t.documentId || t.documentid || '',
            isReal: !!t.isReal,
            fields: t.fields || [],
            tableHeaders: t.tableHeaders || []
          });
        }
      });
    }
  } catch (e) {
    console.log('⚡ Loaded local template definitions');
  }
}

function populateTemplateSelector() {
  const selectSettings = document.getElementById('selectSettingTemplateCode');
  const selectActive = document.getElementById('selectActiveTemplate');

  if (selectSettings) selectSettings.innerHTML = '';
  if (selectActive) selectActive.innerHTML = '';

  RKP_TEMPLATES.forEach(tpl => {
    const label = `${tpl.code} - ${tpl.name}`;
    if (selectSettings) {
      const option = document.createElement('option');
      option.value = tpl.code;
      option.textContent = label;
      selectSettings.appendChild(option);
    }
    if (selectActive) {
      const option = document.createElement('option');
      option.value = tpl.code;
      option.textContent = label;
      selectActive.appendChild(option);
    }
  });

  // Sinkronkan nilai aktif dropdown jika tombol sudah menyetel activeDocCode
  if (selectActive && appState.activeDocCode) {
    selectActive.value = appState.activeDocCode;
  }
}

// 3. MODUL 1: PANEL KELOLA TEMPLATE (CRUD) RENDERER
function renderTemplatesTable() {
  const tbody = document.getElementById('tableTemplatesBody');
  if (!tbody) return;

  tbody.innerHTML = RKP_TEMPLATES.map(tpl => {
    const gdocUrl = `https://docs.google.com/document/d/${tpl.documentId}/edit`;

    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="p-4 font-mono font-black text-slate-900">
          ${tpl.code}
          ${tpl.isReal ? `<span class="block text-[9px] bg-amber-500 text-slate-900 font-bold px-1 rounded mt-0.5">ID REAL</span>` : ''}
        </td>
        <td class="p-4 font-bold text-slate-800">
          ${tpl.name}
          <span class="block text-[10px] text-slate-400 font-normal">Tahap ${tpl.stage}</span>
        </td>
        <td class="p-4 font-mono text-xs">
          <div class="flex items-center gap-1">
            <code class="bg-slate-100 px-2 py-1 rounded text-[11px] font-bold text-slate-700 select-all border">
              ${tpl.documentId}
            </code>
            <button onclick="copyToClipboard('${tpl.documentId}')" class="text-slate-400 hover:text-slate-700 text-xs px-1.5 py-0.5 rounded border bg-white" title="Copy Document ID">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </td>
        <td class="p-4">
          <a href="${gdocUrl}" target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:underline font-bold text-xs flex items-center gap-1">
            Google Docs <i class="fas fa-external-link-alt text-[9px]"></i>
          </a>
        </td>
        <td class="p-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="bukaDokumenEdit('${tpl.code}')" class="bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow" title="Buka Form Edit & Preview">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button onclick="bukaHalamanScan('${tpl.code}')" class="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-2 py-1.5 rounded-lg shadow" title="Scan Placeholder {{...}}">
              <i class="fas fa-search font-mono"></i> Scan
            </button>
            <button onclick="bukaModalEditTemplateId('${tpl.code}', '${tpl.documentId}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2 py-1.5 rounded-lg border" title="Edit Document ID">
              <i class="fas fa-key"></i>
            </button>
            <button onclick="hapusTemplate('${tpl.code}')" class="text-red-500 hover:text-red-700 text-xs px-2 py-1.5 rounded-lg hover:bg-red-50" title="Hapus Template">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  showToast(`📋 Document ID "${text}" disalin ke clipboard!`, 'info');
}

function bukaModalEditTemplate() {
  const code = appState.activeDocCode || templateSettingsState.activeCode || 'DOC-02B';
  const tpl = RKP_TEMPLATES.find(x => x.code === code);
  const codeLabel = document.getElementById('modal-template-code');
  if (codeLabel) codeLabel.textContent = code;

  const fields = ((tpl && tpl.fields && tpl.fields.length) ? tpl.fields : templateSettingsState.fields) || [];
  const headers = ((tpl && tpl.tableHeaders && tpl.tableHeaders.length) ? tpl.tableHeaders : (templateSettingsState.tableHeaders && templateSettingsState.tableHeaders.length ? templateSettingsState.tableHeaders : ['No', 'Nama', 'Tempat, Tanggal Lahir', 'Jabatan', 'Unsur']));

  const fieldsTbody = document.getElementById('modal-fields-tbody');
  if (fieldsTbody) {
    if (fields.length === 0) {
      fieldsTbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-slate-400">Belum ada field.</td></tr>`;
    } else {
      fieldsTbody.innerHTML = fields.map(f => `
        <tr>
          <td class="p-2 font-mono font-bold text-slate-800">{{${f.key}}}</td>
          <td class="p-2"><input class="form-input text-xs" value="${(f.label || f.key).replace(/"/g, '&quot;')}" data-field-key="${f.key}" oninput="fieldLabelInline(this)"></td>
          <td class="p-2 text-center">
            <button onclick="hapusFieldInline('${f.key}')" class="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"><i class="fas fa-trash-alt"></i></button>
          </td>
        </tr>
      `).join('');
    }
  }

  const headersContainer = document.getElementById('modal-headers-container');
  if (headersContainer) {
    headersContainer.innerHTML = headers.map((h, i) => `
      <input class="form-input" data-header-idx="${i}" value="${(h || '').replace(/"/g, '&quot;')}" placeholder="Kolom ${i + 1}">
    `).join('');
  }

  const modal = document.getElementById('modalEditTemplate');
  if (modal) modal.classList.remove('hidden');
}

function tutupModalEditTemplate() {
  const modal = document.getElementById('modalEditTemplate');
  if (modal) modal.classList.add('hidden');
}

function fieldLabelInline(input) {
  const key = input.dataset.fieldKey;
  const tpl = RKP_TEMPLATES.find(x => x.code === templateSettingsState.activeCode);
  if (!tpl || !tpl.fields) return;
  const f = tpl.fields.find(x => x.key === key);
  if (f) f.label = input.value;
}

function hapusFieldInline(key) {
  const code = templateSettingsState.activeCode || appState.activeDocCode || 'DOC-02B';
  const tpl = RKP_TEMPLATES.find(x => x.code === code);
  if (tpl) tpl.fields = (tpl.fields || []).filter(x => x.key !== key);
  renderPengaturanTemplateUI();
  bukaModalEditTemplate();
}

function tambahFieldBaru() {
  const key = prompt("Masukkan kode field baru (contoh: nomor_surat_baru):");
  if (!key || key.trim() === '') {
    showToast('⚠️ Penambahan field dibatalkan.', 'info');
    return;
  }

  const code = templateSettingsState.activeCode || appState.activeDocCode || 'DOC-02B';
  const tpl = RKP_TEMPLATES.find(x => x.code === code);
  
  if (tpl) {
    if (!tpl.fields) tpl.fields = [];
    
    // Check if key already exists
    if (tpl.fields.some(f => f.key === key.trim())) {
      showToast(`❌ Field dengan key "{{${key.trim()}}}" sudah ada!`, 'error');
      return;
    }
    
    tpl.fields.push({ key: key.trim(), label: key.trim(), type: 'text' });
  } else {
    // This part of the logic might be hard to reach, but as a fallback.
    templateSettingsState.fields = templateSettingsState.fields || [];
    if (templateSettingsState.fields.some(f => f.key === key.trim())) {
      showToast(`❌ Field dengan key "{{${key.trim()}}}" sudah ada!`, 'error');
      return;
    }
    templateSettingsState.fields.push({ key: key.trim(), label: key.trim(), type: 'text' });
  }
  bukaModalEditTemplate(); // Re-render the modal to show the new field
  showToast(`✅ Field baru "{{${key.trim()}}}" ditambahkan.`, 'success');
}

function tambahKolomHeader() {
  const tpl = RKP_TEMPLATES.find(x => x.code === templateSettingsState.activeCode);
  if (tpl) {
    if (!tpl.tableHeaders) tpl.tableHeaders = ['No', 'Nama', 'Tempat, Tanggal Lahir', 'Jabatan', 'Unsur'];
    tpl.tableHeaders.push('');
  } else {
    if (!templateSettingsState.tableHeaders) templateSettingsState.tableHeaders = ['No', 'Nama', 'Tempat, Tanggal Lahir', 'Jabatan', 'Unsur'];
    templateSettingsState.tableHeaders.push('');
  }
  bukaModalEditTemplate();
}

async function simpanPerubahanTemplate() {
  const code = templateSettingsState.activeCode || appState.activeDocCode || 'DOC-02B';
  const tpl = RKP_TEMPLATES.find(x => x.code === code);

  const fieldsTbody = document.getElementById('modal-fields-tbody');
  if (fieldsTbody) {
    fieldsTbody.querySelectorAll('input[data-field-key]').forEach(inp => {
      const f = (tpl && tpl.fields || []).find(x => x.key === inp.dataset.fieldKey);
      if (f) f.label = inp.value;
    });
  }

  let headers = [];
  if (tpl) headers = tpl.tableHeaders || [];
  const headersContainer = document.getElementById('modal-headers-container');
  if (headersContainer) {
    headersContainer.querySelectorAll('input[data-header-idx]').forEach(inp => {
      headers[Number(inp.dataset.headerIdx)] = inp.value;
    });
  }
  headers = headers.filter(h => String(h || '').trim() !== '');

  if (tpl) {
    tpl.tableHeaders = headers;
    templateSettingsState.tableHeaders = headers;
  }

  try {
    await simpanSemuaPerubahanPengaturan();
    tutupModalEditTemplate();
    renderPengaturanTemplateUI();

    // Sinkronkan form di halaman edit agar perubahan fields/header segera tampil.
    if (appState.activeDocCode === code && !document.getElementById('modul-dokumen-edit').classList.contains('hidden')) {
      const freshTpl = RKP_TEMPLATES.find(x => x.code === code);
      if (freshTpl) renderDynamicFormFields(freshTpl);
    }

    showToast(`✅ Template ${code} berhasil disimpan ke Supabase!`, 'success');
  } catch (e) {
    showToast(`❌ Gagal menyimpan template: ${e.message}`, 'error');
  }
}

function bukaModalGantiDocIdAktif() {
  const code = appState.activeDocCode || 'DOC-02B';
  const tpl = RKP_TEMPLATES.find(x => x.code === code);
  bukaModalEditTemplateId(code, tpl?.documentId || DEFAULT_MASTER_DOC_ID);
}

function resetDocIdToMasterDefault() {
  const idInput = document.getElementById('editModalGDocId');
  if (idInput) {
    idInput.value = DEFAULT_MASTER_DOC_ID;
    showToast('🔄 ID diubah ke Master Default. Klik Simpan Document ID untuk menerapkan.', 'info');
  }
}

function bukaModalEditTemplateId(code, currentGDocId) {
  const codeInput = document.getElementById('editModalCodeDisplay');
  const idInput = document.getElementById('editModalGDocId');
  const codeHidden = document.getElementById('editModalDocCode');

  if (codeInput) codeInput.value = code;
  if (idInput) idInput.value = currentGDocId;
  if (codeHidden) codeHidden.value = code;

  const modal = document.getElementById('modalEditTemplateId');
  if (modal) modal.classList.remove('hidden');
}

function tutupModalEditTemplateId() {
  const modal = document.getElementById('modalEditTemplateId');
  if (modal) modal.classList.add('hidden');
}

async function simpanEditTemplateId() {
  const code = document.getElementById('editModalDocCode')?.value;
  const newGDocId = document.getElementById('editModalGDocId')?.value;

  if (!code || !newGDocId) {
    showToast('⚠️ Document ID tidak boleh kosong!', 'error');
    return;
  }

  try {
    const res = await fetch(`${getApiBase()}/api/templates/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: newGDocId })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Gagal terhubung ke server.' }));
      throw new Error(errorData.message || `Error ${res.status}`);
    }

    // Update local data only after successful save
    const tpl = RKP_TEMPLATES.find(x => x.code === code);
    if (tpl) {
      tpl.documentId = newGDocId;
      tpl.isReal = true; // Mark as real since we just saved a valid ID
    }

    tutupModalEditTemplateId();
    renderTemplatesTable();

    // Jika halaman edit sedang dibuka untuk template ini, refresh preview & label ID.
    if (appState.activeDocCode === code && !document.getElementById('modul-dokumen-edit').classList.contains('hidden')) {
      const idEl = document.getElementById('editDocGDocId');
      if (idEl) idEl.textContent = `Google Docs ID: ${newGDocId}`;
      renderIframePreview(tpl || { code, documentId: newGDocId, isReal: true });
    }

    showToast(`✅ Document ID untuk ${code} berhasil diperbarui!`, 'success');

  } catch (e) {
    console.error('Gagal menyimpan Document ID:', e);
    showToast(`❌ Gagal menyimpan ke backend: ${e.message}`, 'error');
  }
}

function bukaModalTambahTemplate() {
  const modal = document.getElementById('modalTambahTemplate');
  if (modal) modal.classList.remove('hidden');
}

function tutupModalTambahTemplate() {
  const modal = document.getElementById('modalTambahTemplate');
  if (modal) modal.classList.add('hidden');
}

async function simpanTambahTemplateBaru() {
  const code = document.getElementById('tambahModalCode')?.value?.toUpperCase();
  const name = document.getElementById('tambahModalName')?.value;
  const gdocId = document.getElementById('tambahModalGDocId')?.value;

  if (!code || !gdocId) {
    showToast('⚠️ Mohon isi Kode Dokumen dan Document ID!', 'error');
    return;
  }

  const newTpl = { code, name: name || code, documentId: gdocId, stage: 'A', isReal: true, fields: [], tableHeaders: [] };
  RKP_TEMPLATES.push(newTpl);

  try {
    await fetch(`${getApiBase()}/api/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTpl)
    });
  } catch (e) {
    console.warn('Gagal menyimpan ke backend:', e);
  }

  tutupModalTambahTemplate();
  renderTemplatesTable();
  populateTemplateSelector();
  showToast(`✅ Template baru "${code}" berhasil ditambahkan!`, 'success');
}

function hapusTemplate(code) {
  if (confirm(`Apakah Anda yakin ingin menghapus template ${code}?`)) {
    RKP_TEMPLATES = RKP_TEMPLATES.filter(x => x.code !== code);
    try {
      fetch(`${getApiBase()}/api/templates/${code}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Gagal menghapus dari backend:', e);
    }
    renderTemplatesTable();
    populateTemplateSelector();
    showToast(`🗑️ Template ${code} telah dihapus.`, 'info');
  }
}

// 4. MODUL 2: HALAMAN SCAN PLACEHOLDER OTOMATIS (/admin/templates/scan/[id])
function bukaHalamanScan(code) {
  bukaModul('/admin/templates/scan');

  const tpl = RKP_TEMPLATES.find(x => x.code === code) || { code, name: 'Template', documentId: '' };
  
  const codeEl = document.getElementById('scanDocCode');
  const titleEl = document.getElementById('scanDocTitle');
  const inputId = document.getElementById('inputScanGDocId');

  if (codeEl) codeEl.textContent = tpl.code;
  if (titleEl) titleEl.textContent = `Scan Tag Placeholder Google Docs - ${tpl.name}`;
  if (inputId) inputId.value = tpl.documentId;

  eksekusiScanOtomatis(tpl.code);
}

async function eksekusiScanOtomatis(codeParam) {
  const code = codeParam || document.getElementById('scanDocCode')?.textContent || 'DOC-02B';
  const gdocId = document.getElementById('inputScanGDocId')?.value || '';
  const container = document.getElementById('containerScanResults');

  if (!container) return;

  container.innerHTML = `
    <div class="text-center py-8 text-slate-400">
      <i class="fas fa-spinner fa-spin text-2xl text-brand-500"></i>
      <p class="mt-2 text-xs font-bold">Memindai tag placeholder {{...}} dari Google Docs (${gdocId})...</p>
    </div>
  `;

  try {
    const res = await fetch(`${getApiBase()}/api/scan-placeholders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ google_docs_id: gdocId, doc_code: code })
    });
    const result = await res.json();

    if (result.success) {
      const fields = result.fields || [];

      // Update template fields dengan hasil scan
      const tpl = RKP_TEMPLATES.find(x => x.code === code);
      if (tpl) {
        tpl.fields = fields;
      }

      container.innerHTML = `
        <div class="bg-emerald-50 border border-emerald-300 p-4 rounded-xl text-emerald-900 text-xs space-y-2">
          <div class="font-bold text-sm flex items-center gap-1.5">
            <i class="fas fa-check-circle text-emerald-600"></i> Berhasil Menemukan ${fields.length} Tag Placeholder pada Template!
          </div>
          <p class="text-slate-600">Seluruh field di bawah siap digunakan untuk pengisian otomatis form dan sinkronisasi data.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${fields.map(f => `
            <div class="p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <code class="font-mono font-bold text-brand-600 text-xs bg-brand-50 px-1.5 py-0.5 rounded">{{${f.key}}}</code>
                <span class="text-xs text-slate-700 font-semibold ml-1.5">${f.label || f.key}</span>
              </div>
              <span class="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded text-slate-600">${f.type || 'text'}</span>
            </div>
          `).join('')}
        </div>

        <div class="flex justify-end pt-2">
          <button onclick="bukaDokumenEdit('${code}')" class="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow">
            Buka Form Pengisian Otomatis & Preview →
          </button>
        </div>
      `;

      showToast('✅ Pemindaian placeholder Google Docs selesai!', 'success');
    } else {
      container.innerHTML = `<div class="p-4 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl">⚠️ Tidak ada placeholder ditemukan atau gagal memindai.</div>`;
    }
  } catch (e) {
    container.innerHTML = `<div class="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-xl">Gagal memindai: ${e.message}</div>`;
  }
}

// 5. MODAL 3: EDIT DOKUMEN (DYNAMIC FORM + REAL GOOGLE DOCS IFRAME EMBED PREVIEW)
async function bukaDokumenEdit(code) {
  appState.activeDocCode = code;
  appState.lastGeneratedDocId = null;
  bukaModul('/dokumen/[id]/edit');

  const tahun = appState.activeTahun;

  // Sinkronkan fields/tableHeaders dari server terlebih dahulu
  await muatPengaturanTemplate(code);

  const tpl = RKP_TEMPLATES.find(x => x.code === code) || { code, name: 'Template Dokumen', documentId: '', isReal: false };

  // 1. Muat data GLOBAL_MASTER (fields & tables) terlebih dahulu agar data master terbaru selalu menang
  try {
    const globalRes = await fetch(`${getApiBase()}/api/dokumen-form-data/GLOBAL_MASTER/${tahun}`);
    const globalData = await globalRes.json();
    if (globalData && globalData.success) {
      if (globalData.fields) {
        if (!appState.globalSharedFields) appState.globalSharedFields = {};
        appState.globalSharedFields = { ...globalData.fields, ...appState.globalSharedFields };
      }
      if (globalData.tables && typeof globalData.tables === 'object') {
        const mainT = globalData.tables.tabel_tim_penyusun || globalData.tables.tabel_sk_tim_penyusun || globalData.tables.susunan_tim;
        if (Array.isArray(mainT) && mainT.length > 0) {
          appState.globalSharedTables = mainT;
        }
      }
    }
  } catch (e) {}

  try {
    const supabaseRes = await fetch(`${getApiBase()}/api/dokumen-form-data/${code}/${tahun}`);
    const supabaseData = await supabaseRes.json();
    if (supabaseData && supabaseData.success) {
      if (supabaseData.fields && Object.keys(supabaseData.fields).length > 0) {
        rawFields = supabaseData.fields;
      }
      if (supabaseData.tables && Object.keys(supabaseData.tables).length > 0) {
        rawTables = supabaseData.tables;
      }
      if (supabaseData.last_doc_id) {
        appState.lastGeneratedDocId = supabaseData.last_doc_id;
      }
    }
  } catch (e) {
    console.warn('Gagal memuat data dari Supabase, menggunakan localStorage:', e);
  }

  const savedState = loadStateFromLocalStorage(code, tahun);
  if (Object.keys(rawFields).length === 0) {
    rawFields = savedState.documentFields || {};
  }
  if (Object.keys(rawTables).length === 0) {
    rawTables = savedState.documentTables || {};
  }

  // Prioritaskan tabel master global (globalSharedTables) jika memiliki baris data lebih banyak atau sama
  const globalTableRows = (appState.globalSharedTables && Array.isArray(appState.globalSharedTables)) ? appState.globalSharedTables : [];
  let docTableRows = [];
  if (rawTables && typeof rawTables === 'object') {
    docTableRows = rawTables.tabel_tim_penyusun || rawTables.tabel_sk_tim_penyusun || rawTables.susunan_tim || [];
  }

  if (globalTableRows.length > 0 && (docTableRows.length === 0 || globalTableRows.length >= docTableRows.length)) {
    rawTables = {
      tabel_tim_penyusun: globalTableRows,
      tabel_sk_tim_penyusun: globalTableRows,
      susunan_tim: globalTableRows,
      tabel_daftar_hadir: globalTableRows,
      tabel_kegiatan: globalTableRows
    };
  }

  // Prioritaskan nilai master global terbaru agar nilai lama dari dokumen individual tidak menimpa nilai baru
  if (appState.globalSharedFields) {
    Object.keys(appState.globalSharedFields).forEach(k => {
      const gVal = appState.globalSharedFields[k];
      if (gVal !== undefined && gVal !== null && gVal !== '') {
        rawFields[k] = gVal;
      }
    });
  }
  
  // Keep all fields & tables retrieved from Supabase database intact
  appState.documentFields = { ...rawFields };
  appState.documentTables = { ...rawTables };

  const codeEl = document.getElementById('editDocCode');
  const titleEl = document.getElementById('editDocTitle');
  const idEl = document.getElementById('editDocGDocId');

  if (codeEl) codeEl.textContent = tpl.code;
  if (titleEl) titleEl.textContent = tpl.name;

  // Cek apakah ada salinan hasil sinkronisasi sebelumnya di server
  let activePreviewId = tpl.documentId;
  try {
    const statusRes = await fetch(`${getApiBase()}/api/sync-status/${code}/${tahun}`);
    const statusData = await statusRes.json();
    if (statusData.success && statusData.last_doc_id) {
      appState.lastGeneratedDocId = statusData.last_doc_id;
      if (statusData.last_doc_id !== tpl.documentId) {
        activePreviewId = statusData.last_doc_id;
      }
    }
  } catch (e) {
    console.warn('Gagal memuat status sinkronisasi:', e);
  }

  if (idEl) {
    idEl.textContent = activePreviewId !== tpl.documentId 
      ? `ID Salinan Terisi: ${activePreviewId}`
      : `Google Docs ID Master: ${tpl.documentId}`;
  }

  // Render Preview (menampilkan dokumen salinan terisi jika ada, atau master template jika belum)
  renderIframePreview({ code: tpl.code, documentId: activePreviewId, isReal: !!activePreviewId });

  // Render Dynamic Generated Form Fields
  await renderDynamicFormFields(tpl);
}

let iframePreviewToken = 0;
function renderIframePreview(tpl) {
  const iframe = document.getElementById('iframeGoogleDocsPreview');
  if (!iframe) return;

  const token = ++iframePreviewToken;

  // Hentikan load sebelumnya dulu agar dokumen lama tidak tertinggal.
  iframe.src = 'about:blank';

  if (tpl.isReal && tpl.documentId) {
    const previewUrl = `https://docs.google.com/document/d/${tpl.documentId}/preview`;
    setTimeout(() => {
      if (token !== iframePreviewToken) return; // Bukan permintaan terbaru lagi
      iframe.src = previewUrl;
      console.log('🔄 Preview Google Docs dimuat:', previewUrl);
    }, 120);
    return;
  }

  // Tidak ada ID valid → tampilkan placeholder
  setTimeout(() => {
    if (token !== iframePreviewToken) return;
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:sans-serif;color:#555;text-align:center;">
        <div>
          <h2 style="font-size:1.5rem;font-weight:bold;">Pratinjau Tidak Tersedia</h2>
          <p style="font-size:1rem;margin-top:0.5rem;">Template ini belum memiliki Google Docs ID yang valid.</p>
          <button onclick="window.parent.bukaModalEditTemplateId('${tpl.code}', '${tpl.documentId}')" style="background-color:#1e293b;color:white;padding:10px 20px;border:none;border-radius:8px;font-weight:bold;margin-top:1rem;cursor:pointer;">
            Tetapkan Google Docs ID
          </button>
        </div>
      </div>`;
    } catch (e) {
      console.error('Could not write to iframe:', e);
    }
  }, 120);
}

function refreshLivePreviewIframe() {
  const iframe = document.getElementById('iframeGoogleDocsPreview');
  if (!iframe || !iframe.src || iframe.src === 'about:blank') return;
  const currentSrc = iframe.src.split('?')[0];
  iframe.src = 'about:blank';
  setTimeout(() => {
    iframe.src = `${currentSrc}?t=${Date.now()}`;
    showToast('🔄 Live Preview diperbarui.', 'info');
  }, 150);
}

// Konversi teks tanggal (mis. "15 Oktober 2024" / "Kamis, 15 Oktober 2024") ke
// format input type="date" (YYYY-MM-DD). Jika sudah valid, dikembalikan apa adanya.
function formatDateForInput(val) {
  if (!val) return '';
  const s = String(val).trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;

  const BULAN_NAMES = { 'januari': '01', 'februari': '02', 'maret': '03', 'april': '04', 'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08', 'september': '09', 'oktober': '10', 'november': '11', 'desember': '12' };
  const m = s.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (m) {
    const bln = BULAN_NAMES[String(m[2]).toLowerCase()];
    if (bln) return `${m[3]}-${bln}-${String(Number(m[1])).padStart(2, '0')}`;
  }
  return '';
}

async function renderDynamicFormFields(tpl) {
  console.log('--------------------------------------------------');
  console.log('📌 [Render Form Step 1] Call renderDynamicFormFields for:', tpl.code);

  const container = document.getElementById('containerDynamicFormFields');
  if (!container) {
    console.error('❌ [Render Form ERROR] #containerDynamicFormFields TIDAK DITEMUKAN DI DOM!');
    return;
  }
  console.log('✅ [Render Form Step 2] #containerDynamicFormFields Ditemukan di DOM.');

  container.innerHTML = `
    <div class="text-center py-8 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl text-brand-500"></i><p class="mt-2 text-xs font-bold">Memuat form...</p></div>
  `;

  let fields = tpl.fields || [];

  if (!fields || fields.length === 0) {
    container.innerHTML = `<div class="text-center py-8 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl text-brand-500"></i><p class="mt-2 text-xs font-bold">Template belum dikonfigurasi. Menjalankan pemindaian placeholder pertama kali...</p></div>`;
    // Jika fields kosong, panggil scan untuk mengisinya sekali
    await scanDanMuatUlangPengaturan(tpl.code, true); // silent scan
    // Muat ulang template untuk mendapatkan fields yang baru
    const updatedTpl = RKP_TEMPLATES.find(x => x.code === tpl.code);
    fields = updatedTpl?.fields || [];
    if (fields.length === 0) {
      container.innerHTML = `<div class="p-4 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl">⚠️ Gagal memindai atau template ini belum memiliki placeholder. Buka pengaturan dan jalankan "Scan Ulang Placeholder".</div>`;
      return;
    }
  }

  const MASTER_KEYS = ['nama_desa', 'tahun', 'tahun1', 'kades', 'nama_kepala_desa', 'nama_ketua_bpd', 'tempat'];
  let html = '';

  const IGNORE_SINGLE_KEYS = ['no', 'nama', 'ttl', 'jabatan', 'unsur', 'umur'];

  fields.forEach(f => {
    if (f.type === 'table' || f.key.startsWith('tabel_') || f.key.endsWith('[]') || IGNORE_SINGLE_KEYS.includes(f.key.toLowerCase())) return;

    const key = f.key;
    const label = f.label || key.replace(/_/g, ' ');
    const isMaster = MASTER_KEYS.includes(key);

    // Field tanggal otomatis (tgl_<token>_hari/bulan/terbilang) HARUS pakai
    // type="text" karena turunannya (hari/bulan/terbilang) diparse dari format
    // Indonesia (mis. "8 Agustus 2026"). Pakai <input type="date"> akan
    // menghasilkan YYYY-MM-DD yang tidak konsisten & bikin sync ke PDF gagal.
    const isTglOtomatis = /^tgl_.+_(hari|bulan|terbilang)$/.test(key);
    const fieldType = isTglOtomatis ? 'text' : (f.type || 'text');

    let defaultVal = MASTER_SHARED_DEFAULTS[key] || '';
    if (!defaultVal) {
      const lowerK = key.toLowerCase();
      if (lowerK.includes('kades') || lowerK.includes('kepala_desa')) defaultVal = 'SUMAILA DAMANG';
      else if (lowerK.includes('tahun')) defaultVal = appState.activeTahun || '2027';
      else if (lowerK.includes('tempat') || lowerK.includes('lokasi')) defaultVal = 'Aula Kantor Desa Batetangnga';
      else if (lowerK.includes('desa')) defaultVal = 'Desa Batetangnga';
      else if (lowerK.includes('kecamatan')) defaultVal = 'Binuang';
      else if (lowerK.includes('kabupaten')) defaultVal = 'Polewali Mandar';
      else defaultVal = '';
    }

    const isYearField = (key === 'tahun' || key === 'tahun1' || key === 'tahun_anggaran' || key === 'year' || key === 'tahun_rkp');
    let val = appState.documentFields[key];

    if (isYearField) {
      val = appState.activeTahun || localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || '2027';
      appState.documentFields[key] = val;
    } else if (val === undefined || val === null) {
      val = appState.globalSharedFields[key] || MASTER_SHARED_DEFAULTS[key] || defaultVal;
      appState.documentFields[key] = val;
    }

    const labelBlock = `
      <div class="flex justify-between items-center mb-1">
        <label class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <code class="font-mono ${isMaster ? 'text-emerald-700 bg-emerald-50' : 'text-brand-600 bg-brand-50'} px-1.5 py-0.5 rounded">{{${key}}}</code> ${label}
        </label>
        <div class="flex items-center gap-1.5">
          ${isMaster ? `<span class="text-[10px] text-emerald-700 font-bold">✓ Master Field</span>` : ''}
          <button onclick="bukaModalEditField('${key}')" class="text-[10px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-1.5 py-0.5 rounded border border-sky-200 transition cursor-pointer" title="Ubah Tipe Field &amp; Label (Inline Edit)">
            <i class="fas fa-pen text-[9px]"></i> Inline Edit
          </button>
        </div>
      </div>
    `;

    let inputHtml = '';
    if (isYearField) {
      const yearOptions = ['2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];
      const optionsHtml = yearOptions.map(y => `<option value="${y}" ${String(val) === String(y) ? 'selected' : ''}>${y}</option>`).join('');
      inputHtml = `<select id="input_field_${key}" onchange="handleAutoSaveInput('${key}')" class="w-full text-xs border border-amber-300 bg-amber-50/40 rounded-xl p-2.5 focus:border-amber-500 focus:outline-none font-bold text-amber-900 cursor-pointer">${optionsHtml}</select>`;
    } else if (fieldType === 'date') {
      inputHtml = `<input type="date" id="input_field_${key}" oninput="handleAutoSaveInput('${key}')" value="${formatDateForInput(val)}" class="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:border-brand-500 focus:outline-none font-semibold" />`;
    } else if (fieldType === 'number') {
      inputHtml = `<input type="number" id="input_field_${key}" oninput="handleAutoSaveInput('${key}')" value="${val}" class="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:border-brand-500 focus:outline-none font-semibold" />`;
    } else if (fieldType === 'textarea') {
      inputHtml = `<textarea id="input_field_${key}" oninput="handleAutoSaveInput('${key}')" rows="3" class="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:border-brand-500 focus:outline-none resize-y">${val}</textarea>`;
    } else if (fieldType === 'dropdown' && Array.isArray(f.options) && f.options.length > 0) {
      const optionsHtml = [
        `<option value="">— Pilih —</option>`,
        ...f.options.map(o => `<option value="${o}" ${String(val) === String(o) ? 'selected' : ''}>${o}</option>`)
      ].join('');
      inputHtml = `<select id="input_field_${key}" onchange="handleAutoSaveInput('${key}')" class="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:border-brand-500 focus:outline-none font-semibold">${optionsHtml}</select>`;
    } else {
      const isLong = key.includes('isi') || key.includes('materi') || key.includes('hasil') || key.includes('catatan') || key.includes('menimbang') || key.includes('dasar');
      if (isLong) {
        inputHtml = `<textarea id="input_field_${key}" oninput="handleAutoSaveInput('${key}')" rows="3" class="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:border-brand-500 focus:outline-none resize-y">${val}</textarea>`;
      } else {
        inputHtml = `<input type="text" id="input_field_${key}" oninput="handleAutoSaveInput('${key}')" value="${val}" class="w-full text-xs border ${isMaster ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-300'} rounded-xl p-2.5 focus:border-brand-500 focus:outline-none font-semibold" />`;
      }
    }

    html += `
      <div>
        ${labelBlock}
        ${inputHtml}
      </div>
    `;
  });

  const targetTpl = RKP_TEMPLATES.find(x => x.code === tpl?.code) || tpl || { hasTable: false, tableHeaders: [] };
  const usesTable = targetTpl.hasTable === undefined
    ? (Array.isArray(targetTpl.tableHeaders) && targetTpl.tableHeaders.length > 0)
    : targetTpl.hasTable === true;

  if (usesTable) {
    const headers = (targetTpl.tableHeaders && targetTpl.tableHeaders.length > 0)
      ? targetTpl.tableHeaders
      : ['No', 'Nama', 'Tempat, Tanggal Lahir', 'Jabatan', 'Unsur'];

    console.log(`📌 [Render Form Step 5] Merender Dynamic Repeatable Table (${headers.join(', ')})...`);

    let headerColsHtml = '';
    headers.forEach(h => {
      if (h.toLowerCase() === 'no') {
        headerColsHtml += `<th class="p-1.5 border text-center w-10">No</th>`;
      } else {
        headerColsHtml += `<th class="p-1.5 border min-w-[110px] text-left">${h}</th>`;
      }
    });
    headerColsHtml += `<th class="p-1.5 border text-center w-8">Aksi</th>`;

    const dataHeaders = headers.filter(h => h.toLowerCase() !== 'no');
    let savedTableData = null;
    if (appState.documentTables && typeof appState.documentTables === 'object') {
      const tableKeys = Object.keys(appState.documentTables);
      for (const tk of tableKeys) {
        if (Array.isArray(appState.documentTables[tk]) && appState.documentTables[tk].length > 0) {
          savedTableData = appState.documentTables[tk];
          break;
        }
      }
    }
    if (!savedTableData && appState.globalSharedTables && Array.isArray(appState.globalSharedTables) && appState.globalSharedTables.length > 0) {
      savedTableData = appState.globalSharedTables;
    }
    if (!savedTableData) {
      savedTableData = [
        { nama: '', ttl: '', jabatan: '', unsur: '' }
      ];
    }

    let rowsHtml = '';
    savedTableData.forEach((item, index) => {
      rowsHtml += `<tr class="table-row-item">`;
      rowsHtml += `<td class="p-1 border text-center font-bold text-slate-600 col-no">${index + 1}</td>`;
      
      dataHeaders.forEach((h, colIdx) => {
        const val = (item[h] !== undefined && item[h] !== null) 
          ? item[h] 
          : (item[h.toLowerCase()] !== undefined && item[h.toLowerCase()] !== null) 
            ? item[h.toLowerCase()] 
            : (item[`col_${colIdx}`] !== undefined && item[`col_${colIdx}`] !== null) 
              ? item[`col_${colIdx}`] 
              : (colIdx === 0 ? (item.nama || '') : colIdx === 1 ? (item.ttl || '') : colIdx === 2 ? (item.jabatan || '') : (item.unsur || ''));
        rowsHtml += `<td class="p-1 border"><input type="text" class="col-dyn-${colIdx} w-full p-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-brand-500 font-semibold" oninput="handleAutoSaveTable()" value="${val}" placeholder="${h}..." /></td>`;
      });

      rowsHtml += `<td class="p-1 border text-center"><button onclick="hapusBarisTim(this)" class="text-red-500 hover:text-red-700 font-bold px-1">&times;</button></td>`;
      rowsHtml += `</tr>`;
    });

    html += `
      <div class="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 mt-4 shadow-sm">
        <div class="flex justify-between items-center flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-md bg-brand-500 text-white flex items-center justify-center text-[10px]">
              <i class="fas fa-table"></i>
            </span>
            <h4 class="text-xs font-extrabold text-slate-800 uppercase tracking-tight">DATA TABEL DOKUMEN (Repeatable Table)</h4>
          </div>
          <div class="flex items-center gap-1.5">
            <button onclick="bukaModalEditTableHeader()" class="bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer">
              <i class="fas fa-pen-to-square"></i> Edit Header Tabel
            </button>
            <button onclick="tambahBarisTim()" class="bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition cursor-pointer">
              <i class="fas fa-plus"></i> + Baris
            </button>
          </div>
        </div>
        <div class="overflow-x-auto rounded-lg border border-slate-200">
          <table class="w-full text-xs bg-white">
            <thead class="bg-slate-100 font-bold text-slate-700 border-b">
              <tr>
                ${headerColsHtml}
              </tr>
            </thead>
            <tbody id="tbodyRepeatableTim">
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <span class="text-xs text-slate-500 font-medium flex items-center gap-1.5">
          <i class="fas fa-circle-info text-sky-500"></i> Template ini diset tanpa tabel berulang.
        </span>
        <button onclick="bukaModalEditTableHeader()" class="text-xs font-extrabold bg-sky-100 hover:bg-sky-200 text-sky-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer">
          <i class="fas fa-pen-to-square"></i> Aktifkan & Edit Header Tabel
        </button>
      </div>
    `;
  }

  container.innerHTML = html;
  initTanggalAutoGroup(fields);
  console.log('🎉 [Render Form Step 6] Render form SELESAI!');
  console.log('--------------------------------------------------\n');
}

function triggerDebouncedSupabaseSave() {
  if (appState.supabaseSaveTimer) clearTimeout(appState.supabaseSaveTimer);
  const indicator = document.getElementById('autoSaveIndicator');
  if (indicator) {
    indicator.textContent = '⏳ Menyimpan ke Supabase...';
    indicator.className = 'text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full';
  }
  appState.supabaseSaveTimer = setTimeout(async () => {
    try {
      const code = appState.activeDocCode || 'DOC-02B';
      const tahun = appState.activeTahun;
      const tpl = RKP_TEMPLATES.find(x => x.code === code) || { code, documentId: '' };
      
      const tableData = gatherTableRowsData();
      const tables = {
        tabel_tim_penyusun: tableData,
        tabel_sk_tim_penyusun: tableData,
        susunan_tim: tableData,
        tabel_daftar_hadir: tableData,
        tabel_kegiatan: tableData
      };

      const res = await fetch(`${getApiBase()}/api/sync-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_docs_id: tpl.documentId,
          doc_code: code,
          tahun: tahun,
          fields: appState.documentFields,
          tables: tables,
          isTemplate: true
        })
      });

      // Juga simpan nilai master global ke record GLOBAL_MASTER di Supabase agar tersinkron ke semua surat
      if (appState.globalSharedFields && Object.keys(appState.globalSharedFields).length > 0) {
        fetch(`${getApiBase()}/api/sync-document`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            google_docs_id: 'GLOBAL_MASTER',
            doc_code: 'GLOBAL_MASTER',
            tahun: tahun,
            fields: appState.globalSharedFields,
            tables: {},
            isTemplate: true
          })
        }).catch(() => {});
      }

      const resData = await res.json();
      if (resData && resData.success) {
        if (indicator) {
          indicator.textContent = '✓ Tersimpan di Supabase';
          indicator.className = 'text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full';
        }
      }
    } catch (e) {
      console.warn('Auto save to Supabase failed:', e);
    }
  }, 1000);
}

function handleAutoSaveInput(key) {
  const el = document.getElementById(`input_field_${key}`);
  if (el) {
    const val = el.value;
    appState.documentFields[key] = val;

    // Sync to globalSharedFields cache
    if (!appState.globalSharedFields) appState.globalSharedFields = {};
    appState.globalSharedFields[key] = val;
    if (key === 'tahun' || key === 'tahun1') {
      appState.globalSharedFields['tahun'] = val;
      appState.globalSharedFields['tahun1'] = val;
      appState.documentFields['tahun'] = val;
      appState.documentFields['tahun1'] = val;
      appState.activeTahun = val;
      const selectHeader = document.getElementById('selectTahunDokumenDesa');
      if (selectHeader) selectHeader.value = val;
    }
    try {
      localStorage.setItem('GLOBAL_SHARED_FIELDS', JSON.stringify(appState.globalSharedFields));
    } catch (e) {}
  }

  saveStateToLocalStorage();
  triggerDebouncedSupabaseSave();
}

function handleAutoSaveTable() {
  const tableData = gatherTableRowsData();
  appState.globalSharedTables = tableData;
  appState.documentTables = {
    tabel_tim_penyusun: tableData,
    tabel_sk_tim_penyusun: tableData,
    susunan_tim: tableData,
    tabel_daftar_hadir: tableData,
    tabel_kegiatan: tableData
  };
  try {
    localStorage.setItem('GLOBAL_SHARED_TABLES', JSON.stringify(tableData));
  } catch (e) {}
  saveStateToLocalStorage();
  triggerDebouncedSupabaseSave();
}

function gantiTahunDokumenDesa(tahunVal) {
  appState.activeTahun = tahunVal;
  if (!appState.globalSharedFields) appState.globalSharedFields = {};
  appState.globalSharedFields['tahun'] = tahunVal;
  appState.globalSharedFields['tahun1'] = tahunVal;
  appState.documentFields['tahun'] = tahunVal;
  appState.documentFields['tahun1'] = tahunVal;
  try {
    localStorage.setItem('GLOBAL_SHARED_FIELDS', JSON.stringify(appState.globalSharedFields));
  } catch (e) {}

  const selectHeader = document.getElementById('selectTahunDokumenDesa');
  if (selectHeader) selectHeader.value = tahunVal;

  const tpl = RKP_TEMPLATES.find(x => x.code === appState.activeDocCode);
  if (tpl) {
    renderDynamicFormFields(tpl);
  }
  showToast(`📅 Tahun Anggaran diubah ke ${tahunVal}`, 'info');
}

async function simpanDanTerapkanGlobalFieldsSemuaDokumen() {
  const container = document.getElementById('containerDynamicFormFields');
  if (container) {
    container.querySelectorAll('input[id^="input_field_"], textarea[id^="input_field_"], select[id^="input_field_"]').forEach(el => {
      const key = el.id.replace('input_field_', '');
      const val = el.value;
      appState.documentFields[key] = val;
      if (!appState.globalSharedFields) appState.globalSharedFields = {};
      appState.globalSharedFields[key] = val;
    });
  }

  try {
    localStorage.setItem('GLOBAL_SHARED_FIELDS', JSON.stringify(appState.globalSharedFields));
  } catch (e) {}

  showToast('💾 Menyimpan & menerapkan data master ke seluruh surat...', 'info');

  let count = 0;
  for (let i = 0; i < RKP_TEMPLATES.length; i++) {
    const tpl = RKP_TEMPLATES[i];
    const docId = tpl.documentId || DEFAULT_MASTER_DOC_ID;
    try {
      const res = await fetch(`${getApiBase()}/api/sync-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_docs_id: docId,
          doc_code: tpl.code,
          fields: appState.globalSharedFields,
          tables: {}
        })
      });
      if (res.ok) count++;
    } catch (e) {}
  }

  showToast(`✅ Data master (Tahun, Kades, Tempat, dll) berhasil disimpan & diterapkan ke ${count} Surat di Supabase!`, 'success');
}


// ============================================================
// GRUP TANGGAL OTOMATIS — {{tgl_<token>_hari/bulan/terbilang}}
// Pola: token sama → satu input sumber, dua lainnya dikunci (readonly)
// dan diisi otomatis oleh sistem memakai tanggal yang sama.
// ============================================================
const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function tglAngkaTerbilang(n) {
  if (n === 0) return '';
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas', 'Enam Belas', 'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas'];
  function duaDigit(x) {
    if (x < 20) return satuan[x];
    const puluh = Math.floor(x / 10);
    const sisa = x % 10;
    return (puluh === 1 ? 'Sepuluh' : satuan[puluh] + ' Puluh') + (sisa ? ' ' + satuan[sisa] : '');
  }
  function tigaDigit(x) {
    if (x < 100) return duaDigit(x);
    const ratus = Math.floor(x / 100);
    const sisa = x % 100;
    return (ratus === 1 ? 'Seratus' : satuan[ratus] + ' Ratus') + (sisa ? ' ' + duaDigit(sisa) : '');
  }
  if (n < 1000) return tigaDigit(n);
  const ribu = Math.floor(n / 1000);
  const sisa = n % 1000;
  return (ribu === 1 ? 'Seribu' : tigaDigit(ribu) + ' Ribu') + (sisa ? ' ' + tigaDigit(sisa) : '');
}

function tglParseTanggalBahasa(text) {
  if (!text) return null;
  const m = String(text).match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monthName = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
  const monthIdx = BULAN_ID.findIndex(x => x.toLowerCase() === m[2].toLowerCase());
  if (monthIdx < 0 || day < 1 || day > 31) return null;
  const year = parseInt(m[3], 10);
  const weekdayName = HARI_ID[new Date(year, monthIdx, day).getDay()];
  return { day, monthIdx, month: BULAN_ID[monthIdx], year, weekday: weekdayName };
}

function tglUpdateGrup(token) {
  const sourceEl = document.querySelector(`[data-tgl-token="${token}"][data-tgl-role="source"]`);
  const pickerEl = document.getElementById(`tgl_picker_${token}`);
  
  let parsed = null;
  if (pickerEl && pickerEl.value) {
    const parts = pickerEl.value.split('-');
    if (parts.length === 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      const weekdayName = HARI_ID[new Date(y, m - 1, d).getDay()];
      parsed = { day: d, monthIdx: m - 1, month: BULAN_ID[m - 1], year: y, weekday: weekdayName };
    }
  } else if (sourceEl && sourceEl.value) {
    parsed = tglParseTanggalBahasa(sourceEl.value);
  }

  if (parsed) {
    const hariVal = `${parsed.weekday}, ${parsed.day} ${parsed.month} ${parsed.year}`;
    const bulanVal = `${parsed.day} ${parsed.month} ${parsed.year}`;
    const terbilangVal = `Hari ${parsed.weekday} Tanggal ${tglAngkaTerbilang(parsed.day)} Bulan ${parsed.month} Tahun ${tglAngkaTerbilang(parsed.year)}`;

    if (!appState.globalSharedFields) appState.globalSharedFields = {};
    appState.globalSharedFields[`tgl_${token}_hari`] = hariVal;
    appState.globalSharedFields[`tgl_${token}_bulan`] = bulanVal;
    appState.globalSharedFields[`tgl_${token}_terbilang`] = terbilangVal;
    appState.globalSharedFields[`tgl_${token}`] = bulanVal;

    appState.documentFields[`tgl_${token}_hari`] = hariVal;
    appState.documentFields[`tgl_${token}_bulan`] = bulanVal;
    appState.documentFields[`tgl_${token}_terbilang`] = terbilangVal;
    appState.documentFields[`tgl_${token}`] = bulanVal;

    try {
      localStorage.setItem('GLOBAL_SHARED_FIELDS', JSON.stringify(appState.globalSharedFields));
    } catch (e) {}

    // Update all matching elements in current DOM
    const allGroupInputs = document.querySelectorAll(`[data-tgl-token="${token}"]`);
    allGroupInputs.forEach(el => {
      const key = el.getAttribute('data-tgl-key') || (el.id ? el.id.replace('input_field_', '') : '');
      if (key.endsWith('_hari')) {
        el.value = hariVal;
      } else if (key.endsWith('_terbilang')) {
        el.value = terbilangVal;
      } else if (key) {
        el.value = bulanVal;
      }
    });
  } else {
    const allGroupInputs = document.querySelectorAll(`[data-tgl-token="${token}"]`);
    allGroupInputs.forEach(el => {
      if (el.tagName === 'INPUT' && el.type !== 'date') el.value = '';
    });
  }

  saveStateToLocalStorage();
  triggerDebouncedSupabaseSave();
}

function initTanggalAutoGroup(fields) {
  const TOKEN_RE = /^tgl_(.+)_(hari|bulan|terbilang)$/;
  const tokenRoles = {};
  (fields || []).forEach(f => {
    const m = String(f.key || '').match(TOKEN_RE);
    if (m) { tokenRoles[m[1]] = tokenRoles[m[1]] || {}; tokenRoles[m[1]][m[2]] = f.key; }
  });

  Object.keys(tokenRoles).forEach(token => {
    const roles = tokenRoles[token];
    const sourceRole = roles.hari ? 'hari' : (roles.bulan ? 'bulan' : 'terbilang');
    const srcId = 'input_field_' + roles[sourceRole];
    const sourceEl = document.getElementById(srcId);
    if (!sourceEl) return;

    // Kunci field sumber & tandai dengan atribut grup
    sourceEl.setAttribute('data-tgl-token', token);
    sourceEl.setAttribute('data-tgl-role', 'source');
    sourceEl.setAttribute('data-tgl-key', roles[sourceRole]);
    sourceEl.setAttribute('readonly', 'readonly');
    sourceEl.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');

    // Cek nilai tersimpan dari globalSharedFields
    const sharedHari = appState.globalSharedFields ? appState.globalSharedFields[`tgl_${token}_hari`] : null;
    const sharedBulan = appState.globalSharedFields ? appState.globalSharedFields[`tgl_${token}_bulan`] : null;
    if (sharedHari || sharedBulan) {
      const parsedShared = tglParseTanggalBahasa(sharedHari || sharedBulan);
      if (parsedShared) {
        const hariVal = `${parsedShared.weekday}, ${parsedShared.day} ${parsedShared.month} ${parsedShared.year}`;
        const bulanVal = `${parsedShared.day} ${parsedShared.month} ${parsedShared.year}`;
        const terbilangVal = `Hari ${parsedShared.weekday} Tanggal ${tglAngkaTerbilang(parsedShared.day)} Bulan ${parsedShared.month} Tahun ${tglAngkaTerbilang(parsedShared.year)}`;

        appState.documentFields[`tgl_${token}_hari`] = hariVal;
        appState.documentFields[`tgl_${token}_bulan`] = bulanVal;
        appState.documentFields[`tgl_${token}_terbilang`] = terbilangVal;
        appState.documentFields[`tgl_${token}`] = bulanVal;
      }
    }

    // Buat input date-picker khusus untuk grup ini
    let picker = document.getElementById(`tgl_picker_${token}`);
    if (!picker) {
      picker = document.createElement('input');
      picker.type = 'date';
      picker.id = `tgl_picker_${token}`;
      picker.className = 'w-full text-xs border border-brand-300 bg-brand-50/20 rounded-xl p-2.5 focus:border-brand-500 focus:outline-none mb-2 font-bold text-slate-800 shadow-sm';
      picker.setAttribute('data-tgl-token', token);
      sourceEl.parentNode.insertBefore(picker, sourceEl);
    }

    // Isikan nilai tanggal picker jika ada data tersimpan
    const currentVal = appState.documentFields[roles[sourceRole]] || (appState.globalSharedFields ? appState.globalSharedFields[roles[sourceRole]] : '');
    if (currentVal) {
      const p = tglParseTanggalBahasa(currentVal);
      if (p) {
        picker.value = `${p.year}-${String(p.monthIdx + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
      }
    }

    picker.onchange = () => {
      const v = picker.value; // YYYY-MM-DD
      if (!v) {
        sourceEl.value = '';
        tglUpdateGrup(token);
        return;
      }
      tglUpdateGrup(token);
    };

    ['hari', 'bulan', 'terbilang'].forEach(role => {
      if (role === sourceRole || !roles[role]) return;
      const el = document.getElementById('input_field_' + roles[role]);
      if (!el) return;
      el.setAttribute('data-tgl-token', token);
      el.setAttribute('data-tgl-role', 'derived');
      el.setAttribute('data-tgl-key', roles[role]);
      el.setAttribute('readonly', 'readonly');
      el.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');
    });

    tglUpdateGrup(token);
  });
}

function getActiveTemplateTableHeaders() {
  const code = appState.activeDocCode || 'DOC-02B';
  const tpl = RKP_TEMPLATES.find(x => x.code === code);
  if (tpl && Array.isArray(tpl.tableHeaders) && tpl.tableHeaders.length > 0) {
    return tpl.tableHeaders;
  }
  return ['No', 'Nama', 'Tempat, Tanggal Lahir', 'Jabatan', 'Unsur'];
}

function templateUsesTable(tpl) {
  if (!tpl) return false;
  if (tpl.hasTable !== undefined) return tpl.hasTable === true;
  return Array.isArray(tpl.tableHeaders) && tpl.tableHeaders.length > 0;
}

function tambahBarisTim() {
  const tbody = document.getElementById('tbodyRepeatableTim');
  if (!tbody) return;

  const headers = getActiveTemplateTableHeaders();
  const dataHeaders = headers.filter(h => h.toLowerCase() !== 'no');
  const count = tbody.querySelectorAll('tr').length + 1;

  const tr = document.createElement('tr');
  tr.className = 'table-row-item';

  let cellsHtml = `<td class="p-1 border text-center font-bold text-slate-600 col-no">${count}</td>`;
  dataHeaders.forEach((h, idx) => {
    cellsHtml += `<td class="p-1 border"><input type="text" class="col-dyn-${idx} w-full p-1 border border-slate-200 rounded text-xs focus:border-brand-500 focus:outline-none font-semibold" placeholder="${h}..." oninput="handleAutoSaveTable()" /></td>`;
  });
  cellsHtml += `<td class="p-1 border text-center"><button onclick="hapusBarisTim(this)" class="text-red-500 hover:text-red-700 font-bold px-1">&times;</button></td>`;

  tr.innerHTML = cellsHtml;
  tbody.appendChild(tr);
  renumberTableRows();
  handleAutoSaveTable();
}

function hapusBarisTim(btn) {
  const tr = btn.closest('tr');
  if (tr) {
    tr.remove();
    renumberTableRows();
    handleAutoSaveTable();
  }
}

function renumberTableRows() {
  const tbody = document.getElementById('tbodyRepeatableTim');
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach((tr, idx) => {
    const noCell = tr.querySelector('.col-no');
    if (noCell) noCell.textContent = String(idx + 1);
  });
}

function gatherTableRowsData() {
  const tbody = document.getElementById('tbodyRepeatableTim');
  if (!tbody) return [];

  const headers = getActiveTemplateTableHeaders();
  const dataHeaders = headers.filter(h => h.toLowerCase() !== 'no');

  const rows = [];
  tbody.querySelectorAll('tr').forEach((tr, idx) => {
    const rowObj = { no: String(idx + 1) };
    let hasAnyVal = false;

    dataHeaders.forEach((h, colIdx) => {
      const inp = tr.querySelector(`.col-dyn-${colIdx}`) || tr.querySelectorAll('input')[colIdx];
      const val = inp ? inp.value.trim() : '';
      if (val) hasAnyVal = true;
      rowObj[h] = val;
      rowObj[`col_${colIdx}`] = val;
    });

    const inputs = tr.querySelectorAll('input');
    if (inputs[0]) { rowObj.nama = inputs[0].value; if (inputs[0].value.trim()) hasAnyVal = true; }
    if (inputs[1]) { rowObj.ttl = inputs[1].value; if (inputs[1].value.trim()) hasAnyVal = true; }
    if (inputs[2]) { rowObj.jabatan = inputs[2].value; if (inputs[2].value.trim()) hasAnyVal = true; }
    if (inputs[3]) { rowObj.unsur = inputs[3].value; if (inputs[3].value.trim()) hasAnyVal = true; }

    if (hasAnyVal) {
      rows.push(rowObj);
    }
  });

  return rows;
}

async function simpanFormDokumenAuto() {
  console.log('--------------------------------------------------');
  console.log('📌 [Frontend Step 1] Tombol Simpan & Sinkron diklik');
  console.log('--------------------------------------------------');

  const currentFields = {};
  const container = document.getElementById('containerDynamicFormFields');
  if (container) {
    container.querySelectorAll('input[id^="input_field_"], textarea[id^="input_field_"], select[id^="input_field_"]').forEach(el => {
      const key = el.id.replace('input_field_', '');
      const lowerKey = key.toLowerCase();
      if (!lowerKey.startsWith('tabel_') && !lowerKey.startsWith('susunan_')) {
        currentFields[key] = el.value;
      }
    });
  }

  appState.documentFields = currentFields;
  if (!appState.globalSharedFields) appState.globalSharedFields = {};
  Object.keys(currentFields).forEach(k => {
    if (currentFields[k] !== undefined && currentFields[k] !== null && currentFields[k] !== '') {
      appState.globalSharedFields[k] = currentFields[k];
    }
  });
  try {
    localStorage.setItem('GLOBAL_SHARED_FIELDS', JSON.stringify(appState.globalSharedFields));
  } catch (e) {}
  saveStateToLocalStorage();

  const code = appState.activeDocCode || 'DOC-02B';
  const tahun = appState.activeTahun;
  const tpl = RKP_TEMPLATES.find(x => x.code === code) || { code, documentId: '' };

  const tableData = gatherTableRowsData();
  appState.documentTables = {
    tabel_tim_penyusun: tableData,
    tabel_sk_tim_penyusun: tableData,
    susunan_tim: tableData,
    tabel_daftar_hadir: tableData,
    tabel_kegiatan: tableData
  };
  saveStateToLocalStorage();

  console.log(`📌 [Frontend Step 2] Target Document Code: ${code} (${tahun})`);
  console.log(`📌 [Frontend Step 3] Target Google Docs ID: ${tpl.documentId}`);
  console.log(`📌 [Frontend Step 4] Data Input Form:`, appState.documentFields);
  console.log(`📌 [Frontend Step 4.5] Data Tabel Array:`, appState.documentTables);

  // Set Loading UI State on button
  const syncBtn = document.querySelector('button[onclick="simpanFormDokumenAuto()"]');
  const originalHtml = syncBtn ? syncBtn.innerHTML : '';
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Menyinkronkan...';
  }

  showToast(`🔄 Sinkronisasi data form ke Google Docs (${code} - ${tahun})...`, 'info');

  const GAS_DIRECT_URL = 'https://script.google.com/macros/s/AKfycbzX3NSA30tMEXOk6hH5qLA90Odkw7XVsH8foVqF6MP62AcPkJKe-iCxweqZ_vL-KntS/exec';

  try {
    let finalDocId = null;
    let syncedCount = Object.keys(appState.documentFields).length;

    // 1. Coba kirim request ke Node.js Server terlebih dahulu
    console.log('📌 [Frontend Step 5] Mengirim Request POST /api/sync-document...');
    try {
      const res = await fetch(`${getApiBase()}/api/sync-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_docs_id: tpl.documentId,
          doc_code: code,
          tahun: tahun,
          fields: appState.documentFields,
          tables: appState.documentTables,
          isTemplate: true
        })
      });
      const result = await res.json();
      console.log('✅ [Frontend Step 6] Respon Server Diterima:', result);

      if (result.success) {
        finalDocId = result.new_document_id || tpl.documentId || 'SAVED_SUPABASE_DOC';
        syncedCount = result.synced_fields_count || syncedCount;
      }
    } catch (serverErr) {
      console.warn('⚠️ Server lokal tidak merespon:', serverErr.message);
    }

    // 2. Jika server backend belum memanggil GAS / mengembalikan ID master mentah, panggil GAS langsung dari browser!
    if (!finalDocId || finalDocId === tpl.documentId) {
      console.log('⚡ Running Direct Browser-to-GAS Engine fallback...');
      showToast('⚡ Menyinkronkan & menduplikat dokumen via Engine GAS Direct...', 'info');

      const gasPayload = {
        action: 'syncDocument',
        documentId: tpl.documentId,
        code: code,
        tahun: tahun,
        isTemplate: true,
        previousDocId: appState.lastGeneratedDocId || null,
        data: appState.documentFields,
        tables: appState.documentTables
      };

      let gasRes = await fetch(GAS_DIRECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(gasPayload)
      });
      let gasResult = await gasRes.json();
      console.log('✅ [Frontend Step 6b] Respon Direct GAS Diterima:', gasResult);

      // Jika deployment GAS di server Google melempar error appendRow lama, lakukan fallback pengisian data tabel sebagai teks terformat
      if (!gasResult.success && gasResult.error && gasResult.error.includes('appendRow')) {
        console.warn('⚠️ Menjalankan fallback teks format tabel pada deployment GAS lama...');
        showToast('⚠️ Web App Google Apps Script masih versi lama (appendRow). Update deployment ke "New version" di script.google.com agar terisi dalam kotak-kotak tabel asli!', 'warning');
        
        const tableRows = (appState.documentTables && appState.documentTables.tabel_tim_penyusun) ? appState.documentTables.tabel_tim_penyusun : [];
        const headers = getActiveTemplateTableHeaders();
        const dataHeaders = headers.filter(h => h.toLowerCase() !== 'no');

        let textLines = [];
        tableRows.forEach((r, idx) => {
          let colsText = dataHeaders.map(h => `${h}: ${r[h] || r.nama || '-'}`).join(' | ');
          textLines.push(`${idx + 1}. ${colsText}`);
        });
        const tableFormattedText = textLines.join('\n');

        gasPayload.data = gasPayload.data || {};
        gasPayload.data.tabel_tim_penyusun = tableFormattedText;
        gasPayload.data.susunan_tim = tableFormattedText;
        gasPayload.data.tabel_daftar_hadir = tableFormattedText;
        gasPayload.data.tabel_kegiatan = tableFormattedText;
        gasPayload.tables = {};

        gasRes = await fetch(GAS_DIRECT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(gasPayload)
        });
        gasResult = await gasRes.json();
        console.log('✅ [Frontend Step 6c] Respon Direct GAS Text Fallback Diterima:', gasResult);
      }

      if (gasResult.success) {
        finalDocId = gasResult.document_id || gasResult.new_document_id;
      } else {
        throw new Error(gasResult.error || 'Gagal sinkron ke Google Apps Script.');
      }
    }

    if (finalDocId) {
      appState.lastGeneratedDocId = finalDocId;
      // Hapus state lokal setelah sinkronisasi berhasil untuk mencegah data bentrok
      clearStateFromLocalStorage(code, tahun);
      showToast(`✅ DUPLIKASI & SINKRON BERHASIL! Dokumen baru terisi (${finalDocId}) & ${syncedCount} Field diganti!`, 'success');
      console.log('📌 [Frontend Step 7] Merefresh Live Preview Iframe Google Docs ke Dokumen Salinan Baru:', finalDocId);
      
      renderIframePreview({ code: tpl.code, documentId: finalDocId, isReal: true });

      const idEl = document.getElementById('editDocGDocId');
      if (idEl) {
        idEl.textContent = `ID Salinan Terisi: ${finalDocId}`;
      }
    } else {
      throw new Error('Tidak menerima documentId baru.');
    }
  } catch (e) {
    console.error('❌ [Frontend Error] Gagal sinkronisasi:', e.message);
    showToast(`❌ Gagal sinkron ke Google Docs: ${e.message}`, 'error');
  } finally {
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.innerHTML = originalHtml;
    }
    console.log('--------------------------------------------------\n');
  }
}

function cetakPdfGoogleDrive() {
  const tpl = RKP_TEMPLATES.find(x => x.code === appState.activeDocCode) || { documentId: '' };
  const targetId = appState.lastGeneratedDocId || tpl.documentId;
  if (!targetId) {
    showToast('❌ Document ID belum dikonfigurasi.', 'error');
    return;
  }
  const pdfExportUrl = `https://docs.google.com/document/d/${targetId}/export?format=pdf`;
  window.open(pdfExportUrl, '_blank');
  showToast('📄 Mengunduh PDF hasil sinkronisasi dari Google Drive...', 'info');
}

function bukaGoogleDocsTabBaru() {
  const tpl = RKP_TEMPLATES.find(x => x.code === appState.activeDocCode) || { documentId: '' };
  const targetId = appState.lastGeneratedDocId || tpl.documentId;
  if (!targetId) {
    showToast('❌ Document ID belum dikonfigurasi.', 'error');
    return;
  }
  const editUrl = `https://docs.google.com/document/d/${targetId}/edit`;
  window.open(editUrl, '_blank');
}

function reloadIframePreview() {
  const tpl = RKP_TEMPLATES.find(x => x.code === appState.activeDocCode) || { code: appState.activeDocCode, documentId: '', isReal: false };
  const targetId = appState.lastGeneratedDocId || tpl.documentId;
  renderIframePreview({ ...tpl, documentId: targetId, isReal: !!targetId });
  showToast('🔄 Memuat ulang preview Google Docs...', 'info');
}

// 6. ROUTER & MODULE SWITCHER
function bukaModul(route) {
  appState.currentRoute = route;

  const btnTemplates = document.getElementById('tabnav-templates');
  const btnScan = document.getElementById('tabnav-scan');
  const btnEdit = document.getElementById('tabnav-edit');
  const btnSettings = document.getElementById('tabnav-settings');

  [btnTemplates, btnScan, btnEdit, btnSettings].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });

  const secTemplates = document.getElementById('modul-admin-templates');
  const secScan = document.getElementById('modul-scan-placeholder');
  const secEdit = document.getElementById('modul-dokumen-edit');
  const secSettings = document.getElementById('modul-pengaturan-template');

  [secTemplates, secScan, secEdit, secSettings].forEach(sec => {
    if (sec) sec.classList.add('hidden');
  });

  if (route.startsWith('/admin/templates/scan')) {
    if (btnScan) btnScan.classList.add('active');
    if (secScan) secScan.classList.remove('hidden');
  } else if (route.startsWith('/dokumen/') && route.endsWith('/edit')) {
    if (btnEdit) btnEdit.classList.add('active');
    if (secEdit) secEdit.classList.remove('hidden');
  } else if (route.startsWith('/admin/templates/settings')) {
    if (btnSettings) btnSettings.classList.add('active');
    if (secSettings) secSettings.classList.remove('hidden');
    muatPengaturanTemplate(appState.activeDocCode || 'DOC-02B');
  } else {
    if (btnTemplates) btnTemplates.classList.add('active');
    if (secTemplates) secTemplates.classList.remove('hidden');
    renderTemplatesTable();
  }
}

// ============================================
// PENGATURAN TEMPLATE (FIELDS & HEADER TABEL)
// ============================================

function bukaPengaturanTemplateUntukDokumenIni() {
  const code = appState.activeDocCode;
  if (!code) {
    showToast('⚠️ Kode dokumen aktif tidak ditemukan!', 'error');
    return;
  }
  
  // Pindah ke modul pengaturan, yang akan otomatis memanggil muatPengaturanTemplate
  bukaModul('/admin/templates/settings');
  
  // Secara eksplisit set dan muat data untuk template yang sedang diedit
  const select = document.getElementById('selectSettingTemplateCode');
  if (select) {
    select.value = code;
  }
  muatPengaturanTemplate(code);
  showToast(`⚙️ Membuka pengaturan untuk template ${code}...`, 'info');
}

function toggleOptionsInput(mode) {
  const type = document.getElementById(`${mode}FieldType`).value;
  const container = document.getElementById(`${mode}OptionsContainer`);
  if (container) {
    if (type === 'dropdown') {
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
  }
}

async function muatPengaturanTemplate(codeParam) {
  const code = codeParam || templateSettingsState.activeCode || 'DOC-02B';
  templateSettingsState.activeCode = code;

  const tpl = RKP_TEMPLATES.find(x => x.code === code);
  const select = document.getElementById('selectSettingTemplateCode');
  if (select) select.value = code;

  try {
    // 1. Fetch template field schema live from Supabase
    const res = await fetch(`${getApiBase()}/api/templates/${code}/all`);
    const data = await res.json();

    if (data.success) {
      if (tpl) {
        tpl.fields = data.fields || [];
        tpl.tableHeaders = data.tableHeaders || ['No', 'Nama', 'Tempat, Tanggal Lahir', 'Jabatan', 'Unsur'];
      }
      templateSettingsState.fields = data.fields || (tpl ? tpl.fields : []) || [];
      templateSettingsState.tableHeaders = data.tableHeaders || (tpl ? tpl.tableHeaders : []) || ['No', 'Nama', 'Tempat, Tanggal Lahir', 'Jabatan', 'Unsur'];
    }

    // Pulihkan status "gunakan tabel / tidak" yang disimpan di localStorage
    // (server tidak menyimpan kolom hasTable, jadi status disimpan di sisi klien).
    try {
      const savedHasTable = localStorage.getItem('docTemplateHasTable_' + code);
      if (savedHasTable !== null && tpl) {
        tpl.hasTable = savedHasTable === 'true';
      }
    } catch (e) {}

    // 2. Fetch live data values from Supabase dokumen_form_data
    const resData = await fetch(`${getApiBase()}/api/dokumen-form-data/${code}/${appState.activeTahun}`);
    const dbData = await resData.json();

    if (dbData.success && dbData.fields) {
      appState.documentFields = Object.assign({}, appState.documentFields, dbData.fields);
    }

    // 3. Update Raw JSON Viewer
    const preJson = document.getElementById('preSupabaseRawJson');
    if (preJson) {
      const rawPayload = {
        database: 'Supabase Cloud (PostgreSQL)',
        table_dokumen_form_data: {
          doc_code: code,
          tahun: appState.activeTahun,
          fields_values: dbData.fields || appState.documentFields,
          tables_values: dbData.tables || appState.documentTables,
          updated_at: dbData.updated_at || new Date().toISOString()
        },
        table_dokumen_templates: {
          code: code,
          fields_schema: templateSettingsState.fields,
          table_headers: templateSettingsState.tableHeaders
        }
      };
      preJson.textContent = JSON.stringify(rawPayload, null, 2);
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.warn(`[SIA OFFLINE] Gagal memuat pengaturan dari server untuk ${code}. Sistem akan berjalan dengan data lokal (ini normal jika backend tidak aktif). Error asli:`, e.message);
    } else {
      console.error('Gagal memuat pengaturan template:', e);
    }
    if (tpl) {
      templateSettingsState.fields = tpl.fields || [];
      templateSettingsState.tableHeaders = tpl.tableHeaders || ['No', 'Nama', 'Tempat, Tanggal Lahir', 'Jabatan', 'Unsur'];
    }
  }

  renderPengaturanTemplateUI();
}

function toggleSupabaseRawJsonViewer() {
  const container = document.getElementById('containerSupabaseRawJson');
  if (container) {
    container.classList.toggle('hidden');
  }
}

function renderPengaturanTemplateUI() {
  const tpl = RKP_TEMPLATES.find(x => x.code === templateSettingsState.activeCode);
  const previewHeadersRow = document.getElementById('previewTableHeadersRow');
  if (previewHeadersRow) {
    const headers = tpl?.tableHeaders || templateSettingsState.tableHeaders;
    previewHeadersRow.innerHTML = headers.map(h => `<th class="p-3 border">${h}</th>`).join('');
  }

  const tbody = document.getElementById('tbodyTemplateFields');
  const badgeCount = document.getElementById('badgeFieldCount');
  const fields = tpl?.fields || templateSettingsState.fields;

  if (badgeCount) badgeCount.textContent = `${fields.length} Fields`;

  if (tbody) {
    const headerContainer = document.getElementById('settingsHeaderActions');
    if (headerContainer) {
      headerContainer.innerHTML = `
        <button onclick="simpanKonfigurasiFieldPermanen()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow flex items-center gap-1.5 cursor-pointer"><i class="fas fa-save"></i> 💾 Simpan Isi Data ke Supabase</button>
        <button onclick="jalankanAutoScanPlaceholdersSettings()" class="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow flex items-center gap-1.5 cursor-pointer"><i class="fas fa-search"></i> Scan Ulang Placeholder</button>
        <button onclick="bukaModalTambahField()" class="bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow cursor-pointer">+ Tambah Field Baru</button>
      `;
    }
    if (fields.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">Belum ada field diset. Tekan "Tambah Field Baru" di atas.</td></tr>`;
    } else {
      tbody.innerHTML = fields.map((f, idx) => {
        const val = appState.documentFields[f.key] !== undefined ? appState.documentFields[f.key] : (appState.globalSharedFields[f.key] || MASTER_SHARED_DEFAULTS[f.key] || '');
        const currentType = (f.type || 'text').toLowerCase();
        return `
        <tr class="hover:bg-slate-50 transition">
          <td class="p-3.5 text-center font-bold text-slate-400">${idx + 1}</td>
          <td class="p-3.5 font-mono font-bold text-slate-900">
            <code class="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">{{${f.key}}}</code>
          </td>
          <td class="p-3.5 text-slate-800 font-bold">${f.label || f.key}</td>
          <td class="p-3.5">
            <input type="text" id="setting_val_${f.key}" oninput="updateSettingFieldValue('${f.key}', this.value)" value="${val}" class="w-full text-xs border border-emerald-300 bg-emerald-50/20 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-sm" placeholder="Isi data {{${f.key}}}..." />
          </td>
          <td class="p-3.5 text-center">
            <select onchange="updateSettingFieldType('${f.key}', this.value)" class="text-xs font-bold border border-slate-300 rounded-lg p-1.5 focus:outline-none focus:border-brand-500 bg-white cursor-pointer shadow-sm">
              <option value="text" ${currentType === 'text' ? 'selected' : ''}>TEXT</option>
              <option value="date" ${currentType === 'date' ? 'selected' : ''}>DATE</option>
              <option value="number" ${currentType === 'number' ? 'selected' : ''}>NUMBER</option>
              <option value="dropdown" ${currentType === 'dropdown' ? 'selected' : ''}>DROPDOWN</option>
              <option value="textarea" ${currentType === 'textarea' ? 'selected' : ''}>TEXTAREA</option>
            </select>
          </td>
          <td class="p-3.5 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="bukaModalEditField('${f.key}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2 py-1 rounded-lg border">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="hapusField('${f.key}')" class="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded-lg hover:bg-red-50">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      }).join('');
    }
  }
}

function updateSettingFieldValue(key, val) {
  appState.documentFields[key] = val;
  if (!appState.globalSharedFields) appState.globalSharedFields = {};
  appState.globalSharedFields[key] = val;
  try {
    localStorage.setItem('GLOBAL_SHARED_FIELDS', JSON.stringify(appState.globalSharedFields));
  } catch (e) {}
  triggerDebouncedSupabaseSave();
}

async function updateSettingFieldType(key, typeVal) {
  const code = templateSettingsState.activeCode || appState.activeDocCode || 'DOC-02B';
  const tpl = RKP_TEMPLATES.find(x => x.code === code);
  if (tpl && tpl.fields) {
    const item = tpl.fields.find(f => f.key === key);
    if (item) item.type = typeVal;
  }
  if (templateSettingsState.fields) {
    const settingsItem = templateSettingsState.fields.find(f => f.key === key);
    if (settingsItem) settingsItem.type = typeVal;
  }

  // 1. Simpan tipe field baru ke Supabase database secara otomatis
  try {
    await simpanSemuaPerubahanPengaturan();
    showToast(`✅ Tipe field {{${key}}} diubah ke '${typeVal.toUpperCase()}' & disimpan ke Supabase!`, 'success');
  } catch (e) {
    console.warn('Gagal menyimpan tipe field ke Supabase:', e);
  }

  // 2. Langsung sinkronkan dan update tampilan Form & Preview di layar
  if (tpl) {
    await renderDynamicFormFields(tpl);
  }
}

async function scanDanMuatUlangPengaturan(codeOverride, silent = false) {
  const code = codeOverride || templateSettingsState.activeCode;
  const tpl = RKP_TEMPLATES.find(x => x.code === code);
  if (!tpl) {
    if (!silent) showToast(`❌ Template dengan kode ${code} tidak ditemukan.`, 'error');
    return;
  }

  if (!silent) showToast(`🔄 Memindai placeholder dari Google Docs untuk ${code}...`, 'info');

  try {
    const res = await fetch(`${getApiBase()}/api/scan-placeholders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ google_docs_id: tpl.documentId, doc_code: code })
    });
    const result = await res.json();

    if (result.success && result.fields) {
      const tplToUpdate = RKP_TEMPLATES.find(x => x.code === code);
      const scannedFields = result.fields;
      const existingFields = (tplToUpdate && tplToUpdate.fields) ? tplToUpdate.fields.slice() : [];
      const existingKeys = new Map(existingFields.map(f => [f.key, f]));

      // Merge hasil scan dengan fields existing:
      // - Field yang SUDAH ADA (key sama) dipertahankan apa adanya
      //   (jangan timpa type/label yang sudah diedit manual di pengaturan).
      // - Hanya field BARU yang ditemukan scan yang ditambahkan,
      //   dengan type diset "text" (bisa diedit lagi lewat modal Edit).
      const mergedFields = [];
      const seen = new Set();
      scannedFields.forEach(sf => {
        const key = sf.key;
        if (seen.has(key)) return;
        seen.add(key);
        if (existingKeys.has(key)) {
          mergedFields.push(existingKeys.get(key));
        } else {
          mergedFields.push({ key: sf.key, label: sf.label || sf.key, type: sf.type || 'text' });
        }
      });

      // INFO: Fields that are no longer in the Google Doc will be removed.
      // The new list of fields is now exactly what was scanned, preserving old config for matching keys.

      if (tplToUpdate) {
        tplToUpdate.fields = mergedFields;
      }
      templateSettingsState.fields = mergedFields; // update state juga

      await simpanSemuaPerubahanPengaturan(); // Simpan semua perubahan ke backend
      if (!silent) renderPengaturanTemplateUI();

      // Sinkronkan form yg sedang terbuka di halaman edit agar ikut update.
      if (appState.activeDocCode === code && !document.getElementById('modul-dokumen-edit').classList.contains('hidden')) {
        renderDynamicFormFields(tplToUpdate || tpl);
      }

      if (result.usedDefault) {
        const sebab = result.gasError || 'GAS/Google Docs tidak merespons';
        showToast(`⚠️ GAS tidak menarik placeholder. Memakai daftar default (${mergedFields.length} field). Cek GAS & Document ID. (${sebab})`, 'error');
      } else {
        showToast(`✅ Scan berhasil! Ditemukan ${scannedFields.length} field dari Google Docs.`, 'success');
      }
    } else {
      if (!silent) showToast(`⚠️ Gagal memindai atau tidak ada field ditemukan: ${result.message || 'Respon tidak valid'}`, 'error');
    }
  } catch (e) {
    console.error('❌ Error saat scan & muat ulang pengaturan:', e);
    if (!silent) showToast(`❌ Terjadi error saat memindai: ${e.message}`, 'error');
  }
}

async function bukaModalScanPlaceholdersForm() {
  const code = appState.activeDocCode || 'DOC-02B';
  showToast(`🔍 Memindai tag placeholder {{...}} baru dari Google Docs...`, 'info');
  try {
    await scanDanMuatUlangPengaturan(code, false);
    const tpl = RKP_TEMPLATES.find(x => x.code === code);
    if (tpl) {
      await renderDynamicFormFields(tpl);
    }
    showToast(`✅ Placeholder Google Docs berhasil dipindai & ditambahkan otomatis ke Form & Live Preview!`, 'success');
  } catch (e) {
    showToast(`❌ Gagal memindai placeholder: ${e.message}`, 'error');
  }
}

function renderModalHeaderColsUI(headers) {
  const container = document.getElementById('modalHeaderColsList');
  if (!container) return;

  const dataCols = (Array.isArray(headers) && headers.length > 0) 
    ? headers 
    : ['No', 'Nama', 'Tempat, Tanggal Lahir', 'Jabatan', 'Unsur'];

  let html = '';
  dataCols.forEach((h, idx) => {
    const isNo = (idx === 0 && h.toLowerCase() === 'no');
    html += `
      <div class="flex items-center gap-2 header-col-item">
        <span class="w-20 text-xs font-bold text-slate-600 shrink-0">Kolom ${idx + 1} ${isNo ? '(No)' : ''}</span>
        <input type="text" class="input-header-col-val form-input text-xs font-semibold flex-1" value="${h.replace(/"/g, '&quot;')}" placeholder="Nama Header Kolom ${idx + 1}..." />
        ${idx > 0 ? `<button onclick="hapusKolomHeaderDynamic(this)" class="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center font-bold transition shrink-0">&times;</button>` : `<span class="w-8"></span>`}
      </div>
    `;
  });

  container.innerHTML = html;
}

function tambahKolomHeaderDynamic() {
  const container = document.getElementById('modalHeaderColsList');
  if (!container) return;

  const currentCount = container.querySelectorAll('.header-col-item').length + 1;
  const div = document.createElement('div');
  div.className = 'flex items-center gap-2 header-col-item';
  div.innerHTML = `
    <span class="w-20 text-xs font-bold text-slate-600 shrink-0">Kolom ${currentCount}</span>
    <input type="text" class="input-header-col-val form-input text-xs font-semibold flex-1" value="" placeholder="Nama Header Kolom ${currentCount}..." />
    <button onclick="hapusKolomHeaderDynamic(this)" class="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center font-bold transition shrink-0">&times;</button>
  `;
  container.appendChild(div);
}

function hapusKolomHeaderDynamic(btn) {
  const item = btn.closest('.header-col-item');
  if (item) item.remove();
}

function bukaModalEditTableHeader() {
  const code = templateSettingsState.activeCode || appState.activeDocCode || 'DOC-02B';
  const tpl = RKP_TEMPLATES.find(x => x.code === code);
  const headers = tpl?.tableHeaders || templateSettingsState.tableHeaders || ['No', 'Nama', 'Tempat, Tanggal Lahir', 'Jabatan', 'Unsur'];

  const selectHasTable = document.getElementById('selectModalHasTable');
  if (selectHasTable) {
    const usesTable = tpl?.hasTable === undefined
      ? (Array.isArray(headers) && headers.length > 0)
      : tpl.hasTable === true;
    selectHasTable.value = usesTable ? 'true' : 'false';
  }

  renderModalHeaderColsUI(headers);

  const modal = document.getElementById('modalEditTableHeader');
  if (modal) modal.classList.remove('hidden');
}

function tutupModalEditTableHeader() {
  const modal = document.getElementById('modalEditTableHeader');
  if (modal) modal.classList.add('hidden');
}

async function simpanHeaderTabel() {
  const container = document.getElementById('modalHeaderColsList');
  const newHeaders = [];
  if (container) {
    container.querySelectorAll('.input-header-col-val').forEach(inp => {
      const val = inp.value.trim();
      if (val) newHeaders.push(val);
    });
  }

  const selectHasTable = document.getElementById('selectModalHasTable');
  const hasTable = selectHasTable ? (selectHasTable.value === 'true') : (newHeaders.length > 0);

  if (hasTable && newHeaders.length === 0) {
    showToast('⚠️ Masukkan minimal 1 header kolom jika tabel diaktifkan!', 'error');
    return;
  }

  const code = templateSettingsState.activeCode || appState.activeDocCode || 'DOC-02B';
  const tpl = RKP_TEMPLATES.find(x => x.code === code);
  if (tpl) {
    tpl.tableHeaders = newHeaders;
    tpl.hasTable = hasTable;
  }
  templateSettingsState.tableHeaders = newHeaders;

  // Persist status tabel di localStorage (server tidak menyimpan kolom hasTable)
  try {
    localStorage.setItem('docTemplateHasTable_' + code, hasTable ? 'true' : 'false');
  } catch (e) {}

  try {
    const res = await fetch(`${getApiBase()}/api/templates/${code}/all`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: tpl?.fields || [], tableHeaders: newHeaders, hasTable: hasTable })
    });
    const result = await res.json();
    if (result.success) {
      renderPengaturanTemplateUI();
      tutupModalEditTableHeader();

      // Refresh form edit view if currently on the active document
      if (appState.activeDocCode === code) {
        bukaDokumenEdit(code);
      }

      showToast(`🎉 Pengaturan tabel template ${code} berhasil diperbarui di Supabase!`, 'success');
    } else {
      showToast(`❌ Gagal: ${result.message || 'Unknown error'}`, 'error');
    }
  } catch (e) {
    showToast(`❌ Error: ${e.message}`, 'error');
  }
}

function bukaModalTambahField() {
  const keyInput = document.getElementById('tambahFieldKey');
  const labelInput = document.getElementById('tambahFieldLabel');
  const typeInput = document.getElementById('tambahFieldType');
  if (keyInput) keyInput.value = '';
  if (labelInput) labelInput.value = '';
  if (typeInput) typeInput.value = 'text';
  toggleOptionsInput('tambah');
  const modal = document.getElementById('modalTambahField');
  if (modal) modal.classList.remove('hidden');
}

function tutupModalTambahField() {
  const modal = document.getElementById('modalTambahField');
  if (modal) modal.classList.add('hidden');
}

async function simpanTambahFieldBaru() {
  const key = document.getElementById('tambahFieldKey')?.value?.trim();
  const label = document.getElementById('tambahFieldLabel')?.value?.trim();
  const type = document.getElementById('tambahFieldType')?.value || 'text';

  if (!key) {
    showToast('⚠️ Key field placeholder wajib diisi!', 'error');
    return;
  }

  const code = templateSettingsState.activeCode || 'DOC-02B';
  const tpl = RKP_TEMPLATES.find(x => x.code === code);
  const optionsRaw = document.getElementById('tambahFieldOptions')?.value || '';
  const newField = {
    key,
    label: label || key,
    type,
    options: optionsRaw.split(',').map(s => s.trim()).filter(Boolean)
  };
  if (tpl) {
    if (!tpl.fields) tpl.fields = [];
    tpl.fields.push(newField);
  }

  try {
    await simpanSemuaPerubahanPengaturan();
    renderPengaturanTemplateUI();
    tutupModalTambahField();
    showToast(`✨ Field '${key}' berhasil ditambahkan!`, 'success');
  } catch (e) {
    showToast(`❌ Gagal menambah field: ${e.message}`, 'error');
  }
}

function bukaModalEditField(key) {
  const tpl = RKP_TEMPLATES.find(x => x.code === templateSettingsState.activeCode);
  const fields = tpl?.fields || templateSettingsState.fields;
  const f = fields.find(x => x.key === key);
  if (!f) return;

  const keyInput = document.getElementById('editFieldKey');
  const labelInput = document.getElementById('editFieldLabel');
  const typeInput = document.getElementById('editFieldType');
  const origHidden = document.getElementById('editOriginalKey');

  if (keyInput) keyInput.value = f.key;
  if (labelInput) labelInput.value = f.label || f.key;
  if (typeInput) typeInput.value = f.type || 'text';
  if (origHidden) origHidden.value = f.key;

  const optionsInput = document.getElementById('editFieldOptions');
  if (optionsInput) optionsInput.value = Array.isArray(f.options) ? f.options.join(', ') : '';

  toggleOptionsInput('edit');

  const modal = document.getElementById('modalEditField');
  if (modal) modal.classList.remove('hidden');
}

function tutupModalEditField() {
  const modal = document.getElementById('modalEditField');
  if (modal) modal.classList.add('hidden');
}

async function simpanPerubahanField(event, silent = false) {
  const originalKey = document.getElementById('editOriginalKey')?.value;
  const label = document.getElementById('editFieldLabel')?.value?.trim();
  const type = document.getElementById('editFieldType')?.value || 'text';

  if (!originalKey) {
    showToast('⚠️ Key field tidak boleh kosong!', 'error');
    return;
  }

  const tpl = RKP_TEMPLATES.find(x => x.code === templateSettingsState.activeCode);
  const fields = tpl?.fields || templateSettingsState.fields;
  const target = fields.find(x => x.key === originalKey);

  if (target) {
    target.label = label || originalKey;
    target.type = type;
    const optionsRaw = document.getElementById('editFieldOptions')?.value || '';
    target.options = optionsRaw.split(',').map(s => s.trim()).filter(Boolean);
  }

  const code = templateSettingsState.activeCode || 'DOC-02B';
  try {
    await simpanSemuaPerubahanPengaturan();
    renderPengaturanTemplateUI();
    if (!silent) {
      tutupModalEditField();
      showToast(`✅ Perubahan field '${originalKey}' berhasil disimpan!`, 'success');
    }
  } catch (e) {
    if (!silent) showToast(`❌ Error: ${e.message}`, 'error');
  }
}

async function simpanKonfigurasiFieldPermanen() {
  const code = templateSettingsState.activeCode || 'DOC-02B';
  const tpl = RKP_TEMPLATES.find(x => x.code === code);
  if (!tpl) {
    showToast(`❌ Template ${code} tidak ditemukan.`, 'error');
    return;
  }
  try {
    await simpanSemuaPerubahanPengaturan();
    renderPengaturanTemplateUI();
    if (appState.activeDocCode === code) {
      await renderDynamicFormFields(tpl);
    }
    showToast(`✅ Konfigurasi field template ${code} berhasil disimpan ke Supabase & disinkronkan ke Form!`, 'success');
  } catch (e) {
    showToast(`❌ Gagal menyimpan konfigurasi field: ${e.message}`, 'error');
  }
}

function bersihkanFieldKadaluarsa() {
  const code = templateSettingsState.activeCode || 'DOC-02B';
  const tpl = RKP_TEMPLATES.find(x => x.code === code);
  if (!tpl || !tpl.fields) {
    showToast('⚠️ Tidak ada field untuk dibersihkan.', 'info');
    return;
  }
  const sebelum = tpl.fields.length;
  tpl.fields = tpl.fields.filter(f => {
    const k = String(f.key || '');
    return !k.startsWith('field_baru_') && k !== '';
  });
  const sesudah = tpl.fields.length;
  if (sesudah === sebelum) {
    showToast('ℹ️ Tidak ada field kadaluarsa untuk dibersihkan.', 'info');
    return;
  }
  simpanSemuaPerubahanPengaturan()
    .then(() => {
      renderPengaturanTemplateUI();
      showToast(`🧹 ${sebelum - sesudah} field kadaluarsa dibersihkan.`, 'success');
    })
    .catch(e => showToast(`❌ Gagal membersihkan: ${e.message}`, 'error'));
}

async function simpanSemuaPerubahanPengaturan() {
  const code = templateSettingsState.activeCode;
  const tpl = RKP_TEMPLATES.find(x => x.code === code);
  if (!tpl) return;

  try {
    const res = await fetch(`${getApiBase()}/api/templates/${code}/all`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: tpl.fields || [], tableHeaders: tpl.tableHeaders || [] })
    });
    if (!res.ok) throw new Error('Gagal menyimpan ke server');

    // Also persist data values to Supabase dokumen_form_data
    const docId = tpl.documentId || DEFAULT_MASTER_DOC_ID;
    await fetch(`${getApiBase()}/api/sync-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        google_docs_id: docId,
        doc_code: code,
        tahun: appState.activeTahun,
        fields: appState.documentFields,
        tables: appState.documentTables
      })
    });
  } catch (e) {
    console.error('Gagal simpan semua perubahan pengaturan:', e);
    throw e;
  }
}

async function hapusField(key) {
  if (!confirm(`Apakah Anda yakin ingin menghapus field {{${key}}}?`)) return;

  const code = templateSettingsState.activeCode || 'DOC-02B';
  const tpl = RKP_TEMPLATES.find(x => x.code === code);
  if (tpl) {
    tpl.fields = (tpl.fields || []).filter(x => x.key !== key);
  }

  try {
    await simpanSemuaPerubahanPengaturan();
    renderPengaturanTemplateUI();
    showToast(`🗑️ Field '${key}' telah dihapus.`, 'info');
  } catch (e) {
    showToast(`❌ Gagal menghapus field: ${e.message}`, 'error');
  }
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = msg;
  toast.className = `fixed bottom-6 right-6 px-6 py-3 rounded-xl text-white font-bold shadow-2xl z-50 transition-all duration-300 ${type === 'error' ? 'bg-red-600' : type === 'info' ? 'bg-blue-600' : 'bg-emerald-600'}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ============================================================
// CRUD FUNCTIONS
// ============================================================

// Wrapper function to fix the ReferenceError from the HTML file.
function jalankanAutoScanPlaceholdersSettings() {
  scanDanMuatUlangPengaturan(null, false);
}

// Kickstart the application
document.addEventListener('DOMContentLoaded', initApp);

// EXPORT TO WINDOW SCOPE
window.bukaModul = bukaModul;
window.bukaDokumenEdit = bukaDokumenEdit;
window.bukaHalamanScan = bukaHalamanScan;
window.bukaModalEditTemplate = bukaModalEditTemplate;
window.bukaModalEditTemplateId = bukaModalEditTemplateId;
window.tutupModalEditTemplate = tutupModalEditTemplate;
window.tutupModalEditTemplateId = tutupModalEditTemplateId;
window.simpanEditTemplateId = simpanEditTemplateId;
window.tambahFieldBaru = tambahFieldBaru;
window.tambahKolomHeader = tambahKolomHeader;
window.bukaModalScanPlaceholdersForm = bukaModalScanPlaceholdersForm;
window.simpanDanTerapkanGlobalFieldsSemuaDokumen = simpanDanTerapkanGlobalFieldsSemuaDokumen;

// Dropdown utility functions
function toggleDropdown(id) {
  const dropdown = document.getElementById(id);
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

// Close dropdowns if clicked outside
window.addEventListener('click', function(event) {
  // Check if the clicked element is not a dropdown toggle button
  const dropdownButtons = document.querySelectorAll('[onclick^="toggleDropdown"]');
  let isDropdownButton = false;
  for (let i = 0; i < dropdownButtons.length; i++) {
    if (dropdownButtons[i].contains(event.target)) {
      isDropdownButton = true;
      break;
    }
  }

  if (!isDropdownButton) {
    const dropdowns = document.getElementsByClassName('origin-top-right');
    for (let i = 0; i < dropdowns.length; i++) {
      const openDropdown = dropdowns[i];
      if (!openDropdown.classList.contains('hidden')) {
        openDropdown.classList.add('hidden');
      }
    }
  }
});

// EXPORT TO WINDOW SCOPE (continued)
window.toggleDropdown = toggleDropdown;