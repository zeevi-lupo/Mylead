/**
 * TEAM LUPO - FULL LOGIC WITH EXACT MYLEAD STATUS MATCHER
 */

const PASS_SNK = "666Lupo666";
const TEAM_PIN = "1234"; // PIN Global
const URL_API_POSTBACK = "https://script.google.com/macros/s/AKfycbxCkdx7958JC22FPsY3jqUvx1beYN0n_bvDAzly59LF7NlBdS2sZolqOwKo638bEbo5/exec";

let globalPostbackData = []; 
let statusChartInstance = null; 
let autoRefreshInterval = null;

// FUNGSI PINTAR: Mencegah 'UNKNOWN' dari nama kolom yang berbeda
function ambilData(row, pilihanKey) {
    for (let key of pilihanKey) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
    }
    return '-';
}

document.addEventListener("DOMContentLoaded", () => {
    const savedPin = sessionStorage.getItem("lupo_pin");
    if(savedPin === TEAM_PIN) {
        document.getElementById('login-pin').value = savedPin;
        prosesLogin();
    }
});

function prosesLogin() {
    const pin = document.getElementById('login-pin').value;
    if (pin === TEAM_PIN) {
        sessionStorage.setItem("lupo_pin", pin); 
        document.getElementById('user-name-display').innerText = "Team Lupo";
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        fetchPostbackData();
        if(autoRefreshInterval) clearInterval(autoRefreshInterval);
        autoRefreshInterval = setInterval(fetchPostbackData, 10000); 
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}

function logout() {
    sessionStorage.removeItem("lupo_pin");
    clearInterval(autoRefreshInterval);
    location.reload(); 
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const icon = document.querySelector('#theme-btn i');
    icon.className = document.body.classList.contains('light-mode') ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
}

function showPage(pageId, btnElement) {
    document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(pageId).style.display = 'block';
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
    document.getElementById('topbar-text').innerText = titleMap[pageId];
}

// TRANSLATOR STATUS MYLEAD PRESISI
function terjemahkanStatus(rawStatus) {
    let s = rawStatus ? String(rawStatus).toLowerCase().trim() : '';
    
    // 1. Cek Pre-Approve duluan
    if (s === '3' || s === 'pre_approved' || s === 'pre_approve') return 'pre_approve';
    // 2. Cek Approve / Accepted dari MyLead
    if (s === '0' || s === 'accepted' || s === 'approve' || s === 'approved') return 'approve';
    // 3. Cek Pending
    if (s === '1' || s === 'pending') return 'pending';
    
    // Sisanya ditandai Rejected
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
    const uniqueSubIds = [...new Set(globalPostbackData.map(item => ambilData(item, ['sub_1', 'ml_sub1', 'sub_id'])))].filter(s => s !== '-');
    select.innerHTML = '<option value="all">Semua Sub-ID</option>';
    uniqueSubIds.forEach(subId => { select.innerHTML += `<option value="${subId}">${subId}</option>`; });
}

function applyFilter() {
    const filterSubId = document.getElementById('filter-subid').value;
    const filterStatus = document.getElementById('filter-status').value.toLowerCase();

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

// EXPORT EXCEL
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

// LEADERBOARD LOGIC
let currentRankFilter = 'all';
function changeRankFilter(filterType, btnElement) {
    currentRankFilter = filterType;
    document.querySelectorAll('.btn-rank-filter').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
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
                } else if (statusLead === 'pre_approve') {
                    kalkulasi[nama].pre_approve += 1;
                }
            }
        }
    });

    let arrayRanking = Object.keys(kalkulasi).map(kunci => ({ nama: kunci, ...kalkulasi[kunci] }));
    arrayRanking.sort((a, b) => b.pendapatan - a.pendapatan);
    const tbody = document.getElementById('tabel-ranking-body');
    if(!tbody) return;
    tbody.innerHTML = arrayRanking.length === 0 ? '<tr><td colspan="6" class="text-center text-muted py-4">Data kosong.</td></tr>' : '';

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
    document.getElementById('sum-total').innerText = data.length;
    document.getElementById('sum-approve').innerText = counts.approve;
    document.getElementById('sum-pending').innerText = counts.pending;
    document.getElementById('sum-rejected').innerText = counts.rejected;
    document.getElementById('sum-preapprove').innerText = counts.pre_approve;
    
    const ctx = document.getElementById('statusChart').getContext('2d');
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

