"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  Fingerprint,
  Leaf,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button, Notice } from "@/components/ui/primitives";
import { post } from "@/shared/api-client";
export function AuthForm({
  mode,
  next,
}: {
  mode: "sign-in" | "sign-up";
  next: string;
}) {
  const register = mode === "sign-up";
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await post(`/auth/${mode}`, {
        email: data.get("email"),
        password: data.get("password"),
        ...(register ? { name: data.get("name") } : {}),
      });
      router.push(register ? "/profile?welcome=1" : next);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout page-enter">
      <section className="auth-form-panel">
        <Link href="/scan" className="back-link">
          ← Continue as a guest
        </Link>
        <div className="auth-icon">
          <Fingerprint size={30} />
        </div>
        <span className="eyebrow">YOUR OWN LITTLE FOOD SPACE</span>
        <h1>
          {register ? (
            <>
              Good food starts
              <br />
              with <em>you.</em>
            </>
          ) : (
            <>
              A little more you.
              <br />
              <em>Welcome back.</em>
            </>
          )}
        </h1>
        <p>
          {register
            ? "A few details, then a world of food that fits your tastes."
            : "Sign in for your personal picks, saved preferences, and food journal."}
        </p>
        <div className="auth-tabs">
          <Link
            href={`/sign-in?next=${encodeURIComponent(next)}`}
            className={!register ? "active" : ""}
          >
            Sign in
          </Link>
          <Link
            href={`/sign-up?next=${encodeURIComponent(next)}`}
            className={register ? "active" : ""}
          >
            Create account
          </Link>
        </div>
        <form onSubmit={submit}>
          {register && (
            <div className="form-field">
              <label htmlFor="name">Your name</label>
              <div className="input-icon">
                <UserRound size={17} />
                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  placeholder="What should we call you?"
                  minLength={2}
                  maxLength={80}
                  required
                  disabled={busy}
                />
              </div>
            </div>
          )}
          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <div className="input-icon">
              <Mail size={17} />
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                maxLength={254}
                required
                disabled={busy}
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="password">
              Password<span>At least 8 characters</span>
            </label>
            <div className="input-icon">
              <LockKeyhole size={17} />
              <input
                id="password"
                type={visible ? "text" : "password"}
                name="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={8}
                maxLength={128}
                required
                disabled={busy}
                placeholder="Your password"
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? "Hide password" : "Show password"}
              >
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" loading={busy} className="full-width">
            {register ? "Create your space" : "Sign in"}
            <ArrowRight size={18} />
          </Button>
        </form>
        <p className="auth-privacy">
          <ShieldCheck size={14} />
          Your health details are optional. You decide what to share.
        </p>
        <Link href="/model" className="text-link">
          How your data is handled <ArrowUpRight size={14} />
        </Link>
      </section>
      <aside className="auth-story">
        <div className="auth-story-grid" />
        <span className="story-topline">
          <Leaf size={18} />
          FOODWISE, YOUR WAY.
        </span>
        <div className="auth-sculpture" aria-hidden="true">
          <div className="orbit-circle" />
          <div className="auth-leaf">
            <Leaf size={100} strokeWidth={0.8} />
          </div>
          <div className="floating-tag tag-one">
            <Check size={15} />
            Your tastes
          </div>
          <div className="floating-tag tag-two">
            <Sparkles size={15} />
            Your next favorite
          </div>
          <div className="floating-tag tag-three">
            <ShieldCheck size={15} />
            Your chosen limits
          </div>
        </div>
        <h2>
          Your preferences.
          <br />A better starting point.
        </h2>
        <p>Because the right choice feels different for everyone.</p>
        <ul>
          <li>
            <Check size={17} />
            Food picks shaped around your tastes
          </li>
          <li>
            <Check size={17} />
            Checks for your recorded restrictions
          </li>
          <li>
            <Check size={17} />A journal that stays in your account
          </li>
        </ul>
        <span className="story-bottom">SMALL CHOICES. YOUR OWN DIRECTION.</span>
      </aside>
    </div>
  );
}
