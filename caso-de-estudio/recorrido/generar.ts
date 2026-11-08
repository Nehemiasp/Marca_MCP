/// <reference lib="dom" />
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { conectar } from '../../tests/cliente.js';
import { exportarTokens } from '../../src/nucleo/exportadores.js';
import { carpetaMarca } from '../../src/nucleo/rutas.js';
import { PASOS } from './pasos.js';

/**
 * Dibuja cada llamada del recorrido como una tarjeta (entrada y salida), con la salida REAL del servidor.
 * No es una captura de la interfaz de Claude Desktop: la tarjeta lo dice. Reproducible: npm run recorrido
 */
const DIR = resolve(import.meta.dirname, 'capturas');
mkdirSync(DIR, { recursive: true });

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f = join(carpetaMarca(), 'assets', 'fuentes');
const face = (n: string, p: number, a: string) => `@font-face{font-family:"${n}";font-weight:${p};src:url("file://${f}/${a}.woff2")}`;
const fuentes = [face('Bricolage Grotesque', 800, 'bricolage-grotesque-latin-800-normal'), ...[400, 600, 700].map((p) => face('Instrument Sans', p, `instrument-sans-latin-${p}-normal`)), face('JetBrains Mono', 400, 'jetbrains-mono-latin-400-normal')].join('');

/** Resalta [error] y atenúa [aviso]; el resto se muestra tal cual. */
const colorear = (linea: string) =>
  esc(linea).replace(/\[error\]/g, '<b class="e">[error]</b>').replace(/\[aviso\]/g, '<b class="a">[aviso]</b>');

export function recortar(texto: string, max?: number): { texto: string; omitidas: number } {
  const lineas = texto.split('\n');
  if (!max || lineas.length <= max) return { texto, omitidas: 0 };
  return { texto: lineas.slice(0, max).join('\n'), omitidas: lineas.length - max };
}

function tarjeta(i: number, total: number, contexto: string, herramienta: string, entrada: string, salida: string, omitidas: number): string {
  return `<!doctype html><meta charset="utf-8"><style>${exportarTokens('css').contenido}${fuentes}
  *{box-sizing:border-box}body{margin:0;background:var(--color-fondo);padding:var(--spacing-xl);width:1100px;font:var(--text-base)/var(--text-base--line-height) "Instrument Sans",system-ui,sans-serif;color:var(--color-texto)}
  .meta{display:flex;justify-content:space-between;margin:0 0 var(--spacing-sm);font:700 var(--text-xs)/var(--text-xs--line-height) "Instrument Sans";letter-spacing:var(--tracking-eyebrow);text-transform:uppercase;color:var(--color-azul)}
  h1{margin:0 0 var(--spacing-xs);font:800 var(--text-2xl)/var(--text-2xl--line-height) "Bricolage Grotesque";letter-spacing:var(--tracking-titulo);color:var(--color-tinta)}
  h1 code{font:400 var(--text-xl)/1 "JetBrains Mono";letter-spacing:0;background:var(--color-suave);padding:2px 10px;border-radius:var(--radius-sm)}
  .ctx{margin:0 0 var(--spacing-lg);color:var(--color-apagado)}
  .bloque{margin:0 0 var(--spacing-md);background:var(--color-tinta);color:var(--color-oscuro-texto);border-radius:var(--radius-md);padding:var(--spacing-md) var(--spacing-lg)}
  .bloque>p{margin:0 0 var(--spacing-sm);font:700 var(--text-xs)/var(--text-xs--line-height) "Instrument Sans";letter-spacing:var(--tracking-eyebrow);text-transform:uppercase;color:var(--color-oscuro-acento)}
  pre{margin:0;font:400 var(--text-sm)/1.65 "JetBrains Mono",monospace;white-space:pre-wrap;word-break:break-word}
  .e{color:var(--color-blanco)}.a{color:var(--color-oscuro-texto-apagado)}
  .bloque>.omitidas{margin:var(--spacing-sm) 0 0;text-transform:none;letter-spacing:0;font:400 var(--text-sm)/1.4 "Instrument Sans";color:var(--color-oscuro-texto-apagado)}
  .pie{margin:var(--spacing-md) 0 0;padding-top:var(--spacing-md);border-top:1px solid var(--color-linea);font-size:var(--text-xs);line-height:var(--text-xs--line-height);color:var(--color-apagado)}</style>
  <p class="meta"><span>Llamada ${i} de ${total}</span><span>marca · servidor MCP</span></p>
  <h1><code>${esc(herramienta)}</code></h1>
  <p class="ctx">${esc(contexto)}</p>
  <div class="bloque"><p>Entrada</p><pre>${esc(entrada)}</pre></div>
  <div class="bloque"><p>Salida · lo que recibe Claude</p><pre>${salida}</pre>${omitidas ? `<p class="omitidas">… ${omitidas} línea${omitidas === 1 ? '' : 's'} más que no se dibujan aquí.</p>` : ''}</div>
  <p class="pie">Salida real del servidor marca-mcp, generada con <b>npm run recorrido</b>. No es una captura de la interfaz de Claude Desktop.</p>`;
}

const { cliente, cerrar } = await conectar();
const nav = await chromium.launch();
const resumen: Record<string, string> = {};
for (const [n, paso] of PASOS.entries()) {
  const r = await cliente.callTool({ name: paso.herramienta, arguments: paso.args });
  const texto = (r.content as { text: string }[]).map((c) => c.text).join('\n');
  resumen[paso.id] = texto;
  const { texto: visible, omitidas } = recortar(texto, paso.maxLineas);
  const entrada = JSON.stringify(paso.args, null, 2);
  const tmp = join(DIR, `.${paso.id}.html`);
  writeFileSync(tmp, tarjeta(n + 1, PASOS.length, paso.contexto, paso.herramienta, entrada, visible.split('\n').map(colorear).join('\n'), omitidas));
  const p = await nav.newPage({ viewport: { width: 1196, height: 400 }, deviceScaleFactor: 2 });
  await p.goto(`file://${tmp}`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: join(DIR, `${String(n + 1).padStart(2, '0')}-${paso.id}.png`), fullPage: true });
  await p.close();
  rmSync(tmp);
  console.log(`✓ ${n + 1}. ${paso.herramienta}`);
}
writeFileSync(join(DIR, 'salidas.json'), JSON.stringify(resumen, null, 2) + '\n');
await nav.close();
await cerrar();
