"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  signInPatient,
  verifyPatientCode,
} from "@/lib/actions/patient.actions";
import { UserFormValidation } from "@/lib/validation";

import "react-phone-number-input/style.css";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import SubmitButton from "../SubmitButton";

export const PatientForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  // Set when the email belongs to an existing account that must confirm a code
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const form = useForm<z.infer<typeof UserFormValidation>>({
    resolver: zodResolver(UserFormValidation),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof UserFormValidation>) => {
    setIsLoading(true);
    setError("");

    const result = await signInPatient({
      name: values.name,
      email: values.email,
      phone: values.phone,
    });

    if (result.status === "signed-in") {
      router.push(`/patients/${result.userId}/register`);
      return;
    }

    if (result.status === "verify") setPendingUserId(result.userId);
    else setError(result.error);
    setIsLoading(false);
  };

  // onComplete passes the full code before the state update lands
  const onVerify = async (value = code) => {
    if (!pendingUserId) return;
    setIsLoading(true);
    setError("");

    const result = await verifyPatientCode(pendingUserId, value);

    if (result.ok) {
      // The register page forwards already-registered patients to booking
      router.push(`/patients/${pendingUserId}/register`);
      return;
    }

    setError(result.error);
    setCode("");
    setIsLoading(false);
  };

  if (pendingUserId) {
    return (
      <section className="flex-1 space-y-6">
        <div className="mb-12 space-y-4">
          <h1 className="header">Welcome back 👋</h1>
          <p className="text-dark-700">
            We emailed a 6-digit code to {form.getValues("email")}. Enter it to
            continue.
          </p>
        </div>

        <InputOTP
          maxLength={6}
          value={code}
          onChange={setCode}
          onComplete={(value: string) => onVerify(value)}
        >
          <InputOTPGroup className="shad-otp">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot key={index} className="shad-otp-slot" index={index} />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {error && (
          <p className="shad-error text-14-regular" role="alert">
            {error}
          </p>
        )}

        <Button
          className="shad-primary-btn w-full"
          disabled={code.length < 6 || isLoading}
          onClick={() => onVerify()}
        >
          {isLoading ? "Checking..." : "Continue"}
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            setPendingUserId(null);
            setCode("");
            setError("");
          }}
        >
          Use a different email
        </Button>
      </section>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-6">
        <section className="mb-12 space-y-4">
          <h1 className="header">Hi there 👋</h1>
          <p className="text-dark-700">Get started with appointments.</p>
        </section>

        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="name"
          label="Full name"
          placeholder="John Doe"
          iconSrc="/assets/icons/user.svg"
          iconAlt="user"
        />

        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="email"
          label="Email"
          placeholder="johndoe@gmail.com"
          iconSrc="/assets/icons/email.svg"
          iconAlt="email"
        />

        <CustomFormField
          fieldType={FormFieldType.PHONE_INPUT}
          control={form.control}
          name="phone"
          label="Phone number"
          placeholder="(555) 123-4567"
        />

        {error && (
          <p className="shad-error text-14-regular" role="alert">
            {error}
          </p>
        )}

        <SubmitButton isLoading={isLoading}>Get Started</SubmitButton>
      </form>
    </Form>
  );
};
