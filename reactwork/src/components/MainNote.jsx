import { useState, useEffect, useRef } from 'react'
import { usePosts } from '../context/PostContext'
import { useAuth } from '../context/AuthContext'
import { useSchedule } from '../context/ScheduleContext'
import { useTeamCalendar } from '../components/TeamCalendarContext'
import { updateMainNoteOrder } from '../api/memo'
import { extractTextFromImage } from '../api/ocr'
import ChatbotPage from '../pages/ChatbotPage'
import '../componentsCss/MainNote.css'

export default function MainNote() {
    const { posts, loading, hydrated, selectedPost, selectedPostId, updatePost, addPost, setSelectedPostId } = usePosts();
    const { user } = useAuth();
    const { getPostCalendarInfo } = useSchedule();
    const teamCalendar = useTeamCalendar();
    const teams = teamCalendar?.teams || [];

    const [isDragOver, setIsDragOver] = useState(false);
    const [isManualEditMode, setIsManualEditMode] = useState(false);
    const [isProcessingOCR, setIsProcessingOCR] = useState(false);
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);

    const [ text, setText ] = useState('');
    const fileInputRef = useRef(null);

    const [ cards, setCards ] = useState([]);

    const textAreaRef = useRef(null);
    const editDebounceRef = useRef(null);
    const pendingEditRef = useRef(null);
     const cardSyncTimeoutRef = useRef(null);


    useEffect(() => {

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

                }, 250);
            };


    useEffect(() => {
        const content = selectedPost?.content || '';
        const nextText = content === '새 메모' ? '' : content;
        setText(nextText);
        }, [selectedPost]);

    useEffect(() => {
        if (!selectedPost || !isManualEditMode) return;

        const content = selectedPost?.content || '';
        textAreaRef.current?.focus();
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

    useEffect(() => {
        setCards(prevCards => {
            if (!hydrated || loading) return prevCards;

            const updatedCards = prevCards
                .filter(card => {
                    if (posts.length === 0) return false;
                    return posts.some(post => post.id === card.postId);
                })
                .map(card => {
                    const post = posts.find(p => p.id === card.postId);
                    return post ? {
                        ...card,
                        title: post.title || '제목없음'
                    } : card;
                });
            
            const deletedCardIds = prevCards
                .filter(card => {
                    if (posts.length === 0) return true;
                    return !posts.some(post => post.id === card.postId);
                })
                .map(card => card.postId);
            
            if (selectedPostId && deletedCardIds.includes(selectedPostId)) {
                clearSelectedPost();
            }
            
            return updatedCards;
        });
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
        }
    };

    useEffect(() => {
        flushPendingEdit();
    }, [selectedPostId]);

    useEffect(() => {
        return () => {
            flushPendingEdit();
            if (cardSyncTimeoutRef.current) {
                clearTimeout(cardSyncTimeoutRef.current);
            }
        };
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
        
        if (!trimmedText) {
            alert('메모 내용을 입력해주세요.');
            return;
        }
    
        try {
            if (selectedPost){
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
                const newPostId = await addPost(trimmedText, false, 2);
                clearSelectedPost();
                setText(''); // 입력창 비우기
                alert('메모가 생성되었습니다.');
            }
        } catch (error) {
            console.error('메모 저장 실패:', error);
        }
    };
    
    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const imageFile = Array.from(files).find(file => file.type.startsWith('image/'));
            if (imageFile) {
                await processImageFile(imageFile);
                return;
            }
        }

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
            if (exists) {
                clearSelectedPost();
                setText('');
                return prev;
            }
            
            const next = [...prev, newCard];
            syncCardOrderToServer(next);
            return next;
        });
         clearSelectedPost();
    }

    const handleDeleteCard = (cardId) => {
        setCards(prev => {
            const deletedCard = prev.find(card => card.id === cardId);
            if (deletedCard && deletedCard.postId === selectedPostId) {
               clearSelectedPost();
            }
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
        setIsAIChatOpen(true);
    };

    const handleImageUpload = () => {
        fileInputRef.current?.click();
    };
    const processImageFile = async (file) => {
        if (!file.type.startsWith('image/')) {
            alert('Only image files can be uploaded.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('Image size must be 10MB or less.');
            return;
        }

        setIsProcessingOCR(true);
        try {
            const result = await extractTextFromImage(file, [], 'json');

            let extractedText = '';
            let ocrData = null;

            if (typeof result === 'string') {
                try {
                    ocrData = JSON.parse(result);
                } catch {
                    extractedText = result;
                }
            } else if (result && typeof result === 'object') {
                ocrData = result;
            } else {
                extractedText = String(result ?? '');
            }

            if (ocrData && !extractedText) {
                const findTextInObject = (obj, depth = 0) => {
                    if (depth > 3) return null;
                    if (typeof obj === 'string' && obj.trim()) return obj;
                    if (typeof obj !== 'object' || obj === null) return null;

                    const priorityFields = ['text', 'rawText', 'content', 'result', 'data', 'message', 'output', 'extractedText'];
                    for (const field of priorityFields) {
                        if (obj[field]) {
                            const found = findTextInObject(obj[field], depth + 1);
                            if (found) return found;
                        }
                    }

                    if (Array.isArray(obj)) {
                        const texts = obj.map((item) => findTextInObject(item, depth + 1)).filter(Boolean);
                        if (texts.length > 0) return texts.join('\n');
                    }

                    const allStrings = [];
                    for (const [, value] of Object.entries(obj)) {
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
                extractedText = foundText || JSON.stringify(ocrData, null, 2);
            }

            if (!extractedText || extractedText.trim() === '') {
                extractedText = '[No text extracted from image]';
            }

            const fileName = file.name || 'image';
            const ocrContent = `[File: ${fileName}]\n\n${extractedText}`;
            const newText = text.trim() ? `${text}\n\n${ocrContent}` : ocrContent;

            setSelectedPostId(null);
            setIsManualEditMode(true);
            setText(newText);

            setTimeout(() => {
                textAreaRef.current?.focus();
                const textLength = newText.length;
                textAreaRef.current?.setSelectionRange(textLength, textLength);
            }, 100);

            alert('OCR text extracted. Click Save to create a memo.');
        } catch (error) {
            console.error('OCR processing failed:', error);

            let errorMessage = 'An error occurred while processing the image.';
            if (error && typeof error === 'object') {
                if (error.message && typeof error.message === 'string') {
                    errorMessage = `An error occurred while processing the image: ${error.message}`;
                } else if (error.response?.data) {
                    const responseData = error.response.data;
                    if (typeof responseData === 'string') {
                        errorMessage = `An error occurred while processing the image: ${responseData}`;
                    } else if (responseData.message) {
                        errorMessage = `An error occurred while processing the image: ${responseData.message}`;
                    } else if (responseData.error) {
                        errorMessage = `An error occurred while processing the image: ${responseData.error}`;
                    }
                }
            } else if (typeof error === 'string') {
                errorMessage = `An error occurred while processing the image: ${error}`;
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

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return(
        <main className={`mainnote ${isAIChatOpen ? 'ai-chat-open' : ''} ${isDragOver ? 'drag-over' : ''}`}
            onClick={handleMainClick}
            onDragOver={(e) => {
                e.preventDefault();
                const hasFiles = e.dataTransfer.types.includes('Files');
                const hasPostId = e.dataTransfer.types.includes('text/plain') && e.dataTransfer.getData('postId');
                if (hasFiles || hasPostId) {
                    setIsDragOver(true);
                }
            }}
            onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                    setIsDragOver(false);
                }
            }}
            onDrop={handleDrop}>
            <div className={`card-area ${isAIChatOpen ? 'ai-chat-mode' : ''}`}>
                {!isAIChatOpen && cards.map(card=> {
                    const post = posts.find(p => p.id === card.postId);
                    const displayTitle = post?.title || card.title || '제목없음';
                    
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

                {isAIChatOpen && (
                    <div className='mainnote-chatbot-panel card-chatbot-panel'>
                        <ChatbotPage
                            embedded
                            showSessionList={false}
                            initialPrompt={text || ''}
                            extraActions={(
                                <>
                                    <button className='chat-toolbar-btn' onClick={handleImageUpload} disabled={isProcessingOCR}>{isProcessingOCR ? '처리 중..' : '이미지'}</button>
                                    <button className='chat-toolbar-btn close' onClick={() => setIsAIChatOpen(false)}>닫기</button>
                                </>
                            )}
                        />
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageSelect}
            />

            {!isAIChatOpen && (
                <div className='memo-container'>
                    <div className='memo-editor'>
                        <textarea
                            ref={textAreaRef}
                            className='memo-post-it'
                            placeholder='메모를 입력하세요...'
                            value={text}
                            readOnly={Boolean(selectedPost) && !isManualEditMode}
                            onFocus={() => {
                                if ((!isManualEditMode)) return;
                                if (text === '새 메모') setText('');
                            }}
                            onChange={(e) => handleMemoChange(e.target.value)}
                            onBlur={flushPendingEdit}
                        />
                        <div className='memo-btn'>
                            <button className='AImemo' onClick={handleAIMemo}> AI메모 </button>
                            <button 
                                className='image-upload-btn' 
                                onClick={handleImageUpload}
                                disabled={isProcessingOCR}
                            >
                                {isProcessingOCR ? '처리 중..' : '이미지'}
                            </button>
                            <button className='save-btn' onClick={handleSave}>{selectedPost ? '수정' : '생성'}</button>
                    </div>
                </div>
            </div>
                )}
        </main>
        
    )
}
