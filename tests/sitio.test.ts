import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generarSitio } from '../sitio/generar.js';
import { markdownAHtml } from '../sitio/markdown.js';
import { auditarCodigo } from '../src/nucleo/auditor.js';
import { revisarTexto } from '../src/nucleo/voz.js';
import { listarComponentes } from '../src/nucleo/componentes.js';

describe('sitio /marca', () => {
  const destino = join(mkdtempSync(join(tmpdir(), 'marca-sitio-')), 'publico');
  const { html } = generarSitio(destino);

  it('genera la página y sus archivos de apoyo', () => {
    for (const f of ['index.html', 'marca.css', 'marca-tailwind.css', 'tokens.json', 'tokens.plano.json', 'assets/motivo-claro.svg', 'assets/fuentes/bricolage-grotesque-latin-800-normal.woff2'])
      expect(existsSync(join(destino, f)), f).toBe(true);
    expect(readFileSync(join(destino, 'marca.css'), 'utf8')).toContain('--color-azul: #043565;');
  });

  it('muestra todos los colores, los nueve componentes y las reglas', () => {
    expect(html).toContain('#043565');
    expect(html).toContain('#8DB6E8');
    for (const c of listarComponentes()) expect(html, c.nombre).toContain(`id="comp-${c.nombre}"`);
    expect(html).toContain('R-COLOR-2');
    expect(html).toContain('lang="es"');
  });

  it('usa rutas relativas (se puede copiar a /marca de otro sitio)', () => {
    const sinCodigo = html.replace(/<pre>[\s\S]*?<\/pre>/g, '');
    expect(sinCodigo).not.toMatch(/(?:href|src)="\/(?!\/)/);
    expect(sinCodigo).not.toMatch(/https?:\/\/(?!www\.w3\.org|nehemiasperez\.com)/);
  });

  it('la propia página cumple la marca: auditar_codigo sin errores', () => {
    // Se excluye el código mostrado como ejemplo o en prosa (<pre> y <code>): es documentación, no estilos de la página.
    const propio = html.replace(/<pre>[\s\S]*?<\/pre>/g, (m) => m.replace(/[^\n]/g, ' ')).replace(/<code>[\s\S]*?<\/code>/g, (m) => m.replace(/[^\n]/g, ' '));
    const errores = auditarCodigo(propio, 'html').filter((h) => h.severidad === 'error');
    expect(errores.map((e) => `L${e.linea} ${e.mensaje}`)).toEqual([]);
  });

  it('la propia página cumple la voz: revisar_texto sin errores', () => {
    const texto = html.replace(/<(script|style|pre)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/«Product Designer»/g, ''); // se cita solo como lo que NO se debe escribir
    const errores = revisarTexto(texto, { contexto: 'general' }).filter((h) => h.severidad === 'error' && h.regla !== 'palabra-prohibida');
    expect(errores).toEqual([]);
  });

  it('escapa HTML en el código de los ejemplos', () => {
    expect(markdownAHtml('```html\n<b>hola</b>\n```')).toContain('&lt;b&gt;hola&lt;/b&gt;');
  });
});
