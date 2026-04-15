/**
 * TEAM LUPO - SAAS LOGIC (FULL VERSION)
 */

const PASS_SNK = "666Lupo666";
const TEAM_PIN = "1234"; // PIN Global
const URL_API_POSTBACK = "https://script.google.com/macros/s/AKfycbw656yd8oN35SUENaZR1nh1vS2NDsWOrYoDWIE8GyPaIc0BLv98SGBukMEesRG4-QM99Q/exec";

let globalPostbackData = []; 
let statusChartInstance = null; 
let autoRefreshInterval = null;

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
    if (pin === TEAM_PIN) {
        sessionStorage.setItem("lupo_pin", pin); 
        
        document.getElementById('user-name-display').innerText = "Team Lupo";
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        
        fetchPostbackData();
        
        // AUTO REFRESH
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

// --- DARK/LIGHT TOGGLE ---
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const icon = document.querySelector('#theme-btn i');
    if (document.body.classList.contains('light-mode')) {
        icon.className = 'fa-solid fa-moon';
    } else {
        icon.className = 'fa-solid fa-sun';
    }
}

// --- NAVIGASI DASHBOARD ---
function showPage(pageId, btnElement) {
    document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(pageId).style.display = 'block';
    if(btnElement) btnElement.classList.add('active');
    
    // Title map diperbarui dengan S&K
    const titleMap = {
        'page-postback': 'Dashboard Overview',
        'page-ranking': 'Leaderboard Tim 🔥',
        'page-link': 'Akses Link MyLead',
        'page-video': 'Library Video Promosi',
        'page-jam': 'Rekomendasi Waktu Spam',
        'page-snk': 'Syarat & Ketentuan',
        'page-tutorial': 'Video Tutorial & Panduan' // <-- INI BARIS TAMBAHANNYA
    };
    document.getElementById('topbar-text').innerText = titleMap[pageId];
}

function checkSnk() {
    let p = prompt("Masukkan Sandi Admin:"); 
    if(p === PASS_SNK) {
        // Cari tombol S&K di sidebar untuk diberi class active
        const btnMenu = document.querySelector('button[onclick="checkSnk()"]');
        showPage('page-snk', btnMenu);
    } else if(p !== null) {
        alert("Akses Ditolak: Sandi Salah!"); 
    }
}

// --- API DATA & TRANSLATOR ---
function terjemahkanStatus(rawStatus) {
    let s = rawStatus ? String(rawStatus).toLowerCase().trim() : '';
    if (s === '0' || s === 'approve' || s === 'accepted') return 'approve';
    if (s === '1' || s === 'pending') return 'pending';
    if (s === '2' || s === 'rejected') return 'rejected';
    if (s === '3' || s === 'pre_approve') return 'pre_approve';
    if (s === '[status]') return 'approve'; 
    return 'rejected'; 
}

