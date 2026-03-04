import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { queryAssistantChat } from "../api/chatbot";
import { useCalendar } from "../context/CalendarContext";
import "./ChatbotPage.css";

export default function ChatbotPage({
  initialPrompt = "",
  embedded = false,
  onClose,
  showSessionList = true,
  extraActions = null,
}) {
  const location = useLocation();
  const { activeCalendarId } = useCalendar();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [quickReplies, setQuickReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prompt = initialPrompt || location.state?.initialPrompt;
    if (prompt && prompt.trim()) {
      setInput(prompt.trim());
    }
  }, [initialPrompt, location.state]);

  const activeCalendar = useMemo(() => {
    const parsed = Number(activeCalendarId);
    if (Number.isFinite(parsed) && parsed > 0) {
      return { type: "TEAM", id: parsed };
    }
    return { type: "PERSONAL", id: null };
  }, [activeCalendarId]);

  const toConversation = (history, message) =>
    [...history, { role: "user", content: message }]
      .filter((item) => item.role === "user" || item.role === "assistant")
      .map((item) => ({ role: item.role, content: item.content }))
      .slice(-20);

  const sendMessage = async (text) => {
    const message = text.trim();
    if (!message) {
      setError("메시지를 입력하세요.");
      return;
    }

    setLoading(true);
    setError("");
    setQuickReplies([]);
    const nextHistory = [...messages, { role: "user", content: message, id: Date.now() }];
    setMessages(nextHistory);

    try {
      const res = await queryAssistantChat({
        message,
        conversation: toConversation(messages, message),
        activeCalendar,
        timezone: "Asia/Seoul",
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data?.reply || "", id: Date.now() + 1 },
      ]);
      const options = Array.isArray(res.data?.calendarOptions) ? res.data.calendarOptions : [];
      setQuickReplies(options.filter((item) => item?.writable).map((item) => item.name));
      setInput("");
    } catch (e) {
      setError(e?.response?.data?.message || "요청 처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`chatbot-page chatbot-single ${embedded ? "embedded" : ""} ${
        embedded && !showSessionList ? "compact" : ""
      }`}
    >
      <section className="chatbot-main">
        <header className="chatbot-header">
          <span className="chatbot-header-title">Calendar Assistant</span>
          <div className="chatbot-header-actions">
            {extraActions}
            {embedded && onClose && (
              <button className="chatbot-close-btn" onClick={onClose} aria-label="채팅 닫기">
                닫기
              </button>
            )}
          </div>
        </header>

        <div className="chatbot-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chatbot-message ${msg.role}`}>
              <div className="chatbot-role">{msg.role === "user" ? "Me" : "Bot"}</div>
              <div className="chatbot-content">{msg.content}</div>
            </div>
          ))}
          {quickReplies.length > 0 && (
            <div className="chatbot-sources">
              <h4>캘린더 선택</h4>
              {quickReplies.map((label) => (
                <button
                  key={label}
                  type="button"
                  className="chatbot-source-item"
                  onClick={() => sendMessage(label)}
                  disabled={loading}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <div className="chatbot-error">{error}</div>}

        <div className="chatbot-input-wrap">
          <textarea
            value={input}
            maxLength={4000}
            placeholder="일정 등록/요약 또는 질문을 입력하세요."
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
          />
          <button onClick={() => sendMessage(input)} disabled={loading}>
            {loading ? "생성 중.." : "전송"}
          </button>
        </div>
      </section>
    </div>
  );
}
