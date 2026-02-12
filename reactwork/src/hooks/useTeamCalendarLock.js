import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  acquireTeamCalendarLock,
  authorizeTeamCalendarWrite,
  refreshTeamCalendarLock,
  releaseTeamCalendarLock,
} from "../api/teamCalendarLock";

const HEARTBEAT_INTERVAL_MS = 5000;

export default function useTeamCalendarLock({ calendarId, targetId, enabled = true }) {
  const [lockState, setLockState] = useState({
    status: "idle", // idle | acquired | blocked | lost | error
    message: "",
    ttlSeconds: 0,
  });

  const intervalRef = useRef(null);

  const usable = useMemo(
    () => Boolean(enabled && calendarId !== null && calendarId !== undefined && targetId),
    [enabled, calendarId, targetId]
  );

  const stopHeartbeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const refreshHeartbeat = useCallback(async () => {
    if (!usable) return false;

    try {
      const res = await refreshTeamCalendarLock(calendarId, targetId);
      setLockState({
        status: "acquired",
        message: res.data?.message || "Lock refreshed.",
        ttlSeconds: res.data?.ttlSeconds || 15,
      });
      return true;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 503) {
        setLockState((prev) => ({
          status: "acquired",
          message: "Redis unavailable. Continuing without sync lock.",
          ttlSeconds: prev.ttlSeconds || 0,
        }));
        return true;
      }

      setLockState({
        status: "lost",
        message: "Lock expired or moved to another user.",
        ttlSeconds: 0,
      });
      stopHeartbeat();
      return false;
    }
  }, [usable, calendarId, targetId, stopHeartbeat]);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    intervalRef.current = setInterval(() => {
      refreshHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
  }, [refreshHeartbeat, stopHeartbeat]);

  const acquireForEdit = useCallback(async () => {
    if (!usable) return false;

    try {
      const res = await acquireTeamCalendarLock(calendarId, targetId);
      setLockState({
        status: "acquired",
        message: res.data?.message || "Lock acquired.",
        ttlSeconds: res.data?.ttlSeconds || 15,
      });
      startHeartbeat();
      return true;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 423) {
        setLockState({
          status: "blocked",
          message: error?.response?.data?.message || "Another user is editing this schedule.",
          ttlSeconds: error?.response?.data?.ttlSeconds || 0,
        });
        return false;
      }

      if (status === 503) {
        setLockState({
          status: "acquired",
          message: "Redis unavailable. Continuing without sync lock.",
          ttlSeconds: 0,
        });
        return true;
      }

      setLockState({
        status: "error",
        message: "Failed to acquire lock.",
        ttlSeconds: 0,
      });
      return false;
    }
  }, [usable, calendarId, targetId, startHeartbeat]);

  const authorizeWriteBeforeSave = useCallback(async () => {
    if (!usable) return false;

    try {
      await authorizeTeamCalendarWrite(calendarId, targetId);
      return true;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 409) {
        setLockState({
          status: "lost",
          message: "Lock is missing. Re-open edit to continue.",
          ttlSeconds: 0,
        });
        return false;
      }

      if (status === 403) {
        setLockState({
          status: "blocked",
          message: "Not lock owner.",
          ttlSeconds: error?.response?.data?.ttlSeconds || 0,
        });
        return false;
      }

      if (status === 503) {
        setLockState({
          status: "acquired",
          message: "Redis unavailable. Saving without sync lock.",
          ttlSeconds: 0,
        });
        return true;
      }

      setLockState({
        status: "error",
        message: "Failed to authorize write.",
        ttlSeconds: 0,
      });
      return false;
    }
  }, [usable, calendarId, targetId]);

  const releaseLock = useCallback(async () => {
    if (!usable) return;
    try {
      await releaseTeamCalendarLock(calendarId, targetId);
    } catch {
      // best-effort
    } finally {
      stopHeartbeat();
      setLockState({
        status: "idle",
        message: "",
        ttlSeconds: 0,
      });
    }
  }, [usable, calendarId, targetId, stopHeartbeat]);

  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  return {
    lockState,
    acquireForEdit,
    authorizeWriteBeforeSave,
    releaseLock,
    refreshHeartbeat,
  };
}
