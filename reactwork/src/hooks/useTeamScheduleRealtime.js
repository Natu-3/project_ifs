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

  useEffect(() => {
    if (!calendarId) return undefined;

    let connected = false;
    const socket = new WebSocket(buildWsUrl());
    wsRef.current = socket;

    socket.onopen = () => {
      sendFrame(socket, "CONNECT", {
        "accept-version": "1.2",
        host: window.location.host,
      });
    };

    socket.onmessage = (event) => {
      const raw = String(event.data || "");
      const frames = raw.split("\0").filter(Boolean);

      frames.forEach((frame) => {
        if (frame.startsWith("CONNECTED")) {
          connected = true;
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

    socket.onerror = () => {
      // Keep silent for test flow; schedule APIs still work without realtime push.
    };

    return () => {
      try {
        if (connected && socket.readyState === WebSocket.OPEN) {
          sendFrame(socket, "DISCONNECT");
        }
      } catch {
        // no-op
      }
      try {
        socket.close();
      } catch {
        // no-op
      }
    };
  }, [calendarId, onUpdate]);

  return wsRef;
}
