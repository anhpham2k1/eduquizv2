import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Moon, Settings, Sun } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function RootLayout() {
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const hideMobileHeader = /^\/attempts\/[^/]+$/.test(location.pathname);

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  return (
    <div className={`min-h-screen bg-background text-foreground ${isDark ? "dark" : ""}`}>
      <header
        className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${hideMobileHeader ? "hidden md:block" : ""}`}
      >
        <div className="container mx-auto flex h-14 items-center px-4">
          <div className="mr-4 flex items-center gap-6">
            <Link to="/" className="flex items-center space-x-2">
              <span className="hidden font-bold sm:inline-block">EduQuiz</span>
            </Link>
            {user ? (
              <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
                <Link to="/dashboard" className="text-foreground/60 transition-colors hover:text-foreground/80">
                  Dashboard
                </Link>
                <Link to="/exams/new" className="text-foreground/60 transition-colors hover:text-foreground/80">
                  Tạo đề
                </Link>
              </nav>
            ) : null}
          </div>

          <div className="flex flex-1 items-center justify-end space-x-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">@{user.username}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings/account")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth/login">
                <Button variant="default" size="sm">
                  Đăng nhập
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
