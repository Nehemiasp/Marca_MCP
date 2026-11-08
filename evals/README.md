# Evaluación · ¿de verdad ayuda?

Mide si un agente produce piezas más fieles a la marca **con** el servidor que **sin** él.

## Cómo funciona
- `tareas.ts`: 7 pedidos realistas y fijos (hero, tarjeta de proyecto, portada de propuesta en PDF, publicación para redes, aviso destacado, tabla de precios, bloque de contacto). El texto del pedido **no** menciona la marca.
- `ejecutar.ts`: corre cada tarea dos veces con la CLI de Claude Code (`claude -p`), siempre en una carpeta temporal **fuera del repositorio** para que ningún `CLAUDE.md` ni skill contamine la condición «sin»:
  - **sin:** sin servidor, sin skills (`--disable-slash-commands`), solo `Write`, `Edit` y `Read`.
  - **con:** servidor MCP `marca` conectado + skill `/marca`.
- `medir.ts`: abre cada `salida.html` en Chromium (Playwright) y mide con **las propias herramientas del servidor** (`auditar_codigo`, `revisar_texto`) más lo que realmente se renderiza: colores fuera de la paleta, fuentes ajenas y contraste AA.
- `reporte.ts`: arma `reporte.md` (tabla comparativa, todas las corridas y conclusiones) y la plantilla `calificaciones.md`.

## Comandos
```bash
npm run evals                         # genera lo que falte, mide y arma el reporte
npm run evals -- --forzar             # vuelve a generar todo
npm run evals -- --tareas=aviso-destacado,tabla-precios --condicion=con
npm run evals -- --medir              # vuelve a medir las salidas existentes (sin llamar a Claude)
npm run evals -- --solo-reporte       # solo regenera reporte.md (p. ej. tras llenar las calificaciones)
```
Variantes experimentales (no tocan el reporte principal; guardan en `variantes/<nombre>/`):
```bash
npm run evals -- --variante=hook        # con servidor + hook de verificación
npm run evals -- --variante=hook-sin    # SIN servidor, solo con el hook
```
`historial/` guarda corridas anteriores completas (HTML, captura, métricas y traza) para poder compararlas. Con `--medir` se vuelven a medir las salidas guardadas, por ejemplo tras cambiar el auditor; mida también las de `historial/` y `variantes/` para que todas usen el mismo criterio.

Variables: `EVALS_MODEL` (o `--modelo=`) fija el modelo; `--concurrencia=N` (por omisión 3).

Requiere la CLI `claude` autenticada. Cada corrida usa su cuota (en la ejecución incluida, menos de $1 en total).

## Calificación visual
Abra [`calificaciones.md`](calificaciones.md), mire las capturas y escriba de 1 a 5 qué tanto se parece cada una a su marca. El archivo no se sobrescribe al volver a correr; `reporte.md` promedia sus notas.

## Archivos
```
salidas/<sin|con>/<tarea>/  salida.html · captura.png · metricas.json · traza.json
reporte.md                  resultados (generado)
conclusiones.md             conclusiones escritas a mano, incluidas en el reporte
calificaciones.md           su tabla 1–5
```
