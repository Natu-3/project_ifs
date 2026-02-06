import { createContext, useContext, useState, useEffect } from "react";
import { getMemos, createMemo, updateMemo, deleteMemo } from "../api/memo";
import { useAuth } from "./AuthContext";


const PostContext = createContext();

export function PostProvider({ children }) {
    const [posts, setPosts] = useState([]);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hydrated, setHydrated] = useState(false);
    const {user} = useAuth();
    // 컴포넌트 마운트 시 메모 목록 불러오기
    useEffect(() => {
    if (!user) {
        // 🔹 비로그인 상태
        setPosts([]);
        setSelectedPostId(null);
        setHydrated(false);
        return;
    }

    // 🔹 로그인된 순간
    setPosts([]);               // ⭐ 중요: 기존 비로그인 메모 제거
    setSelectedPostId(null);
    setHydrated(false);

    loadMemos();                // 서버 메모만 다시 로드
}, [user]);

    // 서버에서 메모 목록 불러오기
    const loadMemos = async () => {
        try {
            setLoading(true);
            const response = await getMemos();
            // 백엔드 응답을 프론트엔드 형식으로 변환
            const formattedPosts = response.data.map(memo => {
                const content = memo.content ?? "";
                const pinned = memo.pinned ?? false;
                const title =
                    (content.trim().length > 0 ? content.substring(0, 10) : "새 메모");

                return {
                    id: memo.id,
                    title,
                    content,
                    pinned
                };
            });

            // pinned 먼저, 그 다음 최신 순(서버가 최신순이면 유지)
            setPosts(
                formattedPosts.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
            );
        } catch (error) {
            console.error("메모 불러오기 실패:", error);
            // 에러 발생 시 빈 배열로 설정
            setPosts([]);
        } finally {
            setLoading(false);
            setHydrated(true);
        }
    };

    // 메모 추가
    // 메모 추가 (빈 메모를 기본으로 생성)
    const addPost = async (content = "", pinned = false) => {
        try {
            const response = await createMemo(content, pinned);
            const newMemo = response.data;
            const newContent = newMemo.content ?? content ?? "";
            const newPost = {
                id: newMemo.id,
                title: newContent.trim().length > 0 ? newContent.substring(0, 10) : "새 메모",
                content: newContent,
                pinned: newMemo.pinned ?? pinned
            };
            
            setPosts(prev => {
                const next = [...prev, newPost];
                return next.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
            });
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
            const content = updated.content ?? "";
            const pinned = updated.pinned;
            await updateMemo(id, content, pinned ?? null);
            setPosts(prev => {
                const next = prev.map(post =>
                    post.id === id
                        ? {
                            ...post,
                            ...updated,
                            content,
                            title: content.trim().length > 0 ? content.substring(0, 10) : "새 메모"
                        }
                        : post
                );
                return next.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
            });
        } catch (error) {
            console.error("메모 수정 실패:", error);
            alert("메모 수정에 실패했습니다.");
            throw error;
        }
    };

    // 메모 고정 토글
    const togglePinned = async (id) => {
        const post = posts.find(p => p.id === id);
        if (!post) return;

        const nextPinned = !post.pinned;
        await updatePost(id, { ...post, pinned: nextPinned });
    };

    // 메모 삭제
    const deletePost = async (id) => {
        try {
            const target = posts.find(p => p.id === id);
            const isEmpty = !target || (target.content ?? "").trim().length === 0 || (target.content ?? "").trim() === "새 메모";
            if (isEmpty) {
                const ok = window.confirm("내용이 비어있는 메모입니다. 삭제할까요?");
                if (!ok) return;
            }

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
    

    //메모 리셋
    const resetPosts = () => {
    setPosts([]);
    setSelectedPostId(null);
    setLoading(false);
    setHydrated(false);
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
            togglePinned,
            loading,
            hydrated,
            loadMemos,  // 필요시 수동으로 새로고침
            resetPosts
        }}>
            {children}
        </PostContext.Provider>
    );
}

export const usePosts = () => useContext(PostContext);