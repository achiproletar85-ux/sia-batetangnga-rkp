// ============================================
// DASHBOARD OVERVIEW EXECUTIVE JS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardMetrics();
});

async function loadDashboardMetrics() {
    try {
        const tahun = 2027;
        console.log('📊 Loading dashboard metrics for tahun', tahun);
        
        // 1. RPJMDes Master
        try {
            const rpjmRes = await fetch('/api/master');
            if (rpjmRes.ok) {
                const rpjmData = await rpjmRes.json();
                if (rpjmData.success && Array.isArray(rpjmData.data)) {
                    const masterList = rpjmData.data;
                    const totalPagu = masterList.reduce((sum, item) => sum + Number(item.pagu_rpjm || item.pagu || 0), 0);
                    
                    if (document.getElementById('stat-rpjmdes-pagu')) {
                        document.getElementById('stat-rpjmdes-pagu').innerText = `Rp ${totalPagu.toLocaleString('id-ID')}`;
                    }
                    if (document.getElementById('stat-rpjmdes-count')) {
                        document.getElementById('stat-rpjmdes-count').innerText = `${masterList.length} Kegiatan Master`;
                    }

                    calculateBidangDistribution(masterList, totalPagu);
                }
            }
        } catch (e) {
            console.warn('⚠️ RPJMDes API error:', e.message);
        }

        // 2. RKPDes
        try {
            const rkpRes = await fetch(`/api/rkpdes?tahun=${tahun}`);
            if (rkpRes.ok) {
                const rkpData = await rkpRes.json();
                console.log('✅ RKPDes data:', rkpData.data?.length || 0);
                if (rkpData.success && Array.isArray(rkpData.data)) {
                    const rkpList = rkpData.data;
                    const totalRkpPagu = rkpList.reduce((sum, item) => sum + Number(item.jumlah || item.biaya || item.pagu || 0), 0);

                    if (document.getElementById('stat-rkpdes-total')) {
                        document.getElementById('stat-rkpdes-total').innerText = `Rp ${totalRkpPagu.toLocaleString('id-ID')}`;
                    }
                    if (document.getElementById('stat-rkpdes-count')) {
                        document.getElementById('stat-rkpdes-count').innerText = `${rkpList.length} Kegiatan Disetujui`;
                    }
                }
            } else {
                console.warn('⚠️ RKPDes API tidak tersedia (status:', rkpRes.status, ')');
            }
        } catch (e) {
            console.warn('⚠️ RKPDes API error:', e.message);
        }
        
        // 3. RAB
        try {
            const rabRes = await fetch(`/api/rab?tahun=${tahun}`);
            if (rabRes.ok) {
                const rabData = await rabRes.json();
                console.log('✅ RAB data:', rabData.data?.length || 0);
                if (rabData.success && Array.isArray(rabData.data)) {
                    const rabList = rabData.data;
                    const totalRabPagu = rabList.reduce((sum, item) => sum + Number(item.jumlah_anggaran || item.total_anggaran || item.pagu || 0), 0);

                    if (document.getElementById('stat-rab-total')) {
                        document.getElementById('stat-rab-total').innerText = `Rp ${totalRabPagu.toLocaleString('id-ID')}`;
                    }
                    if (document.getElementById('stat-rab-count')) {
                        document.getElementById('stat-rab-count').innerText = `${rabList.length} Proposal RAB`;
                    }
                }
            } else {
                console.warn('⚠️ RAB API tidak tersedia (status:', rabRes.status, ')');
            }
        } catch (e) {
            console.warn('⚠️ RAB API error:', e.message);
        }
        
        // 4. DU-RKP
        try {
            const duRes = await fetch(`/api/du-rkpdes?tahun=${tahun}`);
            if (duRes.ok) {
                const duData = await duRes.json();
                console.log('✅ DU-RKP data:', duData.data?.length || 0);
            }
        } catch (e) {
            console.warn('⚠️ DU-RKP API error:', e.message);
        }

        // 5. Stunting Summary
        try {
            const stuntingRes = await fetch(`/api/stunting?tahun=${tahun}`);
            if (stuntingRes.ok) {
                const stuntingData = await stuntingRes.json();
                if (stuntingData.success && Array.isArray(stuntingData.data)) {
                    const stuntingList = stuntingData.data;
                    const totalStuntingPagu = stuntingList.reduce((sum, item) => sum + Number(item.biaya || item.anggaran || 0), 0);

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

function calculateBidangDistribution(items, totalPagu) {
    if (!items || items.length === 0 || totalPagu === 0) return;

    const b = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    items.forEach(item => {
        const bidangStr = (item.bidang || '').toLowerCase();
        const pagu = Number(item.pagu_rpjm || item.pagu || 0);

        if (bidangStr.includes('pemerintahan')) b[1] += pagu;
        else if (bidangStr.includes('pembangunan')) b[2] += pagu;
        else if (bidangStr.includes('pembinaan') || bidangStr.includes('kemasyarakatan')) b[3] += pagu;
        else if (bidangStr.includes('pemberdayaan')) b[4] += pagu;
        else b[5] += pagu;
    });

    for (let i = 1; i <= 5; i++) {
        const val = b[i];
        const pct = Math.round((val / totalPagu) * 100) || 5;

        const labelEl = document.getElementById(`label-bidang-${i}`);
        const barEl = document.getElementById(`bar-bidang-${i}`);

        if (labelEl) labelEl.innerText = `Rp ${val.toLocaleString('id-ID')} (${pct}%)`;
        if (barEl) barEl.style.width = `${Math.max(pct, 4)}%`;
    }
}
