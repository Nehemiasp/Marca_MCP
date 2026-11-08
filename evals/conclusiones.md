**Lo que dicen los números** (primera medición; una corrida por tarea y condición):

1. **Con el servidor, las 7 piezas salieron sin hallazgos; sin él, ninguna.** Sin servidor hubo 130 valores fuera de los tokens en el código, 48 colores renderizados fuera de la paleta, 8 fuentes ajenas (`system-ui` en 5 tareas, Helvetica Neue en 2 y Georgia en 1) y 26 textos con contraste por debajo de AA. Con el servidor, todo en cero.
2. **Sin servidor, el agente inventa una identidad distinta cada vez:** un hero oscuro con naranja, serif en cursiva y un degradado; una tabla en índigo y amarillo. Son piezas correctas como diseño genérico, pero no son su marca.
3. **El título y la voz no fueron el problema principal.** Solo 1 error de voz sin servidor (trato de «tú» en la tabla para clientes) y 2 avisos por cifras: la tarjeta sin servidor inventó métricas («+18%», «94%», «2.4k visitas») que nadie pidió.
4. **El beneficio vino de leer antes de construir.** Con el servidor, el agente consultó tokens y componentes en las 7 tareas y copió sus patrones. La verificación posterior fue irregular: `revisar_texto` en 5 de 7, `auditar_codigo` en 1 y `revisar_contraste` en ninguna.
5. **Costo:** con el servidor, cada pieza usó unas tres veces más turnos (7.1 contra 2.3) y 2.3 veces el costo ($0.09 contra $0.04 por tarea).

**Tres experimentos después de esa medición**

- **A. Reforzar la skill (corrida 2): no cambió la conducta.** El agente corrió las mismas revisiones que antes (`auditar_codigo` 1→0 tareas, `revisar_contraste` 0→0, `revisar_texto` 5→5) y lo dijo en sus respuestas: «No ejecuté `auditar_codigo` ni `revisar_contraste`». Es una omisión consciente. Esta corrida tuvo además una pieza con 3 errores: la publicación para redes usó tamaños de letra de 24, 32 y 136 px. La escala del sistema termina en 64 px y esa pieza mide 1080 px de ancho: **al sistema le falta una escala para formatos grandes** (redes y presentaciones). La corrida 1 de esa misma pieza había salido limpia, lo que muestra cuánto varía el modelo.
- **B. Hook de verificación con servidor (corrida 3): sin efecto medible.** Las 7 piezas salieron limpias, el hook revisó 7 guardados y bloqueó 0: no había nada que corregir. Esta corrida no prueba que el hook mejore resultados; solo que no estorba. El mecanismo sí se comprobó aparte: en una prueba de humo detectó un `#333`, se lo devolvió al agente y el segundo guardado pasó limpio.
- **C. Sin servidor, pero con el hook: de 130 errores de código a 0.** El hook bloqueó 9 de 16 guardados y el agente corrigió cada vez. Los mensajes del hook nombran las fuentes de la marca y el token más cercano con su valor, y eso bastó para que las piezas usaran la paleta y las fuentes correctas. 3 de 7 piezas quedaron sin ningún hallazgo (contra 0 de 7 sin hook).

**Qué significa C**

Una consistencia con los tokens no es lo mismo que reconocer la marca. En las dos capturas que revisé de esa variante (hero y tabla), los colores y las fuentes son los correctos, pero al hero le falta el motivo de cuadros —puso un círculo y un cuadrado genéricos— y destacó «Pérez» en gris, no en azul. El hook enseña qué valores usar; no enseña la composición. Para eso están los componentes del servidor. Mi lectura de las capturas es subjetiva: la calificación 1–5 es la que cuenta.

También quedaron huecos que el hook no ve:
- **Lo que falta, no lo que está escrito:** en `aviso-destacado` el navegador renderizó `Times New Roman` y `#000000`, valores por defecto de un texto sin estilo; en `bloque-contacto`, `system-ui`. El auditor revisa lo escrito y no veía nada mal en ninguna de las dos (0 errores de código).
- **El contexto:** el hook no sabe que una pieza es para un cliente, y dejó pasar el trato de «tú» en 2 de las 3 piezas para clientes.
- **El contraste:** no se calcula en el hook, y una pieza quedó con un fallo.

**Tres cosas distintas**

- **Conocimiento** (qué es la marca): el servidor.
- **Verificación** (que se cumpla): el hook, que funciona aunque el agente no quiera revisar.
- **Composición** (que se reconozca): los componentes del servidor.

**Cómo leerlo con cuidado**
- Es una corrida por celda. Las diferencias pequeñas pueden ser ruido; la corrida 2 lo muestra.
- La evaluación es en parte circular: mide con las mismas herramientas que el agente puede usar y con los mismos tokens que copia. Mide consistencia con los tokens, no calidad de diseño.
- **Dos cambios de criterio cambiaron los totales.** La primera medición dio 117 valores fuera de los tokens sin servidor; con el auditor más estricto (las genéricas solo valen como respaldo, lee el `rx` de los SVG, lee el radio al final de un atributo) las mismas salidas dan 130. Y al corregir la métrica de SVG (texto y formas se miden por `fill`), los colores fuera de la paleta sin servidor pasaron de 47 a 48. Comparar solo vale con el mismo criterio en todas las columnas; la tabla del reporte lo respeta.

**Qué haría después:** repetir cada celda tres veces; definir una escala tipográfica para formatos grandes; pasar el contexto «cliente» al hook; que el hook también revise el contraste; y comparar las cinco corridas con la calificación visual de usted.
