import { useLocation } from "react-router-dom";
import { useLayoutEffect, useRef } from "react";

export default function ScrollToTop() {
  const location = useLocation();
  const firstRender = useRef(true);

  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [location.pathname]);

  return null;
}
