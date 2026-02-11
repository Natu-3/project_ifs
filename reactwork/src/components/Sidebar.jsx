import { useMemo, useState } from "react";
import { usePosts } from "../context/PostContext";
import { useSchedule } from "../context/ScheduleContext";
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
    const { posts, setSelectedPostId, addPost, deletePost, togglePinned, selectedPostId } = usePosts();
    const { getUsedPostIds, getEventColor } = useSchedule();
    const usedPostIds = getUsedPostIds();
    
    // getPostColor는 getEventColor로 대체
    const getPostColor = (postId) => {
        if (!postId) return null;
        return getEventColor(postId);
    };

    const handleDragStart = (e, postId) => {
        e.dataTransfer.setData("postId", postId);
    };

    const handleAddnewPost = () => {
        // 빈 메모 생성 (즉시 선택)
        addPost("").then((newId) => setSelectedPostId(newId));
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
                    const eventColor = hasCalendarEvent ? getPostColor(post.id) : null;
                    
                    return (
                    <li
                        key={post.id}
                        className={`sidebar-item ${selectedPostId === post.id ? 'selected' : ''} ${hasCalendarEvent ? 'has-calendar-event' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, post.id)}
                        onClick={()=>setSelectedPostId(post.id)}
                        style={hasCalendarEvent && eventColor ? {
                            borderLeft: `4px solid ${eventColor}`,
                            backgroundColor: `${eventColor}15`
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
        </aside>
    )
}