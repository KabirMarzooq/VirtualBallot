import "../../styles/auth-background.css";

/**
 * Approved background for auth pages (voter login, activation, OTP, and the
 * staff portals once rebuilt): white field with a blue dot grid, soft center
 * glow, and three expanding rings. Centers its children; children provide
 * their own max-width card.
 */
export default function AuthBackground({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-page-bg" aria-hidden="true">
        <span className="auth-ring auth-ring-1" />
        <span className="auth-ring auth-ring-2" />
        <span className="auth-ring auth-ring-3" />
      </div>
      <div className="auth-page-content">{children}</div>
    </div>
  );
}
