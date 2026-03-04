import { useState, useRef, useEffect } from "react";
import { getHolidayNames } from "@hyunbinseo/holidays-kr";
import { getMonthDays } from "../../utils/calendar";
import { useSchedule } from "../../context/ScheduleContext";
import { usePosts } from "../../context/PostContext";

export default function CalendarGrid({ currentDate, onDateClick, onEventClick, onDateRangeSelect, onDrop }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const week = ["일","월","화","수","목","금","토"];
  const today = new Date();

  const days = getMonthDays(year, month);

  const { events, addEvent, fetchSchedules, getSchedulesForMonth, getScheduleColor } = useSchedule();
  const { posts } = usePosts();

  const hexToRgba = (hex, alpha) => {
    if (!hex || typeof hex !== 'string') return null;
    const raw = hex.replace('#', '').trim();
    if (raw.length !== 6) return null;
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    if ([r, g, b].some(n => Number.isNaN(n))) return null;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getTint = (color, alpha) => {
    // 우리가 쓰는 팔레트는 hex지만, 혹시 다른 포맷이 와도 "안 보임"을 막기 위해 fallback 처리
    if (typeof color === 'string' && color.startsWith('#')) {
      return hexToRgba(color, alpha) ?? color;
    }
    return color;
  };

  const sortByPriorityAndTime = (a, b) => {
    // 시간과 우선순위 기반으로 전부 저장
    const ap = Number.isFinite(Number(a?.priority)) ? Number(a.priority) : 2;
    const bp = Number.isFinite(Number(b?.priority)) ? Number(b.priority) : 2;
    if (ap !== bp) return ap - bp;

    const as = a?.startAt || `${a?.dateKey || ''}T00:00:00`;
    const bs = b?.startAt || `${b?.dateKey || ''}T00:00:00`;
    return String(as).localeCompare(String(bs));
  };

  // 스케줄 조회 (서버에서 가져온 스케줄과 로컬 이벤트 병합)
  useEffect(() => {
    fetchSchedules(year, month + 1);
  }, [year, month, fetchSchedules]);

  const monthServerEvents = getSchedulesForMonth(year, month + 1);
  const mergedEvents = { ...events };

  Object.keys(monthServerEvents).forEach((dateKey) => {
    const localItems = events[dateKey] || [];
    const serverItems = monthServerEvents[dateKey] || [];
    const localOnly = localItems.filter((ev) => !serverItems.some((sv) => sv.id === ev.id));
    mergedEvents[dateKey] = [...serverItems, ...localOnly];
  });
  
  // 날짜 범위 선택 상태
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const selectingRef = useRef(false);
  const rangeStartRef = useRef(null);
  const rangeEndRef = useRef(null);

  // ref 동기화
  useEffect(() => {
    rangeStartRef.current = rangeStart;
    rangeEndRef.current = rangeEnd;
  }, [rangeStart, rangeEnd]);

  // 전역 마우스 이벤트로 범위 선택 종료 처리
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (selectingRef.current) {
        selectingRef.current = false;
        
        const start = rangeStartRef.current;
        const end = rangeEndRef.current;
        
        if (start && end && onDateRangeSelect) {
          const sortedStart = start < end ? start : end;
          const sortedEnd = start < end ? end : start;
          onDateRangeSelect(sortedStart, sortedEnd);
        }
        
        setIsSelectingRange(false);
        setRangeStart(null);
        setRangeEnd(null);
      }
    };

    if (isSelectingRange) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isSelectingRange, onDateRangeSelect]);

  const handleDrop = (e, dateKey) => {
      e.preventDefault();

      const postId = Number(e.dataTransfer.getData("postId"));
      if (!postId) return;

      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      // 드롭 시 팝업 열기 (부모 컴포넌트로 전달)
      if (onDrop) {
        onDrop(dateKey, {
          postId: post.id,
          title: post.title,
          content: post.content || "",
          priority: post.priority ?? 2,
          date: dateKey,
          dateKey: dateKey,
        });
      } else {
        // fallback: 기존 방식 (즉시 추가)
        addEvent(dateKey, {
          id: Date.now(),
          postId: post.id,
          title: post.title,
          content : post.content || "",
          priority: post.priority ?? 2,
          date: dateKey,
          dateKey: dateKey,
        });
      }
  };
  
  // 색상은 CalendarContext의 단일 규칙(getScheduleColor) 사용

  // 날짜 범위 선택 중
  const handleMouseEnter = (dateKey) => {
    if (!selectingRef.current) return;
    setRangeEnd(dateKey);
  };


  // 날짜가 선택 범위에 포함되는지 확인
  const isInSelectedRange = (dateKey) => {
    if (!isSelectingRange || !rangeStart || !rangeEnd) return false;
    const start = rangeStart < rangeEnd ? rangeStart : rangeEnd;
    const end = rangeStart < rangeEnd ? rangeEnd : rangeStart;
    return dateKey >= start && dateKey <= end;
  };

  //스케줄 미리보기 활성화
  const formatDateText = (value) => {
    if (!value) return "";
    const normalized = String(value).slice(0, 10);
    return normalized;
  };

  const updateHoverPosition = (event) => {
    const offset = 14;
    setHoverPosition({ x: event.clientX + offset, y: event.clientY + offset });
  };

  // 같은 범위의 이벤트들을 찾아서 위치 결정
  const getRangePosition = (dateKey, event) => {
    // 1. rangeId가 있는 경우 (팝업으로 만든 범위 이벤트)
    if (event?.isRangeEvent && event?.rangeId) {
      const allRangeEvents = [];
      Object.keys(mergedEvents).forEach(key => {
        mergedEvents[key]?.forEach(ev => {
          if (ev.rangeId === event.rangeId && ev.isRangeEvent) {
            allRangeEvents.push({ dateKey: key, event: ev });
          }
        });
      });
      
      if (allRangeEvents.length > 0) {
        allRangeEvents.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        const firstDate = allRangeEvents[0].dateKey;
        const lastDate = allRangeEvents[allRangeEvents.length - 1].dateKey;
        
        if (firstDate === lastDate) {
          return 'single';
        } else if (dateKey === firstDate) {
          return 'start';
        } else if (dateKey === lastDate) {
          return 'end';
        } else {
          return 'middle';
        }
      }
    }
    
    // 2. 같은 postId를 가진 연속된 날짜의 이벤트들 (드래그로 만든 이벤트)
    if (event?.postId) {
      const samePostEvents = [];
      Object.keys(mergedEvents).forEach(key => {
        mergedEvents[key]?.forEach(ev => {
          if (ev.postId === event.postId && !ev.isRangeEvent) {
            samePostEvents.push({ dateKey: key, event: ev });
          }
        });
      });
      
      if (samePostEvents.length > 1) {
        // 날짜 순으로 정렬
        samePostEvents.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        
        // 연속된 날짜인지 확인 (날짜 문자열을 Date로 변환)
        let isConsecutive = true;
        for (let i = 1; i < samePostEvents.length; i++) {
          const prevDateStr = samePostEvents[i - 1].dateKey;
          const currDateStr = samePostEvents[i].dateKey;
          
          const [prevYear, prevMonth, prevDay] = prevDateStr.split('-').map(Number);
          const [currYear, currMonth, currDay] = currDateStr.split('-').map(Number);
          
          const prevDate = new Date(prevYear, prevMonth - 1, prevDay);
          prevDate.setDate(prevDate.getDate() + 1);
          
          // 날짜 문자열로 비교
          const prevNextStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
          const currStr = `${currYear}-${String(currMonth).padStart(2, '0')}-${String(currDay).padStart(2, '0')}`;
          
          if (prevNextStr !== currStr) {
            isConsecutive = false;
            break;
          }
        }
        
        if (isConsecutive) {
          const firstDate = samePostEvents[0].dateKey;
          const lastDate = samePostEvents[samePostEvents.length - 1].dateKey;
          
          if (firstDate === lastDate) {
            return 'single';
          } else if (dateKey === firstDate) {
            return 'start';
          } else if (dateKey === lastDate) {
            return 'end';
          } else {
            return 'middle';
          }
        }
      }
    }
    
    return null;
  };

  return (
    <div className="calendar-grid">
      {week.map((d, i) => (
        <div key={d} className={`day-header ${i === 0? "sun" : i === 6 ? "sat" : ""}`}>
          {d}
        </div>
      ))}

      {days.map((day, i) => {
        if (!day) return <div key={`empty-${i}`} className="calendar-cell empty"></div>;

        const date = new Date(year, month, day);
        const holidayNames = getHolidayNames(date);
        const isHoliday = !!holidayNames

        const isToday =
          year === today.getFullYear() &&
          month === today.getMonth() &&
          day === today.getDate();

        const dayOfweek = i % 7;
        const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      
        const inRange = isInSelectedRange(dateKey);
        
        return (
          <div
            key={i}
            className={`
              calendar-cell
              ${isToday ? "today" : ""}
              ${isHoliday ? "holiday" : ""}
              ${dayOfweek === 0 ? "sun" : dayOfweek === 6 ? "sat" : ""}
              ${inRange ? "range-selecting" : ""}
            `}
            onMouseDown={(e) => {
              // 이벤트가 아닌 빈 공간 클릭 시에만 범위 선택 시작
              if (e.target === e.currentTarget || e.target.closest('.cell-header') || e.target.closest('.day-number')) {
                e.preventDefault();
                selectingRef.current = true;
                setIsSelectingRange(true);
                setRangeStart(dateKey);
                setRangeEnd(dateKey);
              }
            }}
            onMouseEnter={(e) => {
              if (selectingRef.current) {
                // 이벤트 영역이 아닌 빈 공간에서만 범위 선택
                if (e.target === e.currentTarget || e.target.closest('.cell-header') || e.target.closest('.day-number')) {
                  handleMouseEnter(dateKey);
                }
              }
            }}
            onMouseUp={(e) => {
              if (selectingRef.current) {
                e.preventDefault();
                e.stopPropagation();
                selectingRef.current = false;
                
                if (rangeStart && rangeEnd && onDateRangeSelect) {
                  const start = rangeStart < rangeEnd ? rangeStart : rangeEnd;
                  const end = rangeStart < rangeEnd ? rangeEnd : rangeStart;
                  onDateRangeSelect(start, end);
                }
                
                setIsSelectingRange(false);
                setRangeStart(null);
                setRangeEnd(null);
              }
            }}
            onClick={(e) => {
              // 범위 선택 중이 아니고, 이벤트가 아닌 빈 공간 클릭 시에만 팝업 열기
              if (!isSelectingRange && (e.target === e.currentTarget || e.target.closest('.cell-header') || e.target.closest('.day-number'))) {
                onDateClick(dateKey);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, dateKey)}
          >
            <div className="cell-header">
              <span className="day-number">{day}</span>
              {isHoliday && <span className="holiday-name">{holidayNames[0]}</span>}
            </div>
            <div className="memo-content">
              {[...(mergedEvents[dateKey] || [])].sort(sortByPriorityAndTime).map(ev => {
                const rangePos = getRangePosition(dateKey, ev);
                // priority를 우선 확인 (메모에서 온 일정이든 직접 추가한 일정이든)
                const baseColor = getScheduleColor(ev, posts);
                // 범위 이벤트는 더 진한 배경색 사용 (투명도 40%로 증가)
                // 노란색 계열 제거하고 더 명확한 색상 사용
                // 직접 추가(단일) 일정도 "하얗게" 보이지 않게 틴트를 더 올림
                const bgColor = rangePos ? getTint(baseColor, 0.22) : getTint(baseColor, 0.18);
                
                return (
                  <div 
                    key={ev.id}
                    className={`calendar-event ${rangePos ? `range-${rangePos}` : ''}`}
                    style={{
                      borderLeft: `4px solid ${baseColor}`,
                      backgroundColor: bgColor,
                      borderColor: getTint(baseColor, 0.35),
                    }}
                    onClick={(e) =>{
                      e.stopPropagation();
                      onEventClick(dateKey, ev);
                    }}
                    onMouseEnter={(e) => {
                      updateHoverPosition(e);
                      setHoveredEvent({ dateKey, event: ev });
                    }}
                    onMouseMove={(e) => {
                      updateHoverPosition(e);
                    }}
                    onMouseLeave={() => {
                      setHoveredEvent(null);
                    }}
                  >
                    {ev.title}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {hoveredEvent && (
        <div
          className="schedule-hover-tooltip"
          style={{
            top: `${hoverPosition.y}px`,
            left: `${hoverPosition.x}px`,
          }}
        >
          <p className="schedule-hover-tooltip-title">{hoveredEvent.event.title}</p>
          <p className="schedule-hover-tooltip-date">
            {formatDateText(hoveredEvent.event.startDate) || hoveredEvent.dateKey}
            {hoveredEvent.event.endDate && hoveredEvent.event.endDate !== hoveredEvent.event.startDate
              ? ` ~ ${formatDateText(hoveredEvent.event.endDate)}`
              : ""}
          </p>
          {hoveredEvent.event.content && (
            <p className="schedule-hover-tooltip-content">{hoveredEvent.event.content}</p>
          )}
        </div>
      )}
    </div>
  );
}
