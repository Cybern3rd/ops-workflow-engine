// WebSocket hook for real-time updates
import { useEffect, useRef } from 'react';

const WS_URL = import.meta.env.PUBLIC_WS_URL || 'wss://api.workflow-engine.org/ws';

export function useWebSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (err) {
          console.error('WebSocket message parse error:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting in 3s...');
        setTimeout(connect, 3000);
      };

      wsRef.current = ws;
    }

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [onMessage]);

  return wsRef;
}
