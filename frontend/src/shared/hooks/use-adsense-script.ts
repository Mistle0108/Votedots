import { useEffect } from "react";

const ADSENSE_SCRIPT_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4187205008561363";

export function useAdsenseScript() {
  useEffect(() => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${ADSENSE_SCRIPT_SRC}"]`,
    );

    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = ADSENSE_SCRIPT_SRC;
    script.crossOrigin = "anonymous";
    script.dataset.votedotsAdsense = "true";
    document.head.appendChild(script);

    return () => {
      if (script.dataset.votedotsAdsense === "true") {
        script.remove();
      }
    };
  }, []);
}
