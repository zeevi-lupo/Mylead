/**
 * TEAM LUPO - SAAS LOGIC (FULL VERSION WITH SALARY HISTORY)
 */

const PASS_SNK = "666Lupo666";[cite: 2]
const TEAM_PIN = "1234"; // PIN Global
const URL_API_POSTBACK = "https://script.google.com/macros/s/AKfycbxCkdx7958JC22FPsY3jqUvx1beYN0n_bvDAzly59LF7NlBdS2sZolqOwKo638bEbo5/exec";[cite: 2]

let globalPostbackData = [];[cite: 2]
let statusChartInstance = null;[cite: 2]
let autoRefreshInterval = null;[cite: 2]

// Eksekusi otomatis saat buka web
document.addEventListener("DOMContentLoaded", () => {[cite: 2]
    const savedPin = sessionStorage.getItem("lupo_pin");[cite: 2]
    if(savedPin === TEAM_PIN) {[cite: 2]
        document.getElementById('login-pin').value = savedPin;[cite: 2]
        prosesLogin();[cite: 2]
    }
});[cite: 2]

// --- SISTEM LOGIN GLOBAL ---
function prosesLogin() {[cite: 2]
    const pin = document.getElementById('login-pin').value;[cite: 2]
    if (pin === TEAM_PIN) {[cite: 2]
        sessionStorage.setItem("lupo_pin", pin);[cite: 2]
        
        document.getElementById('user-name-display').innerText = "Team Lupo";[cite: 2]
        document.getElementById('login-overlay').style.display = 'none';[cite: 2]
        document.getElementById('main-app').style.display = 'flex';[cite: 2]
        
        fetchPostbackData();[cite: 2]
        
        // AUTO REFRESH
        if(autoRefreshInterval) clearInterval(autoRefreshInterval);[cite: 2]
        autoRefreshInterval = setInterval(fetchPostbackData, 10000);[cite: 2]
    } else {[cite: 2]
        document.getElementById('login-error').style.display = 'block';[cite: 2]
    }
}[cite: 2]

function logout() {[cite: 2]
    sessionStorage.removeItem("lupo_pin");[cite: 2]
    clearInterval(autoRefreshInterval);[cite: 2]
    location.reload();[cite: 2]
}[cite: 2]

// --- DARK/LIGHT TOGGLE ---
function toggleTheme() {[cite: 2]
    document.body.classList.toggle('light-mode');[cite: 2]
    const icon = document.querySelector('#theme-btn i');[cite: 2]
    if (document.body.classList.contains('light-mode')) {[cite: 2]
        icon.className = 'fa-solid fa-moon';[cite: 2]
    } else {[cite: 2]
        icon.className = 'fa-solid fa-sun';[cite: 2]
    }
}[cite: 2]

// --- NAVIGASI DASHBOARD ---
function showPage(pageId, btnElement) {[cite: 2]
    document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');[cite: 2]
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));[cite: 2]
    document.getElementById(pageId).style.display = 'block';[cite: 2]
    if(btnElement) btnElement.classList.add('active');[cite: 2]
    
    const titleMap = {[cite: 2]
        'page-postback': 'Dashboard Overview',[cite: 2]
        'page-ranking': 'Leaderboard Tim 🔥',[cite: 2]
        'page-riwayat': 'Riwayat Pembayaran Gaji',[cite: 2]
        'page-link': 'Akses Link MyLead',[cite: 2]
        'page-video': 'Library Video Promosi',[cite: 2]
        'page-jam': 'Rekomendasi Waktu Spam',[cite: 2]
        'page-snk': 'Syarat & Ketentuan',[cite: 2]
        'page-tutorial': 'Video Tutorial & Panduan'[cite: 2]
    };[cite: 2]
    document.getElementById('topbar-text').innerText = titleMap[pageId];[cite: 2]
}[cite: 2]

// --- API DATA & TRANSLATOR ---
function terjemahkanStatus(rawStatus) {[cite: 2]
    let s = rawStatus ? String(rawStatus).toLowerCase().trim() : '';[cite: 2]
    
    if (s === '0' || s === 'approve' || s === 'approved' || s === 'accepted') return 'approve';[cite: 2]
    if (s === '1' || s === 'pending') return 'pending';[cite: 2]
    if (s === '3' || s === 'pre_approve' || s === 'pre_approved') return 'pre_approve';[cite: 2]
    
    return 'rejected';[cite: 2]
}[cite: 2]

