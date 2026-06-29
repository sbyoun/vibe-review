"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  loginWithPassword,
  registerWithPassword,
  type AuthFormState,
} from "@/server/auth-actions";

const inputClass =
  "min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const emptyState: AuthFormState = {
  status: "idle",
  message: null,
};

type LoginFormsProps = {
  credentialsError: boolean;
};

export function LoginForms({ credentialsError }: LoginFormsProps) {
  const loginInitialState: AuthFormState = credentialsError
    ? {
        status: "error",
        message: "Invalid handle or password.",
      }
    : emptyState;
  const [loginState, loginAction] = useActionState(loginWithPassword, loginInitialState);
  const [registerState, registerAction] = useActionState(registerWithPassword, emptyState);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        action={loginAction}
        className="grid gap-4 rounded-md border border-border bg-card p-6"
      >
        <div className="flex items-center gap-2">
          <LogIn className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Log in</h2>
        </div>

        <FormError state={loginState} />

        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Handle</span>
          <input
            className={inputClass}
            name="handle"
            placeholder="aya"
            required
            autoComplete="username"
            defaultValue={loginState.fields?.handle ?? ""}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Password</span>
          <input
            className={inputClass}
            name="password"
            type="password"
            placeholder="password123"
            required
            autoComplete="current-password"
          />
        </label>

        <AuthSubmitButton intent="login" />
      </form>

      <form
        action={registerAction}
        className="grid gap-4 rounded-md border border-border bg-card p-6"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Create account</h2>
        </div>

        <FormError state={registerState} />

        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Handle</span>
          <input
            className={inputClass}
            name="handle"
            placeholder="your-handle"
            required
            autoComplete="username"
            defaultValue={registerState.fields?.handle ?? ""}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Name</span>
          <input
            className={inputClass}
            name="name"
            placeholder="Your name"
            autoComplete="name"
            defaultValue={registerState.fields?.name ?? ""}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Password</span>
          <input
            className={inputClass}
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Confirm password</span>
          <input
            className={inputClass}
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        <AuthSubmitButton intent="register" />
      </form>
    </div>
  );
}

function FormError({ state }: { state: AuthFormState }) {
  if (state.status !== "error" || !state.message) {
    return null;
  }

  return (
    <p
      role="alert"
      aria-live="polite"
      className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
    >
      {state.message}
    </p>
  );
}

function AuthSubmitButton({ intent }: { intent: "login" | "register" }) {
  const { pending } = useFormStatus();
  const isLogin = intent === "login";
  const Icon = isLogin ? LogIn : UserPlus;
  const label = isLogin ? "Log in" : "Create account";
  const pendingLabel = isLogin ? "Logging in" : "Creating account";

  return (
    <Button type="submit" variant={isLogin ? "default" : "outline"} disabled={pending}>
      <Icon className="size-4" aria-hidden="true" />
      {pending ? pendingLabel : label}
    </Button>
  );
}
