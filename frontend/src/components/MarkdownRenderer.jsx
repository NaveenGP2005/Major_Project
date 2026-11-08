import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  return (
    <div className="markdown-content text-gray-800 dark:text-gray-100 font-sans leading-relaxed space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-4 mb-2 pb-1 border-b border-purple-100 dark:border-outline-variant/20">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-3.5 mb-2 pb-1 border-b border-purple-100 dark:border-outline-variant/15">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold text-purple-900 dark:text-purple-300 mt-3 mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block"></span>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-400 mt-2 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-[15px] text-gray-800 dark:text-gray-200 leading-relaxed my-2">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-gray-950 dark:text-white bg-purple-100/60 dark:bg-purple-900/30 px-1.5 py-0.5 rounded text-purple-950 dark:text-purple-200">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-700 dark:text-gray-300">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1.5 my-2.5 pl-2 text-gray-800 dark:text-gray-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1.5 my-2.5 pl-2 text-gray-800 dark:text-gray-200">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-[14.5px] text-gray-800 dark:text-gray-200 leading-relaxed">
              {children}
            </li>
          ),
          hr: () => <hr className="border-t border-purple-100 dark:border-outline-variant/20 my-4" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-purple-500 pl-4 py-2 my-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-r-xl italic text-gray-800 dark:text-gray-200">
              {children}
            </blockquote>
          ),
          // Clean Glass Table for recipes, algorithms, comparisons
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-2xl border border-purple-100 dark:border-outline-variant/30 shadow-xs bg-white/95 dark:bg-surface-container-high/70 backdrop-blur-md">
              <table className="w-full text-left border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-purple-50/90 dark:bg-surface-container-highest text-purple-950 dark:text-primary border-b border-purple-100 dark:border-outline-variant/30">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-purple-50 dark:divide-outline-variant/15">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-purple-50/40 dark:hover:bg-surface-container/50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="py-2.5 px-4 font-semibold text-xs text-purple-950 dark:text-primary border-r border-purple-100/60 dark:border-outline-variant/20 last:border-r-0 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="py-2.5 px-4 text-gray-800 dark:text-gray-200 border-r border-purple-50 dark:border-outline-variant/15 last:border-r-0 text-[13.5px]">
              {children}
            </td>
          ),
          code: ({ inline, children }) =>
            inline ? (
              <code className="bg-purple-50 dark:bg-surface-container-highest text-purple-900 dark:text-purple-200 px-1.5 py-0.5 rounded font-mono text-xs border border-purple-100 dark:border-outline-variant/30">
                {children}
              </code>
            ) : (
              <pre className="p-4 rounded-2xl bg-gray-900 text-gray-100 overflow-x-auto text-xs font-mono my-3 shadow-md">
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
