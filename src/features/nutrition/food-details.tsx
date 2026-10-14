import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  Info,
  Leaf,
} from "lucide-react";
import {
  ActionLink,
  PageHeading,
  SignInPrompt,
} from "@/components/ui/primitives";
import type { FoodResult } from "@/shared/contracts";
import { ScoreCard } from "./score-card";
import { FoodAlternatives } from "@/features/discovery/alternatives";
export function FoodDetails({
  food,
  assessment,
  signedIn,
  alternatives = [],
}: FoodResult & { signedIn: boolean }) {
  const nutrients = [
    { key: "energy", label: "Energy", unit: "kcal" },
    { key: "sugar", label: "Sugar", unit: "g" },
    { key: "addedSugar", label: "Added sugar", unit: "g" },
    { key: "carbs", label: "Carbohydrates", unit: "g" },
    { key: "sodium", label: "Sodium", unit: "mg" },
    { key: "saturatedFat", label: "Saturated fat", unit: "g" },
    { key: "protein", label: "Protein", unit: "g" },
    { key: "fiber", label: "Fiber", unit: "g" },
  ] as const;
  return (
    <div className="page-enter">
      <Link href="/scan" className="back-link">
        <ArrowLeft size={15} />
        Back to scanner
      </Link>
      <PageHeading
        eyebrow="THE DETAILS BEHIND YOUR FOOD"
        title={food.name}
        description="A clear look at what we know, where it comes from, and what’s missing."
        action={
          <span className="soft-badge">
            <BookOpen size={15} />
            Food insights
          </span>
        }
      />
      <div className="details-grid">
        <div>
          <ScoreCard food={food} assessment={assessment} />
          <div className="panel detail-explanation">
            <span className="eyebrow">WHY THIS RESULT?</span>
            <h2>Here’s the thinking.</h2>
            <p>{assessment.reason}</p>
            <ol className="reason-list">
              {assessment.details.map((detail, i) => (
                <li key={i}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  {detail}
                </li>
              ))}
            </ol>
            {!assessment.details.length && (
              <p className="fine-print">
                A known ingredient or diet conflict takes priority over the
                overall nutrition grade.
              </p>
            )}
            {!!assessment.references?.length && (
              <ul
                className="explanation-sources"
                aria-label="Nutrition explanation sources"
              >
                {assessment.references.map(({ label, url }) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {signedIn && <FoodAlternatives items={alternatives} />}
        </div>
        <div>
          <section className="panel nutrient-panel">
            <div className="section-title">
              <h2>Inside the label</h2>
              <Leaf size={19} />
            </div>
            <p>Per {food.serving}</p>
            <dl className="nutrient-list">
              {nutrients.map(({ key, label, unit }) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    {food.nutrients[key] === undefined ? (
                      <span className="missing-value">Not supplied</span>
                    ) : (
                      <>
                        {Number(food.nutrients[key]!.toFixed(1))}
                        <span>{unit}</span>
                      </>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="fine-print">
              {food.estimated
                ? "Recipe/menu nutrition describes the linked formulation; preparation can vary."
                : "Source data may change. Verify the current package label."}
            </p>
          </section>
          <section className="panel ingredient-panel">
            <h2>Ingredients & allergens</h2>
            <p>
              {food.ingredients.length
                ? food.ingredients.join(", ")
                : "Ingredients were not supplied."}
            </p>
            <div className="chip-row">
              {food.allergens.map((allergen) => (
                <span className="allergen-chip" key={allergen}>
                  {allergen}
                </span>
              ))}
            </div>
            <p className="fine-print">
              <Info size={14} />
              {food.ingredientsComplete
                ? "Listed ingredients are available. Cross-contact still requires checking the label."
                : "Incomplete ingredient information. Allergy compatibility cannot be confirmed."}
            </p>
          </section>
        </div>
      </div>
      <div className="panel source-panel">
        <div>
          <span className="eyebrow">TRACE IT BACK</span>
          <h3>Good information has a source.</h3>
          <p>{food.source}</p>
        </div>
        <a
          className="button button-secondary"
          href={food.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          View original source <ArrowUpRight size={17} />
        </a>
      </div>
      {signedIn ? (
        <div className="member-welcome">
          <div className="prompt-icon">
            <Check size={24} />
          </div>
          <div>
            <h3>Bring your preferences into the picture.</h3>
            <p>
              Your food suggestions use your saved tastes, restrictions, and
              nutrient limits.
            </p>
          </div>
          <ActionLink href="/recommendations">
            See your picks <ArrowUpRight size={17} />
          </ActionLink>
        </div>
      ) : (
        <SignInPrompt />
      )}
    </div>
  );
}
