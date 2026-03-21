"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "error";

export interface WebSocketMessage<T = unknown> {
  raw: string;
  data: T | null;
  receivedAt: number;
}

interface UseWebSocketOptions<T> {
  url: string | null;
  autoConnect?: boolean;
  reconnectIntervalMs?: number;
  maxReconnectIntervalMs?: number;
  bufferSize?: number;
  onMessage?: (message: WebSocketMessage<T>) => void;
}

export function useWebSocket<T = unknown>({
  url,
  autoConnect = true,
  reconnectIntervalMs = 1000,
  maxReconnectIntervalMs = 10000,
  bufferSize = 200,
  onMessage,
}: UseWebSocketOptions<T>) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const reconnectDelay = useRef(reconnectIntervalMs);
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const [messages, setMessages] = useState<WebSocketMessage<T>[]>([]);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);

  const connect = useCallback(() => {
    if (!url) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return;
    }
    setStatus("connecting");
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = reconnectIntervalMs;
      setStatus("connected");
    };

    ws.onmessage = (event) => {
      const raw = event.data as string;
      let data: T | null = null;
      try {
        data = JSON.parse(raw) as T;
      } catch {
        data = null;
      }
      const message: WebSocketMessage<T> = {
        raw,
        data,
        receivedAt: Date.now(),
      };
      setMessages((prev) => {
        const next = [...prev, message];
        if (next.length > bufferSize) {
          return next.slice(next.length - bufferSize);
        }
        return next;
      });
      setLastMessageAt(message.receivedAt);
      onMessage?.(message);
    };

    ws.onclose = () => {
      setStatus("disconnected");
      socketRef.current = null;
      if (autoConnect) {
        reconnectTimer.current = window.setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, maxReconnectIntervalMs);
          connect();
        }, reconnectDelay.current);
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };
  }, [autoConnect, bufferSize, maxReconnectIntervalMs, onMessage, reconnectIntervalMs, url]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    socketRef.current?.close();
    socketRef.current = null;
    setStatus("disconnected");
  }, []);

  const sendMessage = useCallback((payload: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(payload);
    }
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect, url]);

  return {
    status,
    messages,
    lastMessageAt,
    connect,
    disconnect,
    sendMessage,
  };
}
