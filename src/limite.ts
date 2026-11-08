/** Límite de solicitudes por ventana fija, en memoria. En serverless es «mejor esfuerzo» (cada instancia lleva su propia cuenta). */
export interface Limitador {
  revisar(clave: string): { permitido: boolean; restantes: number; reintentarEnSeg: number };
}

export function crearLimitador(opciones: { maximo: number; ventanaMs?: number; ahora?: () => number }): Limitador {
  const { maximo, ventanaMs = 60_000, ahora = Date.now } = opciones;
  const cuentas = new Map<string, { inicio: number; n: number }>();
  let ultimaLimpieza = ahora();

  return {
    revisar(clave) {
      const t = ahora();
      if (t - ultimaLimpieza > ventanaMs) {
        for (const [k, v] of cuentas) if (t - v.inicio >= ventanaMs) cuentas.delete(k);
        ultimaLimpieza = t;
      }
      let c = cuentas.get(clave);
      if (!c || t - c.inicio >= ventanaMs) {
        c = { inicio: t, n: 0 };
        cuentas.set(clave, c);
      }
      c.n++;
      const reintentarEnSeg = Math.max(1, Math.ceil((c.inicio + ventanaMs - t) / 1000));
      return { permitido: c.n <= maximo, restantes: Math.max(0, maximo - c.n), reintentarEnSeg };
    }
  };
}
