import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/loginSchema";

interface LocationState {
  from?: {
    pathname?: string;
    search?: string;
  };
}

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Entrar | FixFlow";
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const state = location.state as LocationState | null;
  const redirectTarget =
    state?.from?.pathname && state.from.pathname !== "/login"
      ? `${state.from.pathname}${state.from.search ?? ""}`
      : "/quotes";

  async function onSubmit(values: LoginFormValues) {
    setAuthError(null);

    try {
      await signIn(values);
      toast.success("Sessão iniciada");
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível entrar agora.";
      setAuthError(message);
    }
  }

  return (
    <main className="flex min-h-dvh w-full flex-col justify-center bg-zinc-100 px-4 py-8 sm:bg-zinc-200 sm:px-5 sm:py-10">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="mb-7 flex flex-col gap-5 border-b border-zinc-200 pb-6">
          <BrandLogo size="md" showWordmark className="text-zinc-950" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
              Acessar painel
            </h1>
            <p className="text-sm text-neutral-600">
              Orçamentos, contratos mensais e caixa em campo
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <Input
            label="E-mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="seu@email.com"
            error={errors.email?.message}
            {...register("email")}
          />

          <Input
            label="Senha"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Sua senha"
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                )}
              </button>
            }
            {...register("password")}
          />

          {authError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>{authError}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            isLoading={isSubmitting}
            className="mt-2 w-full"
          >
            Entrar
          </Button>
        </form>
      </div>
    </main>
  );
}
