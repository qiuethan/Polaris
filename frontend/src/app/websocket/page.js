import React, { useEffect, useState } from 'react';
import { getAuthToken } from '../../api/index';

export default function WebsocketPage() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const token = getAuthToken();
    const ws = new WebSocket(`wss://api.example.com/pose`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', token }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Only log minimal data
        setMessages((prev) => [...prev.slice(-9), data.type]);
      } catch {
        console.warn('Received invalid message');
      }
    };
    ws.onerror = () => {
      console.error('WebSocket error');
    };
    return () => ws.close();
  }, []);

  return (
    <div>
      <h2>Recent events:</h2>
      <ul>
        {messages.map((m, i) => <li key={i}>{m}</li>)}
      </ul>
    </div>
  );
}