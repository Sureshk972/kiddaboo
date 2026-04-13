const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="#DAE4D0" />
    <path
      d="M5 8L7 10L11 6"
      stroke="#5C6B52"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CrossIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="#F0EBE3" />
    <path
      d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5"
      stroke="#6B5E54"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

function CheckItem({ label, checked, detail }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <div className="mt-0.5">{checked ? <CheckIcon /> : <CrossIcon />}</div>
      <div>
        <p className="text-sm text-charcoal font-medium">{label}</p>
        {detail && <p className="text-xs text-taupe mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

export default function EnvironmentChecklist({ environment }) {
  if (!environment) return null;

  // Don't render if the host never configured environment details —
  // only maxGroupSize is set as a default from max_families.
  const hasRealData =
    environment.setting ||
    environment.childproofed !== undefined ||
    environment.supervisionRatio ||
    environment.organicSnacks !== undefined ||
    environment.screenFree !== undefined ||
    environment.firstAidKit !== undefined ||
    environment.pets;
  if (!hasRealData) return null;

  const items = [
    {
      label: "Setting",
      checked: true,
      detail: environment.setting,
    },
    {
      label: "Childproofed",
      checked: environment.childproofed,
    },
    {
      label: "Pets",
      checked: !environment.pets?.has,
      detail: environment.pets?.has
        ? environment.pets.type
        : "No pets",
    },
    {
      label: "Organic snacks",
      checked: environment.organicSnacks,
    },
    {
      label: "Screen-free",
      checked: environment.screenFree,
    },
    {
      label: "First aid kit",
      checked: environment.firstAidKit,
    },
    {
      label: "Max group size",
      checked: true,
      detail: `${environment.maxGroupSize} families`,
    },
    {
      label: "Supervision ratio",
      checked: true,
      detail: `${environment.supervisionRatio} adult-to-child`,
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-cream-dark">
      <h3 className="font-heading font-bold text-charcoal mb-3">
        Environment
      </h3>
      <div className="grid grid-cols-2 gap-x-4">
        {items.map((item) => (
          <CheckItem key={item.label} {...item} />
        ))}
      </div>
    </div>
  );
}
