import { useState } from "react";
import { Palette, Image, CheckCircle, Eye, X } from "lucide-react";
import { useApp } from "../../context/AppContext";

export default function BrandingTab() {
  const { branding, setBranding, addLog } = useApp();
  const [form, setForm]   = useState({ ...branding });
  const [saved, setSaved] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(branding);

  const handleSave = () => {
    setBranding(form);
    addLog(`Election branding updated — "${form.electionName || "unnamed"}"`, "admin");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, logoUrl: ev.target.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Election Identity
        </p>

        <div>
          <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
            Election Name
          </label>
          <input
            value={form.electionName}
            onChange={(e) => setForm((f) => ({ ...f, electionName: e.target.value }))}
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 placeholder:text-slate-600 transition-colors"
            placeholder={`e.g. ${branding.institutionName ? branding.institutionName.split(" ").slice(-1)[0] : "SRC"} General Elections ${new Date().getFullYear()}`}
          />
          <p className="text-xs text-slate-600 mt-1">Appears on the login page, ballot, and results.</p>
        </div>

        <div>
          <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
            Institution / Organisation Name
          </label>
          <input
            value={form.institutionName}
            onChange={(e) => setForm((f) => ({ ...f, institutionName: e.target.value }))}
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 placeholder:text-slate-600 transition-colors"
            placeholder="e.g. University of Nigeria, Nsukka"
          />
          <p className="text-xs text-slate-600 mt-1">Shown as a small eyebrow label above the election name.</p>
        </div>

        <div>
          <label className="text-xs text-slate-500 uppercase font-bold block mb-1.5">
            Organization Logo
          </label>
          <div className="flex gap-3 items-center">
            <label className="flex-1 flex items-center gap-3 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 hover:border-blue-500 transition-colors cursor-pointer">
              <Image className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-sm text-slate-400 truncate">
                {form.logoUrl ? "Logo uploaded ✓" : "Click to upload logo image…"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </label>

            {form.logoUrl && (
              <>
                <div className="w-14 h-14 rounded-xl border-2 border-slate-600 overflow-hidden shrink-0 bg-slate-900">
                  <img src={form.logoUrl} alt="logo preview" className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={() => setForm((f) => ({ ...f, logoUrl: "" }))}
                  title="Remove logo"
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer border border-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Upload a square image (PNG, JPG, or SVG). Replaces the "VB" initials on the login page.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={!dirty && !saved}
          title={dirty ? "Apply branding changes" : "No unsaved changes"}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            saved
              ? "bg-green-600 text-white"
              : dirty
              ? "bg-blue-600 hover:bg-blue-500 text-white"
              : "bg-slate-700 text-slate-500 cursor-not-allowed"
          }`}
        >
          {saved ? (
            <><CheckCircle className="w-4 h-4" /> Saved!</>
          ) : (
            <><Palette className="w-4 h-4" /> Apply Branding</>
          )}
        </button>
      </div>

      {/* Live preview — dark card matching the actual voter login page */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-700 flex items-center gap-2">
          <Eye className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Login Page Preview</span>
          {dirty && (
            <span className="text-[10px] text-amber-400 font-bold px-2 py-0.5 bg-amber-900/30 rounded-full border border-amber-700/40">
              Unsaved
            </span>
          )}
        </div>
        <div className="p-8 flex justify-center bg-slate-950/50">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 w-64 text-center shadow-2xl">
            {form.logoUrl ? (
              <img
                src={form.logoUrl}
                alt="logo"
                className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 shadow-md border-4 border-slate-800"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                <span className="text-2xl font-black text-white">
                  {form.institutionName ? form.institutionName.slice(0, 2).toUpperCase() : "VB"}
                </span>
              </div>
            )}
            {form.institutionName && (
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">
                {form.institutionName}
              </p>
            )}
            <p className="font-black text-white text-lg leading-tight">
              {form.electionName || "Virtual Ballot"}
            </p>
            <p className="text-slate-500 text-xs mt-1">Your voice matters.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