function fetchPostbackData() {[cite: 2]
    const refreshBtn = document.querySelector('.btn-refresh i');[cite: 2]
    if(refreshBtn) refreshBtn.classList.add('fa-spin');[cite: 2]

    fetch(URL_API_POSTBACK + "?t=" + new Date().getTime())[cite: 2]
        .then(response => response.json())[cite: 2]
        .then(data => {[cite: 2]
            if(data.konversi) {[cite: 2]
                globalPostbackData = data.konversi.reverse();[cite: 2]
                renderRiwayatPembayaran(data.pembayaran || []);[cite: 2]
            } else {[cite: 2]
                globalPostbackData = Array.isArray(data) ? data.reverse() : [];[cite: 2]
            }
            
            populateSubIdFilter();[cite: 2]
            applyFilter();[cite: 2]
            
            if(refreshBtn) refreshBtn.classList.remove('fa-spin');[cite: 2]
        })[cite: 2]
        .catch(error => {[cite: 2]
            console.error('Error:', error);[cite: 2]
            if(refreshBtn) refreshBtn.classList.remove('fa-spin');[cite: 2]
        });[cite: 2]
}[cite: 2]

function populateSubIdFilter() {[cite: 2]
    const select = document.getElementById('filter-subid');[cite: 2]
    // DIUBAH: Menggunakan 'sub_1' agar sesuai dengan kolom "Sub 1" di sheet
    const uniqueSubIds = [...new Set(globalPostbackData.map(item => item.sub_1))].filter(Boolean);[cite: 2]
    select.innerHTML = '<option value="all">Semua Sub-ID</option>';[cite: 2]
    uniqueSubIds.forEach(subId => { select.innerHTML += `<option value="${subId}">${subId}</option>`; });[cite: 2]
}[cite: 2]

function applyFilter() {[cite: 2]
    const filterSubId = document.getElementById('filter-subid').value;[cite: 2]
    const filterStatus = document.getElementById('filter-status').value.toLowerCase();[cite: 2]

    const filteredData = globalPostbackData.filter(row => {[cite: 2]
        // DIUBAH: Menggunakan 'sub_1'
        const matchSubId = filterSubId === 'all' || row.sub_1 === filterSubId;[cite: 2]
        const s = terjemahkanStatus(row.status);[cite: 2]
        const matchStatus = filterStatus === 'all' || s === filterStatus;[cite: 2]
        return matchSubId && matchStatus;[cite: 2]
    });[cite: 2]

    renderTable(filteredData);[cite: 2]
    renderChartAndSummary(filteredData);[cite: 2]
    renderLeaderboard(globalPostbackData);[cite: 2]
}[cite: 2]

// --- EXPORT EXCEL ---
function exportKeExcel() {[cite: 2]
    let csvContent = "data:text/csv;charset=utf-8,Waktu,Sub-ID,Program,GEO,Payout,Status\n";[cite: 2]
    
    globalPostbackData.forEach(row => {[cite: 2]
        let statusTeks = terjemahkanStatus(row.status).toUpperCase();[cite: 2]
        // DIUBAH: Menggunakan 'sub_1', 'country', dan 'payout'
        let baris = `${row.waktu},${row.sub_1},${row.program_name},${row.country},${row.payout},${statusTeks}`;[cite: 2]
        csvContent += baris + "\n";[cite: 2]
    });[cite: 2]

    const encodedUri = encodeURI(csvContent);[cite: 2]
    const link = document.createElement("a");[cite: 2]
    link.setAttribute("href", encodedUri);[cite: 2]
    link.setAttribute("download", "Data_Conversi_TeamLupo.csv");[cite: 2]
    document.body.appendChild(link);[cite: 2]
    link.click();[cite: 2]
    document.body.removeChild(link);[cite: 2]
}[cite: 2]

// ==========================================
// LOGIKA LEADERBOARD BERDASARKAN WAKTU
// ==========================================

