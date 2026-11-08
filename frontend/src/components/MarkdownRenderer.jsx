import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  return (
    <div className="markdown-content text-on-surface font-body-lg leading-relaxed space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-on-surface mt-4 mb-2 pb-1 border-b border-outline-variant/20">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-on-surface mt-3.5 mb-2 pb-1 border-b border-outline-variant/15">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold text-primary mt-3 mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-secondary mt-2 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-body-lg text-on-surface leading-relaxed my-1.5">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-primary-fixed text-white drop-shadow-sm">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-on-surface-variant">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1.5 my-2.5 pl-2 text-on-surface">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1.5 my-2.5 pl-2 text-on-surface">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-body-md text-on-surface leading-relaxed">
              {children}
            </li>
          ),
          hr: () => <hr className="border-t border-outline-variant/20 my-4" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 py-1.5 my-2.5 bg-surface-container-low/50 rounded-r-lg italic text-on-surface-variant">
              {children}
            </blockquote>
          ),
          // Rich Glassmorphic Table
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-outline-variant/30 shadow-lg bg-surface-container-lowest/80 backdrop-blur-md">
              <table className="w-full text-left border-collapse text-body-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface-container-high/90 text-primary border-b border-outline-variant/30">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-outline-variant/15">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-surface-container-high/40 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="py-2.5 px-4 font-semibold font-label-md text-xs text-primary border-r border-outline-variant/20 last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="py-2.5 px-4 text-on-surface-variant border-r border-outline-variant/15 last:border-r-0 font-body-sm">
              {children}
            </td>
          ),
          code: ({ inline, children }) =>
            inline ? (
              <code className="bg-surface-container px-1.5 py-0.5 rounded text-tertiary font-label-sm border border-outline-variant/20">
                {children}
              </code>
            ) : (
              <pre className="bg-surface-container-lowest/90 text-on-surface p-3.5 rounded-xl my-2.5 overflow-x-auto border border-outline-variant/25 font-mono text-xs">
                <code>{children}</code>
              </pre>
            ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

