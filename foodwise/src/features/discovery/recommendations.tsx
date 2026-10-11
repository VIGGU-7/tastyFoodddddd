"use client";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Star,
  Utensils,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Profile, Rating } from "@/features/nutrition/domain/types";
import type { Recommendation } from "@/shared/contracts";
import {
  ActionLink,
  Button,
  EmptyState,
  Notice,
  PageHeading,
  SectionTitle,
} from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { post } from "@/shared/api-client";
import { FoodCard } from "./food-card";
export function Recommendations({
  items,
  profile,
  name,
  ratings: initialRatings,
}: {
  items: Recommendation[];
  profile: Profile | null;
  name: string;
  ratings: Rating[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("All picks");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Recommendation | null>(null);
  const [tried, setTried] = useState(false);
  const [stars, setStars] = useState(0);
  const [ratings, setRatings] = useState(initialRatings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          (tab === "All picks" ||
            (tab === "Meals" && item.food.kind === "meal") ||
            (tab === "Restaurant menus" && item.food.kind === "restaurant")) &&
          `${item.food.name} ${item.food.cuisine} ${item.food.ingredients.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [items, query, tab],
  );
  async function save() {
    if (!selected || !tried || !stars) return;
    setBusy(true);
    setError("");
    try {
      await post("/journal", {
        kind: "rating",
        data: { foodId: selected.food.id, rating: stars, tried: true },
      });
      setRatings((r) => [
        {
          foodId: selected.food.id,
          rating: stars,
          tried: true,
          createdAt: Date.now(),
        },
        ...r.filter((rating) => rating.foodId !== selected.food.id),
      ]);
      setSelected(null);
      setMessage("Taste noted. Your next picks will take it into account.");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn’t save your rating.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="A LITTLE MORE YOUR KIND OF GOOD"
        title={`On the menu for you, ${name.split(" ")[0]}.`}
        description="Food ideas shaped by your preferences, recorded limits, and the things you’ve tried."
        action={
          <ActionLink href="/profile" variant="secondary">
            <SlidersHorizontal size={16} />
            Tune your tastes
          </ActionLink>
        }
      />
      {!profile && (
        <div className="setup-banner">
          <div className="prompt-icon">
            <Settings2 size={23} />
          </div>
          <div>
            <h3>A better starting point is one step away.</h3>
            <p>These are general picks until you save your preferences.</p>
          </div>
          <ActionLink href="/profile" variant="secondary">
            Set preferences <ArrowRight size={17} />
          </ActionLink>
        </div>
      )}
      <div className="recommendation-context">
        <div>
          <span className="context-icon">
            <Sparkles size={22} />
          </span>
          <div>
            <span className="eyebrow">YOUR FOOD COMPASS</span>
            <strong>{profile?.goal || "Discover your direction"}</strong>
          </div>
        </div>
        <div className="context-pills">
          <span>
            <Check size={13} />
            {profile?.diet && profile.diet !== "Any"
              ? profile.diet
              : "All diets"}
          </span>
          <span>{profile?.allergies.length || 0} recorded allergies</span>
          <span>{ratings.length} taste notes</span>
        </div>
      </div>
      {message && <Notice tone="success">{message}</Notice>}
      <section>
        <SectionTitle number="01" title="Your next bite starts here">
          <span className="results-count">{visible.length} food ideas</span>
        </SectionTitle>
        <div className="food-toolbar">
          <div
            className="filter-tabs"
            role="group"
            aria-label="Filter food ideas"
          >
            {["All picks", "Meals", "Restaurant menus"].map((value) => (
              <button
                key={value}
                aria-pressed={tab === value}
                className={tab === value ? "active" : ""}
                onClick={() => setTab(value)}
              >
                {value === "All picks" ? (
                  <Compass size={15} />
                ) : value === "Meals" ? (
                  <Utensils size={15} />
                ) : null}
                {value}
              </button>
            ))}
          </div>
          <label className="search-field">
            <Search size={17} />
            <span className="sr-only">Search food ideas</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a food or ingredient…"
              type="search"
            />
          </label>
        </div>
        {visible.length ? (
          <div className="food-grid">
            {visible.map((item, index) => (
              <div
                key={item.food.id}
                style={{ "--card-index": index } as React.CSSProperties}
              >
                <FoodCard
                  item={item}
                  rating={
                    ratings.find((r) => r.foodId === item.food.id)?.rating
                  }
                  onRate={() => {
                    setSelected(item);
                    setStars(
                      ratings.find((r) => r.foodId === item.food.id)?.rating ||
                        0,
                    );
                    setTried(false);
                    setError("");
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Compass />}
            title="Let’s widen the menu."
            description="No foods match these filters and your recorded restrictions. Try a different search; keep your real allergy restrictions."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setTab("All picks");
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}
      </section>
      <div className="recommendation-footnote">
        <LeafIcon />
        <div>
          <strong>A starting point, with honest limits.</strong>
          <p>
            Ingredient conflicts are excluded. Missing nutrition stays unknown.
            Restaurant entries are curated menu references; check current
            ingredients and availability with the restaurant.
          </p>
        </div>
        <ActionLink href="/model" variant="ghost">
          How we choose <ArrowUpRight size={16} />
        </ActionLink>
      </div>
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!busy && !open) setSelected(null);
        }}
        title="How was that bite?"
        description={`Your experience with ${selected?.food.name || "this food"} helps shape future food picks.`}
      >
        <div
          className="rating-stars"
          role="group"
          aria-label="Choose a rating from 1 to 5"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => setStars(value)}
              aria-pressed={stars === value}
              aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
            >
              <Star size={32} fill={value <= stars ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
        <label className="checkbox-line">
          <input
            type="checkbox"
            checked={tried}
            onChange={(e) => setTried(e.target.checked)}
          />
          I’ve actually tried this food.
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="modal-actions">
          <Button
            variant="secondary"
            onClick={() => setSelected(null)}
            disabled={busy}
          >
            Maybe later
          </Button>
          <Button disabled={!tried || !stars} loading={busy} onClick={save}>
            Save taste note <Check size={17} />
          </Button>
        </div>
      </Modal>
    </div>
  );
}
function LeafIcon() {
  return <Sparkles size={23} />;
}
