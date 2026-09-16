// 사이트 절대 URL. sitemap·robots·가이드의 canonical/JSON-LD 가 같은 값을 써야 해서 한 곳에 둔다.
export function getSiteUrl() {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://vibe.foldalpha.com")
  ).replace(/\/$/, "");
}
