import { useState } from "react";
import Button from "../ui/Button";
import { todayDateString } from "../../lib/dateUtils";

const DURATION_OPTIONS = [
  { label: "1 hr", value: 60 },
  { label: "1.5 hrs", value: 90 },
  { label: "2 hrs", value: 120 },
  { label: "3 hrs", value: 180 },
];

export default function ScheduleSessionSheet({
  isOpen,
  onClose,
  defaultLocation = "",
  playgroupName = "",
  onSchedule,
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(120);
  const [location, setLocation] = useState(defaultLocation);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const canSubmit = date && time && !saving;

  const handleSchedule = async () => {
    if (!canSubmit) return;
    setSaving(true);

    // Combine date + time into ISO string
    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    const result = await onSchedule?.({
      title: playgroupName || "Playdate",
      scheduled_at: scheduledAt,
      duration_minutes: duration,
      location_name: location || null,
      notes: notes || null,
    });

    setSaving(false);

    if (!result?.error) {
      setSuccess(true);
    }
  };

  const handleClose = () => {
    // Reset form on close
    setDate("");
    setTime("10:00");
    setDuration(120);
    setLocation(defaultLocation);
    setNotes("");
    setSaving(false);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/40 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-cream rounded-t-3xl max-h-[85vh] overflow-y-auto">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-cream-dark rounded-full" />
        </div>

        <div className="px-6 pb-8">
          {success ? (
            /* Success state */
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-sage-light rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="#7A8F6D"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-heading font-bold text-charcoal mb-2">
                Session scheduled!
              </h3>
              <p className="text-sm text-taupe leading-relaxed mb-6">
                Your group members will be able to see this on the playgroup page.
              </p>
              <Button variant="secondary" onClick={handleClose}>
                Done
              </Button>
            </div>
          ) : (
            /* Schedule form */
            <>
              <h3 className="text-xl font-heading font-bold text-charcoal mb-1">
                Schedule a session
              </h3>
              <p className="text-sm text-taupe mb-6">
                Pick a date and time for your next playdate.
              </p>

              {/* Date */}
              <div className="mb-4">
                <label className="text-sm font-medium text-taupe-dark block mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={todayDateString()}
                  className="
                    w-full bg-white border border-cream-dark rounded-xl px-4 py-3.5
                    text-charcoal font-body text-sm outline-none transition-all duration-150
                    focus:ring-2 focus:ring-sage-light focus:border-sage
                    appearance-none
                  "
                />
              </div>

              {/* Time */}
              <div className="mb-4">
                <label className="text-sm font-medium text-taupe-dark block mb-1.5">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="
                    w-full bg-white border border-cream-dark rounded-xl px-4 py-3.5
                    text-charcoal font-body text-sm outline-none transition-all duration-150
                    focus:ring-2 focus:ring-sage-light focus:border-sage
                    appearance-none
                  "
                />
              </div>

              {/* Duration */}
              <div className="mb-4">
                <label className="text-sm font-medium text-taupe-dark block mb-1.5">
                  Duration
                </label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDuration(opt.value)}
                      className={`
                        flex-1 py-2.5 rounded-xl text-sm font-medium
                        border transition-all duration-150 cursor-pointer
                        ${
                          duration === opt.value
                            ? "bg-sage text-white border-sage"
                            : "bg-white text-taupe border-cream-dark hover:border-sage-light"
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="mb-4">
                <label className="text-sm font-medium text-taupe-dark block mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Central Park playground"
                  className="
                    w-full bg-white border border-cream-dark rounded-xl px-4 py-3.5
                    text-charcoal font-body text-sm outline-none transition-all duration-150
                    placeholder:text-taupe/40
                    focus:ring-2 focus:ring-sage-light focus:border-sage
                  "
                />
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="text-sm font-medium text-taupe-dark block mb-1.5">
                  Notes{" "}
                  <span className="text-taupe/50 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Bring sunscreen, snacks provided..."
                  rows={2}
                  maxLength={300}
                  className="
                    w-full bg-white border border-cream-dark rounded-xl px-4 py-3.5
                    text-charcoal font-body text-sm outline-none transition-all duration-150
                    resize-none placeholder:text-taupe/40
                    focus:ring-2 focus:ring-sage-light focus:border-sage
                  "
                />
              </div>

              <Button
                fullWidth
                onClick={handleSchedule}
                disabled={!canSubmit}
                loading={saving}
              >
                Schedule Session
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
