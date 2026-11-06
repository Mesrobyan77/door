/**
 * Plays a short fly-to-cart animation (Grill-style).
 * No-ops when `prefers-reduced-motion` is set or DOM is unavailable.
 */
export type CartFlyAnimationInput = {
  fromElement: HTMLElement;
  imageUrl?: string | null;
};

function isVisibleRect(rect: DOMRect): boolean {
  return rect.width > 0 && rect.height > 0;
}

function findVisibleCartTargetRect(
  root: ParentNode,
): DOMRect | null {
  for (const node of root.querySelectorAll("[data-cart-fly-target]")) {
    if (!(node instanceof HTMLElement)) continue;
    const visible =
      typeof node.checkVisibility === "function"
        ? node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
        : isVisibleRect(node.getBoundingClientRect());
    if (!visible) continue;
    const rect = node.getBoundingClientRect();
    if (isVisibleRect(rect)) return rect;
  }
  return null;
}

function resolveCartTargetRect(): DOMRect {
  const header = document.querySelector("[data-site-header]");
  if (header) {
    const rect = findVisibleCartTargetRect(header);
    if (rect) return rect;
  }

  const bottomNav = document.querySelector("[data-mobile-bottom-nav]");
  if (bottomNav) {
    const rect = findVisibleCartTargetRect(bottomNav);
    if (rect) return rect;
  }

  return (
    findVisibleCartTargetRect(document) ??
    new DOMRect(window.innerWidth - 24 - 40, 72, 40, 40)
  );
}

function resolveSourceImage(
  fromElement: HTMLElement,
): { url: string; objectFit: string; objectPosition: string } | null {
  const images = fromElement.querySelectorAll("img");
  let best: HTMLImageElement | null = null;
  let bestArea = 0;

  for (const image of images) {
    if (!(image instanceof HTMLImageElement)) continue;
    const rect = image.getBoundingClientRect();
    const area = rect.width * rect.height;
    const url = (image.currentSrc || image.src || "").trim();
    if (area < 16 || !url) continue;
    if (area > bestArea) {
      bestArea = area;
      best = image;
    }
  }

  if (!best) return null;
  const style = window.getComputedStyle(best);
  return {
    url: (best.currentSrc || best.src).trim(),
    objectFit: style.objectFit || "cover",
    objectPosition: style.objectPosition || "50% 50%",
  };
}

function createFlyer(
  imageUrl: string | null,
  imageMeta: { objectFit: string; objectPosition: string } | null,
): HTMLDivElement {
  const flyer = document.createElement("div");
  flyer.style.position = "fixed";
  flyer.style.borderRadius = "50%";
  flyer.style.overflow = "hidden";
  flyer.style.zIndex = "199";
  flyer.style.pointerEvents = "none";
  flyer.style.boxShadow = "0 8px 24px rgba(15, 23, 42, 0.18)";
  flyer.setAttribute("aria-hidden", "true");

  if (imageUrl) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = "";
    img.draggable = false;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = imageMeta?.objectFit ?? "cover";
    img.style.objectPosition = imageMeta?.objectPosition ?? "50% 50%";
    img.style.display = "block";
    flyer.appendChild(img);
  } else {
    flyer.style.background =
      "linear-gradient(145deg, #111827 0%, #6b7280 100%)";
  }

  document.body.appendChild(flyer);
  return flyer;
}

/** Animates a product thumbnail from `fromElement` toward the cart icon. */
export function playCartFlyAnimation({
  fromElement,
  imageUrl,
}: CartFlyAnimationInput): void {
  if (typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const source =
    fromElement.closest<HTMLElement>("[data-cart-fly-source]") ?? fromElement;
  if (!isVisibleRect(source.getBoundingClientRect())) return;

  const run = (): void => {
    if (!source.isConnected) return;
    const fromRect = source.getBoundingClientRect();
    if (!isVisibleRect(fromRect)) return;

    const toRect = resolveCartTargetRect();
    const fromX = fromRect.left + fromRect.width / 2;
    const fromY = fromRect.top + fromRect.height / 2;
    const toX = toRect.left + toRect.width / 2;
    const toY = toRect.top + toRect.height / 2;
    const endSize = Math.max(12, Math.min(toRect.width, toRect.height, 30));
    const dx = toX - fromX;
    const dy = toY - fromY;

    const resolved = resolveSourceImage(source);
    const flyer = createFlyer(
      resolved?.url ?? imageUrl?.trim() ?? null,
      resolved,
    );
    const startSize = 52;
    flyer.style.left = `${fromX - startSize / 2}px`;
    flyer.style.top = `${fromY - startSize / 2}px`;
    flyer.style.width = `${startSize}px`;
    flyer.style.height = `${startSize}px`;

    flyer
      .animate(
        [
          { transform: "translate(0px, 0px) scale(1)", opacity: 1 },
          {
            transform: `translate(${0.52 * dx}px, ${0.48 * dy - 64}px) scale(0.82)`,
            opacity: 1,
          },
          {
            transform: `translate(${dx}px, ${dy}px) scale(${endSize / startSize})`,
            opacity: 0.92,
          },
        ],
        {
          duration: 680,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        },
      )
      .addEventListener("finish", () => {
        flyer.remove();
      });
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
}
