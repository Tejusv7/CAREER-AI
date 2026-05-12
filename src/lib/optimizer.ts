/**
 * Optimizes text for LLM consumption by removing redundancy and noise.
 */
export function optimizeResumeText(text: string): string {
  if (!text) return '';

  // 1. Normalize line endings and collapse whitespace
  let optimized = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0) // Remove empty lines
    .join('\n');

  // 2. Remove common resume boilerplate/noise
  optimized = optimized.replace(/Page \d+ of \d+/gi, '');
  optimized = optimized.replace(/Confidential|All rights reserved|Resume|Curriculum Vitae|CV/gi, '');
  
  // 3. Deduplicate consecutive identical lines (often happens in bad PDF extraction)
  const lines = optimized.split('\n');
  const uniqueLines = [];
  let lastLine = '';
  
  for (const line of lines) {
    if (line.toLowerCase() !== lastLine.toLowerCase()) {
      uniqueLines.push(line);
    }
    lastLine = line;
  }
  
  optimized = uniqueLines.join('\n');

  // 4. Token-aware limit (approximate)
  // We want to stay well within Gemini's sweet spot for fast analysis
  if (optimized.length > 10000) {
    optimized = optimized.slice(0, 10000) + '\n... [Content truncated for analysis performance]';
  }

  return optimized;
}
