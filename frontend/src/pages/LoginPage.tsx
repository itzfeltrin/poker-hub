import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiLoginSchema } from "@poker-hub/db";
import {
  Button,
  FormControl,
  Input,
  Lockup,
} from "@poker-hub/design-system";
import { useAuth } from "@/contexts/AuthContext";

const formSchema = ApiLoginSchema;
type FormData = z.infer<typeof formSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: { password: "" },
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await login(data.password);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message === "Authentication is not configured"
          ? "Autenticação não configurada no servidor."
          : "Senha incorreta.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-felt flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo_transparent.png" alt="Poker Hub" className="h-16" />
          <Lockup className="text-center">
            <Lockup.Title className="text-gradient-gold">Poker Hub</Lockup.Title>
            <Lockup.Subtitle>Digite a senha para entrar.</Lockup.Subtitle>
          </Lockup>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormControl label="Senha" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              className="bg-card"
              {...register("password")}
            />
          </FormControl>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
