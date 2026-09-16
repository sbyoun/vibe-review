// 글 원문 마크다운. 인용봇·에이전트가 HTML 을 긁지 않고 본문만 가져가는 경로다.
import { getGuideArticle, getGuideArticles } from "@/lib/guide";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getGuideArticles().map((article) => ({ slug: article.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getGuideArticle(slug);

  if (!article) {
    return new Response("not found", { status: 404 });
  }

  const url = `${getSiteUrl()}/guide/${article.slug}`;
  const markdown = [
    `# ${article.title}`,
    `- 출처: vibearchive 가이드 (${url}) · 게시: ${article.date} · 분류: ${article.category}`,
    "",
    article.body,
  ].join("\n");

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=3600",
    },
  });
}
