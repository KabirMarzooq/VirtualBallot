export default function PageShell({ children, className = "" }) {
  return (
    <main className={`pt-24 pb-10 px-4 min-h-screen ${className}`}>
      {children}
    </main>
  );
}
