import { useState, useEffect, useCallback, useRef } from "react";
import { useSchedule } from "../../context/ScheduleContext";
import { useCalendar } from "../../context/CalendarContext";
import { usePosts } from "../../context/PostContext";
import { useAuth } from "../../context/AuthContext";
import { PRIORITY_LEVELS, PRIORITY_COLORS, PRIORITY_LABELS } from "../memos/MemoCreatePopup";
import "../../componentsCss/schedulesCss/SchedulePopup.css";

export default function SchedulePopup({ date, event, onClose, realtimeEvent }) {
  const { createEvent, editEvent, removeEvent, fetchSchedules } = useSchedule();
  const { activeCalendarId, currentDate } = useCalendar();
  const { posts } = usePosts();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState(PRIORITY_LEVELS.MEDIUM);
  const [baseVersion, setBaseVersion] = useState(null);
  const [showRemoteUpdateBanner, setShowRemoteUpdateBanner] = useState(false);
  const autoRefreshInFlightRef = useRef(false);
  const autoRefreshBannerTimerRef = useRef(null);

<<<<<<< ours
  const isEditMode = !!event?.id;
  const isTeamCalendar = activeCalendarId !== null;

  const applyEventToForm = useCallback((targetEvent, fallbackDate) => {
    setTitle(targetEvent?.title || "");
    setContent(targetEvent?.content || "");
    setBaseVersion(targetEvent?.version ?? null);

    if (targetEvent?.postId) {
      const post = posts.find((p) => p.id === targetEvent.postId);
      setPriority(post?.priority ?? targetEvent?.priority ?? PRIORITY_LEVELS.MEDIUM);
    } else {
      setPriority(targetEvent?.priority ?? PRIORITY_LEVELS.MEDIUM);
    }

    if (targetEvent?.startDate && targetEvent?.endDate) {
      setStartDate(targetEvent.startDate);
      setEndDate(targetEvent.endDate);
    } else if (targetEvent?.date) {
      setStartDate(targetEvent.date);
      setEndDate(targetEvent.date);
    } else if (fallbackDate) {
      setStartDate(fallbackDate);
      setEndDate(fallbackDate);
    } else {
      setStartDate("");
      setEndDate("");
    }
  }, [posts]);

  const fetchAndApplyLatest = useCallback(async ({ keepBanner = false } = {}) => {
    const latestMonthEvents = await fetchSchedules(currentDate.getFullYear(), currentDate.getMonth() + 1);
=======
        const finalEndDate = endDate || startDate;

        try {
            if (lockTargetId) {
                const authorized = await authorizeWriteBeforeSave();
                if (!authorized) {
                    alert(" 접근에 실패했습니다. 편집 화면을 다시 열어주세요.");
                    return;
                }
            }
            if (isEditMode && event?.id) {
                await editEvent(event.id, {
                    title,
                    content,
                    startDate,
                    endDate: finalEndDate,
                    postId: event?.postId || null,
                    priority,
                });
            } else {
                await createEvent({
                    title,
                    content,
                    startDate,
                    endDate: finalEndDate,
                    postId: event?.postId || null,
                    priority,
                });
            }

            await fetchSchedules(currentDate.getFullYear(), currentDate.getMonth() + 1);
            await releaseLock();
            onClose();
        } catch (error) {
            console.error("일정 저장 실패", error);
            alert("일정 저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
        //onClose();
    };
>>>>>>> theirs

    if (!event?.id) return;

    const latest = Object.values(latestMonthEvents || {})
      .flat()
      .find((ev) => Number(ev?.id) === Number(event.id));

    if (!latest) {
      alert("해당 일정은 이미 삭제되었습니다.");
      onClose();
      return;
    }

    applyEventToForm(latest, date);
    if (!keepBanner) {
      setShowRemoteUpdateBanner(false);
    }
  }, [
    fetchSchedules,
    currentDate,
    event?.id,
    applyEventToForm,
    date,
    onClose,
  ]);

  useEffect(() => {
    applyEventToForm(event, date);
    setShowRemoteUpdateBanner(false);
  }, [date, event, applyEventToForm]);

  useEffect(() => {
    return () => {
      if (autoRefreshBannerTimerRef.current) {
        clearTimeout(autoRefreshBannerTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isTeamCalendar || !isEditMode || !realtimeEvent) return;
    if (Number(realtimeEvent?.scheduleId) !== Number(event?.id)) return;
    if (Number(realtimeEvent?.actorUserId) === Number(user?.id)) return;
    if (realtimeEvent?.action !== "UPDATED" && realtimeEvent?.action !== "DELETED") return;

    setShowRemoteUpdateBanner(true);
    if (autoRefreshInFlightRef.current) return;

    autoRefreshInFlightRef.current = true;
    (async () => {
      try {
        await fetchAndApplyLatest({ keepBanner: true });
      } catch {
        // Keep banner for manual retry button when auto refresh fails.
      } finally {
        autoRefreshInFlightRef.current = false;
        if (autoRefreshBannerTimerRef.current) {
          clearTimeout(autoRefreshBannerTimerRef.current);
        }
        autoRefreshBannerTimerRef.current = setTimeout(() => {
          setShowRemoteUpdateBanner(false);
        }, 2500);
      }
    })();
  }, [isTeamCalendar, isEditMode, realtimeEvent, event?.id, user?.id, fetchAndApplyLatest]);

  const handleVersionConflict = useCallback(async () => {
    await fetchAndApplyLatest();
  }, [fetchAndApplyLatest]);

  const handleSave = async () => {
    if (!title.trim()) return;
    if (!startDate) return;

    const finalEndDate = endDate || startDate;

    try {
      if (isEditMode && event?.id) {
        await editEvent(event.id, {
          title,
          content,
          startDate,
          endDate: finalEndDate,
          postId: event?.postId || null,
          priority,
          baseVersion,
        });
      } else {
        await createEvent({
          title,
          content,
          startDate,
          endDate: finalEndDate,
          postId: event?.postId || null,
          priority,
        });
      }

      await fetchSchedules(currentDate.getFullYear(), currentDate.getMonth() + 1);
      onClose();
    } catch (error) {
      const status = error?.response?.status;
      const code = error?.response?.data?.code;
      if (status === 409 && code === "VERSION_CONFLICT") {
        alert("다른 사용자가 먼저 수정했습니다. 최신 일정으로 자동 갱신합니다.");
        await handleVersionConflict();
        return;
      }

      console.error("일정 저장 실패", error);
      alert("일정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !event?.id) return;

    try {
      await removeEvent(event.id, baseVersion);
      await fetchSchedules(currentDate.getFullYear(), currentDate.getMonth() + 1);
      onClose();
    } catch (error) {
      const status = error?.response?.status;
      const code = error?.response?.data?.code;
      if (status === 409 && code === "VERSION_CONFLICT") {
        alert("다른 사용자가 먼저 수정했습니다. 최신 일정으로 자동 갱신합니다.");
        await handleVersionConflict();
        return;
      }

      console.error("일정 삭제 실패", error);
      alert("일정 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <h3>{event ? "일정 수정" : "일정 추가"}</h3>

        {showRemoteUpdateBanner && (
          <div
            style={{
              marginBottom: "8px",
              padding: "8px 10px",
              borderRadius: "6px",
              background: "#fff3cd",
              color: "#664d03",
              border: "1px solid #ffecb5",
              display: "flex",
              gap: "8px",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>다른 사용자가 이 일정을 업데이트했습니다.</span>
            <button type="button" onClick={fetchAndApplyLatest}>
              최신본 불러오기
            </button>
          </div>
        )}

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
        />

        <div className="date-range-inputs">
          <div className="date-input-group">
            <label>시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                const newStart = e.target.value;
                setStartDate(newStart);
                if (endDate && newStart > endDate) {
                  setEndDate(newStart);
                }
              }}
            />
          </div>
          <div className="date-input-group">
            <label>종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                const newEnd = e.target.value;
                setEndDate(newEnd);
                if (startDate && newEnd < startDate) {
                  setStartDate(newEnd);
                }
              }}
              min={startDate}
            />
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용"
        />

        <div className="priority-selector">
          <label>중요도</label>
          <div className="priority-options">
            {Object.entries(PRIORITY_LABELS).map(([level, label]) => {
              const levelNum = parseInt(level, 10);
              const isSelected = priority === levelNum;
              return (
                <button
                  key={level}
                  type="button"
                  className={`priority-btn ${isSelected ? "selected" : ""}`}
                  style={{
                    backgroundColor: isSelected ? PRIORITY_COLORS[levelNum] : "transparent",
                    borderColor: PRIORITY_COLORS[levelNum],
                    color: isSelected ? "#fff" : PRIORITY_COLORS[levelNum],
                  }}
                  onClick={() => setPriority(levelNum)}
                >
                  <span
                    className="priority-color-dot"
                    style={{ backgroundColor: PRIORITY_COLORS[levelNum] }}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={handleSave}>저장</button>

        {event && (
          <button className="delete" onClick={handleDelete}>
            삭제
          </button>
        )}
      </div>
    </div>
  );
}
