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
        message: res.data?.message || "락이 갱신되었습니다.",
        ttlSeconds: res.data?.ttlSeconds || 15,
      });
      return true;
    } catch (error) {
      setLockState({
        status: "lost",
        message: "락이 만료되었거나 다른 사용자에게 이동되었습니다.",
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
        message: res.data?.message || "락 획득 완료",
        ttlSeconds: res.data?.ttlSeconds || 15,
      });
      startHeartbeat();
      return true;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 423) {
        setLockState({
          status: "blocked",
          message: error?.response?.data?.message || "다른 사용자가 편집 중입니다.",
          ttlSeconds: error?.response?.data?.ttlSeconds || 0,
        });
      } else {
        setLockState({
          status: "error",
          message: "락 획득에 실패했습니다.",
          ttlSeconds: 0,
        });
      }
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
          message: "락이 없어 저장할 수 없습니다. 다시 열어서 편집해 주세요.",
          ttlSeconds: 0,
        });
      } else if (status === 403) {
        setLockState({
          status: "blocked",
          message: "락 소유자가 아니어서 저장할 수 없습니다.",
          ttlSeconds: error?.response?.data?.ttlSeconds || 0,
        });
      } else {
        setLockState({
          status: "error",
          message: "저장 권한 확인에 실패했습니다.",
          ttlSeconds: 0,
        });
      }
      return false;
    }
  }, [usable, calendarId, targetId]);

  const releaseLock = useCallback(async () => {
    if (!usable) return;
    try {
      await releaseTeamCalendarLock(calendarId, targetId);
    } catch (error) {
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