import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { shadcn } from '@clerk/themes';
import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import PartsPage from "@/pages/parts";
import PartFormPage from "@/pages/part-form";
import CategoriesPage from "@/pages/categories";
import StockMovementsPage from "@/pages/stock-movements";
import ExpensesPage from "@/pages/expenses";
import ReportsPage from "@/pages/reports";
import ReportsMonthlyPage from "@/pages/reports-monthly";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#3B82F6",
    colorForeground: "#e2e8f0",
    colorMutedForeground: "#64748b",
    colorDanger: "#ef4444",
    colorBackground: "#0d1117",
    colorInput: "#1e2a3a",
    colorInputForeground: "#e2e8f0",
    colorNeutral: "#334155",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0f172a] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#1e293b]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-100 font-bold",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButtonText: "text-slate-200",
    formFieldLabel: "text-slate-300",
    footerActionLink: "text-blue-400 hover:text-blue-300",
    footerActionText: "text-slate-400",
    dividerText: "text-slate-500",
    identityPreviewEditButton: "text-blue-400",
    formFieldSuccessText: "text-green-400",
    alertText: "text-slate-200",
    logoBox: "flex justify-center py-2",
    logoImage: "h-10",
    socialButtonsBlockButton: "border-[#1e293b] bg-[#1e2a3a] hover:bg-[#243447]",
    formButtonPrimary: "bg-blue-600 hover:bg-blue-500 text-white",
    formFieldInput: "bg-[#1e2a3a] border-[#334155] text-slate-100",
    footerAction: "border-t border-[#1e293b]",
    dividerLine: "bg-[#1e293b]",
    alert: "bg-[#1e2a3a]",
    otpCodeFieldInput: "bg-[#1e2a3a] border-[#334155] text-slate-100",
    formFieldRow: "gap-2",
    main: "gap-4",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-8">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-8">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <LandingPage />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/" />;
  return <Component />;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to: string) => setLocation(stripBase(to))}
      routerReplace={(to: string) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            <Route path="/dashboard"><ProtectedRoute component={DashboardPage} /></Route>
            <Route path="/parts"><ProtectedRoute component={PartsPage} /></Route>
            <Route path="/parts/new"><ProtectedRoute component={PartFormPage} /></Route>
            <Route path="/parts/:id"><ProtectedRoute component={PartFormPage} /></Route>
            <Route path="/categories"><ProtectedRoute component={CategoriesPage} /></Route>
            <Route path="/stock-movements"><ProtectedRoute component={StockMovementsPage} /></Route>
            <Route path="/expenses"><ProtectedRoute component={ExpensesPage} /></Route>
            <Route path="/reports"><ProtectedRoute component={ReportsPage} /></Route>
            <Route path="/reports/monthly"><ProtectedRoute component={ReportsMonthlyPage} /></Route>
            <Route path="/settings"><ProtectedRoute component={SettingsPage} /></Route>
            
            {/* Fallback */}
            <Route>
              <div className="flex items-center justify-center h-screen bg-background text-foreground">
                <p className="text-muted-foreground">Page not found.</p>
              </div>
            </Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;