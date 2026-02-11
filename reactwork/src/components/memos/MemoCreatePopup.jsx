import { useState } from "react";
import { usePosts } from "../../context/PostContext";
import "../../componentsCss/memosCss/MemoCreatePopup.css";

// 중요도 상수 정의
export const PRIORITY_LEVELS = {
    URGENT: 0,    // 긴급
    HIGH: 1,      // 높음
    MEDIUM: 2,    // 보통
    LOW: 3,       // 낮음
    NONE: 4       // 없음
};

export const PRIORITY_COLORS = {
    [PRIORITY_LEVELS.URGENT]: "#FF3B30",   // 빨간색
    [PRIORITY_LEVELS.HIGH]: "#FF9500",     // 주황색
    [PRIORITY_LEVELS.MEDIUM]: "#2383e2",   // 파란색
    [PRIORITY_LEVELS.LOW]: "#4CAF50",      // 초록색
    [PRIORITY_LEVELS.NONE]: "#8E8E93"      // 회색
};

export const PRIORITY_LABELS = {
    [PRIORITY_LEVELS.URGENT]: "긴급",
    [PRIORITY_LEVELS.HIGH]: "높음",
    [PRIORITY_LEVELS.MEDIUM]: "보통",
    [PRIORITY_LEVELS.LOW]: "낮음",
    [PRIORITY_LEVELS.NONE]: "없음"
};

export default function MemoCreatePopup({ onClose, onSuccess }) {
    const { addPost } = usePosts();
    const [content, setContent] = useState("");
    const [priority, setPriority] = useState(PRIORITY_LEVELS.MEDIUM);

    const handleSave = async () => {
        if (!content.trim()) {
            alert("내용을 입력해주세요.");
            return;
        }

        try {
            const newId = await addPost(content.trim(), false, priority);
            if (onSuccess) onSuccess(newId);
            onClose();
        } catch (error) {
            console.error("메모 생성 실패:", error);
            alert("메모 생성에 실패했습니다.");
        }
    };

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="memo-create-popup" onClick={e => e.stopPropagation()}>
                <h3>새 메모 작성</h3>
                
                <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="메모 내용을 입력하세요..."
                    className="memo-content-input"
                    autoFocus
                />
                
                <div className="priority-selector">
                    <label>중요도</label>
                    <div className="priority-options">
                        {Object.entries(PRIORITY_LABELS).map(([level, label]) => {
                            const levelNum = parseInt(level);
                            const isSelected = priority === levelNum;
                            return (
                                <button
                                    key={level}
                                    type="button"
                                    className={`priority-btn ${isSelected ? 'selected' : ''}`}
                                    style={{
                                        backgroundColor: isSelected ? PRIORITY_COLORS[levelNum] : 'transparent',
                                        borderColor: PRIORITY_COLORS[levelNum],
                                        color: isSelected ? '#fff' : PRIORITY_COLORS[levelNum]
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
                
                <div className="popup-buttons">
                    <button className="btn btn-secondary" onClick={onClose}>
                        취소
                    </button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
}

