import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosts } from '../context/PostContext'
import { useAuth } from '../context/AuthContext'
import { useSchedule } from '../context/ScheduleContext'
import { useTeamCalendar } from '../components/TeamCalendarContext'
import { extractTextFromImage } from '../api/ocr'
import '../componentsCss/MainNote.css'

export default function MainNote() {
    const navigate = useNavigate();
    const { posts, loading, hydrated, selectedPost, selectedPostId, updatePost, addPost, setSelectedPostId } = usePosts();
    const { user } = useAuth();
    const { getPostCalendarInfo } = useSchedule();
    const teamCalendar = useTeamCalendar();
    const teams = teamCalendar?.teams || [];

    const [isDragOver, setIsDragOver] = useState(false);
    const [isCardDragOver, setIsCardDragOver] = useState(false);
    const [isManualEditMode, setIsManualEditMode] = useState(false);
    const [isProcessingOCR, setIsProcessingOCR] = useState(false);
    const [draggingCardId, setDraggingCardId] = useState(null);
    const [cardDropTargetId, setCardDropTargetId] = useState(null);

    const [ text, setText ] = useState('');
    const fileInputRef = useRef(null);

    const [ cards, setCards ] = useState([]);

    const textAreaRef = useRef(null);
    const editDebounceRef = useRef(null);
    const pendingEditRef = useRef(null);
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
        }, [selectedPost]);

    useEffect(() => {
        if (!selectedPost || !isManualEditMode) return;

        const content = selectedPost?.content || '';
        textAreaRef.current?.focus();
        // "새 메모" 텍스트가 있으면 자동으로 선택 (삭제 가능하도록)
        if (content === '새 메모' || content.trim() === '') {
            setTimeout(() => {
                if (textAreaRef.current) {
                    textAreaRef.current.select();
                }
            }, 0);
        }
     }, [selectedPost, isManualEditMode]);

     const clearSelectedPost = () => {
        setSelectedPostId(null);
        setIsManualEditMode(false);
        setText('');
     }



    const activateEditingForPost = (postId) => {
        if (!postId) return;
        setSelectedPostId(postId);
        setIsManualEditMode(true);
    };

    useEffect(() => {
        if (selectedPostId && selectedPost) {
            setIsManualEditMode(true);
        }
    }, [selectedPostId, selectedPost]);

    // posts가 변경될 때마다 cards를 동기화
    // 삭제된 메모의 카드는 제거하고, 메모 제목이 변경되면 카드 제목도 업데이트
    useEffect(() => {
        setCards(prevCards => {
            // 최초 1회 posts 로드가 끝나기 전에는(=hydrated 전) 복원한 cards를 지우지 않음
            // 로딩 중에도 동일하게 보호
            if (!hydrated || loading) return prevCards;

            // 삭제된 메모의 카드는 항상 제거 (posts가 비어있어도)
            const updatedCards = prevCards
                .filter(card => {
                    // posts가 비어있으면 모든 카드 제거
                    if (posts.length === 0) return false;
                    // posts에 해당 postId가 있으면 유지
                    return posts.some(post => post.id === card.postId);
                })
                .map(card => {
                    const post = posts.find(p => p.id === card.postId);
                    return post ? {
                        ...card,
                        title: post.title || '제목없음'
                    } : card;
                });
            
            // 삭제된 카드 중에 현재 선택된 메모가 있다면 선택 해제
            const deletedCardIds = prevCards
                .filter(card => {
                    if (posts.length === 0) return true;
                    return !posts.some(post => post.id === card.postId);
                })
                .map(card => card.postId);
            
            if (selectedPostId && deletedCardIds.includes(selectedPostId)) {
                //setSelectedPostId(null);
                clearSelectedPost();
            }
            
            return updatedCards;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [posts, hydrated, loading]);

     const flushPendingEdit = async () => {
        const pending = pendingEditRef.current;
        if (!pending) return;

        pendingEditRef.current = null;
        if (editDebounceRef.current) {
            clearTimeout(editDebounceRef.current);
            editDebounceRef.current = null;
        }

        try {
            await updatePost(pending.id, {
                ...pending.post,
                content: pending.content,
                title: (pending.content || '').substring(0, 10),
                priority: 2
            });
        } catch {
            // 에러는 이미 PostContext에서 처리됨
        }
    };

    useEffect(() => {
        flushPendingEdit();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPostId]);

    useEffect(() => {
        return () => {
            flushPendingEdit();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleMemoChange = (nextText) => {
        setText(nextText);

        if (!selectedPost) return;

        const nextContent = nextText.trim();
        const currentContent = (selectedPost.content || '').trim();
        if (nextContent === currentContent) return;

        pendingEditRef.current = {
            id: selectedPost.id,
            post: selectedPost,
            content: nextText
        };

        if (editDebounceRef.current) {
            clearTimeout(editDebounceRef.current);
        }

        editDebounceRef.current = setTimeout(() => {
            flushPendingEdit();
        }, 400);
    };


    const handleSave = async () => {
        const trimmedText = text.trim();
        
        // 빈 메모는 저장하지 않음 (삭제는 삭제 버튼에서만)
        if (!trimmedText) return;
    
        try {
            if (selectedPost){
                await updatePost(selectedPost.id, {
                    ...selectedPost, 
                    content: trimmedText,
                    title: trimmedText.substring(0,10),
                    priority: 2
                });
                clearSelectedPost();
                textAreaRef.current?.focus();
            }else {
                await addPost(trimmedText, false, 2);
                // setCards(prev => {
                //     if (prev.some(card => card.postId === newPostId)) {
                //         return prev;
                //     }

                //     return [
                //         ...prev,
                //         {
                //             id: newPostId,
                //             postId: newPostId,
                //             title: trimmedText.substring(0, 10),
                //             priority: 2
                //         }
                //     ];
                // });
                clearSelectedPost();
               // textAreaRef.current.focus();

            }
        } catch{
            // 에러는 이미 PostContext에서 처리됨
        }
    };
    
    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragOver(false);

        // 이미지 파일이 드롭되었는지 확인
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const imageFile = Array.from(files).find(file => file.type.startsWith('image/'));
            if (imageFile) {
                // 이미지 파일이면 OCR 처리
                await processImageFile(imageFile);
                return;
            }
        }

        // 메모 카드 드롭 처리 (기존 로직)
        const postId = Number(e.dataTransfer.getData("postId"));
        if (!postId) return;

        const post = posts.find(p => p.id === postId);
        if(!post) return ;

        const newCard = {
            id: post.id,
            postId: post.id,
            title : post.title
        };

        setCards(prev => {
              const exists = prev.some(card => card.postId === postId);
            // 정책: 중복 드롭이든 신규 드롭이든 드롭 직후에는 항상 "선택 없음" 상태 유지
            if (exists) {
                clearSelectedPost();
                setText('');
                return prev;
            }
            
            return [...prev, newCard];
        });
         clearSelectedPost();
    }

    const handleDeleteCard = (cardId) => {
        setCards(prev => {
            const deletedCard = prev.find(card => card.id === cardId);
            // 삭제된 카드가 현재 선택된 메모라면 선택 해제
            if (deletedCard && deletedCard.postId === selectedPostId) {
               // setSelectedPostId(null);
               clearSelectedPost();
            }
            return prev.filter(card => card.id !== cardId);
        });
    }

    const handleMainClick = (e) => {
            if (e.target === e.currentTarget) {
                textAreaRef.current?.blur();
                flushPendingEdit();
                clearSelectedPost();
            }
        }

    const handleAIMemo = () => {
        navigate('/chatbot', {
            state: {
                initialPrompt: text || '',
                source: 'main-note',
            },
        });
    };

    const handleImageUpload = () => {
        fileInputRef.current?.click();
    };

    // 이미지 파일 처리 함수 (공통 로직)
    const processImageFile = async (file) => {
        // 이미지 파일인지 확인
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }

        // 파일 크기 제한 (10MB - 큰 이미지는 자동으로 리사이즈됨)
        if (file.size > 10 * 1024 * 1024) {
            alert('이미지 크기는 10MB 이하여야 합니다.');
            return;
        }

        setIsProcessingOCR(true);
        try {
            // OCR API 호출
            const result = await extractTextFromImage(file, [], 'json');
            
            // OCR 결과를 구조화된 형태로 변환
            let ocrContent = '';
            let ocrData = null;
            
            if (typeof result === 'string') {
                // 문자열인 경우 JSON 파싱 시도
                try {
                    ocrData = JSON.parse(result);
                } catch {
                    ocrData = { rawText: result };
                }
            } else if (result && typeof result === 'object') {
                ocrData = result;
            } else {
                ocrData = { rawText: String(result) };
            }

            // OCR 데이터를 읽기 쉬운 형태로 변환
            ocrContent = formatOCRResult(ocrData);

            // OCR 결과를 JSON 형식으로도 포함 (원본 데이터 보존)
            const jsonData = JSON.stringify(ocrData, null, 2);
            const fullContent = `${ocrContent}\n\n--- 원본 JSON 데이터 ---\n${jsonData}`;

            // 기존 텍스트가 있으면 줄바꿈 후 추가, 없으면 그대로 설정
            const newText = text.trim() 
                ? `${text}\n\n${fullContent}` 
                : fullContent;
            
            // 메모 영역에 OCR 결과 표시 (DB 저장은 하지 않음)
            setText(newText);
            
            // 수동 편집 모드 활성화
            setIsManualEditMode(true);
            
            // 기존 선택 해제 (새 메모 상태로)
            clearSelectedPost();
            
            // 포커스 이동
            setTimeout(() => {
                textAreaRef.current?.focus();
                // OCR 결과 부분으로 스크롤
                const ocrStartIndex = newText.indexOf('[OCR 결과]');
                if (ocrStartIndex >= 0) {
                    textAreaRef.current?.setSelectionRange(ocrStartIndex, ocrStartIndex);
                }
            }, 100);
            
            alert('이미지에서 텍스트를 추출했습니다. "생성" 버튼을 눌러 메모로 저장하세요.');
        } catch (error) {
            console.error('OCR 처리 실패:', error);
            
            // 에러 메시지를 안전하게 추출
            let errorMessage = '이미지 처리 중 오류가 발생했습니다.';
            if (error && typeof error === 'object') {
                if (error.message && typeof error.message === 'string') {
                    errorMessage = `이미지 처리 중 오류가 발생했습니다: ${error.message}`;
                } else if (error.response?.data) {
                    const responseData = error.response.data;
                    if (typeof responseData === 'string') {
                        errorMessage = `이미지 처리 중 오류가 발생했습니다: ${responseData}`;
                    } else if (responseData.message) {
                        errorMessage = `이미지 처리 중 오류가 발생했습니다: ${responseData.message}`;
                    } else if (responseData.error) {
                        errorMessage = `이미지 처리 중 오류가 발생했습니다: ${responseData.error}`;
                    } else {
                        errorMessage = `이미지 처리 중 오류가 발생했습니다: ${JSON.stringify(responseData)}`;
                    }
                } else {
                    errorMessage = `이미지 처리 중 오류가 발생했습니다: ${JSON.stringify(error)}`;
                }
            } else if (typeof error === 'string') {
                errorMessage = `이미지 처리 중 오류가 발생했습니다: ${error}`;
            }
            
            alert(errorMessage);
        } finally {
            setIsProcessingOCR(false);
        }
    };

    const handleImageSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await processImageFile(file);
        
        // 파일 입력 초기화
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // OCR 결과를 읽기 쉬운 형태로 변환
    const formatOCRResult = (ocrData) => {
        if (!ocrData || typeof ocrData !== 'object') {
            return '[OCR 결과]\n데이터를 파싱할 수 없습니다.';
        }

        let formatted = '[OCR 결과]\n\n';
        
        // 일반적인 OCR 응답 필드 처리
        if (ocrData.text) {
            formatted += `추출된 텍스트:\n${ocrData.text}\n\n`;
        }
        
        if (ocrData.rawText) {
            formatted += `원본 텍스트:\n${ocrData.rawText}\n\n`;
        }
        
        // 필드별 데이터 추출 (product, price, quantity 등)
        if (ocrData.fields && Array.isArray(ocrData.fields)) {
            formatted += '추출된 필드:\n';
            ocrData.fields.forEach((field, index) => {
                formatted += `  ${index + 1}. ${JSON.stringify(field)}\n`;
            });
            formatted += '\n';
        }
        
        // 객체의 다른 속성들 처리
        const otherFields = Object.keys(ocrData).filter(key => 
            !['text', 'rawText', 'fields'].includes(key)
        );
        
        if (otherFields.length > 0) {
            formatted += '기타 정보:\n';
            otherFields.forEach(key => {
                const value = ocrData[key];
                if (value !== null && value !== undefined) {
                    formatted += `  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
                }
            });
        }
        
        return formatted.trim();
    };

    const handleCardDragStart = (e, cardId) => {
        setDraggingCardId(cardId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('cardId', String(cardId));
    };

    const handleCardDragOver = (e, cardId) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (draggingCardId && draggingCardId !== cardId) {
            setCardDropTargetId(cardId);
        }
    };

    const handleCardDrop = (e, targetCardId) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedCardId = Number(e.dataTransfer.getData('cardId') || draggingCardId);
        if (!Number.isFinite(draggedCardId) || draggedCardId === targetCardId) {
            setCardDropTargetId(null);
            setDraggingCardId(null);
            return;
        }

        setCards((prev) => {
            const fromIndex = prev.findIndex((card) => card.id === draggedCardId);
            const toIndex = prev.findIndex((card) => card.id === targetCardId);
            if (fromIndex < 0 || toIndex < 0) return prev;

            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });

        setCardDropTargetId(null);
        setDraggingCardId(null);
    };

    const handleCardAreaDrop = (e) => {
        const cardIdData = e.dataTransfer.getData('cardId');
        if (cardIdData) {
            e.preventDefault();
            e.stopPropagation();
            setCardDropTargetId(null);
            setDraggingCardId(null);
            setIsCardDragOver(false);
            return;
        }
        handleDrop(e);
    };

    const handleCardDragEnd = () => {
        setCardDropTargetId(null);
        setDraggingCardId(null);
        setIsCardDragOver(false);
    };


    return(
         <main className={`mainnote ${isDragOver ? 'drag-over' : ''}`}
            onClick={handleMainClick}
            onDragOver={(e) => {
                e.preventDefault();
                // 이미지 파일이나 메모 카드 드롭 허용
                const hasFiles = e.dataTransfer.types.includes('Files');
                const hasPostId = e.dataTransfer.types.includes('text/plain') && e.dataTransfer.getData('postId');
                if (hasFiles || hasPostId) {
                    setIsDragOver(true);
                }
            }}
            onDragLeave={(e) => {
                // 자식 요소로 이동한 경우는 드래그 상태 유지
                if (!e.currentTarget.contains(e.relatedTarget)) {
                    setIsDragOver(false);
                }
            }}
            onDrop={handleDrop}>
            <div
                className={`card-area ${isCardDragOver ? 'card-drag-over' : ''}`}
                onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('cardId')) {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsCardDragOver(true);
                    }
                }}
                onDragLeave={() => setIsCardDragOver(false)}
                onDrop={handleCardAreaDrop}
            >
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
                            className={`note-card ${card.postId === selectedPostId ? 'selected' : ''} ${cardDropTargetId === card.id ? 'drag-target' : ''} ${draggingCardId === card.id ? 'dragging' : ''}`}
                            draggable
                            onDragStart={(e) => handleCardDragStart(e, card.id)}
                            onDragOver={(e) => handleCardDragOver(e, card.id)}
                            onDrop={(e) => handleCardDrop(e, card.id)}
                            onDragEnd={handleCardDragEnd}
                            onClick={()=> {
                                activateEditingForPost(card.postId);
                            }}
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
                     readOnly={Boolean(selectedPost) && !isManualEditMode}
                    onFocus={() => {
                        if ((!isManualEditMode)) return;
                        // 값이 "새 메모"로 남아있는 경우, 클릭/탭하면 즉시 비우기
                        if (text === '새 메모') setText('');
                    }}
                    onChange={(e) => handleMemoChange(e.target.value)}
                    onBlur={flushPendingEdit}
                />
                <div className='memo-btn'>
                    <button className='AImemo' onClick={handleAIMemo}> AI메모 </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleImageSelect}
                    />
                    <button 
                        className='image-upload-btn' 
                        onClick={handleImageUpload}
                        disabled={isProcessingOCR}
                    >
                        {isProcessingOCR ? '처리 중...' : '이미지'}
                    </button>
                    <button className='save-btn' onClick={handleSave}>{selectedPost ? '수정' : '생성'}</button>
                </div>
            </div>
        </main>
        
    )
}
