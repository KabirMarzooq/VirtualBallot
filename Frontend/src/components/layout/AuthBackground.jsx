import PageBackground from "./PageBackground";

/**
 * Auth-page background: white field with a blue dot grid, soft centre glow,
 * and the signal rings. `variant="dark"` re-tunes the same pattern for the
 * dark Commission portals.
 *
 * Thin wrapper over the product-wide system in PageBackground — kept so the
 * auth screens keep their existing call signature.
 */
export default function AuthBackground({ variant, children }) {
  return (
    <PageBackground variant={variant === "dark" ? "auth-dark" : "auth"}>
      {children}
    </PageBackground>
  );
}
