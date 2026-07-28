import { useEffect, useRef } from "react";
import "../../styles/page-background.css";

/**
 * The product-wide background system. Every variant carries the dot grid
 * established on the registration screen; what sits on top of it varies:
 *
 *   auth       white field, centre glow, signal rings   (voter/staff auth)
 *   auth-dark  the same, re-tuned for the Commission portals
 *   aurora     drifting blobs, signal rings, click ripple, pointer parallax
 *   spotlight  pointer spotlight + grid reveal — quietest, for app shells
 *   ribbon     fixed corner washes, diagonal seam, drifting motes
 *
 * Decorative layers are fixed and pointer-transparent; children render above
 * them and scroll normally.
 */
export default function PageBackground({
  variant = "auth",
  className = "",
  contentClassName = "",
  children,
}) {
  const rootRef = useRef(null);
  const bgRef = useRef(null);

  const hasRings = variant === "auth" || variant === "auth-dark" || variant === "aurora";
  const isAuth = variant === "auth" || variant === "auth-dark";

  useEffect(() => {
    const root = rootRef.current;
    const bg = bgRef.current;
    if (!root || !bg) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const cleanups = [];

    // ── Pointer parallax + click ripple (aurora) ──
    if (variant === "aurora") {
      const blobs = bg.querySelectorAll(".vb-blob");
      let queued = false;
      const onMove = (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          blobs.forEach((b, i) => {
            const depth = [14, 10, 6][i] ?? 8; // back layers move least
            b.style.transform = `translate(${-nx * depth}px, ${-ny * depth}px)`;
          });
          queued = false;
        });
      };
      const onDown = (e) => {
        const s = document.createElement("span");
        s.className = "vb-ripple";
        s.style.left = `${e.clientX}px`;
        s.style.top = `${e.clientY}px`;
        bg.appendChild(s);
        s.addEventListener("animationend", () => s.remove());
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      cleanups.push(() => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
      });
    }

    // ── Spotlight + grid reveal (app shells) ──
    if (variant === "spotlight") {
      let queued = false;
      const onMove = (e) => {
        root.classList.add("is-pointer");
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          bg.style.setProperty("--mx", `${e.clientX}px`);
          bg.style.setProperty("--my", `${e.clientY}px`);
          queued = false;
        });
      };
      const onLeave = () => root.classList.remove("is-pointer");
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerleave", onLeave);
      });
    }

    // ── Drifting motes (long content pages) ──
    if (variant === "ribbon") {
      const motes = [];
      for (let i = 0; i < 18; i += 1) {
        const m = document.createElement("span");
        const size = 2 + Math.random() * 3;
        m.className = "vb-mote";
        m.style.cssText =
          `width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;` +
          `left:${(Math.random() * 100).toFixed(1)}%;` +
          `top:${(70 + Math.random() * 45).toFixed(1)}%;` +
          `--drift:${(Math.random() * 60 - 30).toFixed(0)}px;` +
          `animation-duration:${(14 + Math.random() * 12).toFixed(1)}s;` +
          `animation-delay:${(-Math.random() * 26).toFixed(1)}s`;
        bg.appendChild(m);
        motes.push(m);
      }
      cleanups.push(() => motes.forEach((m) => m.remove()));
    }

    return () => cleanups.forEach((fn) => fn());
  }, [variant]);

  return (
    <div ref={rootRef} className={`vb-page vb-page--${variant} ${className}`}>
      <div ref={bgRef} className="vb-page-bg vb-dots" aria-hidden="true">
        {isAuth && <span className="vb-glow" />}

        {variant === "aurora" && (
          <>
            <span className="vb-blob vb-blob-1" />
            <span className="vb-blob vb-blob-2" />
            <span className="vb-blob vb-blob-3" />
          </>
        )}

        {variant === "spotlight" && (
          <>
            <span className="vb-grid-hot" />
            <span className="vb-spotlight" />
          </>
        )}

        {variant === "ribbon" && (
          <>
            <span className="vb-wash-tr" />
            <span className="vb-wash-bl" />
            <span className="vb-seam" />
          </>
        )}

        {hasRings && (
          <div className="vb-rings">
            <div className="vb-emitter vb-emitter-1">
              <span className="vb-ring" />
              <span className="vb-ring" />
            </div>
            <div className="vb-emitter vb-emitter-2">
              <span className="vb-ring" />
              <span className="vb-ring" />
            </div>
          </div>
        )}
      </div>

      <div className={`vb-page-content ${contentClassName}`}>{children}</div>
    </div>
  );
}
