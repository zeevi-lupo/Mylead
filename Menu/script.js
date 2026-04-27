/**
 * TEAM LUPO - SAAS LOGIC (FULL RESTORED & CLEAN VERSION)
 */

const PASS_SNK = "666Lupo666";
const TEAM_PIN = "1234"; // PIN Global
const URL_API_POSTBACK = "https://script.google.com/macros/s/AKfycbxCkdx7958JC22FPsY3jqUvx1beYN0n_bvDAzly59LF7NlBdS2sZolqOwKo638bEbo5/exec";

let globalPostbackData = [];
let statusChartInstance = null;
let autoRefreshInterval = null;

// Fungsi Pencari Data Pintar (Pencegah UNKNOWN)
function ambilData(row, pilihanKey) {
    for (let key of pilihanKey) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
    }
    return '-';
}

// Eksekusi otomatis saat buka web
document.addEventListener("DOMContentLoaded", () => {
    const savedPin = sessionStorage.getItem("lupo_pin");
    if(savedPin === TEAM_PIN) {
        document.getElementById('login-pin').value = savedPin;
        prosesLogin();
    }
});

// --- SISTEM LOGIN GLOBAL ---
function prosesLogin() {
    const pin = document.getElementById('login-pin').value;
    const loginOverlay = document.getElementById('login-overlay');
    const mainApp = document.getElementById('main-app');
    const userNameDisplay = document.getElementById('user-name-display');

    if (pin === TEAM_PIN) {
        sessionStorage.setItem("lupo_pin", pin);
        if (userNameDisplay) userNameDisplay.innerText = "Team Lupo";
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (mainApp) mainApp.style.display = 'flex';

        fetchPostbackData();

        if(autoRefreshInterval) clearInterval(autoRefreshInterval);
        autoRefreshInterval = setInterval(fetchPostbackData, 10000);
    } else {
        const loginError = document.getElementById('login-error');
        if (loginError) loginError.style.display = 'block';
    }
}

function logout() {
    sessionStorage.removeItem("lupo_pin");
    clearInterval(autoRefreshInterval);
    location.reload();
}

// --- DARK/LIGHT TOGGLE ---
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const icon = document.querySelector('#theme-btn i');
    if (icon) {
        icon.className = document.body.classList.contains('light-mode') ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
}

// --- NAVIGASI DASHBOARD ---
function showPage(pageId, btnElement) {
    document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.style.display = 'block';
    if(btnElement) btnElement.classList.add('active');

    const titleMap = {
        'page-postback': 'Dashboard Overview',
        'page-ranking': 'Leaderboard Tim 🔥',
        'page-riwayat': 'Riwayat Pembayaran Gaji',
        'page-link': 'Akses Link MyLead',
        'page-video': 'Library Video Promosi',
        'page-jam': 'Rekomendasi Waktu Spam',
        'page-snk': 'Syarat & Ketentuan',
        'page-tutorial': 'Video Tutorial & Panduan'
    };
    const topbarText = document.getElementById('topbar-text');
    if (topbarText) topbarText.innerText = titleMap[pageId] || 'Dashboard';
}

// --- API DATA & TRANSLATOR ---
function terjemahkanStatus(rawStatus) {
    let s = rawStatus ? String(rawStatus).toLowerCase().trim() : '';
    // Urutan penting: Cek PRE dulusn agar tidak terbaca sebagai Approve
    if (s === '3' || s.includes('pre')) return 'pre_approve';
    if (s === '0' || s.includes('approve')) return 'approve';
    if (s === '1' || s.includes('pending')) return 'pending';
    return 'rejected';
}

function fetchPostbackData() {
    const refreshBtn = document.querySelector('.btn-refresh i');
    if(refreshBtn) refreshBtn.classList.add('fa-spin');

    fetch(URL_API_POSTBACK + "?t=" + new Date().getTime())
        .then(response => response.json())
        .then(data => {
            if(data.konversi) {
                globalPostbackData = data.konversi.reverse();
                renderRiwayatPembayaran(data.pembayaran || []);
            } else {
                globalPostbackData = Array.isArray(data) ? data.reverse() : [];
            }
            populateSubIdFilter();
            applyFilter();
            if(refreshBtn) refreshBtn.classList.remove('fa-spin');
        })
        .catch(error => {
            console.error('Error:', error);
            if(refreshBtn) refreshBtn.classList.remove('fa-spin');
        });
}

