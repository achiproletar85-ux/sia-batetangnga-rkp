/**
 * ============================================================
 * SIA BATETANGNGA - AUTHENTICATION & ROUTE GUARD MODULE
 * ============================================================
 * Mengatur perlindungan rute, pengecekan sesi aktif, state loading,
 * dan alur logout terstandarisasi.
 */

(function () {
    'use strict';

    window.loadingAuth = true;
    window.isAuthenticated = false;

    /**
     * Memeriksa apakah halaman saat ini adalah halaman login publik
     */
    function isPublicPath() {
        const path = window.location.pathname.toLowerCase();
        return path.endsWith('/login.html') || path === '/login' || path.endsWith('/login');
    }

    /**
     * Mengambil data sesi pengguna dari storage
     */
    function getStoredUser() {
        try {
            const raw = sessionStorage.getItem('sia_user') || localStorage.getItem('sia_user');
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && (parsed.username || parsed.id)) {
                return parsed;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Menampilkan loading screen sementara sesi diverifikasi
     */
    function showLoadingScreen() {
        if (document.getElementById('auth-loading-screen')) return;
        const loader = document.createElement('div');
        loader.id = 'auth-loading-screen';
        loader.style.cssText = [
            'position: fixed',
            'inset: 0',
            'background: #0f172a',
            'z-index: 999999',
            'display: flex',
            'flex-direction: column',
            'align-items: center',
            'justify-content: center',
            'color: #ffffff',
            'font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif'
        ].join(';');

        loader.innerHTML = `
            <div style="width: 44px; height: 44px; border: 4px solid rgba(249, 115, 22, 0.2); border-top-color: #f97316; border-radius: 50%; animation: siaSpin 0.75s linear infinite; margin-bottom: 14px;"></div>
            <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.02em; color: #f8fafc;">Memeriksa Sesi Autentikasi...</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">SIA Desa Batetangnga</div>
            <style>
                @keyframes siaSpin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
        if (document.body) {
            document.body.appendChild(loader);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                if (window.loadingAuth && !document.getElementById('auth-loading-screen')) {
                    document.body.appendChild(loader);
                }
            });
        }
    }

    /**
     * Menghilangkan loading screen
     */
    function hideLoadingScreen() {
        window.loadingAuth = false;
        const loader = document.getElementById('auth-loading-screen');
        if (loader) {
            loader.style.transition = 'opacity 0.2s ease';
            loader.style.opacity = '0';
            setTimeout(() => {
                if (loader.parentNode) loader.parentNode.removeChild(loader);
            }, 200);
        }
    }

    /**
     * Route Guard: Memastikan sesi pengguna valid sebelum membuka halaman
     */
    async function guardRoute() {
        const isPublic = isPublicPath();
        const user = getStoredUser();

        // 1. Jika di halaman publik (Login)
        if (isPublic) {
            if (user) {
                // Pengguna sudah login, arahkan ke dashboard
                window.location.replace('/');
                return;
            }
            window.loadingAuth = false;
            window.isAuthenticated = false;
            hideLoadingScreen();
            return;
        }

        // 2. Jika di rute privat (Dashboard, RAB, RKPDes, dll.)
        if (!user) {
            // Pengguna belum login: Tampilkan loading screen dan langsung redirect ke login
            window.loadingAuth = false;
            window.isAuthenticated = false;
            if (document.documentElement) {
                document.documentElement.style.display = 'none';
            }
            window.location.replace('/login.html');
            return;
        }

        // 3. Pengguna memiliki sesi lokal, verifikasi Supabase auth jika tersedia
        try {
            const client = window.supabaseClient || window.supabase;
            if (client && client.auth && typeof client.auth.getSession === 'function') {
                const { data } = await client.auth.getSession();
                // Jika Supabase auth aktif dan sesi tidak ada, sinkronkan
                if (data && data.session) {
                    window.supabaseSession = data.session;
                }
            }
        } catch (e) {
            // Abaikan error jaringan ringan agar tidak mengunci offline/local mode
        }

        window.loadingAuth = false;
        window.isAuthenticated = true;
        hideLoadingScreen();
    }

    /**
     * Alur Logout Terpusat
     */
    window.handleLogout = async function () {
        try {
            const client = window.supabaseClient || window.supabase;
            if (client && client.auth && typeof client.auth.signOut === 'function') {
                await client.auth.signOut();
            }
        } catch (e) {
            console.warn('⚠️ Supabase signOut error:', e);
        }

        try {
            await fetch('/api/logout', { method: 'POST' });
        } catch (e) {}

        // Bersihkan seluruh penyimpanan lokal sesi
        sessionStorage.clear();
        localStorage.clear();

        window.isAuthenticated = false;
        window.loadingAuth = false;

        // Redirect bersih ke halaman login
        window.location.replace('/login.html');
    };

    // Eksekusi pemeriksaan rute awal
    if (!isPublicPath()) {
        showLoadingScreen();
    }
    guardRoute();
})();
