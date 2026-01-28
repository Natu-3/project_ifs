import { useState } from "react";
import { usePosts } from "../context/PostContext";
import '../componentsCss/Sidebar.css';

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(true);
    const {posts, setSelectedPostId,addPost,deletePost} = usePosts();

    const handleToggle = () => {
        setIsOpen(prev => !prev);
    };

    // const handleAddPost = () => {
    //     setPosts(prev => [
    //         ...prev,
    //         {
    //             id : Date.now(),
    //             title: "new write"
    //         }
    //     ]);
    // };
    
    return(
        <aside className={`sidebar ${isOpen?'open':'closed'}`}>
            <div className="sidebar-header">
                <h2 className="sidebar-title">PostList</h2>
            </div>

            <button className="toggle-note-btn" onClick={handleToggle}>
                {'<'}
            </button>

            <ul className="sidebar-list">
                {posts.map(post => (
                    <li
                        key={post.id}
                        className="siderbar-item"
                        onClick={()=>setSelectedPostId(post.id)}
                    >
                        {post.title}
                        <button
                            onClick={(e) =>{
                                e.stopPropagation();
                                deletePost(post.id);
                            }}
                        >
                            ✕
                        </button>
                    </li>
                ))}
                <button className="sidebar-add-btn" onClick={addPost}>
                    +
                </button>
            </ul>
        </aside>
    )
}