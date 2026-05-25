import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { CookiesProvider } from "react-cookie";
import CookieConsent from "react-cookie-consent";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <CookiesProvider defaultSetOptions={{ path: '/' }}>
        <Provider store={store}>
          <ThemeProvider
            defaultTheme="dark"
            // switchable
          >
            <TooltipProvider>
              <Toaster />
              <Router />
              <CookieConsent
                location="bottom"
                buttonText="Accept All"
                declineButtonText="Decline"
                enableDeclineButton
                cookieName="pandemic_visualizer_consent"
                style={{
                  background: "rgba(15, 23, 42, 0.95)",
                  backdropFilter: "blur(12px)",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 -10px 30px -10px rgba(0, 0, 0, 0.5)",
                  padding: "16px 24px",
                  alignItems: "center",
                  fontSize: "14px",
                  color: "#cbd5e1"
                }}
                buttonStyle={{
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "600",
                  borderRadius: "6px",
                  padding: "8px 18px",
                  margin: "0 8px",
                  transition: "background 0.2s"
                }}
                declineButtonStyle={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#94a3b8",
                  fontSize: "13px",
                  fontWeight: "500",
                  borderRadius: "6px",
                  padding: "8px 18px",
                  margin: "0 8px",
                  transition: "all 0.2s"
                }}
                expires={150}
              >
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-lg">🛡️</span>
                  <span>
                    We use cookies to store your selected pandemic, view modes, metrics, and visualization preferences. By continuing, you agree to our cookie policy.
                  </span>
                </div>
              </CookieConsent>
            </TooltipProvider>
          </ThemeProvider>
        </Provider>
      </CookiesProvider>
    </ErrorBoundary>
  );
}

export default App;
