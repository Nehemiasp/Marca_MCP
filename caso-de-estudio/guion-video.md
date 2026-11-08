# Guion del video · «Haz una tarjeta de proyecto»

**Duración objetivo:** 60 a 90 segundos. **Formato:** pantalla dividida (izquierda «sin», derecha «con»), 16:9, sin música con letra.
**Idea única:** el mismo pedido, dos resultados. Todo lo demás es contexto.

> No pude grabar el video desde este entorno. Aquí están el guion, las tomas y los comandos para grabarlo usted en unos 15 minutos.

## Preparación (una vez)

Dos carpetas vacías y dos terminales con la misma fuente y el mismo tamaño:

```bash
mkdir -p ~/video-marca/sin ~/video-marca/con
cp -r /ruta/a/Marca_MCP/.claude ~/video-marca/con/.claude     # solo trae la skill /marca
cd /ruta/a/Marca_MCP && npm run build
```

Archivo `~/video-marca/mcp-con.json`:

```json
{ "mcpServers": { "marca": { "command": "node", "args": ["/ruta/a/Marca_MCP/dist/stdio.js"] } } }
```

Para abrir el resultado: `open tarjeta.html` (macOS) o doble clic. Use el mismo ancho de ventana en las dos tomas.

## Tomas

| # | Tiempo | Imagen | Voz / texto en pantalla |
|---|---|---|---|
| 1 | 0:00–0:07 | Fondo `color.fondo`. El motivo de cuadros se arma cuadro por cuadro. Texto: «Interfaces pensadas para **implementarse.**» | «Le pido lo mismo a una IA, dos veces.» |
| 2 | 0:07–0:15 | Pantalla dividida con las dos terminales vacías. Rótulos: «Sin servidor» / «Con servidor» | «Un pedido: “haz una tarjeta de proyecto”. Sin explicar mi marca.» |
| 3 | 0:15–0:30 | Se escribe el mismo pedido en las dos. A la derecha se ven las llamadas a `obtener_tokens` y `obtener_componente` | «A la derecha, Claude consulta mi sistema de diseño antes de construir.» |
| 4 | 0:30–0:50 | Se abren los dos HTML lado a lado, a pantalla completa | «Sin el servidor: correcta, pero no es mía. Con el servidor: es mi marca, sin que yo se la explique.» |
| 5 | 0:50–1:05 | Acercamiento a detalles: el azul solo como acento, el eyebrow, el título. Luego, `auditar_codigo` marcando valores en el lado izquierdo | «La revisión la hacen mis propias herramientas: 130 valores fuera de los tokens sin servidor, cero con él.» |
| 6 | 1:05–1:15 | Tabla del reporte (4 filas) sobre `color.tinta` | «Siete tareas, medidas con mis propias herramientas. Y un hook que revisa cada archivo que la IA guarda.» |
| 7 | 1:15–1:25 | Logo claro y el texto «nehemiasperez.com/laboratorio» | «Lo escribí una vez. Ahora lo lee la máquina.» |

## Comandos de las tomas 3 y 4

**Sin servidor** (carpeta `sin`):

```bash
cd ~/video-marca/sin
claude --strict-mcp-config --disable-slash-commands
> haz una tarjeta de proyecto
```

**Con servidor** (carpeta `con`):

```bash
cd ~/video-marca/con
claude --strict-mcp-config --mcp-config ../mcp-con.json
> haz una tarjeta de proyecto
```

Pida en las dos: «guárdala como tarjeta.html». Si quiere el mismo escenario que la evaluación, use `evals/tareas.ts` (tarea `tarjeta-proyecto`).

## Consejos de grabación
- Grabe cada lado por separado y únalos en edición: así controla el ritmo y evita esperas.
- Acelere la espera (2x) y deje el resultado a velocidad normal.
- Letra y rótulos en Instrument Sans; títulos en Bricolage Grotesque 800. Ni un degradado.
- Una sola palabra destacada en azul por pantalla de texto.
- Subtítulos en español siempre. Sin cifras que no estén en el reporte.
- Repita la toma 3 si el resultado «con» no usa el servidor: el modelo no es determinista.
