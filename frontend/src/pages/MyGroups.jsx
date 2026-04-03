import { useNavigate } from "react-router-dom";

const MOCK_MY_GROUPS = {
  hosting: {
    id: "pg-1",
    name: "Little Explorers",
    location: "Presidio, SF",
    memberCount: 4,
    maxFamilies: 6,
    pendingRequests: 3,
    nextSession: "Saturday, 10am",
    photoColor: "#A3B18A",
  },
  joined: [
    {
      id: "pg-2",
      name: "Tender Sprouts",
      location: "Noe Valley, SF",
      status: "member",
      hostName: "Priya Sharma",
      hostInitials: "PS",
      nextSession: "Wednesday, 9:30am",
      photoColor: "#E8C4B0",
    },
    {
      id: "pg-5",
      name: "Bilingual Buddies",
      location: "Sunset, SF",
      status: "pending",
      hostName: "Mei Lin Wu",
      hostInitials: "MW",
      nextSession: "Tuesday, 9am",
      photoColor: "#DAE4D0",
    },
    {
      id: "pg-7",
      name: "Waldorf Wonderland",
      location: "Pacific Heights, SF",
      status: "waitlisted",
      hostName: "Astrid Holm",
      hostInitials: "AH",
      nextSession: "Monday, 10am",
      photoColor: "#E8C4B0",
    },
  ],
};

const STATUS_BADGES = {
  member: {
    label: "Member",
    bg: "bg-sage-light",
    text: "text-sage-dark",
  },
  pending: {
    label: "Pending",
    bg: "bg-terracotta-light/50",
    text: "text-taupe-dark",
  },
  waitlisted: {
    label: "Waitlisted",
    bg: "bg-cream-dark",
    text: "text-taupe",
  },
};

export default function MyGroups() {
  const navigate = useNavigate();
  const data = MOCK_MY_GROUPS;

  return (
    <div className="bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-b border-cream-dark">
        <div className="max-w-md mx-auto px-5 py-4">
          <h1 className="text-xl font-heading font-bold text-charcoal">
            My Groups
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-5 flex flex-col gap-6">
        {/* Hosting section */}
        {data.hosting && (
          <div>
            <h3 className="text-sm font-medium text-taupe mb-2">
              Your Playgroup
            </h3>
            <div
              onClick={() => navigate("/host/dashboard")}
              className="bg-white rounded-2xl border border-cream-dark overflow-hidden cursor-pointer hover:border-sage-light transition-all hover:shadow-sm"
            >
              {/* Color strip */}
              <div
                className="h-16 flex items-center justify-between px-4"
                style={{ backgroundColor: data.hosting.photoColor + "30" }}
              >
                <span className="text-[10px] bg-white/80 backdrop-blur-sm text-sage-dark px-2 py-0.5 rounded-full font-medium">
                  Host
                </span>
                {data.hosting.pendingRequests > 0 && (
                  <span className="text-[10px] bg-terracotta-light text-taupe-dark px-2 py-0.5 rounded-full font-medium">
                    {data.hosting.pendingRequests} requests
                  </span>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-heading font-bold text-charcoal text-base mb-1">
                  {data.hosting.name}
                </h3>
                <p className="text-xs text-taupe mb-3 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                    <circle
                      cx="7"
                      cy="6"
                      r="1.5"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  </svg>
                  {data.hosting.location}
                </p>

                <div className="flex items-center justify-between text-xs text-taupe">
                  <span>
                    {data.hosting.memberCount} of {data.hosting.maxFamilies}{" "}
                    families
                  </span>
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M3 10H21"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M8 2V6M16 2V6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    Next: {data.hosting.nextSession}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Joined groups */}
        <div>
          <h3 className="text-sm font-medium text-taupe mb-2">
            Joined Groups
          </h3>
          <div className="flex flex-col gap-3">
            {data.joined.map((group) => {
              const badge = STATUS_BADGES[group.status];
              return (
                <div
                  key={group.id}
                  onClick={() => navigate(`/playgroup/${group.id}`)}
                  className="bg-white rounded-2xl border border-cream-dark overflow-hidden cursor-pointer hover:border-sage-light transition-all hover:shadow-sm"
                >
                  {/* Color strip */}
                  <div
                    className="h-12 flex items-center justify-end px-4"
                    style={{
                      backgroundColor: group.photoColor + "30",
                    }}
                  >
                    <span
                      className={`text-[10px] ${badge.bg} ${badge.text} px-2 py-0.5 rounded-full font-medium`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="font-heading font-bold text-charcoal text-sm mb-1">
                      {group.name}
                    </h3>
                    <p className="text-xs text-taupe mb-2 flex items-center gap-1">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path
                          d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z"
                          stroke="currentColor"
                          strokeWidth="1"
                        />
                        <circle
                          cx="7"
                          cy="6"
                          r="1.5"
                          stroke="currentColor"
                          strokeWidth="1"
                        />
                      </svg>
                      {group.location}
                    </p>

                    <div className="flex items-center justify-between text-xs text-taupe">
                      {/* Host */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-sage-light flex items-center justify-center">
                          <span className="text-[8px] font-bold text-sage-dark">
                            {group.hostInitials}
                          </span>
                        </div>
                        <span>{group.hostName}</span>
                      </div>

                      {/* Next session */}
                      <div className="flex items-center gap-1">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <rect
                            x="3"
                            y="4"
                            width="18"
                            height="18"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M3 10H21"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M8 2V6M16 2V6"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        {group.nextSession}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
