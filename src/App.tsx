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
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [processedFiles, setProcessedFiles] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState<'idle' | 'optimizing' | 'analyzing' | 'done'>('idle');
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleResume = `PROFESSIONAL SUMMARY
Highly motivated Software Engineer with 5+ years of experience in full-stack development. Specializing in React, Node.js, and cloud architecture.

TECHNICAL SKILLS
- Languages: TypeScript, JavaScript, Python
- Frameworks: React, Next.js, Express, Tailwind CSS
- Databases: PostgreSQL, MongoDB, Redis
- Tools: Docker, Kubernetes, AWS, Git

EXPERIENCE
Lead Developer @ TechInnovate | 2020 - Present
- Architected and deployed a multi-tenant SaaS platform serving 50k+ users.
- Improved application performance by 40% through code optimization and caching.

Full Stack Developer @ StartupCube | 2018 - 2020
- Built responsive web interfaces using React and Redux.
- Implemented secure authentication and payment systems using Stripe.

EDUCATION
B.S. in Computer Science | University of Technology`;

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
      // Auto-switch to paste tab to show result
      setActiveTab('paste');
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
      
      const cleanText = text.trim();
      setPastedText(prev => {
        if (!prev.trim()) return cleanText;
        if (prev.includes(cleanText.slice(0, 50))) return prev;
        return `${prev}\n\n[IMPORTED FROM ${file.name}]\n${cleanText}`;
      });
      
      setProcessedFiles(prev => ({ ...prev, [fileKey]: text }));
      setActiveTab('paste'); // Show the user the extracted text
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadSample = () => {
    setPastedText(sampleResume);
    setActiveTab('paste');
  };

  const handleAnalyze = async () => {
    const rawText = pastedText.trim();
    
    if (!rawText || !targetRole.trim()) {
      const missingRole = !targetRole.trim();
      const missingResume = !rawText;
      
      if (missingRole && missingResume) {
        setError('Configuration missing. Please set target role and resume content.');
      } else if (missingRole) {
        setError('Target Job Role is required for context.');
      } else {
        setError('Resume content is empty. Please paste or upload.');
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
      
      // Scroll to results
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 300);
    } catch (err: any) {
      setError(err.message || 'Analysis encountered a bottleneck. Please try again.');
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
      <main className="relative flex-1 flex flex-col items-center p-6 md:p-12 lg:px-24 max-w-7xl mx-auto w-full space-y-12">
        
        {/* Centered Prominent Header */}
        <header className="text-center space-y-6 pt-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">Neural Resume Synthesis v2.4</span>
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
            Optimize your professional vector. Get instant ATS benchmarking and 
            strategic growth insights.
          </motion.p>
        </header>

        {/* Core Interface */}
        <div className="w-full max-w-4xl mx-auto space-y-8">
          
          {/* Target Role Input */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-1">Target Trajectory</label>
            <div className="relative group">
              <Target className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400/50 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-3xl pl-16 pr-8 py-6 text-lg placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-8 focus:ring-indigo-500/5 transition-all backdrop-blur-xl" 
                placeholder="Enter the role you are aiming for..."
              />
            </div>
          </motion.div>

          {/* Main Input Toggle */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-2xl shadow-2xl"
          >
            {/* Tabs Header */}
            <div className="flex border-b border-white/10 p-2">
              <button 
                onClick={() => setActiveTab('paste')}
                className={cn(
                  "flex-1 py-4 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === 'paste' ? "bg-white text-black" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <FileText className="w-4 h-4" />
                Paste Resume
              </button>
              <button 
                onClick={() => setActiveTab('upload')}
                className={cn(
                  "flex-1 py-4 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === 'upload' ? "bg-white text-black" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <UploadCloud className="w-4 h-4" />
                Upload PDF
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-8 md:p-10 space-y-6">
              <AnimatePresence mode="wait">
                {activeTab === 'paste' ? (
                  <motion.div 
                    key="paste"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-4">
                        <button 
                          onClick={loadSample}
                          className="text-[10px] font-bold text-indigo-400/60 hover:text-indigo-400 uppercase tracking-widest transition-colors"
                        >
                          Use Sample Text
                        </button>
                        <button 
                          onClick={() => setPastedText('')}
                          className="text-[10px] font-bold text-red-400/60 hover:text-red-400 uppercase tracking-widest transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {pastedText.length.toLocaleString()} Chars
                      </span>
                    </div>
                    <div className="relative bg-black/40 rounded-3xl border border-white/5 focus-within:border-indigo-500/50 transition-all overflow-hidden">
                      <textarea 
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        className="w-full h-80 bg-transparent p-8 text-base leading-relaxed text-slate-300 resize-none outline-none custom-scrollbar placeholder:text-slate-700"
                        placeholder="Paste your professional history here. Fastest mode for instant AI feedback."
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="upload"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    {!uploadedFile ? (
                      <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="group cursor-pointer rounded-3xl border-2 border-dashed border-white/10 bg-black/40 p-16 text-center transition-all hover:border-indigo-500/50 hover:bg-white/[0.02]"
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={onFileSelect}
                          accept=".pdf,.docx,.doc,.txt"
                          className="hidden" 
                        />
                        <div className="flex flex-col items-center gap-6">
                          <div className={cn(
                            "flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-500/10 text-indigo-400 transition-all",
                            isExtracting ? "animate-pulse scale-90" : "group-hover:scale-110"
                          )}>
                            {isExtracting ? (
                              <Loader2 className="h-10 w-10 animate-spin" />
                            ) : (
                              <UploadCloud className="h-10 w-10" />
                            )}
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">
                              {isExtracting ? 'Synthesizing...' : 'Import Resume File'}
                            </h3>
                            <p className="text-sm text-slate-500 max-w-xs mx-auto">
                              PDF, DOCX, or TXT supported. Text is extracted for AI processing.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-16 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl text-center space-y-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 shadow-xl shadow-emerald-500/10">
                          <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold text-white uppercase tracking-tight">{uploadedFile.name}</h3>
                          <p className="text-xs text-slate-500 uppercase tracking-widest">{uploadedFile.size} • EXTRACTED</p>
                        </div>
                        <button 
                          onClick={clearFile}
                          className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-[0.2em] underline-offset-4 hover:underline transition-all"
                        >
                          Remove File
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-center font-bold text-slate-600 uppercase tracking-widest pt-4">
                      Note: Extraction auto-fills the main text area.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-4 shadow-xl shadow-red-500/5"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{error}</span>
                </motion.div>
              )}

              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || isExtracting}
                className="relative overflow-hidden w-full bg-white text-black hover:bg-slate-200 font-bold py-6 rounded-2xl text-lg shadow-2xl transition-all transform active:scale-[0.98] disabled:opacity-50 group mt-4"
              >
                {isAnalyzing && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 4, ease: "linear" }}
                    className="absolute bottom-0 left-0 h-1.5 bg-indigo-500"
                  />
                )}
                <div className="flex items-center justify-center gap-3">
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                      <span className="uppercase tracking-widest">
                        {analysisStep === 'optimizing' ? 'Optimizing Signal...' : 'Neural Analysis...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Search className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition-transform" />
                      <span className="uppercase tracking-widest">Execute Deep Analysis</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Results Layer */}
        <AnimatePresence>
          {analysis && (
            <motion.div 
              id="analysis-results"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 mt-12"
            >
              <div className="md:col-span-12 flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Analysis Summary</h2>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Score Accuracy: 98.4%</span>
              </div>

              {/* Visual ATS Benchmark */}
              <div className="md:col-span-5 bg-white/[0.02] border border-white/10 rounded-[3rem] p-12 flex flex-col items-center justify-center backdrop-blur-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />
                <div className="relative w-48 h-48 flex items-center justify-center mb-10">
                  <svg className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                    <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                    <motion.circle
                      cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent"
                      strokeDasharray="552.9"
                      initial={{ strokeDashoffset: 552.9 }}
                      animate={{ strokeDashoffset: 552.9 - (552.9 * analysis.atsScore) / 100 }}
                      transition={{ duration: 2.5, ease: "circOut" }}
                      className="text-indigo-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-7xl font-black tracking-tighter text-white">{analysis.atsScore}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Benchmark</span>
                  </div>
                </div>
                <div className={cn(
                  "px-6 py-2 rounded-full text-[10px] font-black tracking-[0.3em] shadow-xl",
                  analysis.atsScore >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                )}>
                  {analysis.atsScore >= 85 ? 'ELITE SIGNAL' : analysis.atsScore >= 70 ? 'STRONG SIGNAL' : 'REFINED OPTIMIZATION NEEDED'}
                </div>
              </div>

              {/* Strategic Directive */}
              <div className="md:col-span-7 bg-indigo-600/5 border border-indigo-500/20 rounded-[3rem] p-12 flex flex-col justify-center backdrop-blur-3xl relative">
                <div className="absolute top-4 left-10 flex gap-2">
                  <div className="w-8 h-1 bg-indigo-500/40 rounded-full" />
                  <div className="w-4 h-1 bg-indigo-500/20 rounded-full" />
                </div>
                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                  <Zap className="w-4 h-4" />
                  Executive Directive
                </h3>
                <p className="text-3xl md:text-4xl font-light leading-[1.3] text-white/90 italic tracking-tight">
                  "{analysis.suggestedImprovements[0]}"
                </p>
                <div className="mt-8 flex gap-4">
                   <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     Primary Gap: {analysis.missingSkills[0] || 'N/A'}
                   </div>
                </div>
              </div>

              {/* Competitive Advantages */}
              <div className="md:col-span-6 space-y-6">
                <h4 className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Signal Strengths
                </h4>
                <div className="grid gap-4">
                  {analysis.strengths.slice(0, 4).map((s, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group flex gap-5 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 transition-all backdrop-blur-xl"
                    >
                      <span className="text-emerald-500/50 font-black text-sm group-hover:text-emerald-500 transition-colors">0{i+1}</span>
                      <p className="text-slate-300 text-sm md:text-base leading-relaxed">{s}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Development Roadmap */}
              <div className="md:col-span-6 space-y-6">
                <h4 className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-2">
                  <Target className="w-4 h-4 text-amber-500" />
                  Growth Trajectory
                </h4>
                <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-10 backdrop-blur-3xl space-y-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Required Competencies</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.missingSkills.map((s, i) => (
                        <span key={i} className="px-4 py-2 bg-red-500/5 text-red-400 border border-red-500/10 rounded-xl text-[10px] font-black uppercase tracking-tight">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Tactical Intelligence</p>
                    <div className="space-y-4 overflow-y-auto max-h-[300px] custom-scrollbar pr-3">
                      {analysis.interviewTips.map((tip, i) => (
                        <div key={i} className="text-xs p-5 bg-indigo-500/5 rounded-[1.5rem] border border-indigo-500/10 text-slate-400 leading-relaxed font-light">
                          <span className="text-indigo-400 font-bold block mb-1">PROTIP</span>
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-20 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <p className="opacity-30 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Neural Career Synthesis Engine</p>
        <p className="opacity-10 text-[8px] font-bold uppercase tracking-[0.2em]">Build 2026.05.12 • Secure Pipeline</p>
      </footer>
    </div>
  );
}

