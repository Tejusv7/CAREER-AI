/**
 * Optimizes text for LLM consumption by removing redundancy and noise.
 */
export function optimizeResumeText(text: string): string {
  if (!text) return '';

  // 1. Normalize line endings and whitespace
  let optimized = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ');

  // 2. Remove common resume boilerplate/noise if detected (simple regex)
  // (e.g., repeating page numbers, standard disclaimers)
  optimized = optimized.replace(/Page \d+ of \d+/gi, '');
  optimized = optimized.replace(/Confidential|All rights reserved/gi, '');

  // 3. Deduplicate phrases (simple sliding window)
  const words = optimized.split(' ');
  const uniqueWords = [];
  let lastWord = '';
  
  for (const word of words) {
    if (word.toLowerCase() !== lastWord.toLowerCase()) {
      uniqueWords.push(word);
    }
    lastWord = word;
  }
  
  optimized = uniqueWords.join(' ').trim();

  // 4. Content limit (tokens approximation)
  // Most resumes shouldn't exceed 8k characters for analysis
  if (optimized.length > 8000) {
    optimized = optimized.slice(0, 8000) + '... [Content truncated for optimization]';
  }

  return optimized;
}
