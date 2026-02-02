import { useState, useEffect, useRef } from 'react'
import { usePosts } from '../context/PostContext'
import '../componentsCss/MainNote.css'

export default function MainNote() {
    const { posts, selectedPost, updatePost, addPost, setSelectedPostId } = usePosts();

    const [isDragOver, setIsDragOver] = useState(false);

    const [ text, setText ] = useState('');

    const [ cards, setCards ] = useState([]);

    const textAreaRef = useRef(null);

    useEffect(() => {
        setText(selectedPost?.content || '');
        if (selectedPost) textAreaRef.current?.focus();
    },[selectedPost]);

    const handleSave = async () => {
        if(!text.trim()) return;
    
        try {
            if (selectedPost){
                await updatePost(selectedPost.id, {
                    ...selectedPost, 
                    content: text, 
                    title: text.substring(0,10)
                });
            } else {
                await addPost(text.substring(0, 10), text);
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
        if(!post) return;

        const newCard = {
            id: Date.now(),
            postId: post.id,
            title : post.title
        };

        setCards(prev => [...prev, newCard]);

        setSelectedPostId(postId);
    }

    const handleDeleteCard = (cardId) => {
        setCards(prev => prev.filter(card => card.id !== cardId));
    }

    return(
        <main className='mainnote'
            onDragOver={(e) =>{e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={()=> setIsDragOver(false)}
            onDrop={handleDrop}>
            <div className='card-area'>
                {cards.map(card=> (
                    <div
                        key={card.id}
                        className="noto-card"
                        onClick={()=> setSelectedPostId(card.postId)}
                    >
                        {card.title || '제목없음'}
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
                ))}
            </div>

            <div className="memo-container">
            <textarea
                ref={textAreaRef}
                className='memo-post-it'
                placeholder='메모를 입력하세요...'
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <button className='save-btn' onClick={handleSave}>↑</button>
            </div>
        </main>
    )
}