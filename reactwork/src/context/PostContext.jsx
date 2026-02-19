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
    const orderStorageKey = user?.id ? `memo_order:${user.id}` : null;

    const orderPosts = (items, preferredOrderIds = []) => {
        const orderMap = new Map(preferredOrderIds.map((id, index) => [id, index]));
        return [...items].sort((a, b) => {
            const aIndex = orderMap.get(a.id);
            const bIndex = orderMap.get(b.id);
            const aHasOrder = aIndex !== undefined;
            const bHasOrder = bIndex !== undefined;

            if (aHasOrder && bHasOrder) return aIndex - bIndex;
            if (aHasOrder) return -1;
            if (bHasOrder) return 1;

            // 기본 정렬: pinned 우선, 이후 id 오름차순
            if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
            return a.id - b.id;
        });
    };

    const saveOrder = (orderedPosts) => {
        if (!orderStorageKey) return;
        try {
            localStorage.setItem(orderStorageKey, JSON.stringify(orderedPosts.map((post) => post.id)));
        } catch {
            // localStorage 저장 실패는 무시
        }
    };

    // 로그인 상태 변경 시 메모 목록 불러오기
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

        loadMemos();                // 서버 메모만 다시 로드 (user.id 사용)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // 서버에서 메모 목록 불러오기
    const loadMemos = async () => {
        if (!user?.id) {
            setPosts([]);
            setHydrated(true);
            return;
        }
        
        try {
            setLoading(true);
            // user.id를 직접 전달 (로그인한 사용자의 ID)
            const response = await getMemos(user.id);
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
                    pinned,
                    priority: memo.priority ?? 2
                };
            });

            // pinned 먼저, 그 다음 최신 순(서버가 최신순이면 유지)
            const storedOrder = (() => {
                if (!orderStorageKey) return [];
                try {
                    return JSON.parse(localStorage.getItem(orderStorageKey) ?? "[]");
                } catch {
                    return [];
                }
            })();

        setPosts(orderPosts(formattedPosts, Array.isArray(storedOrder) ? storedOrder : []));
            
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
    const addPost = async (content = "", pinned = false, priority = 2) => {
        if (!user?.id) {
            alert("로그인이 필요합니다.");
            throw new Error("로그인이 필요합니다.");
        }
        
        try {
            // user.id를 직접 전달 (로그인한 사용자의 ID)
            const response = await createMemo(user.id, content, pinned, priority);
            const newMemo = response.data;
            const newContent = newMemo.content ?? content ?? "";
            const newPost = {
                id: newMemo.id,
                title: newContent.trim().length > 0 ? newContent.substring(0, 10) : "새 메모",
                content: newContent,
                pinned: newMemo.pinned ?? pinned,
                priority: newMemo.priority ?? priority
            };
            
            setPosts(prev => {
                const next = [...prev, newPost];
                saveOrder(next);
                return next;
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
        if (!user?.id) {
            alert("로그인이 필요합니다.");
            throw new Error("로그인이 필요합니다.");
        }
        
        try {
            const content = updated.content ?? "";
            const pinned = updated.pinned;
            const priority = updated.priority;
            // user.id를 직접 전달 (로그인한 사용자의 ID)
            await updateMemo(user.id, id, content, pinned ?? null, priority ?? null);
            setPosts(prev => {
                const next = prev.map(post =>
                    post.id === id
                        ? {
                            ...post,
                            ...updated,
                            content,
                            title: content.trim().length > 0 ? content.substring(0, 10) : "새 메모",
                            priority: updated.priority ?? post.priority ?? 2
                        }
                        : post
                );
                saveOrder(next);
                return next;
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
        if (!user?.id) {
            alert("로그인이 필요합니다.");
            throw new Error("로그인이 필요합니다.");
        }
        
        try {
            const target = posts.find(p => p.id === id);
            const isEmpty = !target || (target.content ?? "").trim().length === 0 || (target.content ?? "").trim() === "새 메모";
            if (isEmpty) {
                const ok = window.confirm("내용이 비어있는 메모입니다. 삭제할까요?");
                if (!ok) return;
            }

            // user.id를 직접 전달 (로그인한 사용자의 ID)
            await deleteMemo(user.id, id);
            setPosts(prev => {
                const next = prev.filter(p => p.id !== id);
                saveOrder(next);
                return next;
            });
            
            if (id === selectedPostId) {
                setSelectedPostId(null);
            }
        } catch (error) {
            console.error("메모 삭제 실패:", error);
            alert("메모 삭제에 실패했습니다.");
            throw error;
        }
    };
    
    const reorderPosts = (draggedPostId, targetPostId) => {
        if (!draggedPostId || !targetPostId || draggedPostId === targetPostId) return;

        setPosts((prev) => {
            const fromIndex = prev.findIndex((post) => post.id === draggedPostId);
            const toIndex = prev.findIndex((post) => post.id === targetPostId);
            if (fromIndex < 0 || toIndex < 0) return prev;

            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            saveOrder(next);
            return next;
        });
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
            reorderPosts,
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