"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  AudioLines,
  BookOpen,
  ChevronRight,
  Compass,
  FlaskConical,
  Home,
  Leaf,
  LockKeyhole,
  LogOut,
  ScanLine,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import type { User } from "@/shared/contracts";
import { post } from "@/shared/api-client";
const navigation = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/scan", label: "Scan a food", icon: ScanLine },
  { href: "/recommendations", label: "For you", icon: Compass, private: true },
  { href: "/journal", label: "Food journal", icon: BookOpen, private: true },
  {
    href: "/profile",
    label: "Your preferences",
    icon: Settings2,
    private: true,
  },
];
export function AppShell({
  user,
  children,
}: {
  user: User | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setLoggingOut(true);
    try {
      await post("/auth/sign-out", {});
      router.push("/");
      router.refresh();
    } catch {
      setError("Couldn’t sign out. Try again.");
    } finally {
      setLoggingOut(false);
    }
  }
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-symbol">
            <Leaf size={24} />
          </span>
          foodwise<span className="brand-period">.</span>
        </Link>
        <p className="sidebar-tagline">A little better, every bite.</p>
        <span className="sidebar-label">YOUR DAILY COMPASS</span>
        <nav aria-label="Main navigation">
          {navigation.map(
            ({ href, label, icon: Icon, private: privatePage }, index) => (
              <Link
                key={href}
                href={href}
                className={`nav-item ${pathname === href ? "active" : ""}`}
                aria-current={pathname === href ? "page" : undefined}
              >
                <Icon size={19} />
                <span>{label}</span>
                {privatePage && !user ? (
                  <LockKeyhole size={13} className="nav-lock" />
                ) : pathname === href ? (
                  <span className="nav-dot" />
                ) : index === 1 ? (
                  <span className="nav-key">↗</span>
                ) : null}
              </Link>
            ),
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="note-orbit">
              <Leaf size={28} />
              <span />
              <i />
            </div>
            <h3>
              A small choice.
              <br />A better everyday.
            </h3>
            <p>Clarity starts with knowing what’s in your food.</p>
            <Link href="/model">
              How Foodwise works <ArrowUpRight size={15} />
            </Link>
          </div>
          <Link
            href="/model"
            className={`nav-item ${pathname === "/model" ? "active" : ""}`}
          >
            <FlaskConical size={18} />
            Behind the score
          </Link>
          <div className="sidebar-account">
            <div className="avatar">
              {user ? (
                user.name.slice(0, 1).toUpperCase()
              ) : (
                <ShieldCheck size={19} />
              )}
            </div>
            <div>
              <strong>{user ? user.name : "Just exploring"}</strong>
              <span>
                {user ? "Your personal space" : "No account needed to scan"}
              </span>
            </div>
            {user ? (
              <button
                onClick={signOut}
                disabled={loggingOut}
                aria-label="Sign out"
                className="icon-button"
              >
                <LogOut size={17} />
              </button>
            ) : (
              <Link
                href="/sign-in"
                aria-label="Sign in"
                className="icon-button"
              >
                <ArrowUpRight size={17} />
              </Link>
            )}
          </div>
          {error && (
            <p role="alert" className="account-error">
              {error}
            </p>
          )}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <AudioLines size={18} />
            <span>YOUR EVERYDAY FOOD GUIDE</span>
            <ChevronRight size={13} />
            <strong>
              {navigation.find((item) => item.href === pathname)?.label ||
                (pathname.startsWith("/why")
                  ? "Food insights"
                  : pathname.includes("sign-")
                    ? "Your account"
                    : "Behind the score")}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="mode-pill">
              <span />
              {user ? "Personal mode" : "Guest mode"}
            </span>
            {user ? (
              <Link
                href="/profile"
                className="topbar-avatar"
                aria-label="Your preferences"
              >
                {user.name.slice(0, 1)}
              </Link>
            ) : (
              <Link href="/sign-in" className="signin-link">
                Sign in <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="app-footer">
          <span>
            <Leaf size={14} /> Thoughtful choices start here.
          </span>
          <Link href="/model">
            Data, model & privacy <ArrowUpRight size={12} />
          </Link>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.slice(0, 4).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? "active" : ""}
            aria-current={pathname === href ? "page" : undefined}
          >
            <Icon size={21} />
            <span>{label === "Scan a food" ? "Scan" : label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
