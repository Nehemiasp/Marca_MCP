import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { crearServidor } from '../src/servidor.js';

/** Conecta un cliente MCP real con el servidor en memoria (sin procesos ni red). */
export async function conectar() {
  const [transporteCliente, transporteServidor] = InMemoryTransport.createLinkedPair();
  const servidor = crearServidor();
  const cliente = new Client({ name: 'pruebas', version: '0.0.0' });
  await servidor.connect(transporteServidor);
  await cliente.connect(transporteCliente);
  return {
    cliente,
    cerrar: async () => {
      await cliente.close();
      await servidor.close();
    }
  };
}
