#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
pip install --break-system-packages --quiet numpy imageio-ffmpeg pillow mutagen brotli
npm install --no-audit --no-fund
mkdir -p chromiumtest
cd chromiumtest
if [ ! -x package/bin/chromium ]; then
  npm pack @sparticuz/chromium@138.0.1 >/dev/null 2>&1
  tar -xzf sparticuz-chromium-138.0.1.tgz
fi
cd package/bin
python3 - <<'PY'
import brotli, os
for f in ['chromium.br','swiftshader.tar.br','al2023.tar.br']:
    out=f.replace('.br','')
    if not os.path.exists(out):
        with open(f,'rb') as fh: data=brotli.decompress(fh.read())
        open(out,'wb').write(data)
PY
chmod +x chromium
mkdir -p al2023 swiftshader
tar -xf al2023.tar -C al2023 2>/dev/null || true
tar -xf swiftshader.tar -C swiftshader 2>/dev/null || true
cp swiftshader/* /tmp/ 2>/dev/null || true
echo "setup done"
