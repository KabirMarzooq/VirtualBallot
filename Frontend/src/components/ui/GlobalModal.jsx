import { useApp } from "../../context/AppContext";

export default function GlobalModal() {
  const { modal, setModal, closeModal } = useApp();
  if (!modal.isOpen) return null;

  const confirm = () => {
    const fn = modal.onConfirm;
    closeModal();
    if (fn) fn();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
        <h3 className="text-xl font-black text-slate-800 mb-2">
          {modal.title}
        </h3>
        <p className="text-slate-600 mb-6">{modal.message}</p>
        <div className="flex gap-3 justify-end">
          {modal.type !== "alert" && (
            <button
              onClick={closeModal}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={confirm}
            className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {modal.type === "alert" ? "OK" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
