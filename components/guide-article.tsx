import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { headingId } from "@/lib/guide";

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

// 본문 h2 에 목차와 같은 id 를 심는다. 나머지 요소는 .vc-markdown 스타일을 그대로 쓴다.
export function GuideArticleBody({ body }: { body: string }) {
  return (
    <div className="vc-markdown vc-guide">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => <h2 id={headingId(textOf(children))}>{children}</h2>,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) => {
            const internal = !href || href.startsWith("#") || href.startsWith("/");

            return internal ? (
              <a href={href} className="text-primary hover:underline">
                {children}
              </a>
            ) : (
              <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                {children}
              </a>
            );
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
