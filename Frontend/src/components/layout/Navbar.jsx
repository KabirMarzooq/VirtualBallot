import { LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../../context/AppContext";

export default function Navbar() {
  const { currentUser, setCurrentUser, resetBallotSession } = useApp();
  const navigate = useNavigate();

  const location = useLocation();

  // These pages have their own navigation — no top navbar needed
  const noNavbarRoutes = ["/", "/admin", "/observer", "/superadmin", "/vote"];
  const isNoNavbar = noNavbarRoutes.some(
    (route) => location.pathname === route
  );
  if (isNoNavbar) return null;

  const handleLogout = () => {
    setCurrentUser(null);
    resetBallotSession();
    navigate(`/vote/${slug}`);
  };

  return (
    <nav className="fixed top-0 w-full z-40 p-4">
      <div className="max-w-5xl mx-auto bg-white/70 backdrop-blur rounded-full px-6 py-3 flex justify-between items-center border border-white/50 shadow-sm">
        <div className="flex items-center gap-2 font-bold hover:opacity-80 transition-opacity">
          <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm">
            VB
          </div>
          <span className="text-slate-800">Virtual Ballot</span>
        </div>

        {currentUser && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 hidden sm:block">
              {currentUser.name}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
              title="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
