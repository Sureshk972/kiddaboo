import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  const d = Math.floor(s / 86400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill={n <= rating ? "#7A8F6D" : "#F0EBE3"}
          aria-hidden="true"
        >
          <path d="M7 1L8.8 4.7L13 5.3L10 8.2L10.7 12.3L7 10.4L3.3 12.3L4 8.2L1 5.3L5.2 4.7L7 1Z" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsList({ limit, compact = false }) {
  const [rows, setRows] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let q = supabase
        .from("feedback_public")
        .select("id, rating, comment, created_at, display_name")
        .order("created_at", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        console.error("ReviewsList load failed:", error);
        setRows([]);
        return;
      }
      setRows(data ?? []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (rows === null) {
    return (
      <div className="text-sm text-taupe py-6 text-center">Loading…</div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-sm text-taupe py-6 text-center">
        Be the first to leave feedback.
      </div>
    );
  }

  const padCard = compact ? "p-4" : "p-5";
  const textSize = compact ? "text-sm" : "text-[15px]";

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div
          key={r.id}
          className={`bg-white border border-cream-dark rounded-2xl ${padCard}`}
        >
          <div className="flex items-center justify-between mb-2">
            <Stars rating={r.rating} />
            <span className="text-xs text-taupe">{timeAgo(r.created_at)}</span>
          </div>
          {r.comment && (
            <p className={`${textSize} text-charcoal leading-relaxed mb-2 whitespace-pre-wrap`}>
              {r.comment}
            </p>
          )}
          <p className="text-xs text-taupe">
            {r.display_name?.trim() || "A Kiddaboo parent"}
          </p>
        </div>
      ))}
    </div>
  );
}
