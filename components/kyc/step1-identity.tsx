"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck } from "lucide-react";

import { Input }      from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  SectionHeading, NavRow,
  BTN_PRIMARY, BTN_OUTLINE,
} from "./kyc-shared";
import Link from "next/link";

// ─── Schema ───────────────────────────────────────────────────────────────────

const identitySchema = z.object({
  aadhaarNumber: z
    .string()
    .min(1, "Aadhaar number is required")
    .regex(/^\d{12}$/, "Aadhaar must be exactly 12 digits"),
  panNumber: z
    .string()
    .min(1, "PAN number is required")
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "PAN must match format ABCDE1234F"),
});

export type IdentityValues = z.infer<typeof identitySchema>;

// ─── Component ────────────────────────────────────────────────────────────────

interface Step1Props {
  defaultValues?: IdentityValues;
  onNext: (v: IdentityValues) => void;
}

export function Step1Identity({ defaultValues, onNext }: Step1Props) {
  const form = useForm<IdentityValues>({
    resolver:      zodResolver(identitySchema),
    defaultValues: defaultValues ?? { aadhaarNumber: "", panNumber: "" },
    mode:          "onChange",
  });

  const { isValid, errors } = form.formState;

  return (
    <div>
      <SectionHeading
        title="Identity Information"
        sub="Enter your Aadhaar and PAN exactly as they appear on your documents. Nothing is saved until you click Submit KYC at the final step."
        icon={ShieldCheck}
      />

      <form onSubmit={form.handleSubmit(onNext)} noValidate>
        <FieldGroup className="mb-6">

          {/* Aadhaar */}
          <Controller
            name="aadhaarNumber"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                <FieldLabel htmlFor="aadhaar" className="text-sm font-semibold text-slate-700">
                  Aadhaar Number
                  <span className="text-red-500 ml-0.5">*</span>
                </FieldLabel>
                <Input
                  {...field}
                  id="aadhaar"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="1234 5678 9012"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                  aria-describedby="aadhaar-hint"
                  className="font-mono tracking-widest text-base"
                  onChange={(e) =>
                    field.onChange(e.target.value.replace(/\D/g, "").slice(0, 12))
                  }
                />
                <p id="aadhaar-hint" className="text-xs text-slate-400 mt-1">
                  12-digit number printed on your Aadhaar card
                </p>
                {fieldState.error?.message && (
                  <FieldError errors={[fieldState.error]} />
                )}

                {/* Live length indicator */}
                {field.value.length > 0 && field.value.length < 12 && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    {12 - field.value.length} more digit{12 - field.value.length !== 1 ? "s" : ""} needed
                  </p>
                )}
                {field.value.length === 12 && !fieldState.error && (
                  <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Valid Aadhaar format
                  </p>
                )}
              </Field>
            )}
          />

          {/* PAN */}
          <Controller
            name="panNumber"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid ? "true" : undefined}>
                <FieldLabel htmlFor="pan" className="text-sm font-semibold text-slate-700">
                  PAN Number
                  <span className="text-red-500 ml-0.5">*</span>
                </FieldLabel>
                <Input
                  {...field}
                  id="pan"
                  placeholder="ABCDE1234F"
                  autoComplete="off"
                  maxLength={10}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="pan-hint"
                  className="font-mono tracking-widest uppercase text-base"
                  onChange={(e) =>
                    field.onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))
                  }
                />
                <p id="pan-hint" className="text-xs text-slate-400 mt-1">
                  Format: ABCDE1234F — 5 letters, 4 digits, 1 letter
                </p>
                {fieldState.error?.message && (
                  <FieldError errors={[fieldState.error]} />
                )}
                {field.value.length === 10 && !fieldState.error && (
                  <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Valid PAN format
                  </p>
                )}
              </Field>
            )}
          />
        </FieldGroup>

        {/* Privacy notice */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 mb-6 text-xs text-slate-500 leading-relaxed">
          🔒 Your data is encrypted and will only be used for KYC verification. 
          Documents are stored securely and never shared with third parties.
        </div>

        <NavRow>
          <Link href="/dashboard" className={`${BTN_OUTLINE} flex-1`}>
            Cancel
          </Link>
          <button type="submit" disabled={!isValid} className={`${BTN_PRIMARY} flex-1`}>
            Next — Upload Documents
          </button>
        </NavRow>
      </form>
    </div>
  );
}
