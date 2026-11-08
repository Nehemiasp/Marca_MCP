import { describe, expect, it } from 'vitest';
import { NOMBRE_SERVIDOR } from '../src/version.js';

describe('prueba de humo', () => {
  it('el proyecto compila y las pruebas corren', () => {
    expect(NOMBRE_SERVIDOR).toBe('marca-mcp');
  });
});
