import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Barcode,
  Check,
  CircleHelp,
  Compass,
  FlaskConical,
  Leaf,
  LockKeyhole,
  ScanLine,
  Sparkles,
} from "lucide-react";
import type { User } from "@/shared/contracts";
import {
  ActionLink,
  SectionTitle,
  SignInPrompt,
} from "@/components/ui/primitives";
import { FoodSculpture } from "./food-sculpture";
import { GradeScale } from "@/features/nutrition/score-card";
export function Overview({ user }: { user: User | null }) {
  return (
    <div className="page-enter">
      <div className="overview-heading">
        <span className="eyebrow">
          <span />A FRESH PERSPECTIVE ON FOOD
        </span>
        <div className="date-note">
          <Leaf size={14} /> Little choices. Lasting habits.
        </div>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span />
            KNOW MORE. EAT YOUR WAY.
          </span>
          <h1>
            Good food.
            <br />
            <span>
              A little more <em>you.</em>
            </span>
          </h1>
          <p>
            Less guesswork in the grocery aisle. Scan a label, understand the
            score, and feel clearer about your next bite.
          </p>
          <div className="hero-actions">
            <ActionLink href="/scan">
              Scan a food <ScanLine size={20} />
            </ActionLink>
            <Link
              href={user ? "/recommendations" : "/model"}
              className="text-link"
            >
              {user ? "Explore your picks" : "See how it works"}
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="hero-proof">
            <span>
              <Check size={13} />
              Free barcode scores
            </span>
            <span>
              <Check size={13} />
              No account needed
            </span>
          </div>
        </div>
        <FoodSculpture />
      </section>
      <div className="journey-strip">
        {[
          {
            n: "01",
            icon: Barcode,
            title: "Scan the label",
            text: "Start with what’s in your hand.",
          },
          {
            n: "02",
            icon: CircleHelp,
            title: "Understand the score",
            text: "Clear answers. Honest limits.",
          },
          {
            n: "03",
            icon: Compass,
            title: "Find your kind of good",
            text: "Personal picks after sign-in.",
          },
        ].map(({ n, icon: Icon, title, text }) => (
          <div className="journey-step" key={n}>
            <span className="step-number">{n}</span>
            <span className="step-icon">
              <Icon size={21} />
            </span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
            <ArrowRight size={17} className="step-arrow" />
          </div>
        ))}
      </div>
      <section className="overview-grid">
        <div className="panel grade-guide">
          <SectionTitle number="01" title="A score you can understand">
            <span className="small-tag">THE BASICS</span>
          </SectionTitle>
          <div className="grade-guide-body">
            <div>
              <h3>
                Five letters.
                <br />A clearer picture.
              </h3>
              <p>
                Nutrition grades run from A to E. They describe nutritional
                quality, so you can read beyond the front of the pack.
              </p>
              <Link href="/model" className="text-link">
                Get to know the score <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="grade-guide-visual">
              <GradeScale />
              <div className="scale-labels">
                <span>More favorable</span>
                <ArrowRight size={14} />
                <span>Less favorable</span>
              </div>
              <p>
                <FlaskConical size={13} /> Source grades first. Model estimates
                labeled.
              </p>
            </div>
          </div>
        </div>
        <Link href="/scan" className="quick-scan-card">
          <div>
            <span className="eyebrow">IN THE GROCERY AISLE?</span>
            <ArrowUpRight size={22} />
          </div>
          <div className="scan-graphic" aria-hidden="true">
            <ScanLine size={65} />
            <span className="laser" />
          </div>
          <h3>
            Turn a label
            <br />
            into an insight.
          </h3>
          <span className="quick-scan-link">
            Open scanner <ArrowRight size={17} />
          </span>
        </Link>
      </section>
      <section className="personal-teaser">
        <SectionTitle
          number="02"
          title={
            user
              ? `A space that’s yours, ${user.name.split(" ")[0]}.`
              : "Your food. Your preferences."
          }
        >
          <span className="small-tag">
            {user ? "MADE FOR YOU" : "WHEN YOU’RE READY"}
          </span>
        </SectionTitle>
        {user ? (
          <div className="member-welcome">
            <div className="prompt-icon">
              <Sparkles size={24} />
            </div>
            <div>
              <h3>Your next favorite could be right here.</h3>
              <p>
                Set your tastes and nutrient limits to make your recommendations
                more useful.
              </p>
            </div>
            <ActionLink href="/recommendations">
              Explore your picks <ArrowUpRight size={17} />
            </ActionLink>
          </div>
        ) : (
          <SignInPrompt />
        )}
      </section>
      <div className="trust-row">
        <span>
          <ShieldIcon />
          Your health details stay optional.
        </span>
        <span>
          <LockKeyhole size={14} />
          Personal recommendations require sign-in.
        </span>
        <Link href="/model">
          Built with transparency <ArrowDown size={14} />
        </Link>
      </div>
    </div>
  );
}
function ShieldIcon() {
  return <Leaf size={14} />;
}
