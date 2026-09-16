import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

const DISALLOW = [
  "/api/",
  "/dashboard/",
  "/settings/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

// 생성모델 학습 전용 크롤러 — 전면 차단 (2026-09-15).
// 검색·인용 노출과는 독립이다: OpenAI는 "allow OAI-SearchBot … while disallowing GPTBot"을 문서에 예로 들고,
// Google-Extended는 "does not impact a site's inclusion in Google Search",
// Applebot-Extended는 크롤하지 않고 학습 사용 여부만 정한다.
const TRAINING_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "CCBot",
  "Bytespider",
  "meta-externalagent",
  "Meta-ExternalAgent",
  "Omgilibot",
  "Diffbot",
  "Timpibot",
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...TRAINING_BOTS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
