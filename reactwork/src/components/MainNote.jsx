import { usePosts } from '../context/PostContext'
import '../componentsCss/MainNote.css'

export default function MainNote() {
    const { selectedPost, updatePost } = usePosts();

    const handleChange = (value) => {
        if (!selectedPost){
            addpost(value);
            return;
        }

        updatePost(selectedPost.id,{
            ...selectedPost,
            content: value
        })
    }
    

    return(
        <main className='mainnote'>
            <div className="memo-container">
            <textarea
                className='memo-post-it'
                placeholder='메모를 입력하세요...'
                value={selectedPost?.content || ''}
                onChange={(e) => handleChange(e.target.value)}
            />
            </div>
            
        </main>
    )
}