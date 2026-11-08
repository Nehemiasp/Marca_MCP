import { describe, expect, it } from 'vitest';
import { aHex, deltaE, evaluarContraste, leerColor, normalizarHex, razonContraste } from '../src/nucleo/color.js';

const c = (s: string) => leerColor(s)!;

describe('leerColor', () => {
  it('lee hex corto, largo y con alfa', () => {
    expect(aHex(c('#fff'))).toBe('#FFFFFF');
    expect(aHex(c('#0e1116'))).toBe('#0E1116');
    expect(aHex(c('#0E111680'))).toBe('#0E1116');
  });
  it('lee rgb() y hsl()', () => {
    expect(aHex(c('rgb(14, 17, 22)'))).toBe('#0E1116');
    expect(aHex(c('rgba(255 0 0 / 50%)'))).toBe('#FF0000');
    expect(aHex(c('hsl(0, 100%, 50%)'))).toBe('#FF0000');
    expect(aHex(c('hsl(240, 100%, 50%)'))).toBe('#0000FF');
  });
  it('rechaza lo que no entiende', () => {
    expect(leerColor('azulito')).toBeNull();
    expect(leerColor('#12')).toBeNull();
    expect(normalizarHex('')).toBeNull();
  });
});

describe('contraste WCAG', () => {
  it('negro sobre blanco es 21:1', () => {
    expect(razonContraste(c('#000'), c('#fff'))).toBeCloseTo(21, 5);
  });
  it('mismo color es 1:1', () => {
    expect(razonContraste(c('#6A707A'), c('#6A707A'))).toBeCloseTo(1, 5);
  });
  it('umbrales en el límite', () => {
    expect(evaluarContraste(4.5).AA.normal).toBe(true);
    expect(evaluarContraste(4.49).AA.normal).toBe(false);
    expect(evaluarContraste(3).AA.grande).toBe(true);
    expect(evaluarContraste(7).AAA.normal).toBe(true);
    expect(evaluarContraste(4.5).AAA.grande).toBe(true);
    expect(evaluarContraste(2.99).AA.grande).toBe(false);
  });
  it('el texto apagado cumple AA sobre el fondo pero no sobre suave', () => {
    expect(razonContraste(c('#6A707A'), c('#FAFAF8'))).toBeGreaterThanOrEqual(4.5);
    expect(razonContraste(c('#6A707A'), c('#ECEDEF'))).toBeLessThan(4.5);
  });
});

describe('ΔE2000', () => {
  it('es 0 para colores idénticos', () => {
    expect(deltaE(c('#043565'), c('#043565'))).toBeCloseTo(0, 6);
  });
  it('coincide con pares de referencia de Sharma et al. (vía conversión sRGB)', () => {
    // Blanco contra negro: ΔE2000 ≈ 100
    expect(deltaE(c('#fff'), c('#000'))).toBeCloseTo(100, 0);
  });
  it('un cambio mínimo es pequeño y uno grande es grande', () => {
    expect(deltaE(c('#043565'), c('#053666'))).toBeLessThan(1);
    expect(deltaE(c('#043565'), c('#FF0000'))).toBeGreaterThan(40);
  });
  it('es simétrico', () => {
    expect(deltaE(c('#123456'), c('#654321'))).toBeCloseTo(deltaE(c('#654321'), c('#123456')), 8);
  });
});
