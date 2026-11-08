# Servidor remoto (HTTP)

Permite usar la marca **sin tener el repositorio en la computadora**: el servidor corre en internet y los clientes MCP se conectan por URL.

> **Estado:** el transporte HTTP está implementado y probado de extremo a extremo (pruebas con un cliente MCP real y prueba con `curl` contra el servidor Node). **No está desplegado**: publicarlo es una acción pública y queda a su decisión. La configuración de Vercel de abajo no se ha probado en una cuenta real.

## Cómo está hecho
- **Transporte:** Streamable HTTP, **sin estado** (`createMcpHandler` del SDK v2): cada solicitud crea su propio servidor; no hay sesiones que guardar, así que escala sin infraestructura.
- **Solo lectura y sin autenticación:** la marca es pública. El servidor no escribe nada ni hace llamadas salientes.
- **Límite de solicitudes:** 60 por minuto por IP (`MARCA_LIMITE_POR_MINUTO`). Al excederlo responde `429` con `Retry-After`. En serverless es «mejor esfuerzo» (cada instancia cuenta por separado); para un límite global use el firewall de Vercel o un almacén compartido.
- **Otras protecciones:** cuerpo máximo de 1 MB (`413`), métodos limitados a `GET/POST/DELETE/OPTIONS`, y validación opcional de `Host` con `MARCA_HOSTS` (lista separada por comas) contra DNS rebinding.
- **CORS** abierto (`*`) para poder usar el Inspector desde el navegador.
- **Página de estado:** `GET /` o `GET /salud` devuelve un JSON con el nombre, la versión y el endpoint; no consume el límite.

Código: `src/http.ts` (manejador), `src/limite.ts`, `src/http-nodo.ts` (servidor Node) y `api/mcp.ts` (función de Vercel).

## Probarlo en local

```bash
npm run build
PORT=3000 npm run start:http        # escucha en http://127.0.0.1:3000/mcp
```

```bash
curl -s -X POST http://127.0.0.1:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Con el Inspector: `npx @modelcontextprotocol/inspector --cli http://127.0.0.1:3000/mcp --transport http --method tools/list`.

## Desplegar en Vercel (cuando usted lo decida)

1. Importe el repositorio en Vercel (o use `vercel` desde la carpeta). El proyecto ya incluye `vercel.json`:
   - `api/mcp.ts` es la función; `includeFiles: "marca/**"` empaqueta la carpeta `marca/`.
   - Las reescrituras exponen `/mcp`, `/salud` y `/` apuntando a esa función.
2. Variables de entorno opcionales: `MARCA_LIMITE_POR_MINUTO`, `MARCA_HOSTS` (p. ej. `marca.suproyecto.vercel.app`).
3. Compruebe: `curl https://<su-dominio>/salud` y luego el `tools/list` de arriba con su URL.
4. Si algo falla al leer `marca/`, revise que `MARCA_DIR` (la función lo fija en `process.cwd()/marca`) apunte a una carpeta incluida en el despliegue.

Cada actualización de `marca/` requiere un nuevo despliegue.

## Conectarlo desde Claude

**Claude Code** (a nivel de usuario, para todos los proyectos):

```bash
claude mcp add --transport http --scope user marca https://<su-dominio>/mcp
```

**Claude.ai y Claude Desktop** (conectores personalizados): *Settings → Connectors → Add custom connector*, nombre «Marca» y la URL `https://<su-dominio>/mcp`. Como no hay autenticación, déjela en blanco. En planes de equipo, la persona que administra la organización puede tener que habilitar los conectores personalizados.

**Otros clientes MCP:** cualquier cliente que hable Streamable HTTP funciona con la misma URL.

## Qué cambia frente a stdio
| | stdio (local) | HTTP (remoto) |
|---|---|---|
| Necesita el repositorio | Sí | No |
| Actualizaciones de `marca/` | Inmediatas | Tras desplegar |
| Latencia | Mínima | Red |
| Límite de solicitudes | No | Sí |
| Privacidad | Todo local | La marca es pública, pero las llamadas pasan por internet |

Nota de privacidad: el texto que usted envíe a `revisar_texto` o `auditar_codigo` viaja al servidor. No pegue material de clientes: este proyecto es solo para la marca personal.
