export type ProjectStatus =
  | "idea"
  | "prototype"
  | "building"
  | "needs_feedback"
  | "iterating"
  | "shipped"
  | "parked"
  | "archived";

export type Project = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  status: ProjectStatus;
  visibility: "private" | "unlisted" | "public";
  tools: string[];
  feedbackFocus: string[];
  updatedAt: string;
  startedAt: string;
  shippedAt: string | null;
  demoUrl: string;
  repoUrl: string;
  feedbackCount: number;
  implementedCount: number;
  creditSpend: number;
};

export type FeedbackRequest = {
  id: string;
  projectSlug: string;
  projectTitle: string;
  title: string;
  status: "draft" | "open" | "fulfilled" | "expired" | "cancelled";
  requestedBy: string;
  creditCost: number;
  minFeedbackCount: number;
  receivedCount: number;
  deadlineAt: string;
  types: string[];
  focus: string;
};

export type FeedbackEntry = {
  id: string;
  projectSlug: string;
  author: string;
  role: string;
  type: string;
  rating: number;
  helpfulStatus: "unreviewed" | "helpful" | "not_helpful";
  implementedStatus: "unreviewed" | "planned" | "implemented" | "rejected" | "later";
  excerpt: string;
  createdAt: string;
};

export const workspaceOwner = {
  name: "Aya Morgan",
  handle: "aya",
  title: "Product engineer and solo AI app builder",
  bio: "Building small workflow tools in public and trading focused feedback with other makers.",
  primaryRoles: ["Product engineer", "Full-stack builder", "Design systems"],
  toolsUsed: ["Next.js", "Auth.js", "Drizzle", "Postgres", "S3-compatible storage"],
  feedbackCredits: 18,
  reputationScore: 86,
  responseRate: "91%",
  joinedAt: "2026-03-14",
};

export const workspaceProjects: Project[] = [
  {
    id: "project-launch-archive",
    slug: "launch-archive",
    title: "Launch Archive",
    summary: "A launch tracker for bookmarking shipped experiments and follow-up tasks.",
    description:
      "Launch Archive keeps demos, repos, post-launch notes, and feedback loops in one reviewable timeline for small product teams.",
    status: "needs_feedback",
    visibility: "public",
    tools: ["Next.js", "Drizzle", "Tailwind"],
    feedbackFocus: ["Mobile usability", "Information architecture", "First impression"],
    updatedAt: "2026-06-28",
    startedAt: "2026-06-10",
    shippedAt: null,
    demoUrl: "https://example.com/launch-archive",
    repoUrl: "https://github.com/example/launch-archive",
    feedbackCount: 8,
    implementedCount: 3,
    creditSpend: 6,
  },
  {
    id: "project-billing-notes",
    slug: "billing-notes",
    title: "Billing Notes",
    summary: "A compact ledger for annotating subscription invoices and renewal decisions.",
    description:
      "Billing Notes turns raw invoice history into renewal context with owner notes, spend tags, and approval state.",
    status: "iterating",
    visibility: "public",
    tools: ["React", "Postgres", "Auth.js"],
    feedbackFocus: ["Workflow clarity", "Copywriting", "Data trust"],
    updatedAt: "2026-06-26",
    startedAt: "2026-05-18",
    shippedAt: "2026-06-20",
    demoUrl: "https://example.com/billing-notes",
    repoUrl: "https://github.com/example/billing-notes",
    feedbackCount: 14,
    implementedCount: 9,
    creditSpend: 10,
  },
  {
    id: "project-research-desk",
    slug: "research-desk",
    title: "Research Desk",
    summary: "A workspace for turning user interviews into tagged product decisions.",
    description:
      "Research Desk organizes interview clips, evidence tags, and product questions into a shared decision backlog.",
    status: "building",
    visibility: "unlisted",
    tools: ["Next.js", "S3-compatible storage", "Drizzle"],
    feedbackFocus: ["Dashboard density", "Upload states", "Review flow"],
    updatedAt: "2026-06-24",
    startedAt: "2026-06-01",
    shippedAt: null,
    demoUrl: "https://example.com/research-desk",
    repoUrl: "https://github.com/example/research-desk",
    feedbackCount: 5,
    implementedCount: 1,
    creditSpend: 4,
  },
];

