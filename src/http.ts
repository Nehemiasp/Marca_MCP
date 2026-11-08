import { createMcpHandler, hostHeaderValidationResponse } from '@modelcontextprotocol/server';
import { crearLimitador } from './limite.js';
import { crearServidor } from './servidor.js';
import { NOMBRE_SERVIDOR, VERSION_SERVIDOR } from './version.js';

export interface OpcionesHttp {
  /** Solicitudes por minuto y por IP. Por omisión 60 (o MARCA_LIMITE_POR_MINUTO). */
  limitePorMinuto?: number;
  /** Si se indica, solo se atienden estos nombres de host (protección contra DNS rebinding). */
  hostsPermitidos?: string[];
  /** Tamaño máximo del cuerpo en bytes. Por omisión 1 MB. */
  maxCuerpoBytes?: number;
  ahora?: () => number;
}

export interface ManejadorHttp {
  fetch(request: Request): Promise<Response>;
}

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version, Retry-After',
  'Access-Control-Max-Age': '86400'
};

function conCors(r: Response): Response {
  const h = new Headers(r.headers);
  for (const [k, v] of Object.entries(CORS)) h.set(k, v);
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
}

const json = (cuerpo: unknown, status: number, extra: Record<string, string> = {}) =>
  conCors(new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json', ...extra } }));

const errorRpc = (codigo: number, mensaje: string) => ({ jsonrpc: '2.0', error: { code: codigo, message: mensaje }, id: null });

export function ipDe(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return xff || request.headers.get('x-real-ip') || 'desconocida';
}

/**
 * Manejador web-estándar (Request → Response) del servidor remoto.
 * Sin estado: cada solicitud construye su propio servidor, y sin autenticación porque la marca es pública y de solo lectura.
 */
export function crearManejadorHttp(opciones: OpcionesHttp = {}): ManejadorHttp {
  const limite = opciones.limitePorMinuto ?? (Number(process.env['MARCA_LIMITE_POR_MINUTO']) || 60);
  const maxCuerpo = opciones.maxCuerpoBytes ?? 1_000_000;
  const hosts = opciones.hostsPermitidos ?? process.env['MARCA_HOSTS']?.split(',').map((h) => h.trim()).filter(Boolean);
  const limitador = crearLimitador({ maximo: limite, ahora: opciones.ahora });
  const mcp = createMcpHandler(() => crearServidor());

  return {
    async fetch(request) {
      const url = new URL(request.url);

      if (request.method === 'OPTIONS') return conCors(new Response(null, { status: 204 }));

      if (hosts?.length) {
        const rechazo = hostHeaderValidationResponse(request, hosts);
        if (rechazo) return conCors(rechazo);
      }

      // Página de estado: no consume el límite.
      if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/salud' || url.pathname === '/api')) {
        return json({ nombre: NOMBRE_SERVIDOR, version: VERSION_SERVIDOR, estado: 'ok', soloLectura: true, endpoint: '/mcp', transporte: 'Streamable HTTP' }, 200);
      }

      const r = limitador.revisar(ipDe(request));
      if (!r.permitido) {
        return json(errorRpc(-32000, `Demasiadas solicitudes. Reintente en ${r.reintentarEnSeg} s.`), 429, { 'Retry-After': String(r.reintentarEnSeg) });
      }

      if (!['GET', 'POST', 'DELETE'].includes(request.method)) {
        return json(errorRpc(-32000, 'Método no permitido.'), 405, { Allow: 'GET, POST, DELETE, OPTIONS' });
      }
      const largo = Number(request.headers.get('content-length') ?? 0);
      if (largo > maxCuerpo) return json(errorRpc(-32000, 'El cuerpo de la solicitud es demasiado grande.'), 413);

      const respuesta = await mcp.fetch(request);
      const conLimite = conCors(respuesta);
      conLimite.headers.set('X-RateLimit-Limit', String(limite));
      conLimite.headers.set('X-RateLimit-Remaining', String(r.restantes));
      return conLimite;
    }
  };
}
