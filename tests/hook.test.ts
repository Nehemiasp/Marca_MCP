import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { procesarHook } from '../src/hook.js';
import { formatear, lenguajeDe, revisarArchivo } from '../src/revisar-archivo.js';

const dir = mkdtempSync(join(tmpdir(), 'marca-hook-'));
const archivo = (nombre: string, contenido: string) => {
  const ruta = join(dir, nombre);
  writeFileSync(ruta, contenido);
  return ruta;
};
const evento = (ruta: unknown) => JSON.stringify({ tool_name: 'Write', tool_input: { file_path: ruta } });

describe('revisar archivo', () => {
  it('un HTML con errores de código y de voz', () => {
    const r = revisarArchivo(archivo('malo.html', '<p style="font-family: Inter; color: #333">Soy Product Designer</p>'));
    expect(r.revisable).toBe(true);
    expect(r.errores).toBe(3);
    expect(r.lineas.join('\n')).toMatch(/Inter/);
    expect(r.lineas.join('\n')).toMatch(/Product Designer/);
  });
  it('un HTML limpio no tiene hallazgos', () => {
    const r = revisarArchivo(archivo('bueno.html', '<style>p{color:var(--color-texto);font-family:var(--font-texto)}</style><p>Diseñador UI/UX</p>'));
    expect(r).toMatchObject({ revisable: true, errores: 0, avisos: 0 });
    expect(formatear('bueno.html', r)).toMatch(/sin hallazgos/);
  });
  it('en CSS puro no revisa la voz', () => {
    const r = revisarArchivo(archivo('a.css', '/* Product Designer */ p{color:var(--color-texto)}'));
    expect(r.errores).toBe(0);
  });
  it('el texto dentro de <pre>, <code>, <style> y <script> no cuenta como texto visible', () => {
    const r = revisarArchivo(archivo('doc.html', '<pre>Product Designer</pre><code>apasionado</code><script>"innovador"</script>'));
    expect(r.errores).toBe(0);
  });
  it('con contexto cliente revisa el trato de usted', () => {
    const ruta = archivo('c.html', '<p>Si quieres, escríbeme.</p>');
    expect(revisarArchivo(ruta, 'general').errores).toBe(0);
    expect(revisarArchivo(ruta, 'cliente').errores).toBe(2);
  });
  it('un tipo de archivo no revisable o inexistente', () => {
    expect(revisarArchivo(archivo('x.png', 'no')).revisable).toBe(false);
    expect(revisarArchivo(join(dir, 'no-existe.html')).revisable).toBe(false);
    expect(lenguajeDe('a.TSX')).toBe('jsx');
    expect(lenguajeDe('a.svg')).toBe('html');
  });
});

describe('hook PostToolUse', () => {
  it('con errores sale con código 2 y explica qué corregir', () => {
    const r = procesarHook(evento(archivo('h1.html', '<p style="border-radius: 8px">x</p>')));
    expect(r.codigo).toBe(2);
    expect(r.stderr).toMatch(/radio/);
    expect(r.stderr).toMatch(/Corrija los errores/);
  });
  it('sin errores sale con 0 y sin ruido', () => {
    expect(procesarHook(evento(archivo('h2.html', '<p>Hola</p>')))).toEqual({ codigo: 0, stderr: '' });
  });
  it('solo con avisos no bloquea', () => {
    const r = procesarHook(evento(archivo('h3.css', 'a{color:#043565}')));
    expect(r).toEqual({ codigo: 0, stderr: '' });
  });
  it('ignora archivos que no son de diseño, entradas rotas y eventos sin ruta', () => {
    expect(procesarHook(evento(archivo('notas.txt', 'Product Designer'))).codigo).toBe(0);
    expect(procesarHook('esto no es json').codigo).toBe(0);
    expect(procesarHook(JSON.stringify({ tool_input: {} })).codigo).toBe(0);
    expect(procesarHook(evento(42)).codigo).toBe(0);
  });
});
