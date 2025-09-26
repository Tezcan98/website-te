const http = require('http');
const fs = require('fs');
const path = require('path');

const hostname = '0.0.0.0';  // Tüm dış bağlantılara izin verir
const port = 3000;

const server = http.createServer((req, res) => {
  // index.html yolunu bul
  const filePath = path.join(__dirname, 'index.html');

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Sunucu hatası');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    }
  });
});

server.listen(port, hostname, () => {
  console.log(`Sunucu çalışıyor: http://${hostname}:${port}/`);
});
