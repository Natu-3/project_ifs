import { useMemo, useState } from "react";
import { usePosts } from "../context/PostContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(true);
<<<<<<< HEAD
<<<<<<< HEAD
    const [query, setQuery] = useState("");
    const { posts, setSelectedPostId, addPost, deletePost, togglePinned, selectedPostId } = usePosts();
    const { user , logout} = useAuth();
=======
    const { posts, setSelectedPostId, addPost, deletePost, selectedPostId } = usePosts();
    const { user, logout } = useAuth();
>>>>>>> 18b87c1 (02.04.19:12 로그아웃 기능병합)
=======
    const [query, setQuery] = useState("");
    const { posts, setSelectedPostId, addPost, deletePost, togglePinned, selectedPostId } = usePosts();
<<<<<<< HEAD
    const { user } = useAuth();
>>>>>>> 8f913f5 (사이드바 및 메인 note 사이드바 추가 add-btn 하단 고정 text공간 확보 26.02.05 09:29)
=======
    const { user , logout} = useAuth();
>>>>>>> 9559777 (merge sidebar)
    const navigate = useNavigate();
    
    const handleToggle = () =>{
        setIsOpen(prev => !prev);
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
            <div className="sidebar-header">
    {!user ? (
        <h2
            className="sidebar-title"
            onClick={() => navigate("/login")}
        >
                    {user ?`${user.id} 님 환영합니다.`: 'Login'}
<<<<<<< HEAD
<<<<<<< HEAD
=======
<<<<<<< HEAD
                </h2>
<<<<<<< HEAD
                <button className="toggle-note-btn" onClick={handleToggle} title={isOpen ? "사이드바 닫기" : "사이드바 열기"}>
                    {isOpen ? '◀' : '▶'}
=======
>>>>>>> e2f048763801fac05ebc6281aa0b9cb89ccd8adc
=======
>>>>>>> 18b87c1 (02.04.19:12 로그아웃 기능병합)
        </h2>
    ) : (
            <div className="sidebar-user">
                <span className="sidebar-title">
                    {user.id} 님 환영합니다.
                </span>
                <button
                    className="logout-btn"
                    onClick={() => {
                        logout();
                        navigate("/login");
                    }}
                >
                    로그아웃
                </button>
<<<<<<< HEAD
=======
>>>>>>> parent of c01c3e5 (사이드바 중간 머지)
=======
>>>>>>> 18b87c1 (02.04.19:12 로그아웃 기능병합)
            </div>
        )}
        </div>

            <button className="toggle-note-btn" onClick={handleToggle}>
                {'<'}
            </button>

            <div className="sidebar-search">
                <input
                    className="sidebar-search-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="메모 검색..."
                />
            </div>
<<<<<<< HEAD
<<<<<<< HEAD
=======
<<<<<<< HEAD

<<<<<<< HEAD
            <div className="sidebar-list-wrapper">
                <ul className="sidebar-list">
                    {filteredPosts.map(post => (
                        <li
                            key={post.id}
                            className={`sidebar-item ${selectedPostId === post.id ? 'selected' : ''}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, post.id)}
                            onClick={()=>setSelectedPostId(post.id)}
=======
>>>>>>> e2f048763801fac05ebc6281aa0b9cb89ccd8adc
            <div className="sidebar-list-wrapper">
=======
>>>>>>> parent of c01c3e5 (사이드바 중간 머지)
=======
            <div className="sidebar-list-wrapper">
>>>>>>> 8f913f5 (사이드바 및 메인 note 사이드바 추가 add-btn 하단 고정 text공간 확보 26.02.05 09:29)
            <ul className="sidebar-list">
                {filteredPosts.map(post => (
                    <li
                        key={post.id}
                        className={`sidebar-item ${selectedPostId === post.id ? 'selected' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, post.id)}
                        onClick={()=>setSelectedPostId(post.id)}
                    >
                        <button
                            className={`pin-btn ${post.pinned ? "pinned" : ""}`}
                            title={post.pinned ? "고정 해제" : "고정"}
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePinned(post.id);
                            }}
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 3017083dd63962be2f59b2700e5299fb61d2bf12
=======
>>>>>>> parent of c01c3e5 (사이드바 중간 머지)
>>>>>>> e2f048763801fac05ebc6281aa0b9cb89ccd8adc
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
                                deletePost(post.id);
                            }}
                        >✕</button>
                    </li>
<<<<<<< HEAD
<<<<<<< HEAD
=======
<<<<<<< HEAD
<<<<<<< HEAD
                </ul>
=======
>>>>>>> e2f048763801fac05ebc6281aa0b9cb89ccd8adc
=======
>>>>>>> 8f913f5 (사이드바 및 메인 note 사이드바 추가 add-btn 하단 고정 text공간 확보 26.02.05 09:29)
                    ))}
            </ul>
            </div>
            <div className="sidebar-footer">
<<<<<<< HEAD
                <button className="sidebar-add-btn" onClick={handleAddnewPost}>
                    +
                </button>
            </div>
=======
                ))}
                <button className="sidebar-add-btn" onClick={handleAddnewPost}>
                    +
                </button>
            </ul>
>>>>>>> parent of c01c3e5 (사이드바 중간 머지)
=======
                <button className="sidebar-add-btn" onClick={handleAddnewPost}>
                    +
                </button>
            </div>
>>>>>>> 8f913f5 (사이드바 및 메인 note 사이드바 추가 add-btn 하단 고정 text공간 확보 26.02.05 09:29)
        </aside>
    )
}