import { useEffect, useRef } from "react";

export type IncidentSocketEvent =
  | { type: "incident.updated"; incidentId: string; signal: Record<string, unknown> }
  | { type: "incident.analyzed"; incidentId: string; narrative: string };

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:4003";

/**
 * Subscribes to incident-service's WebSocket gateway and calls `onEvent`
 * for every push (new/updated incident, finished root-cause analysis).
 * Reconnects with backoff if the connection drops — the dashboard should
 * recover on its own if incident-service restarts or a network blip hits.
 */
export function useIncidentSocket(onEvent: (event: IncidentSocketEvent) => void): void {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let socket: WebSocket | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const connect = (): void => {
      socket = new WebSocket(WS_URL);

      socket.onmessage = (message) => {
        try {
          onEventRef.current(JSON.parse(message.data as string));
        } catch {
          // ignore malformed frames rather than crashing the dashboard
        }
      };

      socket.onclose = () => {
        if (!cancelled) reconnectTimer = setTimeout(connect, 2_000);
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);
}
