// ============================================
// DASHBOARD OVERVIEW EXECUTIVE JS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const storedYear = localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || '2027';
    const selectDashEl = document.getElementById('selectDashboardTahun');
    if (selectDashEl) selectDashEl.value = storedYear;

    loadDashboardMetrics();
    window.addEventListener('tahunChanged', (e) => {
        if (e && e.detail && e.detail.tahun) {
            if (selectDashEl) selectDashEl.value = e.detail.tahun;
        }
        loadDashboardMetrics();
    });
});

function cleanBudgetNumber(val) {
    let num = Number(val || 0);
    if (isNaN(num) || num <= 0) return 0;
    // Jika angka melebihi 10 Miliar (inflasi input akibat pemformatan awal), bagi 1.000 agar masuk akal per desa
    while (num > 10000000000) {
        num = Math.round(num / 1000);
    }
    return num;
}

function getItemBudget(item) {
    if (!item) return 0;
    const raw = item.prakiraan_biaya ?? item.pagu_rpjm ?? item.total_rab ?? item.jumlah_anggaran ?? item.total_anggaran ?? item.biaya ?? item.jumlah ?? item.pagu ?? item.nominal ?? 0;
    return cleanBudgetNumber(raw);
}

async function loadDashboardMetrics() {
    try {
        const tahun = localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || 2027;
        console.log('📊 Loading dashboard metrics for tahun', tahun);
        
        let activeYearItems = [];

        // 1. Fetch RKPDes Data untuk Tahun Terpilih
        try {
            const rkpRes = await fetch(`/api/rkpdes?tahun=${tahun}`);
            if (rkpRes.ok) {
                const rkpData = await rkpRes.json();
                if (rkpData.success && Array.isArray(rkpData.data)) {
                    const rkpList = rkpData.data;
                    activeYearItems = rkpList;
                    const totalRkpPagu = rkpList.reduce((sum, item) => sum + getItemBudget(item), 0);

                    if (document.getElementById('stat-rkpdes-total')) {
                        document.getElementById('stat-rkpdes-total').innerText = `Rp ${totalRkpPagu.toLocaleString('id-ID')}`;
                    }
                    if (document.getElementById('stat-rkpdes-count')) {
                        document.getElementById('stat-rkpdes-count').innerText = `${rkpList.length} Kegiatan Disetujui`;
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ RKPDes API error:', e.message);
        }

        // 2. Fetch RAB Data untuk Tahun Terpilih
        try {
            const rabRes = await fetch(`/api/rab?tahun=${tahun}`);
            if (rabRes.ok) {
                const rabData = await rabRes.json();
                if (rabData.success && Array.isArray(rabData.data)) {
                    const rabList = rabData.data;
                    if (activeYearItems.length === 0) activeYearItems = rabList;
                    const totalRabPagu = rabList.reduce((sum, item) => sum + getItemBudget(item), 0);

                    if (document.getElementById('stat-rab-total')) {
                        document.getElementById('stat-rab-total').innerText = `Rp ${totalRabPagu.toLocaleString('id-ID')}`;
                    }
                    if (document.getElementById('stat-rab-count')) {
                        document.getElementById('stat-rab-count').innerText = `${rabList.length} Proposal RAB`;
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ RAB API error:', e.message);
        }

        // 3. Fallback ke DU-RKPDes / Master jika belum ada RKP/RAB
        if (activeYearItems.length === 0) {
            try {
                const duRes = await fetch(`/api/du-rkpdes?tahun=${tahun}`);
                if (duRes.ok) {
                    const duData = await duRes.json();
                    if (duData.success && Array.isArray(duData.data) && duData.data.length > 0) {
                        activeYearItems = duData.data;
                    }
                }
            } catch (e) {
                console.warn('⚠️ DU-RKP API error:', e.message);
            }
        }

        // Hitung Distribusi 5 Bidang APBDes untuk Tahun Terpilih
        calculateBidangDistribution(activeYearItems);

        // 4. RPJMDes Master Stat
        try {
            const rpjmRes = await fetch('/api/master');
            if (rpjmRes.ok) {
                const rpjmData = await rpjmRes.json();
                if (rpjmData.success && Array.isArray(rpjmData.data)) {
                    const masterList = rpjmData.data;
                    const totalPagu = masterList.reduce((sum, item) => sum + getItemBudget(item), 0);
                    
                    if (document.getElementById('stat-rpjmdes-pagu')) {
                        document.getElementById('stat-rpjmdes-pagu').innerText = `Rp ${totalPagu.toLocaleString('id-ID')}`;
                    }
                    if (document.getElementById('stat-rpjmdes-count')) {
                        document.getElementById('stat-rpjmdes-count').innerText = `${masterList.length} Kegiatan Master`;
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ RPJMDes API error:', e.message);
        }

        // 5. Stunting Summary
        try {
            const stuntingRes = await fetch(`/api/stunting?tahun=${tahun}`);
            if (stuntingRes.ok) {
                const stuntingData = await stuntingRes.json();
                if (stuntingData.success && Array.isArray(stuntingData.data)) {
                    const stuntingList = stuntingData.data;
                    const totalStuntingPagu = stuntingList.reduce((sum, item) => sum + getItemBudget(item), 0);

                    if (document.getElementById('stat-stunting-total')) {
                        document.getElementById('stat-stunting-total').innerText = `Rp ${totalStuntingPagu.toLocaleString('id-ID')}`;
                    }
                    if (document.getElementById('stat-stunting-count')) {
                        document.getElementById('stat-stunting-count').innerText = `${stuntingList.length} Program Prioritas`;
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ Stunting API error:', e.message);
        }
        
    } catch (error) {
        console.error('❌ Error loading dashboard:', error);
    }
}

function calculateBidangDistribution(items) {
    if (!items || !Array.isArray(items) || items.length === 0) return;

    const b = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let grandTotal = 0;

    items.forEach(item => {
        const bName = String(item.bidang || item.jenis_bidang || item.sub_bidang || '').toLowerCase();
        const pagu = getItemBudget(item);
        if (pagu <= 0) return;

        let category = 1;
        if (bName.includes('pembangunan')) category = 2;
        else if (bName.includes('pembinaan') || bName.includes('kemasyarakatan')) category = 3;
        else if (bName.includes('pemberdayaan')) category = 4;
        else if (bName.includes('bencana') || bName.includes('darurat') || bName.includes('mendesak')) category = 5;
        else if (bName.includes('pemerintahan')) category = 1;
        else category = (parseInt(item.bidang, 10) >= 1 && parseInt(item.bidang, 10) <= 5) ? parseInt(item.bidang, 10) : 1;

        b[category] += pagu;
        grandTotal += pagu;
    });

    if (grandTotal === 0) grandTotal = 1;

    for (let i = 1; i <= 5; i++) {
        const val = b[i];
        const pct = Math.round((val / grandTotal) * 100);

        const labelEl = document.getElementById(`label-bidang-${i}`);
        const barEl = document.getElementById(`bar-bidang-${i}`);

        if (labelEl) labelEl.innerText = `Rp ${val.toLocaleString('id-ID')} (${pct}%)`;
        if (barEl) barEl.style.width = `${Math.max(pct, 2)}%`;
    }
}