function fetchPostbackData() {
    const refreshBtn = document.querySelector('.btn-refresh i');
    if(refreshBtn) refreshBtn.classList.add('fa-spin');

    fetch(URL_API_POSTBACK + "?t=" + new Date().getTime())
        .then(response => response.json())
        .then(data => {
            globalPostbackData = data.reverse(); 
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
    const uniqueSubIds = [...new Set(globalPostbackData.map(item => item.ml_sub1))].filter(Boolean);
    select.innerHTML = '<option value="all">Semua Sub-ID</option>';
    uniqueSubIds.forEach(subId => { select.innerHTML += `<option value="${subId}">${subId}</option>`; });
}

function applyFilter() {
    const filterSubId = document.getElementById('filter-subid').value;
    const filterStatus = document.getElementById('filter-status').value.toLowerCase();

    const filteredData = globalPostbackData.filter(row => {
        const matchSubId = filterSubId === 'all' || row.ml_sub1 === filterSubId;
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
        let baris = `${row.waktu},${row.ml_sub1},${row.program_name},${row.country_code},${row.payout_decimal},${statusTeks}`;
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

// ==========================================
// 🚀 FITUR BARU: LOGIKA LEADERBOARD BERDASARKAN WAKTU
// ==========================================

let currentRankFilter = 'all'; // Default: Tampilkan semua

function changeRankFilter(filterType, btnElement) {
    currentRankFilter = filterType;
    // Ubah tampilan tombol aktif
    document.querySelectorAll('.btn-rank-filter').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    // Update tabel
    applyFilter();
}

// Fungsi untuk membaca tanggal dari format "dd/MM/yyyy HH:mm:ss"
function parseDateString(dateStr) {
    if (!dateStr || dateStr === '-') return new Date(0);
    const parts = dateStr.split(' ');
    const dmy = parts[0].split('/');
    // Format: Tahun, Bulan (0-11), Hari
    return new Date(dmy[2], dmy[1] - 1, dmy[0]);
}

function renderLeaderboard(data) {
    let kalkulasi = {};
    const skrg = new Date();
    
    // Set jam ke 00:00:00 agar perbandingan hari lebih akurat
    const hariIni = new Date(skrg.getFullYear(), skrg.getMonth(), skrg.getDate());

    data.forEach(row => {
        if (terjemahkanStatus(row.status) === 'approve') {
            const tglData = parseDateString(row.waktu);
            let lolosFilter = false;

            // Logika Penyaringan Waktu
            if (currentRankFilter === 'all') {
                lolosFilter = true;
            } else if (currentRankFilter === 'today') {
                if (tglData.getTime() === hariIni.getTime()) lolosFilter = true;
            } else if (currentRankFilter === 'weekly') {
                const selisihHari = (hariIni - tglData) / (1000 * 60 * 60 * 24);
                if (selisihHari <= 7 && selisihHari >= 0) lolosFilter = true;
            } else if (currentRankFilter === 'monthly') {
                if (tglData.getMonth() === skrg.getMonth() && tglData.getFullYear() === skrg.getFullYear()) lolosFilter = true;
            }

            if (lolosFilter) {
                let nama = row.ml_sub1 ? row.ml_sub1.toUpperCase() : 'UNKNOWN';
                let dolar = parseFloat(row.payout_decimal) || 0;

                if (!kalkulasi[nama]) {
                    kalkulasi[nama] = { leads: 0, pendapatan: 0 };
                }
                kalkulasi[nama].leads += 1;
                kalkulasi[nama].pendapatan += dolar;
            }
        }
    });

    // Urutkan dari yang paling cuan
    let arrayRanking = Object.keys(kalkulasi).map(kunci => {
        return { nama: kunci, ...kalkulasi[kunci] };
    });
    arrayRanking.sort((a, b) => b.pendapatan - a.pendapatan);

    const tbody = document.getElementById('tabel-ranking-body');
    tbody.innerHTML = '';

    if (arrayRanking.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Belum ada data untuk periode ini.</td></tr>';
        return;
    }

    arrayRanking.forEach((member, index) => {
        let rankNumber = index + 1;
        let piala = rankNumber;
        if(rankNumber === 1) piala = '<i class="fa-solid fa-trophy medal rank-1"></i>';
        if(rankNumber === 2) piala = '<i class="fa-solid fa-medal medal rank-2"></i>';
        if(rankNumber === 3) piala = '<i class="fa-solid fa-medal medal rank-3"></i>';

        tbody.innerHTML += `
            <tr>
                <td class="text-center" style="font-weight:700;">${piala}</td>
                <td class="text-blue" style="font-weight:700;">${member.nama}</td>
                <td style="font-weight:600;">${member.leads} Leads</td>
                <td class="text-green" style="font-weight:700;">$ ${member.pendapatan.toFixed(2)}</td>
            </tr>`;
    });
}

// --- RENDER TABEL & CHART ---
function renderTable(data) {
    const tbody = document.getElementById('tabel-postback-body');
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

        tbody.innerHTML += `
            <tr>
                <td class="text-muted">${row.waktu || '-'}</td>
                <td style="font-weight: 600;" class="text-blue">${row.ml_sub1 || '-'}</td>
                <td>${row.program_name || '-'}</td>
                <td style="font-weight: 600;">${row.country_code ? row.country_code.toUpperCase() : '-'}</td>
                <td class="text-green" style="font-weight: 600;">$${row.payout_decimal || '0'}</td>
                <td><span class="badge-status ${badgeClass}">${namaStatus}</span></td>
            </tr>
        `;
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
                borderWidth: 2,
                hoverOffset: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } },
            cutout: '75%' 
        }
    });
}

