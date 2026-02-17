// Durable Object for real-time WebSocket sync
// Handles live updates for all connected clients

export class TaskBoardState {
  private state: DurableObjectState;
  private sessions: Set<WebSocket>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Set();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      await this.handleSession(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // Broadcast endpoint (called by Worker API)
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const message = await request.text();
      this.broadcast(message);
      return new Response('OK');
    }

    return new Response('Not found', { status: 404 });
  }

  async handleSession(webSocket: WebSocket): Promise<void> {
    webSocket.accept();
    this.sessions.add(webSocket);

    webSocket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data as string);

        // Handle client messages (e.g., cursor position, typing indicators)
        if (data.type === 'ping') {
          webSocket.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    webSocket.addEventListener('close', () => {
      this.sessions.delete(webSocket);
    });

    webSocket.addEventListener('error', () => {
      this.sessions.delete(webSocket);
    });

    // Send initial connection confirmation
    webSocket.send(JSON.stringify({
      type: 'connected',
      timestamp: Date.now(),
    }));
  }

  broadcast(message: string): void {
    for (const session of this.sessions) {
      try {
        session.send(message);
      } catch (err) {
        // Remove failed sessions
        this.sessions.delete(session);
      }
    }
  }
}
