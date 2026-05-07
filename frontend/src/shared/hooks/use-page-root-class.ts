import { useEffect } from "react";

export function usePageRootClass(className: string) {
  useEffect(() => {
    const root = document.getElementById("root");

    if (!root) {
      return;
    }

    root.classList.add(className);

    return () => {
      root.classList.remove(className);
    };
  }, [className]);
}
