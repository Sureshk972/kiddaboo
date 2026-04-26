export default function ProgressBar({ currentStep, totalSteps }) {
  const percent = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full bg-cream">
      <div className="max-w-md mx-auto px-6 pt-3 pb-1.5">
        <p className="text-[11px] text-taupe/70 font-medium tracking-wider uppercase">
          Step {currentStep} of {totalSteps}
        </p>
      </div>
      <div className="w-full h-1 bg-cream-dark">
        <div
          className="h-full bg-sage rounded-r-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
