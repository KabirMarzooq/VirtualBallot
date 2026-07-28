import { Link, useLocation } from "react-router-dom";
import { Compass, ArrowLeft, ShieldAlert } from "lucide-react";
import AuthBackground from "../components/layout/AuthBackground";

export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <AuthBackground>
      <div className="w-full max-w-[420px] text-slate-800 py-6">
        <div className="bg-white border border-blue-200 rounded-2xl shadow-lg p-8 sm:px-7 text-center">
          {/* Crest */}
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto text-white">
            <Compass className="w-6 h-6" />
          </div>

          <p className="text-[11px] leading-4 font-semibold text-blue-600 uppercase tracking-[0.1em] mt-4">
            Error 404
          </p>
          <h1 className="text-[22px] leading-7 font-semibold text-slate-900 mt-1.5">
            Page not found
          </h1>
          <p className="text-[13px] leading-5 text-slate-600 mt-1">
            This address doesn&apos;t exist on the platform.
          </p>

          {/* Offending path */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 mt-5 text-left">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.1em]">
              Requested URL
            </p>
            <p className="font-mono text-xs text-slate-800 break-all mt-0.5">
              {pathname}
            </p>
          </div>

          <p className="text-[11px] leading-4 text-slate-400 mt-4">
            Looking for your organisation&apos;s ballot? Use the link sent to
            you, or contact your election administrator.
          </p>

          <Link
            to="/"
            title="Back to Virtual Ballot home"
            className="w-full mt-5 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            Go to homepage
          </Link>

          <button
            onClick={() => window.history.back()}
            title="Return to the previous page"
            className="w-full mt-2 min-h-[44px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-[13px] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Go back
          </button>
        </div>

        <div className="flex justify-center mt-1">
          <span className="min-h-[44px] px-3 text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3" /> Virtual Ballot
          </span>
        </div>
      </div>
    </AuthBackground>
  );
}
