import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosts } from '../context/PostContext'
import { useAuth } from '../context/AuthContext'
import { useSchedule } from '../context/ScheduleContext'
import { useTeamCalendar } from '../components/TeamCalendarContext'
import { updateMainNoteOrder } from '../api/memo'
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
    const [isManualEditMode, setIsManualEditMode] = useState(false);
    const [isProcessingOCR, setIsProcessingOCR] = useState(false);

    const [ text, setText ] = useState('');
    const fileInputRef = useRef(null);

    const [ cards, setCards ] = useState([]);

    const textAreaRef = useRef(null);
    const editDebounceRef = useRef(null);
    const pendingEditRef = useRef(null);
    // const storageKey = `mainnote_cards:${user?.id ?? 'guest'}`;
    // const guestStorageKey = `mainnote_cards:guest`;
     const cardSyncTimeoutRef = useRef(null);

    // // key별로 "복원(hydrate) 완료" 전에는 저장하지 않기 위한 플래그
    // const hydratedKeysRef = useRef(new Set());
    // // guest -> user 1회 마이그레이션(복사) 방지
    // const migratedGuestToUserRef = useRef(false);

    // // 새로고침해도 중앙 카드가 유지되도록 localStorage에 저장/복원
    useEffect(() => {
        // // 이미 이 storageKey에 대해 복원했으면 다시 복원하지 않음 (중복 방지)
        // if (hydratedKeysRef.current.has(storageKey)) {
        //     return;
        // }
        
        // try {
        //     // 1) 로그인 직후 user 키에 저장된 카드가 없으면, guest 키에서 1회 복사(마이그레이션)
        //     //    - "다시 로그인하면 사라짐" 문제의 대부분이 여기서 발생 (guest에만 저장돼 있던 케이스)
        //     if (user?.id && !migratedGuestToUserRef.current) {
        //         const userRaw = localStorage.getItem(storageKey);
        //         const guestRaw = localStorage.getItem(guestStorageKey);
        //         if ((!userRaw || userRaw === "[]") && guestRaw && guestRaw !== "[]") {
        //             localStorage.setItem(storageKey, guestRaw);
        //         }
        //         migratedGuestToUserRef.current = true;
        //     }

        //     const raw = localStorage.getItem(storageKey);
        //     if (!raw) {
        //         // 이 키에 저장된 게 없으면 cards를 강제로 비우지 않는다(기존 상태 유지)
        //         hydratedKeysRef.current.add(storageKey);
        //         return;
        //     }

        //     const parsed = JSON.parse(raw);
        //     if (!Array.isArray(parsed)) {
        //         hydratedKeysRef.current.add(storageKey);
        //         return;
        //     }

        //     // 저장 포맷: [{ postId: number } ...]
        //     const restored = parsed
        //         .map((x) => ({ postId: Number(x?.postId) }))
        //         .filter((x) => Number.isFinite(x.postId));
        if (!hydrated || loading) return;

            const orderedCards = posts
                .filter((post) => post.mainNoteVisible)
                .sort((a, b) => {
                    const aOrder = Number.isFinite(a.mainNoteOrder) ? a.mainNoteOrder : Number.MAX_SAFE_INTEGER;
                    const bOrder = Number.isFinite(b.mainNoteOrder) ? b.mainNoteOrder : Number.MAX_SAFE_INTEGER;
                    if (aOrder !== bOrder) return aOrder - bOrder;
                    return a.id - b.id;
                })
                .map((post) => ({
                    id: post.id,
                    postId: post.id,
                    title: post.title || '제목없음'
                }));

            setCards(orderedCards);
        }, [posts, hydrated, loading]);

            // // posts가 아직 로드 전이어도 일단 복원해두고, 아래 posts 동기화 effect가 정리해줌
            // if (restored.length > 0) {
            //     setCards(restored.map(r => ({ id: r.postId, postId: r.postId, title: '' })));
            // }
            const syncCardOrderToServer = (nextCards) => {
        if (!user?.id) return;
        if (cardSyncTimeoutRef.current) clearTimeout(cardSyncTimeoutRef.current);

        cardSyncTimeoutRef.current = setTimeout(async () => {
            try {
                const visibleIds = new Set(nextCards.map((card) => card.postId));
                const orderMap = new Map(nextCards.map((card, index) => [card.postId, index]));
                const payload = posts.map((post) => ({
                    id: post.id,
                    mainNoteVisible: visibleIds.has(post.id),
                    mainNoteOrder: visibleIds.has(post.id) ? orderMap.get(post.id) : null
                }));

                await updateMainNoteOrder(user.id, payload);
            } catch (error) {
                console.error('메인 카드 순서 저장 실패:', error);
            }

    //         hydratedKeysRef.current.add(storageKey);
    //     } catch {
    //         // 파싱 실패 시 무시
    //         hydratedKeysRef.current.add(storageKey);
    //     }
    //     // user 변경 시(로그인/로그아웃) 다른 키로 복원
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [storageKey]);
                }, 250);
            };

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
            if (cardSyncTimeoutRef.current) {
                clearTimeout(cardSyncTimeoutRef.current);
            }
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
        if (!trimmedText) {
            alert('메모 내용을 입력해주세요.');
            return;
        }
    
        try {
            if (selectedPost){
                // 기존 메모 수정
                await updatePost(selectedPost.id, {
                    ...selectedPost, 
                    content: trimmedText,
                    title: trimmedText.substring(0,10),
                    priority: 2
                });
                clearSelectedPost();
                setText(''); // 입력창 비우기
                alert('메모가 수정되었습니다.');
            } else {
                // 새 메모 생성
                const newPostId = await addPost(trimmedText, false, 2);
                clearSelectedPost();
                setText(''); // 입력창 비우기
                alert('메모가 생성되었습니다.');
            }
        } catch (error) {
            // 에러는 이미 PostContext에서 처리됨
            console.error('메모 저장 실패:', error);
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
            
            // return [...prev, newCard];
            const next = [...prev, newCard];
            syncCardOrderToServer(next);
            return next;
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
            // return prev.filter(card => card.id !== cardId);
            const next = prev.filter(card => card.id !== cardId);
            syncCardOrderToServer(next);
            return next;
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

        setCards((prev) => {
            const fromIndex = prev.findIndex((card) => card.id === draggedCardId);
            const toIndex = prev.findIndex((card) => card.id === targetCardId);
            if (fromIndex < 0 || toIndex < 0) return prev;

            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            syncCardOrderToServer(next);
            return next;
        });

        setCardDropTargetId(null);
        setDraggingCardId(null);
    };

    const handleCardAreaDrop = async (e) => {
        const cardIdData = e.dataTransfer.getData('cardId');
        if (cardIdData) {
            e.preventDefault();
            e.stopPropagation();
            setCardDropTargetId(null);
            setDraggingCardId(null);
            setIsCardDragOver(false);
        // 파일 크기 제한 (10MB - 큰 이미지는 자동으로 리사이즈됨)
        if (file.size > 10 * 1024 * 1024) {
            alert('이미지 크기는 10MB 이하여야 합니다.');
            return;
        }

        setIsProcessingOCR(true);
        try {
            // OCR API 호출
            const result = extractTextFromImage(file, [], 'json');
            
            // 디버깅: 응답 데이터 확인
            console.log('=== OCR API 응답 데이터 ===');
            console.log('응답 타입:', typeof result);
            console.log('응답 데이터 (전체):', result);
            console.log('응답 데이터 (JSON):', JSON.stringify(result, null, 2));
            if (result && typeof result === 'object') {
                console.log('응답 데이터 키들:', Object.keys(result));
            }
            
            // OCR 결과에서 순수 텍스트만 추출
            let extractedText = '';
            let ocrData = null;
            
            // 응답 데이터 파싱
            if (typeof result === 'string') {
                // 문자열인 경우 JSON 파싱 시도
                try {
                    ocrData = JSON.parse(result);
                    console.log('문자열을 JSON으로 파싱 성공:', ocrData);
                } catch {
                    // 파싱 실패 시 문자열 자체를 텍스트로 사용
                    extractedText = result;
                    console.log('문자열을 그대로 텍스트로 사용:', extractedText);
                }
            } else if (result && typeof result === 'object') {
                ocrData = result;
                console.log('객체로 받은 OCR 데이터:', ocrData);
            } else {
                extractedText = String(result);
                console.log('기타 타입을 문자열로 변환:', extractedText);
            }

            // OCR 데이터에서 텍스트 추출 (여러 가능한 필드명 확인)
            if (ocrData && !extractedText) {
                console.log('OCR 데이터에서 텍스트 추출 시도...');
                console.log('OCR 데이터 구조:', JSON.stringify(ocrData, null, 2));
                
                // 재귀적으로 텍스트 찾기 함수
                const findTextInObject = (obj, depth = 0) => {
                    if (depth > 3) return null; // 깊이 제한
                    if (typeof obj === 'string' && obj.trim()) return obj;
                    if (typeof obj !== 'object' || obj === null) return null;
                    
                    // 우선순위: text > rawText > content > result > data > message > output
                    const priorityFields = ['text', 'rawText', 'content', 'result', 'data', 'message', 'output', 'extractedText'];
                    for (const field of priorityFields) {
                        if (obj[field]) {
                            const found = findTextInObject(obj[field], depth + 1);
                            if (found) return found;
                        }
                    }
                    
                    // 배열인 경우 각 요소 확인
                    if (Array.isArray(obj)) {
                        const texts = obj.map(item => findTextInObject(item, depth + 1)).filter(Boolean);
                        if (texts.length > 0) return texts.join('\n');
                    }
                    
                    // 모든 문자열 값 찾기
                    const allStrings = [];
                    for (const [key, value] of Object.entries(obj)) {
                        if (typeof value === 'string' && value.trim() && value.length > 5) {
                            allStrings.push(value);
                        } else if (typeof value === 'object' && value !== null) {
                            const nested = findTextInObject(value, depth + 1);
                            if (nested) allStrings.push(nested);
                        }
                    }
                    return allStrings.length > 0 ? allStrings.join('\n') : null;
                };
                
                const foundText = findTextInObject(ocrData);
                if (foundText) {
                    extractedText = foundText;
                    console.log('재귀 검색으로 텍스트 추출 성공:', extractedText.substring(0, 100) + '...');
                } else {
                    // 마지막 시도: 전체 객체를 JSON으로 변환
                    extractedText = JSON.stringify(ocrData, null, 2);
                    console.warn('텍스트를 찾지 못해 전체 객체를 JSON으로 변환:', extractedText.substring(0, 200));
                }
            }

            // 텍스트가 비어있으면 기본 메시지
            if (!extractedText || extractedText.trim() === '') {
                extractedText = '[이미지에서 텍스트를 추출하지 못했습니다]';
                console.warn('추출된 텍스트가 비어있음. OCR 응답 구조를 확인하세요.');
            }

            console.log('=== 최종 추출된 텍스트 ===');
            console.log('추출된 텍스트:', extractedText);
            console.log('텍스트 길이:', extractedText.length);

            // 파일 이름과 OCR 텍스트를 함께 표시
            const fileName = file.name || '이미지';
            const ocrContent = `[파일명: ${fileName}]\n\n${extractedText}`;

            // 기존 텍스트가 있으면 줄바꿈 후 추가, 없으면 그대로 설정
            const newText = text.trim() 
                ? `${text}\n\n${ocrContent}` 
                : ocrContent;
            
            console.log('=== 메모 입력창에 표시할 텍스트 ===');
            console.log('전체 텍스트:', newText);
            console.log('텍스트 길이:', newText.length);
            
            // 기존 선택 해제 (새 메모 상태로) - 먼저 호출
            setSelectedPostId(null);
            setIsManualEditMode(true);
            
            // 메모 영역에 OCR 결과 표시 (DB 저장은 하지 않음)
            // clearSelectedPost() 대신 직접 설정 (setText('')를 피하기 위해)
            setText(newText);
            console.log('setText() 호출 완료, 텍스트:', newText.substring(0, 50) + '...');
            
            // 포커스 이동 및 커서를 텍스트 끝으로
            setTimeout(() => {
                textAreaRef.current?.focus();
                const textLength = newText.length;
                textAreaRef.current?.setSelectionRange(textLength, textLength);
                // 텍스트가 제대로 설정되었는지 확인
                console.log('포커스 이동 완료, 현재 text 상태:', text);
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
}
