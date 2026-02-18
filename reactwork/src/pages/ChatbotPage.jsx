import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  createChatSession,
  getChatMessages,
  getChatSessions,
  sendChatMessage,
} from "../api/chatbot";
import "./ChatbotPage.css";

export default function ChatbotPage() {
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
    const initialPrompt = location.state?.initialPrompt;
    if (seededRef.current) return;
    if (!initialPrompt || !initialPrompt.trim()) return;
    if (loading) return;

    seededRef.current = true;
    setInput("");
    sendContent(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, loading]);

  return (
    <div className="chatbot-page">
      <aside className="chatbot-session-list">
        <button className="chatbot-new-btn" onClick={handleCreateSession}>
          New Chat
        </button>
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

      <section className="chatbot-main">
        <header className="chatbot-header">{activeSession?.title || "Chatbot"}</header>
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
            placeholder="Type your message..."
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button onClick={handleSend} disabled={loading}>
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </section>
    </div>
  );
}