let currentRankFilter = 'all';[cite: 2]

function changeRankFilter(filterType, btnElement) {[cite: 2]
    currentRankFilter = filterType;[cite: 2]
    document.querySelectorAll('.btn-rank-filter').forEach(btn => btn.classList.remove('active'));[cite: 2]
    btnElement.classList.add('active');[cite: 2]
    applyFilter();[cite: 2]
}[cite: 2]

function parseDateString(dateStr) {[cite: 2]
    if (!dateStr || dateStr === '-') return new Date(0);[cite: 2]
    const parts = dateStr.split(' ');[cite: 2]
    const dmy = parts[0].split('/');[cite: 2]
    return new Date(dmy[2], dmy[1] - 1, dmy[0]);[cite: 2]
}[cite: 2]

function renderLeaderboard(data) {[cite: 2]
    let kalkulasi = {};[cite: 2]
    const skrg = new Date();[cite: 2]
    const hariIni = new Date(skrg.getFullYear(), skrg.getMonth(), skrg.getDate());[cite: 2]

    data.forEach(row => {[cite: 2]
        let statusLead = terjemahkanStatus(row.status);[cite: 2]

        if (statusLead === 'approve' || statusLead === 'pre_approve') {[cite: 2]
            const tglData = parseDateString(row.waktu);[cite: 2]
            let lolosFilter = false;[cite: 2]

            if (currentRankFilter === 'all') {[cite: 2]
                lolosFilter = true;[cite: 2]
            } else if (currentRankFilter === 'today') {[cite: 2]
                if (tglData.getTime() === hariIni.getTime()) lolosFilter = true;[cite: 2]
            } else if (currentRankFilter === 'weekly') {[cite: 2]
                const selisihHari = (hariIni - tglData) / (1000 * 60 * 60 * 24);[cite: 2]
                if (selisihHari <= 7 && selisihHari >= 0) lolosFilter = true;[cite: 2]
            } else if (currentRankFilter === 'monthly') {[cite: 2]
                if (tglData.getMonth() === skrg.getMonth() && tglData.getFullYear() === skrg.getFullYear()) lolosFilter = true;[cite: 2]
            }[cite: 2]

            if (lolosFilter) {[cite: 2]
                // DIUBAH: Menggunakan 'sub_1' dan 'payout'
                let nama = row.sub_1 ? row.sub_1.toUpperCase() : 'UNKNOWN';[cite: 2]
                let dolar = parseFloat(row.payout) || 0;[cite: 2]

                if (!kalkulasi[nama]) {[cite: 2]
                    kalkulasi[nama] = { totalLead: 0, approve: 0, pre_approve: 0, pendapatan: 0 };[cite: 2]
                }[cite: 2]
                
                kalkulasi[nama].totalLead += 1;[cite: 2]

                if (statusLead === 'approve') {[cite: 2]
                    kalkulasi[nama].approve += 1;[cite: 2]
                    kalkulasi[nama].pendapatan += dolar;[cite: 2]
                } else if (statusLead === 'pre_approve') {[cite: 2]
                    kalkulasi[nama].pre_approve += 1;[cite: 2]
                }
            }[cite: 2]
        }
    });[cite: 2]

    let arrayRanking = Object.keys(kalkulasi).map(kunci => {[cite: 2]
        return { nama: kunci, ...kalkulasi[kunci] };[cite: 2]
    });[cite: 2]
    arrayRanking.sort((a, b) => b.pendapatan - a.pendapatan);[cite: 2]

    const tbody = document.getElementById('tabel-ranking-body');[cite: 2]
    if(!tbody) return;[cite: 2]
    tbody.innerHTML = '';[cite: 2]

    if (arrayRanking.length === 0) {[cite: 2]
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Belum ada data untuk periode ini.</td></tr>';[cite: 2]
        return;[cite: 2]
    }

    arrayRanking.forEach((member, index) => {[cite: 2]
        let rankNumber = index + 1;[cite: 2]
        let piala = rankNumber;[cite: 2]
        if(rankNumber === 1) piala = '<i class="fa-solid fa-trophy medal rank-1"></i>';[cite: 2]
        if(rankNumber === 2) piala = '<i class="fa-solid fa-medal medal rank-2"></i>';[cite: 2]
        if(rankNumber === 3) piala = '<i class="fa-solid fa-medal medal rank-3"></i>';[cite: 2]

        tbody.innerHTML += `
            <tr>
                <td class="text-center" style="font-weight:700;">${piala}</td>
                <td class="text-blue" style="font-weight:700;">${member.nama}</td>
                <td style="font-weight:600;">${member.totalLead} Leads</td>
                <td class="text-green" style="font-weight:600;">${member.approve} <i class="fa-solid fa-check"></i></td>
                <td style="color: var(--info); font-weight:600;">${member.pre_approve} <i class="fa-solid fa-spinner"></i></td>
                <td class="text-green" style="font-weight:700;">$ ${member.pendapatan.toFixed(2)}</td>
            </tr>`;[cite: 2]
    });
}[cite: 2]

