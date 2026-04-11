import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useConversations from "../hooks/useConversations";
import ConversationCard from "../components/messages/ConversationCard";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function Messages() {
  useDocumentTitle("Messages"); // #50
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, loading } = useConversations(user?.id);

  return (
    <div className="bg-cream min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-md mx-auto px-5 py-4">
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'ChunkFive', serif", color: '#5C6B52' }}>
            Messages
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-5">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Conversations list */}
        {!loading && conversations.length > 0 && (
          <div className="flex flex-col gap-3">
            {conversations.map((convo) => (
              <ConversationCard
                key={convo.playgroupId}
                conversation={convo}
                onClick={() => navigate(`/messages/${convo.playgroupId}`)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center text-center py-12">
            {/* Illustration: chat bubbles */}
            <div className="relative w-28 h-24 mb-5">
              {/* Left bubble */}
              <div className="absolute left-0 bottom-2 w-16 h-12 bg-sage-light rounded-2xl rounded-bl-sm flex items-center justify-center">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-sage/50" />
                  <div className="w-1.5 h-1.5 rounded-full bg-sage/50" />
                  <div className="w-1.5 h-1.5 rounded-full bg-sage/50" />
                </div>
              </div>
              {/* Right bubble */}
              <div className="absolute right-0 top-0 w-18 h-14 bg-terracotta-light rounded-2xl rounded-br-sm flex items-center justify-center px-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" stroke="#C08B6E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {/* Small decorative dot */}
              <div className="absolute left-14 top-8 w-3 h-3 rounded-full bg-cream-dark" />
            </div>

            <h3 className="font-heading font-bold text-charcoal text-lg mb-2">
              Conversations start here
            </h3>
            <p className="text-sm text-taupe leading-relaxed max-w-[260px] mb-5">
              Once you join a playgroup, you can chat with the host and other families to plan playdates.
            </p>
            <button
              onClick={() => navigate("/browse")}
              className="bg-sage hover:bg-sage-dark text-white text-sm font-medium px-6 py-2.5 rounded-xl cursor-pointer border-none transition-colors"
            >
              Find a Playgroup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
