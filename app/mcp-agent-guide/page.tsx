import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Bot, ExternalLink, Terminal } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const mcpEndpoint = "https://vibe.foldalpha.com/mcp";

const publicDiscoveryPrompt = `You are working with vibearchive through MCP.

Use the remote MCP server:
${mcpEndpoint}

Rules:
- Do not use Playwright, browser clicking, or HTML scraping.
- Use MCP tools or HTTP JSON endpoints only.
- Public project browsing does not require login.

Task:
1. Call tools/list.
2. Use vibe.public_projects_list to find public projects. Start with limit=20, sort=updated, order=desc.
3. Pick relevant projects by title, summary, categoryTags, tools, owner.handle, and project.publicUrl.
4. For any project that needs detail, call vibe.public_projects_get with projectId.
5. Summarize the project, current feedback thread, and useful follow-up actions.`;

const publishProjectPrompt = `You are helping me publish a project to vibearchive through MCP.

Use the remote MCP server:
${mcpEndpoint}

Rules:
- Do not use browser automation.
- If I do not already have a token, create or request one through vibe.auth_register and vibe.auth_token.
- Email verification is not required for MCP token issuance.
- Before creating a project, call vibe.projects_list to avoid duplicates.
- Project summary and description support Markdown.
- If an image is available, send thumbnailUrl, images[0].url, or thumbnailBase64.

Task:
1. Authenticate with vibe.auth_token or the provided apiToken.
2. Inspect existing projects with vibe.projects_list.
3. Create or update the project with:
   - title
   - summary
   - Markdown description
   - visibility
   - projectType: owned or external
   - demoUrl/repoUrl/sourceUrl
   - tools
   - categoryTags
   - thumbnail/image if available
4. Return the publicUrl and the exact data you saved.`;

const feedbackPrompt = `You are reviewing or managing a vibearchive project through MCP.

Use the remote MCP server:
${mcpEndpoint}

Rules:
- Read public projects without login using vibe.public_projects_list and vibe.public_projects_get.
- To write feedback, authenticate first.
- Use comments as the project thread. Public comments are visible; private comments are self notes.
- Do not invent UI state from screenshots unless the project includes an image or reachable demo URL.

Task:
1. Read the target project with vibe.public_projects_get or vibe.projects_get if it is my own project.
2. Read existing thread context.
3. Write concise, specific feedback with vibe.feedback_create.
4. If this is my own project management note, use visibility=private and kind=self_note or kind=todo.
5. If this is public review feedback, use visibility=public and kind=feedback.`;

export default function McpAgentGuidePage() {
  return (
    <>
      <SiteNav />
      <main className="min-h-screen">
        <section className="mx-auto w-full max-w-[960px] px-3 py-6 md:px-6">
          <div className="mb-5">
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link href={"/discover" as Route}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to Discover
              </Link>
            </Button>
          </div>

          <header className="border-b border-border pb-5">
            <div className="flex items-center gap-2 text-sm font-semibold leading-5 text-primary">
              <Bot className="size-4" aria-hidden="true" />
              MCP for Coding Agents
            </div>
            <h1 className="mt-3 text-2xl font-semibold leading-8 text-foreground">
              vibearchive를 코딩 에이전트 작업 공간으로 쓰기
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Codex, Claude Code, Cursor 같은 에이전트에게 아래 프롬프트를 그대로 전달하면
              공개 프로젝트 탐색, 프로젝트 등록, 피드백 작성 흐름을 MCP 중심으로 처리할 수 있습니다.
            </p>
          </header>

          <div className="grid gap-8 py-6">
            <section className="grid gap-3 border-b border-border pb-6">
              <h2 className="text-base font-semibold leading-[22px]">Endpoint</h2>
              <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
                <p>
                  Remote MCP server:{" "}
                  <code className="border border-border bg-muted px-1.5 py-0.5 text-foreground">
                    {mcpEndpoint}
                  </code>
                </p>
                <p>
                  Public discovery tools:{" "}
                  <code className="text-foreground">vibe.public_projects_list</code>,{" "}
                  <code className="text-foreground">vibe.public_projects_get</code>
                </p>
                <p>
                  Authenticated write tools:{" "}
                  <code className="text-foreground">vibe.projects_create</code>,{" "}
                  <code className="text-foreground">vibe.projects_update</code>,{" "}
                  <code className="text-foreground">vibe.feedback_create</code>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href="/llms.txt">
                    <Terminal className="size-4" aria-hidden="true" />
                    llms.txt
                  </a>
                </Button>
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href="/api/mcp/schema">
                    <ExternalLink className="size-4" aria-hidden="true" />
                    API schema
                  </a>
                </Button>
              </div>
            </section>

            <PromptSection
              title="공개 프로젝트 탐색 프롬프트"
              description="로그인 없이 디스커버 목록을 읽고 관심 프로젝트를 요약할 때 사용합니다."
              prompt={publicDiscoveryPrompt}
            />

            <PromptSection
              title="프로젝트 등록 프롬프트"
              description="내 프로젝트 또는 외부 공개 프로젝트 리뷰 글을 MCP로 등록할 때 사용합니다."
              prompt={publishProjectPrompt}
            />

            <PromptSection
              title="피드백 작성 프롬프트"
              description="프로젝트 글의 댓글 스레드에 공개 피드백이나 비공개 셀프 노트를 남길 때 사용합니다."
              prompt={feedbackPrompt}
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function PromptSection({
  title,
  description,
  prompt,
}: {
  title: string;
  description: string;
  prompt: string;
}) {
  return (
    <section className="grid gap-3 border-b border-border pb-6 last:border-b-0">
      <div>
        <h2 className="text-base font-semibold leading-[22px] text-foreground">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <pre className="overflow-x-auto border border-border bg-muted p-4 text-xs leading-5 text-foreground">
        <code>{prompt}</code>
      </pre>
    </section>
  );
}