// --- RENDER TABEL & CHART ---
function renderTable(data) {[cite: 2]
    const tbody = document.getElementById('tabel-postback-body');[cite: 2]
    if(!tbody) return;[cite: 2]
    tbody.innerHTML = '';[cite: 2]
    if(data.length === 0) {[cite: 2]
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Data kosong.</td></tr>';[cite: 2]
        return;[cite: 2]
    }
    data.forEach(row => {[cite: 2]
        let s = terjemahkanStatus(row.status);[cite: 2]
        let badgeClass = 'status-rejected';[cite: 2]
        let namaStatus = s.toUpperCase();[cite: 2]
        if (s === 'approve') badgeClass = 'status-approve';[cite: 2]
        else if (s === 'pre_approve') { badgeClass = 'status-pre'; namaStatus = 'PRE-APPROVE'; }[cite: 2]
        else if (s === 'pending') badgeClass = 'status-pending';[cite: 2]

        tbody.innerHTML += `
            <tr>
                <td class="text-muted">${row.waktu || '-'}</td>
                <td style="font-weight: 600;" class="text-blue">${row.sub_1 || '-'}</td>
                <td>${row.program_name || '-'}</td>
                <td style="font-weight: 600;">${row.country ? row.country.toUpperCase() : '-'}</td>
                <td class="text-green" style="font-weight: 600;">$${row.payout || '0'}</td>
                <td><span class="badge-status ${badgeClass}">${namaStatus}</span></td>
            </tr>
        `;[cite: 2]
    });
}[cite: 2]

function renderChartAndSummary(data) {[cite: 2]
    let counts = { approve: 0, pre_approve: 0, pending: 0, rejected: 0 };[cite: 2]
    data.forEach(row => {[cite: 2]
        let s = terjemahkanStatus(row.status);[cite: 2]
        if(counts[s] !== undefined) counts[s]++;[cite: 2]
    });[cite: 2]

    document.getElementById('sum-total').innerText = data.length;[cite: 2]
    document.getElementById('sum-approve').innerText = counts.approve;[cite: 2]
    document.getElementById('sum-pending').innerText = counts.pending;[cite: 2]
    document.getElementById('sum-rejected').innerText = counts.rejected;[cite: 2]
    document.getElementById('sum-preapprove').innerText = counts.pre_approve;[cite: 2]

    const ctx = document.getElementById('statusChart').getContext('2d');[cite: 2]
    const chartData = [counts.approve, counts.pre_approve, counts.pending, counts.rejected];[cite: 2]

    if(statusChartInstance) {[cite: 2]
        statusChartInstance.data.datasets[0].data = chartData;[cite: 2]
        statusChartInstance.update();[cite: 2]
        return;[cite: 2]
    }

    statusChartInstance = new Chart(ctx, {[cite: 2]
        type: 'doughnut',[cite: 2]
        data: {[cite: 2]
            labels: ['Approve', 'Pre-Approve', 'Pending', 'Rejected'],[cite: 2]
            datasets: [{[cite: 2]
                data: chartData,[cite: 2]
                backgroundColor: ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444'],[cite: 2]
                borderColor: 'transparent',[cite: 2]
                borderWidth: 2,[cite: 2]
                hoverOffset: 5[cite: 2]
            }]
        },
        options: {[cite: 2]
            responsive: true,[cite: 2]
            maintainAspectRatio: false,[cite: 2]
            plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } },[cite: 2]
            cutout: '75%'[cite: 2]
        }
    });[cite: 2]
}[cite: 2]

