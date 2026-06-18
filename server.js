const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring'); 
const url = require('url');
const mqtt = require('mqtt');
const productsRenderer = require('./products-renderer');
const hostname = '0.0.0.0';
const port = 3000;

// ===== MQTT AYARLARI =====
const MQTT_CONFIG = { 
    host: '31.58.245.116', 
    port: 1883,
    username: 'myuser', 
    password: 'qwert159' 
};

let mqttClient = null;
let lastStatusData = {}; // deviceCode -> { status, timerValue }
const sseClients = []; // SSE bağlantıları

// MQTT bağlantısını başlat
function connectMQTT() {
    const clientId = 'server_' + Math.random().toString(16).substr(2, 8);
    
    mqttClient = mqtt.connect('mqtt://' + MQTT_CONFIG.host, {
        clientId: clientId,
        username: MQTT_CONFIG.username,
        password: MQTT_CONFIG.password,
        keepalive: 60,
        reconnectPeriod: 1000,
        clean: true
    });

    mqttClient.on('connect', () => {
        console.log('MQTT Broker\'a bağlanıldı');
        // Tüm cevap konularına abone ol
        mqttClient.subscribe('cevap/+/#', { qos: 1 });
    });

    mqttClient.on('message', (topic, message) => {
        const msgStr = message.toString();
        const topicParts = topic.split('/');
        if (topicParts.length >= 2) {
            const deviceCode = topicParts[1];
            const payloadParts = msgStr.split('/');
            
            if (payloadParts[0] === '0' || payloadParts[0] === 'STATUS') {
                const statusData = {
                    status: parseInt(payloadParts[1]) || 0,
                    timerValue: parseInt(payloadParts[2]) || 0
                };
                lastStatusData[deviceCode] = statusData;
                console.log(`STATUS güncellendi - ${deviceCode}:`, JSON.stringify(statusData));
                
                // SSE ile tüm bağlı istemcilere gönder
                sendSSE({ type: 'status', device: deviceCode, data: statusData });
            }
        }
    });

    mqttClient.on('error', (err) => {
        console.error('MQTT Hatası:', err.message);
    });

    mqttClient.on('close', () => {
        console.log('MQTT bağlantısı kapandı');
    });

    mqttClient.on('reconnect', () => {
        console.log('MQTT yeniden bağlanıyor...');
    });
}

// MQTT'yi başlat
connectMQTT();

// ===== SSE ENDPOINT: Anlık bildirimler =====
function sendSSE(data) {
    sseClients.forEach(res => {
        try {
            res.write('data: ' + JSON.stringify(data) + '\n\n');
        } catch(e) {
            // client kapandıysa sil
        }
    });
}

function removeSSEClient(res) {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  const method = req.method;

  // ===== SSE ENDPOINT =====
  if (pathname === '/api/events') {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    res.write('\n');
    
    sseClients.push(res);
    console.log('SSE istemcisi bağlandı. Toplam:', sseClients.length);
    
    req.on('close', () => {
        removeSSEClient(res);
        console.log('SSE istemcisi ayrıldı. Kalan:', sseClients.length);
    });
    return;
  }

  // ===== API ENDPOINT'LERİ =====
  
  // Ping - sunucu çalışıyor mu?
  if (pathname === '/api/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
    return;
  }
  
  // MQTT komut gönder
  if (pathname === '/api/mqtt-send' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!mqttClient || !mqttClient.connected) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'MQTT bağlı değil' }));
          return;
        }
        mqttClient.publish(data.topic, data.message, { qos: 1 });
        console.log(`MQTT gönderildi - Topic: ${data.topic}, Mesaj: ${data.message}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }
  
  // MQTT durum sorgula
  if (pathname === '/api/mqtt-query') {
    const deviceCode = query.device || '';
    const statusData = lastStatusData[deviceCode];
    
    if (statusData) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, status: statusData.status, timerValue: statusData.timerValue }));
    } else {
      // Status datası yoksa STATUS komutu gönder
      if (mqttClient && mqttClient.connected && deviceCode) {
        mqttClient.publish('emir/' + deviceCode, '0', { qos: 1 });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, status: -1, timerValue: 0, message: 'Sorgu gönderildi, henüz yanıt alınmadı' }));
    }
    return;
  }

  // ===== NORMAL SAYFA İSTEKLERİ =====
  if (method === 'GET') {
    let fileName;
    
if (pathname === '/') {
    fileName = 'index.html';

}
else if (pathname === '/urunler') {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(productsRenderer.renderProductList());
  return;
}
else if (pathname.startsWith('/urun/')) {
  var productId = pathname.replace('/urun/', '');
  var html = productsRenderer.renderProductDetail(productId);
  if (html) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404: Ürün bulunamadı');
  }
  return;
}
    else if (pathname === '/iosekrani') {
      fileName = 'ios.html';
    }   
    else if (pathname === '/cihazkayit') {
      fileName = 'init.html';
    } 
    else if (pathname === '/control-panel') {
      fileName = 'control-panel.html';
      if (query.device) {
        console.log(`Control panel erişimi - Cihaz ID: ${query.device}`);
      }
    }
    else if (pathname.endsWith('.apk')) {
        const filePath = path.join(__dirname, pathname);
        fs.readFile(filePath, (err, content) => {
            if (err) {
                console.log(`APK HATASI: ${pathname} dosyası bulunamadı`);
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404: Dosya bulunamadı.');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/vnd.android.package-archive' });
            res.end(content);
        });
        return;
    }
    else {
      console.log(`404: Bilinmeyen sayfa istendi - ${pathname}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404: Sayfa bulunamadı');
      return;
    }

    const filePath = path.join(__dirname, fileName);
    
    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
           console.log(`HATA: Dosya bulunamadı - ${fileName}`);
           res.writeHead(404, { 'Content-Type': 'text/plain' });
           res.end(`404: İstenen sayfa bulunamadı: ${fileName}`);
        } else {
           console.log(`SUNUCU HATASI: ${err.message}`);
           res.writeHead(500, { 'Content-Type': 'text/plain' });
           res.end('Sunucu hatası');
        }
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      }
    });
  }
  
  else if (method === 'POST' && pathname === '/kayit-dogrula') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      const postData = querystring.parse(body);
      const deviceCode = postData.deviceCode;
      
      console.log(`Cihaz kayıt talebi alındı - Kod: ${deviceCode}`);
      
      if (deviceCode === '123456') {
        console.log(`BAŞARILI KAYIT: Cihaz kodu doğrulandı - ${deviceCode}`);
        res.writeHead(302, { 'Location': `/control-panel?device=${deviceCode}` });
        res.end();
      } else {
        console.log(`BAŞARISIZ KAYIT: Geçersiz cihaz kodu - ${deviceCode}`);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<h1>Hata: Geçersiz Cihaz Kodu</h1><p>Girdiğiniz kod: ${deviceCode}. Lütfen <a href="/iosekrani">tekrar deneyin</a>.</p>`);
      }
    });
  }
  
  else {
    console.log(`405: Desteklenmeyen HTTP metodu - ${method} ${pathname}`);
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('405: Desteklenmeyen Metot');
  }
});

server.listen(port, hostname, () => {
  console.log(`Sunucu çalışıyor: http://${hostname}:${port}/`);
  console.log(`iOS/Windows Giriş Sayfası: http://${hostname}:${port}/iosekrani`); 
});
