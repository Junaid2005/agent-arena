import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = `
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import VenueTour from './apps/web/components/tour/VenueTour';
import VenuePage from './apps/web/app/venue/page';
function Preview() {
 const [plan, setPlan] = useState(location.hash === '#venue');
 useEffect(() => {
  const update = () => setPlan(location.hash === '#venue');
  const navigate = (event) => {
   const link = event.target.closest?.('a'); if (!link) return;
   const url = new URL(link.href);
   if (url.pathname === '/venue' || url.pathname === '/') {
    event.preventDefault(); location.hash = url.pathname === '/venue' ? 'venue' : 'tour';
   }
  };
  window.addEventListener('hashchange', update); document.addEventListener('click', navigate);
  return () => { window.removeEventListener('hashchange', update); document.removeEventListener('click', navigate); };
 }, []);
 return plan ? <VenuePage /> : <VenueTour />;
}
createRoot(document.getElementById('root')).render(<Preview />);
`;
const result = await build({ stdin: { contents: entry, resolveDir: root, loader: 'tsx' },
 bundle: true, minify: true, platform: 'browser', target: 'es2020', jsx: 'automatic', write: false,
 outfile: resolve(root, 'artifacts/simulator-export.js'),
 define: { 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_VENUE_URL': 'undefined' },
 logLevel: 'warning' });
let js = result.outputFiles.find((file) => file.path.endsWith('.js')).text;
const css = result.outputFiles.find((file) => file.path.endsWith('.css'))?.text || '';
const image = 'data:image/webp;base64,' + readFileSync(resolve(root, 'apps/web/public/venue/hoxton-ground-floor.webp')).toString('base64');
js = js.replaceAll('/venue/hoxton-ground-floor.webp', image).replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Hoxton Docks — Interactive simulator</title><style>*,*::before,*::after{box-sizing:border-box}html,body,#root{width:100%;height:100%;margin:0}body{font-family:system-ui,sans-serif}button,input,select{font:inherit}button{cursor:pointer}a{color:inherit;text-decoration:none}${css}</style></head><body><div id="root"></div><noscript>Enable JavaScript to explore the venue.</noscript><script>${js}</script></body></html>`;
mkdirSync(resolve(root, 'artifacts'), { recursive: true });
writeFileSync(resolve(root, 'artifacts/hoxton-docks-simulator.html'), html);
console.log(`Exported simulator: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB, all assets embedded.`);
