import ReactMarkdown from "react-markdown";
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
        "text-left text-sm leading-7 text-[color:var(--color-text-secondary)] [&_a]:font-medium [&_a]:text-[color:var(--color-text-primary)] [&_a]:underline [&_a]:decoration-[color:var(--color-border-primary)] [&_a]:underline-offset-4 [&_blockquote]:mb-5 [&_blockquote]:border-l-2 [&_blockquote]:border-[color:var(--color-border-primary)] [&_blockquote]:pl-4 [&_blockquote]:text-[color:var(--color-text-tertiary)] [&_code]:rounded-md [&_code]:bg-[color:var(--color-background-secondary)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.92em] [&_code]:text-[color:var(--color-text-primary)] [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-[color:var(--color-text-primary)] [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[color:var(--color-text-primary)] [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[color:var(--color-text-primary)] [&_hr]:my-6 [&_hr]:border-[color:var(--color-border-primary)] [&_li]:pl-1 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_p]:mb-4 [&_p:last-child]:mb-0 [&_pre]:thin-scrollbar [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[color:var(--color-background-secondary)] [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-[color:var(--color-text-primary)] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_strong]:font-semibold [&_strong]:text-[color:var(--color-text-primary)] [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
        className,
      )}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
