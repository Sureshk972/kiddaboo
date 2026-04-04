import { useState, useRef } from "react";

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="sticky bottom-0 bg-cream/95 backdrop-blur-sm border-t border-cream-dark px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="
            flex-1 bg-white rounded-2xl border border-cream-dark
            px-4 py-3 text-sm text-charcoal placeholder-taupe/50
            resize-none outline-none focus:border-sage transition-colors
            max-h-24 leading-relaxed
          "
          style={{
            height: "auto",
            minHeight: "44px",
            overflow: text.split("\n").length > 3 ? "auto" : "hidden",
          }}
          onInput={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
          }}
        />

        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className={`
            w-11 h-11 rounded-full flex items-center justify-center shrink-0
            transition-all duration-150 cursor-pointer border-none
            ${
              text.trim() && !disabled
                ? "bg-sage text-white shadow-sm active:scale-95"
                : "bg-cream-dark text-taupe/30"
            }
          `}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M22 2L11 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 2L15 22L11 13L2 9L22 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
