import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import useSessionMessages from "../hooks/useSessionMessages";
import useBlocks from "../hooks/useBlocks";
import MessageBubble from "../components/messages/MessageBubble";
import ChatInput from "../components/messages/ChatInput";
import ReportSheet from "../components/ui/ReportSheet";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { friendlyDate, formatSessionTime } from "../lib/dateUtils";

// Per-session chat. Mirrors GroupChat but the conversation is scoped
// to one session and only visible to the host + RSVP'd attendees.
// Authorization is enforced server-side by RLS on messages; the
// client-side authorized check just keeps the unauthorized empty
// state from looking like a generic loading screen.
export default function SessionChat() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [playgroup, setPlaygroup] = useState(null);
  const [authorized, setAuthorized] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);

  useDocumentTitle(playgroup?.name ? `${playgroup.name} session chat` : "Session chat");

  const { messages, loading, sending, hasMore, sendMessage, loadMore } =
    useSessionMessages(sessionId, playgroup?.id, user?.id);
  const { blockUser, submitReport, isBlocked } = useBlocks(user?.id);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const prevMessageCount = useRef(0);

  useEffect(() => {
    if (!sessionId || !user) return;

    const fetchInfo = async () => {
      const { data: s } = await supabase
        .from("sessions")
        .select("id, playgroup_id, scheduled_at, title")
        .eq("id", sessionId)
        .maybeSingle();

      if (!s) {
        setAuthorized(false);
        return;
      }
      setSession(s);

      const { data: pg } = await supabase
        .from("playgroups")
        .select("id, name, photos, creator_id")
        .eq("id", s.playgroup_id)
        .maybeSingle();
      setPlaygroup(pg);

      // Host always authorized; otherwise need an rsvps row (any status).
      if (pg?.creator_id === user.id) {
        setAuthorized(true);
        return;
      }
      const { data: rsvp } = await supabase
        .from("rsvps")
        .select("id")
        .eq("session_id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();
      setAuthorized(!!rsvp);
    };

    fetchInfo();
  }, [sessionId, user]);

  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      const container = scrollRef.current;
      if (container) {
        const isNearBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight <
          150;
        if (isNearBottom || prevMessageCount.current === 0) {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  const handleSend = async (content) => {
    const ok = await sendMessage(content);
    if (ok) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    return ok;
  };

  if (!user || authorized === null || loading || !playgroup) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <h2 className="font-heading font-bold text-charcoal text-xl mb-2">No access</h2>
        <p className="text-taupe text-sm mb-6">
          Only attendees of this session can view its chat.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="bg-sage text-white font-medium rounded-2xl px-6 py-3 cursor-pointer border-none"
        >
          Go Back
        </button>
      </div>
    );
  }

  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const sessionLabel = session
    ? `${friendlyDate(session.scheduled_at)} · ${formatSessionTime(session.scheduled_at)}`
    : "";

  return (
    <div className="min-h-screen bg-cream flex flex-col h-screen">
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark shrink-0">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-8 h-8 rounded-full bg-white border border-cream-dark flex items-center justify-center cursor-pointer hover:border-sage-light transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="#5C5C5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="w-9 h-9 rounded-full bg-sage-light flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-sage-dark">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 2V6M16 2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-bold text-charcoal text-base truncate">
              {playgroup.name}
            </h1>
            <p className="text-[10px] text-taupe truncate">Session · {sessionLabel}</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 max-w-md mx-auto w-full">
        {hasMore && (
          <div className="text-center mb-4">
            <button
              onClick={loadMore}
              className="text-xs text-sage font-medium hover:text-sage-dark cursor-pointer bg-transparent border-none underline underline-offset-4"
            >
              Load earlier messages
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-sage-light rounded-full flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-sage-dark">
                <path d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="font-heading font-bold text-charcoal mb-1">Session chat</h3>
            <p className="text-sm text-taupe max-w-[220px]">
              Coordinate with everyone going to this session.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === user.id;
          const prevMsg = messages[i - 1];
          const showSender = !isOwn && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
          const showAvatar = showSender;
          const showDate =
            !prevMsg || getDateLabel(msg.created_at) !== getDateLabel(prevMsg.created_at);

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center justify-center my-4">
                  <span className="text-[10px] text-taupe/60 bg-cream-dark/50 px-3 py-1 rounded-full">
                    {getDateLabel(msg.created_at)}
                  </span>
                </div>
              )}
              {!isBlocked(msg.sender_id) && (
                <MessageBubble
                  message={msg}
                  isOwn={isOwn}
                  showSender={showSender}
                  showAvatar={showAvatar}
                  onReport={(senderId, senderName) =>
                    setReportTarget({ userId: senderId, userName: senderName })
                  }
                />
              )}
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} disabled={sending} />

      <ReportSheet
        isOpen={!!reportTarget}
        onClose={() => setReportTarget(null)}
        userName={reportTarget?.userName || ""}
        onReport={async ({ reportType, description }) => {
          await submitReport({
            reportedUserId: reportTarget.userId,
            reportType,
            context: "message",
            description,
          });
        }}
        onBlock={async () => {
          await blockUser(reportTarget.userId);
        }}
      />
    </div>
  );
}
