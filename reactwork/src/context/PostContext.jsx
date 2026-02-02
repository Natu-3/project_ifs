import { createContext, useContext, useState, useEffect } from "react";
import { getMemos, createMemo, updateMemo, deleteMemo } from "../api/memo";

const PostContext = createContext();

export function PostProvider({ children }) {
    const [posts, setPosts] = useState([]);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [loading, setLoading] = useState(false);

    // 컴포넌트 마운트 시 메모 목록 불러오기
    useEffect(() => {
        loadMemos();
    }, []);

    // 서버에서 메모 목록 불러오기
    const loadMemos = async () => {
        try {
            setLoading(true);
            const response = await getMemos();
            // 백엔드 응답을 프론트엔드 형식으로 변환
            const formattedPosts = response.data.map(memo => ({
                id: memo.id,
                title: memo.title || memo.content.substring(0, 10),
                content: memo.content
            }));
            setPosts(formattedPosts);
        } catch (error) {
            console.error("메모 불러오기 실패:", error);
            // 에러 발생 시 빈 배열로 설정
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    // 메모 추가
    const addPost = async (title, content) => {
        try {
            const response = await createMemo(content || title);
            const newMemo = response.data;
            const newPost = {
                id: newMemo.id,
                title: newMemo.title || content.substring(0, 10),
                content: newMemo.content
            };
            
            setPosts(prev => [...prev, newPost]);
            setSelectedPostId(newPost.id);
            return newPost.id;
        } catch (error) {
            console.error("메모 생성 실패:", error);
            alert("메모 생성에 실패했습니다.");
            throw error;
        }
    };

    // 메모 수정
    const updatePost = async (id, updated) => {
        try {
            await updateMemo(id, updated.content);
            setPosts(prev =>
                prev.map(post =>
                    post.id === id ? updated : post
                )
            );
        } catch (error) {
            console.error("메모 수정 실패:", error);
            alert("메모 수정에 실패했습니다.");
            throw error;
        }
    };

    // 메모 삭제
    const deletePost = async (id) => {
        try {
            await deleteMemo(id);
            setPosts(prev => prev.filter(p => p.id !== id));
            
            if (id === selectedPostId) {
                setSelectedPostId(null);
            }
        } catch (error) {
            console.error("메모 삭제 실패:", error);
            alert("메모 삭제에 실패했습니다.");
            throw error;
        }
    };

    const selectedPost = posts.find(p => p.id === selectedPostId);

    return(
        <PostContext.Provider value={{
            posts,
            selectedPost,
            selectedPostId,
            setSelectedPostId,
            addPost,
            updatePost,
            deletePost,
            loading,
            loadMemos  // 필요시 수동으로 새로고침
        }}>
            {children}
        </PostContext.Provider>
    );
}

export const usePosts = () => useContext(PostContext);