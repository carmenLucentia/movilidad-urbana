import { useNavigate } from "react-router-dom";
import { getAuthUser, logout } from "@/utils/storage";
import { LogOut } from "lucide-react";

const Header = () => {
  const navigate = useNavigate();
  const user = getAuthUser();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-card border-b border-border shrink-0">
      <span className="text-lg font-bold text-foreground tracking-tight">Movilidad Urbana</span>

      <nav className="hidden md:flex items-center gap-6">
        {["Mapa", "Rutas", "Zonas"].map((label) => (
          <span
            key={label}
            className="text-sm font-medium text-muted-foreground hover:text-accent cursor-pointer transition-colors duration-150"
          >
            {label}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Hola, <span className="font-medium text-foreground">{user}</span>
        </span>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive hover:opacity-80 transition-opacity duration-150"
        >
          <LogOut className="w-4 h-4" />
          Salir
        </button>
      </div>
    </header>
  );
};

export default Header;
