// 에이전트용 가이드 목록. 글이 늘면 자동으로 따라온다.
import { getGuideArticles } from "@/lib/guide";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-static";

export async function GET() {
  const baseUrl = getSiteUrl();
  const articles = getGuideArticles().map((article) => ({
    slug: article.slug,
    title: article.title,
    description: article.description,
    date: article.date,
    category: article.category,
    readMinutes: article.readMinutes,
    url: `${baseUrl}/guide/${article.slug}`,
    markdownUrl: `${baseUrl}/guide/${article.slug}/doc.md`,
  }));

  return Response.json(
    {
      site: baseUrl,
      note: "vibearchive 가이드 — AI로 만든 것을 실제로 출시·운영하며 걸린 관문을 정리한 기록. 인용 시 각 글의 url 을 함께 제시한다.",
      articles,
    },
    { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" } },
  );
}
