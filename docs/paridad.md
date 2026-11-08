# Paridad · leer la marca desde otro proyecto

**Paridad** es el comparador entre diseño y código. Para detectar colores o fuentes fuera de la marca necesita la paleta y las tipografías de este servidor. No hace falta tocar el servidor: hay tres formas de leerlas.

> No tuve acceso al repositorio de Paridad, así que aquí queda el **contrato** y un ejemplo funcional y probado (`ejemplos/paridad.ts`, con pruebas en `tests/paridad.test.ts`) para copiar a ese proyecto.

## 1. Archivo (la más simple)
`sitio/publico/tokens.plano.json` (o la herramienta `exportar_tokens`, formato `json`) es un objeto plano `ruta → valor`:

```json
{
  "color.tinta": "#0E1116",
  "color.azul": "#043565",
  "color.oscuro.acento": "#8DB6E8",
  "tipografia.familia.titulo": "\"Bricolage Grotesque\", \"Instrument Sans\", system-ui, sans-serif",
  "radio.md": "10px"
}
```
Regenérelo con `npm run sitio` cada vez que cambie `marca/tokens.json`. Si el sitio `/marca` está publicado, también está en `https://<su-sitio>/marca/tokens.plano.json`.

## 2. MCP por stdio
Paridad lanza `node /ruta/a/Marca_MCP/dist/stdio.js` como cliente MCP y llama:
- `obtener_tokens` con `categoria: "color"` o `"tipografia"` para leer la paleta y las familias.
- `revisar_color` con cada color encontrado: devuelve `enPaleta`, el token más cercano y el ΔE2000 exacto.
- `auditar_codigo` si quiere delegar toda la revisión de un archivo CSS/HTML/JSX.

## 3. MCP por HTTP
La misma interfaz por URL (ver [`remoto.md`](remoto.md)): `https://<su-dominio>/mcp`. No requiere el repositorio.

## Ejemplo (forma 1)

```ts
import { coloresFueraDeMarca, fuentesFueraDeMarca } from './paridad.js';

const tokens = JSON.parse(await readFile('tokens.plano.json', 'utf8'));

coloresFueraDeMarca(['#043565', '#0A3D80', '#FF5A36'], tokens);
// → [ { valor: '#0A3D80', token: 'color.azul', distancia: 12.64 },
//     { valor: '#FF5A36', token: 'color.oscuro.texto-apagado', distancia: 86.4 } ]

fuentesFueraDeMarca(['Inter', 'Instrument Sans', 'Georgia'], tokens);
// → [ 'inter', 'georgia' ]
```

El ejemplo usa una distancia CIE76: sirve para decidir «dentro o fuera», pero **sobrestima** las diferencias en azules oscuros (aquí 12.64 contra 4.16 en ΔE2000) y su número no es comparable con el ΔE que informa el servidor. Para el ΔE2000 exacto y el token sugerido con su variable CSS, use `revisar_color` por MCP.

## Qué conviene que haga Paridad
1. Cargar `tokens.plano.json` al iniciar (o por MCP si prefiere una sola fuente).
2. Para cada color del diseño o del código: si no está en la paleta, reportarlo con el token más cercano.
3. Para cada familia tipográfica: comparar contra `tipografia.familia.titulo` y `tipografia.familia.texto`.
4. Ignorar `tipografia.familia.codigo` (solo documentación).

## Cosas que no están resueltas
- Paridad no se modifica desde aquí: la integración queda a su decisión.
- Si cambia el formato de `tokens.plano.json` (nombres de ruta), hay que actualizar el ejemplo: las pruebas lo detectan en este repositorio.
