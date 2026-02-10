import { createContext, useContext, useState, useEffect } from "react";

const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
    theme: "light", // light, dark
    fontSize: "medium", // small, medium, large
    language: "ko", // ko, en
    compactMode: false,
};

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loaded, setLoaded] = useState(false);

    // localStorage에서 설정 불러오기
    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem("appSettings");
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                const mergedSettings = { ...DEFAULT_SETTINGS, ...parsed };
                setSettings(mergedSettings);
                // 초기 로드 시에도 CSS 변수 적용
                applySettings(mergedSettings);
            } else {
                // 저장된 설정이 없으면 기본값 적용
                applySettings(DEFAULT_SETTINGS);
            }
        } catch (error) {
            console.error("설정 불러오기 실패:", error);
            applySettings(DEFAULT_SETTINGS);
        } finally {
            setLoaded(true);
        }
    }, []);

    // 설정 변경 시 localStorage에 저장 및 CSS 변수 업데이트
    useEffect(() => {
        if (loaded) {
            try {
                localStorage.setItem("appSettings", JSON.stringify(settings));
                applySettings(settings);
            } catch (error) {
                console.error("설정 저장 실패:", error);
            }
        }
    }, [settings, loaded]);

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const updateSettings = (newSettings) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS);
    };

    return (
        <SettingsContext.Provider value={{ 
            settings, 
            updateSetting, 
            updateSettings, 
            resetSettings,
            loaded 
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

// CSS 변수에 설정 적용
function applySettings(settings) {
    const root = document.documentElement;

    // 폰트 크기
    if (settings.fontSize === "small") {
        root.style.setProperty("--font-size-xs", "10px");
        root.style.setProperty("--font-size-sm", "12px");
        root.style.setProperty("--font-size-base", "14px");
        root.style.setProperty("--font-size-lg", "16px");
    } else if (settings.fontSize === "large") {
        root.style.setProperty("--font-size-xs", "13px");
        root.style.setProperty("--font-size-sm", "16px");
        root.style.setProperty("--font-size-base", "18px");
        root.style.setProperty("--font-size-lg", "22px");
    } else {
        // medium (기본값)
        root.style.setProperty("--font-size-xs", "11px");
        root.style.setProperty("--font-size-sm", "14px");
        root.style.setProperty("--font-size-base", "16px");
        root.style.setProperty("--font-size-lg", "20px");
    }

    // 테마
    if (settings.theme === "dark") {
        root.style.setProperty("--color-bg-primary", "#1e1e1e");
        root.style.setProperty("--color-bg-secondary", "#2d2d2d");
        root.style.setProperty("--color-bg-tertiary", "#3d3d3d");
        root.style.setProperty("--color-bg-hover", "rgba(255, 255, 255, 0.08)");
        root.style.setProperty("--color-bg-active", "rgba(255, 255, 255, 0.12)");
        root.style.setProperty("--color-text-primary", "#ffffff");
        root.style.setProperty("--color-text-secondary", "rgba(255, 255, 255, 0.7)");
        root.style.setProperty("--color-text-tertiary", "rgba(255, 255, 255, 0.4)");
        root.style.setProperty("--color-border", "rgba(255, 255, 255, 0.1)");
        root.style.setProperty("--color-border-light", "rgba(255, 255, 255, 0.06)");
        root.style.setProperty("--color-border-dark", "rgba(255, 255, 255, 0.16)");
    } else {
        // light (기본값)
        root.style.setProperty("--color-bg-primary", "#ffffff");
        root.style.setProperty("--color-bg-secondary", "#f7f6f3");
        root.style.setProperty("--color-bg-tertiary", "#f1f1ef");
        root.style.setProperty("--color-bg-hover", "rgba(55, 53, 47, 0.08)");
        root.style.setProperty("--color-bg-active", "rgba(55, 53, 47, 0.12)");
        root.style.setProperty("--color-text-primary", "#37352f");
        root.style.setProperty("--color-text-secondary", "rgba(55, 53, 47, 0.65)");
        root.style.setProperty("--color-text-tertiary", "rgba(55, 53, 47, 0.4)");
        root.style.setProperty("--color-border", "rgba(55, 53, 47, 0.09)");
        root.style.setProperty("--color-border-light", "rgba(55, 53, 47, 0.06)");
        root.style.setProperty("--color-border-dark", "rgba(55, 53, 47, 0.16)");
    }

    // 컴팩트 모드
    if (settings.compactMode) {
        root.style.setProperty("--spacing-xs", "2px");
        root.style.setProperty("--spacing-sm", "4px");
        root.style.setProperty("--spacing-md", "6px");
        root.style.setProperty("--spacing-lg", "10px");
        root.style.setProperty("--spacing-xl", "14px");
        root.style.setProperty("--spacing-2xl", "18px");
    } else {
        // 기본 간격
        root.style.setProperty("--spacing-xs", "4px");
        root.style.setProperty("--spacing-sm", "6px");
        root.style.setProperty("--spacing-md", "10px");
        root.style.setProperty("--spacing-lg", "14px");
        root.style.setProperty("--spacing-xl", "18px");
        root.style.setProperty("--spacing-2xl", "24px");
    }
}

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings must be used within SettingsProvider");
    }
    return context;
};

