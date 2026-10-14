"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Leaf, Star } from "lucide-react";
import type { Recommendation } from "@/shared/contracts";
export function FoodCard({
  item,
  onRate,
  rating,
}: {
  item: Recommendation;
  onRate: () => void;
  rating?: number;
}) {
  const { food, assessment } = item;
  return (
    <article className="food-card">
      <Link
        href={`/why/${food.id}`}
        className="food-card-image"
        aria-label={`View ${food.name}`}
      >
        {food.image ? (
          <Image
            src={food.image}
            alt={food.name}
            fill
            sizes="(max-width: 650px) 95vw, (max-width: 1000px) 45vw, 28vw"
            unoptimized
          />
        ) : (
          <div className="food-placeholder">
            <Leaf size={50} />
          </div>
        )}
        <span className="food-kind">
          {food.kind === "restaurant"
            ? food.restaurant || "Restaurant menu"
            : food.category}
        </span>
        <span className="food-image-arrow">
          <ArrowUpRight size={20} />
        </span>
      </Link>
      <div className="food-card-body">
        <div className="food-card-meta">
          <span>{food.cuisine}</span>
          <span
            className={`fit-badge ${assessment.verdict === "Good fit" ? "fit-good" : assessment.verdict === "Limit" ? "fit-limit" : "fit-unknown"}`}
          >
            {assessment.verdict === "Good fit" && <Check size={11} />}{" "}
            {assessment.verdict}
          </span>
        </div>
        <Link href={`/why/${food.id}`} className="food-card-title">
          {food.name}
        </Link>
        <p className="food-card-reason">{assessment.reason}</p>
        <ul className="recommendation-reasons" aria-label="Why this pick">
          {item.reasons.slice(0, 2).map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <div className="food-card-nutrients">
          <span>
            <strong>{food.nutrients.energy ?? "—"}</strong>kcal
          </span>
          <span>
            <strong>{food.nutrients.protein ?? "—"}</strong>g protein
          </span>
          <span>
            <strong>{food.nutrients.fiber ?? "—"}</strong>g fiber
          </span>
        </div>
        <div className="food-card-bottom">
          <span>{food.serving}</span>
          <button onClick={onRate} aria-label={`Rate ${food.name}`}>
            <Star size={15} fill={rating ? "currentColor" : "none"} />
            {rating ? `${rating}/5` : "Tried it?"}
          </button>
        </div>
      </div>
    </article>
  );
}
