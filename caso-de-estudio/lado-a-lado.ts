import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { TAREAS } from '../evals/tareas.js';

/** Compone, para cada tarea, una imagen con «sin servidor» y «con servidor» lado a lado (a partir de las capturas de evals/). */
const RAIZ = resolve(import.meta.dirname, '..');
const salida = join(import.meta.dirname, 'lado-a-lado');
mkdirSync(salida, { recursive: true });

const dataUri = (ruta: string) => `data:image/png;base64,${readFileSync(ruta).toString('base64')}`;
const navegador = await chromium.launch();
for (const t of TAREAS) {
  const sin = join(RAIZ, 'evals', 'salidas', 'sin', t.id, 'captura.png');
  const con = join(RAIZ, 'evals', 'salidas', 'con', t.id, 'captura.png');
  if (!existsSync(sin) || !existsSync(con)) {
    console.warn(`· ${t.id}: faltan capturas (corra npm run evals)`);
    continue;
  }
  const pagina = await navegador.newPage({ viewport: { width: 2000, height: 600 }, deviceScaleFactor: 1 });
  await pagina.setContent(`<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#FAFAF8;font:600 20px/1.3 system-ui,sans-serif;color:#0E1116;padding:32px}
    h1{font-size:28px;margin:0 0 4px} p.pedido{margin:0 0 24px;color:#6A707A;font-weight:400;max-width:90ch}
    .par{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start}
    figure{margin:0} figcaption{margin-bottom:10px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#043565;font-weight:700}
    img{width:100%;height:auto;display:block;border:1px solid #DADDE2;border-radius:10px}
  </style>
  <h1>${t.titulo}</h1><p class="pedido">Pedido: «${t.pedido}»</p>
  <div class="par"><figure><figcaption>Sin servidor</figcaption><img src="${dataUri(sin)}"></figure>
  <figure><figcaption>Con servidor</figcaption><img src="${dataUri(con)}"></figure></div>`);
  await pagina.screenshot({ path: join(salida, `${t.id}.png`), fullPage: true });
  await pagina.close();
  console.log(`✓ ${t.id}`);
}
await navegador.close();
