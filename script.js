// 1. Skalierung: Passt die 1920x1080 Stage an den Bildschirm an
function scaleStage() {
    const stage = document.getElementById('stage');
    if (!stage) return;
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = `scale(${s})`;
}

// Sofort ausführen und bei Größenänderung
window.addEventListener('resize', scaleStage);
scaleStage();

const apiMapping = [
    { key: 'fajr', de: 'Morgengebet', tr: 'Sabah', prayer: true },
    { key: 'sun', de: 'Sonnenaufgang', tr: 'Güneş', prayer: false }, // "sun" korrigiert
    { key: 'dhuhr', de: 'Mittag', tr: 'Öğle', prayer: true },
    { key: 'asr', de: 'Nachmittag', tr: 'İkindi', prayer: true },
    { key: 'maghrib', de: 'Abend', tr: 'Akşam', prayer: true },
    { key: 'isha', de: 'Nachgebet', tr: 'Yatsı', prayer: true }
];

let prayerData = [];

async function fetchPrayers() {
    const listLabel = document.getElementById('g-date-short');
    try {
        // Proxy für die CORS-Blockade
        const apiUrl = encodeURIComponent('https://prayertimes.api.abdus.dev/api/diyanet/prayertimes?location_id=10409');
        const response = await fetch('https://corsproxy.io/?' + apiUrl);
        if (!response.ok) throw new Error("API-Server nicht erreichbar");
        
        const data = await response.json();
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localDate = new Date(now - offset).toISOString().split('T')[0];
        
        // StartsWith damit der heutige Tag sicher gefunden wird
        const todayData = data.find(day => day.date.startsWith(localDate)) || data[0];

        prayerData = apiMapping.map(m => ({
            nameDe: m.de, nameTr: m.tr, time: todayData[m.key], isPrayer: m.prayer
        }));

        renderList();
        updateCountdown();
    } catch (error) {
        console.error("Fehler bei den Gebetszeiten:", error);
        if (listLabel) listLabel.innerHTML = `<span style='color:red'>Fehler: ${error.message}</span>`;
    }
}

function toDate(t) {
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}

function getNextPrayer() {
    if(!prayerData.length) return null;
    const now = new Date();
    const next = prayerData.filter(p => p.isPrayer).find(p => toDate(p.time) > now);
    return next || prayerData.find(p => p.isPrayer); // Falls alle vorbei, nimm Fajr
}

function renderList() {
    const next = getNextPrayer();
    const html = prayerData.map(p => {
        const active = next && p.isPrayer && p.nameDe === next.nameDe;
        return `
            <div class="flex items-center justify-between rounded-2xl px-6 py-[14px] transition ${active ? 'text-white' : 'bg-gray-50'}"
                 style="${active ? 'background:linear-gradient(120deg,#009972,#007a5b);' : ''}">
              <div class="flex flex-col">
                <span class="text-[24px] font-bold leading-none ${active?'':'text-black'}">${p.nameDe}</span>
                <span class="text-[16px] font-medium ${active?'text-white/70':'text-accent'} uppercase mt-1">${p.nameTr}</span>
              </div>
              <span class="tnum text-[30px] font-extrabold ${active?'':'text-black'}">${p.time}</span>
            </div>`;
    }).join('');
    document.getElementById('prayer-list').innerHTML = html;
    document.getElementById('sabah-time-highlight').textContent = prayerData[0].time;
}

function updateCountdown() {
    const next = getNextPrayer();
    if(!next) return;
    const now = new Date();
    let target = toDate(next.time);
    if (target <= now) target.setDate(target.getDate() + 1);
    let diff = Math.floor((target - now) / 1000);
    const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60;
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('countdown').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    document.getElementById('next-name-tr').textContent = next.nameTr;
    document.getElementById('next-name-de').textContent = next.nameDe;
    document.getElementById('next-time').textContent = next.time;
}

function updateClock() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('clock').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function updateDates() {
    const now = new Date();
    const de = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const deShort = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    const hijri = new Intl.DateTimeFormat('de-DE-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' });
    
    document.getElementById('g-date').textContent = de.format(now);
    document.getElementById('g-date-short').textContent = deShort.format(now);
    document.getElementById('h-date').textContent = hijri.format(now) + ' H';
}


// --- GOOGLE DRIVE INTEGRATION ---
let slides = []; 
let currentSlide = 0;

async function fetchDriveData() {
    try {
        // !!! HIER DEINEN KOPIERTEN GOOGLE SCRIPT LINK EINTRAGEN !!!
        const scriptUrl = 'https://script.google.com/macros/s/AKfycbwVIIgcs51775cvTJYDuSbyWPh5-qy1oYuAZv4uW1vmEuUWIZkRdI8W0Z-MFStwoIQi/exec';
        
        const response = await fetch(scriptUrl);
        const data = await response.json();
        
        // 1. Ticker aktualisieren
        if (data.ticker) {
            document.getElementById('ticker-text').textContent = data.ticker;
        }
        
        // 2. Slides aktualisieren
        if (data.images && data.images.length > 0) {
            slides = data.images.map(url => ({ img: url }));
            initSlides();
        }
    } catch (error) {
        console.error("Fehler beim Laden von Google Drive:", error);
    }
}

function initSlides() {
    const showEl = document.getElementById('slideshow');
    const dotsEl = document.getElementById('dots');
    
    // Leeren für den Fall, dass Bilder im Drive geändert wurden
    showEl.innerHTML = '';
    dotsEl.innerHTML = '';
    currentSlide = 0; 

    if (slides.length === 0) return;

    slides.forEach((sl, i) => {
        const d = document.createElement('div');
        d.className = 'slide' + (i === 0 ? ' active' : '');
        d.style.backgroundImage = `url('${sl.img}')`;
        showEl.appendChild(d);
        
        const dot = document.createElement('span');
        dot.style.cssText = 'width:12px;height:12px;border-radius:99px;transition:.4s;background:' + (i === 0 ? '#009972' : 'rgba(0,0,0,0.2)');
        dotsEl.appendChild(dot);
    });
}

function goSlide(n) {
    const els = document.querySelectorAll('.slide');
    const dots = document.getElementById('dots').children;
    if (!els.length || els.length <= 1) return;
    
    els[currentSlide].classList.remove('active');
    dots[currentSlide].style.background = 'rgba(0,0,0,0.2)';
    currentSlide = (n + slides.length) % slides.length;
    els[currentSlide].classList.add('active');
    dots[currentSlide].style.background = '#009972';
}

// Start-Sequenz
updateDates();
fetchPrayers();
fetchDriveData(); 
scaleStage();

setInterval(updateClock, 1000);
setInterval(updateCountdown, 1000);
setInterval(() => goSlide(currentSlide + 1), 8000);

// Automatische Aktualisierungen im Hintergrund
setInterval(fetchDriveData, 30 * 60 * 1000); // Drive Daten alle 30 Min checken
setInterval(fetchPrayers, 6 * 60 * 60 * 1000); // Gebetszeiten alle 6 Stunden neu laden
