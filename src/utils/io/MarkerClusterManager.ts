export const CHART_CONFIG$1 = {
  small: {
    width: 280,
    height: 100,
    padding: 10,
  },
  large: {
    width: 600,
    height: 300,
    padding: 25,
  },
  gridLines: 4,
  colors: {
    flowRate: "#4ade80",
    pressure: "#f87171",
    ma: "#60a5fa",
    ema: "#a78bfa",
    text: "#9ca3af",
    textDark: "#6b7280",
  },
};

export function hideAllClusterElements(): string[] {
  const allClusterElements: string[] = [];
  const viewport = document.querySelector("bim-viewport");
  if (!viewport) return allClusterElements;

  const selectors = [
    ".bim-label",
    "[class*='cluster']",
    "span[class*='bim-label']",
  ];

  for (const selector of selectors) {
    const elements = viewport.querySelectorAll(selector);
    elements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.setProperty("display", "none", "important");
      allClusterElements.push(htmlEl.className);
    });
  }

  const allSpans = viewport.querySelectorAll("span");
  for (const span of allSpans) {
    const htmlSpan = span as HTMLElement;
    const style = htmlSpan.style;

    const isClusterSpan =
      style.position === "absolute" &&
      style.pointerEvents === "auto" &&
      style.zIndex &&
      parseInt(style.zIndex) > 0 &&
      style.transform &&
      style.transform.includes("translate");

    if (isClusterSpan) {
      const childDiv = htmlSpan.querySelector("div");
      const isClusterBubble =
        childDiv &&
        (childDiv.style.borderRadius === "50%" ||
          childDiv.style.borderRadius === "") &&
        childDiv.style.fontSize === "1.2rem" &&
        childDiv.style.textAlign === "center";

      if (isClusterBubble) {
        if (!allClusterElements.includes(htmlSpan.className)) {
          allClusterElements.push(htmlSpan.className);
          htmlSpan.style.setProperty("display", "none", "important");
        }
      }
    }
  }

  const allDivs = viewport.querySelectorAll("div");
  for (const div of allDivs) {
    const htmlDiv = div as HTMLElement;
    const style = htmlDiv.style;

    const isClusterBubble =
      style.borderRadius === "100%" &&
      (style.fontSize === "3.2rem" || style.fontSize === "1.2rem") &&
      style.textAlign === "center";

    if (isClusterBubble) {
      const parent = htmlDiv.parentElement;
      if (parent) {
        const parentHtml = parent as HTMLElement;
        if (parentHtml.tagName === "SPAN") {
          parentHtml.style.setProperty("display", "none", "important");
          if (!allClusterElements.includes(parentHtml.className)) {
            allClusterElements.push(parentHtml.className);
          }
        } else {
          htmlDiv.style.setProperty("display", "none", "important");
          if (!allClusterElements.includes(htmlDiv.className)) {
            allClusterElements.push(htmlDiv.className);
          }
        }
      }
    }
  }

  return allClusterElements;
}

export function showAllClusterElements(): void {
  const viewport = document.querySelector("bim-viewport");
  if (!viewport) return;

  const selectors = [".bim-label", "[class*='cluster']"];
  for (const selector of selectors) {
    const elements = viewport.querySelectorAll(selector);
    elements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.removeProperty("display");
    });
  }
}
