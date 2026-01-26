import { useState } from "react";
import '../componentsCss/Sidebar.css';

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(true);

    const handleToggle = () => {
        setIsOpen(prev => !prev);
    }
    return(
        <aside className={`sidebar ${isOpen?'open':'closed'}`}>
            <div className="sidebar-header">
                <h2 className="sidebar-title">PostList</h2>
            </div>

            <button className="toggle-note-btn" onClick={handleToggle}>{isOpen ? '<':'>'}</button>

            <ul className="sidebar-list">
                <li className="sidebar-item active">post 1</li>
                <li className="sidebar-item">post 2</li>
                <button className="sidebar-add-btn">+</button>
            </ul>
        </aside>
    )
}