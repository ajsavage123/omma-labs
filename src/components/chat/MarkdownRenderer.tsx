
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Override default styling for links to make them visible against chat bubbles
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline" />
          ),
          // Style blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote {...props} className="border-l-4 border-indigo-400 pl-4 my-2 italic text-gray-300" />
          ),
          // Style inline code
          code: ({ node, inline, className, children, ...props }: any) => {
            return !inline ? (
              <pre className="bg-[#121216] p-3 rounded-lg overflow-x-auto my-2 border border-white/10">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-[#121216] px-1.5 py-0.5 rounded text-indigo-300 text-[0.9em]" {...props}>
                {children}
              </code>
            );
          },
          // Style lists
          ul: ({ node, ...props }) => <ul {...props} className="list-disc list-inside my-2" />,
          ol: ({ node, ...props }) => <ol {...props} className="list-decimal list-inside my-2" />,
          li: ({ node, ...props }) => <li {...props} className="my-1" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
