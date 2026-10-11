"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Leaf,
  ScanLine,
  Compass,
  Heart,
  History,
  SlidersHorizontal,
  Search,
  Plus,
  Check,
  ChevronRight,
  Star,
  X,
  Camera,
  ShieldCheck,
  UtensilsCrossed,
  MapPin,
  LogOut,
  Info,
  Activity,
  Menu,
} from "lucide-react";
import { catalog } from "../lib/food/catalog";
import { assess, rank } from "../lib/food/engine";
import {
  emptyProfile,
  Food,
  Glucose,
  Profile,
  Rating,
} from "../lib/food/types";
import { profileSchema, glucoseSchema } from "../lib/food/validation";
type View =
  "discover" | "scan" | "profile" | "history" | "favorites" | "why" | "model";
const localKey = "foodwise-v1";
async function api(action: string, data?: Record<string, unknown>) {
  const r = await fetch(
    data ? "/api/food" : `/api/food?action=${action}`,
    data
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...data }),
        }
      : undefined,
  );
  const result = await r.json();
  if (!r.ok) throw new Error(result.error || "Request failed");
  return result;
}
export default function Foodwise({
  initialView = "discover",
}: {
  initialView?: View;
}) {
  const [view, setView] = useState<View>(initialView),
    [profile, setProfile] = useState<Profile | null>(null),
    [draft, setDraft] = useState<Profile>(emptyProfile),
    [ratings, setRatings] = useState<Rating[]>([]),
    [glucose, setGlucose] = useState<Glucose[]>([]),
    [saved, setSaved] = useState<string[]>([]),
    [scans, setScans] = useState<Food[]>([]),
    [recommendationHistory, setRecommendationHistory] = useState<
      { foodId: string; name: string; createdAt: number }[]
    >([]),
    [user, setUser] = useState<{ name: string } | null>(null),
    [ready, setReady] = useState(false),
    [model, setModel] = useState<{
      status: string;
      version?: string;
      metrics?: {
        accuracy: number;
        macroF1: number;
        baselineAccuracy: number;
        samples: {
          train: number;
          validation: number;
          test: number;
          total: number;
        };
        perGrade: Record<
          string,
          {
            precision: number;
            recall: number;
            "f1-score": number;
            support: number;
          }
        >;
      };
    } | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [sessionLoaded, setSessionLoaded] = useState(false),
    [selected, setSelected] = useState<Food | null>(null),
    [tab, setTab] = useState<
      "All foods" | "Meals" | "Products" | "Restaurants"
    >("All foods"),
    [search, setSearch] = useState(""),
    [cuisine, setCuisine] = useState("All cuisines"),
    [city, setCity] = useState(""),
    [barcode, setBarcode] = useState(""),
    [camera, setCamera] = useState(false),
    [ratingFood, setRatingFood] = useState<Food | null>(null),
    [tried, setTried] = useState(false),
    [mobileNav, setMobileNav] = useState(false),
    [glucoseDraft, setGlucoseDraft] = useState({
      value: "",
      unit: "mg/dL",
      timing: "fasting",
      timestamp: "",
    });
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    cameraFrame = useRef<number>(0),
    cameraGeneration = useRef(0);
  useEffect(() => {
    if (!ratingFood) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRatingFood(null);
      if (event.key === "Tab" && dialog) {
        const items = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input, a[href]",
          ),
        );
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [ratingFood]);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(localKey) || "{}");
      if (raw.profile) {
        const p = profileSchema.parse(raw.profile) as Profile;
        setProfile(p);
        setDraft(p);
      }
      setRatings(raw.ratings || []);
      setGlucose(raw.glucose || []);
      setSaved(
        JSON.parse(localStorage.getItem("foodwise-saved") || "null") ||
          raw.saved ||
          [],
      );
      setScans(raw.scans || []);
    } catch {
      try {
        localStorage.removeItem(localKey);
      } catch {}
    }
    try {
      const f = JSON.parse(
        sessionStorage.getItem("foodwise-selected") || "null",
      );
      if (f) setSelected(f);
    } catch {}
    setReady(true);
    api("model")
      .then(setModel)
      .catch(() => {});
    api("session")
      .then(async (s) => {
        setUser(s.user);
        if (s.user) {
          const data = await api("records");
          const records = data.records || [];
          const p = records.find((r: any) => r.kind === "profile")?.payload;
          if (p) {
            setProfile(p);
            setDraft(p);
          }
          setRecommendationHistory(
            records
              .filter((r: any) => r.kind === "recommendation")
              .map((r: any) => ({ ...r.payload, createdAt: r.created_at })),
          );
          setRatings(
            records
              .filter((r: any) => r.kind === "rating")
              .map((r: any) => ({ ...r.payload, createdAt: r.created_at })),
          );
          setGlucose(
            records
              .filter((r: any) => r.kind === "glucose")
              .map((r: any) => r.payload),
          );
          setScans(
            records
              .filter((r: any) => r.kind === "scan")
              .map((r: any) => r.payload.food)
              .filter(
                (food: Food, index: number, items: Food[]) =>
                  items.findIndex((f) => f.id === food.id) === index,
              ),
          );
        }
      })
      .catch((e) => setMessage(e.message))
      .finally(() => setSessionLoaded(true));
    return () => {
      cameraGeneration.current++;
      stream.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(cameraFrame.current);
    };
  }, []);
  useEffect(() => {
    if (ready && sessionLoaded && !user) {
      try {
        localStorage.setItem(
          localKey,
          JSON.stringify({ profile, ratings, glucose, saved, scans }),
        );
      } catch {
        setMessage(
          "Browser storage is unavailable. Sign in to save your preferences.",
        );
      }
    }
  }, [profile, ratings, glucose, saved, scans, ready, user, sessionLoaded]);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem("foodwise-saved", JSON.stringify(saved));
      } catch {}
    }
  }, [ready, saved]);
  function stopCamera() {
    cameraGeneration.current++;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    cancelAnimationFrame(cameraFrame.current);
    setCamera(false);
  }
  function navigate(v: View) {
    stopCamera();
    setView(v);
    setMobileNav(false);
    setMessage("");
    window.history.pushState(
      {},
      "",
      v === "why" ? "/why" : v === "model" ? "/model" : "/",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  useEffect(() => {
    const pop = () => {
      stopCamera();
      setView(
        window.location.pathname === "/why"
          ? "why"
          : window.location.pathname === "/model"
            ? "model"
            : "discover",
      );
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  const foods = useMemo(() => {
    const byId = new Map([...catalog, ...scans].map((f) => [f.id, f]));
    return [...byId.values()];
  }, [scans]);
  const recommendations = useMemo(
    () =>
      rank(foods, profile, ratings).filter(
        ({ food }) =>
          (tab === "All foods" ||
            food.kind ===
              { Meals: "meal", Products: "product", Restaurants: "restaurant" }[
                tab
              ]) &&
          (cuisine === "All cuisines" || food.cuisine === cuisine) &&
          (!search ||
            `${food.name} ${food.cuisine} ${food.restaurant || ""}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (food.kind !== "restaurant" ||
            !city ||
            food.city?.toLowerCase().includes(city.toLowerCase())),
      ),
    [foods, profile, ratings, tab, cuisine, search, city],
  );
  function detail(food: Food) {
    setSelected(food);
    sessionStorage.setItem("foodwise-selected", JSON.stringify(food));
    navigate("why");
    if (user && catalog.some((f) => f.id === food.id)) {
      api("recommendation", { foodId: food.id })
        .then(() =>
          setRecommendationHistory((items) =>
            [
              { foodId: food.id, name: food.name, createdAt: Date.now() },
              ...items,
            ].slice(0, 100),
          ),
        )
        .catch(() =>
          setMessage(
            "Explanation is available, but this activity could not be saved.",
          ),
        );
    }
  }
  function favorite(id: string) {
    setSaved((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  }
  async function saveProfile() {
    try {
      setBusy(true);
      const p = profileSchema.parse({
        ...draft,
        cuisines: draft.cuisines.map((s) => s.trim()).filter(Boolean),
        favorites: draft.favorites.map((s) => s.trim()).filter(Boolean),
        dislikes: draft.dislikes.map((s) => s.trim()).filter(Boolean),
      }) as Profile;
      if (user) await api("profile", { data: p });
      setProfile(p);
      navigate("discover");
      setMessage(
        user
          ? "Your profile is saved to your account."
          : "Your profile is saved on this device.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Check your profile fields.");
    } finally {
      setBusy(false);
    }
  }
  async function lookup(code = barcode) {
    setBusy(true);
    setMessage("");
    stopCamera();
    try {
      const r = await fetch(
        `/api/food?action=barcode&code=${encodeURIComponent(code)}`,
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const food = data.food as Food;
      setScans((s) =>
        [food, ...s.filter((f) => f.id !== food.id)].slice(0, 100),
      );
      setSelected(food);
      sessionStorage.setItem("foodwise-selected", JSON.stringify(food));
      setBarcode(code);
      if (user) {
        try {
          await api("scan", { code });
        } catch {
          setMessage("Product found, but account history could not be saved.");
        }
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Product lookup failed.");
    } finally {
      setBusy(false);
    }
  }
  async function startCamera() {
    setMessage("");
    const generation = ++cameraGeneration.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera access requires HTTPS and a supported browser. Enter the barcode below.",
        );
      const Detector = (
        window as unknown as {
          BarcodeDetector?: new (options: { formats: string[] }) => {
            detect: (
              source: HTMLVideoElement,
            ) => Promise<{ rawValue: string }[]>;
          };
        }
      ).BarcodeDetector;
      if (!Detector)
        throw new Error(
          "Barcode camera decoding is not supported in this browser. Enter the barcode number below.",
        );
      const reader = new Detector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e"],
      });
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      if (generation !== cameraGeneration.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      setCamera(true);
      requestAnimationFrame(async () => {
        if (!video.current) return;
        video.current.srcObject = media;
        try {
          await video.current.play();
        } catch {
          stopCamera();
          setMessage("Camera playback failed. Enter the barcode number below.");
          return;
        }
        let last = 0;
        const scan = async (time: number) => {
          if (!stream.current || generation !== cameraGeneration.current)
            return;
          if (time - last > 400 && video.current) {
            last = time;
            try {
              const results = await reader.detect(video.current);
              if (results[0]) {
                const value = results[0].rawValue;
                if (/^\d{8,14}$/.test(value)) {
                  await lookup(value);
                  return;
                }
              }
            } catch {
              /* No barcode in this frame. */
            }
          }
          cameraFrame.current = requestAnimationFrame(scan);
        };
        cameraFrame.current = requestAnimationFrame(scan);
      });
    } catch (e) {
      stopCamera();
      setMessage(
        e instanceof Error
          ? e.message
          : "Camera unavailable. Enter the barcode below.",
      );
    }
  }
  async function rate(n: number) {
    if (!ratingFood || !tried || busy) return;
    setBusy(true);
    try {
      const rating: Rating = {
        foodId: ratingFood.id,
        rating: n,
        tried: true,
        createdAt: Date.now(),
      };
      if (user)
        await api("rating", {
          data: { foodId: rating.foodId, rating: n, tried: true },
        });
      setRatings((r) => [
        rating,
        ...r.filter((x) => x.foodId !== rating.foodId),
      ]);
      setRatingFood(null);
      setMessage("Taste noted. Your next recommendations will reflect it.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveGlucose() {
    try {
      const value = glucoseSchema.parse({
        value: Number(glucoseDraft.value),
        unit: glucoseDraft.unit,
        timing: glucoseDraft.timing,
        timestamp: new Date(glucoseDraft.timestamp).toISOString(),
      }) as Glucose;
      if (user) await api("glucose", { data: value });
      setGlucose((g) => [value, ...g]);
      setGlucoseDraft((g) => ({ ...g, value: "" }));
      setMessage(
        "Reading saved as context. It does not predict your response to food.",
      );
    } catch {
      setMessage(
        "Check the reading, units, and date. Use a valid time that is not in the future.",
      );
    }
  }
  async function deleteData() {
    try {
      if (user) await api("delete", {});
      setProfile(null);
      setDraft(emptyProfile);
      setRatings([]);
      setRecommendationHistory([]);
      setGlucose([]);
      setScans([]);
      setSaved([]);
      setSelected(null);
      localStorage.removeItem(localKey);
      localStorage.removeItem("foodwise-saved");
      sessionStorage.removeItem("foodwise-selected");
      setMessage("Your saved food and health data has been deleted.");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  const nav = [
    { v: "discover", label: "Discover", icon: Compass },
    { v: "scan", label: "Scan a barcode", icon: ScanLine },
    { v: "favorites", label: "Saved foods", icon: Heart },
    { v: "history", label: "Your activity", icon: History },
    { v: "profile", label: "Health & taste", icon: SlidersHorizontal },
  ] as const;
  const greeting = profile?.name
    ? `A little more you, ${profile.name.split(" ")[0]}.`
    : "Good food. Your way.";
  const a = selected ? assess(selected, profile) : null;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("discover");
          }}
        >
          <span className="brand-icon">
            <Leaf size={23} />
          </span>
          foodwise<span className="brand-dot">.</span>
        </a>
        <p className="nav-caption">YOUR EVERYDAY FOOD GUIDE</p>
        <nav>
          {nav.map((n) => (
            <button
              key={n.v}
              className={view === n.v ? "nav-item active" : "nav-item"}
              onClick={() => navigate(n.v)}
            >
              <n.icon size={19} />
              {n.label}
              {n.v === "scan" && <span className="tiny-tag">TRY IT</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="small-leaf">
            <Leaf size={22} />
          </div>
          <h3>
            Better choices.
            <br />
            One bite at a time.
          </h3>
          <p>A little curiosity goes a long way.</p>
          <button className="text-button" onClick={() => navigate("model")}>
            How Foodwise works <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="user-box">
          <span className="avatar">
            {(profile?.name || user?.name || "G")[0].toUpperCase()}
          </span>
          <div>
            <strong>{profile?.name || "Food explorer"}</strong>
            <span>{user ? "Account connected" : "Exploring as a guest"}</span>
          </div>
          {user ? (
            <a
              href="/signout-with-chatgpt?return_to=%2F"
              title="Sign out"
              target="_top"
            >
              <LogOut size={17} />
            </a>
          ) : (
            <a
              href="/signin-with-chatgpt?return_to=%2F"
              target="_top"
              title="Sign in"
            >
              <ArrowUpRight size={18} />
            </a>
          )}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Toggle navigation"
            onClick={() => setMobileNav(!mobileNav)}
          >
            <Menu />
          </button>
          <span className="breadcrumb">
            Your daily dose of delicious <span>✦</span>
          </span>
          <div className="top-actions">
            <span className="privacy">
              <ShieldCheck size={15} /> Your health, your choice
            </span>
            <button
              className="avatar"
              aria-label="Open profile"
              onClick={() => navigate("profile")}
            >
              {(profile?.name || "G")[0].toUpperCase()}
            </button>
          </div>
        </header>
        <main>
          {message && (
            <div className="notice" role="status">
              {message}
              <button
                aria-label="Dismiss message"
                onClick={() => setMessage("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {view === "discover" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    <span /> MADE FOR YOUR EVERYDAY
                  </p>
                  <h1>{greeting}</h1>
                  <p>Find your next favorite. Feel good about every choice.</p>
                </div>
                <button
                  className="button white"
                  onClick={() => navigate("profile")}
                >
                  <SlidersHorizontal size={16} />
                  {profile ? "Edit your preferences" : "Make it personal"}
                </button>
              </div>
              <section className="hero">
                <div className="hero-content">
                  <span className="pill light">
                    <Leaf size={13} /> A LITTLE HEALTHIER. A LOT MORE YOU.
                  </span>
                  <h2>
                    Your taste.
                    <br />
                    Your health.
                    <br />
                    <em>Your perfect plate.</em>
                  </h2>
                  <p>
                    Food recommendations that get to know you.
                    <br />
                    Because eating well should taste good, too.
                  </p>
                  <button
                    className="button cream"
                    onClick={() => navigate(profile ? "scan" : "profile")}
                  >
                    {profile ? "Scan your next find" : "Find my food fit"}
                    <ArrowUpRight size={18} />
                  </button>
                  <button
                    className="hero-guest"
                    onClick={() => navigate("scan")}
                  >
                    Just browsing? Scan as a guest <ArrowRight size={14} />
                  </button>
                </div>
                <div className="hero-image">
                  <img
                    src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1400&auto=format&fit=crop"
                    alt="Colorful fresh vegetable and grain bowls"
                  />
                  <div className="photo-sticker">
                    <span className="sticker-icon">
                      <Leaf size={20} />
                    </span>
                    <div>
                      <strong>Fresh ideas, just for you</strong>
                      <small>Good ingredients. Great possibilities.</small>
                    </div>
                  </div>
                  <span className="image-caption">
                    A fresh perspective on everyday eating
                  </span>
                </div>
              </section>
              <section className="steps">
                <div>
                  <span className="step-icon peach">
                    <ScanLine size={21} />
                  </span>
                  <div>
                    <strong>Scan it. Understand it.</strong>
                    <p>One barcode. A clearer food choice.</p>
                  </div>
                </div>
                <div>
                  <span className="step-icon green">
                    <SlidersHorizontal size={21} />
                  </span>
                  <div>
                    <strong>Your needs come first.</strong>
                    <p>Health goals meet personal taste.</p>
                  </div>
                </div>
                <div>
                  <span className="step-icon yellow">
                    <Heart size={21} />
                  </span>
                  <div>
                    <strong>Gets better with every bite.</strong>
                    <p>Tell us what you love. We’ll learn.</p>
                  </div>
                </div>
              </section>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">A LITTLE INSPIRATION</p>
                  <h2>
                    {profile
                      ? "Picked with you in mind"
                      : "Meet your next favorite"}
                  </h2>
                  <p>
                    {profile
                      ? "Guided by your preferences. Refined by your feedback."
                      : "A few delicious places to start. Add your profile to make them yours."}
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    setTab("All foods");
                    setCuisine("All cuisines");
                    setSearch("");
                  }}
                >
                  Explore all <ArrowRight size={16} />
                </button>
              </div>
              <div className="catalog-toolbar">
                <div className="tabs">
                  {(
                    ["All foods", "Meals", "Products", "Restaurants"] as const
                  ).map((t) => (
                    <button
                      key={t}
                      className={tab === t ? "selected" : ""}
                      onClick={() => setTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="filters">
                  <label className="search-input">
                    <Search size={16} />
                    <input
                      aria-label="Search foods"
                      placeholder="Something you’re craving?"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <select
                    aria-label="Cuisine"
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                  >
                    <option>All cuisines</option>
                    {[...new Set(catalog.map((f) => f.cuisine))].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              {tab === "Restaurants" && (
                <div className="restaurant-filter">
                  <MapPin size={18} />
                  <input
                    aria-label="Restaurant city"
                    placeholder="City (try London or New York)"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <span>
                    Curated menu references. Confirm availability and allergens
                    with the restaurant.
                  </span>
                </div>
              )}
              <div className="food-grid">
                {recommendations.map(({ food, assessment }) => (
                  <article className="food-card" key={food.id}>
                    <div className="food-photo">
                      {food.image ? (
                        <img src={food.image} alt={food.name} loading="lazy" />
                      ) : (
                        <div className="food-placeholder">
                          <UtensilsCrossed size={40} />
                          <span>{food.restaurant || "Your next find"}</span>
                        </div>
                      )}
                      <button
                        className={`save-button ${saved.includes(food.id) ? "saved" : ""}`}
                        aria-label={
                          saved.includes(food.id)
                            ? "Unsave " + food.name
                            : "Save " + food.name
                        }
                        onClick={() => favorite(food.id)}
                      >
                        <Heart
                          size={18}
                          fill={
                            saved.includes(food.id) ? "currentColor" : "none"
                          }
                        />
                      </button>
                      <span className="food-type">
                        {food.restaurant || food.cuisine}
                      </span>
                    </div>
                    <div className="food-body">
                      <div className="food-meta">
                        {food.kind === "restaurant"
                          ? "RESTAURANT DISH"
                          : food.kind === "product"
                            ? "PACKAGED FOOD"
                            : "EVERYDAY INSPIRATION"}
                        <span>
                          {food.estimated
                            ? "ESTIMATED NUTRITION"
                            : "SOURCE DATA"}
                        </span>
                      </div>
                      <h3>
                        <button onClick={() => detail(food)}>
                          {food.name}
                        </button>
                      </h3>
                      <p>
                        {food.ingredients.length
                          ? food.ingredients.slice(0, 3).join(" · ")
                          : "Ask the restaurant for current ingredients"}
                      </p>
                      <div className="nutrient-row">
                        <span>
                          {food.nutrients.energy !== undefined ? (
                            <>
                              <b>{Math.round(food.nutrients.energy)}</b> kcal
                            </>
                          ) : (
                            "Nutrition unverified"
                          )}
                        </span>
                        {food.nutrients.protein !== undefined && (
                          <span>
                            <b>{Math.round(food.nutrients.protein)}g</b> protein
                          </span>
                        )}
                        <button onClick={() => detail(food)}>
                          Details <ArrowUpRight size={14} />
                        </button>
                      </div>
                      <div className="card-bottom">
                        <span
                          className={`verdict ${assessment.verdict === "Good fit" ? "good" : assessment.verdict === "Avoid" ? "avoid" : "unknown"}`}
                        >
                          <span />
                          {assessment.verdict}
                        </span>
                        <button
                          className="text-button"
                          onClick={() => {
                            setRatingFood(food);
                            setTried(false);
                          }}
                        >
                          <Star size={14} /> Tried it?
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!recommendations.length && (
                <div className="empty-state">
                  <Search size={32} />
                  <h3>No matches yet</h3>
                  <p>
                    {tab === "Products"
                      ? "Scan a packaged food to add it to your discoveries."
                      : "Try a different search or city. Curated coverage is still growing."}
                  </p>
                  <button className="button" onClick={() => navigate("scan")}>
                    Scan a barcode <ScanLine size={17} />
                  </button>
                </div>
              )}
              <section className="bottom-banner">
                <span className="step-icon green">
                  <ScanLine size={26} />
                </span>
                <div>
                  <h3>What’s really in your shopping basket?</h3>
                  <p>
                    Scan a barcode for a clear, one-line nutrition assessment.
                  </p>
                </div>
                <button className="button" onClick={() => navigate("scan")}>
                  Let’s scan <ArrowUpRight size={17} />
                </button>
              </section>
            </>
          )}
          {view === "scan" && (
            <>
              <PageTitle
                eyebrow="A LITTLE CLARITY"
                title="Scan it. Get to know it."
                description="A barcode is all it takes to start understanding your food."
              />
              <div className="scan-layout">
                <section className="panel">
                  <div className="scanner">
                    {camera ? (
                      <video
                        ref={video}
                        autoPlay
                        playsInline
                        muted
                        aria-label="Live barcode camera"
                      />
                    ) : (
                      <>
                        <ScanLine size={76} strokeWidth={1} />
                        <h3>Meet your food scanner</h3>
                        <p>Point your camera at the barcode on the pack.</p>
                      </>
                    )}
                    <div className="scan-corners" />
                  </div>
                  <button
                    className="button wide"
                    onClick={camera ? stopCamera : startCamera}
                  >
                    {camera ? <X size={18} /> : <Camera size={18} />}{" "}
                    {camera ? "Stop camera" : "Open camera"}
                  </button>
                  <div className="divider">
                    <span>or enter the barcode</span>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      lookup();
                    }}
                    className="barcode-form"
                  >
                    <input
                      aria-label="Barcode number"
                      inputMode="numeric"
                      pattern="[0-9]{8,14}"
                      required
                      placeholder="e.g. 3017620422003"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                    />
                    <button className="button" disabled={busy}>
                      {busy ? "Looking…" : "Look up"}
                      <ArrowRight size={16} />
                    </button>
                  </form>
                  <p className="helper">
                    Guest scans use general nutrition data. Add a profile for
                    personal ingredient and preference checks.
                  </p>
                </section>
                <section className="panel result-panel">
                  {selected ? (
                    <>
                      <p className="eyebrow">YOUR LATEST FIND</p>
                      <h2>{selected.name}</h2>
                      <div
                        className={`assessment-box ${a?.verdict === "Avoid" ? "danger" : ""}`}
                      >
                        <ShieldCheck size={25} />
                        <strong>
                          {a?.verdict} — {a?.reason}
                        </strong>
                      </div>
                      <button
                        className="button white"
                        onClick={() => detail(selected)}
                      >
                        Why this result?
                        <ArrowRight size={18} />
                      </button>
                      <p className="helper">
                        Based on available label data. Always check the physical
                        pack for current ingredients.
                      </p>
                    </>
                  ) : (
                    <>
                      <Leaf size={38} />
                      <h2>A clearer choice starts here.</h2>
                      <p>
                        Your one-line assessment will appear after a successful
                        scan.
                      </p>
                      <div className="result-legend">
                        <span>Good fit</span>
                        <span>Limit</span>
                        <span>Avoid</span>
                        <span>Not enough information</span>
                      </div>
                    </>
                  )}
                </section>
              </div>
            </>
          )}
          {view === "profile" && (
            <>
              <PageTitle
                eyebrow="MADE A LITTLE MORE PERSONAL"
                title="Let’s find your food fit."
                description="Share what matters to you. Every health question is optional."
              />
              <div className="profile-grid">
                <section className="panel">
                  <h2>
                    <Heart size={22} /> Your taste
                  </h2>
                  <label>
                    Your name
                    <input
                      value={draft.name}
                      maxLength={80}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                      placeholder="What should we call you?"
                    />
                  </label>
                  <label>
                    Diet
                    <select
                      value={draft.diet}
                      onChange={(e) =>
                        setDraft({ ...draft, diet: e.target.value })
                      }
                    >
                      {["Any", "Vegetarian", "Vegan", "Gluten-free"].map(
                        (x) => (
                          <option key={x}>{x}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Favorite cuisines
                    <input
                      value={draft.cuisines.join(",")}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          cuisines: e.target.value.split(","),
                        })
                      }
                      placeholder="Indian, Japanese, Mediterranean"
                    />
                  </label>
                  <label>
                    Favorite foods & ingredients
                    <input
                      value={draft.favorites.join(",")}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          favorites: e.target.value.split(","),
                        })
                      }
                      placeholder="Lentils, avocado, grain bowls"
                    />
                  </label>
                  <label>
                    Foods you dislike
                    <input
                      value={draft.dislikes.join(",")}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          dislikes: e.target.value.split(","),
                        })
                      }
                      placeholder="Ingredients you’d rather skip"
                    />
                  </label>
                  <label>
                    Your goal
                    <select
                      value={draft.goal}
                      onChange={(e) =>
                        setDraft({ ...draft, goal: e.target.value })
                      }
                    >
                      {[
                        "Balanced eating",
                        "Less sugar",
                        "More protein",
                        "More fiber",
                        "Explore new foods",
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <p className="helper">
                    Separate multiple preferences with commas. Ratings help us
                    refine these over time.
                  </p>
                </section>
                <section className="panel">
                  <h2>
                    <ShieldCheck size={22} /> Your health preferences
                  </h2>
                  <p>
                    Choose any allergies to check against known ingredients and
                    traces.
                  </p>
                  <div className="chips">
                    {[
                      "Milk",
                      "Eggs",
                      "Fish",
                      "Peanuts",
                      "Soy",
                      "Gluten",
                      "Sesame",
                      "Tree nuts",
                      "Shellfish",
                    ].map((x) => (
                      <button
                        key={x}
                        className={
                          draft.allergies.includes(x) ? "chip on" : "chip"
                        }
                        onClick={() =>
                          setDraft({
                            ...draft,
                            allergies: draft.allergies.includes(x)
                              ? draft.allergies.filter((a) => a !== x)
                              : [...draft.allergies, x],
                          })
                        }
                      >
                        {draft.allergies.includes(x) ? (
                          <Check size={14} />
                        ) : (
                          <Plus size={14} />
                        )}{" "}
                        {x}
                      </button>
                    ))}
                  </div>
                  <p className="field-caption">Health context</p>
                  <div className="chips">
                    {[
                      "Diabetes",
                      "High blood pressure",
                      "High cholesterol",
                    ].map((x) => (
                      <button
                        className={
                          draft.conditions.includes(x) ? "chip on" : "chip"
                        }
                        key={x}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            conditions: draft.conditions.includes(x)
                              ? draft.conditions.filter((a) => a !== x)
                              : [...draft.conditions, x],
                          })
                        }
                      >
                        {x}
                      </button>
                    ))}
                  </div>
                  <p className="field-caption">Optional limits per serving</p>
                  <p className="helper">
                    Use targets from your own meal plan. We do not infer
                    treatment targets from a diagnosis or glucose reading.
                  </p>
                  <div className="limit-grid">
                    {(
                      ["sugar", "carbs", "sodium", "saturatedFat"] as const
                    ).map((k) => (
                      <label key={k}>
                        {
                          {
                            sugar: "Sugar (g)",
                            carbs: "Carbs (g)",
                            sodium: "Sodium (mg)",
                            saturatedFat: "Saturated fat (g)",
                          }[k]
                        }
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="No limit set"
                          value={draft.limits[k] ?? ""}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              limits: {
                                ...draft.limits,
                                [k]:
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </section>
              </div>
              <div className="profile-actions">
                <p>
                  <ShieldCheck size={16} />{" "}
                  {user
                    ? "Saved privately to your account."
                    : "Saved only in this browser until you sign in and choose to save."}
                </p>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => {
                    saveProfile();
                  }}
                >
                  {busy ? "Saving…" : "Save my preferences"}
                  <Check size={17} />
                </button>
              </div>
              <section className="panel glucose-panel">
                <h2>
                  <Activity size={22} /> Blood glucose journal
                </h2>
                <p>
                  Optional readings stay as context. Food recommendations do not
                  predict glucose responses or provide treatment advice.
                </p>
                <div className="glucose-form">
                  <label>
                    Reading
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={glucoseDraft.value}
                      onChange={(e) =>
                        setGlucoseDraft({
                          ...glucoseDraft,
                          value: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Unit
                    <select
                      value={glucoseDraft.unit}
                      onChange={(e) =>
                        setGlucoseDraft({
                          ...glucoseDraft,
                          unit: e.target.value,
                        })
                      }
                    >
                      <option>mg/dL</option>
                      <option>mmol/L</option>
                    </select>
                  </label>
                  <label>
                    Context
                    <select
                      value={glucoseDraft.timing}
                      onChange={(e) =>
                        setGlucoseDraft({
                          ...glucoseDraft,
                          timing: e.target.value,
                        })
                      }
                    >
                      <option value="fasting">Fasting</option>
                      <option value="before-meal">Before meal</option>
                      <option value="after-meal">After meal</option>
                    </select>
                  </label>
                  <label>
                    Measured at
                    <input
                      type="datetime-local"
                      value={glucoseDraft.timestamp}
                      onChange={(e) =>
                        setGlucoseDraft({
                          ...glucoseDraft,
                          timestamp: e.target.value,
                        })
                      }
                    />
                  </label>
                  <button className="button" onClick={saveGlucose}>
                    Add reading
                    <Plus size={16} />
                  </button>
                </div>
                {glucose.slice(0, 5).map((g, i) => (
                  <p className="journal-entry" key={i}>
                    {g.value} {g.unit} · {g.timing} ·{" "}
                    {new Date(g.timestamp).toLocaleString()}
                  </p>
                ))}
              </section>
              <section className="panel data-panel">
                <div>
                  <h3>Your data, your decision</h3>
                  <p>
                    Delete your profile, journal, scan history, ratings, and
                    device-saved foods.
                  </p>
                </div>
                <button
                  className="button white"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Delete all your saved Foodwise food and health data? This cannot be undone.",
                      )
                    )
                      deleteData();
                  }}
                >
                  Delete my data
                </button>
                {!user && (
                  <a
                    className="text-button"
                    href="/signin-with-chatgpt?return_to=%2F"
                    target="_top"
                  >
                    Sign in to save across devices <ArrowUpRight size={15} />
                  </a>
                )}
              </section>
            </>
          )}
          {view === "why" && (
            <>
              <button
                className="text-button back"
                onClick={() => navigate("discover")}
              >
                <ArrowLeft size={16} /> Back to discovery
              </button>
              {selected ? (
                <>
                  <PageTitle
                    eyebrow="BEHIND YOUR FOOD CHOICE"
                    title={selected.name}
                    description={
                      selected.restaurant
                        ? `${selected.restaurant} · ${selected.city}`
                        : selected.cuisine
                    }
                  />
                  <div className="detail-layout">
                    <section className="panel">
                      <div className="assessment-box">
                        <ShieldCheck size={28} />
                        <div>
                          <h2>{a?.verdict}</h2>
                          <p>{a?.reason}</p>
                        </div>
                      </div>
                      <h3>Why this result?</h3>
                      <ul className="explanation">
                        {a?.details.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                        <li>
                          {selected.ingredientsComplete
                            ? "Recipe or label ingredients are available. Check preparation and cross-contact."
                            : "Ingredients are incomplete. Allergy compatibility cannot be confirmed."}
                        </li>
                        <li>
                          {profile
                            ? "Checked against your saved profile."
                            : "General assessment: no personal health profile was applied."}
                        </li>
                      </ul>
                      <h3>Nutrition per {selected.serving}</h3>
                      <div className="nutrition-table">
                        {Object.entries({
                          energy: "Energy (kcal)",
                          sugar: "Sugar (g)",
                          carbs: "Carbohydrates (g)",
                          protein: "Protein (g)",
                          fiber: "Fiber (g)",
                          sodium: "Sodium (mg)",
                          saturatedFat: "Saturated fat (g)",
                        }).map(([k, label]) => (
                          <div key={k}>
                            <span>{label}</span>
                            <strong>
                              {selected.nutrients[
                                k as keyof Food["nutrients"]
                              ] !== undefined
                                ? Math.round(
                                    selected.nutrients[
                                      k as keyof Food["nutrients"]
                                    ]! * 10,
                                  ) / 10
                                : "Unknown"}
                            </strong>
                          </div>
                        ))}
                      </div>
                      <h3>Ingredients & allergens</h3>
                      <p>
                        {selected.ingredients.join(", ") || "Not available"}
                      </p>
                      <p>
                        Known allergens or traces:{" "}
                        {selected.allergens.join(", ") ||
                          "None recorded; absence is not a guarantee."}
                      </p>
                      <a
                        href={selected.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="source-link"
                      >
                        {selected.source}
                        <ArrowUpRight size={15} />
                      </a>
                      {selected.verified && (
                        <p className="helper">
                          Source checked {selected.verified}. Photos are
                          illustrative.
                        </p>
                      )}
                    </section>
                    <aside>
                      <div className="panel">
                        <h3>Did you find a new favorite?</h3>
                        <p>Tell us how it tasted after you’ve tried it.</p>
                        <button
                          className="button wide"
                          onClick={() => {
                            setRatingFood(selected);
                            setTried(false);
                          }}
                        >
                          <Star size={17} /> Rate this food
                        </button>
                        <button
                          className="button white wide"
                          onClick={() => favorite(selected.id)}
                        >
                          <Heart size={17} />
                          {saved.includes(selected.id)
                            ? "Remove from saved"
                            : "Save for later"}
                        </button>
                      </div>
                      <div className="panel">
                        <h3>Explore another option</h3>
                        {rank(foods, profile, ratings)
                          .filter(
                            (x) =>
                              x.food.id !== selected.id &&
                              x.food.kind === selected.kind,
                          )
                          .slice(0, 3)
                          .map(({ food }) => (
                            <button
                              key={food.id}
                              className="alternative"
                              onClick={() => detail(food)}
                            >
                              {food.name}
                              <ChevronRight size={16} />
                            </button>
                          ))}
                      </div>
                    </aside>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <Info />
                  <h2>Choose a food first</h2>
                  <p>
                    Scan a product or open a recommendation to see its
                    explanation.
                  </p>
                  <button className="button" onClick={() => navigate("scan")}>
                    Scan a barcode
                  </button>
                </div>
              )}
            </>
          )}
          {(view === "favorites" || view === "history") && (
            <>
              <PageTitle
                eyebrow="YOUR FOOD JOURNEY"
                title={
                  view === "favorites"
                    ? "A few things you love."
                    : "Every choice tells a story."
                }
                description={
                  view === "favorites"
                    ? "Saved on this device for your next meal or shop."
                    : "Your scanned products, taste feedback, and glucose journal."
                }
              />
              {view === "favorites" ? (
                <div className="saved-list">
                  {foods
                    .filter((f) => saved.includes(f.id))
                    .map((f) => (
                      <button
                        className="panel saved-row"
                        key={f.id}
                        onClick={() => detail(f)}
                      >
                        <Heart size={20} />
                        <div>
                          <h3>{f.name}</h3>
                          <p>
                            {f.cuisine} · {f.serving}
                          </p>
                        </div>
                        <ArrowRight size={18} />
                      </button>
                    ))}
                  {!saved.length && (
                    <Empty text="Tap the heart on any food to save it here." />
                  )}
                </div>
              ) : (
                <div className="profile-grid">
                  <section className="panel">
                    <h2>Recent scans</h2>
                    {scans.map((f) => (
                      <button
                        className="alternative"
                        key={f.id}
                        onClick={() => detail(f)}
                      >
                        {f.name}
                        <ChevronRight size={16} />
                      </button>
                    ))}
                    {!scans.length && (
                      <Empty text="Your next discovery starts with a barcode." />
                    )}
                  </section>
                  <section className="panel">
                    <h2>Explored recommendations</h2>
                    {recommendationHistory.slice(0, 10).map((r, index) => (
                      <button
                        className="alternative"
                        key={r.foodId + index}
                        onClick={() => {
                          const food = foods.find((f) => f.id === r.foodId);
                          if (food) detail(food);
                        }}
                      >
                        {r.name}
                        <ChevronRight size={16} />
                      </button>
                    ))}
                    {!recommendationHistory.length && (
                      <p>No recommendation details explored yet.</p>
                    )}
                    <h2 className="spaced">Your taste notes</h2>
                    {ratings.map((r) => (
                      <p className="journal-entry" key={r.foodId}>
                        {foods.find((f) => f.id === r.foodId)?.name || r.foodId}
                        <span>
                          {"★".repeat(r.rating)}
                          {"☆".repeat(5 - r.rating)}
                        </span>
                      </p>
                    ))}
                    {!ratings.length && (
                      <Empty text="Rate a food after trying it. We’ll take note." />
                    )}
                    <h3 className="spaced">Glucose journal</h3>
                    {glucose.slice(0, 10).map((g, i) => (
                      <p key={i} className="journal-entry">
                        {g.value} {g.unit}
                        <span>{g.timing}</span>
                      </p>
                    ))}
                    {!glucose.length && <p>No readings recorded.</p>}
                  </section>
                </div>
              )}
            </>
          )}
          {view === "model" && (
            <>
              <PageTitle
                eyebrow="A LITTLE TRANSPARENCY"
                title="Know what’s behind the recommendation."
                description="Nutrition information, personal preferences, and honest limits."
              />
              <div className="profile-grid">
                <section className="panel">
                  <h2>Nutrition-grade model</h2>
                  <span className="pill">
                    {model?.status === "trained"
                      ? "Evaluated model"
                      : "Training pending"}
                  </span>
                  <p>
                    {model?.status === "trained"
                      ? `Model ${model.version}. Metrics below describe held-out nutrition-grade prediction, not health outcomes.`
                      : "No evaluated model artifact is installed. Accuracy and macro F1 are unavailable until real-data training and held-out evaluation complete."}
                  </p>
                  <div className="metric-grid">
                    <div>
                      <strong>
                        {model?.metrics
                          ? `${(model.metrics.accuracy * 100).toFixed(1)}%`
                          : "—"}
                      </strong>
                      <span>Test accuracy</span>
                    </div>
                    <div>
                      <strong>
                        {model?.metrics
                          ? model.metrics.macroF1.toFixed(3)
                          : "—"}
                      </strong>
                      <span>Macro F1</span>
                    </div>
                    <div>
                      <strong>
                        {model?.metrics ? model.metrics.samples.test : "—"}
                      </strong>
                      <span>Test samples</span>
                    </div>
                  </div>
                  {model?.metrics && (
                    <>
                      <p>
                        Majority-class baseline:{" "}
                        {(model.metrics.baselineAccuracy * 100).toFixed(1)}%.
                        Dataset: {model.metrics.samples.total} products;{" "}
                        {model.metrics.samples.train} train,{" "}
                        {model.metrics.samples.validation} validation,{" "}
                        {model.metrics.samples.test} test.
                      </p>
                      <div className="nutrition-table">
                        {["a", "b", "c", "d", "e"].map((g) => (
                          <div key={g}>
                            <span>
                              Grade {g.toUpperCase()} ·{" "}
                              {model.metrics!.perGrade[g]?.support} test
                              products
                            </span>
                            <strong>
                              F1{" "}
                              {model.metrics!.perGrade[g]?.["f1-score"].toFixed(
                                3,
                              )}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <p>
                    When a product has an Open Food Facts nutrition grade, we
                    use that source grade. We never label it as our model’s
                    prediction.
                  </p>
                </section>
                <section className="panel">
                  <h2>How your recommendations work</h2>
                  <ol className="explanation">
                    <li>
                      Check known ingredient conflicts and your recorded
                      restrictions.
                    </li>
                    <li>
                      Compare available per-serving nutrition with your chosen
                      limits.
                    </li>
                    <li>Use source nutrition grades when available.</li>
                    <li>
                      Rank eligible foods using cuisines, favorites, and
                      tried-food ratings.
                    </li>
                  </ol>
                  <p>
                    Model accuracy measures nutrition-grade prediction, not
                    clinical safety. Blood glucose readings do not create a
                    medically validated food verdict.
                  </p>
                </section>
                <section className="panel">
                  <h2>Where the data comes from</h2>
                  <p>
                    <a
                      href="https://world.openfoodfacts.org"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Food Facts
                    </a>
                    : community-contributed product labels and nutrition grades,
                    licensed under ODbL. Product images retain their source
                    licenses.
                  </p>
                  <p>
                    <a
                      href="https://medlineplus.gov/recipes/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      MedlinePlus / Food Hero
                    </a>
                    , Nutrition.gov, and University of Illinois Extension:
                    sourced recipes with published nutrition where available.
                    Recipe values are estimates for the linked formulation;
                    photos are illustrative.
                  </p>
                  <p>
                    Restaurant entries link to official menus. We show unknown
                    nutrition until a dish’s exact formulation is verified.
                  </p>
                </section>
                <section className="panel">
                  <h2>Your health, your choice</h2>
                  <p>
                    Personal health data is optional. Guest profiles stay on the
                    device; account records are private to the signed-in user.
                  </p>
                  <p>
                    Food formulations, portion sizes, and restaurant preparation
                    can change. Missing information stays unknown.
                  </p>
                  <button
                    className="button white"
                    onClick={() => navigate("profile")}
                  >
                    Manage my profile <ArrowRight size={17} />
                  </button>
                </section>
              </div>
            </>
          )}
          <footer>
            <a className="footer-brand" href="/">
              foodwise.
            </a>
            <span>A little better, every bite.</span>
            <button onClick={() => navigate("model")}>
              Our data & approach <ArrowUpRight size={13} />
            </button>
          </footer>
        </main>
      </div>
      {ratingFood && (
        <div className="modal-overlay" onClick={() => setRatingFood(null)}>
          <section
            className="rating-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rating-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal icon-button"
              aria-label="Close rating"
              onClick={() => setRatingFood(null)}
            >
              <X />
            </button>
            <span className="step-icon peach">
              <Heart size={26} />
            </span>
            <p className="eyebrow">YOUR TASTE MATTERS</p>
            <h2 id="rating-title">How was that first bite?</h2>
            <p>{ratingFood.name}</p>
            <label className="tried-check">
              <input
                type="checkbox"
                checked={tried}
                onChange={(e) => setTried(e.target.checked)}
              />{" "}
              I’ve tried this food
            </label>
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  disabled={!tried || busy}
                  aria-label={`Rate ${n} out of 5`}
                  onClick={() => rate(n)}
                >
                  <Star size={32} />
                  <small>{n}</small>
                </button>
              ))}
            </div>
            <p className="helper">1 = not for me · 5 = loved every bite</p>
          </section>
        </div>
      )}
    </div>
  );
}
function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty-state compact">
      <Leaf size={28} />
      <p>{text}</p>
    </div>
  );
}
