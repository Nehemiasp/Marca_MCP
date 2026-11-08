import { cpSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { normalizarTexto, leerTexto } from '../src/nucleo/rutas.js';
import { cargarTokens } from '../src/nucleo/tokens.js';
import { conectar } from './cliente.js';

const MARCA = join(import.meta.dirname, '..', 'marca');
const anterior = process.env['MARCA_DIR'];
afterEach(() => {
  if (anterior === undefined) delete process.env['MARCA_DIR'];
  else process.env['MARCA_DIR'] = anterior;
});

/** Copia de marca/ como la deja Git en Windows: finales de línea CRLF en los archivos de texto, y con BOM en tokens.json. */
function marcaConFormatoWindows(): string {
  const copia = join(mkdtempSync(join(tmpdir(), 'marca-windows-')), 'marca');
  cpSync(MARCA, copia, { recursive: true });
  const recorrer = (d: string): void => {
    for (const n of readdirSync(d)) {
      const r = join(d, n);
      if (statSync(r).isDirectory()) recorrer(r);
      else if (/\.(md|json|svg|txt)$/.test(n)) writeFileSync(r, (n === 'tokens.json' ? '﻿' : '') + readFileSync(r, 'utf8').replace(/\r?\n/g, '\r\n'));
    }
  };
  recorrer(copia);
  return copia;
}

describe('finales de línea y BOM (archivos editados o descargados en Windows)', () => {
  it('normalizarTexto convierte CRLF y CR a LF y quita el BOM', () => {
    expect(normalizarTexto('a\r\nb\rc\nd')).toBe('a\nb\nc\nd');
    expect(normalizarTexto('﻿{"a":1}')).toBe('{"a":1}');
    expect(normalizarTexto('sin cambios\n')).toBe('sin cambios\n');
    expect(normalizarTexto('')).toBe('');
  });

  it('leerTexto lee igual un archivo con CRLF y BOM', () => {
    const dir = mkdtempSync(join(tmpdir(), 'marca-lineas-'));
    writeFileSync(join(dir, 'x.md'), '﻿uno\r\ndos\r\n');
    process.env['MARCA_DIR'] = dir;
    expect(leerTexto('x.md')).toBe('uno\ndos\n');
  });

  it('tokens.json con BOM y CRLF se carga sin errores', () => {
    process.env['MARCA_DIR'] = marcaConFormatoWindows();
    expect(cargarTokens().tokens.length).toBeGreaterThanOrEqual(78);
  });

  it('el servidor devuelve exactamente lo mismo con una marca en formato Windows (el defecto real: el SVG terminaba en \\r\\n)', async () => {
    const llamadas: [string, Record<string, unknown>][] = [
      ['obtener_asset', { nombre: 'motivo', variante: 'claro' }],
      ['obtener_asset', { nombre: 'logo', variante: 'oscuro' }],
      ['obtener_componente', { nombre: 'portada-de-documento', formato: 'html' }],
      ['obtener_tokens', { categoria: 'color' }],
      ['buscar_componente', { consulta: 'algo para mostrar un aviso' }],
      ['revisar_texto', { texto: 'Soy un apasionado Product Designer.', contexto: 'cliente' }],
      ['exportar_tokens', { formato: 'css' }]
    ];
    const correr = async () => {
      const { cliente, cerrar } = await conectar();
      const salidas: string[] = [];
      for (const [name, args] of llamadas) salidas.push(((await cliente.callTool({ name, arguments: args })).content as { text: string }[]).map((c) => c.text).join('\n'));
      await cerrar();
      return salidas;
    };
    const enLinux = await correr();
    process.env['MARCA_DIR'] = marcaConFormatoWindows();
    const enWindows = await correr();
    llamadas.forEach(([name], i) => expect(enWindows[i], name).toBe(enLinux[i]));
    expect(enWindows.join('')).not.toContain('\r');
  });

  it('los recursos (el SVG y los .md) tampoco devuelven \\r', async () => {
    process.env['MARCA_DIR'] = marcaConFormatoWindows();
    const { cliente, cerrar } = await conectar();
    for (const uri of ['marca://assets/motivo-claro', 'marca://reglas', 'marca://voz', 'marca://componentes/boton']) {
      const r = await cliente.readResource({ uri });
      const c = r.contents[0]!;
      expect('text' in c ? c.text : '', uri).not.toContain('\r');
    }
    await cerrar();
  });

  it('.gitattributes fija LF y marca los binarios', () => {
    const g = readFileSync(join(MARCA, '..', '.gitattributes'), 'utf8');
    expect(g).toMatch(/^\* text=auto eol=lf$/m);
    expect(g).toMatch(/^\*\.png binary$/m);
    expect(g).toMatch(/^\*\.woff2 binary$/m);
  });
});
