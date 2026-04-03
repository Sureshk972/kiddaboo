export default function ProgressBar({ currentStep, totalSteps }) {
  const percent = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full h-1 bg-cream-dark">
      <div
        className="h-full bg-sage rounded-r-full transition-all duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
