/**
 * ====================================================================
 * VERSİYON SUNUCUSU - Sürüm Yönetim Sistemi v1.0
 * ====================================================================
 * 
 * AMAÇ:
 *   Tek bir kaynak (app.json) üzerinden sürüm yönetimi sağlar.
 *   app.json'daki version alanını değiştirin, hem server hem mobil
 *   uygulama otomatik güncellensin.
 * 
 * ÇALIŞTIRMA:
 *   node version-server.js
 *   
 *   Server'da daemon olarak çalıştırma:
 *     pm2 start version-server.js --name "version-server"
 *     veya: screen -dmS version node version-server.js
 * 
 * ENDPOINT'LER:
 *   GET /versiyon      → Versiyon + bildiri mesajı
 *   GET /app-versiyon  → Sadece app.json'daki versiyon
 *   GET /cihaz-kayit   → Cihaz kayıt sayfasına yönlendirme
 *   GET /health        → Sunucu sağlık kontrolü
 * 
 * VERSİYON GÜNCELLEME:
 *   Sadece app.json dosyasındaki "version" alanını değiştirin.
 *   Örn: "version": "1.0.0" → "version": "1.1.0"
 *   Sunucu değişikliği otomatik algılar, yeniden başlatmaya gerek yok!
 * 
 * BİLDİRİ MESAJI:
 *   config.ini dosyasını düzenleyin:
 *     [app]
 *     notification = Buraya bildirim mesajınızı yazın
 *   Mobil uygulama her açılışta bu mesajı push notification olarak gösterir.
 *   Aynı mesaj tekrar gösterilmez (sadece içerik değişirse tekrar gösterilir).
 * 
 * DAHA FAZLA BİLGİ:
 *   protokol.md → "API Endpoint'leri" bölümü
 * ====================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// --- .ini PARSER (harici kütüphane gerekmez) ---
function parseIni(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = {};
  let currentSection = null;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;

    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      result[currentSection] = {};
      continue;
    }

    const keyMatch = line.match(/^([^=]+)=(.*)$/);
    if (keyMatch && currentSection) {
      const key = keyMatch[1].trim();
      const value = keyMatch[2].trim();
      result[currentSection][key] = value;
    }
  }
  return result;
}

// --- APP.JSON OKUYUCU (config.ini'de version yoksa yedek kaynak) ---
function getAppVersionFromJson() {
  try {
    const appJsonPath = path.join(__dirname, 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
    return appJson.expo?.version || null;
  } catch (err) {
    return null;
  }
}

// --- YAPILANDIRMA ---
const INI_PATH = path.join(__dirname, 'config.ini');
const PORT = 5005;
const HOST = '0.0.0.0';

// config.ini'de device_registration_url yoksa varsayılan
const DEFAULT_REGISTRATION_URL = 'https://te-robotik.com.tr/cihaz-kayit';

function loadConfig() {
  let notificationMessage = '';
  let deviceRegistrationUrl = DEFAULT_REGISTRATION_URL;
  let versionFromIni = null;

  try {
    if (fs.existsSync(INI_PATH)) {
      const ini = parseIni(INI_PATH);
      notificationMessage = ini.app?.notification?.trim() || '';
      deviceRegistrationUrl = ini.app?.device_registration_url?.trim() || DEFAULT_REGISTRATION_URL;
      versionFromIni = ini.app?.version?.trim() || null;
    }
  } catch (err) {
    console.error('config.ini okunamadı:', err.message);
  }

  return {
    notificationMessage,
    deviceRegistrationUrl,
    versionFromIni,
  };
}

// Öncelik: config.ini'deki [app] version -> app.json -> '0.0.0'
function resolveVersion(config) {
  return config.versionFromIni || getAppVersionFromJson() || '0.0.0';
}

let CONFIG = loadConfig();
let CACHED_VERSION = resolveVersion(CONFIG);

// --- OTOMATİK YENİDEN YÜKLEME ---

// config.ini değişikliği (versiyon artık öncelikli olarak burada okunuyor)
try {
  fs.watch(INI_PATH, () => {
    console.log('config.ini değişti, yeniden yükleniyor...');
    CONFIG = loadConfig();
    const newVersion = resolveVersion(CONFIG);
    if (newVersion !== CACHED_VERSION) {
      CACHED_VERSION = newVersion;
      console.log(`🚀 Versiyon güncellendi: ${CACHED_VERSION}`);
    }
    console.log(`Yeni bildiri: ${CONFIG.notificationMessage || 'Yok'}`);
  });
} catch (e) {
  // config.ini yoksa sorun değil
}

// app.json değişikliği (sadece config.ini'de version tanımlı değilse etkili olur)
try {
  const APP_JSON_PATH = path.join(__dirname, 'app.json');
  fs.watch(APP_JSON_PATH, () => {
    const newVersion = resolveVersion(CONFIG);
    if (newVersion !== CACHED_VERSION) {
      CACHED_VERSION = newVersion;
      console.log(`🚀 Versiyon güncellendi: ${CACHED_VERSION}`);
    }
  });
} catch (e) {
  console.error('app.json izlenemiyor:', e.message);
}

// --- CORS ---
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

// --- İSTEK İŞLEYİCİ ---
const handleRequest = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  setCorsHeaders(res);

  // Ana versiyon endpoint'i (mobil uygulama burayı kullanır)
  if (pathname === '/versiyon' && req.method === 'GET') {
    const response = {
      versiyon: CACHED_VERSION,
      bildiri: CONFIG.notificationMessage,
      timestamp: new Date().toISOString(),
      status: 'success'
    };
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(response, null, 2));
    return;
  }

  // Sadece versiyon bilgisi (mobil uygulama alternatif)
  if (pathname === '/app-versiyon' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      version: CACHED_VERSION,
      timestamp: new Date().toISOString()
    }, null, 2));
    return;
  }

  // Cihaz kayıt yönlendirme
  if (pathname === '/cihaz-kayit' && req.method === 'GET') {
    const redirectUrl = CONFIG.deviceRegistrationUrl;
    res.writeHead(302, { 'Location': redirectUrl });
    res.end(`Yönlendiriliyor: ${redirectUrl}`);
    return;
  }

  // Sağlık kontrolü
  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'ok',
      version: CACHED_VERSION,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }, null, 2));
    return;
  }

  // Ana sunucunun web sayfalarını proxy'le (opsiyonel)
  // Varsayılan olarak website-te/server.js 3000 portunda çalışır
  // Bu server 5005 portunda sadece API hizmeti verir

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ status: 'error', message: 'Endpoint bulunamadı' }));
};

// --- SUNUCU ---
const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  console.log('============================================');
  console.log('  VERSİYON SUNUCUSU ÇALIŞIYOR');
  console.log('============================================');
  console.log(`  Port:       ${PORT}`);
  console.log(`  Host:       ${HOST}`);
  console.log(`  Versiyon:   ${CACHED_VERSION}`);
  console.log(`  Bildiri:    ${CONFIG.notificationMessage || 'Yok'}`);
  console.log(`  Kayıt URL:  ${CONFIG.deviceRegistrationUrl}`);
  console.log('============================================');
  console.log('');
  console.log('  Endpoint\'ler:');
  console.log(`  GET http://localhost:${PORT}/versiyon`);
  console.log(`  GET http://localhost:${PORT}/app-versiyon`);
  console.log(`  GET http://localhost:${PORT}/cihaz-kayit`);
  console.log(`  GET http://localhost:${PORT}/health`);
  console.log('');
  console.log('  Versiyon güncellemek için:');
  console.log('  app.json → "version" alanını değiştirin');
  console.log('  Otomatik algılanır, restart gerekmez!');
  console.log('============================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Sunucu kapatılıyor...');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('Sunucu kapatılıyor...');
  server.close(() => process.exit(0));
});