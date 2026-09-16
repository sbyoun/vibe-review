// 가이드 글 로더 — content/guide/*.md 를 파일 그대로 읽는다.
// 글을 늘리는 일은 .md 파일 하나를 떨어뜨리는 것으로 끝난다.
// 목록 페이지·사이트맵·/guide/index.json·/guide/{slug}/doc.md 가 전부 여기서 나온다.
import fs from "node:fs";
import path from "node:path";

export type GuideMeta = {
  slug: string;
  title: string;
  description: string;
  /** YYYY-MM-DD. 사이트맵 lastmod 로 그대로 쓴다 — 요청 시각을 쓰지 않는다. */
  date: string;
  category: string;
  readMinutes: number;
};

export type GuideHeading = { id: string; text: string };
export type GuideArticle = GuideMeta & { body: string; headings: GuideHeading[] };

const GUIDE_DIR = path.join(process.cwd(), "content", "guide");
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** 목차 링크와 본문 제목이 같은 id 를 만들어야 해서 양쪽이 이 함수를 쓴다. */
export function headingId(text: string) {
  const id = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return id || "section";
}

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const meta: Record<string, string> = {};

  if (!match) {
    return { meta, body: raw };
  }

  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator > 0) {
      meta[line.slice(0, separator).trim()] = line
        .slice(separator + 1)
        .trim()
        .replace(/^"(.*)"$/, "$1");
    }
  }

  return { meta, body: raw.slice(match[0].length) };
}

// 코드펜스 안의 '## ' 은 제목이 아니다.
function collectHeadings(body: string): GuideHeading[] {
  const headings: GuideHeading[] = [];
  let insideFence = false;

  for (const line of body.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      insideFence = !insideFence;
      continue;
    }
    if (insideFence) continue;

    const matched = line.match(/^##\s+(.+?)\s*$/);
    if (matched) {
      headings.push({ id: headingId(matched[1]), text: matched[1].replace(/[`*_]/g, "") });
    }
  }

  return headings;
}

function loadArticle(slug: string, raw: string): GuideArticle {
  const { meta, body } = parseFrontmatter(raw);
  const trimmed = body.trim();
  const readMinutes = Number(meta.readMinutes);

  return {
    slug,
    title: meta.title ?? slug,
    description: meta.description ?? "",
    date: meta.date ?? "",
    category: meta.category ?? "기록",
    readMinutes: Number.isFinite(readMinutes) && readMinutes > 0 ? readMinutes : 5,
    body: trimmed,
    headings: collectHeadings(trimmed),
  };
}

/** 최신 글이 위로 — 날짜 내림차순. */
export function getGuideArticles(): GuideArticle[] {
  let files: string[] = [];

  try {
    files = fs.readdirSync(GUIDE_DIR).filter((file) => file.endsWith(".md"));
  } catch {
    return [];
  }

  return files
    .map((file) =>
      loadArticle(file.replace(/\.md$/, ""), fs.readFileSync(path.join(GUIDE_DIR, file), "utf8")),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export function getGuideArticle(slug: string): GuideArticle | null {
  if (!SLUG_PATTERN.test(slug)) {
    return null;
  }

  const filePath = path.join(GUIDE_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return loadArticle(slug, fs.readFileSync(filePath, "utf8"));
}
