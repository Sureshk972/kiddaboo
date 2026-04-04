import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useConversations from "../hooks/useConversations";
import ConversationCard from "../components/messages/ConversationCard";

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, loading } = useConversations(user?.id);

  return (
    <div className="bg-cream min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-md mx-auto px-5 py-4">
          <h1 className="text-xl font-heading font-bold text-charcoal">
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
          <div className="flex flex-col items-center text-center py-16">
            <div className="w-16 h-16 bg-cream-dark rounded-full flex items-center justify-center mb-4">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                className="text-taupe/30"
              >
                <path
                  d="M21 15C21 15.55 20.78 16.05 20.41 16.41C20.05 16.78 19.55 17 19 17H7L3 21V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V15Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="font-heading font-bold text-charcoal text-lg mb-2">
              No messages yet
            </h3>
            <p className="text-sm text-taupe leading-relaxed max-w-xs mb-6">
              Join a playgroup to start chatting with the host and other
              families.
            </p>
            <button
              onClick={() => navigate("/browse")}
              className="text-sm text-sage font-medium hover:text-sage-dark cursor-pointer bg-transparent border-none underline underline-offset-4"
            >
              Browse Playgroups
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
