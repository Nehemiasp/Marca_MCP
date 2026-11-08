#!/usr/bin/env node
import { createServer } from 'node:http';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { crearManejadorHttp } from './http.js';

/** Servidor HTTP local (o en cualquier máquina con Node). Escucha en 127.0.0.1 salvo que se indique HOST. */
const puerto = Number(process.env['PORT'] ?? 3000);
const host = process.env['HOST'] ?? '127.0.0.1';
const manejador = toNodeHandler(crearManejadorHttp());

createServer((req, res) => {
  void manejador(req, res);
}).listen(puerto, host, () => {
  console.error(`marca-mcp (HTTP, solo lectura) en http://${host}:${puerto}/mcp`);
});
