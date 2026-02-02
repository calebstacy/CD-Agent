export interface ParsedArtifact {
  type: 'copy-options' | 'ui-preview' | 'before-after' | 'empty-state';
  content: string;
  title?: string;
}

export interface ParsedContent {
  type: 'text' | 'artifact';
  content: string;
  artifact?: ParsedArtifact;
}

/**
 * Parse markdown content and extract artifacts
 * Syntax: :::artifact{type="copy-options" title="Button labels"}
 * content here
 * :::
 */
export function parseArtifacts(markdown: string): ParsedContent[] {
  const result: ParsedContent[] = [];
  const artifactRegex = /:::artifact\{([^}]+)\}([\s\S]*?):::/g;
  
  let lastIndex = 0;
  let match;

  while ((match = artifactRegex.exec(markdown)) !== null) {
    // Add text before artifact
    if (match.index > lastIndex) {
      const textBefore = markdown.slice(lastIndex, match.index).trim();
      if (textBefore) {
        result.push({
          type: 'text',
          content: textBefore
        });
      }
    }

    // Parse artifact attributes
    const attrs = match[1];
    const content = match[2].trim();
    
    const typeMatch = attrs.match(/type="([^"]+)"/);
    const titleMatch = attrs.match(/title="([^"]+)"/);
    
    if (typeMatch) {
      result.push({
        type: 'artifact',
        content: '',
        artifact: {
          type: typeMatch[1] as ParsedArtifact['type'],
          content,
          title: titleMatch?.[1]
        }
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < markdown.length) {
    const textAfter = markdown.slice(lastIndex).trim();
    if (textAfter) {
      result.push({
        type: 'text',
        content: textAfter
      });
    }
  }

  // If no artifacts found, return all as text
  if (result.length === 0) {
    return [{ type: 'text', content: markdown }];
  }

  return result;
}
