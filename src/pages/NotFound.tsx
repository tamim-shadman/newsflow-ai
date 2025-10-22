import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { getCategoryTheme } from "@/lib/categoryThemes";

const NotFound = () => {
  const location = useLocation();
  const { theme } = useTheme();
  const accentTheme = getCategoryTheme("all");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      className={`relative flex min-h-screen items-center justify-center overflow-hidden ${accentTheme.bg} bg-black`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${accentTheme.accent} opacity-20`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_55%)]" />
      <div className="relative z-10 mx-auto max-w-xl px-6 text-center">
        <div
          className={`mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${accentTheme.accent} text-white shadow-2xl ${accentTheme.glow}`}
        >
          <Sparkles className="h-10 w-10" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
          Page Not Found
        </p>
        <h1 className="mt-4 text-4xl font-black text-white sm:text-5xl">
          Looks like we lost the signal
        </h1>
        <p className="mt-4 text-base text-white/70 sm:text-lg">
          The page you are looking for has drifted off our news radar. Double-check the URL or head back to the newsroom to continue exploring the latest stories.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className={`w-full sm:w-auto bg-gradient-to-r ${accentTheme.accent} text-white shadow-lg ${accentTheme.glow} hover:opacity-90`}>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to headlines
            </Link>
          </Button>
          <span className="text-xs text-white/50">
            Theme: {theme === "dark" ? "Night Mode" : "Day Mode"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
