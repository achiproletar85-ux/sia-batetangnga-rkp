// ============================================
// GLOBAL TAHUN ANGGARAN MASTER CONTROL & SYNCHRONIZER
// Loaded synchronously in <head> for 100% instant reliability
// ============================================

(function() {
    // 1. Get Master Active Year (default 2027)
    window.getGlobalActiveTahun = function() {
        return localStorage.getItem('ACTIVE_TAHUN_ANGGARAN') || '2027';
    };

    // 2. Set Master Active Year and broadcast to all tabs
    window.setGlobalActiveTahun = function(tahunVal) {
        if (!tahunVal) return;
        var t = String(tahunVal).trim();
        localStorage.setItem('ACTIVE_TAHUN_ANGGARAN', t);

        // Update all year select dropdowns in DOM
        var yearSelectors = document.querySelectorAll('#globalActiveTahun, #selectDashboardTahun, #selectTahunDokumenDesa, #select-year, #select-tahun, #select-tahun-data, #tahun-select');
        yearSelectors.forEach(function(sel) {
            if (sel && sel.value !== t) {
                sel.value = t;
            }
        });

        // Update all year text badges in DOM
        var yearBadges = document.querySelectorAll('.display-active-tahun');
        yearBadges.forEach(function(el) {
            if (el) el.textContent = t;
        });

        // Update appState if Dokumen Desa module is active
        if (typeof appState !== 'undefined' && appState) {
            appState.activeTahun = t;
            if (appState.documentFields) {
                appState.documentFields['tahun'] = t;
                appState.documentFields['tahun1'] = t;
                appState.documentFields['tahun_anggaran'] = t;
                appState.documentFields['tahun_rkp'] = t;
            }
        }

        console.log('⚡ [Master Year Control] Tahun Anggaran set to:', t);

        // Broadcast custom event for active page scripts
        window.dispatchEvent(new CustomEvent('tahunChanged', { detail: { tahun: t } }));
    };

    // 3. Apply stored active year immediately on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function() {
        var currentTahun = window.getGlobalActiveTahun();
        window.setGlobalActiveTahun(currentTahun);
    });

    // Also run immediately in case DOM is already parsed
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        var currentTahun = window.getGlobalActiveTahun();
        window.setGlobalActiveTahun(currentTahun);
    }
})();
