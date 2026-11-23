import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { PublicOnlyRoute } from "@/features/auth/components/PublicOnlyRoute";
import { AuthProvider } from "@/features/auth/context/AuthProvider";
import { queryClient } from "@/lib/queryClient";
import { CatalogPage } from "@/pages/CatalogPage";
import { ContractsPage } from "@/pages/ContractsPage";
import { FinancePage } from "@/pages/FinancePage";
import { LoginPage } from "@/pages/LoginPage";
import { QuoteDetailPage } from "@/pages/QuoteDetailPage";
import { QuotesPage } from "@/pages/QuotesPage";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
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
        </BrowserRouter>

        <Toaster
          position="top-center"
          toastOptions={{
            className:
              "!border !border-neutral-200 !bg-white !text-neutral-950 !shadow-sm",
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
