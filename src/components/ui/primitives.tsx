import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  ArrowUpRight,
  CircleAlert,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
export function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`button button-${variant} ${className}`}
      aria-busy={loading}
    >
      {loading && <LoaderCircle size={17} className="spin" />}
      {children}
    </button>
  );
}
export function ActionLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <Link href={href} className={`button button-${variant} ${className}`}>
      {children}
    </Link>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <span className="eyebrow">
          <span />
          {eyebrow}
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function Notice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "error" | "success";
}) {
  return (
    <div
      className={`notice notice-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <CircleAlert size={18} />
      <div>{children}</div>
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function SectionTitle({
  number,
  title,
  children,
}: {
  number?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-title">
      <h2>
        {number && <span>{number}</span>}
        {title}
      </h2>
      {children}
    </div>
  );
}
export function SignInPrompt() {
  return (
    <div className="member-prompt">
      <div className="prompt-icon">
        <Sparkles size={24} />
      </div>
      <div>
        <span className="eyebrow">A LITTLE MORE PERSONAL</span>
        <h3>Good food. Your kind of good.</h3>
        <p>
          Sign in to get food suggestions shaped around your tastes and chosen
          limits.
        </p>
      </div>
      <ActionLink href="/sign-up" variant="secondary">
        Make it yours <ArrowUpRight size={17} />
      </ActionLink>
    </div>
  );
}
