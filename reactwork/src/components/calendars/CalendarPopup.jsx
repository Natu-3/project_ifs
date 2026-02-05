import { useState } from "react";
import { useCalendar } from "../../context/CalendarContext";
import "../../componentsCss/calendarsCss/CalendarPopup.css";

export default function CalendarPopup({ date, event, onClose}) {
    const { addEvent, updateEvent, deleteEvent } = useCalendar();

    //입력 상태
    const [ title, setTitle ] = useState(event?.title || "");
    const [ constent, setConstent ] = useState(event?.content || "");
    const [ selectedDate, setSelectedDate ] = useState(date);

    const isEditMode = !!event;

    //저장
    const handleSave = () => {
        if (!title.trim()) return;

        if (isEditMode) {
            updateEvent(event.dateKey, event.id, { ...event,title, constent, date: selectedDate});
        } else {
            addEvent(selectedDate, {
                id: Date.now(),
                title,
                constent: constent,
                postId : event?.postId || null, //복사본
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
                
                <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                />
                
                <textarea
                    value={constent}
                    onChange={e => setConstent(e.target.value)}
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