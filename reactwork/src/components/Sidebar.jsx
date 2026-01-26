export default function Sidebar() {
    return(
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2 className="sidebar-title">PostList</h2>
            </div>

            <ul className="sidebar-list">
                <li className="sidebar-item active">post 1</li>
                <li className="sidebar-item">post 2</li>
                <button className="sidebar-add-btn">+</button>
            </ul>
        </aside>
    )
}