/**
 * Durable Object for real-time biometric attendance sessions
 * Maintains WebSocket connections for live attendance capture
 */

export class BiometricSession {
  private state: DurableObjectState;
  private sessions: Map<string, any>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Map();
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    
    if (url.pathname === '/websocket') {
      // Handle WebSocket upgrade for live attendance
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected websocket', { status: 400 });
      }

      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      // @ts-ignore
      server.accept();

      // Handle messages from biometric scanner or web UI
      // @ts-ignore
      server.addEventListener('message', (event: MessageEvent) => {
        // Process biometric data and broadcast to connected clients
        this.broadcast(event.data);
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response('Not found', { status: 404 });
  }

  broadcast(message: string) {
    // Broadcast to all connected clients
    for (const [id, session] of this.sessions) {
      // Send message logic here
    }
  }
}
