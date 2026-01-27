import '../componentsCss/MainNote.css'

export default function MainNote() {
    return(
        <aside>
            <main className='mainnote'>
                <ul className='postlest'>
                    <li>post</li>
                    <li>post</li>
                    <li>post</li>
                    <li>post</li>
                </ul>
                <div className="memo-container">
                    <textarea
                        className='memo-post-it'
                        placeholder='메모를 입력하세요...'
                    />
                </div>
            </main>
        </aside>
    )
}