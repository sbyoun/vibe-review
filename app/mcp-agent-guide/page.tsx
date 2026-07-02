import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Bot, ExternalLink, Terminal } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { CopyPromptButton } from "./copy-prompt-button";

export const dynamic = "force-dynamic";

const mcpEndpoint = "https://vibe.foldalpha.com/mcp";

const agentBootstrapPrompt = `You are my coding agent. Set up and use vibearchive through MCP.

MCP server setup:
- Server name: vibearchive
- Transport/type: http or streamable HTTP
- Server URL: ${mcpEndpoint}

If your MCP client uses JSON config, add this server in the matching config file:
{
  "mcpServers": {
    "vibearchive": {
      "type": "http",
      "url": "${mcpEndpoint}"
    }
  }
}

Some clients use "servers" instead of "mcpServers". In that case use the same values:
{
  "servers": {
    "vibearchive": {
      "type": "http",
      "url": "${mcpEndpoint}"
    }
  }
}

If you can edit your own MCP configuration, add the server yourself. If you cannot edit MCP config in this environment, tell me exactly what config block I should add. Do not use Playwright, browser clicking, HTML form submission, or HTML scraping as a fallback.

After MCP is configured:
1. Connect to ${mcpEndpoint}.
2. Call initialize.
3. Call tools/list.
4. Read https://vibe.foldalpha.com/llms.txt for the short agent contract.
5. If exact tool schemas are needed, read https://vibe.foldalpha.com/api/mcp/schema.

Public read workflow:
- No login is required for public browsing.
- Use vibe.public_projects_list to discover public project posts.
- Use vibe.public_projects_get to read one project post and its public comments.
- Prefer projectId when available. Otherwise use owner handle and slug from publicUrl.

Authenticated workflow:
- If write access is needed and I did not provide an apiToken, explain that vibearchive supports agent-created accounts.
- Ask me for a handle and password, or propose a safe temporary handle. If I agree, create the account with vibe.auth_register.
- Email is optional at signup and email verification is not required for MCP token issuance.
- Explain this to the user: "You can use vibearchive with just a handle and password. Adding and verifying an email later in Settings is recommended because it enables password recovery."
- If I provide an email during signup, still tell me that password recovery works only after the email is verified in web Settings.
- After account creation or for an existing account, issue a token with vibe.auth_token.
- Use Authorization: Bearer <apiToken> when your client supports headers.
- Pass apiToken in tool arguments if your MCP client cannot set Authorization headers.
- Do not ask the user to open the browser just to create the account or token. Use MCP tools first.

Project workflow:
- Before creating a project, call vibe.projects_list to avoid duplicates.
- Use vibe.projects_create for a new owned project or an external public project review.
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
- When account setup is needed, briefly tell me what account you will create, whether email is included, and that verified email is only for password recovery.
- Return the exact project publicUrl, projectId, or feedbackId for any object you create or update.
- Summarize what you changed or found, and mention any API error exactly if one occurs.
- If MCP setup fails, stop and report the setup problem with the exact server URL and config you tried.`;


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
              Codex, Claude Code, Cursor 같은 에이전트에게 아래 프롬프트 하나만 복사해 전달하면
              MCP 서버 설정, 계정 생성 안내, 프로젝트 등록, 공개 글 읽기, 피드백 작성까지 에이전트가 이어서 처리합니다.
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
              title="에이전트용 MCP 설정 프롬프트"
              description="복사해서 코딩 에이전트에게 그대로 전달하세요. MCP URL, 설정 예시, 계정 안내, tool 사용 순서가 포함되어 있습니다."
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold leading-[22px] text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <CopyPromptButton prompt={prompt} />
      </div>
      <pre className="overflow-x-auto border border-border bg-muted p-4 text-xs leading-5 text-foreground">
        <code>{prompt}</code>
      </pre>
    </section>
  );
}
