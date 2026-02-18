// TaskBoardState - Durable Object for Real-time WebSocket
// Maintains live connections and broadcasts task updates

export class TaskBoardState {
  private state: DurableObjectState;
  private sessions: Map<WebSocket, { agentId: string }> = new Map();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      // Accept the WebSocket connection
      await this.handleSession(server, request);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // Broadcast endpoint (internal, called by Worker)
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const message = await request.json();
      this.broadcast(message);
      return new Response(JSON.stringify({ success: true }));
    }

    return new Response('Not found', { status: 404 });
  }

  async handleSession(webSocket: WebSocket, request: Request) {
    // Extract agent ID from query params (sent during handshake)
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agent_id') || 'anonymous';

    webSocket.accept();

    this.sessions.set(webSocket, { agentId });

    // Send welcome message
    webSocket.send(JSON.stringify({
      type: 'connected',
      agentId,
      timestamp: Date.now(),
    }));

    // Handle incoming messages
    webSocket.addEventListener('message', (msg) => {
      try {
        const data = JSON.parse(msg.data as string);
        
        // Handle pings
        if (data.type === 'ping') {
          webSocket.send(JSON.stringify({ type: 'pong' }));
        }
        
        // Handle other message types as needed
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    // Handle close
    webSocket.addEventListener('close', () => {
      this.sessions.delete(webSocket);
    });

    // Handle errors
    webSocket.addEventListener('error', () => {
      this.sessions.delete(webSocket);
    });
  }

  broadcast(message: any) {
    const payload = JSON.stringify({
      ...message,
      timestamp: Date.now(),
    });

    for (const [ws] of this.sessions) {
      try {
        ws.send(payload);
      } catch (error) {
        // Remove dead connections
        this.sessions.delete(ws);
      }
    }
  }

  // Cleanup (called periodically by Cloudflare)
  async alarm() {
    // Close inactive connections
    const now = Date.now();
    for (const [ws, session] of this.sessions) {
      // Implement your own timeout logic here if needed
    }
  }
}
