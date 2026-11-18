import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Render model output as text and Markdown; raw HTML is never executed. */
export function ChatMarkdown({ children }: { children: string }) {
  return (
    <div className="chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        table: ({ children }) => <div className="chat-table-scroll"><table>{children}</table></div>,
      }}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
