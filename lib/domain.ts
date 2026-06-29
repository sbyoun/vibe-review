export const projectStatuses = [
  "idea",
  "prototype",
  "building",
  "needs_feedback",
  "iterating",
  "shipped",
  "parked",
  "archived",
] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const projectVisibilities = ["private", "unlisted", "public"] as const;
export type ProjectVisibility = (typeof projectVisibilities)[number];

export const feedbackTypes = [
  "first_impression",
  "ux_ui",
  "bug",
  "mobile_usability",
  "feature_idea",
  "business",
  "code_structure",
  "security_data_risk",
] as const;

export type FeedbackType = (typeof feedbackTypes)[number];

export const feedbackImplementationStatuses = [
  "unreviewed",
  "planned",
  "implemented",
  "rejected",
  "later",
] as const;

export type FeedbackImplementationStatus = (typeof feedbackImplementationStatuses)[number];

export const feedbackClaimStatuses = ["claimed", "submitted", "cancelled", "expired"] as const;
export type FeedbackClaimStatus = (typeof feedbackClaimStatuses)[number];

export const statusLabel: Record<ProjectStatus, string> = {
  idea: "Idea",
  prototype: "Prototype",
  building: "Building",
  needs_feedback: "Needs feedback",
  iterating: "Iterating",
  shipped: "Shipped",
  parked: "Parked",
  archived: "Archived",
};

export const statusTone: Record<ProjectStatus, string> = {
  idea: "border-slate-200 bg-slate-50 text-slate-700",
  prototype: "border-cyan-200 bg-cyan-50 text-cyan-800",
  building: "border-amber-200 bg-amber-50 text-amber-800",
  needs_feedback: "border-teal-200 bg-teal-50 text-teal-800",
  iterating: "border-indigo-200 bg-indigo-50 text-indigo-800",
  shipped: "border-emerald-200 bg-emerald-50 text-emerald-800",
  parked: "border-zinc-200 bg-zinc-50 text-zinc-700",
  archived: "border-stone-200 bg-stone-50 text-stone-700",
};

export const feedbackTypeLabel: Record<FeedbackType, string> = {
  first_impression: "First impression",
  ux_ui: "UX/UI",
  bug: "Bug",
  mobile_usability: "Mobile usability",
  feature_idea: "Feature idea",
  business: "Business",
  code_structure: "Code/structure",
  security_data_risk: "Security/data risk",
};

export const feedbackClaimStatusLabel: Record<FeedbackClaimStatus, string> = {
  claimed: "Claimed",
  submitted: "Submitted",
  cancelled: "Cancelled",
  expired: "Expired",
};

export function formatShortDate(date: Date | string | null | undefined) {
  if (!date) {
    return "None";
  }

  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    typeof date === "string" ? new Date(date) : date,
  );
}

export function slugify(input: string) {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "untitled-project";
}

export function parseCommaList(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function coerceProjectStatus(value: FormDataEntryValue | null): ProjectStatus {
  return projectStatuses.includes(value as ProjectStatus) ? (value as ProjectStatus) : "idea";
}

export function coerceProjectVisibility(value: FormDataEntryValue | null): ProjectVisibility {
  return projectVisibilities.includes(value as ProjectVisibility)
    ? (value as ProjectVisibility)
    : "private";
}

export function coerceFeedbackType(value: FormDataEntryValue | null): FeedbackType {
  return feedbackTypes.includes(value as FeedbackType) ? (value as FeedbackType) : "first_impression";
}

export function coerceFeedbackTypes(values: FormDataEntryValue[]): FeedbackType[] {
  const selected = values.filter((value): value is FeedbackType =>
    feedbackTypes.includes(value as FeedbackType),
  );

  return selected.length > 0 ? selected : ["first_impression"];
}

export function coerceImplementationStatus(
  value: FormDataEntryValue | null,
): FeedbackImplementationStatus {
  return feedbackImplementationStatuses.includes(value as FeedbackImplementationStatus)
    ? (value as FeedbackImplementationStatus)
    : "unreviewed";
}

export function coerceInt(value: FormDataEntryValue | null, fallback: number, min: number, max: number) {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}
