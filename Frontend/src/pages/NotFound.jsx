import { Link, useLocation } from "react-router-dom";

export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 select-none">
        <span className="text-8xl font-extrabold text-blue-500 tracking-tight leading-none">
          404
        </span>
      </div>

      <h1 className="text-2xl font-semibold text-white mb-2">
        Page not found
      </h1>

      <p className="text-slate-400 text-sm mb-1 max-w-sm">
        The URL{" "}
        <code className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-xs font-mono">
          {pathname}
        </code>{" "}
        doesn&apos;t exist on this platform.
      </p>
      <p className="text-slate-500 text-sm mb-8 max-w-sm">
        If you&apos;re looking for your organisation&apos;s ballot, use the
        link sent to you or contact your election administrator.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/"
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Go to homepage
        </Link>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-sm font-medium rounded-lg transition-colors"
        >
          Go back
        </button>
      </div>

      <p className="mt-12 text-xs text-slate-600">VirtualBallot</p>
    </div>
  );
}
