import React from 'react';
import { EditorialImage } from './EditorialImage';

interface ArticleRendererProps {
  content: string;
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  // Supports **bold**, *italic*, and [label](url)
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[#161614]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const href = linkMatch[2].trim();
      const safeHref = href.startsWith('http://') || href.startsWith('https://') ? href : '#';
      return (
        <a
          key={idx}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#14532D] underline underline-offset-4 decoration-[#14532D]/40 hover:decoration-[#14532D] transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function ArticleRenderer({ content }: ArticleRendererProps) {
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let figureIndex = 0;
  let firstParagraphRendered = false;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i += 1;
      continue;
    }

    // Markdown image line: ![alt](url)
    const imageMatch = line.match(/^!\[([^\]]*)\]\((.+)\)$/);
    if (imageMatch) {
      figureIndex += 1;
      const caption = imageMatch[1].trim() || 'Fotografía de la ruta';
      const url = imageMatch[2].trim();
      blocks.push(
        <figure key={`fig-${i}`} className="my-8">
          <div className="overflow-hidden border border-[#E4E1DA] bg-[#F2F0EB]">
            <EditorialImage
              src={url}
              alt={caption}
              className="w-full max-h-[520px] object-cover block"
            />
          </div>
          <figcaption className="mt-2.5 text-xs font-serif italic text-[#5C5A54]">
            Fig. {figureIndex} — {caption}
          </figcaption>
        </figure>
      );
      i += 1;
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push(
        <h3
          key={`h3-${i}`}
          className="mt-8 mb-3 font-serif text-xl sm:text-2xl font-medium text-[#161614] tracking-tight"
        >
          {line.slice(4)}
        </h3>
      );
      i += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push(
        <h2
          key={`h2-${i}`}
          className="mt-10 mb-4 font-serif text-2xl sm:text-3xl font-medium text-[#161614] tracking-tight"
        >
          {line.slice(3)}
        </h2>
      );
      i += 1;
      continue;
    }

    // Pull quote (subtle top and bottom hairline dividers, no thick left bar)
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i += 1;
      }
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="my-8 py-6 border-y border-[#E4E1DA] font-serif italic text-xl sm:text-2xl leading-relaxed text-[#292824]"
        >
          {renderInlineFormatting(quoteLines.join(' '))}
        </blockquote>
      );
      continue;
    }

    // Bullet list
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))
      ) {
        items.push(lines[i].trim().slice(2));
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="my-5 space-y-2.5 pl-5 list-disc marker:text-[#14532D] text-[#2B2A26] leading-relaxed">
          {items.map((item, idx) => (
            <li key={idx}>{renderInlineFormatting(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i += 1;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="my-5 space-y-2.5 pl-5 list-decimal marker:text-[#14532D] marker:font-mono text-[#2B2A26] leading-relaxed">
          {items.map((item, idx) => (
            <li key={idx}>{renderInlineFormatting(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Standard paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('> ') &&
      !lines[i].trim().startsWith('- ') &&
      !lines[i].trim().startsWith('* ') &&
      !/^\d+\.\s/.test(lines[i].trim()) &&
      !/^!\[([^\]]*)\]\((.+)\)$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }

    const isFirst = !firstParagraphRendered;
    firstParagraphRendered = true;

    blocks.push(
      <p
        key={`p-${i}`}
        className={`my-5 text-[16px] leading-[1.8] text-[#2B2A26] ${
          isFirst
            ? 'first-letter:font-serif first-letter:text-5xl first-letter:font-medium first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-none first-letter:text-[#14532D]'
            : ''
        }`}
      >
        {renderInlineFormatting(paraLines.join(' '))}
      </p>
    );
  }

  return <div className="max-w-2xl">{blocks}</div>;
}
