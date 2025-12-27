'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils/cn';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface ReportSection {
  title: string;
  content: string;
  level: number;
}

interface FullReportProps {
  markdown: string;
  className?: string;
}

// Parse markdown into sections based on headings
function parseMarkdownSections(markdown: string): ReportSection[] {
  if (!markdown) return [];

  const lines = markdown.split('\n');
  const sections: ReportSection[] = [];
  let currentSection: ReportSection | null = null;
  let contentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        if (currentSection.content || currentSection.title) {
          sections.push(currentSection);
        }
      }

      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();

      currentSection = {
        title,
        content: '',
        level,
      };
      contentLines = [];
    } else {
      contentLines.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    if (currentSection.content || currentSection.title) {
      sections.push(currentSection);
    }
  }

  // If no sections found, treat entire content as one section
  if (sections.length === 0 && markdown.trim()) {
    sections.push({
      title: 'Report',
      content: markdown,
      level: 1,
    });
  }

  return sections;
}

interface CollapsibleSectionProps {
  title: string;
  content: string;
  level: number;
  defaultOpen?: boolean;
  index: number;
}

function CollapsibleSection({ title, content, level, defaultOpen = false, index }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  // Main verdict section (level 2) should be open by default
  const shouldDefaultOpen = defaultOpen || level === 1 || index === 0;
  React.useEffect(() => {
    if (shouldDefaultOpen) setIsOpen(true);
  }, [shouldDefaultOpen]);

  const ChevronIcon = isOpen ? ChevronDownIcon : ChevronRightIcon;

  // Different styling based on heading level (with fallbacks)
  const headerStyles: Record<number, string> = {
    1: 'text-lg font-bold',
    2: 'text-base font-semibold',
    3: 'text-sm font-medium',
  };

  const paddingStyles: Record<number, string> = {
    1: 'pl-0',
    2: 'pl-0',
    3: 'pl-4',
  };

  // Safe access with fallbacks
  const safeLevel = level >= 1 && level <= 3 ? level : 2;

  return (
    <div className={cn('border-b', paddingStyles[safeLevel])} style={{ borderColor: 'var(--border)' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 py-3 text-left hover:bg-muted/30 transition-colors px-2 -mx-2 rounded"
      >
        <ChevronIcon className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--muted-foreground)' }} />
        <span className={headerStyles[safeLevel]}>
          {title || 'Section'}
        </span>
      </button>
      {isOpen && content && (
        <div className="pb-4 pl-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export function FullReport({ markdown, className }: FullReportProps) {
  const [copied, setCopied] = React.useState(false);
  const sections = parseMarkdownSections(markdown);

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!markdown || sections.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div
          className="flex items-center gap-3 p-6 rounded-lg border-l-4 border-gray-400"
          style={{ backgroundColor: 'rgba(107, 114, 128, 0.1)' }}
        >
          <DocumentTextIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300">No Report Available</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              The full analysis report is not available for this item.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
          <span className="font-medium">Full Analysis Report</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
            {sections.length} section{sections.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors hover:bg-muted/50"
          style={{ borderColor: 'var(--border)' }}
        >
          {copied ? (
            <>
              <CheckIcon className="h-3.5 w-3.5 text-green-600" />
              Copied
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
              Copy All
            </>
          )}
        </button>
      </div>

      {/* Sections */}
      <div
        className="rounded-lg border"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
      >
        {sections.map((section, index) => (
          <CollapsibleSection
            key={index}
            title={section.title}
            content={section.content}
            level={section.level}
            defaultOpen={index === 0}
            index={index}
          />
        ))}
      </div>

      {/* Tip */}
      <p className="text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
        Click section headers to expand or collapse. Use Copy All to copy the entire report.
      </p>
    </div>
  );
}
