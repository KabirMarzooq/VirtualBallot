import { LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";

export default function Navbar() {
  const { currentUser, setCurrentUser, resetBallotSession } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const noNavbar =
    ["/", "/admin", "/observer", "/superadmin"].some((r) => location.pathname === r) ||
    location.pathname.startsWith("/vote/") ||
    location.pathname.startsWith("/org/");

  if (noNavbar) return null;

  const handleLogout = () => {
    setCurrentUser(null);
    resetBallotSession();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 w-full z-40 p-4">
      <div className="max-w-5xl mx-auto bg-slate-900/80 backdrop-blur rounded-full px-6 py-3 flex justify-between items-center border border-slate-800 shadow-lg shadow-black/20">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 font-bold hover:opacity-80 transition-opacity cursor-pointer"
          title="Go to Virtual Ballot home"
        >
          <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shadow-lg shadow-blue-600/30">
            VB
          </div>
          <span className="text-white text-sm">Virtual Ballot</span>
        </button>
        {currentUser && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 hidden sm:block">
              {currentUser.name || currentUser.email}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
