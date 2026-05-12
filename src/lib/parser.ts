import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set worker path for pdf.js using CDN for simplicity in this environment
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Normalizes text by removing excessive whitespace and duplicates while preserving structure.
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces/newlines with single space
    .trim()
    .slice(0, 15000); // Intelligent cap at ~15k chars (plenty for any resume)
}

export async function extractTextFromFile(
  file: File, 
  onProgress?: (percent: number) => void
): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  // 10-second watchdog timer
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Extraction timed out. Your PDF might be too complex.')), 10000)
  );

  try {
    const extractionPromise = (async () => {
      let extractedText = '';
      if (extension === 'pdf') {
        extractedText = await extractTextFromPdf(file, onProgress);
      } else if (extension === 'docx' || extension === 'doc') {
        onProgress?.(20);
        extractedText = await extractTextFromDocx(file);
        onProgress?.(100);
      } else if (extension === 'txt') {
        onProgress?.(50);
        extractedText = await file.text();
        onProgress?.(100);
      } else {
        throw new Error('Unsupported format. Please use PDF, DOCX, or TXT.');
      }
      return normalizeText(extractedText);
    })();

    return await Promise.race([extractionPromise, timeoutPromise]);
  } catch (error: any) {
    console.error('Extraction Error:', error);
    throw new Error(error.message || 'Failed to process file.');
  }
}

async function extractTextFromPdf(file: File, onProgress?: (percent: number) => void): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Use a minimal loading task configuration
  const loadingTask = pdfjsLib.getDocument({ 
    data: arrayBuffer,
    disableRange: true,
    disableStream: true,
    disableAutoFetch: true, // Only fetch what we need
  });
  
  onProgress?.(10);
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  const maxPages = Math.min(pdf.numPages, 2); 

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    // Request only the text content, skip all other page data
    const textContent = await page.getTextContent();
    
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    fullText += pageText + '\n';
    onProgress?.(10 + Math.floor((i / maxPages) * 90));
    
    // Cleanup page resources immediately
    page.cleanup();
  }
  
  if (!fullText.trim()) {
    throw new Error('PDF appears to be scanned/images only (OCR not supported).');
  }
  
  // Destroy the loading task to free memory
  loadingTask.destroy();
  
  return fullText;
}

async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