export const feedbackRequests: FeedbackRequest[] = [
  {
    id: "request-mobile-archive",
    projectSlug: "launch-archive",
    projectTitle: "Launch Archive",
    title: "Mobile archive flow review",
    status: "open",
    requestedBy: workspaceOwner.name,
    creditCost: 4,
    minFeedbackCount: 5,
    receivedCount: 3,
    deadlineAt: "2026-07-02",
    types: ["Mobile usability", "UX/UI"],
    focus: "Check whether the project card sequence still makes sense on a narrow screen.",
  },
  {
    id: "request-renewal-context",
    projectSlug: "billing-notes",
    projectTitle: "Billing Notes",
    title: "Renewal decision context",
    status: "open",
    requestedBy: workspaceOwner.name,
    creditCost: 3,
    minFeedbackCount: 3,
    receivedCount: 2,
    deadlineAt: "2026-07-04",
    types: ["Business", "First impression"],
    focus: "Judge whether the renewal risk signals are understandable without setup notes.",
  },
  {
    id: "request-upload-review",
    projectSlug: "research-desk",
    projectTitle: "Research Desk",
    title: "Upload state clarity",
    status: "draft",
    requestedBy: workspaceOwner.name,
    creditCost: 2,
    minFeedbackCount: 2,
    receivedCount: 0,
    deadlineAt: "2026-07-08",
    types: ["UX/UI", "Data trust"],
    focus: "Review empty, loading, and failed upload states before the next build pass.",
  },
];

export const feedbackEntries: FeedbackEntry[] = [
  {
    id: "feedback-archive-nav",
    projectSlug: "launch-archive",
    author: "Mina Cho",
    role: "Frontend reviewer",
    type: "Mobile usability",
    rating: 4,
    helpfulStatus: "helpful",
    implementedStatus: "planned",
    excerpt:
      "The archive list scans well, but the primary action competes with the status badge on mobile.",
    createdAt: "2026-06-28",
  },
  {
    id: "feedback-archive-empty",
    projectSlug: "launch-archive",
    author: "Jon Bell",
    role: "Founder",
    type: "First impression",
    rating: 5,
    helpfulStatus: "helpful",
    implementedStatus: "implemented",
    excerpt:
      "The empty state gives a clear next action and makes the first project feel lightweight.",
    createdAt: "2026-06-27",
  },
  {
    id: "feedback-billing-copy",
    projectSlug: "billing-notes",
    author: "Priya Nair",
    role: "Ops lead",
    type: "Business",
    rating: 4,
    helpfulStatus: "unreviewed",
    implementedStatus: "unreviewed",
    excerpt:
      "The risk labels are useful, but finance reviewers may need the original invoice terms nearby.",
    createdAt: "2026-06-26",
  },
];

export const creditLedger = [
  { id: "ledger-1", label: "Feedback on Billing Notes", amount: 2, date: "2026-06-28" },
  { id: "ledger-2", label: "Mobile archive flow request", amount: -4, date: "2026-06-27" },
  { id: "ledger-3", label: "Helpful review bonus", amount: 1, date: "2026-06-25" },
];

export const projectStatusEvents = [
  {
    id: "event-1",
    projectSlug: "launch-archive",
    label: "Moved to needs feedback",
    date: "2026-06-28",
  },
  {
    id: "event-2",
    projectSlug: "launch-archive",
    label: "Public profile card updated",
    date: "2026-06-27",
  },
  {
    id: "event-3",
    projectSlug: "billing-notes",
    label: "Feedback implementation marked complete",
    date: "2026-06-26",
  },
];

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

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

export function getPublicProfile(handle: string) {
  return handle === workspaceOwner.handle ? workspaceOwner : null;
}

export function getPublicProjects(handle: string) {
  if (!getPublicProfile(handle)) {
    return [];
  }

  return workspaceProjects.filter((project) => project.visibility === "public");
}

export function getPublicProject(handle: string, slug: string) {
  return getPublicProjects(handle).find((project) => project.slug === slug) ?? null;
}

export function getProjectFeedbackRequest(projectSlug: string) {
  return feedbackRequests.find((request) => request.projectSlug === projectSlug) ?? null;
}

export function getProjectFeedbackEntries(projectSlug: string) {
  return feedbackEntries.filter((entry) => entry.projectSlug === projectSlug);
}
