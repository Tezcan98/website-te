const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring'); 
const url = require('url');

const hostname = '0.0.0.0';
const port = 3000;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname; // Query parametrelerini içermeyen URL yolu
  const query = parsedUrl.query; // Query parametreleri object olarak
  const method = req.method;



  // 1. GET İstekleri (Dosya Yönlendirmeleri)
  if (method === 'GET') {
    let fileName;
    
    if (pathname === '/') {
      fileName = 'index.html';
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

server.listen(port, hostname, () => {
  console.log(`Sunucu çalışıyor: http://${hostname}:${port}/`);
  console.log(`iOS/Windows Giriş Sayfası: http://${hostname}:${port}/iosekrani`); 
});
