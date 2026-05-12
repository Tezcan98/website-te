const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring'); 
const url = require('url');
const net = require('net');
const WebSocket = require('ws');
const renderer = require('./db-renderer');
const productsRenderer = require('./products-renderer');
const hostname = '0.0.0.0';
const port = 3000;

// ===== MQTT BROKER AYARLARI =====
const MQTT_BROKER_HOST = '31.58.245.116';
const MQTT_BROKER_PORT = 1883;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname; // Query parametrelerini içermeyen URL yolu
  const query = parsedUrl.query; // Query parametreleri object olarak
  const method = req.method;

  // 1. GET İstekleri (Dosya Yönlendirmeleri)
  if (method === 'GET') {
    let fileName;
    
    if (pathname === '/') {
    
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(renderer.renderIndex());
  return;
}
else if (pathname === '/urunler') {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(productsRenderer.renderProductList());
  return;
}
// Ürün detay
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
    // Başarılı kayıttan sonra yönlendirilen kontrol paneli
    else if (pathname === '/control-panel') {
      fileName = 'control-panel.html';
      
      // Query parametrelerini konsola yazdır (opsiyonel)
      if (query.device) {
        console.log(`Control panel erişimi - Cihaz ID: ${query.device}`);
      }
    }
    // APK dosyası gibi statik dosyaları yönetme
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
    
    // HTML dosyalarını okuma ve gönderme
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
  
  // 2. POST İstekleri (Cihaz Kayıt Doğrulama)
  else if (method === 'POST' && pathname === '/kayit-dogrula') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      const postData = querystring.parse(body);
      const deviceCode = postData.deviceCode; // Form alanının 'name' özelliği 'deviceCode' olmalı
      
      console.log(`Cihaz kayıt talebi alındı - Kod: ${deviceCode}`);
      
      // Başarılı doğrulama örneği
      if (deviceCode === '123456') {
        console.log(`BAŞARILI KAYIT: Cihaz kodu doğrulandı - ${deviceCode}`);
        // Başarılıysa /control-panel'e yönlendir (query parametresi ile)
        res.writeHead(302, { 'Location': `/control-panel?device=${deviceCode}` });
        res.end();
      } else {
        console.log(`BAŞARISIZ KAYIT: Geçersiz cihaz kodu - ${deviceCode}`);
        // Başarısızsa kullanıcıya hata göster veya /iosekrani'ye geri yönlendir
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<h1>Hata: Geçersiz Cihaz Kodu</h1><p>Girdiğiniz kod: ${deviceCode}. Lütfen <a href="/iosekrani">tekrar deneyin</a>.</p>`);
      }
    });
  }
  
  // Diğer tüm istekleri ele al
  else {
    console.log(`405: Desteklenmeyen HTTP metodu - ${method} ${pathname}`);
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('405: Desteklenmeyen Metot');
  }
});

// ===== WEBSOCKET PROXY: Tarayıcı <-> MQTT Broker =====
// Bu proxy sayesinde tarayıcı, sayfayla aynı origin üzerinden
// WebSocket ile bağlanır, sunucu da TCP üzerinden MQTT broker'a
// bağlanır. Böylece WSS/SSL sertifikası sorunu ortadan kalkar.
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  console.log('WebSocket istemcisi bağlandı - Proxy oluşturuluyor...');
  
  // MQTT Broker'a TCP bağlantısı
  const mqttSocket = net.createConnection(MQTT_BROKER_PORT, MQTT_BROKER_HOST, () => {
    console.log('MQTT Broker\'a bağlantı kuruldu');
  });

  // WebSocket'ten gelen veriyi MQTT Broker'a ilet
  ws.on('message', (data) => {
    // data Buffer veya string olabilir, Buffer'a çevir
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    mqttSocket.write(buffer);
  });

  // MQTT Broker'dan gelen veriyi WebSocket'e ilet
  mqttSocket.on('data', (data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });

  // Bağlantı kapanma olayları
  ws.on('close', () => {
    console.log('WebSocket istemcisi bağlantıyı kapattı');
    mqttSocket.end();
  });

  mqttSocket.on('close', () => {
    console.log('MQTT Broker bağlantısı kapandı');
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  mqttSocket.on('error', (err) => {
    console.error('MQTT Broker hatası:', err.message);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send('MQTT_BROKER_ERROR');
      ws.close();
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket hatası:', err.message);
    mqttSocket.end();
  });
});

wss.on('error', (err) => {
  console.error('WebSocket Sunucu hatası:', err.message);
});

server.listen(port, hostname, () => {
  console.log(`Sunucu çalışıyor: http://${hostname}:${port}/`);
  console.log(`WebSocket MQTT Proxy aktif: ws://${hostname}:${port}`);
  console.log(`iOS/Windows Giriş Sayfası: http://${hostname}:${port}/iosekrani`); 
});