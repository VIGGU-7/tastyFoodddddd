"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  Heart,
  Leaf,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  ActionLink,
  Button,
  Notice,
  PageHeading,
} from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import type { Profile } from "@/features/nutrition/domain/types";
import { emptyProfile } from "@/features/nutrition/domain/types";
import { api } from "@/shared/api-client";
import { profileSchema } from "@/features/nutrition/domain/validation";
const cuisines = [
  "Indian",
  "Mediterranean",
  "International",
  "Mexican",
  "Japanese",
  "Italian",
];
const allergies = [
  "Milk",
  "Eggs",
  "Fish",
  "Peanuts",
  "Soy",
  "Gluten",
  "Sesame",
  "Tree nuts",
  "Shellfish",
];
const steps = [
  { title: "Your tastes", icon: Heart },
  { title: "Your boundaries", icon: ShieldCheck },
  { title: "Your daily direction", icon: SlidersHorizontal },
];
export function ProfileForm({
  initial,
  name,
  welcome,
}: {
  initial: Profile | null;
  name: string;
  welcome: boolean;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(
    initial || { ...emptyProfile, name },
  );
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }
  function toggle(key: "cuisines" | "allergies" | "conditions", value: string) {
    update(
      key,
      profile[key].includes(value)
        ? profile[key].filter((item) => item !== value)
        : [...profile[key], value],
    );
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = profileSchema.parse(profile);
      await api("/profile", { method: "PUT", body: JSON.stringify(data) });
      setSaved(true);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Couldn’t save your preferences.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function removeAccount() {
    setBusy(true);
    setError("");
    try {
      await api("/account", { method: "DELETE" });
      router.push("/");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Couldn’t delete your account.",
      );
      setDeleteOpen(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow={
          welcome ? "WELCOME TO YOUR LITTLE FOOD SPACE" : "IT STARTS WITH YOU"
        }
        title={
          welcome
            ? `Let’s make it yours, ${name.split(" ")[0]}.`
            : "Your kind of good."
        }
        description="A few preferences go a long way. Share what’s useful; skip what isn’t."
        action={
          <span className="soft-badge">
            <LockKeyhole size={14} />
            Private to your account
          </span>
        }
      />
      <div className="profile-layout">
        <section className="panel profile-panel">
          <nav className="onboarding-steps" aria-label="Preference steps">
            {steps.map(({ title, icon: Icon }, index) => (
              <button
                key={title}
                type="button"
                onClick={() => setStep(index)}
                className={
                  index === step ? "active" : index < step ? "complete" : ""
                }
                aria-current={index === step ? "step" : undefined}
              >
                <span>
                  {index < step ? <Check size={16} /> : <Icon size={16} />}
                </span>
                <div>
                  <small>STEP 0{index + 1}</small>
                  <strong>{title}</strong>
                </div>
              </button>
            ))}
          </nav>
          <form onSubmit={save}>
            <div className="step-content" key={step}>
              {step === 0 ? (
                <>
                  <span className="eyebrow">01 / THE GOOD STUFF</span>
                  <h2>What sounds good to you?</h2>
                  <p>
                    We’ll use your tastes as a starting point for food
                    suggestions.
                  </p>
                  <div className="form-field">
                    <label htmlFor="profile-name">
                      What should we call you?
                    </label>
                    <input
                      id="profile-name"
                      value={profile.name}
                      maxLength={80}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <fieldset>
                    <legend>
                      Cuisines you enjoy <span>Choose any</span>
                    </legend>
                    <div className="choice-grid">
                      {cuisines.map((cuisine) => (
                        <label
                          key={cuisine}
                          className={`choice-chip ${profile.cuisines.includes(cuisine) ? "selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={profile.cuisines.includes(cuisine)}
                            onChange={() => toggle("cuisines", cuisine)}
                          />
                          <span>{cuisine}</span>
                          {profile.cuisines.includes(cuisine) && (
                            <Check size={14} />
                          )}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="form-field">
                    <label htmlFor="favorites">
                      Favorite foods or ingredients <span>Optional</span>
                    </label>
                    <input
                      id="favorites"
                      placeholder="e.g. chickpeas, oats, salmon"
                      defaultValue={profile.favorites.join(", ")}
                      onBlur={(e) =>
                        update(
                          "favorites",
                          e.target.value
                            .split(",")
                            .map((v) => v.trim())
                            .filter(Boolean),
                        )
                      }
                    />
                    <span className="field-hint">
                      Separate with commas. We’ll remember what you enjoy.
                    </span>
                  </div>
                  <div className="form-field">
                    <label htmlFor="dislikes">
                      Things you’d rather skip <span>Optional</span>
                    </label>
                    <input
                      id="dislikes"
                      placeholder="e.g. mushrooms, onion"
                      defaultValue={profile.dislikes.join(", ")}
                      onBlur={(e) =>
                        update(
                          "dislikes",
                          e.target.value
                            .split(",")
                            .map((v) => v.trim())
                            .filter(Boolean),
                        )
                      }
                    />
                  </div>
                </>
              ) : step === 1 ? (
                <>
                  <span className="eyebrow">02 / YOUR NON-NEGOTIABLES</span>
                  <h2>Good choices respect your boundaries.</h2>
                  <p>
                    Known conflicts take priority over taste and nutrition
                    grades.
                  </p>
                  <div className="form-field">
                    <label htmlFor="diet">Your dietary preference</label>
                    <select
                      id="diet"
                      value={profile.diet}
                      onChange={(e) => update("diet", e.target.value)}
                    >
                      {["Any", "Vegetarian", "Vegan", "Gluten-free"].map(
                        (diet) => (
                          <option key={diet}>{diet}</option>
                        ),
                      )}
                    </select>
                  </div>
                  <fieldset>
                    <legend>
                      Allergies to check <span>Optional</span>
                    </legend>
                    <div className="choice-grid">
                      {allergies.map((allergy) => (
                        <label
                          key={allergy}
                          className={`choice-chip ${profile.allergies.includes(allergy) ? "selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={profile.allergies.includes(allergy)}
                            onChange={() => toggle("allergies", allergy)}
                          />
                          <span>{allergy}</span>
                          {profile.allergies.includes(allergy) && (
                            <Check size={14} />
                          )}
                        </label>
                      ))}
                    </div>
                    <p className="field-hint">
                      Incomplete ingredients mean unknown compatibility. Always
                      check the label for cross-contact.
                    </p>
                  </fieldset>
                  <fieldset>
                    <legend>
                      Health context <span>Optional</span>
                    </legend>
                    <div className="choice-grid">
                      {[
                        "Diabetes",
                        "High blood pressure",
                        "High cholesterol",
                      ].map((condition) => (
                        <label
                          key={condition}
                          className={`choice-chip ${profile.conditions.includes(condition) ? "selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={profile.conditions.includes(condition)}
                            onChange={() => toggle("conditions", condition)}
                          />
                          <span>{condition}</span>
                        </label>
                      ))}
                    </div>
                    <p className="field-hint">
                      Context only. Conditions do not automatically set nutrient
                      targets or predict glucose response.
                    </p>
                  </fieldset>
                </>
              ) : (
                <>
                  <span className="eyebrow">03 / YOUR DAILY DIRECTION</span>
                  <h2>A little intention helps.</h2>
                  <p>
                    Choose a food goal and, if you have them, your own
                    per-serving limits.
                  </p>
                  <div className="form-field">
                    <label htmlFor="goal">What would you like more of?</label>
                    <select
                      id="goal"
                      value={profile.goal}
                      onChange={(e) => update("goal", e.target.value)}
                    >
                      {[
                        "Balanced eating",
                        "More protein",
                        "More fiber",
                        "Less sugar",
                      ].map((goal) => (
                        <option key={goal}>{goal}</option>
                      ))}
                    </select>
                  </div>
                  <div className="limit-heading">
                    <strong>Your per-serving limits</strong>
                    <span>ALL OPTIONAL</span>
                  </div>
                  <div className="limit-grid">
                    {[
                      { key: "sugar", label: "Sugar", unit: "g", max: 500 },
                      {
                        key: "carbs",
                        label: "Carbohydrates",
                        unit: "g",
                        max: 1000,
                      },
                      {
                        key: "sodium",
                        label: "Sodium",
                        unit: "mg",
                        max: 20000,
                      },
                      {
                        key: "saturatedFat",
                        label: "Saturated fat",
                        unit: "g",
                        max: 500,
                      },
                    ].map(({ key, label, unit, max }) => (
                      <div className="form-field" key={key}>
                        <label htmlFor={`limit-${key}`}>{label}</label>
                        <div className="unit-input">
                          <input
                            id={`limit-${key}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={max}
                            step="any"
                            placeholder="No limit set"
                            value={
                              profile.limits[key as keyof Profile["limits"]] ??
                              ""
                            }
                            onChange={(e) =>
                              update("limits", {
                                ...profile.limits,
                                [key]:
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
                              })
                            }
                          />
                          <span>{unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Notice>
                    Use targets from your own care plan. Foodwise does not
                    prescribe clinical limits.
                  </Notice>
                </>
              )}
            </div>
            {error && <Notice tone="error">{error}</Notice>}
            {saved && (
              <Notice tone="success">
                Preferences saved. Your personal picks now use these settings.
              </Notice>
            )}
            <div className="step-actions">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft size={17} />
                  Back
                </Button>
              ) : (
                <span className="optional-note">
                  All health details are optional.
                </span>
              )}
              {saved ? (
                <ActionLink href="/recommendations">
                  See your picks <ArrowRight size={17} />
                </ActionLink>
              ) : (
                <Button type="submit" loading={busy}>
                  {step === 2 ? "Save preferences" : "Continue"}
                  {step === 2 ? <Check size={17} /> : <ArrowRight size={17} />}
                </Button>
              )}
            </div>
          </form>
        </section>
        <aside className="profile-summary">
          <div className="panel summary-panel">
            <span className="eyebrow">A LITTLE SNAPSHOT OF YOU</span>
            <div className="summary-avatar">
              <Leaf size={32} />
            </div>
            <h2>{profile.name || "Your food profile"}</h2>
            <p>{profile.goal}</p>
            <dl>
              <div>
                <dt>
                  <Heart size={15} />
                  Favorite cuisines
                </dt>
                <dd>
                  {profile.cuisines.join(", ") || "Open to possibilities"}
                </dd>
              </div>
              <div>
                <dt>
                  <Leaf size={15} />
                  Dietary preference
                </dt>
                <dd>
                  {profile.diet === "Any" ? "No preference" : profile.diet}
                </dd>
              </div>
              <div>
                <dt>
                  <ShieldCheck size={15} />
                  Recorded allergies
                </dt>
                <dd>{profile.allergies.join(", ") || "None recorded"}</dd>
              </div>
              <div>
                <dt>
                  <Settings2 size={15} />
                  Nutrient limits
                </dt>
                <dd>
                  {
                    Object.values(profile.limits).filter(
                      (value) => value !== undefined,
                    ).length
                  }{" "}
                  selected
                </dd>
              </div>
            </dl>
            <p className="summary-note">
              <CheckCheck size={17} />
              You can change these anytime.
            </p>
          </div>
          <div className="privacy-note">
            <LockKeyhole size={18} />
            <h3>Your data, your choice.</h3>
            <p>
              Preferences stay in your account. Deleting your account removes
              your journal and health details too.
            </p>
            <button onClick={() => setDeleteOpen(true)} className="danger-link">
              <Trash2 size={14} />
              Delete my account
            </button>
          </div>
        </aside>
      </div>
      <Modal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete your account?"
        description="This permanently removes your profile, sessions, food history, ratings, and glucose journal. This cannot be undone."
      >
        <div className="modal-actions">
          <Button
            variant="secondary"
            onClick={() => setDeleteOpen(false)}
            disabled={busy}
          >
            Keep my account
          </Button>
          <Button variant="danger" loading={busy} onClick={removeAccount}>
            Delete account
          </Button>
        </div>
      </Modal>
    </div>
  );
}
