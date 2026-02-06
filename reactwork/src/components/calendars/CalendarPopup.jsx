import { useState, useEffect } from "react";
import { useCalendar } from "../../context/CalendarContext";
import "../../componentsCss/calendarsCss/CalendarPopup.css";

export default function CalendarPopup({ date, event, onClose}) {
    const { addEvent, updateEvent, deleteEvent, replaceRangeEvent } = useCalendar();

    //입력 상태
    const [ title, setTitle ] = useState("");
    const [ content, setContent ] = useState("");
    const [ startDate, setStartDate ] = useState("");
    const [ endDate, setEndDate ] = useState("");

    const isEditMode = !!event;

    useEffect(() => {
        setTitle(event?.title || "");
        setContent(event?.content || "");
        
        // 날짜 범위 처리 (드래그 선택으로 들어온 경우 포함)
        if (event?.startDate && event?.endDate && !event?.id) {
            // 드래그로 선택한 범위
            setStartDate(event.startDate);
            setEndDate(event.endDate);
        } else if (event?.startDate && event?.endDate) {
            // 기존 범위 이벤트 수정
            setStartDate(event.startDate);
            setEndDate(event.endDate);
        } else if (event?.date) {
            setStartDate(event.date);
            setEndDate(event.date);
        } else if (date) {
            setStartDate(date);
            setEndDate(date);
        }
    }, [date, event]);

    // 날짜 범위의 모든 날짜 생성
    const getDateRange = (start, end) => {
        if (!start || !end) return [];
        const startDate = new Date(start);
        const endDate = new Date(end);
        const dates = [];
        const current = new Date(startDate);
        
        while (current <= endDate) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, "0");
            const day = String(current.getDate()).padStart(2, "0");
            dates.push(`${year}-${month}-${day}`);
            current.setDate(current.getDate() + 1);
        }
        return dates;
    };

    //저장
    const handleSave = () => {
        if (!title.trim()) return;
        if (!startDate) return;

        const dateRange = getDateRange(startDate, endDate || startDate);
        const finalEndDate = endDate || startDate;

        if (isEditMode) {
            // 기존 이벤트 정보 확인
            const oldRangeId = event.rangeId || null; // rangeId가 있으면 사용
            const oldPostId = event.postId || null; // postId가 있고 rangeId가 없으면 postId로 삭제
            
            // 새로운 rangeId 생성
            const newRangeId = Date.now();
            
            // 새 이벤트 배열 생성
            const newEvents = dateRange.map(dateKey => ({
                dateKey,
                event: {
                    id: newRangeId + Math.random(), // 고유 ID
                    title,
                    content,
                    postId: event?.postId || null,
                    date: dateKey,
                    dateKey: dateKey,
                    startDate: startDate,
                    endDate: finalEndDate,
                    isRangeEvent: true,
                    rangeId: newRangeId, // 같은 범위 이벤트를 묶는 ID
                },
            }));
            
            // 기존 이벤트 삭제 및 새 이벤트 추가 (원자적 연산)
            // oldRangeId가 있으면 rangeId로 삭제, 없으면 postId로 삭제
            replaceRangeEvent(oldRangeId, newEvents, oldPostId);
        } else {
            const rangeId = Date.now();
            // 날짜 범위의 각 날짜에 이벤트 추가
            dateRange.forEach(dateKey => {
                addEvent(dateKey, {
                    id: rangeId + Math.random(), // 고유 ID
                    title,
                    content,
                    postId: event?.postId || null,
                    date: dateKey,
                    dateKey: dateKey,
                    startDate: startDate,
                    endDate: finalEndDate,
                    isRangeEvent: true,
                    rangeId: rangeId, // 같은 범위 이벤트를 묶는 ID
                });
            });
        }
        onClose();
    };

    //삭제
    const handleDelete = () => {
        if (!isEditMode) return;

        deleteEvent(event.dateKey, event.id);
        onClose();
    };

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="popup" onClick={e => e.stopPropagation()}>
                <h3>{event ? "일정 수정" : "일정 추가"}</h3>
                
                <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="제목"
                />
                
                <div className="date-range-inputs">
                    <div className="date-input-group">
                        <label>시작일</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => {
                                const newStart = e.target.value;
                                setStartDate(newStart);
                                // 시작일이 종료일보다 늦으면 종료일도 같이 변경
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
                            onChange={e => {
                                const newEnd = e.target.value;
                                setEndDate(newEnd);
                                // 종료일이 시작일보다 이르면 시작일도 같이 변경
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
                    onChange={e => setContent(e.target.value)}
                    placeholder="내용"
                />
                
                <button onClick={handleSave}>저장</button>
                
                {event && (
                    <button className="delete" onClick={handleDelete}>
                        삭제
                    </button>
                )}
            </div>
        </div>
    )

}