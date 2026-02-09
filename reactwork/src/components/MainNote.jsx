import { useState, useEffect, useRef } from 'react'
import { usePosts } from '../context/PostContext'
import { useAuth } from '../context/AuthContext'
import { useCalendar } from '../context/CalendarContext'
import { useTeamCalendar } from '../components/TeamCalendarContext'
import '../componentsCss/MainNote.css'

export default function MainNote() {
    const { posts, loading, hydrated, selectedPost, selectedPostId, updatePost, addPost, setSelectedPostId } = usePosts();
    const { user } = useAuth();
    const { getPostCalendarInfo } = useCalendar();
    const { teams } = useTeamCalendar();

    const [isDragOver, setIsDragOver] = useState(false);

    const [ text, setText ] = useState('');

    const [ cards, setCards ] = useState([]);

    const textAreaRef = useRef(null);

    const storageKey = `mainnote_cards:${user?.id ?? 'guest'}`;
    const guestStorageKey = `mainnote_cards:guest`;

    // key별로 "복원(hydrate) 완료" 전에는 저장하지 않기 위한 플래그
    const hydratedKeysRef = useRef(new Set());
    // guest -> user 1회 마이그레이션(복사) 방지
    const migratedGuestToUserRef = useRef(false);

    // 새로고침해도 중앙 카드가 유지되도록 localStorage에 저장/복원
    useEffect(() => {
        // 이미 이 storageKey에 대해 복원했으면 다시 복원하지 않음 (중복 방지)
        if (hydratedKeysRef.current.has(storageKey)) {
            return;
        }
        
        try {
            // 1) 로그인 직후 user 키에 저장된 카드가 없으면, guest 키에서 1회 복사(마이그레이션)
            //    - "다시 로그인하면 사라짐" 문제의 대부분이 여기서 발생 (guest에만 저장돼 있던 케이스)
            if (user?.id && !migratedGuestToUserRef.current) {
                const userRaw = localStorage.getItem(storageKey);
                const guestRaw = localStorage.getItem(guestStorageKey);
                if ((!userRaw || userRaw === "[]") && guestRaw && guestRaw !== "[]") {
                    localStorage.setItem(storageKey, guestRaw);
                }
                migratedGuestToUserRef.current = true;
            }

            const raw = localStorage.getItem(storageKey);
            if (!raw) {
                // 이 키에 저장된 게 없으면 cards를 강제로 비우지 않는다(기존 상태 유지)
                hydratedKeysRef.current.add(storageKey);
                return;
            }

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                hydratedKeysRef.current.add(storageKey);
                return;
            }

            // 저장 포맷: [{ postId: number } ...]
            const restored = parsed
                .map((x) => ({ postId: Number(x?.postId) }))
                .filter((x) => Number.isFinite(x.postId));

            // posts가 아직 로드 전이어도 일단 복원해두고, 아래 posts 동기화 effect가 정리해줌
            if (restored.length > 0) {
                setCards(restored.map(r => ({ id: r.postId, postId: r.postId, title: '' })));
            }
            hydratedKeysRef.current.add(storageKey);
        } catch {
            // 파싱 실패 시 무시
            hydratedKeysRef.current.add(storageKey);
        }
        // user 변경 시(로그인/로그아웃) 다른 키로 복원
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storageKey]);

    useEffect(() => {
        // 이 storageKey에 대해 복원이 끝나기 전에는 "빈 배열 저장" 같은 덮어쓰기를 막는다
        if (!hydratedKeysRef.current.has(storageKey)) return;
        try {
            const minimal = cards.map(c => ({ postId: c.postId }));
            localStorage.setItem(storageKey, JSON.stringify(minimal));
        } catch {
            // 저장 실패 시 무시(스토리지 제한 등)
        }
    }, [cards, storageKey]);

    useEffect(() => {
        const content = selectedPost?.content || '';
        // 과거에 "새 메모"를 실제 내용으로 저장해둔 경우도, 선택 시 바로 입력 가능하도록 비워줌
        const nextText = content === '새 메모' ? '' : content;
        setText(nextText);
        if (selectedPost) {
            textAreaRef.current?.focus();
            // "새 메모" 텍스트가 있으면 자동으로 선택 (삭제 가능하도록)
            if (content === '새 메모' || content.trim() === '') {
                setTimeout(() => {
                    if (textAreaRef.current) {
                        textAreaRef.current.select();
                    }
                }, 0);
            }
        }
    },[selectedPost]);

    // posts가 변경될 때마다 cards를 동기화
    // 삭제된 메모의 카드는 제거하고, 메모 제목이 변경되면 카드 제목도 업데이트
    useEffect(() => {
        setCards(prevCards => {
            // 최초 1회 posts 로드가 끝나기 전에는(=hydrated 전) 복원한 cards를 지우지 않음
            // 로딩 중에도 동일하게 보호
            // posts가 비어있을 때도 복원된 카드를 지우지 않음
            if (!hydrated || loading || posts.length === 0) return prevCards;

            const updatedCards = prevCards
                .filter(card => posts.some(post => post.id === card.postId))
                .map(card => {
                    const post = posts.find(p => p.id === card.postId);
                    return post ? {
                        ...card,
                        title: post.title || '제목없음'
                    } : card;
                });
            
            // 삭제된 카드 중에 현재 선택된 메모가 있다면 선택 해제
            const deletedCardIds = prevCards
                .filter(card => !posts.some(post => post.id === card.postId))
                .map(card => card.postId);
            
            if (selectedPostId && deletedCardIds.includes(selectedPostId)) {
                setSelectedPostId(null);
            }
            
            return updatedCards;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [posts]);

    const handleSave = async () => {
        const trimmedText = text.trim();
        
        // 빈 메모는 저장하지 않음 (삭제는 삭제 버튼에서만)
        if (!trimmedText) return;
    
        try {
            if (selectedPost){
                await updatePost(selectedPost.id, {
                    ...selectedPost, 
                    content: trimmedText, 
                    title: trimmedText.substring(0,10)
                });
            } else {
                await addPost(trimmedText);
            }
        } catch (error) {
            // 에러는 이미 PostContext에서 처리됨
        }
    };
    
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);

        const postId = Number(e.dataTransfer.getData("postId"));

        const post = posts.find(p => p.id === postId);
        if(!post) return ;

        const newCard = {
            id: post.id,
            postId: post.id,
            title : post.title
        };

        setCards(prev => {
            const exists = prev.some(card => card.postId === postId)
            if (exists) return prev;
            
            return [...prev, newCard];
        });

        setSelectedPostId(postId);
    }

    const handleDeleteCard = (cardId) => {
        setCards(prev => {
            const deletedCard = prev.find(card => card.id === cardId);
            // 삭제된 카드가 현재 선택된 메모라면 선택 해제
            if (deletedCard && deletedCard.postId === selectedPostId) {
                setSelectedPostId(null);
            }
            return prev.filter(card => card.id !== cardId);
        });
    }

    return(
        <main className='mainnote'
            onDragOver={(e) =>{e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={()=> setIsDragOver(false)}
            onDrop={handleDrop}>
            <div className='card-area'>
                {cards.map(card=> {
                    // posts에서 최신 메모 정보를 가져옴 (제목이 업데이트되었을 수 있음)
                    const post = posts.find(p => p.id === card.postId);
                    const displayTitle = post?.title || card.title || '제목없음';
                    
                    // 캘린더 정보 가져오기
                    const calendarInfo = getPostCalendarInfo(card.postId);
                    let calendarLabel = null;
                    if (calendarInfo) {
                        if (calendarInfo.type === 'personal') {
                            calendarLabel = '개인';
                        } else if (calendarInfo.type === 'team' && calendarInfo.teamId) {
                            const team = teams.find(t => t.id === calendarInfo.teamId);
                            calendarLabel = team ? team.name : '팀';
                        }
                    }
                    
                    return (
                        <div
                            key={card.id}
                            className={`note-card ${card.postId === selectedPostId ? 'selected' : ''}`}
                            onClick={()=> setSelectedPostId(card.postId)}
                        >
                            {displayTitle}
                            {calendarLabel && (
                                <div className="calendar-badge">
                                    {calendarLabel}
                                </div>
                            )}
                            <button
                                className='delete-card-btn'
                                onClick={(e)=>{
                                    e.stopPropagation();
                                    handleDeleteCard(card.id);
                                }}
                            >
                                x
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="memo-container">
                <textarea
                    ref={textAreaRef}
                    className='memo-post-it'
                    placeholder='메모를 입력하세요...'
                    value={text}
                    onFocus={() => {
                        // 값이 "새 메모"로 남아있는 경우, 클릭/탭하면 즉시 비우기
                        if (text === '새 메모') setText('');
                    }}
                    onChange={(e) => setText(e.target.value)}
                />
                <div className='memo-btn'>
                    <button className='AImemo'> AI메모 </button>
                    <button className='save-btn' onClick={handleSave}>↑</button>
                </div>
            </div>
        </main>
        
    )
}