import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  completeDocumentUpload,
  getDocumentStatus,
  queryRagChat,
  requestDocumentPresign,
  startDocumentIndexing,
} from "../api/chatbot";
import "./ChatbotPage.css";

export default function ChatbotPage() {
  const location = useLocation();
  const [calendarId, setCalendarId] = useState("");
  const [documentIdInput, setDocumentIdInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [docStatus, setDocStatus] = useState(null);

  useEffect(() => {
    const prompt = location.state?.initialPrompt;
    if (prompt && prompt.trim()) {
      setInput(prompt.trim());
    }
  }, [location.state]);

  const parseDocumentIds = () =>
    documentIdInput
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => Number.isFinite(id) && id > 0);

  const handleSend = async () => {
    const question = input.trim();
    const parsedCalendarId = Number(calendarId);
    if (!question || !Number.isFinite(parsedCalendarId) || parsedCalendarId <= 0) {
      setError("calendarId와 질문을 올바르게 입력하세요.");
      return;
    }

    setLoading(true);
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: question, id: Date.now() }]);

    try {
      const res = await queryRagChat({
        question,
        calendarId: parsedCalendarId,
        documentIds: parseDocumentIds(),
        topK: 6,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data?.answer || "", id: Date.now() + 1 },
      ]);
      setSources(res.data?.sources || []);
      setInput("");
    } catch (e) {
      setError(e?.response?.data?.message || "질의 처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareAndIndex = async () => {
    const parsedCalendarId = Number(calendarId);
    if (!file) {
      setError("업로드할 파일을 선택하세요.");
      return;
    }
    if (!Number.isFinite(parsedCalendarId) || parsedCalendarId <= 0) {
      setError("calendarId를 입력하세요.");
      return;
    }

    setUploading(true);
    setError("");
    setDocStatus(null);
    try {
      const presign = await requestDocumentPresign({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        calendarId: parsedCalendarId,
      });
      const documentId = presign.data.documentId;
      await completeDocumentUpload({
        documentId,
        title: file.name,
        tags: ["uploaded-via-ui"],
      });
      await startDocumentIndexing(documentId);
      const status = await getDocumentStatus(documentId);
      setUploadResult(presign.data);
      setDocStatus(status.data);
      setDocumentIdInput(String(documentId));
    } catch (e) {
      setError(e?.response?.data?.message || "문서 인덱싱 준비에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="chatbot-page chatbot-single">
      <section className="chatbot-main">
        <header className="chatbot-header">RAG Chat</header>

        <div className="chatbot-controls">
          <label>
            Calendar ID
            <input
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              placeholder="예: 1"
            />
          </label>
          <label>
            Document IDs (comma)
            <input
              value={documentIdInput}
              onChange={(e) => setDocumentIdInput(e.target.value)}
              placeholder="예: 101,102"
            />
          </label>
        </div>

        <div className="chatbot-upload-box">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button onClick={handlePrepareAndIndex} disabled={uploading}>
            {uploading ? "Indexing..." : "Presign + Complete + Index"}
          </button>
          {uploadResult && (
            <div className="chatbot-upload-meta">
              documentId: {uploadResult.documentId}, s3Key: {uploadResult.s3Key}
            </div>
          )}
          {docStatus && (
            <div className="chatbot-upload-meta">
              status: {docStatus.status}, chunkCount: {docStatus.chunkCount ?? 0}
            </div>
          )}
        </div>

        <div className="chatbot-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chatbot-message ${msg.role}`}>
              <div className="chatbot-role">{msg.role === "user" ? "Me" : "Bot"}</div>
              <div className="chatbot-content">{msg.content}</div>
            </div>
          ))}
          {sources.length > 0 && (
            <div className="chatbot-sources">
              <h4>Sources</h4>
              {sources.map((source, idx) => (
                <div key={`${source.chunkKey}-${idx}`} className="chatbot-source-item">
                  <strong>{source.documentTitle}</strong> ({source.chunkKey})
                  <div>{source.preview}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {error && <div className="chatbot-error">{error}</div>}
        <div className="chatbot-input-wrap">
          <textarea
            value={input}
            maxLength={4000}
            placeholder="Type your question..."
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
