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
| `npm run sitio` | Genera `sitio/` (página `/marca`) desde los tokens |

## Estructura
```
marca/        tokens.json, componentes/*.md, reglas.md, voz.md, assets/
src/nucleo/   lógica pura (color, contraste, auditor, voz, exportadores, carga)
src/          recursos.ts, herramientas.ts, prompts.ts, servidor.ts, stdio.ts, http.ts
tests/        Vitest      evals/  evaluación      sitio/  página pública
```

## Herramientas, recursos y prompts (para entenderlo, no solo usarlo)
MCP ofrece tres primitivas. La diferencia es **quién decide usarlas**:

- **Recursos** (`resources`) → *datos que se leen*. Los controla la **aplicación/cliente**: el usuario o el cliente elige adjuntarlos como contexto. Tienen URI (`marca://tokens`), no hacen cómputo y no tienen efectos. Úselos para material de referencia estable: tokens, reglas, voz, SVG.
- **Herramientas** (`tools`) → *acciones que el modelo decide invocar*. Las controla el **modelo**: recibe un nombre, una descripción y un esquema de entrada, y las llama cuando las necesita. Reciben parámetros y calculan algo (ΔE, contraste, auditoría). Úselas cuando la respuesta depende de una entrada (¿este color está en la paleta?) o hay que procesar.
- **Prompts** (`prompts`) → *plantillas que el usuario invoca*. Las controla el **usuario**: aparecen como comandos (`/crear_componente`) y devuelven mensajes ya armados con contexto. Úselos para flujos repetibles que usted quiere disparar a propósito.

Regla práctica: si es un **dato fijo**, recurso. Si **depende de una entrada o requiere cálculo**, herramienta. Si es **un flujo que usted arranca**, prompt. Muchos datos se exponen como ambos (p. ej. tokens: recurso para adjuntar, herramienta para filtrar).

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
