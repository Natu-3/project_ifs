import { createContext, useContext, useState } from "react";

const PostContext = createContext();

export function PostProvider({ children }) {
    const [posts, setPosts] = useState([]);
    const [selectedPostId, setSelectedPostId] = useState(null);

    const addPost = () => {
        const newPost = {
            id: Date.now(),
            title : "new post",
            content : ""
        };
        setPosts(prev => [...prev, newPost]);
        setSelectedPostId(newPost.id);
    };

    const updatePost = (id, updated) => {
        setPosts(prev =>
            prev.map(post => post.id === id ? updated : post)
        );
    };

    const deletePost = (id) => {
        setPosts(prev => prev.filter(p => p.id !== id));
        if (id === selectedPostId) setSelectedPostId(null);
    };

    const selectedPost = posts.find(p => p.id === selectedPostId);

    return(
        <PostContext.Provider value={{
            posts,
            setSelectedPostId,
            addPost,
            deletePost
        }}>
            {children}
        </PostContext.Provider>
    );
}

export const usePosts = () => useContext(PostContext);