// --- FUNGSI LINK LOKAL & VIDEO (DIKEMBALIKAN PENUH) ---
const linksData = {
    'thorfin': { monopoly: "https://tinyurl.com/yadtctrk", dicedreams: "https://tinyurl.com/a9yfkaup", travel: "https://tinyurl.com/3esk5wtj", gossip: "https://tinyurl.com/5469kxp7"},
    'poseidon': { monopoly: "https://tinyurl.com/mtd6uwhw", dicedrems: "https://tinyurl.com/2unv3yv2", travel: "https://tinyurl.com/y9j29w6t", gossip: "https://tinyurl.com/muxk8ze6"},
    'luxury33': { monopoly: "https://tinyurl.com/zc9zbust", dicedreams: "https://tinyurl.com/mszxnme8", travel: "https://tinyurl.com/26tefvej", gossip: "https://tinyurl.com/y494w6nt" },
    'batako': { monopoly: "https://tinyurl.com/5n8mvu3y", dicedreams: "https://tinyurl.com/2kkf495x", travel: "https://tinyurl.com/42avcdk7", gossip: "https://tinyurl.com/3cuhjtmz" },
    'kahuna': { monopoly: "https://tinyurl.com/2pzzwz6e", dicedreams: "https://tinyurl.com/pu3w5k3", travel: "https://tinyurl.com/mpjr8eck", gossip: "https://tinyurl.com/3kz2mvu4" },
    'angin': { monopoly: "https://tinyurl.com/5n98ww92", dicedreams: "https://tinyurl.com/mt8rr4r3", travel: "https://tinyurl.com/47xer297", gossip: "https://tinyurl.com/rmddn4p"},
    'hiltopia': { monopoly: "https://tinyurl.com/3259y237", dicedreams: "https://tinyurl.com/3j3cmkm6", travel: "https://tinyurl.com/3mf3vfs6", gossip: "https://tinyurl.com/yc43wh6k" }, 
    'ucup': { travel: "https://tinyurl.com/yfy697c2", gossip: "https://tinyurl.com/k57ssmwe" }
};

const vidsData = {
    'monopoly': ['video-monopoly-1.mp4'], 
    'gossip': ['video-gossip-1.mp4'],
    'match': ['video-match-1.mp4'], 
    'travel': ['video-travel-1.mp4'], 
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
                <span>${game}</span>
                <input type="text" value="${url}" id="in-${id}-${game}" readonly>
                <button class="btn-refresh" onclick="copyFunc('in-${id}-${game}', this)"><i class="fa-solid fa-copy"></i> Salin</button>
            </div>`;
    }
}
function backToMembers() {
    document.getElementById('detail-link').style.display = 'none';
    document.getElementById('list-member').style.display = 'grid';
}
function copyFunc(id, btn) {
    const input = document.getElementById(id);
    input.select(); navigator.clipboard.writeText(input.value);
    btn.innerHTML = "<i class='fa-solid fa-check'></i> Disalin"; 
    btn.style.background = "#10b981";
    setTimeout(() => { 
        btn.innerHTML = "<i class='fa-solid fa-copy'></i> Salin"; 
        btn.style.background = "var(--primary)"; 
    }, 1500);
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