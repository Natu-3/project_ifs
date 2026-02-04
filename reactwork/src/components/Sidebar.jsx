import { useState } from "react";
import { usePosts } from "../context/PostContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import '../componentsCss/Sidebar.css';

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(true);
    const { posts, setSelectedPostId, addPost, deletePost, selectedPostId } = usePosts();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    const handleToggle = () =>{
        setIsOpen(prev => !prev);
    };

    const handleDragStart = (e, postId) => {
        e.dataTransfer.setData("postId", postId);
    };

    const handleAddnewPost = () => {
        const newId = addPost("새 메모", "", "");
        setSelectedPostId(newId);
    };

    
    return(
        <aside className={`sidebar ${isOpen?'open':'closed'}`}>
            <div className="sidebar-header">
    {!user ? (
        <h2
            className="sidebar-title"
            onClick={() => navigate("/login")}
        >
                    {user ?`${user.id} 님 환영합니다.`: 'Login'}
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
            </div>
        )}
        </div>

            <button className="toggle-note-btn" onClick={handleToggle}>
                {'<'}
            </button>

            <ul className="sidebar-list">
                {posts.map(post => (
                    <li
                        key={post.id}
                        className={`sidebar-item ${selectedPostId === post.id ? 'selected' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, post.id)}
                        onClick={()=>setSelectedPostId(post.id)}
                    >
                        {post.title || "제목 없음"}
                        <button
                            onClick={(e) =>{
                                e.stopPropagation();
                                deletePost(post.id);
                            }}
                        >✕</button>
                    </li>
                ))}
                <button className="sidebar-add-btn" onClick={handleAddnewPost}>
                    +
                </button>
            </ul>
        </aside>
    )
}