// --- FUNGSI LINK LOKAL & VIDEO ---
const linksData = {[cite: 2]
    'thorfin': { 'monopoly go': "https://tinyurl.com/yadtctrk", 'dice dreams': "https://tinyurl.com/a9yfkaup", 'travel town': "https://tinyurl.com/3esk5wtj", 'gossip harbor': "https://tinyurl.com/5469kxp7", 'match masters': "https://tinyurl.com/c3axd3nj"},[cite: 2]
    'poseidon': { 'monopoly go': "https://tinyurl.com/mtd6uwhw", 'dice dreams': "https://tinyurl.com/2unv3yv2", 'travel town': "https://tinyurl.com/y9j29w6t", 'gossip harbor': "https://tinyurl.com/muxk8ze6", 'match masters': "https://tinyurl.com/43bcadbn"},[cite: 2]
    'luxury33': { 'monopoly go': "https://tinyurl.com/zc9zbust", 'dice dreams': "https://tinyurl.com/mszxnme8", 'travel town': "https://tinyurl.com/26tefvej", 'gossip harbor': "https://tinyurl.com/y494w6nt", 'match masters': "" },[cite: 2]
    'batako': { 'monopoly go': "https://tinyurl.com/5n8mvu3y", 'dice dreams': "https://tinyurl.com/2kkf495x", 'travel town': "https://tinyurl.com/42avcdk7", 'gossip harbor': "https://tinyurl.com/3cuhjtmz", 'match masters': "" },[cite: 2]
    'kahuna': { 'monopoly go': "https://tinyurl.com/2pzzz26e", 'dice dreams': "https://tinyurl.com/pu3w5k3", 'travel town': "https://tinyurl.com/mpjr8eck", 'gossip harbor': "https://tinyurl.com/3kz2mvu4", 'match masters': "" },[cite: 2]
    'angin': { 'monopoly go': "https://tinyurl.com/5n98ww92", 'dice dreams': "https://tinyurl.com/mt8rr4r3", 'travel town': "https://tinyurl.com/47xer297", 'gossip harbor': "https://tinyurl.com/rmddn4p", 'match masters': "https://tinyurl.com/vf69znvn"},[cite: 2]
    'hiltopia': { 'monopoly go': "https://tinyurl.com/3259y237", 'dice dreams': "https://tinyurl.com/3j3cmkm6", 'travel town': "https://tinyurl.com/3mf3vfs6", 'gossip harbor': "https://tinyurl.com/yc43wh6k", 'match masters': "" },[cite: 2]
    'ucup': { 'travel town': "https://tinyurl.com/yfy697c2", 'gossip harbor': "https://tinyurl.com/k57ssmwe", 'match masters': "" }[cite: 2]
};[cite: 2]

const vidsData = {[cite: 2]
    'monopoly': ['video-monopoly-1.mp4','video-monopoly-2.mp4','video-monopoly-3.mp4','video-monopoly-4.mp4'],[cite: 2]
    'gossip': ['video-gossip-1.mp4','video-gossip-2.mp4','video-gossip-3.mp4','video-gossip-4'],[cite: 2]
    'match': ['video-match-1.mp4','video-match-2.mp4'],[cite: 2]
    'travel': ['video-travel-1.mp4','video-travel-2.mp4','video-travel-3.mp4'],[cite: 2]
    'dicedreams': ['video-dicedreams-1.mp4'][cite: 2]
};[cite: 2]

