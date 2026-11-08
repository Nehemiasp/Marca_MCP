import { describe, expect, it } from 'vitest';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { crearManejadorHttp } from '../src/http.js';
import { crearLimitador } from '../src/limite.js';

const URL_MCP = 'http://marca.test/mcp';
const cabeceras = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
const rpc = (metodo: string, params: unknown = {}, id = 1) => JSON.stringify({ jsonrpc: '2.0', id, method: metodo, params });

describe('límite de solicitudes', () => {
  it('permite hasta el máximo y luego bloquea, y se reinicia con la ventana', () => {
    let t = 0;
    const l = crearLimitador({ maximo: 3, ventanaMs: 1000, ahora: () => t });
    expect([1, 2, 3].map(() => l.revisar('a').permitido)).toEqual([true, true, true]);
    const cuarto = l.revisar('a');
    expect(cuarto.permitido).toBe(false);
    expect(cuarto.reintentarEnSeg).toBe(1);
    expect(l.revisar('b').permitido).toBe(true); // otra IP, otra cuenta
    t = 1000;
    expect(l.revisar('a').permitido).toBe(true);
  });
  it('en el límite exacto todavía permite y reporta 0 restantes', () => {
    const l = crearLimitador({ maximo: 2 });
    l.revisar('x');
    expect(l.revisar('x')).toMatchObject({ permitido: true, restantes: 0 });
  });
});

describe('servidor HTTP (sin estado, extremo a extremo con un cliente MCP real)', () => {
  it('un cliente MCP por HTTP lista herramientas, lee un recurso y llama una herramienta', async () => {
    const manejador = crearManejadorHttp({ limitePorMinuto: 1000 });
    const cliente = new Client({ name: 'pruebas-http', version: '0.0.0' });
    await cliente.connect(
      new StreamableHTTPClientTransport(new URL(URL_MCP), { fetch: (input, init) => manejador.fetch(new Request(input, init)) })
    );
    try {
      expect((await cliente.listTools()).tools).toHaveLength(9);
      const r = await cliente.readResource({ uri: 'marca://reglas' });
      expect('text' in r.contents[0]! && r.contents[0].text).toContain('Sin degradados');
      const llamada = await cliente.callTool({ name: 'revisar_contraste', arguments: { texto: 'color.tinta', fondo: 'color.fondo' } });
      expect((llamada.structuredContent as { AAA: { normal: boolean } }).AAA.normal).toBe(true);
      expect((await cliente.listPrompts()).prompts).toHaveLength(3);
    } finally {
      await cliente.close();
    }
  });

  it('GET / responde la página de estado sin consumir el límite', async () => {
    const m = crearManejadorHttp({ limitePorMinuto: 1 });
    for (let i = 0; i < 3; i++) {
      const r = await m.fetch(new Request('http://marca.test/'));
      expect(r.status).toBe(200);
      expect(await r.json()).toMatchObject({ estado: 'ok', soloLectura: true });
    }
  });

  it('devuelve 429 con Retry-After al superar el límite por IP', async () => {
    const m = crearManejadorHttp({ limitePorMinuto: 2 });
    const pedir = (ip: string) =>
      m.fetch(new Request(URL_MCP, { method: 'POST', headers: { ...cabeceras, 'x-forwarded-for': ip }, body: rpc('tools/list') }));
    expect((await pedir('1.1.1.1')).status).not.toBe(429);
    expect((await pedir('1.1.1.1')).status).not.toBe(429);
    const r = await pedir('1.1.1.1');
    expect(r.status).toBe(429);
    expect(Number(r.headers.get('Retry-After'))).toBeGreaterThanOrEqual(1);
    expect((await r.json()).error.message).toMatch(/Demasiadas solicitudes/);
    expect((await pedir('2.2.2.2')).status).not.toBe(429); // otra IP no se ve afectada
  });

  it('incluye CORS y responde a OPTIONS', async () => {
    const m = crearManejadorHttp();
    const o = await m.fetch(new Request(URL_MCP, { method: 'OPTIONS' }));
    expect(o.status).toBe(204);
    expect(o.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(o.headers.get('Access-Control-Allow-Headers')).toMatch(/Mcp-Session-Id/);
  });

  it('rechaza métodos no permitidos y cuerpos demasiado grandes', async () => {
    const m = crearManejadorHttp({ maxCuerpoBytes: 100 });
    expect((await m.fetch(new Request(URL_MCP, { method: 'PUT', headers: cabeceras, body: '{}' }))).status).toBe(405);
    const grande = await m.fetch(new Request(URL_MCP, { method: 'POST', headers: { ...cabeceras, 'content-length': '5000' }, body: rpc('tools/list') }));
    expect(grande.status).toBe(413);
  });

  it('con hosts permitidos rechaza otros hosts (protección contra DNS rebinding)', async () => {
    const m = crearManejadorHttp({ hostsPermitidos: ['marca.test'] });
    expect((await m.fetch(new Request('http://marca.test/', { headers: { host: 'marca.test' } }))).status).toBe(200);
    expect((await m.fetch(new Request('http://marca.test/', { headers: { host: 'malo.example' } }))).status).toBe(403);
  });

  it('es de solo lectura: llamar a una herramienta inexistente que escribiría falla', async () => {
    const m = crearManejadorHttp({ limitePorMinuto: 1000 });
    const cliente = new Client({ name: 'pruebas-http', version: '0.0.0' });
    await cliente.connect(new StreamableHTTPClientTransport(new URL(URL_MCP), { fetch: (i, n) => m.fetch(new Request(i, n)) }));
    const r = await cliente.callTool({ name: 'escribir_archivo', arguments: { ruta: 'x', contenido: 'y' } }).catch((e: Error) => ({ isError: true, e }));
    expect((r as { isError?: boolean }).isError).toBe(true);
    await cliente.close();
  });
});
