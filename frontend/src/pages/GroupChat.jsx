import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import useGroupMessages from "../hooks/useGroupMessages";
import { markChatRead } from "../hooks/useNotifications";
import MessageBubble from "../components/messages/MessageBubble";
import ChatInput from "../components/messages/ChatInput";

export default function GroupChat() {
  const { playgroupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [groupName, setGroupName] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [authorized, setAuthorized] = useState(null); // null = loading

  const { messages, loading, sending, hasMore, sendMessage, loadMore } =
    useGroupMessages(playgroupId, user?.id);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const prevMessageCount = useRef(0);

  // Fetch group info + check membership
  useEffect(() => {
    if (!playgroupId || !user) return;

    const fetchGroupInfo = async () => {
      // Get playgroup name
      const { data: pg } = await supabase
        .from("playgroups")
        .select("name")
        .eq("id", playgroupId)
        .single();

      if (pg) setGroupName(pg.name);

      // Check user is a member/creator
      const { data: membership } = await supabase
        .from("memberships")
        .select("role")
        .eq("playgroup_id", playgroupId)
        .eq("user_id", user.id)
        .in("role", ["creator", "member"])
        .single();

      setAuthorized(!!membership);

      // Member count
      const { count } = await supabase
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("playgroup_id", playgroupId)
        .in("role", ["creator", "member"]);

      setMemberCount(count || 0);
    };

    fetchGroupInfo();

    // Mark this chat as read
    markChatRead(playgroupId);
  }, [playgroupId, user]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      // Only auto-scroll if we were near the bottom
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
    // Keep last-read timestamp fresh while viewing
    if (messages.length > 0) markChatRead(playgroupId);
  }, [messages.length]);

  // Handle send
  const handleSend = async (content) => {
    await sendMessage(content);
    // Scroll to bottom after sending
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Loading state
  if (!user || authorized === null || loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authorized
  if (!authorized) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <h2 className="font-heading font-bold text-charcoal text-xl mb-2">
          Not a member
        </h2>
        <p className="text-taupe text-sm mb-6">
          You need to be a member of this playgroup to access the chat.
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

  // Group messages by date
  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark shrink-0">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/messages")}
            className="w-8 h-8 rounded-full bg-white border border-cream-dark flex items-center justify-center cursor-pointer hover:border-sage-light transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18L9 12L15 6"
                stroke="#5C5C5C"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-bold text-charcoal text-base truncate">
              {groupName}
            </h1>
            <p className="text-[10px] text-taupe">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 max-w-md mx-auto w-full"
      >
        {/* Load more */}
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

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-sage-light rounded-full flex items-center justify-center mb-4">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                className="text-sage-dark"
              >
                <path
                  d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="font-heading font-bold text-charcoal mb-1">
              Start the conversation!
            </h3>
            <p className="text-sm text-taupe max-w-[200px]">
              Say hello to your {groupName} group
            </p>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === user.id;
          const prevMsg = messages[i - 1];
          const showSender =
            !isOwn && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
          const showAvatar = showSender;

          // Date separator
          const showDate =
            !prevMsg ||
            getDateLabel(msg.created_at) !== getDateLabel(prevMsg.created_at);

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center justify-center my-4">
                  <span className="text-[10px] text-taupe/60 bg-cream-dark/50 px-3 py-1 rounded-full">
                    {getDateLabel(msg.created_at)}
                  </span>
                </div>
              )}
              <MessageBubble
                message={msg}
                isOwn={isOwn}
                showSender={showSender}
                showAvatar={showAvatar}
              />
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
