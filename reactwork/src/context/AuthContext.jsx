import { createContext, useContext, useState, useEffect } from "react";
import {logout as logoutApi } from "../api/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);


    // 내 정보 불러오기 위한 메소드화
    const fetchMe = async () => {
       setIsAuthLoading(true);
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (!res.ok) {
        // 401은 로그인하지 않은 상태이므로 정상적인 상황
        if (res.status === 401) {
          setUser(null);
          return;
        }
        setUser(null);
        throw new Error("unauthorized");
      }
      
      
      const data = await res.json();
      setUser(data);
    } catch(e) {
        // 네트워크 오류나 기타 오류만 콘솔에 출력
        if (e.message !== "unauthorized") {
          console.error("fetchMe Err", e);
        }
      setUser(null);
     } finally {
      setIsAuthLoading(false);
    } 
    };


     useEffect(() => {
    fetchMe(); // 최초 진입 시
     }, []);


      const logout = async () => {
    try {
        await logoutApi();
    } catch (e) {
        console.error("logout err", e);
    } finally {
        setUser(null);
    }
};

   

    return (
        <AuthContext.Provider value={{ user, fetchMe, logout, isAuthLoading }}>
      {children}
    </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
