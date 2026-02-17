import { useEffect, useRef } from "react";

const buildWsUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws-native`;
};

const sendFrame = (socket, command, headers = {}, body = "") => {
  const headerLines = Object.entries(headers).map(([k, v]) => `${k}:${v}`);
  const frame = `${command}\n${headerLines.join("\n")}\n\n${body}\0`;
  socket.send(frame);
};

export default function useTeamScheduleRealtime({ calendarId, onUpdate }) {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const retryCountRef = useRef(0);
  const connectedRef = useRef(false);
  const disposedRef = useRef(false);

  useEffect(() => {
    if (!calendarId) return undefined;

    disposedRef.current = false;
    let socket = null;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposedRef.current) return;
      clearReconnectTimer();

      const delay = Math.min(1000 * (2 ** retryCountRef.current), 10000);
      retryCountRef.current = Math.min(retryCountRef.current + 1, 10);
      reconnectTimerRef.current = setTimeout(() => {
        if (disposedRef.current) return;
        connect();
      }, delay);
    };

    const handleFrames = (raw) => {
      const frames = raw.split("\0").filter(Boolean);

      frames.forEach((frame) => {
        if (frame.startsWith("CONNECTED")) {
          connectedRef.current = true;
          retryCountRef.current = 0;
          clearReconnectTimer();

          sendFrame(socket, "SUBSCRIBE", {
            id: `team-${calendarId}`,
            destination: `/topic/team/${calendarId}`,
          });
          return;
        }

        if (!frame.startsWith("MESSAGE")) return;
        const bodyStart = frame.indexOf("\n\n");
        if (bodyStart < 0) return;

        try {
          const payload = JSON.parse(frame.slice(bodyStart + 2));
          if (Number(payload?.calendarId) !== Number(calendarId)) return;
          onUpdate?.(payload);
        } catch {
          // Ignore malformed frames.
        }
      });
    };

    const connect = () => {
      connectedRef.current = false;
      socket = new WebSocket(buildWsUrl());
      wsRef.current = socket;

      socket.onopen = () => {
        sendFrame(socket, "CONNECT", {
          "accept-version": "1.2",
          host: window.location.host,
        });
      };

      socket.onmessage = (event) => {
        handleFrames(String(event.data || ""));
      };

      socket.onerror = () => {
        // no-op: reconnection is handled by onclose.
      };

      socket.onclose = () => {
        connectedRef.current = false;
        if (wsRef.current === socket) {
          wsRef.current = null;
        }
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      disposedRef.current = true;
      clearReconnectTimer();

      const activeSocket = wsRef.current || socket;
      try {
        if (connectedRef.current && activeSocket?.readyState === WebSocket.OPEN) {
          sendFrame(activeSocket, "DISCONNECT");
        }
      } catch {
        // no-op
      }
      try {
        activeSocket?.close();
      } catch {
        // no-op
      }
      connectedRef.current = false;
      wsRef.current = null;
    };
  }, [calendarId, onUpdate]);

  return wsRef;
}
