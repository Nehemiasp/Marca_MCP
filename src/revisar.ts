#!/usr/bin/env node
import { formatear, revisarArchivo } from './revisar-archivo.js';

// Uso: marca-revisar archivo.html [otro.css …] [--cliente]
const args = process.argv.slice(2);
const cliente = args.includes('--cliente');
const archivos = args.filter((a) => !a.startsWith('--'));
if (archivos.length === 0) {
  console.error('Uso: npm run revisar -- archivo.html [otro.css …] [--cliente]');
  process.exit(2);
}
let hayErrores = false;
for (const ruta of archivos) {
  const informe = revisarArchivo(ruta, cliente ? 'cliente' : 'general');
  console.log(formatear(ruta, informe));
  if (informe.errores > 0) hayErrores = true;
}
process.exit(hayErrores ? 1 : 0);
