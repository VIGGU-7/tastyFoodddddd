"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Clock3,
  Droplet,
  Plus,
  ScanLine,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ActionLink,
  Button,
  EmptyState,
  Notice,
  PageHeading,
  SectionTitle,
} from "@/components/ui/primitives";
import type { SavedRecord } from "@/shared/contracts";
import { post } from "@/shared/api-client";
import { Modal } from "@/components/ui/modal";
export function Journal({ records }: { records: SavedRecord[] }) {
  const router = useRouter();
  const [tab, setTab] = useState("All activity");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const scans = records.filter((record) => record.kind === "scan");
  const ratings = records.filter((record) => record.kind === "rating");
  const glucose = records.filter((record) => record.kind === "glucose");
  const activity = records.filter(
    (record) =>
      record.kind !== "profile" &&
      (tab === "All activity" ||
        (tab === "Food scans" && record.kind === "scan") ||
        (tab === "Taste notes" && record.kind === "rating") ||
        (tab === "Glucose journal" && record.kind === "glucose")),
  );
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await post("/journal", {
        kind: "glucose",
        data: {
          value: Number(form.get("value")),
          unit: form.get("unit"),
          timing: form.get("timing"),
          timestamp: form.get("timestamp")
            ? new Date(String(form.get("timestamp"))).toISOString()
            : new Date().toISOString(),
        },
      });
      setOpen(false);
      setSaved(true);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn’t save this reading.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="LITTLE INSIGHTS, OVER TIME"
        title="Your food story, so far."
        description="The foods you’ve scanned, the tastes you’ve noted, and the context you choose to keep."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setOpen(true);
              setError("");
            }}
          >
            <Plus size={17} />
            Add glucose reading
          </Button>
        }
      />
      <div className="journal-stats">
        {[
          {
            icon: ScanLine,
            value: scans.length,
            label: "Food scans",
            note: "A little more informed",
          },
          {
            icon: Star,
            value: ratings.length,
            label: "Taste notes",
            note: "Your preferences, remembered",
          },
          {
            icon: Droplet,
            value: glucose.length,
            label: "Glucose readings",
            note: "Context you choose to track",
          },
        ].map(({ icon: Icon, value, label, note }) => (
          <div className="panel stat-card" key={label}>
            <span className="stat-icon">
              <Icon size={21} />
            </span>
            <div>
              <strong>
                {value}
                <span>{label}</span>
              </strong>
              <p>{note}</p>
            </div>
          </div>
        ))}
      </div>
      {saved && (
        <Notice tone="success">Reading saved to your private journal.</Notice>
      )}
      <section className="panel activity-panel">
        <SectionTitle number="01" title="Your recent activity">
          <span className="small-tag">PRIVATE TO YOU</span>
        </SectionTitle>
        <div
          className="filter-tabs journal-tabs"
          role="group"
          aria-label="Filter journal"
        >
          {["All activity", "Food scans", "Taste notes", "Glucose journal"].map(
            (value) => (
              <button
                key={value}
                className={tab === value ? "active" : ""}
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
              >
                {value}
              </button>
            ),
          )}
        </div>
        {activity.length ? (
          <ol className="activity-list">
            {activity.map((record) => (
              <li key={record.id}>
                <span className={`activity-icon activity-${record.kind}`}>
                  {record.kind === "scan" ? (
                    <ScanLine size={20} />
                  ) : record.kind === "rating" ? (
                    <Star size={20} />
                  ) : record.kind === "glucose" ? (
                    <Droplet size={20} />
                  ) : (
                    <BookOpen size={20} />
                  )}
                </span>
                <div>
                  <span className="eyebrow">
                    {record.kind === "scan"
                      ? "FOOD SCAN"
                      : record.kind === "rating"
                        ? "TASTE NOTE"
                        : record.kind === "glucose"
                          ? "GLUCOSE READING"
                          : "FOOD IDEA"}
                  </span>
                  <strong>
                    {record.kind === "scan"
                      ? record.payload.food.name
                      : record.kind === "rating"
                        ? `${record.payload.foodId.replaceAll("-", " ")} · ${record.payload.rating}/5`
                        : record.kind === "glucose"
                          ? `${record.payload.value} ${record.payload.unit}`
                          : record.payload.name}
                  </strong>
                  <p>
                    {record.kind === "scan"
                      ? record.payload.assessment.reason
                      : record.kind === "rating"
                        ? "Tried and rated by you."
                        : record.kind === "glucose"
                          ? record.payload.timing.replaceAll("-", " ")
                          : "Food idea viewed."}
                  </p>
                </div>
                <div className="activity-right">
                  <time dateTime={new Date(record.createdAt).toISOString()}>
                    {new Date(record.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      timeZone: "UTC",
                    })}
                  </time>
                  {record.kind === "scan" && (
                    <Link
                      href={`/why/${record.payload.food.id}`}
                      aria-label={`View ${record.payload.food.name}`}
                    >
                      <ArrowUpRight size={18} />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            icon={<BookOpen size={30} />}
            title="Your next chapter starts with a scan."
            description="Saved scans, tried-food ratings, and optional glucose readings will appear here."
            action={
              <ActionLink href="/scan">
                Scan your first food <ScanLine size={17} />
              </ActionLink>
            }
          />
        )}
      </section>
      <div className="journal-context">
        <span>
          <Clock3 size={20} />
        </span>
        <div>
          <h3>Context, without conclusions.</h3>
          <p>
            Glucose readings are a journal, not a diagnosis. They don’t predict
            your response to food or change food grades. Use your own care plan
            for decisions.
          </p>
        </div>
      </div>
      <Modal
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
        title="A little health context."
        description="Record a glucose reading for your own journal. This does not set treatment targets or determine food safety."
      >
        <form onSubmit={save}>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="glucose-value">Reading</label>
              <input
                id="glucose-value"
                name="value"
                type="number"
                min="0.1"
                max="2000"
                step="any"
                placeholder="e.g. 100"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="glucose-unit">Unit</label>
              <select id="glucose-unit" name="unit">
                <option>mg/dL</option>
                <option>mmol/L</option>
              </select>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="glucose-timing">Meal context</label>
            <select id="glucose-timing" name="timing">
              <option value="fasting">Fasting</option>
              <option value="before-meal">Before a meal</option>
              <option value="after-meal">After a meal</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="glucose-time">
              Time <span>Leave blank for now</span>
            </label>
            <input id="glucose-time" name="timestamp" type="datetime-local" />
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              Save reading <Check size={17} />
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
