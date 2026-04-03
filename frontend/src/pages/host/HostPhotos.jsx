import { useNavigate } from "react-router-dom";
import OnboardingLayout from "../../components/layout/OnboardingLayout";
import Button from "../../components/ui/Button";
import { useHost } from "../../context/HostContext";

export default function HostPhotos() {
  const navigate = useNavigate();
  const { data, addPhoto, removePhoto } = useHost();

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      addPhoto(url);
    });
    // Reset the input so the same file can be selected again
    e.target.value = "";
  };

  return (
    <OnboardingLayout currentStep={4} totalSteps={5}>
      <div className="flex flex-col gap-6 pt-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
            Show your space
          </h1>
          <p className="text-taupe leading-relaxed">
            Photos help families feel confident about the environment. Show
            where the kids will play.
          </p>
        </div>

        {/* Photo grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Existing photos */}
          {data.photos.map((url, i) => (
            <div
              key={i}
              className="relative aspect-square rounded-2xl overflow-hidden border border-cream-dark"
            >
              <img
                src={url}
                alt={`Space photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-charcoal/60 text-white flex items-center justify-center cursor-pointer hover:bg-charcoal/80 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 3L9 9M9 3L3 9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          ))}

          {/* Add photo button */}
          {data.photos.length < 6 && (
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="aspect-square rounded-2xl border-2 border-dashed border-taupe/30 bg-cream-dark flex flex-col items-center justify-center gap-2 hover:border-sage transition-colors">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-taupe/40"
                >
                  <path
                    d="M12 5V19M5 12H19"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-xs text-taupe/50">Add photo</span>
              </div>
            </label>
          )}
        </div>

        {/* Tips */}
        <div className="bg-sage-light/30 rounded-xl p-4 border border-sage-light">
          <p className="text-xs font-medium text-sage-dark mb-2">Photo tips</p>
          <ul className="text-xs text-taupe-dark leading-relaxed space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-sage mt-0.5">&#10003;</span>
              Show the play area, toys, and setup
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sage mt-0.5">&#10003;</span>
              Include outdoor spaces if applicable
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sage mt-0.5">&#10003;</span>
              Natural lighting works best
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sage mt-0.5">&#10003;</span>
              Avoid photos with other people's children
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button fullWidth onClick={() => navigate("/host/success")}>
            Go Live
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => navigate("/host/success")}
          >
            Skip for now
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
