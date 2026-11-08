/// <reference lib="dom" />
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { exportarTokens } from '../../src/nucleo/exportadores.js';
import { carpetaMarca } from '../../src/nucleo/rutas.js';

/** Imágenes de evidencia de los casos 01 (radio de 5 px) y 02 (fuente monoespaciada). Reproducibles: npm run casos */
const DIR = resolve(import.meta.dirname, 'img');
mkdirSync(DIR, { recursive: true });
const marca = carpetaMarca();
const f = join(marca, 'assets', 'fuentes');
const fuentes =
  `@font-face{font-family:"Bricolage Grotesque";font-weight:800;src:url("file://${f}/bricolage-grotesque-latin-800-normal.woff2")}` +
  [400, 600, 700].map((p) => `@font-face{font-family:"Instrument Sans";font-weight:${p};src:url("file://${f}/instrument-sans-latin-${p}-normal.woff2")}`).join('');
const base = `${exportarTokens('css').contenido}${fuentes}
*{box-sizing:border-box}body{margin:0;background:var(--color-fondo);padding:var(--spacing-xl);font:var(--text-base)/var(--text-base--line-height) "Instrument Sans",system-ui,sans-serif;color:var(--color-texto)}
h1{margin:0 0 var(--spacing-lg);font:800 var(--text-2xl)/var(--text-2xl--line-height) "Bricolage Grotesque";letter-spacing:var(--tracking-titulo);color:var(--color-tinta)}
.rejilla{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--spacing-lg)}
.celda{background:var(--color-blanco);border:1px solid var(--color-linea);border-radius:var(--radius-lg);padding:var(--spacing-lg)}
.rotulo{margin:0 0 var(--spacing-md);font:700 var(--text-xs)/var(--text-xs--line-height) "Instrument Sans";letter-spacing:var(--tracking-eyebrow);text-transform:uppercase;color:var(--color-azul)}
.dato{margin:var(--spacing-md) 0 0;font-size:var(--text-sm);line-height:var(--text-sm--line-height)}
.dato strong{color:var(--color-tinta)}`;

async function pagina(nav: Awaited<ReturnType<typeof chromium.launch>>, html: string, nombre: string, ancho: number) {
  const tmp = join(DIR, `.${nombre}.html`);
  writeFileSync(tmp, `<!doctype html><meta charset="utf-8"><style>${base}</style>${html}`);
  const p = await nav.newPage({ viewport: { width: ancho, height: 400 }, deviceScaleFactor: 2 });
  await p.goto(`file://${tmp}`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: join(DIR, `${nombre}.png`), fullPage: true });
  await p.close();
  rmSync(tmp);
}

const nav = await chromium.launch();

// ── Caso 01: tres versiones del motivo mini a la misma escala ──
const mini = (radio: string) =>
  `<div style="zoom:5;display:grid;grid-template-columns:repeat(2,26px);gap:4px;width:56px">
     <i style="display:block;width:26px;height:26px;border-radius:${radio};background:var(--color-tinta)"></i>
     <i style="display:block;width:26px;height:26px;border-radius:${radio};background:var(--color-suave)"></i>
     <i style="grid-column:1/-1;height:26px;border-radius:var(--radius-pill);background:var(--color-azul)"></i></div>`;
const svgMini = readFileSync(join(marca, 'assets', 'motivo-mini-claro.svg'), 'utf8').replace(/ width="\d+" height="\d+"/, ' width="56" height="56"');
await pagina(
  nav,
  `<h1>Cuatro radios para el mismo cuadrito</h1><div class="rejilla" style="grid-template-columns:repeat(4,1fr)">
   <div class="celda"><p class="rotulo">Original en CSS</p>${mini('5px')}<p class="dato"><strong>5 px</strong> sobre 26 px = <strong>19 %</strong>. No existía en la escala de radios.</p></div>
   <div class="celda"><p class="rotulo">Corregido con el token</p>${mini('var(--radius-sm)')}<p class="dato"><strong>6 px</strong> sobre 26 px = <strong>23 %</strong>. Es <code>radio.sm</code>: cumple la regla.</p></div>
   <div class="celda"><p class="rotulo">Decisión: token nuevo</p>${mini('var(--radius-cuadro-mini)')}<p class="dato"><strong>4 px</strong> sobre 26 px = <strong>15 %</strong>. Es <code>radio.cuadro-mini</code>: cumple la regla y casi iguala al motivo.</p></div>
   <div class="celda"><p class="rotulo">Motivo oficial (SVG)</p><div style="zoom:5;width:56px;height:56px">${svgMini}</div><p class="dato"><strong>14 px</strong> sobre 100 px = <strong>14 %</strong>, unos 3.7 px a este tamaño.</p></div>
  </div>`,
  'radio-comparacion',
  1500
);

// ── Caso 02: por qué no usar Instrument Sans para el código ──
const codigo = `.boton {\n  padding: 12px 24px;\n  border: 1px solid transparent;\n  border-radius: 10px;\n  background: #0E1116;\n}`;
const bloque = (familia: string) => `<pre style="margin:0;background:var(--color-tinta);color:var(--color-oscuro-texto);padding:var(--spacing-lg);border-radius:var(--radius-md);font:var(--text-sm)/1.7 ${familia};white-space:pre">${codigo}</pre>`;
await pagina(
  nav,
  `<h1>El mismo código, dos familias</h1><div class="rejilla" style="grid-template-columns:1fr 1fr">
   <div class="celda"><p class="rotulo">Instrument Sans (la fuente de texto)</p>${bloque('"Instrument Sans"')}<p class="dato">La sangría mide menos que en la otra y cada carácter tiene un ancho distinto («i» frente a «m»): no se pueden contar columnas ni comparar líneas a ojo.</p></div>
   <div class="celda"><p class="rotulo">Pila monoespaciada (<code>--font-codigo</code>)</p>${bloque('var(--font-codigo)')}<p class="dato">Cada carácter ocupa lo mismo, y la sangría es siempre igual. La fuente exacta depende del sistema de cada lector: aquí es la que tiene esta máquina.</p></div></div>`,
  'mono-alineacion',
  1200
);
await nav.close();
console.log('Imágenes en caso-de-estudio/casos/img/');
