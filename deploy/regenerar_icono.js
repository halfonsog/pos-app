#!/usr/bin/env node
/**
 * Regenera deploy/icono.ico (icono de los accesos directos del instalador)
 * a partir de los iconos del frontend (src/frontend/img/*).
 * Uso: node deploy/regenerar_icono.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PNG = [
  path.join(ROOT, 'src', 'frontend', 'img', 'favicon.png'),   // 16x16
  path.join(ROOT, 'src', 'frontend', 'img', 'icon-32.png'),   // 32x32
  path.join(ROOT, 'src', 'frontend', 'img', 'icon-192.png'),  // 192x192
  path.join(ROOT, 'src', 'frontend', 'img', 'icon-512.png')   // 512x512
];
const SALIDA = path.join(ROOT, 'deploy', 'icono.ico');

(async () => {
  const entradas = [];
  for (const p of PNG) {
    if (!fs.existsSync(p)) { console.log('omitido (no existe):', path.basename(p)); continue; }
    const data = await sharp(p).toBuffer();
    const meta = await sharp(data).metadata();
    entradas.push({ w: meta.width, h: meta.height, data });
  }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entradas.length, 4);
  const dirSize = 16 * entradas.length;
  const dirs = [];
  let offset = 6 + dirSize;
  for (const e of entradas) {
    const d = Buffer.alloc(16);
    d[0] = e.w === 256 ? 0 : e.w;
    d[1] = e.h === 256 ? 0 : e.h;
    d[2] = 0;
    d[3] = 0;
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(e.data.length, 8);
    d.writeUInt32LE(offset, 12);
    dirs.push(d);
    offset += e.data.length;
  }
  fs.writeFileSync(SALIDA, Buffer.concat([header, ...dirs, ...entradas.map(e => e.data)]));
  console.log('ICO generado:', SALIDA, '(' + entradas.length + ' tamaños)');
})().catch(e => { console.error(e); process.exit(1); });
