# Marca MCP

Servidor **MCP de solo lectura** con el sistema de diseño de mi marca personal (Nehemias Pérez · Diseñador UI/UX): colores, tipografías, espaciados, componentes, reglas de uso, voz y logos. Sirve para que Claude, o cualquier cliente MCP, produzca páginas, PDF, presentaciones y componentes con mi identidad **sin explicársela cada vez**, y para revisar si algo respeta la marca.

> «Marca MCP» es un nombre de trabajo.

## Qué ofrece

**Recursos** (material para leer como contexto)

| URI | Contenido |
|---|---|
| `marca://tokens` | Todos los tokens (W3C Design Tokens) |
| `marca://tokens/{categoria}` | `color`, `tipografia`, `espaciado`, `radio`, `sombra` |
| `marca://componentes` | Índice de componentes |
| `marca://componentes/{nombre}` | Documentación de un componente |
| `marca://reglas`, `marca://voz` | Reglas de uso y voz |
| `marca://assets/{nombre}` | SVG del logo y del motivo |

**Herramientas** (acciones que el modelo decide invocar; todas de solo lectura)

| Herramienta | Qué hace |
|---|---|
| `obtener_tokens` | Tokens, filtrados por categoría |
| `buscar_componente` | Busca componentes por texto libre |
| `obtener_componente` | Detalle y código (html, react, impresión) |
| `revisar_color` | ¿Está en la paleta? Si no, token más cercano y ΔE2000 |
| `revisar_contraste` | Contraste WCAG con resultado AA/AAA |
| `auditar_codigo` | Colores, fuentes, tamaños, radios, sombras y degradados fuera de los tokens (CSS, HTML, JSX) |
| `revisar_texto` | Revisa un texto contra `voz.md` |
| `exportar_tokens` | Variables CSS, `@theme` de Tailwind v4, SCSS o JSON plano |
| `obtener_asset` | SVG del logo o del motivo (claro, oscuro, mini) |

**Prompts** (comandos que arman el contexto): `crear_componente`, `revisar_pantalla`, `pieza_de_marca`.

Las herramientas de revisión **no corrigen archivos**: devuelven hallazgos y sugerencias. Ninguna herramienta escribe archivos ni hace llamadas de red.

## La fuente de verdad

Todo sale de archivos de `marca/`, editables a mano:

```
marca/
  tokens.json      tokens en formato DTCG, con descripción y pares de contraste permitidos
  componentes/     un .md por componente (frontmatter + plantilla)
  reglas.md        qué sí y qué no (reglas con identificador R-…)
  voz.md           voz y tono; listas que lee revisar_texto
  assets/          logos y motivo en SVG, fuentes woff2
```

Después de editar `tokens.json`, corra `npm run validar` (formato, referencias y contraste de los pares declarados).

## Instalación

Requiere Node 20 o superior.

```bash
npm install
npm test            # pruebas
npm run validar     # valida marca/tokens.json
npm run build       # compila a dist/ (necesario para usarlo desde otros proyectos)
```

## Conectarlo a Claude Code

### En este proyecto
El archivo `.mcp.json` ya está incluido. Al abrir Claude Code en esta carpeta, apruebe el servidor `marca` cuando lo pida. Compruebe con:

```bash
claude mcp list
```

Dentro de Claude Code, `/mcp` muestra el estado y los prompts aparecen como `/mcp__marca__crear_componente`, `/mcp__marca__revisar_pantalla` y `/mcp__marca__pieza_de_marca`.

### En todos mis proyectos (nivel de usuario)
Compile una vez y registre el servidor con una ruta absoluta:

```bash
npm run build
claude mcp add --scope user marca -- node "$(pwd)/dist/stdio.js"
```

Para usarlo desde cualquier carpeta, copie también la skill:

```bash
mkdir -p ~/.claude/skills && cp -r .claude/skills/marca ~/.claude/skills/marca
```

Si recompila, no hace falta volver a registrarlo. Para quitarlo: `claude mcp remove marca --scope user`.

### La skill `/marca`
`/marca` indica a Claude que **antes** de construir algo visual cargue los tokens y los componentes relevantes, y que **después** corra `auditar_codigo`, `revisar_contraste` y `revisar_texto` y reporte lo que no cumple. Está en `.claude/skills/marca/SKILL.md`.

## Conectarlo a Claude Desktop

1. Compile: `npm run build`.
2. Abra el archivo de configuración (menú *Settings → Developer → Edit Config*):
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
3. Agregue el servidor con la **ruta absoluta** a `dist/stdio.js`:

```json
{
  "mcpServers": {
    "marca": {
      "command": "node",
      "args": ["/ruta/absoluta/a/Marca_MCP/dist/stdio.js"]
    }
  }
}
```

En Windows use barras dobles, p. ej. `"C:\\Users\\usted\\Marca_MCP\\dist\\stdio.js"`. Reinicie Claude Desktop por completo. El servidor aparece en el menú de herramientas y los prompts en el selector «+».

## Probarlo con el MCP Inspector

```bash
npm run inspector                                  # interfaz web
npx @modelcontextprotocol/inspector --cli npx tsx src/stdio.ts --method tools/list
npx @modelcontextprotocol/inspector --cli npx tsx src/stdio.ts --method resources/list
npx @modelcontextprotocol/inspector --cli npx tsx src/stdio.ts --method prompts/list
npx @modelcontextprotocol/inspector --cli npx tsx src/stdio.ts --method tools/call --tool-name revisar_color --tool-arg color='#0A3D80'
```

## Servidor remoto (HTTP)

Ver [`docs/remoto.md`](docs/remoto.md).

## Página pública /marca

`npm run sitio` genera `sitio/publico/` (HTML estático con rutas relativas): colores, tipografías, escala, motivo, componentes en vivo y reglas, más descargas de `marca.css`, `@theme` de Tailwind y los tokens. Puede copiarse tal cual a `/marca` del portafolio.

## Evaluación

`npm run evals` mide si un agente trabaja mejor con el servidor que sin él. Ver [`evals/README.md`](evals/README.md) y el reporte en `evals/reporte.md`.

## Estructura del código

```
src/nucleo/   lógica pura sin MCP: color, contraste, auditor, voz, exportadores, carga de la marca
src/          recursos.ts, herramientas.ts, prompts.ts, servidor.ts, stdio.ts, http.ts
tests/        Vitest (núcleo y servidor completo con un cliente MCP en memoria)
evals/        evaluación con y sin servidor
sitio/        página pública /marca generada desde los tokens (npm run sitio → sitio/publico)
api/          función HTTP para Vercel (vercel.json)
docs/         remoto.md (HTTP y despliegue), paridad.md (integración con Paridad)
ejemplos/     integración de ejemplo para Paridad
caso-de-estudio/  borrador del caso, guion del video, capturas lado a lado y registro de errores (npm run error)
```

Decisiones técnicas y explicación de herramientas, recursos y prompts: [`CLAUDE.md`](CLAUDE.md).

## Licencia
Las fuentes Bricolage Grotesque e Instrument Sans están bajo SIL Open Font License 1.1 (ver `marca/assets/fuentes`). El resto del contenido es de uso personal de Nehemias Pérez.
