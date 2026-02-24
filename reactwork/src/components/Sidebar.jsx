import { useMemo, useState } from "react";
import { usePosts } from "../context/PostContext";
import { useSchedule } from "../context/ScheduleContext";
import MemoCreatePopup from "./memos/MemoCreatePopup";
import '../componentsCss/Sidebar.css';

const CHOSEONG = [
    "ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"
];

const isChoseongChar = (ch) => CHOSEONG.includes(ch);

// 한글 음절 -> 초성 문자열로 변환 (한글이 아니면 그대로)
const toChoseongString = (str) => {
    if (!str) return "";
    let out = "";
    for (const ch of str) {
        const code = ch.charCodeAt(0);
        // 가(0xAC00) ~ 힣(0xD7A3)
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const index = Math.floor((code - 0xAC00) / 588);
            out += CHOSEONG[index] ?? ch;
        } else {
            out += ch;
        }
    }
    return out;
};

const matchesKoreanQuery = (text, rawQuery) => {
    const q = (rawQuery ?? "").trim();
    if (!q) return true;

    const t = (text ?? "").toString();
    const tLower = t.toLowerCase();
    const qLower = q.toLowerCase();

    // 일반 부분일치
    if (tLower.includes(qLower)) return true;

    // 초성-only 쿼리면 초성 문자열로도 매칭
    const qChars = [...q];
    const isChoseongOnly = qChars.every(isChoseongChar);
    if (isChoseongOnly) {
        const tChoseong = toChoseongString(t);
        return tChoseong.includes(q);
    }

    // 혼합 입력(예: "ㅅㅁ메")도 어느 정도 커버: 초성화된 텍스트 vs 쿼리
    const tChoseongLower = toChoseongString(t).toLowerCase();
    return tChoseongLower.includes(qLower);
};

export default function Sidebar({ isOpen, setIsOpen }) {
    const [query, setQuery] = useState("");
    const [draggingPostId, setDraggingPostId] = useState(null);
    const [dragOverPostId, setDragOverPostId] = useState(null);
    const { posts, setSelectedPostId, deletePost, togglePinned, selectedPostId, reorderPosts } = usePosts();
    const { getUsedPostIds, getScheduleColor } = useSchedule();
    const usedPostIds = getUsedPostIds();
    
    // 중요도 색상 정의 (MemoCreatePopup과 동일)
    const PRIORITY_COLORS = {
        0: "#FF3B30",   // 긴급 - 빨간색
        1: "#FF9500",   // 높음 - 주황색
        2: "#2383e2",   // 보통 - 파란색
        3: "#4CAF50",   // 낮음 - 초록색
        4: "#8E8E93"    // 없음 - 회색
    };
    
    // 메모의 priority를 기반으로 색상 반환
    const getPostColor = (postId) => {
        if (!postId || !posts || posts.length === 0) return null;
        try {
            const post = posts.find(p => p.id === postId);
            if (!post) return null;
            
            // 메모의 priority가 있으면 해당 색상 반환
            if (post.priority !== null && post.priority !== undefined) {
                return PRIORITY_COLORS[post.priority] || PRIORITY_COLORS[2];
            }
            
            // priority가 없으면 null 반환 (색상 표시 안 함)
            return null;
        } catch (error) {
            console.error("getPostColor error:", error);
            return null;
        }
    };

    const handleDragStart = (e, postId) => {
        setDraggingPostId(postId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("postId", String(postId));
    };

    const handleItemDragOver = (e, postId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (draggingPostId && draggingPostId !== postId) {
            setDragOverPostId(postId);
        }
    };

    const handleItemDrop = (e, targetPostId) => {
        e.preventDefault();
        const draggedPostId = Number(e.dataTransfer.getData("postId") || draggingPostId);
        if (Number.isFinite(draggedPostId)) {
            reorderPosts(draggedPostId, targetPostId);
        }
        setDragOverPostId(null);
        setDraggingPostId(null);
    };

    const handleDragEnd = () => {
        setDragOverPostId(null);
        setDraggingPostId(null);
    };

    const [showCreatePopup, setShowCreatePopup] = useState(false);

    const handleAddnewPost = () => {
        // 메모 생성 팝업 열기
        setShowCreatePopup(true);
    };

    const filteredPosts = useMemo(() => {
        const q = query.trim();
        if (!q) return posts;
        return posts.filter(p => {
            const title = p.title ?? "";
            const content = p.content ?? "";
            return matchesKoreanQuery(title, q) || matchesKoreanQuery(content, q);
        });
    }, [posts, query]);

    
    return(
        <aside className={`sidebar ${isOpen?'open':'closed'}`}>
            <div className="sidebar-search">
                <input
                    className="sidebar-search-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="메모 검색..."
                />
            </div>
            <div className="sidebar-list-wrapper">
            <ul className="sidebar-list">
                {filteredPosts.map(post => {
                    const hasCalendarEvent = usedPostIds.has(post.id);
                    // 메모의 priority 색상 가져오기 (캘린더 추가 여부와 관계없이)
                    const priorityColor = getPostColor(post.id);
                    
                    return (
                    <li
                        key={post.id}
                        className={`sidebar-item ${selectedPostId === post.id ? 'selected' : ''}
                        ${hasCalendarEvent ? 'has-calendar-event' : ''}
                        ${dragOverPostId === post.id ? 'drag-over' : ''}
                        ${draggingPostId === post.id ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, post.id)}
                        onDragOver={(e) => handleItemDragOver(e, post.id)}
                        onDrop={(e) => handleItemDrop(e, post.id)}
                        onDragEnd={handleDragEnd}
                        onClick={()=>setSelectedPostId(post.id)}
                        style={priorityColor ? {
                            borderLeft: `4px solid ${priorityColor}`,
                            backgroundColor: `${priorityColor}15`
                        } : {}}
                    >
                        <button
                            className={`pin-btn ${post.pinned ? "pinned" : ""}`}
                            title={post.pinned ? "고정 해제" : "고정"}
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePinned(post.id);
                            }}
                        >
                            ★
                        </button>
                        <span className="sidebar-item-title">
                            {post.title || "새 메모"}
                        </span>
                        <button
                            className="delete-btn"
                            onClick={(e) =>{
                                e.stopPropagation();
                                // 이제는 메모를 삭제해도 캘린더 일정은 유지
                                deletePost(post.id);
                            }}
                        >✕</button>
                    </li>
                    );
                })}
            </ul>
            </div>
            <div className="sidebar-footer">
                <button className="sidebar-add-btn" onClick={handleAddnewPost}>
                    +
                </button>
            </div>
            {showCreatePopup && (
                <MemoCreatePopup
                    onClose={() => setShowCreatePopup(false)}
                    onSuccess={(newId) => {
                        if (newId) setSelectedPostId(newId);
                    }}
                />
            )}
        </aside>
    )
}