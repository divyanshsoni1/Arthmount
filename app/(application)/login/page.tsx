"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { AuthLayout } from "@/components/auth-layout";
import { LoginFormValues, loginSchema, useLogin } from "@/api-client/auth";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
    mode: "onTouched",
  });

  const { mutateAsync, isPending } = useLogin(
    form.setError,
    (data) => {
      sessionStorage.setItem("otp_token",       data.otpToken);
      sessionStorage.setItem("otp_channel",     data.channel);
      sessionStorage.setItem("otp_destination", data.maskedDestination);
      router.push("/login/otp");
    }
  );

  return (
    <AuthLayout>
      {/* Back to home */}
      <Link
        href="/"
        className="absolute top-6 left-6 lg:top-12 lg:left-12 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
        aria-label="Back to home"
      >
        <ArrowLeft className="text-gray-600" size={20} />
      </Link>

      <div className="max-w-md w-full mx-auto relative z-10">
        <div className="space-y-2 mb-8 text-center lg:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome back
          </h1>
          <p className="text-gray-500 font-medium">
            Please enter your details to sign in.
          </p>
        </div>

        <form onSubmit={form.handleSubmit((v) => mutateAsync(v))} noValidate>
          <FieldGroup>

            {/* Identifier */}
            <Controller
              name="identifier"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                  <FieldLabel htmlFor="identifier">
                    Email or phone number
                  </FieldLabel>
                  <Input
                    {...field}
                    id="identifier"
                    type="text"
                    inputMode="email"
                    placeholder="Enter your email or phone number"
                    autoComplete="username"
                    aria-invalid={fieldState.invalid}
                    disabled={isPending}
                  />
                  {fieldState.error?.message?.trim() && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Password */}
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      {...field}
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      aria-invalid={fieldState.invalid}
                      disabled={isPending}
                      className="pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {fieldState.error?.message?.trim() && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            {/* Submit */}
            <Button type="submit" className="w-full mt-2" disabled={isPending}>
              {isPending
                ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                : "Log In"
              }
            </Button>

          </FieldGroup>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
