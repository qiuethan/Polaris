import { useEffect, useRef } from 'react';
import { getAuthToken } from './index';

const ALLOWED_ORIGIN = 'https://app.example.com';

export default function usePoseWebSocket(onData) {
  const wsRef = useRef(null);

  useEffect(() => {
    const token = getAuthToken();
    const ws = new WebSocket('wss://api.example.com/pose');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        // Simple schema validation
        if (data && typeof data.type === 'string' && data.payload) {
          onData(data);
        }
      } catch {
        console.warn('Invalid WebSocket data');
      }
    };

    ws.onclose = () => {
      console.info('WebSocket closed');
    };

    return () => {
      ws.close();
    };
  }, [onData]);

  return wsRef;
}