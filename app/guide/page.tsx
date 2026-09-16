import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { BookText } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getGuideArticles } from "@/lib/guide";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const TITLE = "가이드 | vibearchive";
const DESCRIPTION =
  "AI로 만든 것을 실제로 세상에 내보내는 과정에서 걸린 관문을 기록으로 남긴다. 개발이 아니라 출시·운영에서 시간이 드는 지점을 다룬다.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${getSiteUrl()}/guide` },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", url: `${getSiteUrl()}/guide` },
};

export default function GuideIndexPage() {
  const articles = getGuideArticles();
  const baseUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "vibearchive 가이드",
    description: DESCRIPTION,
    url: `${baseUrl}/guide`,
    inLanguage: "ko",
    hasPart: articles.map((article) => ({
      "@type": "Article",
      headline: article.title,
      description: article.description,
      url: `${baseUrl}/guide/${article.slug}`,
      datePublished: article.date,
      inLanguage: "ko",
    })),
  };

  return (
    <>
      <SiteNav />
      <main className="min-h-screen" lang="ko">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <section className="mx-auto w-full max-w-[860px] px-3 py-6 md:px-6">
          <header className="border-b border-border pb-5">
            <div className="flex items-center gap-2 text-sm font-semibold leading-5 text-primary">
              <BookText className="size-4" aria-hidden="true" />
              Guide
            </div>
            <h1 className="mt-3 text-2xl font-semibold leading-8 text-foreground">
              만드는 것보다 내보내는 것이 오래 걸린다
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{DESCRIPTION}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              기계 판독용 목록:{" "}
              <a href="/guide/index.json" className="text-primary hover:underline">
                /guide/index.json
              </a>
            </p>
          </header>

          <div className="grid gap-3 py-6">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/guide/${article.slug}` as Route}
                className="block border border-border bg-background p-5 transition hover:border-primary"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted-foreground">
                  <span className="border border-border bg-muted px-1.5 py-0.5">{article.category}</span>
                  <span>{article.date}</span>
                  <span>· 약 {article.readMinutes}분</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold leading-7 text-foreground">{article.title}</h2>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{article.description}</p>
              </Link>
            ))}
            {articles.length === 0 && (
              <p className="text-sm leading-6 text-muted-foreground">아직 올린 글이 없습니다.</p>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