// TOOLS & MEDIA (KEMBALI KE ASLI)
const linksData = {
    'thorfin': { 'monopoly go': "https://tinyurl.com/2febvbj2", 'dice dreams': "https://tinyurl.com/a9yfkaup", 'travel town': "https://tinyurl.com/3esk5wtj", 'gossip harbor': "https://tinyurl.com/5469kxp7", 'match masters': "https://tinyurl.com/c3axd3nj"},
    'poseidon': { 'monopoly go': "https://tinyurl.com/4krvv9rb", 'dice dreams': "https://tinyurl.com/2unv3yv2", 'travel town': "https://tinyurl.com/y9j29w6t", 'gossip harbor': "https://tinyurl.com/muxk8ze6", 'match masters': "https://tinyurl.com/43bcadbn"},
    'luxury33': { 'monopoly go': "https://tinyurl.com/5adhf8h9", 'dice dreams': "https://tinyurl.com/mszxnme8", 'travel town': "https://tinyurl.com/26tefvej", 'gossip harbor': "https://tinyurl.com/y494w6nt", 'match masters': "" },
    'batako': { 'monopoly go': "https://tinyurl.com/mb9jmbny", 'dice dreams': "https://tinyurl.com/2kkf495x", 'travel town': "https://tinyurl.com/42avcdk7", 'gossip harbor': "https://tinyurl.com/3cuhjtmz", 'match masters': "" },
    'kahuna': { 'monopoly go': "https://tinyurl.com/23uaxmjr", 'dice dreams': "https://tinyurl.com/pu3w5k3", 'travel town': "https://tinyurl.com/mpjr8eck", 'gossip harbor': "https://tinyurl.com/3kz2mvu4", 'match masters': "" },
    'angin': { 'monopoly go': "https://tinyurl.com/yc6ds4vu", 'dice dreams': "https://tinyurl.com/mt8rr4r3", 'travel town': "https://tinyurl.com/47xer297", 'gossip harbor': "https://tinyurl.com/rmddn4p", 'match masters': "https://tinyurl.com/vf69znvn"},
    'hiltopia': { 'monopoly go': "https://tinyurl.com/rfm89ywj", 'dice dreams': "https://tinyurl.com/3j3cmkm6", 'travel town': "https://tinyurl.com/3mf3vfs6", 'gossip harbor': "https://tinyurl.com/yc43wh6k", 'match masters': "" },
    'ucup': { 'monopoly go':"https://tinyurl.com/4xkxwktp", 'travel town': "https://tinyurl.com/yfy697c2", 'gossip harbor': "https://tinyurl.com/k57ssmwe", 'match masters': "" }
};

const vidsData = {
    'monopoly': ['video-monopoly-1.mp4','video-monopoly-2.mp4','video-monopoly-3.mp4','video-monopoly-4.mp4'],
    'gossip': ['video-gossip-1.mp4','video-gossip-2.mp4','video-gossip-3.mp4','video-gossip-4'],
    'match': ['video-match-1.mp4','video-match-2.mp4'],
    'travel': ['video-travel-1.mp4','video-travel-2.mp4','video-travel-3.mp4'],
    'dicedreams': ['video-dicedreams-1.mp4']
};

function openLink(id, nama) {
    document.getElementById('list-member').style.display = 'none';
    document.getElementById('detail-link').style.display = 'block';
    document.getElementById('active-name').innerText = "Sub-ID: " + nama;
    const area = document.getElementById('render-links');
    area.innerHTML = '';
    if(!linksData[id]) return;
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
    document.getElementById('detail-link').style.display = 'none';
    document.getElementById('list-member').style.display = 'grid';
}
function copyFunc(id, btn) {
    const input = document.getElementById(id);
    if(input) {
        input.select(); navigator.clipboard.writeText(input.value);
        btn.innerHTML = "<i class='fa-solid fa-check'></i> Disalin";
        btn.style.background = "#10b981";
        setTimeout(() => { 
            btn.innerHTML = "<i class='fa-solid fa-copy'></i> Salin";
            btn.style.background = "var(--primary)"; 
        }, 1500);
    }
}
function openVideo(id, judul) {
    document.getElementById('video-folder-view').style.display = 'none';
    document.getElementById('video-list-view').style.display = 'block';
    document.getElementById('active-game-title').innerText = "Video " + judul;
    document.getElementById('render-videos').innerHTML = vidsData[id].map((v, i) => `
        <div class="video-card">
            <video src="${v}" controls style="width: 100%; max-width: 100%; height: auto; max-height: 400px; background: #000; object-fit: contain;"></video>
            <a href="${v}" download><i class="fa-solid fa-download"></i> Unduh Part ${i+1}</a>
        </div>`).join('');
}
function closeVideo() {
    document.getElementById('video-folder-view').style.display = 'grid';
    document.getElementById('video-list-view').style.display = 'none';
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
