let usulanList = [];

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `fixed bottom-6 right-6 px-6 py-3 rounded-2xl text-white font-bold shadow-xl z-50 ${type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

const API_USULAN = '/api/usulan';

window.addEventListener('tahunChanged', (e) => {
    if (e && e.detail && e.detail.tahun) {
        if (typeof loadUsulanData === 'function') loadUsulanData();
    }
});

async function loadUsulanData() {
    const year = localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || document.getElementById('select-year')?.value || '2027';
    try {
        const res = await fetch(`${API_USULAN}?tahun=${year}`);
        const json = await res.json();
        usulanList = Array.isArray(json.data) ? json.data : [];
    } catch (error) {
        console.warn('Gagal memuat usulan dari server', error);
        usulanList = [];
    }
    renderTable();
}

function displayName(item) {
    return item.kegiatan || item.nama_kegiatan || '-';
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    if (usulanList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-400">📭 Belum ada data usulan prioritas.</td></tr>';
        return;
    }

    tbody.innerHTML = usulanList.map((item, idx) => `
        <tr>
            <td class="font-semibold text-slate-500 text-center">${idx + 1}</td>
            <td class="font-bold text-slate-800">${displayName(item)}</td>
            <td class="text-slate-600">${item.lokasi || '-'}</td>
            <td class="text-slate-600">${item.volume || '-'}</td>
            <td class="font-bold text-emerald-600">Rp ${(Number(item.biaya) || 0).toLocaleString('id-ID')}</td>
            <td class="text-slate-600">${item.sasaran || '-'}</td>
            <td class="text-center">
                <button onclick="hapusUsulan('${item.id}')" class="px-2.5 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-bold">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function tambahUsulan() {
    const kegiatan = document.getElementById('input-kegiatan')?.value.trim();
    const lokasi = document.getElementById('input-lokasi')?.value.trim();
    const biaya = parseFloat(document.getElementById('input-biaya')?.value) || 0;
    const volume = document.getElementById('input-volume')?.value.trim();
    const sasaran = document.getElementById('input-sasaran')?.value.trim();
    const pengusul = document.getElementById('input-pengusul')?.value.trim();

    if (!kegiatan) {
        showToast('⚠️ Nama kegiatan usulan wajib diisi!', 'error');
        return;
    }

    const year = document.getElementById('select-year')?.value || '2027';

    try {
        const res = await fetch(API_USULAN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kegiatan, lokasi, biaya, volume, sasaran, pengusul, tahun: year })
        });
        const json = await res.json();
        if (json.success) {
            showToast('✅ Usulan berhasil ditambahkan ke database!', 'success');
        } else {
            showToast(json.message || 'Gagal menyimpan usulan', 'error');
        }
    } catch (error) {
        console.error('Error tambahUsulan:', error);
        showToast('Gagal menyimpan usulan ke server', 'error');
    }

    document.getElementById('input-kegiatan').value = '';
    document.getElementById('input-lokasi').value = '';
    document.getElementById('input-biaya').value = '';
    document.getElementById('input-volume').value = '';
    document.getElementById('input-sasaran').value = '';
    document.getElementById('input-pengusul').value = '';
    await loadUsulanData();
}

async function hapusUsulan(id) {
    if (!confirm('Hapus usulan ini?')) return;
    try {
        const res = await fetch(`${API_USULAN}/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showToast('✅ Usulan dihapus!', 'success');
        } else {
            showToast(json.message || 'Gagal menghapus usulan', 'error');
        }
    } catch (error) {
        console.error('Error hapusUsulan:', error);
        showToast('Gagal menghapus usulan dari server', 'error');
    }
    await loadUsulanData();
}

document.addEventListener('DOMContentLoaded', loadUsulanData);