import { motion } from "framer-motion";

// Drop-in replacement for <button> that springs slightly when tapped.
// Adds subtle tactility without changing layout or visual style.
export default function TapButton({ children, ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
