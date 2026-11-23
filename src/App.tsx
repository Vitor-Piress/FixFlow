import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PwaUpdatePrompt } from "@/components/pwa/PwaUpdatePrompt";
import { FullPageLoader } from "@/components/ui/FullPageLoader";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { PublicOnlyRoute } from "@/features/auth/components/PublicOnlyRoute";
import { AuthProvider } from "@/features/auth/context/AuthProvider";
import { queryClient } from "@/lib/queryClient";

const LoginPage = lazy(() =>
  import("@/pages/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const QuotesPage = lazy(() =>
  import("@/pages/QuotesPage").then((module) => ({
    default: module.QuotesPage,
  })),
);
const QuoteDetailPage = lazy(() =>
  import("@/pages/QuoteDetailPage").then((module) => ({
    default: module.QuoteDetailPage,
  })),
);
const FinancePage = lazy(() =>
  import("@/pages/FinancePage").then((module) => ({
    default: module.FinancePage,
  })),
);
const ContractsPage = lazy(() =>
  import("@/pages/ContractsPage").then((module) => ({
    default: module.ContractsPage,
  })),
);
const CatalogPage = lazy(() =>
  import("@/pages/CatalogPage").then((module) => ({
    default: module.CatalogPage,
  })),
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<FullPageLoader />}>
            <Routes>
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route path="/" element={<Navigate to="/quotes" replace />} />
                  <Route path="/quotes" element={<QuotesPage />} />
                  <Route path="/quotes/:id" element={<QuoteDetailPage />} />
                  <Route path="/finance" element={<FinancePage />} />
                  <Route path="/contracts" element={<ContractsPage />} />
                  <Route path="/catalog" element={<CatalogPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/quotes" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>

        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast:
                "!border !border-neutral-200 !bg-white !text-neutral-950 !shadow-sm",
              description: "!text-neutral-600",
              actionButton:
                "!h-auto !min-h-11 !rounded-lg !bg-neutral-950 !px-3 !text-xs !font-medium !text-white hover:!bg-neutral-800 focus-visible:!outline-2 focus-visible:!outline-solid focus-visible:!outline-offset-2 focus-visible:!outline-neutral-950",
              cancelButton:
                "!h-auto !min-h-11 !rounded-lg !border !border-solid !border-neutral-500 !bg-white !px-3 !text-xs !font-medium !text-neutral-950 hover:!bg-neutral-50 focus-visible:!outline-2 focus-visible:!outline-solid focus-visible:!outline-offset-2 focus-visible:!outline-neutral-950",
            },
          }}
        />
        <PwaUpdatePrompt />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
