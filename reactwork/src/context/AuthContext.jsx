import { createContext, use, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("api/auth/me", {
            credentials : "include"
        })
        .then(res => {
            if (!res.ok) throw new Error()
            return res.json();
        })
        .then(data => {
            setUser({id: data.userId })
        })
        .catch(() => {
            setUser(null);
        })
    }, []);

    const logout = async () => {
        await fetch("/auth/logout", {
            method: "POST",
            credentials: "include"
        });
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);