import "../../styles/auth-background.css";

/**
 * Approved background for auth pages (voter login, activation, OTP, and the
 * staff portals): white field with a blue dot grid, soft center glow, and
 * three expanding rings. Centers its children; children provide their own
 * max-width card. `variant="dark"` re-tunes the same pattern for the dark
 * Commission portals.
 */
export default function AuthBackground({ variant, children }) {
  return (
    <div className={`auth-page${variant === "dark" ? " auth-page--dark" : ""}`}>
      <div className="auth-page-bg" aria-hidden="true">
        <span className="auth-ring auth-ring-1" />
        <span className="auth-ring auth-ring-2" />
        <span className="auth-ring auth-ring-3" />
      </div>
      <div className="auth-page-content">{children}</div>
    </div>
  );
}
