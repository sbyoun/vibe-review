import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { GuideArticleBody } from "@/components/guide-article";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { getGuideArticle } from "@/lib/guide";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

type GuideArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: GuideArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getGuideArticle(slug);

  if (!article) {
    return { title: "가이드 | vibearchive" };
  }

  const url = `${getSiteUrl()}/guide/${article.slug}`;
  const title = `${article.title} | vibearchive`;

  return {
    title,
    description: article.description,
    alternates: { canonical: url, types: { "text/markdown": `${url}/doc.md` } },
    openGraph: {
      title,
      description: article.description,
      type: "article",
      url,
      locale: "ko_KR",
      publishedTime: article.date,
    },
  };
}

export default async function GuideArticlePage({ params }: GuideArticlePageProps) {
  const { slug } = await params;
  const article = getGuideArticle(slug);

  if (!article) {
    notFound();
  }

  const url = `${getSiteUrl()}/guide/${article.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.date,
    inLanguage: "ko",
    author: { "@type": "Organization", name: "vibearchive" },
    publisher: { "@type": "Organization", name: "vibearchive", url: getSiteUrl() },
    mainEntityOfPage: url,
  };

  return (
    <>
      <SiteNav />
      <main className="min-h-screen" lang="ko">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <article className="mx-auto w-full max-w-[860px] px-3 py-6 md:px-6">
          <div className="mb-5">
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link href={"/guide" as Route}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                가이드 목록
              </Link>
            </Button>
          </div>

          <header className="border-b border-border pb-5">
            <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted-foreground">
              <span className="border border-border bg-muted px-1.5 py-0.5">{article.category}</span>
              <span>{article.date}</span>
              <span>· 약 {article.readMinutes}분</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold leading-8 text-foreground">{article.title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{article.description}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              기계 판독:{" "}
              <a href={`/guide/${article.slug}/doc.md`} className="text-primary hover:underline">
                Markdown 원문
              </a>
            </p>
          </header>

          {article.headings.length > 1 && (
            <nav aria-label="목차" className="mt-6 border border-border bg-muted p-4">
              <p className="text-sm font-semibold leading-5 text-foreground">목차</p>
              <ol className="mt-2 grid gap-1 text-sm leading-6 text-muted-foreground">
                {article.headings.map((heading) => (
                  <li key={heading.id}>
                    <a href={`#${heading.id}`} className="hover:text-primary hover:underline">
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="py-6">
            <GuideArticleBody body={article.body} />
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
