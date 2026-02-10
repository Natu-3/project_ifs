// 다국어 지원 유틸리티
const translations = {
    ko: {
        // 공통
        welcome: "님 환영합니다.",
        logout: "로그아웃",
        login: "로그인",
        myPage: "마이페이지",
        
        // 사이드바
        memoSearch: "메모 검색...",
        addMemo: "메모 추가",
        
        // 캘린더
        personalCalendar: "개인 캘린더",
        teamCalendar: "팀 캘린더",
        newTeam: "새 팀",
        noTeamCalendar: "아직 팀 캘린더가 없어요. + 새 팀으로 만들어보세요.",
        
        // 설정
        profile: "프로필",
        settings: "설정",
        userInfo: "사용자 정보",
        edit: "수정",
        cancel: "취소",
        save: "저장",
        saving: "저장 중...",
        theme: "테마",
        themeDescription: "앱의 색상 테마를 선택하세요",
        light: "라이트",
        dark: "다크",
        fontSize: "폰트 크기",
        fontSizeDescription: "텍스트 크기를 조정하세요",
        small: "작게",
        medium: "보통",
        large: "크게",
        language: "언어",
        languageDescription: "앱의 언어를 선택하세요",
        korean: "한국어",
        english: "English",
        compactMode: "컴팩트 모드",
        compactModeDescription: "더 작은 간격으로 더 많은 내용을 표시합니다",
        resetSettings: "설정 초기화",
        resetSettingsDescription: "모든 설정을 기본값으로 되돌립니다",
        reset: "초기화",
        confirmReset: "모든 설정을 초기화하시겠습니까?",
    },
    en: {
        // Common
        welcome: ", welcome!",
        logout: "Logout",
        login: "Login",
        myPage: "My Page",
        
        // Sidebar
        memoSearch: "Search memos...",
        addMemo: "Add memo",
        
        // Calendar
        personalCalendar: "Personal Calendar",
        teamCalendar: "Team Calendar",
        newTeam: "New Team",
        noTeamCalendar: "No team calendar yet. Create one with + New Team.",
        
        // Settings
        profile: "Profile",
        settings: "Settings",
        userInfo: "User Information",
        edit: "Edit",
        cancel: "Cancel",
        save: "Save",
        saving: "Saving...",
        theme: "Theme",
        themeDescription: "Choose the color theme for the app",
        light: "Light",
        dark: "Dark",
        fontSize: "Font Size",
        fontSizeDescription: "Adjust the text size",
        small: "Small",
        medium: "Medium",
        large: "Large",
        language: "Language",
        languageDescription: "Choose the app language",
        korean: "Korean",
        english: "English",
        compactMode: "Compact Mode",
        compactModeDescription: "Display more content with smaller spacing",
        resetSettings: "Reset Settings",
        resetSettingsDescription: "Reset all settings to default values",
        reset: "Reset",
        confirmReset: "Are you sure you want to reset all settings?",
    }
};

export const getTranslation = (key, language = "ko") => {
    return translations[language]?.[key] || translations.ko[key] || key;
};

export default translations;

