# Marca MCP

Servidor **MCP de solo lectura** con el sistema de diseño de la marca personal de Nehemias Pérez (Diseñador UI/UX). Es un proyecto del «Laboratorio» de nehemiasperez.com. **Solo marca personal: ningún material de clientes ni de NIU.**

## Objetivo
Que Claude (y cualquier cliente MCP) conozca colores, tipografías, espaciados, componentes, reglas, voz y logos, produzca piezas con esa identidad sin explicársela cada vez, y pueda revisar si algo la respeta.

## Reglas de trabajo
- TypeScript estricto, SDK oficial v2 (`@modelcontextprotocol/server`), Zod 4 (`zod/v4`), Vitest.
- **Solo lectura:** ninguna herramienta escribe archivos ni hace llamadas de red. Las rutas se resuelven siempre dentro de `marca/`.
- **Español, trato de «usted»**, en descripciones de herramientas y mensajes.
- La fuente de verdad son los archivos de `marca/`, editables a mano. El servidor solo los lee.
- Lo que revisa (`auditar_codigo`, `revisar_texto`, `revisar_color`) **no corrige**: devuelve hallazgos y sugerencias.
- Cada decisión técnica va en una línea en «Decisiones» (abajo).

## Comandos
| Comando | Qué hace |
|---|---|
| `npm test` | Pruebas (Vitest). Un hook las corre al editar archivos |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run validar` | Valida `marca/tokens.json` (DTCG, referencias, contraste) |
| `npm run dev` | Servidor por stdio con `tsx` |
| `npm run build` / `npm start` | Compila a `dist/` y lo ejecuta |
| `npm run inspector` | Abre el MCP Inspector contra el servidor |
| `npm run evals` | Evaluación con/sin servidor → `evals/reporte.md` |
| `npm run sitio` | Genera `sitio/publico/` (página `/marca`) desde los tokens |
| `npm run dev:http` / `npm run start:http` | Servidor HTTP local (`/mcp`, puerto `PORT`) |
| `npm run revisar -- archivo.html` | Revisa un archivo contra la marca (código y voz); sale con 1 si hay errores |
| `npm run caso` | Capturas lado a lado para el caso de estudio |
| `npm run casos` | Imágenes de evidencia de los casos desarrollados (`caso-de-estudio/casos/`) |

## Estructura
```
marca/        tokens.json, componentes/*.md, reglas.md, voz.md, assets/
src/nucleo/   lógica pura (color, contraste, auditor, voz, exportadores, carga)
src/          recursos.ts, herramientas.ts, prompts.ts, servidor.ts, stdio.ts, http.ts
tests/        Vitest      evals/  evaluación      sitio/  página pública
api/ · vercel.json   función HTTP (Vercel)      docs/  remoto y Paridad
ejemplos/     integración para Paridad      caso-de-estudio/  borrador y guion de video
```

## Herramientas, recursos y prompts (para entenderlo, no solo usarlo)
MCP ofrece tres primitivas. La diferencia es **quién decide usarlas**:

- **Recursos** (`resources`) → *datos que se leen*. Los controla la **aplicación/cliente**: el usuario o el cliente elige adjuntarlos como contexto. Tienen URI (`marca://tokens`), no hacen cómputo y no tienen efectos. Úselos para material de referencia estable: tokens, reglas, voz, SVG.
- **Herramientas** (`tools`) → *acciones que el modelo decide invocar*. Las controla el **modelo**: recibe un nombre, una descripción y un esquema de entrada, y las llama cuando las necesita. Reciben parámetros y calculan algo (ΔE, contraste, auditoría). Úselas cuando la respuesta depende de una entrada (¿este color está en la paleta?) o hay que procesar.
- **Prompts** (`prompts`) → *plantillas que el usuario invoca*. Las controla el **usuario**: aparecen como comandos (`/crear_componente`) y devuelven mensajes ya armados con contexto. Úselos para flujos repetibles que usted quiere disparar a propósito.

Regla práctica: si es un **dato fijo**, recurso. Si **depende de una entrada o requiere cálculo**, herramienta. Si es **un flujo que usted arranca**, prompt. Muchos datos se exponen como ambos (p. ej. tokens: recurso para adjuntar, herramienta para filtrar).

## Registro de errores (para casos de estudio)
Cuando aparezca un error real (prueba que falla, herramienta que se rompe, regla incumplida), se registra con captura:

```bash
npm run error -- --fase=3 --titulo="…" --salida="texto tal cual salió" --causa="…" --solucion="…" --aprendizaje="…"
```
Genera `caso-de-estudio/errores/<id>.png` y actualiza `caso-de-estudio/registro-de-errores.md`. Regla: la salida se copia **tal cual**; nunca se redacta un mensaje que la herramienta no emitió (si no hubo mensaje, se dice).

## Decisiones
- **SDK v2 (`@modelcontextprotocol/server` 2.4.0), no v1:** es la línea estable actual (npm `latest`, spec 2026-07-28); v1 solo recibe correcciones.
- **Zod 4 vía `zod/v4`:** es el esquema que el SDK v2 espera (Standard Schema) y genera el JSON Schema que ve el modelo.
- **Núcleo puro en `src/nucleo/`:** la lógica no depende de MCP, así se prueba sin servidor y se reutiliza (sitio, evals, Paridad).
- **ΔE2000 propio y contraste WCAG propio:** pocas líneas, sin dependencias y sin red.
- **Tokens en DTCG con `$extensions.marca`:** los pares de contraste permitidos y las notas de uso viajan dentro del mismo archivo.
- **Salida estructurada (`outputSchema` + `structuredContent`) más texto:** las máquinas leen lo estructurado; las personas, el texto.
- **`readOnlyHint: true` en todas las herramientas:** avisa a los clientes que no hay efectos.
- **Hook PostToolUse corre `npm test` al editar:** retroalimentación inmediata sin recordarlo.
- **Servidor sin estado (HTTP con `createMcpHandler`):** la marca es pública y de solo lectura, no se necesitan sesiones.
- **Escala tipográfica, espaciados, radios y sombras propuestos (base 4px, escala tipográfica 12–64):** no hubo acceso al repo del portafolio; ajústelos en `tokens.json`.
- **Nombres de variable compatibles con Tailwind v4 (`--color-*`, `--font-*`, `--text-*`, `--radius-*`):** el mismo `tokens.json` sirve para CSS, Tailwind y SCSS sin traducir. El peso se llama `extranegrita` porque `font-titulo` colisionaba con la familia.
- **Espaciado con nombres de talla (`md`, `lg`…) y no con números:** en código se lee `p-lg`, y evita confundirse con la escala numérica por defecto de Tailwind.
- **Los componentes se auditan a sí mismos (prueba):** su código HTML y React debe pasar `auditar_codigo` sin errores; así los ejemplos no contradicen las reglas.
- **El sitio público también se audita (prueba):** la propia página `/marca` debe cumplir la marca. Eso hizo aparecer el token `tipografia.familia.codigo`.
- **HTTP sin estado con límite en memoria por IP:** la marca es pública; el límite es «mejor esfuerzo» en serverless. No se despliega sin su decisión.
- **Evaluación aislada fuera del repositorio:** los agentes corren en una carpeta temporal para que ningún `CLAUDE.md` ni skill contamine la condición «sin servidor».
- **Evaluación mide lo renderizado, no solo el código:** un navegador (Playwright) calcula colores, fuentes y contraste reales; las fuentes de la marca se tratan como instaladas en ambas condiciones.
- **`radio.cuadro-mini` (4 px) para el motivo mini:** el motivo oficial usa 14 % de radio sobre el lado; 6 px (`radio.sm`) daba 23 % y 4 px da 15 %. Se prefirió un token nuevo a un valor calculado para que todo radio siga saliendo de la escala (caso `caso-de-estudio/casos/01-radio-de-5-px.md`).
- **Las genéricas (`sans-serif`, `system-ui`, `monospace`) solo valen como respaldo:** el auditor las rechaza solas o antes de una fuente de la marca, igual que la medición de render de la evaluación. Antes dejaba pasar una pieza sin ninguna fuente de la marca.
- **El auditor lee `rx`/`ry` de los `<rect>` de SVG:** una esquina que cubre la mitad de la altura es píldora (válida); el resto se compara con la escala de radios. Funciona con los SVG en unidades de `viewBox` sin falsos positivos.
- **El auditor distingue `@font-face` de uso:** ahí valen las fuentes de la marca y la de código; usar JetBrains Mono a mano fuera de un `@font-face` sigue siendo error (solo entra por el token).
- **JetBrains Mono (OFL) empaquetada para `tipografia.familia.codigo`:** el código de la documentación se ve igual en cualquier máquina. Es la única excepción a la regla de dos familias.
- **Las salidas de la evaluación se conservan y se vuelven a medir (`--medir`) al cambiar el auditor:** así se detectan regresiones (una pieza «con servidor» apareció con un error tras un arreglo mío). Los totales solo se comparan con el mismo auditor en las dos condiciones.
- **Hook de verificación (`dist/hook.js`) en lugar de pedirlo en la skill:** reforzar la redacción de la skill no cambió la conducta del agente; un hook PostToolUse que revisa cada archivo guardado y devuelve los errores (código de salida 2) sí cierra el ciclo. Es de solo lectura y local. Evidencia en `evals/conclusiones.md`.
- **Las corridas de la evaluación se archivan y se comparan (`evals/historial/`, `evals/variantes/`):** una sola corrida no dice cuánto varía el modelo. Una prueba exige que las cifras citadas en el caso de estudio coincidan con las corridas guardadas.
- **La evaluación mide SVG por `fill`:** en un SVG el color visible es `fill`, no `color`; solo cuentan las formas que pintan (no `<svg>` ni `<g>`).
- **Paridad por contrato, no por edición:** no hay acceso a ese repositorio; se documenta cómo leer la marca (`docs/paridad.md`) con un ejemplo probado.