function populateSubIdFilter() {
    const select = document.getElementById('filter-subid');
    if (!select) return;
    const uniqueSubIds = [...new Set(globalPostbackData.map(item => ambilData(item, ['sub_1', 'ml_sub1', 'sub_id'])))].filter(s => s !== '-');
    select.innerHTML = '<option value="all">Semua Sub-ID</option>';
    uniqueSubIds.forEach(subId => { select.innerHTML += `<option value="${subId}">${subId}</option>`; });
}

function applyFilter() {
    const subFilter = document.getElementById('filter-subid');
    const statusFilter = document.getElementById('filter-status');
    const filterSubId = subFilter ? subFilter.value : 'all';
    const filterStatus = statusFilter ? statusFilter.value.toLowerCase() : 'all';

    const filteredData = globalPostbackData.filter(row => {
        const valSubId = ambilData(row, ['sub_1', 'ml_sub1', 'sub_id']);
        const matchSubId = filterSubId === 'all' || valSubId === filterSubId;
        const s = terjemahkanStatus(row.status);
        const matchStatus = filterStatus === 'all' || s === filterStatus;
        return matchSubId && matchStatus;
    });

    renderTable(filteredData);
    renderChartAndSummary(filteredData);
    renderLeaderboard(globalPostbackData);
}

