import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  createChatSession,
  getChatMessages,
  getChatSessions,
  sendChatMessage,
} from "../api/chatbot";
import "./ChatbotPage.css";

export default function ChatbotPage({
  initialPrompt = "",
  embedded = false,
  onClose,
  showSessionList = true,
  extraActions = null,
}) {
  const location = useLocation();
  const seededRef = useRef(false);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId]
  );

  const loadSessions = async () => {
    const res = await getChatSessions();
    const list = res.data || [];
    setSessions(list);
    if (!activeSessionId && list.length > 0) {
      setActiveSessionId(list[0].id);
    }
    return list;
  };

  const loadMessages = async (sessionId) => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    const res = await getChatMessages(sessionId);
    setMessages(res.data || []);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadSessions();
        if (!mounted) return;
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || "Failed to load chatbot sessions.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadMessages(activeSessionId).catch((e) =>
      setError(e?.response?.data?.message || "Failed to load messages.")
    );
  }, [activeSessionId]);

  const handleCreateSession = async () => {
    try {
      setError("");
      const res = await createChatSession();
      const created = res.data;
      setSessions((prev) => [created, ...prev]);
      setActiveSessionId(created.id);
      setMessages([]);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to create a new chat session.");
    }
  };

  const sendContent = async (rawContent) => {
    const content = (rawContent || "").trim();
    if (!content || loading) return;

    setLoading(true);
    setError("");

    try {
      let sessionId = activeSessionId;
      if (!activeSessionId) {
        const created = await createChatSession();
        setSessions((prev) => [created.data, ...prev]);
        sessionId = created.data.id;
        setActiveSessionId(sessionId);
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "user", content, created_at: new Date().toISOString() },
      ]);
      const res = await sendChatMessage(sessionId, content);
      await loadMessages(res.data.session_id);
      await loadSessions();
      setActiveSessionId(res.data.session_id);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to send message.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content) return;
    setInput("");
    await sendContent(content);
  };

  useEffect(() => {
    const seededPrompt = initialPrompt || location.state?.initialPrompt;
    if (seededRef.current) return;
    if (!seededPrompt || !seededPrompt.trim()) return;
    if (loading) return;

    seededRef.current = true;
    setInput("");
    sendContent(seededPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, location.state, loading]);

  const compact = embedded && !showSessionList;

  return (
    <div className={`chatbot-page ${embedded ? "embedded" : ""} ${compact ? "compact" : ""}`}>
      {showSessionList && (
        <aside className="chatbot-session-list">
          <div className="chatbot-session-header-row">
            <button className="chatbot-new-btn" onClick={handleCreateSession}>
              New
            </button>
            {embedded && (
              <button className="chatbot-close-btn" onClick={onClose} aria-label="채팅 닫기">
                닫기
              </button>
              )}
          </div>
          <ul>
            {sessions.map((session) => (
              <li key={session.id}>
                <button
                  className={session.id === activeSessionId ? "active" : ""}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  {session.title || "New Chat"}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <section className="chatbot-main">
        <header className="chatbot-header">
          <span className="chatbot-header-title">{activeSession?.title || "AI 채팅"}</span>
          <div className="chatbot-header-actions">
            {!showSessionList && (
              <button className="chatbot-new-btn compact-new" onClick={handleCreateSession}>
                New
              </button>
            )}
            {extraActions}
          </div>
        </header>
        <div className="chatbot-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chatbot-message ${msg.role}`}>
              <div className="chatbot-role">{msg.role === "user" ? "Me" : "Bot"}</div>
              <div className="chatbot-content">{msg.content}</div>
            </div>
          ))}
        </div>
        {error && <div className="chatbot-error">{error}</div>}
        <div className="chatbot-input-wrap">
          <textarea
            value={input}
            maxLength={4000}
            placeholder="무엇이든 물어보세요"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button onClick={handleSend} disabled={loading}>
            {loading ? "생성중..." : "생성"}
          </button>
        </div>
      </section>
    </div>
  );
}
