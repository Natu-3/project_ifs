import { createContext, use, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    // const [loading, setLoading] = useState(true);

    // 내 정보 불러오기 위한 메소드화
    const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (!res.ok) {
        setUser(null);
        throw new Error("unauthorized");
       // return;
      }
      
      const data = await res.json();
      setUser(data);
    } catch(e) {
        console.error("fetchMe Err",e);
      setUser(null);
    } 
    };


     useEffect(() => {
    fetchMe(); // 최초 진입 시
     }, []);

    const logout = async () => {
        await fetch("/auth/logout", {
            method: "POST",
            credentials: "include"
        });
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, fetchMe }}>
      {children}
    </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);