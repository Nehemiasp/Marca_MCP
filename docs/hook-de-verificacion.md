# Hook de verificación: la marca se revisa sola

Un hook de Claude Code que revisa **cada archivo de diseño que el agente guarda** contra la marca y, si hay errores, se los devuelve para que los corrija. No depende de que el agente quiera revisar.

## Por qué existe
En la evaluación, el agente leyó los tokens antes de construir, pero omitió la revisión posterior aunque la skill la pedía «obligatoria» (y lo reconoció en sus respuestas). Reforzar la redacción no cambió nada. Un hook no pide: ejecuta. Resultados en [`evals/reporte.md`](../evals/reporte.md) y en las conclusiones:

- Sin servidor y **sin** hook: 126 valores fuera de los tokens.
- Sin servidor y **con** hook: 0. El hook bloqueó 9 de 16 guardados y el agente corrigió cada vez.
- Con servidor: el hook no tuvo nada que bloquear (las piezas ya salían limpias).

## Qué revisa
- **Código** (`.css`, `.html`, `.svg`, `.jsx`, `.tsx`): lo mismo que `auditar_codigo` (colores, fuentes, tamaños, radios, sombras, degradados).
- **Texto visible** (en `.html`, `.svg`, `.jsx`, `.tsx`): lo mismo que `revisar_texto` (título, palabras prohibidas, relleno, cifras).
- Solo **errores** bloquean (código de salida 2). Los avisos (un valor correcto escrito a mano) no.

## Qué no revisa
- **El contraste.** Se calcula con `revisar_contraste` o con un navegador, no en el hook.
- **El contexto «cliente».** No sabe si la pieza es para un cliente; el trato de «tú» solo se marca con `npm run revisar -- archivo --cliente`.
- **Lo que falta.** Un texto sin estilo hereda los valores por defecto del navegador (por ejemplo `Times New Roman`). El hook ve lo escrito, no lo que no se escribió.
- **La composición.** Verifica valores, no que la pieza se reconozca como suya.

## Instalación
1. Compile una vez: `npm run build` (genera `dist/hook.js`).
2. Agregue el hook a `.claude/settings.json` del proyecto (o a `~/.claude/settings.json` para todos), con la **ruta absoluta**:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          { "type": "command", "command": "node /ruta/absoluta/a/Marca_MCP/dist/hook.js", "timeout": 30 }
        ]
      }
    ]
  }
}
```

3. Compruebe con un archivo malo: pídale a Claude que cree un HTML con `color: #333`. Debe corregirlo tras el primer guardado.

## Cómo funciona
Claude Code ejecuta el comando después de cada `Write`/`Edit` y le pasa por la entrada estándar un JSON con la ruta del archivo (`tool_input.file_path`). El hook lo lee, lo revisa y:
- sin errores (o con un archivo que no es de diseño): sale con 0 y sin escribir nada;
- con errores: escribe los hallazgos en la salida de error y sale con 2, que Claude Code devuelve al agente.

Es de solo lectura: no modifica el archivo, no escribe nada y no hace llamadas de red. Todo ocurre en su máquina.

## La misma revisión desde la terminal o en CI
```bash
npm run revisar -- pieza.html            # revisa uno o varios archivos
npm run revisar -- propuesta.html --cliente   # activa el trato de «usted»
```
Sale con código 1 si hay errores, así que sirve en integración continua. Tras `npm run build` también existe el comando `marca-revisar` (`dist/revisar.js`).

## Para quitarlo
Borre la entrada del hook de `settings.json`.
