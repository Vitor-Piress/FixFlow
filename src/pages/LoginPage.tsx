import { useState } from "react";
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
      toast.success("Sessão iniciada.");
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível entrar agora.";
      setAuthError(message);
      toast.error(message);
    }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col justify-center bg-neutral-50 px-5 py-10">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="mb-8 flex flex-col gap-2">
          <BrandLogo size="md" showWordmark className="text-neutral-950" />
          <p className="text-sm text-neutral-500">
            Gestão de orçamentos, contratos e caixa.
          </p>
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
            placeholder="••••••"
            error={errors.password?.message}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-neutral-950"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
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
    </div>
  );
}
