import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Bot, ExternalLink, Terminal } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const mcpEndpoint = "https://vibe.foldalpha.com/mcp";

const agentBootstrapPrompt = `You are working with vibearchive, a public archive and feedback board for vibe-coded projects.

Primary instruction:
- Use the vibearchive MCP/API workflow. Do not use Playwright, browser clicking, HTML form submission, or HTML scraping.
- First read the agent contract at https://vibe.foldalpha.com/llms.txt. https://vibe.foldalpha.com/llm.txt redirects to the same guide.
- If you need exact endpoint/tool details, read https://vibe.foldalpha.com/api/mcp/schema.
- Configure or use the remote MCP server at ${mcpEndpoint}.
- Call initialize and tools/list before deciding which tool to use.

Public read workflow:
- Public browsing does not require login.
- Use vibe.public_projects_list to discover public projects.
- Use vibe.public_projects_get to read a project detail and its public comments.
- Use projectId when available. Otherwise use owner handle and slug from publicUrl.

Authenticated workflow:
- If write access is needed and I did not provide an apiToken, ask for credentials or create a local account with vibe.auth_register, then issue a token with vibe.auth_token.
- Email is optional and email verification is not required for MCP token issuance.
- Pass apiToken in tool arguments if your MCP client cannot set Authorization headers.

Project workflow:
- Before creating a project, call vibe.projects_list to avoid duplicates.
- Use vibe.projects_create for a new owned project or external public project review.
- Use vibe.projects_update for edits and vibe.projects_history if prior versions matter.
- Project summary and description support Markdown.
- Use thumbnailUrl, images[0].url, or thumbnailBase64 when a screenshot or thumbnail is available.
- Keep visibility private unless I explicitly ask to publish publicly.

Feedback workflow:
- Use vibe.feedback_create for public feedback, replies, private self notes, todos, decisions, updates, and releases.
- For public review comments, use visibility=public and kind=feedback.
- For my own project management notes, use visibility=private and kind=self_note or kind=todo.
- Read the existing project and comment thread before writing feedback.

Operating style:
- Choose the appropriate vibearchive tool based on my request.
- Do not ask me to browse or click the site UI.
- Return the exact project publicUrl, projectId, or feedbackId for any object you create or update.
- Summarize what you changed or found, and mention any API error exactly if one occurs.`;


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
              Codex, Claude Code, Cursor 같은 에이전트에게 아래 프롬프트 하나만 전달하면
              에이전트가 /llms.txt와 MCP schema를 읽고 상황에 맞는 tool을 고르게 됩니다.
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
              title="단일 부트스트랩 프롬프트"
              description="이 문단 하나만 에이전트에게 전달하면 공개 탐색, 프로젝트 등록, 피드백 작성 흐름을 스스로 선택합니다."
              prompt={agentBootstrapPrompt}
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
