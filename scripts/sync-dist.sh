#!/bin/sh
# Copies only what the site needs into dist/.
rm -rf dist && mkdir -p dist/data dist/fonts
cp index.html app.js _headers robots.txt favicon.ico apple-touch-icon.png icon-192.png icon-512.png og-image.png site.webmanifest dist/
cp data/catalog.js dist/data/
cp fonts/*.woff2 fonts/OFL-Geist.txt dist/fonts/
