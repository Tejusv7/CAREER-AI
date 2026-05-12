import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Briefcase, 
  Zap, 
  Target, 
  AlertCircle, 
  CheckCircle2, 
  Lightbulb, 
  Search,
  Loader2,
  UploadCloud,
  File as FileIcon,
  X
} from 'lucide-react';
import { analyzeResume, type ResumeAnalysis } from './lib/gemini';
import { extractTextFromFile } from './lib/parser';
import { optimizeResumeText } from './lib/optimizer';
import { cn } from './lib/utils';

export default function App() {
  const [targetRole, setTargetRole] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [processedFiles, setProcessedFiles] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState<'idle' | 'extracting' | 'optimizing' | 'analyzing' | 'done'>('idle');
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    // Cache check
    const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
    if (processedFiles[fileKey]) {
      const cachedText = processedFiles[fileKey];
      setUploadedFile({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        type: file.type || 'Document'
      });
      setPastedText(prev => prev.trim() ? prev : cachedText);
      return;
    }

    setIsExtracting(true);
    setExtractionProgress(0);
    setError(null);
    setUploadedFile({
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      type: file.type || 'Document'
    });

    try {
      // Non-blocking extraction
      const text = await extractTextFromFile(file, (progress) => {
        setExtractionProgress(progress);
      });
      
      setPastedText(prev => {
        const cleanText = text.trim();
        if (!prev.trim()) return cleanText;
        if (prev.includes(cleanText.slice(0, 50))) return prev;
        return `${prev}\n\n[DOCUMENT DATA]\n${cleanText}`;
      });
      
      setProcessedFiles(prev => ({ ...prev, [fileKey]: text }));
    } catch (err: any) {
      setError(err.message || 'Fast extraction failed. Try pasting text directly.');
      setUploadedFile(null);
    } finally {
      setIsExtracting(false);
      setExtractionProgress(0);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const clearFile = () => {
    setUploadedFile(null);
    // We don't necessarily clear the text because the user might have edited it
    // But if we want a full reset:
    // setPastedText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    const rawText = pastedText.trim();
    
    if (!rawText || !targetRole.trim()) {
      const missingRole = !targetRole.trim();
      const missingResume = !rawText;
      
      if (missingRole && missingResume) {
        setError('Step 1: Define Target Role. Step 2: Provide Resume.');
      } else if (missingRole) {
        setError('Target Job Role is missing.');
      } else {
        setError('Please provide resume content via upload or manual paste.');
      }
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep('optimizing');
    setError(null);
    try {
      // Step: Optimize
      const optimizedText = optimizeResumeText(rawText);
      
      // Step: Analyzing
      setAnalysisStep('analyzing');
      const result = await analyzeResume(optimizedText, targetRole);
      setAnalysis(result);
      setAnalysisStep('done');
    } catch (err) {
      setError('Neural analysis encountered a bottleneck. Please try again.');
      setAnalysisStep('idle');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#05070A] text-slate-100 flex flex-col font-sans overflow-x-hidden pb-20">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[60%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      {/* Main Content Area */}
      <main className="relative flex-1 flex flex-col items-center p-6 md:p-12 lg:p-24 max-w-7xl mx-auto w-full space-y-16">
        
        {/* Centered Prominent Header */}
        <header className="text-center space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Next-Gen Resume Analysis</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black tracking-tighter bg-gradient-to-b from-white via-white to-white/20 bg-clip-text text-transparent drop-shadow-2xl"
          >
            CareerView AI
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-2xl mx-auto text-lg md:text-xl font-light leading-relaxed"
          >
            Refine your professional narrative. Get instant ATS scoring and deep 
            career insights powered by advanced neural analysis.
          </motion.p>
        </header>

        {/* Action Section */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Input Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 md:p-10 backdrop-blur-2xl shadow-2xl transition-all duration-700",
              analysis ? "lg:col-span-5" : "lg:col-span-8 lg:col-start-3"
            )}
          >
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Target Role</label>
                <div className="relative">
                  <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/50" />
                  <input 
                    type="text" 
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                    placeholder="e.g. Senior Frontend Engineer"
                  />
                </div>
              </div>

              {/* Unified Input Panel */}
              <div className="space-y-8">
                {/* PDF/DOC Upload Layer */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Quick Upload</label>
                    {isExtracting && (
                      <span className="text-[10px] text-indigo-400 font-black animate-pulse uppercase tracking-[0.1em]">Extracting Insight...</span>
                    )}
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {!uploadedFile ? (
                      <motion.div 
                        key="upload"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="group relative cursor-pointer overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-8 text-center transition-all hover:border-indigo-500/50 hover:bg-white/[0.02]"
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={onFileSelect}
                          accept=".pdf,.docx,.doc,.txt"
                          className="hidden" 
                        />
                        <div className="flex flex-col items-center gap-4">
                          <div className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 transition-all",
                            isExtracting ? "animate-pulse scale-90" : "group-hover:scale-110"
                          )}>
                            {isExtracting ? (
                              <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                              <UploadCloud className="h-6 w-6" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-200">
                              {isExtracting ? `Synthesizing ${uploadedFile?.name || 'Resume'}...` : 'Drop PDF or Click to Upload'}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-loose">Optimized Text-Only Extraction</p>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="file-info"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center justify-between rounded-[2rem] border border-white/10 bg-indigo-500/5 p-6 backdrop-blur-md"
                      >
                        <div className="flex items-center gap-5">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                            {isExtracting ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileIcon className="h-6 w-6" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white truncate max-w-[200px]">{uploadedFile.name}</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">{isExtracting ? 'Extracting Intelligence...' : 'Ready for Analysis'}</span>
                          </div>
                        </div>
                        <button 
                          onClick={clearFile}
                          className="rounded-full p-3 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Text Input Layer */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Resume Corpus</label>
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                      {pastedText.length} Characters
                    </span>
                  </div>
                  <div className="bg-black/40 border border-white/10 rounded-[2rem] overflow-hidden focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
                    <textarea 
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      className="w-full h-48 bg-transparent p-8 text-sm leading-relaxed text-slate-300 resize-none outline-none custom-scrollbar"
                      placeholder="Paste your resume here or use the upload tool above for instant extraction..."
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-xs p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || isExtracting}
                className="relative overflow-hidden w-full bg-white text-black hover:bg-indigo-500 hover:text-white font-bold py-5 rounded-2xl shadow-xl shadow-white/5 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] disabled:opacity-50 group"
              >
                {isAnalyzing && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3, ease: "linear" }}
                    className="absolute bottom-0 left-0 h-1 bg-black/20"
                  />
                )}
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Neural Processing...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Instant Analysis
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Results Display */}
          <AnimatePresence>
            {analysis && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6 mt-8"
              >
                {/* Visual Score Card */}
                <div className="md:col-span-4 bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center backdrop-blur-2xl">
                  <div className="relative w-40 h-40 flex items-center justify-center mb-8">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                      <motion.circle
                        cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="8" fill="transparent"
                        strokeDasharray="465"
                        initial={{ strokeDashoffset: 465 }}
                        animate={{ strokeDashoffset: 465 - (465 * analysis.atsScore) / 100 }}
                        transition={{ duration: 2, ease: "circOut" }}
                        className="text-indigo-500"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-6xl font-black tracking-tighter">{analysis.atsScore}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">ATS Index</span>
                    </div>
                  </div>
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em]",
                    analysis.atsScore >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  )}>
                    {analysis.atsScore >= 80 ? 'SYSTEM OPTIMIZED' : 'REQUIRES REFINEMENT'}
                  </div>
                </div>

                {/* Narrative Insight */}
                <div className="md:col-span-8 bg-indigo-600/5 border border-indigo-500/20 rounded-[2.5rem] p-10 flex flex-col justify-center backdrop-blur-2xl">
                  <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Strategic Recommendation</h3>
                  <p className="text-2xl md:text-3xl font-light leading-snug text-white/90 italic">
                    "{analysis.suggestedImprovements[0]}"
                  </p>
                </div>

                {/* Detail Grids */}
                <div className="md:col-span-6 bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-2xl">
                  <h4 className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-8">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Competitive Edges
                  </h4>
                  <div className="space-y-4">
                    {analysis.strengths.map((s, i) => (
                      <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-sm md:text-base text-slate-300">
                        <span className="text-emerald-500 font-bold">0{i+1}</span>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-6 bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-2xl flex flex-col">
                  <h4 className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-8">
                    <Target className="w-4 h-4 text-amber-500" />
                    Market Readiness Gap
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {analysis.missingSkills.map((s, i) => (
                      <span key={i} className="px-4 py-2 bg-red-500/5 text-red-400 border border-red-500/10 rounded-xl text-xs font-bold uppercase tracking-tight">
                        {s}
                      </span>
                    ))}
                  </div>
                  
                  <h4 className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">
                    <Lightbulb className="w-4 h-4 text-indigo-400" />
                    Interview Heuristics
                  </h4>
                  <div className="space-y-4 overflow-y-auto max-h-64 custom-scrollbar pr-2">
                    {analysis.interviewTips.map((tip, i) => (
                      <div key={i} className="text-xs p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-slate-400 leading-relaxed italic">
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="p-12 text-center opacity-30 text-[10px] font-bold uppercase tracking-[0.3em]">
        Neural Career Synthesis • 2026
      </footer>
    </div>
  );
}