// --- EXPORT EXCEL ---
function exportKeExcel() {
    let csvContent = "data:text/csv;charset=utf-8,Waktu,Sub-ID,Program,GEO,Payout,Status\n";
    globalPostbackData.forEach(row => {
        let statusTeks = terjemahkanStatus(row.status).toUpperCase();
        const valSubId = ambilData(row, ['sub_1', 'ml_sub1', 'sub_id']);
        const valGeo = ambilData(row, ['country', 'country_code', 'geo']);
        const valPayout = ambilData(row, ['payout', 'payout_decimal']);
        let baris = `${row.waktu},${valSubId},${row.program_name},${valGeo},${valPayout},${statusTeks}`;
        csvContent += baris + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Data_Conversi_TeamLupo.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- LEADERBOARD LOGIC ---
let currentRankFilter = 'all';
function changeRankFilter(filterType, btnElement) {
    currentRankFilter = filterType;
    document.querySelectorAll('.btn-rank-filter').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    applyFilter();
}

function parseDateString(dateStr) {
    if (!dateStr || dateStr === '-') return new Date(0);
    const parts = dateStr.split(' ');
    const dmy = parts[0].split('/');
    return new Date(dmy[2], dmy[1] - 1, dmy[0]);
}

function renderLeaderboard(data) {
    let kalkulasi = {};
    const skrg = new Date();
    const hariIni = new Date(skrg.getFullYear(), skrg.getMonth(), skrg.getDate());

    data.forEach(row => {
        let statusLead = terjemahkanStatus(row.status);
        if (statusLead === 'approve' || statusLead === 'pre_approve') {
            const tglData = parseDateString(row.waktu);
            let lolosFilter = (currentRankFilter === 'all') ||
                (currentRankFilter === 'today' && tglData.getTime() === hariIni.getTime()) ||
                (currentRankFilter === 'weekly' && (hariIni - tglData) / (1000 * 60 * 60 * 24) <= 7) ||
                (currentRankFilter === 'monthly' && tglData.getMonth() === skrg.getMonth());

            if (lolosFilter) {
                const subIdRaw = ambilData(row, ['sub_1', 'ml_sub1', 'sub_id']);
                let nama = subIdRaw !== '-' ? subIdRaw.toUpperCase() : 'UNKNOWN';
                const payoutRaw = ambilData(row, ['payout', 'payout_decimal']);
                let dolar = parseFloat(payoutRaw) || 0;

                if (!kalkulasi[nama]) kalkulasi[nama] = { totalLead: 0, approve: 0, pre_approve: 0, pendapatan: 0 };
                kalkulasi[nama].totalLead += 1;
                if (statusLead === 'approve') {
                    kalkulasi[nama].approve += 1;
                    kalkulasi[nama].pendapatan += dolar;
                } else {
                    kalkulasi[nama].pre_approve += 1;
                }
            }
        }
    });

    let arrayRanking = Object.keys(kalkulasi).map(kunci => ({ nama: kunci, ...kalkulasi[kunci] }));
    arrayRanking.sort((a, b) => b.pendapatan - a.pendapatan);
    const tbody = document.getElementById('tabel-ranking-body');
    if(!tbody) return;
    tbody.innerHTML = arrayRanking.length === 0 ? '<tr><td colspan="6" class="text-center text-muted py-4">Belum ada data peringkat.</td></tr>' : '';

    arrayRanking.forEach((member, index) => {
        let piala = index + 1;
        if(index === 0) piala = '<i class="fa-solid fa-trophy medal rank-1"></i>';
        else if(index === 1) piala = '<i class="fa-solid fa-medal medal rank-2"></i>';
        else if(index === 2) piala = '<i class="fa-solid fa-medal medal rank-3"></i>';
        tbody.innerHTML += `
            <tr>
                <td class="text-center" style="font-weight:700;">${piala}</td>
                <td class="text-blue" style="font-weight:700;">${member.nama}</td>
                <td style="font-weight:600;">${member.totalLead} Leads</td>
                <td class="text-green" style="font-weight:600;">${member.approve} <i class="fa-solid fa-check"></i></td>
                <td style="color: var(--info); font-weight:600;">${member.pre_approve} <i class="fa-solid fa-spinner"></i></td>
                <td class="text-green" style="font-weight:700;">$ ${member.pendapatan.toFixed(2)}</td>
            </tr>`;
    });
}

function renderTable(data) {
    const tbody = document.getElementById('tabel-postback-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    if(data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Data kosong.</td></tr>';
        return;
    }
    data.forEach(row => {
        let s = terjemahkanStatus(row.status);
        let badgeClass = 'status-rejected';
        let namaStatus = s.toUpperCase();
        if (s === 'approve') badgeClass = 'status-approve';
        else if (s === 'pre_approve') { badgeClass = 'status-pre'; namaStatus = 'PRE-APPROVE'; }
        else if (s === 'pending') badgeClass = 'status-pending';

        const valSubId = ambilData(row, ['sub_1', 'ml_sub1', 'sub_id']);
        const valGeo = ambilData(row, ['country', 'country_code', 'geo']);
        const valPayout = ambilData(row, ['payout', 'payout_decimal']);

        tbody.innerHTML += `
            <tr>
                <td class="text-muted">${row.waktu || '-'}</td>
                <td style="font-weight: 600;" class="text-blue">${valSubId}</td>
                <td>${row.program_name || '-'}</td>
                <td style="font-weight: 600;">${valGeo.toUpperCase()}</td>
                <td class="text-green" style="font-weight: 600;">$${valPayout === '-' ? '0' : valPayout}</td>
                <td><span class="badge-status ${badgeClass}">${namaStatus}</span></td>
            </tr>`;
    });
}

function renderChartAndSummary(data) {
    let counts = { approve: 0, pre_approve: 0, pending: 0, rejected: 0 };
    data.forEach(row => {
        let s = terjemahkanStatus(row.status);
        if(counts[s] !== undefined) counts[s]++;
    });
    const sumTotal = document.getElementById('sum-total');
    const sumApprove = document.getElementById('sum-approve');
    const sumPending = document.getElementById('sum-pending');
    const sumRejected = document.getElementById('sum-rejected');
    const sumPreapprove = document.getElementById('sum-preapprove');

    if (sumTotal) sumTotal.innerText = data.length;
    if (sumApprove) sumApprove.innerText = counts.approve;
    if (sumPending) sumPending.innerText = counts.pending;
    if (sumRejected) sumRejected.innerText = counts.rejected;
    if (sumPreapprove) sumPreapprove.innerText = counts.pre_approve;

    const chartElem = document.getElementById('statusChart');
    if (!chartElem) return;
    const ctx = chartElem.getContext('2d');
    const chartData = [counts.approve, counts.pre_approve, counts.pending, counts.rejected];
    if(statusChartInstance) {
        statusChartInstance.data.datasets[0].data = chartData;
        statusChartInstance.update();
        return;
    }
    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Approve', 'Pre-Approve', 'Pending', 'Rejected'],
            datasets: [{
                data: chartData,
                backgroundColor: ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444'],
                borderColor: 'transparent',
                borderWidth: 2
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '75%' }
    });
}

// --- FUNGSI TOOLS & MEDIA (DATA ASLI KAMU) ---
const linksData = {
    'thorfin': { 'monopoly go': "https://tinyurl.com/yadtctrk", 'dice dreams': "https://tinyurl.com/a9yfkaup", 'travel town': "https://tinyurl.com/3esk5wtj", 'gossip harbor': "https://tinyurl.com/5469kxp7", 'match masters': "https://tinyurl.com/c3axd3nj"},
    'poseidon': { 'monopoly go': "https://tinyurl.com/mtd6uwhw", 'dice dreams': "https://tinyurl.com/2unv3yv2", 'travel town': "https://tinyurl.com/y9j29w6t", 'gossip harbor': "https://tinyurl.com/muxk8ze6", 'match masters': "https://tinyurl.com/43bcadbn"},
    'luxury33': { 'monopoly go': "https://tinyurl.com/zc9zbust", 'dice dreams': "https://tinyurl.com/mszxnme8", 'travel town': "https://tinyurl.com/26tefvej", 'gossip harbor': "https://tinyurl.com/y494w6nt", 'match masters': "" },
    'batako': { 'monopoly go': "https://tinyurl.com/5n8mvu3y", 'dice dreams': "https://tinyurl.com/2kkf495x", 'travel town': "https://tinyurl.com/42avcdk7", 'gossip harbor': "https://tinyurl.com/3cuhjtmz", 'match masters': "" },
    'kahuna': { 'monopoly go': "https://tinyurl.com/2pzzwz6e", 'dice dreams': "https://tinyurl.com/pu3w5k3", 'travel town': "https://tinyurl.com/mpjr8eck", 'gossip harbor': "https://tinyurl.com/3kz2mvu4", 'match masters': "" },
    'angin': { 'monopoly go': "https://tinyurl.com/5n98ww92", 'dice dreams': "https://tinyurl.com/mt8rr4r3", 'travel town': "https://tinyurl.com/47xer297", 'gossip harbor': "https://tinyurl.com/rmddn4p", 'match masters': "https://tinyurl.com/vf69znvn"},
    'hiltopia': { 'monopoly go': "https://tinyurl.com/3259y237", 'dice dreams': "https://tinyurl.com/3j3cmkm6", 'travel town': "https://tinyurl.com/3mf3vfs6", 'gossip harbor': "https://tinyurl.com/yc43wh6k", 'match masters': "" },
    'ucup': { 'travel town': "https://tinyurl.com/yfy697c2", 'gossip harbor': "https://tinyurl.com/k57ssmwe", 'match masters': "" }
};

const vidsData = {
    'monopoly': ['video-monopoly-1.mp4','video-monopoly-2.mp4','video-monopoly-3.mp4','video-monopoly-4.mp4'],
    'gossip': ['video-gossip-1.mp4','video-gossip-2.mp4','video-gossip-3.mp4','video-gossip-4'],
    'match': ['video-match-1.mp4','video-match-2.mp4'],
    'travel': ['video-travel-1.mp4','video-travel-2.mp4','video-travel-3.mp4'],
    'dicedreams': ['video-dicedreams-1.mp4']
};

function openLink(id, nama) {
    const listMember = document.getElementById('list-member');
    const detailLink = document.getElementById('detail-link');
    const activeName = document.getElementById('active-name');
    const area = document.getElementById('render-links');

    if (listMember) listMember.style.display = 'none';
    if (detailLink) detailLink.style.display = 'block';
    if (activeName) activeName.innerText = "Sub-ID: " + nama;
    if (area) area.innerHTML = '';

    if(!linksData[id] || !area) return;
    for (const [game, url] of Object.entries(linksData[id])) {
        if(url === "-" || url === "") continue;
        area.innerHTML += `
            <div class="link-box">
                <span style="text-transform: capitalize;">${game}</span>
                <input type="text" value="${url}" id="in-${id}-${game.replace(/\s+/g, '')}" readonly>
                <button class="btn-refresh" onclick="copyFunc('in-${id}-${game.replace(/\s+/g, '')}', this)"><i class="fa-solid fa-copy"></i> Salin</button>
            </div>`;
    }
}
function backToMembers() {
    const detailLink = document.getElementById('detail-link');
    const listMember = document.getElementById('list-member');
    if (detailLink) detailLink.style.display = 'none';
    if (listMember) listMember.style.display = 'grid';
}
function copyFunc(id, btn) {
    const input = document.getElementById(id);
    if(input) {
        input.select();
        navigator.clipboard.writeText(input.value);
        btn.innerHTML = "<i class='fa-solid fa-check'></i> Disalin";
        btn.style.background = "#10b981";
        setTimeout(() => {
            btn.innerHTML = "<i class='fa-solid fa-copy'></i> Salin";
            btn.style.background = "var(--primary)";
        }, 1500);
    }
}
function openVideo(id, judul) {
    const folderView = document.getElementById('video-folder-view');
    const listView = document.getElementById('video-list-view');
    const activeTitle = document.getElementById('active-game-title');
    const renderVideos = document.getElementById('render-videos');

    if (folderView) folderView.style.display = 'none';
    if (listView) listView.style.display = 'block';
    if (activeTitle) activeTitle.innerText = "Video " + judul;

    if (renderVideos && vidsData[id]) {
        renderVideos.innerHTML = vidsData[id].map((v, i) => `
            <div class="video-card">
                <video src="${v}" controls style="width: 100%; max-width: 100%; height: auto; max-height: 400px; background: #000; object-fit: contain;"></video>
                <a href="${v}" download><i class="fa-solid fa-download"></i> Unduh Part ${i+1}</a>
            </div>`).join('');
    }
}
function closeVideo() {
    const folderView = document.getElementById('video-folder-view');
    const listView = document.getElementById('video-list-view');
    if (folderView) folderView.style.display = 'grid';
    if (listView) listView.style.display = 'none';
    document.querySelectorAll('video').forEach(v => v.pause());
}

function renderRiwayatPembayaran(payments) {
    const tbody = document.getElementById('tabel-riwayat-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (!payments || payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Belum ada riwayat.</td></tr>';
        return;
    }
    payments.reverse().forEach(row => {
        const valSubId = ambilData(row, ['sub_id', 'sub_1', 'ml_sub1']);
        const valNominal = ambilData(row, ['nominal_usd', 'nominal', 'payout']);
        const status = String(row.status || 'Berhasil');
        const badge = status.toLowerCase().includes('berhasil') ?
            `<span style="background: rgba(16, 185, 129, 0.1); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;"><i class="fa-solid fa-check-circle"></i> ${status}</span>` :
            `<span style="background: rgba(245, 158, 11, 0.1); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.2); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;"><i class="fa-solid fa-spinner"></i> ${status}</span>`;
        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 500;" class="text-muted">${row.tanggal || '-'}</td>
                <td class="text-blue" style="font-weight: 700;">${valSubId.toUpperCase()}</td>
                <td class="text-green" style="font-weight: 700;">$${valNominal === '-' ? '0' : valNominal}</td>
                <td>${badge}</td>
            </tr>`;
    });
}
