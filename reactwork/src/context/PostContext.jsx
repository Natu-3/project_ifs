import { createContext, useContext, useState } from "react";

const PostContext = createContext();

export function PostProvider({ children }) {

    /*
      posts 상태
      - 모든 post 목록을 배열로 관리
      - 각 post는 { id, title, content } 형태
    */
    const [posts, setPosts] = useState([]);

    /*
      selectedPostId 상태
      - 현재 선택된 post의 id를 저장
      - null이면 아무 post도 선택되지 않은 상태
    */
    const [selectedPostId, setSelectedPostId] = useState(null);

    /*
      addPost 함수
      - 새로운 post를 생성해서 posts 배열에 추가
      - 생성과 동시에 해당 post를 선택 상태로 만듦
    */
    const addPost = () => {
        const newPost = {
            id: Date.now(),      // 고유 id (현재 시간 기준)
            title : "new post",  // 기본 제목
            content : ""         // 초기 내용은 빈 문자열
        };

        // 기존 posts 배열에 새 post 추가
        setPosts(prev => [...prev, newPost]);

        // 새로 만든 post를 선택 상태로 설정
        setSelectedPostId(newPost.id);
    };

    /*
      updatePost 함수
      - 특정 id의 post를 수정할 때 사용
      - id가 같은 post만 updated 객체로 교체
    */
    const updatePost = (id, updated) => {
        setPosts(prev =>
            prev.map(post =>
                post.id === id ? updated : post
            )
        );
    };

    /*
      deletePost 함수
      - 특정 id의 post를 목록에서 제거
      - 삭제한 post가 선택된 상태였다면 선택 해제
    */
    const deletePost = (id) => {
        // 해당 id를 가진 post 제거
        setPosts(prev => prev.filter(p => p.id !== id));

        // 삭제한 post가 현재 선택된 post라면 선택 해제
        if (id === selectedPostId) {
            setSelectedPostId(null);
        }
    };

    /*
      selectedPost
      - posts 배열에서 selectedPostId와 일치하는 post 찾기
      - 없으면 undefined
      (에디터나 상세 뷰에서 바로 사용 가능)
    */
    const selectedPost = posts.find(p => p.id === selectedPostId);

    return(
        /*
          Context Provider
          - value에 담긴 값들이 하위 컴포넌트에서 사용 가능
        */
        <PostContext.Provider value={{
            posts,               // 전체 post 목록
            setSelectedPostId,   // post 선택 함수
            addPost,             // post 추가
            deletePost           // post 삭제
            // ⚠ updatePost, selectedPost도 필요하면 여기 추가 가능
        }}>
            {children}
        </PostContext.Provider>
    );
}

/*
  usePosts 커스텀 훅
  - 매번 useContext(PostContext)를 쓰지 않도록 추상화
  - 컴포넌트에서 const { posts, addPost } = usePosts() 형태로 사용
*/
export const usePosts = () => useContext(PostContext);
