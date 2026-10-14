import Link from "next/link";
import type { Recommendation } from "@/shared/contracts";

/** Shared by scan results and details; empty results must remain visible and honest. */
export function FoodAlternatives({ items }: { items: Recommendation[] }) {
  return (
    <section
      className="panel alternatives-panel"
      aria-label="Personalized alternatives"
    >
      <span className="eyebrow">ANOTHER OPTION FOR YOU</span>
      <h2>Consider a swap.</h2>
      {items.length ? (
        <ul className="alternative-list">
          {items.map(({ food, reasons }) => (
            <li key={food.id}>
              <Link href={`/why/${food.id}`}>
                {food.name} <span aria-hidden="true">↗</span>
              </Link>
              <p>{reasons.slice(0, 2).join(" ")}</p>
              <small>Listed quantity: {food.serving}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          We don’t have a comparable alternative with enough information to
          recommend for you yet. Scan other products in this category to expand
          your options.
        </p>
      )}
    </section>
  );
}