function openLink(id, nama) {[cite: 2]
    document.getElementById('list-member').style.display = 'none';[cite: 2]
    document.getElementById('detail-link').style.display = 'block';[cite: 2]
    document.getElementById('active-name').innerText = "Sub-ID: " + nama;[cite: 2]
    const area = document.getElementById('render-links');[cite: 2]
    area.innerHTML = '';[cite: 2]
    if(!linksData[id]) return;[cite: 2]
    for (const [game, url] of Object.entries(linksData[id])) {[cite: 2]
        if(url === "-" || url === "") continue;[cite: 2]
        area.innerHTML += `
            <div class="link-box">
                <span style="text-transform: capitalize;">${game}</span>
                <input type="text" value="${url}" id="in-${id}-${game.replace(/\s+/g, '')}" readonly>
                <button class="btn-refresh" onclick="copyFunc('in-${id}-${game.replace(/\s+/g, '')}', this)"><i class="fa-solid fa-copy"></i> Salin</button>
            </div>`;[cite: 2]
    }
}[cite: 2]
function backToMembers() {[cite: 2]
    document.getElementById('detail-link').style.display = 'none';[cite: 2]
    document.getElementById('list-member').style.display = 'grid';[cite: 2]
}[cite: 2]
function copyFunc(id, btn) {[cite: 2]
    const input = document.getElementById(id);[cite: 2]
    if(input) {[cite: 2]
        input.select(); navigator.clipboard.writeText(input.value);[cite: 2]
        btn.innerHTML = "<i class='fa-solid fa-check'></i> Disalin";[cite: 2]
        btn.style.background = "#10b981";[cite: 2]
        setTimeout(() => {[cite: 2]
            btn.innerHTML = "<i class='fa-solid fa-copy'></i> Salin";[cite: 2]
            btn.style.background = "var(--primary)";[cite: 2]
        }, 1500);[cite: 2]
    }
}[cite: 2]
function openVideo(id, judul) {[cite: 2]
    document.getElementById('video-folder-view').style.display = 'none';[cite: 2]
    document.getElementById('video-list-view').style.display = 'block';[cite: 2]
    document.getElementById('active-game-title').innerText = "Video " + judul;[cite: 2]
    document.getElementById('render-videos').innerHTML = vidsData[id].map((v, i) => `
        <div class="video-card">
            <video src="${v}" controls style="width: 100%; max-width: 100%; height: auto; max-height: 400px; background: #000; object-fit: contain;"></video>
            <a href="${v}" download><i class="fa-solid fa-download"></i> Unduh Part ${i+1}</a>
        </div>`).join('');[cite: 2]
}[cite: 2]
function closeVideo() {[cite: 2]
    document.getElementById('video-folder-view').style.display = 'grid';[cite: 2]
    document.getElementById('video-list-view').style.display = 'none';[cite: 2]
    document.querySelectorAll('video').forEach(v => v.pause());[cite: 2]
}[cite: 2]

// ==========================================
// FUNGSI RENDER RIWAYAT PEMBAYARAN
// ==========================================
function renderRiwayatPembayaran(payments) {[cite: 2]
    const tbody = document.getElementById('tabel-riwayat-body');[cite: 2]
    if(!tbody) return;[cite: 2]
    
    tbody.innerHTML = '';[cite: 2]

    if (!payments || payments.length === 0) {[cite: 2]
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Belum ada riwayat pembayaran yang diinput.</td></tr>';[cite: 2]
        return;[cite: 2]
    }

    const sortedPayments = payments.reverse();[cite: 2]

    sortedPayments.forEach(row => {[cite: 2]
        const tgl = row.tanggal || '-';[cite: 2]
        const subId = row.sub_id || '-';[cite: 2]
        const nominal = row.nominal_usd || '0';[cite: 2]
        const status = String(row.status || 'Berhasil');[cite: 2]
        
        let statusBadge = '';[cite: 2]
        if(status.toLowerCase().includes('berhasil')) {[cite: 2]
            statusBadge = `<span style="background: rgba(16, 185, 129, 0.1); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase;"><i class="fa-solid fa-check-circle"></i> ${status}</span>`;[cite: 2]
        } else {[cite: 2]
            statusBadge = `<span style="background: rgba(245, 158, 11, 0.1); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.2); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase;"><i class="fa-solid fa-spinner"></i> ${status}</span>`;[cite: 2]
        }

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 500;" class="text-muted">${tgl}</td>
                <td class="text-blue" style="font-weight: 700;">${String(subId).toUpperCase()}</td>
                <td class="text-green" style="font-weight: 700;">$${nominal}</td>
                <td>${statusBadge}</td>
            </tr>
        `;[cite: 2]
    });
}[cite: 2]
