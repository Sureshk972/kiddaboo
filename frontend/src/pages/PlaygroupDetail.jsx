import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PhotoCarousel from "../components/playgroup/PhotoCarousel";
import HostCard from "../components/playgroup/HostCard";
import EnvironmentChecklist from "../components/playgroup/EnvironmentChecklist";
import RatingBreakdown from "../components/playgroup/RatingBreakdown";
import ReviewCard from "../components/playgroup/ReviewCard";
import MemberAvatars from "../components/playgroup/MemberAvatars";
import JoinRequestSheet from "../components/playgroup/JoinRequestSheet";
import Button from "../components/ui/Button";
import { MOCK_PLAYGROUP_DETAILS } from "../data/mockData";

const ACCESS_LABELS = {
  open: { text: "Open", color: "bg-sage-light text-sage-dark" },
  request: { text: "Request to Join", color: "bg-terracotta-light text-terracotta" },
  invite: { text: "Invite Only", color: "bg-cream-dark text-taupe" },
};

export default function PlaygroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showJoinSheet, setShowJoinSheet] = useState(false);

  const group = MOCK_PLAYGROUP_DETAILS[id];

  if (!group) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="text-xl font-heading font-bold text-charcoal mb-2">
            Playgroup not found
          </h2>
          <p className="text-taupe mb-4">This playgroup may no longer be active.</p>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const access = ACCESS_LABELS[group.accessType] || ACCESS_LABELS.request;

  const handleJoinClick = () => {
    if (group.accessType === "open") {
      alert("You've joined the group!");
    } else {
      setShowJoinSheet(true);
    }
  };

  return (
    <div className="min-h-screen bg-cream pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-cream/80 backdrop-blur-md px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white border border-cream-dark flex items-center justify-center cursor-pointer hover:border-sage-light transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="#2F2F2F"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h2 className="font-heading font-bold text-charcoal text-sm truncate">
          {group.name}
        </h2>
      </div>

      <div className="max-w-md mx-auto w-full px-6">
        {/* Photo carousel */}
        <div className="mb-6">
          <PhotoCarousel photos={group.photos} />
        </div>

        {/* Title + access badge + location */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-2xl font-heading font-bold text-charcoal">
              {group.name}
            </h1>
            <span
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${access.color}`}
            >
              {access.text}
            </span>
          </div>
          <p className="text-sm text-taupe flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
              />
              <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1" />
            </svg>
            {group.location}
          </p>

          {/* Vibe tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {group.vibeTags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-sage-light text-sage-dark px-3 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="font-heading font-bold text-charcoal mb-2">About</h3>
          <p className="text-sm text-taupe-dark leading-relaxed">
            {group.description}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-cream-dark mb-6" />

        {/* Host */}
        <div className="mb-6">
          <h3 className="font-heading font-bold text-charcoal mb-3">
            Your Host
          </h3>
          <HostCard host={group.host} />
        </div>

        {/* Divider */}
        <div className="h-px bg-cream-dark mb-6" />

        {/* Environment checklist */}
        <div className="mb-6">
          <EnvironmentChecklist environment={group.environment} />
        </div>

        {/* Divider */}
        <div className="h-px bg-cream-dark mb-6" />

        {/* Schedule */}
        <div className="mb-6">
          <h3 className="font-heading font-bold text-charcoal mb-3">
            Schedule
          </h3>
          <div className="bg-white rounded-2xl p-4 border border-cream-dark">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-sage-light rounded-xl flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect
                    x="3"
                    y="4"
                    width="14"
                    height="13"
                    rx="2"
                    stroke="#7A8F6D"
                    strokeWidth="1.5"
                  />
                  <path d="M3 8H17" stroke="#7A8F6D" strokeWidth="1.5" />
                  <path
                    d="M7 2V5M13 2V5"
                    stroke="#7A8F6D"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-charcoal">
                  {group.nextSession.date}
                </p>
                <p className="text-xs text-taupe">
                  {group.nextSession.time}
                </p>
                <p className="text-xs text-taupe">
                  {group.nextSession.location}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-cream-dark">
              <p className="text-xs text-taupe">
                <span className="text-sage-dark font-medium">
                  {group.frequency}
                </span>{" "}
                &middot; Ages {group.ageRange}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-cream-dark mb-6" />

        {/* Ratings & Reviews */}
        <div className="mb-6">
          <h3 className="font-heading font-bold text-charcoal mb-4">
            Ratings & Reviews
          </h3>
          <RatingBreakdown ratings={group.ratings} />

          <div className="flex flex-col gap-3 mt-5">
            {group.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-cream-dark mb-6" />

        {/* Members */}
        <div className="mb-6">
          <MemberAvatars
            members={group.members}
            maxFamilies={group.maxFamilies}
            ageRange={group.ageRange}
          />
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-cream/90 backdrop-blur-md border-t border-cream-dark px-6 py-4 z-30">
        <div className="max-w-md mx-auto">
          {group.accessType === "invite" ? (
            <div className="text-center">
              <p className="text-xs text-taupe mb-2">
                This group is invite-only. Ask a member for an invitation.
              </p>
              <Button fullWidth variant="secondary" disabled>
                Invite Only
              </Button>
            </div>
          ) : (
            <Button fullWidth onClick={handleJoinClick}>
              {group.accessType === "open"
                ? "Join Group"
                : "Request to Join"}
            </Button>
          )}
        </div>
      </div>

      {/* Join request bottom sheet */}
      <JoinRequestSheet
        isOpen={showJoinSheet}
        onClose={() => setShowJoinSheet(false)}
        screeningQuestions={group.screeningQuestions}
        playgroupName={group.name}
        onSubmit={(data) => console.log("Join request:", data)}
      />
    </div>
  );
}
