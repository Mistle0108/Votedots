import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { cn } from "@/shared/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export default function MarkdownContent({
  content,
  className,
}: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "text-left text-sm leading-7 text-[#4b5563] [&_a]:font-medium [&_a]:text-[#111827] [&_a]:underline [&_a]:decoration-[#d1d5db] [&_a]:underline-offset-4 [&_blockquote]:mb-5 [&_blockquote]:border-l-2 [&_blockquote]:border-[#d1d5db] [&_blockquote]:pl-4 [&_blockquote]:text-[#6b7280] [&_code]:rounded-md [&_code]:bg-[#f3f4f6] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.92em] [&_code]:text-[#111827] [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-[#111827] [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#111827] [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[#111827] [&_hr]:my-6 [&_hr]:border-[#d1d5db] [&_li]:pl-1 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_p]:mb-4 [&_p:last-child]:mb-0 [&_pre]:thin-scrollbar [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[#f3f4f6] [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-[#111827] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_strong]:font-semibold [&_strong]:text-[#111827] [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          h1: ({ node: _node, ...props }) => (
            <h1
              style={{ color: "#111827" }}
              {...props}
            />
          ),
          h2: ({ node: _node, ...props }) => (
            <h2
              style={{ color: "#111827" }}
              {...props}
            />
          ),
          h3: ({ node: _node, ...props }) => (
            <h3
              style={{ color: "#111827" }}
              {...props}
            />
          ),
          p: ({ node: _node, ...props }) => (
            <p
              style={{ color: "#4b5563" }}
              {...props}
            />
          ),
          li: ({ node: _node, ...props }) => (
            <li
              style={{ color: "#4b5563" }}
              {...props}
            />
          ),
          a: ({ node: _node, ...props }) => (
            <a
              style={{ color: "#111827" }}
              {...props}
            />
          ),
          strong: ({ node: _node, ...props }) => (
            <strong
              style={{ color: "#111827" }}
              {...props}
            />
          ),
          blockquote: ({ node: _node, ...props }) => (
            <blockquote
              style={{ color: "#6b7280", borderColor: "#d1d5db" }}
              {...props}
            />
          ),
          code: ({ node: _node, ...props }) => (
            <code
              style={{ color: "#111827", backgroundColor: "#f3f4f6" }}
              {...props}
            />
          ),
          pre: ({ node: _node, ...props }) => (
            <pre
              style={{ color: "#111827", backgroundColor: "#f3f4f6" }}
              {...props}
            />
          ),
          hr: ({ node: _node, ...props }) => (
            <hr
              style={{ borderColor: "#d1d5db" }}
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
