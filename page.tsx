"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

type Stage = "credentials" | "otp" | "signup" | "signup-done";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stage === "otp") otpInputRef.current?.focus();
  }, [stage]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ---------- stage 1: email + password ----------
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/check-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Incorrect email or password");
      return;
    }

    setStage("otp");
    setResendCooldown(30);
  }

  // ---------- stage 2: OTP code ----------
  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: otp }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Incorrect or expired code");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError("");
    const res = await fetch("/api/auth/check-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      setResendCooldown(30);
    } else {
      setError("Could not resend code — try signing in again");
    }
  }

  // ---------- sign up ----------
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStage("signup-done");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-bgcard border border-line rounded-xl2 p-7">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-income to-[#8284F5] flex items-center justify-center font-display font-bold text-sm text-white">
            ST
          </div>
          <div className="leading-tight">
            <div className="font-display text-[15px]">SendivTech</div>
            <div className="text-[11px] text-inkfaint tracking-wide">FINANCE LEDGER</div>
          </div>
        </div>

        {stage === "signup-done" && (
          <div className="text-sm text-inkdim leading-relaxed">
            Account created. Check your email to confirm it, then come back and sign in with your
            password — you'll also be asked for an email code every time you log in.
            <button
              className="mt-4 w-full bg-income text-white rounded-lg py-2.5 text-sm font-semibold"
              onClick={() => {
                setStage("credentials");
                setPassword("");
              }}
            >
              Back to sign in
            </button>
          </div>
        )}

        {stage === "credentials" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs text-inkdim font-semibold mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bgsoft border border-line rounded-md px-3 py-2.5 text-sm outline-none focus:border-income"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-inkdim font-semibold mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bgsoft border border-line rounded-md px-3 py-2.5 text-sm outline-none focus:border-income"
                placeholder="••••••••"
              />
            </div>

            {error && <div className="text-xs text-expense">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-income text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Checking…" : "Continue"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStage("signup");
                setError("");
              }}
              className="w-full text-center text-xs text-inkfaint hover:text-inkdim mt-1"
            >
              First time here? Create an account
            </button>
          </form>
        )}

        {stage === "signup" && (
          <form onSubmit={handleSignup} className="space-y-3.5">
            <div>
              <label className="block text-xs text-inkdim font-semibold mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bgsoft border border-line rounded-md px-3 py-2.5 text-sm outline-none focus:border-income"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-inkdim font-semibold mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bgsoft border border-line rounded-md px-3 py-2.5 text-sm outline-none focus:border-income"
                placeholder="At least 6 characters"
              />
            </div>

            {error && <div className="text-xs text-expense">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-income text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create account"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStage("credentials");
                setError("");
              }}
              className="w-full text-center text-xs text-inkfaint hover:text-inkdim mt-1"
            >
              Already have an account? Sign in
            </button>
          </form>
        )}

        {stage === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-3.5">
            <div className="text-[12.5px] text-inkdim leading-relaxed mb-1">
              We sent a 6-digit code to <b className="text-ink">{email}</b>. Enter it below to finish
              signing in.
            </div>
            <div>
              <label className="block text-xs text-inkdim font-semibold mb-1.5">Verification code</label>
              <input
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-bgsoft border border-line rounded-md px-3 py-2.5 text-lg tracking-[0.3em] text-center font-mono outline-none focus:border-income"
                placeholder="······"
              />
            </div>

            {error && <div className="text-xs text-expense">{error}</div>}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-income text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Verify and sign in"}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="w-full text-center text-xs text-inkfaint hover:text-inkdim mt-1 disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStage("credentials");
                setOtp("");
                setError("");
              }}
              className="w-full text-center text-xs text-inkfaint hover:text-inkdim"
            >
              ← Use a different account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
