import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { updateUserProfile } from "../api/auth";
import { useSettings } from "../context/SettingsContext";
import { getTranslation } from "../utils/i18n";
import "./MyPage.css";

export default function MyPage() {
    const { user, fetchMe } = useAuth();
    const navigate = useNavigate();
    const { settings, updateSetting, resetSettings } = useSettings();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [activeTab, setActiveTab] = useState("profile"); // profile, settings
    
    const t = (key) => getTranslation(key, settings.language);
    
    const [formData, setFormData] = useState({
        name: "",
        email: "",
    });

    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }
        
        setFormData({
            name: user.name || "",
            email: user.email || "",
        });
    }, [user, navigate]);

    if (!user) {
        return null;
    }

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "올바른 이메일 형식이 아닙니다";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);
            await updateUserProfile(user.id, formData);
            await fetchMe(); // 사용자 정보 새로고침
            setIsEditing(false);
            alert("정보가 수정되었습니다");
        } catch (error) {
            console.error("정보 수정 실패:", error);
            if (error.response?.data?.message) {
                alert(error.response.data.message);
            } else {
                alert("정보 수정에 실패했습니다");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            name: user.name || "",
            email: user.email || "",
        });
        setErrors({});
        setIsEditing(false);
    };

    return (
        <div className="mypage-wrapper">
            <div className="mypage-container">
                <div className="mypage-header">
                    <h1>My Page</h1>
                </div>

                <div className="mypage-tabs">
                    <button
                        className={`mypage-tab ${activeTab === "profile" ? "active" : ""}`}
                        onClick={() => setActiveTab("profile")}
                    >
                        {t("profile")}
                    </button>
                    <button
                        className={`mypage-tab ${activeTab === "settings" ? "active" : ""}`}
                        onClick={() => setActiveTab("settings")}
                    >
                        {t("settings")}
                    </button>
                </div>

                <div className="mypage-content">
                    {activeTab === "profile" && (
                        <div className="mypage-section">
                            <div className="mypage-section-header">
                                <h2>{t("userInfo")}</h2>
                                {!isEditing ? (
                                    <button 
                                        className="mypage-edit-btn"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        {t("edit")}
                                    </button>
                                ) : (
                                    <div className="mypage-action-buttons">
                                        <button 
                                            className="mypage-cancel-btn"
                                            onClick={handleCancel}
                                            disabled={loading}
                                        >
                                            {t("cancel")}
                                        </button>
                                        <button 
                                            className="mypage-save-btn"
                                            onClick={handleSave}
                                            disabled={loading}
                                        >
                                            {loading ? t("saving") : t("save")}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="mypage-info">
                                <div className="info-item">
                                    <span className="info-label">User ID:</span>
                                    <span className="info-value">{user.userid || user.username || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Name:</span>
                                    {isEditing ? (
                                        <div className="info-input-wrapper">
                                            <input
                                                type="text"
                                                className={`info-input ${errors.name ? 'error' : ''}`}
                                                value={formData.name}
                                                onChange={(e) => handleInputChange('name', e.target.value)}
                                                placeholder="이름을 입력하세요"
                                            />
                                            {errors.name && <span className="error-message">{errors.name}</span>}
                                        </div>
                                    ) : (
                                        <span className="info-value">{user.name || 'N/A'}</span>
                                    )}
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Email:</span>
                                    {isEditing ? (
                                        <div className="info-input-wrapper">
                                            <input
                                                type="email"
                                                className={`info-input ${errors.email ? 'error' : ''}`}
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                placeholder="이메일을 입력하세요"
                                            />
                                            {errors.email && <span className="error-message">{errors.email}</span>}
                                        </div>
                                    ) : (
                                        <span className="info-value">{user.email || 'N/A'}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "settings" && (
                        <div className="mypage-section">
                            <div className="mypage-section-header">
                                <h2>{t("settings")}</h2>
                            </div>
                            <div className="mypage-settings-content">
                                {/* 테마 설정 */}
                                <div className="settings-item">
                                    <div className="settings-item-label">
                                        <span className="settings-label">{t("theme")}</span>
                                        <span className="settings-description">{t("themeDescription")}</span>
                                    </div>
                                    <div className="settings-item-control">
                                        <button
                                            className={`settings-option ${settings.theme === "light" ? "active" : ""}`}
                                            onClick={() => updateSetting("theme", "light")}
                                        >
                                            {t("light")}
                                        </button>
                                        <button
                                            className={`settings-option ${settings.theme === "dark" ? "active" : ""}`}
                                            onClick={() => updateSetting("theme", "dark")}
                                        >
                                            {t("dark")}
                                        </button>
                                    </div>
                                </div>

                                {/* 폰트 크기 */}
                                <div className="settings-item">
                                    <div className="settings-item-label">
                                        <span className="settings-label">{t("fontSize")}</span>
                                        <span className="settings-description">{t("fontSizeDescription")}</span>
                                    </div>
                                    <div className="settings-item-control">
                                        <button
                                            className={`settings-option ${settings.fontSize === "small" ? "active" : ""}`}
                                            onClick={() => updateSetting("fontSize", "small")}
                                        >
                                            {t("small")}
                                        </button>
                                        <button
                                            className={`settings-option ${settings.fontSize === "medium" ? "active" : ""}`}
                                            onClick={() => updateSetting("fontSize", "medium")}
                                        >
                                            {t("medium")}
                                        </button>
                                        <button
                                            className={`settings-option ${settings.fontSize === "large" ? "active" : ""}`}
                                            onClick={() => updateSetting("fontSize", "large")}
                                        >
                                            {t("large")}
                                        </button>
                                    </div>
                                </div>

                                {/* 언어 설정 */}
                                <div className="settings-item">
                                    <div className="settings-item-label">
                                        <span className="settings-label">{t("language")}</span>
                                        <span className="settings-description">{t("languageDescription")}</span>
                                    </div>
                                    <div className="settings-item-control">
                                        <button
                                            className={`settings-option ${settings.language === "ko" ? "active" : ""}`}
                                            onClick={() => updateSetting("language", "ko")}
                                        >
                                            {t("korean")}
                                        </button>
                                        <button
                                            className={`settings-option ${settings.language === "en" ? "active" : ""}`}
                                            onClick={() => updateSetting("language", "en")}
                                        >
                                            {t("english")}
                                        </button>
                                    </div>
                                </div>

                                {/* 컴팩트 모드 */}
                                <div className="settings-item">
                                    <div className="settings-item-label">
                                        <span className="settings-label">{t("compactMode")}</span>
                                        <span className="settings-description">{t("compactModeDescription")}</span>
                                    </div>
                                    <div className="settings-item-control">
                                        <label className="settings-toggle">
                                            <input
                                                type="checkbox"
                                                checked={settings.compactMode}
                                                onChange={(e) => updateSetting("compactMode", e.target.checked)}
                                            />
                                            <span className="settings-toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>

                                {/* 설정 초기화 */}
                                <div className="settings-item">
                                    <div className="settings-item-label">
                                        <span className="settings-label">{t("resetSettings")}</span>
                                        <span className="settings-description">{t("resetSettingsDescription")}</span>
                                    </div>
                                    <div className="settings-item-control">
                                        <button
                                            className="settings-reset-btn"
                                            onClick={() => {
                                                if (window.confirm(t("confirmReset"))) {
                                                    resetSettings();
                                                }
                                            }}
                                        >
                                            {t("reset")}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

