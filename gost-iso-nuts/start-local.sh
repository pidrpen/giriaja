#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js не найден. Установите Node.js 22 LTS: https://nodejs.org/"
  exit 1
fi

if [ ! -d node_modules ]; then
  npm install
fi

echo "Сайт запускается: http://localhost:5173"
npm run dev
