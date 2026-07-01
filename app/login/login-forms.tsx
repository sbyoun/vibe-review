"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, LogIn, Mail, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  changeCurrentUserPassword,
  loginWithPassword,
  requestPasswordReset,
  registerWithPassword,
  resetPasswordWithToken,
  type AuthFormState,
} from "@/server/auth-actions";

const inputClass =
  "w-full border border-border bg-card px-3 py-2 text-sm leading-5 text-foreground outline-none transition-colors focus:border-primary focus:ring-0";
const labelClass = "block text-xs leading-4 text-muted-foreground";

const emptyState: AuthFormState = {
  status: "idle",
  message: null,
};

type LoginFormsProps = {
  credentialsError: boolean;
  notice?: string;
};

export function LoginForm({ credentialsError, notice }: LoginFormsProps) {
  const loginInitialState: AuthFormState = credentialsError
    ? {
        status: "error",
        message: "Invalid handle/email or password.",
      }
    : notice
      ? {
          status: "success",
          message: notice,
        }
      : emptyState;
  const [loginState, loginAction] = useActionState(loginWithPassword, loginInitialState);

  return (
    <form action={loginAction} className="border border-border bg-card p-6">
      <div className="flex flex-col gap-4">
        <FormMessage state={loginState} />
        <DevActionLink href={loginState.verificationUrl} label="Verify email" />

      <label className="grid gap-1">
        <span className={labelClass}>Handle or Email</span>
        <input
          className={inputClass}
          name="handle"
          placeholder="aya or you@example.com"
          required
          autoComplete="username"
          defaultValue={loginState.fields?.handle ?? ""}
        />
      </label>

      <label className="grid gap-1">
        <span className={labelClass}>Password</span>
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
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs leading-4">
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Forgot password?
        </Link>
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create account
        </Link>
      </div>
    </form>
  );
}

export function SignupForm() {
  const [registerState, registerAction] = useActionState(registerWithPassword, emptyState);

  return (
    <form
      action={registerAction}
      className="border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-4">
        <FormMessage state={registerState} />
        <DevActionLink href={registerState.verificationUrl} label="Verify email" />

      <label className="grid gap-1">
        <span className={labelClass}>Email</span>
        <input
          className={inputClass}
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          defaultValue={registerState.fields?.email ?? ""}
        />
      </label>

      <label className="grid gap-1">
        <span className={labelClass}>Username</span>
        <input
          className={inputClass}
          name="handle"
          placeholder="your-handle"
          required
          autoComplete="username"
          defaultValue={registerState.fields?.handle ?? ""}
        />
      </label>

      <label className="grid gap-1">
        <span className={labelClass}>Name</span>
        <input
          className={inputClass}
          name="name"
          placeholder="Your name"
          autoComplete="name"
          defaultValue={registerState.fields?.name ?? ""}
        />
      </label>

      <label className="grid gap-1">
        <span className={labelClass}>Password</span>
        <input
          className={inputClass}
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>

      <label className="grid gap-1">
        <span className={labelClass}>Confirm password</span>
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
      </div>

      <p className="mt-4 text-center text-xs leading-4 text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [resetState, resetAction] = useActionState(requestPasswordReset, emptyState);

  return (
    <form action={resetAction} className="flex flex-col gap-4">
      <FormMessage state={resetState} />

      <label className="grid gap-1">
        <span className="text-xs leading-4 text-foreground">Email Address</span>
        <input
          className={inputClass}
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          defaultValue={resetState.fields?.email ?? ""}
        />
      </label>

      <AuthSubmitButton intent="requestReset" />

      {resetState.resetUrl ? (
        <DevActionLink href={resetState.resetUrl} label="Reset password" />
      ) : null}

      <Link href="/login" className="w-full py-2 text-center text-xs font-medium leading-4 text-primary hover:underline">
        Return to Login
      </Link>
    </form>
  );
}

export function ResetPasswordForm({
  resetId,
  token,
}: {
  resetId: string;
  token: string;
}) {
  const [resetState, resetAction] = useActionState(resetPasswordWithToken, emptyState);

  return (
    <form action={resetAction} className="border border-border bg-card p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">New password</h2>
        </div>

      <FormMessage state={resetState} />

      <input type="hidden" name="resetId" value={resetId} />
      <input type="hidden" name="token" value={token} />

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

        <AuthSubmitButton intent="resetPassword" />
      </div>

      {resetState.status === "success" ? (
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Log in
        </Link>
      ) : null}
    </form>
  );
}

export function ChangePasswordForm() {
  const [changeState, changeAction] = useActionState(changeCurrentUserPassword, emptyState);

  return (
    <form action={changeAction} className="border border-border bg-card p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Change password</h2>
        </div>

      <FormMessage state={changeState} />

      <label className="grid gap-1.5">
        <span className="text-sm font-medium">Current password</span>
        <input
          className={inputClass}
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
        />
      </label>

      <label className="grid gap-1.5">
        <span className="text-sm font-medium">New password</span>
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
        <span className="text-sm font-medium">Confirm new password</span>
        <input
          className={inputClass}
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>

        <AuthSubmitButton intent="changePassword" />
      </div>
    </form>
  );
}

function FormMessage({ state }: { state: AuthFormState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  const className =
    state.status === "success"
      ? "rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
      : "rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive";

  return (
    <p role="alert" aria-live="polite" className={className}>
      {state.message}
    </p>
  );
}

function DevActionLink({ href, label }: { href?: string; label: string }) {
  if (!href) {
    return null;
  }

  return (
    <Button type="button" variant="outline" asChild>
      <a href={href}>
        <KeyRound className="size-4" aria-hidden="true" />
        {label}
      </a>
    </Button>
  );
}

function AuthSubmitButton({
  intent,
}: {
  intent: "login" | "register" | "requestReset" | "resetPassword" | "changePassword";
}) {
  const { pending } = useFormStatus();

  const button = {
    login: { icon: LogIn, label: "Log in", pendingLabel: "Logging in", variant: "default" },
    register: {
      icon: UserPlus,
      label: "Create account",
      pendingLabel: "Creating account",
      variant: "default",
    },
    requestReset: {
      icon: Mail,
      label: "Send reset link",
      pendingLabel: "Sending",
      variant: "default",
    },
    resetPassword: {
      icon: KeyRound,
      label: "Change password",
      pendingLabel: "Changing password",
      variant: "default",
    },
    changePassword: {
      icon: KeyRound,
      label: "Change password",
      pendingLabel: "Changing password",
      variant: "default",
    },
  }[intent];
  const Icon = button.icon;

  return (
    <Button type="submit" variant={button.variant as "default"} disabled={pending} className="w-full">
      <Icon className="size-4" aria-hidden="true" />
      {pending ? button.pendingLabel : button.label}
    </Button>
  );
}
