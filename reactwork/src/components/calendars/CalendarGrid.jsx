import { useState, useRef, useEffect } from "react";
import { getHolidayNames } from "@hyunbinseo/holidays-kr";
import { getMonthDays } from "../../utils/calendar";
import { useCalendar } from "../../context/CalendarContext";
import { usePosts } from "../../context/PostContext";
import { getMonthSchedules } from "../../api/scheduleApi";

export default function CalendarGrid({ currentDate, onDateClick, onEventClick, onDateRangeSelect }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const week = ["일","월","화","수","목","금","토"];
  const today = new Date();

  const days = getMonthDays(year, month);

  const { events, addEvent, setEvents, getScheduleColor } = useCalendar();
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

  useEffect(() => {
    const fetchSchedules = async () => {
      try{
        const res = await getMonthSchedules(year, month +1);

        const mappedEvents = {};

        res.data.forEach(s => {
          const dateKey = s. startAt.slice(0,10);

          if(!mappedEvents[dateKey]) {
            mappedEvents[dateKey] = [];
          }

          mappedEvents[dateKey].push({
            id: s.id,
            title: s.title,
            content: s.content,
            startAt: s.startAt,
            endAt: s.endAt,
            ownerId: s.ownerId,
            calendarId: s.calendarId,
          });
        });
        setEvents(mappedEvents);
      } catch (e) {
        console.error("월 스캐줄 조회 실패", e);
      }
    }

    fetchSchedules();
  },[year, month, setEvents]);
  
  // 날짜 범위 선택 상태
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
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

      addEvent(dateKey, {
        id: Date.now(),
        postId: post.id,
        title: post.title,
        content : post.content || "",
        date: dateKey,
        dateKey: dateKey,
      });
  };
  
  // 색상은 CalendarContext의 단일 규칙(getScheduleColor) 사용

  // 날짜 범위 선택 시작
  const handleMouseDown = (dateKey) => {
    if (selectingRef.current) return; // 이미 선택 중이면 무시
    selectingRef.current = true;
    setIsSelectingRange(true);
    setRangeStart(dateKey);
    setRangeEnd(dateKey);
  };

  // 날짜 범위 선택 중
  const handleMouseEnter = (dateKey) => {
    if (!selectingRef.current) return;
    setRangeEnd(dateKey);
  };

  // 날짜 범위 선택 종료
  const handleMouseUp = (e) => {
    if (!selectingRef.current) return;
    e.stopPropagation();
  };

  // 날짜가 선택 범위에 포함되는지 확인
  const isInSelectedRange = (dateKey) => {
    if (!isSelectingRange || !rangeStart || !rangeEnd) return false;
    const start = rangeStart < rangeEnd ? rangeStart : rangeEnd;
    const end = rangeStart < rangeEnd ? rangeEnd : rangeStart;
    return dateKey >= start && dateKey <= end;
  };

  // 같은 범위의 이벤트들을 찾아서 위치 결정
  const getRangePosition = (dateKey, event) => {
    // 1. rangeId가 있는 경우 (팝업으로 만든 범위 이벤트)
    if (event?.isRangeEvent && event?.rangeId) {
      const allRangeEvents = [];
      Object.keys(events).forEach(key => {
        events[key]?.forEach(ev => {
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
      Object.keys(events).forEach(key => {
        events[key]?.forEach(ev => {
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
          const currDate = new Date(currYear, currMonth - 1, currDay);
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
              {events[dateKey]?.map(ev => {
                const rangePos = getRangePosition(dateKey, ev);
                // 메모에서 온 일정(postId 있음)은 메모 색상, 직접 추가한 일정은 고정 파란색
                const baseColor = ev.postId ? getScheduleColor(ev) : "#3b82f6";
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
                  >
                    {ev.title}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
