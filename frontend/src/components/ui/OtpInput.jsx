import { useRef } from "react";

export default function OtpInput({ length = 6, value = "", onChange }) {
  const inputsRef = useRef([]);
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  const handleInput = (index, e) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (!val) return;

    const newDigits = [...digits];
    newDigits[index] = val[val.length - 1];
    onChange(newDigits.join(""));

    // Auto-advance
    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newDigits = [...digits];

      if (digits[index]) {
        newDigits[index] = "";
        onChange(newDigits.join("").trimEnd());
      } else if (index > 0) {
        newDigits[index - 1] = "";
        onChange(newDigits.join("").trimEnd());
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, length);
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          value={digit || ""}
          onInput={(e) => handleInput(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className="
            w-12 h-14 text-center text-xl font-heading
            bg-white border border-cream-dark rounded-xl
            outline-none transition-all duration-150
            focus:border-sage focus:ring-2 focus:ring-sage-light
            text-charcoal
          "
        />
      ))}
    </div>
  );
}
