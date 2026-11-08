import { join } from 'node:path';
import { crearManejadorHttp } from '../src/http.js';

// En Vercel, la carpeta marca/ se incluye con `includeFiles` (vercel.json) y queda bajo el directorio de trabajo.
process.env['MARCA_DIR'] ??= join(process.cwd(), 'marca');

const manejador = crearManejadorHttp();

export const GET = (request: Request) => manejador.fetch(request);
export const POST = (request: Request) => manejador.fetch(request);
export const DELETE = (request: Request) => manejador.fetch(request);
export const OPTIONS = (request: Request) => manejador.fetch(request);
