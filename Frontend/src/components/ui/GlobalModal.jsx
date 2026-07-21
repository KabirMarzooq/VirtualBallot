import { useEffect } from "react";
import { useApp } from "../../context/AppContext";

export default function GlobalModal() {
  const { modal, closeModal } = useApp();

  // Escape closes — always the safe path (cancels a confirm, dismisses an alert)
  useEffect(() => {
    if (!modal.isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal.isOpen, closeModal]);

  if (!modal.isOpen) return null;

  const confirm = () => {
    const fn = modal.onConfirm;
    closeModal();
    if (fn) fn();
  };

  const danger = modal.tone === "danger";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 vb-fade"
      onClick={closeModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={modal.title}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl shadow-[0_20px_40px_-12px_rgb(0_0_0/0.25)] p-6 max-w-[380px] w-full vb-modal-pop"
      >
        <h3 className="text-base leading-6 font-semibold text-slate-900">
          {modal.title}
        </h3>
        <p className="text-[13px] leading-5 text-slate-600 mt-2">
          {modal.message}
        </p>
        <div className="flex gap-2 justify-end mt-5">
          {modal.type !== "alert" && (
            <button
              onClick={closeModal}
              title="Close without doing anything"
              className="min-h-[44px] px-4 rounded-lg font-semibold text-[13px] text-slate-600 bg-white border border-slate-300 hover:border-slate-400 hover:text-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            onClick={confirm}
            autoFocus
            title={modal.type === "alert" ? "Dismiss" : "Proceed"}
            className={`min-h-[44px] px-[18px] rounded-lg font-semibold text-[13px] text-white shadow-sm transition-all cursor-pointer ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {modal.type === "alert" ? "OK" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
