import { useLocation } from "react-router-dom";

export default function PageTransition({ children, className = "page-transition" }) {
  const location = useLocation();

  return (
    <div key={location.pathname} className={`${className} flex-1 flex flex-col`}>
      {children}
    </div>
  );
}
