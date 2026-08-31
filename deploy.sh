#!/usr/bin/env bash
# Sunucuda çalıştırılır: git'teki son hali çeker ve website.service'i yeniden başlatır.
# Kullanım: sunucuda  ./deploy.sh
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "==> En son değişiklikler çekiliyor..."
git fetch origin
git reset --hard origin/master

echo "==> Bağımlılıklar kontrol ediliyor..."
npm install --omit=dev

echo "==> Servis yeniden başlatılıyor..."
systemctl restart website.service

echo "==> Durum:"
systemctl status website.service --no-pager -l | head -10
