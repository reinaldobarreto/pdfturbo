import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
 FileUp, 
 Zap, 
 Merge, 
 Scissors, 
 Check,
 CheckCircle2, 
 AlertCircle,
 FileText,
 Download,
 Loader2,
 X,
 RefreshCw,
 Edit3,
 Trash2,
 FileArchive,
 ExternalLink,
 ZoomIn,
 ZoomOut
} from 'lucide-react';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { clsx, type ClassValue } from 'clsx';

// Set up pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
import { twMerge } from 'tailwind-merge';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}

function formatBytes(bytes: number, decimals = 2) {
 if (bytes === 0) return '0 Bytes';
 const k = 1024;
 const dm = decimals < 0 ? 0 : decimals;
 const sizes = ['Bytes', 'KB', 'MB', 'GB'];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

let sharedAudioCtx: AudioContext | null = null;

const initAudio = () => {
 if (!sharedAudioCtx) {
 const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
 if (AudioContextClass) {
 sharedAudioCtx = new AudioContextClass();
 }
 }
 if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
 sharedAudioCtx.resume().catch(e => console.warn('Audio resume blocked:', e));
 }
};

// Initialize on first interaction
if (typeof window !== 'undefined') {
 window.addEventListener('click', initAudio, { once: true });
 window.addEventListener('touchstart', initAudio, { once: true });
}

const playNotificationSound = (type: 'success' | 'error') => {
 try {
 initAudio();
 const ctx = sharedAudioCtx;
 if (!ctx) return;
 
 if (type === 'success') {
 // AI Studio-like soft ping
 const playNote = (freq: number, startTime: number) => {
 const osc = ctx.createOscillator();
 const gain = ctx.createGain();
 osc.type = 'sine';
 osc.frequency.setValueAtTime(freq, startTime);
 
 gain.gain.setValueAtTime(0, startTime);
 gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
 gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
 
 osc.connect(gain);
 gain.connect(ctx.destination);
 osc.start(startTime);
 osc.stop(startTime + 0.3);
 };
 
 playNote(880, ctx.currentTime); // A5
 playNote(1318.51, ctx.currentTime + 0.1); // E6
 } else {
 // Error sound
 const playBuzz = (freq: number, startTime: number) => {
 const osc = ctx.createOscillator();
 const gain = ctx.createGain();
 osc.type = 'sawtooth';
 osc.frequency.setValueAtTime(freq, startTime);
 
 gain.gain.setValueAtTime(0, startTime);
 gain.gain.linearRampToValueAtTime(0.05, startTime + 0.02);
 gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
 
 const filter = ctx.createBiquadFilter();
 filter.type = 'lowpass';
 filter.frequency.setValueAtTime(1000, startTime);
 filter.frequency.exponentialRampToValueAtTime(100, startTime + 0.2);
 
 osc.connect(filter);
 filter.connect(gain);
 gain.connect(ctx.destination);
 
 osc.start(startTime);
 osc.stop(startTime + 0.2);
 };
 
 playBuzz(150, ctx.currentTime);
 playBuzz(100, ctx.currentTime + 0.15);
 }
 } catch (e) {
 console.error("Audio play failed", e);
 }
};

// --- Components ---

interface FileItem {
 file: File;
 customName: string;
 originalName: string;
 selectedPages?: number[]; // indices of selected pages (0-based)
 totalPages?: number;
}

interface FloatingProgressProps {
 fileName: string;
 originalName: string;
 progress: number;
 status: string;
 isVisible: boolean;
}

const FileThumbnail: React.FC<{ file: File; className?: string }> = ({ file, className }) => {
 const [thumbnail, setThumbnail] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 let isMounted = true;
 let objectUrl: string | null = null;

 const loadThumbnail = async () => {
 setLoading(true);
 if (file.type.startsWith('image/')) {
 objectUrl = URL.createObjectURL(file);
 if (isMounted) {
 setThumbnail(objectUrl);
 setLoading(false);
 }
 return;
 }

 if (file.type === 'application/pdf') {
 try {
 const arrayBuffer = await file.arrayBuffer();
 const loadingTask = pdfjsLib.getDocument({ 
 data: arrayBuffer,
 cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.5.207/cmaps/',
 cMapPacked: true,
 });
 const pdf = await loadingTask.promise;
 const page = await pdf.getPage(1);
 const viewport = page.getViewport({ scale: 0.3 });
 const canvas = document.createElement('canvas');
 const context = canvas.getContext('2d');
 
 if (!context) {
 if (isMounted) setLoading(false);
 return;
 }

 canvas.height = viewport.height;
 canvas.width = viewport.width;

 await page.render({ 
 canvasContext: context, 
 viewport, 
 canvas 
 }).promise;

 if (isMounted) {
 setThumbnail(canvas.toDataURL());
 setLoading(false);
 }
 
 // Cleanup PDF document
 await pdf.destroy();
 } catch (err) {
 console.error('Error generating thumbnail:', err);
 if (isMounted) setLoading(false);
 }
 } else {
 if (isMounted) setLoading(false);
 }
 };

 loadThumbnail();
 return () => { 
 isMounted = false; 
 if (objectUrl) URL.revokeObjectURL(objectUrl);
 };
 }, [file]);

 if (loading) {
 return (
 <div className={cn("bg-white/5 animate-pulse flex items-center justify-center rounded-none", className)}>
 <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
 </div>
 );
 }

 if (!thumbnail) {
 return (
 <div className={cn("bg-white/5 flex items-center justify-center rounded-none", className)}>
 <FileText className="w-6 h-6 text-white/20" />
 </div>
 );
 }

 return (
 <div className={cn("relative group overflow-hidden rounded-none bg-black/20 border border-white/10", className)}>
 <img 
 src={thumbnail} 
 alt="Preview" 
 className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
 referrerPolicy="no-referrer"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
 </div>
 );
};

const UrlThumbnail: React.FC<{ url: string; className?: string }> = ({ url, className }) => {
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(false);

 useEffect(() => {
 let isMounted = true;
 const renderPage = async () => {
 try {
 setLoading(true);
 setError(false);
 
 const loadingTask = pdfjsLib.getDocument({
 url,
 cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.5.207/cmaps/',
 cMapPacked: true,
 });
 
 const pdf = await loadingTask.promise;
 const page = await pdf.getPage(1);
 
 if (!isMounted) return;

 const viewport = page.getViewport({ scale: 0.5 });
 const canvas = canvasRef.current;
 if (!canvas) return;

 const context = canvas.getContext('2d');
 if (!context) return;

 canvas.height = viewport.height;
 canvas.width = viewport.width;

 const renderContext = {
 canvasContext: context,
 viewport: viewport,
 canvas: canvas,
 };
 
 await page.render(renderContext).promise;
 if (isMounted) setLoading(false);
 
 await pdf.destroy();
 } catch (err) {
 console.error('Error rendering thumbnail:', err);
 if (isMounted) {
 setError(true);
 setLoading(false);
 }
 }
 };

 renderPage();
 return () => { isMounted = false; };
 }, [url]);

 if (error) {
 return (
 <div className={cn("w-full h-full flex flex-col items-center justify-center bg-white/5 gap-2 text-center", className)}>
 <AlertCircle className="w-6 h-6 text-red-500/50" />
 <p className="text-[8px] text-white/40 uppercase font-bold">Erro</p>
 </div>
 );
 }

 return (
 <div className={cn("w-full h-full flex items-center justify-center relative bg-white/5", className)}>
 {loading && (
 <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
 <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
 </div>
 )}
 <canvas 
 ref={canvasRef} 
 className={cn(
 "max-w-full max-h-full object-contain transition-opacity duration-300",
 loading ? "opacity-0" : "opacity-100"
 )} 
 />
 </div>
 );
};

const PageSelectorModal: React.FC<{ 
 fileItem: FileItem; 
 onClose: () => void; 
 onUpdate: (selectedPages: number[]) => void;
}> = ({ fileItem, onClose, onUpdate }) => {
 const [selected, setSelected] = useState<number[]>(fileItem.selectedPages || []);
 const [previews, setPreviews] = useState<string[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 let isMounted = true;
 const loadPreviews = async () => {
 if (fileItem.file.type.startsWith('image/')) {
 setPreviews([URL.createObjectURL(fileItem.file)]);
 setLoading(false);
 return;
 }

 try {
 const arrayBuffer = await fileItem.file.arrayBuffer();
 const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
 const numPages = pdf.numPages;
 const urls: string[] = [];

 for (let i = 1; i <= numPages; i++) {
 const page = await pdf.getPage(i);
 const viewport = page.getViewport({ scale: 0.2 });
 const canvas = document.createElement('canvas');
 const context = canvas.getContext('2d');
 canvas.height = viewport.height;
 canvas.width = viewport.width;
 if (context) {
 await page.render({ canvasContext: context, viewport, canvas }).promise;
 urls.push(canvas.toDataURL());
 }
 }
 if (isMounted) {
 setPreviews(urls);
 setLoading(false);
 }
 await pdf.destroy();
 } catch (err) {
 console.error('Error loading previews:', err);
 if (isMounted) setLoading(false);
 }
 };
 loadPreviews();
 return () => { isMounted = false; };
 }, [fileItem.file]);

 const togglePage = (idx: number) => {
 setSelected(prev => 
 prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx].sort((a, b) => a - b)
 );
 };

 return (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md"
 >
 <motion.div 
 initial={{ scale: 0.9, y: 20 }}
 animate={{ scale: 1, y: 0 }}
 className="bg-[#0a0a0a] border border-white/10 rounded-none w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden "
 >
 <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
 <div>
 <h3 className="text-xl font-michroma text-cyan-400">GERENCIAR PÁGINAS</h3>
 <p className="text-xs text-white/40 font-montserrat mt-1">{fileItem.originalName}</p>
 </div>
 <div className="flex items-center gap-4">
 <div className="text-right">
 <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Selecionadas</p>
 <p className="text-lg font-michroma text-white">{selected.length} / {fileItem.totalPages || 1}</p>
 </div>
 <button 
 onClick={onClose}
 className="p-2 hover:bg-white/10 rounded-none transition-colors"
 >
 <X className="w-6 h-6 text-white/40" />
 </button>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
 {loading ? (
 <div className="h-64 flex flex-col items-center justify-center gap-4">
 <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
 <p className="text-cyan-400 font-michroma text-xs animate-pulse">DESCRIPTOGRAFANDO PÁGINAS...</p>
 </div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
 {previews.map((url, idx) => (
 <motion.div
 key={idx}
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.98 }}
 onClick={() => togglePage(idx)}
 className={cn(
 "relative aspect-[3/4] rounded-none border-2 cursor-pointer transition-all overflow-hidden group",
 selected.includes(idx) 
 ? "border-cyan-500 " 
 : "border-white/5 grayscale opacity-40 hover:opacity-60"
 )}
 >
 <img src={url} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
 <div className="absolute top-2 left-2 w-6 h-6 rounded-none bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20">
 <span className="text-[10px] font-bold text-white">{idx + 1}</span>
 </div>
 {selected.includes(idx) && (
 <div className="absolute top-2 right-2 w-6 h-6 rounded-none bg-cyan-500 flex items-center justify-center shadow-lg">
 <CheckCircle2 className="w-4 h-4 text-black" />
 </div>
 )}
 <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
 </motion.div>
 ))}
 </div>
 )}
 </div>

 <div className="p-6 border-t border-white/10 bg-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
 <div className="flex gap-2">
 <button 
 onClick={() => setSelected(Array.from({ length: previews.length }, (_, i) => i))}
 className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-none text-[10px] font-bold uppercase tracking-widest transition-all"
 >
 Selecionar Todas
 </button>
 <button 
 onClick={() => setSelected([])}
 className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-none text-[10px] font-bold uppercase tracking-widest transition-all"
 >
 Limpar Seleção
 </button>
 </div>
 <button 
 onClick={() => {
 onUpdate(selected);
 onClose();
 }}
 disabled={selected.length === 0}
 className="w-full md:w-auto px-12 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-michroma text-xs rounded-none transition-all disabled:opacity-50"
 >
 CONFIRMAR SELEÇÃO
 </button>
 </div>
 </motion.div>
 </motion.div>
 );
};

const FloatingProgress: React.FC<FloatingProgressProps> = ({ fileName, originalName, progress, status, isVisible }) => {
 return (
 <AnimatePresence>
 {isVisible && (
 <motion.div
 initial={{ opacity: 0, y: 50, scale: 0.9 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 50, scale: 0.9 }}
 className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
 >
 <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-none p-4 overflow-hidden relative">
 {/* Background Glow */}
 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-50" />
 
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-3 overflow-hidden">
 <div className="p-2 bg-cyan-500/20 rounded-none">
 <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
 </div>
 <div className="overflow-hidden">
 <p className="text-white text-sm font-montserrat font-medium truncate">
 {originalName || fileName}
 </p>
 <div className="flex items-center gap-2">
 <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-montserrat font-bold bg-purple-500/20 text-purple-400 uppercase tracking-wider">
 {status}
 </span>
 </div>
 </div>
 </div>
 <div className="text-right">
 <span className="text-cyan-400 font-montserrat font-bold text-lg">
 {Math.round(progress)}%
 </span>
 </div>
 </div>

 <div className="h-1.5 w-full bg-white/5 rounded-none overflow-hidden">
 <motion.div 
 className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"
 initial={{ width: 0 }}
 animate={{ width: `${progress}%` }}
 transition={{ duration: 0.3 }}
 />
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 );
};

const PDFCanvasViewer = ({ url }: { url: string }) => {
 const [numPages, setNumPages] = useState<number>(0);
 const [scale, setScale] = useState<number>(1.5);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [renderKey, setRenderKey] = useState(0);

 useEffect(() => {
 let isMounted = true;
 const loadPdf = async () => {
 setLoading(true);
 setError(null);
 try {
 const loadingTask = pdfjsLib.getDocument({
 url,
 cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.5.207/cmaps/',
 cMapPacked: true,
 });
 const pdf = await loadingTask.promise;
 if (!isMounted) return;
 setNumPages(pdf.numPages);
 setLoading(false);
 } catch (err: any) {
 console.error('Error loading PDF for canvas viewer:', err);
 if (isMounted) {
 setError(err.message || 'Erro ao carregar PDF');
 setLoading(false);
 }
 }
 };
 loadPdf();
 return () => { isMounted = false; };
 }, [url, renderKey]);

 return (
 <div className="flex flex-col h-full bg-[#0a0a0a] overflow-hidden">
 <div className="flex items-center justify-between px-6 py-3 bg-black/60 border-b border-white/10 backdrop-blur-md z-10">
 <div className="flex items-center gap-4">
 <button 
 onClick={() => setScale(prev => Math.max(0.25, prev - 0.25))}
 className="p-2 hover:bg-white/10 rounded-none text-white/60 hover:text-cyan-400 transition-all "
 title="Diminuir Zoom"
 >
 <ZoomOut className="w-5 h-5" />
 </button>
 <div className="px-4 py-1.5 bg-white/5 rounded-none border border-white/10">
 <span className="text-[10px] font-michroma font-black text-cyan-400 uppercase tracking-widest">
 {Math.round(scale * 100)}%
 </span>
 </div>
 <button 
 onClick={() => setScale(prev => Math.min(5, prev + 0.25))}
 className="p-2 hover:bg-white/10 rounded-none text-white/60 hover:text-cyan-400 transition-all "
 title="Aumentar Zoom"
 >
 <ZoomIn className="w-5 h-5" />
 </button>
 </div>
 
 <div className="flex items-center gap-3">
 <button 
 onClick={() => setRenderKey(prev => prev + 1)}
 className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-none text-[10px] font-bold text-white/60 transition-all "
 >
 <RefreshCw className="w-3 h-3" />
 RECARREGAR
 </button>
 </div>
 </div>
 
 <div className="flex-1 overflow-auto p-6 md:p-12 flex flex-col items-center gap-12 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
 {loading ? (
 <div className="flex flex-col items-center justify-center h-full gap-6">
 <div className="relative">
 <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-none animate-spin" />
 <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-cyan-500 animate-pulse" />
 </div>
 <div className="text-center space-y-2">
 <p className="text-[10px] font-michroma text-cyan-400 uppercase tracking-[0.4em] animate-pulse">Renderizando</p>
 <p className="text-[8px] font-montserrat text-white/20 uppercase tracking-widest">Aguarde a decodificação de alta fidelidade</p>
 </div>
 </div>
 ) : error ? (
 <div className="flex flex-col items-center justify-center h-full gap-6 max-w-md text-center">
 <div className="p-6 bg-red-500/10 rounded-none border border-red-500/20">
 <AlertCircle className="w-12 h-12 text-red-500/50 mb-4 mx-auto" />
 <h4 className="text-xs font-michroma text-red-400 uppercase mb-2">Erro de Visualização</h4>
 <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-wider">{error}</p>
 </div>
 <button 
 onClick={() => setRenderKey(prev => prev + 1)}
 className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-none text-[10px] font-bold text-white/60 transition-all "
 >
 TENTAR NOVAMENTE
 </button>
 </div>
 ) : (
 Array.from({ length: numPages }, (_, i) => (
 <PDFPageRenderer key={`${url}-${i}-${scale}-${renderKey}`} url={url} pageNum={i + 1} scale={scale} />
 ))
 )}
 </div>
 </div>
 );
};

const PDFPageRenderer: React.FC<{ url: string, pageNum: number, scale: number }> = ({ url, pageNum, scale }) => {
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const [error, setError] = useState(false);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 let isMounted = true;
 const renderPage = async () => {
 setLoading(true);
 try {
 const loadingTask = pdfjsLib.getDocument({
 url,
 cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.5.207/cmaps/',
 cMapPacked: true,
 });
 const pdf = await loadingTask.promise;
 const page = await pdf.getPage(pageNum);
 if (!isMounted) return;

 const viewport = page.getViewport({ scale: scale * window.devicePixelRatio });
 const canvas = canvasRef.current;
 if (!canvas) return;

 const context = canvas.getContext('2d');
 if (!context) return;

 canvas.height = viewport.height;
 canvas.width = viewport.width;
 canvas.style.width = `${viewport.width / window.devicePixelRatio}px`;
 canvas.style.height = `${viewport.height / window.devicePixelRatio}px`;

 const renderContext = {
 canvasContext: context,
 viewport: viewport,
 canvas: canvas,
 };

 await page.render(renderContext).promise;
 if (isMounted) setLoading(false);
 } catch (err) {
 console.error(`Error rendering page ${pageNum}:`, err);
 if (isMounted) {
 setError(true);
 setLoading(false);
 }
 }
 };

 renderPage();
 return () => { isMounted = false; };
 }, [url, pageNum, scale]);

 return (
 <div className="relative group/page">
 <div className={cn(
 " rounded-none overflow-hidden bg-white transition-all duration-500",
 loading ? "opacity-0 scale-95" : "opacity-100 scale-100"
 )}>
 <canvas ref={canvasRef} className="block" />
 </div>
 
 {loading && (
 <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-none border border-white/5 animate-pulse">
 <p className="text-[8px] font-michroma text-white/10 uppercase tracking-widest">Página {pageNum}</p>
 </div>
 )}

 {error && (
 <div className="w-full min-w-[300px] aspect-[1/1.414] bg-red-500/5 border border-red-500/20 rounded-none flex flex-col items-center justify-center gap-3">
 <AlertCircle className="w-6 h-6 text-red-500/30" />
 <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Erro na Página {pageNum}</p>
 </div>
 )}
 
 <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/page:opacity-100 transition-opacity">
 <span className="text-[9px] font-michroma text-white/20 uppercase tracking-[0.3em]">Página {pageNum}</span>
 </div>
 </div>
 );
};



const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
 return (
 <motion.div
 initial={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 1 }}
 className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
 >
 {/* Futuristic Background Elements */}
 <div className="absolute inset-0 pointer-events-none overflow-hidden">
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)]" />
 <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
 </div>

 <motion.div
 initial={{ scale: 0.8, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ duration: 1.5, ease: "easeOut" }}
 className="relative z-10 text-center"
 >
 <div className="mb-8 relative inline-block">
 <motion.div
 animate={{ 
 rotate: 360,
 scale: [1, 1.1, 1],
 }}
 transition={{ 
 rotate: { duration: 10, repeat: Infinity, ease: "linear" },
 scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
 }}
 className="w-32 h-32 rounded-none border-2 border-dashed border-cyan-500/30 flex items-center justify-center "
 >
 <div className="w-24 h-24 rounded-none border border-cyan-500/50 flex items-center justify-center bg-cyan-500/5 backdrop-blur-sm">
 <Zap className="w-12 h-12 text-cyan-500" />
 </div>
 </motion.div>
 
 {/* Scanning Line */}
 <motion.div
 animate={{ top: ["0%", "100%", "0%"] }}
 transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
 className="absolute left-0 right-0 h-0.5 bg-cyan-400/50 z-20"
 />
 </div>

 <motion.h1 
 initial={{ y: 20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 transition={{ delay: 0.5, duration: 0.8 }}
 className="text-5xl md:text-7xl font-michroma font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40"
 >
 PDF<span className="text-cyan-500">TURBO</span>
 </motion.h1>
 
 <motion.p
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 1, duration: 0.8 }}
 className="text-cyan-500/60 font-michroma text-sm md:text-base tracking-[0.5em] uppercase mb-12"
 >
 Iniciando Pipeline Seguro...
 </motion.p>

 <motion.button
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 1.5, duration: 0.8 }}
 onClick={onComplete}
 className="px-12 py-4 bg-white/5 border border-white/10 rounded-none font-michroma font-black text-sm md:text-base tracking-widest hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all group relative overflow-hidden "
 >
 <span className="relative z-10">ACESSAR SISTEMA</span>
 <motion.div 
 className="absolute inset-0 bg-cyan-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
 />
 </motion.button>
 </motion.div>

 {/* Loading Bar at bottom */}
 <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-64 h-1 bg-white/5 rounded-none overflow-hidden">
 <motion.div
 initial={{ width: 0 }}
 animate={{ width: "100%" }}
 transition={{ duration: 2.5, ease: "easeInOut" }}
 className="h-full bg-cyan-500 "
 />
 </div>
 </motion.div>
 );
};

const GuidancePopup = ({ message, isVisible, onClose }: { message: string, isVisible: boolean, onClose: () => void }) => {
 React.useEffect(() => {
 if (isVisible) {
 const timer = setTimeout(onClose, 30000);
 return () => clearTimeout(timer);
 }
 }, [isVisible, onClose]);

 return (
 <AnimatePresence>
 {isVisible && (
 <motion.div
 initial={{ opacity: 0, scale: 0.9, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 10 }}
 className="absolute -top-16 left-0 right-0 z-20 px-4"
 >
 <div className="bg-cyan-500 text-black p-3 rounded-none flex items-center justify-between gap-4 border border-cyan-400">
 <div className="flex items-center gap-2">
 <Zap className="w-4 h-4 shrink-0" />
 <p className="text-[10px] font-montserrat font-black leading-tight uppercase tracking-tight">
 {message}
 </p>
 </div>
 <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-none transition-colors">
 <X className="w-3 h-3" />
 </button>
 </div>
 {/* Arrow */}
 <div className="w-3 h-3 bg-cyan-500 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b border-cyan-400" />
 </motion.div>
 )}
 </AnimatePresence>
 );
};

export default function App() {
 const [showSplash, setShowSplash] = useState(true);
 const [showGuidance, setShowGuidance] = useState(true);
 const [activeTab, setActiveTab] = useState<'optimize' | 'merge' | 'split'>('optimize');
 
 // Per-tab states
 const [optimizeState, setOptimizeState] = useState<{
 files: FileItem[];
 result: { originalSize: number; compressedSize: number; url: string; type: string; name: string } | null;
 outputFileName: string;
 selectedIndices: number[];
 }>({ files: [], result: null, outputFileName: '', selectedIndices: [] });

 const [mergeState, setMergeState] = useState<{
 files: FileItem[];
 result: { originalSize: number; compressedSize: number; url: string; type: string; name: string } | null;
 outputFileName: string;
 selectedIndices: number[];
 }>({ files: [], result: null, outputFileName: 'hacker_merged.pdf', selectedIndices: [] });

 const [splitState, setSplitState] = useState<{
 files: FileItem[];
 result: { originalSize: number; compressedSize: number; url: string; type: string; name: string } | null;
 splitResults: { name: string; url: string; size: number }[];
 selectedIndices: number[];
 outputFileName: string;
 }>({ files: [], result: null, splitResults: [], selectedIndices: [], outputFileName: '' });

 const [convertState, setConvertState] = useState<{
 files: FileItem[];
 result: { originalSize: number; compressedSize: number; url: string; type: string; name: string } | null;
 outputFileName: string;
 targetFormat: string;
 }>({ files: [], result: null, outputFileName: '', targetFormat: 'docx' });

 const [previewUrl, setPreviewUrl] = useState<string | null>(null);
 const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null);

 // Derived current states based on activeTab
 const currentFiles = activeTab === 'optimize' ? optimizeState.files : activeTab === 'merge' ? mergeState.files : activeTab === 'split' ? splitState.files : convertState.files;
 const currentResult = activeTab === 'optimize' ? optimizeState.result : activeTab === 'merge' ? mergeState.result : activeTab === 'split' ? splitState.result : convertState.result;
 const currentOutputFileName = activeTab === 'optimize' ? optimizeState.outputFileName : activeTab === 'merge' ? mergeState.outputFileName : activeTab === 'split' ? splitState.outputFileName : convertState.outputFileName;
 const currentSplitResults = activeTab === 'split' ? splitState.splitResults : [];

 const [isProcessing, setIsProcessing] = useState(false);
 const [progress, setProgress] = useState(0);
 const [status, setStatus] = useState('');
 const [error, setError] = useState<string | null>(null);
 
 const abortControllerRef = useRef<AbortController | null>(null);

 const setFiles = (newFiles: FileItem[] | ((prev: FileItem[]) => FileItem[])) => {
 if (activeTab === 'optimize') {
 setOptimizeState(prev => ({ ...prev, files: typeof newFiles === 'function' ? newFiles(prev.files) : newFiles }));
 } else if (activeTab === 'merge') {
 setMergeState(prev => ({ ...prev, files: typeof newFiles === 'function' ? newFiles(prev.files) : newFiles }));
 } else if (activeTab === 'split') {
 setSplitState(prev => ({ ...prev, files: typeof newFiles === 'function' ? newFiles(prev.files) : newFiles }));
 } else {
 setConvertState(prev => ({ ...prev, files: typeof newFiles === 'function' ? newFiles(prev.files) : newFiles }));
 }
 };

 const setResult = (newResult: any) => {
 if (activeTab === 'optimize') setOptimizeState(prev => ({ ...prev, result: newResult }));
 else if (activeTab === 'merge') setMergeState(prev => ({ ...prev, result: newResult }));
 else if (activeTab === 'split') setSplitState(prev => ({ ...prev, result: newResult }));
 else setConvertState(prev => ({ ...prev, result: newResult }));
 };

 const setOutputFileName = (name: string) => {
 if (activeTab === 'optimize') setOptimizeState(prev => ({ ...prev, outputFileName: name }));
 else if (activeTab === 'merge') setMergeState(prev => ({ ...prev, outputFileName: name }));
 else if (activeTab === 'split') setSplitState(prev => ({ ...prev, outputFileName: name }));
 else setConvertState(prev => ({ ...prev, outputFileName: name }));
 };

 const setSplitResults = (results: any, resetSelection = true) => {
 setSplitState(prev => ({ 
 ...prev, 
 splitResults: typeof results === 'function' ? results(prev.splitResults) : results, 
 selectedIndices: resetSelection ? [] : prev.selectedIndices 
 }));
 };

 const renameSplitPage = (index: number, newName: string) => {
 setSplitResults((prev: any[]) => prev.map((p, i) => i === index ? { ...p, name: newName } : p), false);
 };

 const bulkRenamePages = (prefix: string) => {
 if (!prefix) return;
 setSplitResults((prev: any[]) => prev.map((p, i) => ({
 ...p,
 name: `${prefix}_${i + 1}.pdf`
 })), false);
 };

 useEffect(() => {
 if (activeTab === 'convert' && convertState.files.length > 0) {
 const baseName = convertState.files[0].customName.replace(/\.[^/.]+$/, "");
 setOutputFileName(`${baseName}.${convertState.targetFormat}`);
 }
 }, [convertState.targetFormat, activeTab, convertState.files]);

 const toggleSelect = (index: number) => {
 if (activeTab === 'optimize') {
 setOptimizeState(prev => ({
 ...prev,
 selectedIndices: prev.selectedIndices.includes(index)
 ? prev.selectedIndices.filter(i => i !== index)
 : [...prev.selectedIndices, index]
 }));
 } else if (activeTab === 'merge') {
 setMergeState(prev => ({
 ...prev,
 selectedIndices: prev.selectedIndices.includes(index)
 ? prev.selectedIndices.filter(i => i !== index)
 : [...prev.selectedIndices, index]
 }));
 } else {
 setSplitState(prev => ({
 ...prev,
 selectedIndices: prev.selectedIndices.includes(index)
 ? prev.selectedIndices.filter(i => i !== index)
 : [...prev.selectedIndices, index]
 }));
 }
 };

 const downloadSelectedInputAsZip = async () => {
 initAudio();
 const state = activeTab === 'optimize' ? optimizeState : mergeState;
 const selectedIndices = state.selectedIndices;
 
 if (selectedIndices.length === 0) {
 playNotificationSound('error');
 setError('Selecione arquivos para baixar como ZIP.');
 return;
 }

 setIsProcessing(true);
 setStatus('Gerando ZIP...');
 setProgress(0);

 try {
 const zip = new JSZip();
 const filesToZip = state.files.filter((_, i) => selectedIndices.includes(i));
 
 for (let i = 0; i < filesToZip.length; i++) {
 const fileItem = filesToZip[i];
 const fileName = fileItem.customName.toLowerCase().endsWith('.pdf') ? fileItem.customName : `${fileItem.customName}.pdf`;
 zip.file(fileName, fileItem.file);
 setProgress(Math.round(((i + 1) / filesToZip.length) * 100));
 }

 const blob = await zip.generateAsync({ type: 'blob' });
 const url = URL.createObjectURL(blob);
 
 const baseName = state.files[0]?.originalName.replace(/\.[^/.]+$/, "") || "PDFTurbo";
 const zipName = `${baseName} PDFTurbo e outros.zip`;

 const a = document.createElement('a');
 a.href = url;
 a.download = zipName;
 a.click();
 URL.revokeObjectURL(url);
 
 setStatus('ZIP baixado!');
 playNotificationSound('success');
 setTimeout(() => setIsProcessing(false), 1000);
 } catch (err: any) {
 playNotificationSound('error');
 setError('Erro ao gerar ZIP: ' + err.message);
 setIsProcessing(false);
 }
 };

 const selectAllPages = () => {
 setSplitState(prev => ({
 ...prev,
 selectedIndices: prev.selectedIndices.length === prev.splitResults.length 
 ? [] 
 : prev.splitResults.map((_, i) => i)
 }));
 };

 const downloadSelectedSplit = async (asZip: boolean) => {
 initAudio();
 const selectedPages = splitState.splitResults.filter((_, i) => splitState.selectedIndices.includes(i));
 if (selectedPages.length === 0) return;

 setIsProcessing(true);
 setStatus(asZip ? 'Gerando ZIP...' : 'Iniciando Downloads...');
 setProgress(0);

 try {
 if (asZip) {
 const zip = new JSZip();
 for (let i = 0; i < selectedPages.length; i++) {
 const page = selectedPages[i];
 const response = await fetch(page.url);
 const blob = await response.blob();
 const fileName = page.name.toLowerCase().endsWith('.pdf') ? page.name : `${page.name}.pdf`;
 zip.file(fileName, blob);
 setProgress(((i + 1) / selectedPages.length) * 100);
 }
 const blob = await zip.generateAsync({ type: 'blob' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 const zipName = currentOutputFileName ? (currentOutputFileName.toLowerCase().endsWith('.zip') ? currentOutputFileName : `${currentOutputFileName}.zip`) : 'selecao_pdf.zip';
 a.download = zipName;
 a.click();
 URL.revokeObjectURL(url);
 } else {
 for (let i = 0; i < selectedPages.length; i++) {
 const page = selectedPages[i];
 const a = document.createElement('a');
 a.href = page.url;
 a.download = page.name.toLowerCase().endsWith('.pdf') ? page.name : `${page.name}.pdf`;
 a.click();
 setProgress(((i + 1) / selectedPages.length) * 100);
 // Pequeno delay para não travar o browser com múltiplos downloads
 await new Promise(r => setTimeout(r, 200));
 }
 }
 setStatus('Concluído!');
 playNotificationSound('success');
 setTimeout(() => setIsProcessing(false), 1000);
 } catch (err: any) {
 playNotificationSound('error');
 setError('Erro no download: ' + err.message);
 setIsProcessing(false);
 }
 };

 const resetAll = () => {
 if (abortControllerRef.current) abortControllerRef.current.abort();
 setOptimizeState({ files: [], result: null, outputFileName: '', selectedIndices: [] });
 setMergeState({ files: [], result: null, outputFileName: 'hacker_merged.pdf', selectedIndices: [] });
 setSplitState({ files: [], result: null, splitResults: [], selectedIndices: [], outputFileName: '' });
 setConvertState({ files: [], result: null, outputFileName: '', targetFormat: 'docx' });
 setIsProcessing(false);
 setProgress(0);
 setStatus('');
 setError(null);
 };

 const cancelProcess = () => {
 if (abortControllerRef.current) {
 abortControllerRef.current.abort();
 setIsProcessing(false);
 setStatus('Cancelado pelo usuário');
 setProgress(0);
 }
 };

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const selectedFiles = Array.from(e.target.files || []) as File[];
 
 const isVercel = (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) || process.env.VERCEL === '1';
  const MAX_SIZE = isVercel ? 4.5 * 1024 * 1024 : 100 * 1024 * 1024; // Vercel has 4.5MB limit
 
 const validFiles = selectedFiles.filter(f => {
 const extension = f.name.split('.').pop()?.toLowerCase();
 const isPdf = f.type === 'application/pdf' || extension === 'pdf';
 const isImage = f.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(extension || '');
 const isDoc = ['doc', 'docx'].includes(extension || '');
 const isSheet = ['xls', 'xlsx', 'csv'].includes(extension || '');
 const isXml = extension === 'xml';
 
 const isCorrectType = activeTab === 'merge' 
 ? (isPdf || isImage)
 : activeTab === 'convert'
 ? (isPdf || isDoc || isSheet || isXml)
 : isPdf;
 
 const isCorrectSize = f.size <= MAX_SIZE;
 return isCorrectType && isCorrectSize;
 });
 
 if (validFiles.length !== selectedFiles.length) {
 const hasWrongType = selectedFiles.some(f => {
 const extension = f.name.split('.').pop()?.toLowerCase();
 const isPdf = f.type === 'application/pdf' || extension === 'pdf';
 const isImage = f.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(extension || '');
 const isDoc = ['doc', 'docx'].includes(extension || '');
 const isSheet = ['xls', 'xlsx', 'csv'].includes(extension || '');
 const isXml = extension === 'xml';

 if (activeTab === 'merge') return !(isPdf || isImage);
 if (activeTab === 'convert') return !(isPdf || isDoc || isSheet || isXml);
 return !isPdf;
 });
 const hasWrongSize = selectedFiles.some(f => f.size > MAX_SIZE);

 let msg = '';
 if (hasWrongType && hasWrongSize) msg = 'Alguns arquivos foram ignorados por tipo inválido ou por excederem 100MB.';
 else if (hasWrongType) {
 if (activeTab === 'merge') msg = 'Apenas PDF e Imagens são permitidos.';
 else if (activeTab === 'convert') msg = 'Formatos suportados: PDF, DOCX, XLSX, CSV, XML.';
 else msg = 'Apenas arquivos PDF são permitidos.';
 }
 else if (hasWrongSize) msg = 'Arquivos acima de 100MB excedem a capacidade de processamento.';
 
 playNotificationSound('error');
 setError(msg);
 } else {
 setError(null);
 }

 if (validFiles.length > 0) {
 const processNewFiles = async () => {
 const newFiles: FileItem[] = await Promise.all(validFiles.map(async f => {
 let totalPages = undefined;
 let selectedPages = undefined;
 if (f.type === 'application/pdf') {
 try {
 const arrayBuffer = await f.arrayBuffer();
 const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
 totalPages = pdf.numPages;
 selectedPages = Array.from({ length: totalPages }, (_, i) => i);
 } catch (e) {
 console.error('Error getting page count:', e);
 }
 } else if (f.type.startsWith('image/')) {
 totalPages = 1;
 selectedPages = [0];
 }
 return { file: f, customName: f.name, originalName: f.name, totalPages, selectedPages };
 }));

 if (activeTab === 'optimize' || activeTab === 'split' || activeTab === 'convert') {
 setFiles([newFiles[0]]);
 setOutputFileName(newFiles[0].customName);
 } else {
 setFiles(prev => [...prev, ...newFiles]);
 if (!currentOutputFileName) setOutputFileName('hacker_merged.pdf');
 }
 setResult(null);
 setSplitResults([]);
 };
 processNewFiles();
 }
 };

 const removeFile = (index: number) => {
 setFiles(prev => prev.filter((_, i) => i !== index));
 if (currentFiles.length <= 1) {
 setResult(null);
 setSplitResults([]);
 }
 };

 const renameFile = (index: number, newName: string) => {
 setFiles(prev => prev.map((f, i) => i === index ? { ...f, customName: newName } : f));
 };



 const processPdf = async (type: string) => {
 initAudio();
 if (currentFiles.length === 0) return;
 
 setIsProcessing(true);
 setProgress(0);
 setStatus('Iniciando...');
 setError(null);
 setSplitResults([]);

 abortControllerRef.current = new AbortController();

 try {
 const interval = setInterval(() => {
 setProgress(prev => {
 if (prev >= 90) {
 clearInterval(interval);
 return 90;
 }
 return prev + Math.random() * 5;
 });
 
 const statuses = ['Injetando Código', 'Processando Buffer', 'Limpando Rastros', 'Finalizando'];
 setStatus(statuses[Math.floor(Math.random() * statuses.length)]);
 }, 400);

 const formData = new FormData();
 if (type === 'merge') {
 const pageSelection: (number[] | null)[] = [];
 currentFiles.forEach(f => {
 const finalName = f.customName.toLowerCase().endsWith('.pdf') ? f.customName : `${f.customName}.pdf`;
 const renamedFile = new File([f.file], finalName, { type: f.file.type });
 formData.append('files', renamedFile);
 pageSelection.push(f.selectedPages || null);
 });
 formData.append('pageSelection', JSON.stringify(pageSelection));
 } else if (type === 'convert') {
 formData.append('targetFormat', convertState.targetFormat);
 // For convert, the input might not be a PDF, so we ensure it has its original extension
 const originalExt = currentFiles[0].file.name.split('.').pop()?.toLowerCase();
 const hasExt = currentFiles[0].customName.toLowerCase().endsWith(`.${originalExt}`);
 const finalName = hasExt ? currentFiles[0].customName : `${currentFiles[0].customName}.${originalExt}`;
 const renamedFile = new File([currentFiles[0].file], finalName, { type: currentFiles[0].file.type });
 formData.append('file', renamedFile);
 } else {
 const finalName = currentFiles[0].customName.toLowerCase().endsWith('.pdf') ? currentFiles[0].customName : `${currentFiles[0].customName}.pdf`;
 const renamedFile = new File([currentFiles[0].file], finalName, { type: currentFiles[0].file.type });
 formData.append('file', renamedFile);
 }

 const response = await fetch(`/api/${type}`, {
 method: 'POST',
 body: formData,
 signal: abortControllerRef.current.signal
 });

 if (!response.ok) {
 let errorMsg = 'Erro no processamento';
 try {
 const text = await response.text();
 try {
 const errData = JSON.parse(text);
 errorMsg = errData.error || errorMsg;
 } catch (e) {
 if (text.includes('<title>')) {
 const titleMatch = text.match(/<title>(.*?)<\/title>/);
 errorMsg = titleMatch ? `Erro do Servidor: ${titleMatch[1]}` : `Erro HTTP ${response.status}`;
 } else {
 errorMsg = text.substring(0, 100) || `Erro HTTP ${response.status}`;
 }
 }
 } catch (e) {
 errorMsg = `Erro HTTP ${response.status}: ${response.statusText}`;
 }
 throw new Error(errorMsg);
 }

 const originalSizeHeader = response.headers.get('X-Original-Size');
 const compressedSizeHeader = response.headers.get('X-Compressed-Size');

 const contentType = response.headers.get('Content-Type');
 if (contentType && contentType.includes('text/html')) {
 throw new Error('O servidor retornou uma página de erro em vez de um arquivo. Verifique a conexão.');
 }

 const blob = await response.blob();
 const url = URL.createObjectURL(blob);
 
 const originalSize = originalSizeHeader ? parseInt(originalSizeHeader) : (type === 'merge' ? currentFiles.reduce((acc, f) => acc + f.file.size, 0) : currentFiles[0].file.size);
 const compressedSize = compressedSizeHeader ? parseInt(compressedSizeHeader) : blob.size;

 // Se for Split, vamos extrair o ZIP no cliente para mostrar o preview
 if (type === 'split') {
 const zip = await JSZip.loadAsync(blob);
 const extractedFiles: { name: string; url: string; size: number }[] = [];
 
 for (const [filename, fileData] of Object.entries(zip.files)) {
 if (!fileData.dir) {
 const content = await fileData.async('blob');
 extractedFiles.push({
 name: filename,
 url: URL.createObjectURL(content),
 size: content.size
 });
 }
 }
 setSplitResults(extractedFiles);
 }

 clearInterval(interval);
 setProgress(100);
 setStatus('Concluído!');
 playNotificationSound('success');

 setTimeout(() => {
 setResult({ 
 originalSize, 
 compressedSize, 
 url, 
 type: blob.type,
 name: currentOutputFileName || (type === 'split' ? 'split_pdf.zip' : type === 'convert' ? `resultado.${convertState.targetFormat}` : 'result.pdf')
 });
 setIsProcessing(false);
 }, 500);

 } catch (err: any) {
 if (err.name === 'AbortError') {
 setStatus('Processo cancelado');
 } else {
 playNotificationSound('error');
 setError(err.message);
 }
 setIsProcessing(false);
 }
 };

 const downloadAllSplit = async () => {
 initAudio();
 const resultsToDownload = splitState.selectedIndices.length > 0 
 ? currentSplitResults.filter((_, i) => splitState.selectedIndices.includes(i))
 : currentSplitResults;

 if (resultsToDownload.length === 0) {
 playNotificationSound('error');
 setError('Selecione pelo menos uma página para baixar.');
 return;
 }
 
 setIsProcessing(true);
 setStatus('Gerando ZIP...');
 setProgress(0);
 
 try {
 const zip = new JSZip();
 for (let i = 0; i < resultsToDownload.length; i++) {
 const page = resultsToDownload[i];
 const response = await fetch(page.url);
 const blob = await response.blob();
 const fileName = page.name.toLowerCase().endsWith('.pdf') ? page.name : `${page.name}.pdf`;
 zip.file(fileName, blob);
 setProgress(Math.round(((i + 1) / resultsToDownload.length) * 100));
 }
 
 const blob = await zip.generateAsync({ type: 'blob' });
 const url = URL.createObjectURL(blob);
 
 // Naming convention: First file name + " PDFTurbo e outros"
 const baseName = currentFiles[0]?.originalName.replace(/\.[^/.]+$/, "") || "PDFTurbo";
 const zipName = `${baseName} PDFTurbo e outros.zip`;

 const a = document.createElement('a');
 a.href = url;
 a.download = zipName;
 a.click();
 URL.revokeObjectURL(url);
 
 setStatus('ZIP baixado!');
 playNotificationSound('success');
 setTimeout(() => setIsProcessing(false), 1000);
 } catch (err: any) {
 playNotificationSound('error');
 setError('Erro ao gerar ZIP: ' + err.message);
 setIsProcessing(false);
 }
 };

 const tabs = [
 { id: 'optimize', label: 'OTIMIZAR', icon: Zap },
 { id: 'merge', label: 'JUNTAR', icon: Merge },
 { id: 'split', label: 'SEPARAR PDF', icon: Scissors },
 { id: 'convert', label: 'CONVERTER', icon: RefreshCw },
 ] as const;

 const formats = [
 { id: 'docx', label: 'DOCX (Word)' },
 { id: 'xlsx', label: 'XLSX (Excel)' },
 { id: 'csv', label: 'CSV (Dados)' },
 { id: 'xml', label: 'XML' },
 { id: 'pdf', label: 'PDF' },
 ];

 return (
 <div className="min-h-screen bg-[#050505] text-white font-montserrat selection:bg-cyan-500/30 overflow-x-hidden relative">
 {/* Hacker Background Effect */}
 <div className="fixed inset-0 pointer-events-none z-0">
 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.05),transparent_70%)]" />
 <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
 </div>
 {/* Splash Screen */}
 <AnimatePresence>
 {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
 </AnimatePresence>

 {/* Background Gradients */}
 <div className="fixed inset-0 overflow-hidden pointer-events-none">
 <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-none" />
 <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-purple-500/10 blur-[150px] rounded-none" />
 <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] bg-pink-500/10 blur-[100px] rounded-none" />
 </div>

 <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-16 pb-32">
 {/* Header */}
 <motion.div 
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 className="text-center mb-12"
 >
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-white/5 border border-white/10 mb-6">
 <span className="w-2 h-2 rounded-none bg-cyan-500 animate-pulse" />
 <span className="text-[10px] font-michroma font-bold tracking-widest uppercase text-cyan-400">v10.0 Ultra Fidelity</span>
 </div>
 <div className="relative h-20 md:h-28 w-full max-w-4xl mx-auto mb-12 overflow-hidden rounded-none group border-y border-white/10">
 {/* Silver/Chrome Bar Background */}
 <div className="absolute inset-0 bg-gradient-to-r from-[#7a7a7a] via-[#f0f0f0] to-[#7a7a7a] " />
 
 {/* Glossy Overlay */}
 <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent h-1/2" />
 
 {/* Content */}
 <div className="absolute inset-0 flex items-center justify-center">
 <h2 className="text-5xl md:text-7xl font-michroma font-black tracking-[0.4em] text-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] select-none italic">
 TURBO
 </h2>
 </div>
 
 {/* Scanline effect */}
 <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30" />
 </div>
 </motion.div>

 {/* Tab Navigation */}
 <div className="flex flex-wrap justify-center gap-2 mb-8">
 {tabs.map((tab) => (
 <button
 key={tab.id}
 onClick={() => {
 setActiveTab(tab.id);
 setError(null);
 }}
 className={cn(
 "flex items-center gap-2 px-8 py-4 rounded-none font-bold text-xs transition-all border-2 relative ",
 activeTab === tab.id 
 ? "bg-cyan-500 text-black border-cyan-400 " 
 : "bg-white/5 text-white/40 border-white/20 hover:border-white/40 hover:text-white "
 )}
 >
 <tab.icon className="w-4 h-4" />
 {tab.label}
 {activeTab !== tab.id && (tab.id === 'optimize' ? optimizeState.files.length > 0 : tab.id === 'merge' ? mergeState.files.length > 0 : splitState.files.length > 0) && (
 <span className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-none border-2 border-[#050505]" />
 )}
 </button>
 ))}
 </div>

 {/* Main Content Area */}
 <motion.div
 key={activeTab}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-white/5 border-2 border-white/20 rounded-none p-6 md:p-10 backdrop-blur-sm relative shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] "
 >
 <GuidancePopup 
 isVisible={showGuidance && currentFiles.length === 0} 
 onClose={() => setShowGuidance(false)}
 message={
 activeTab === 'optimize' ? "V10.0: Otimize o tamanho do seu PDF mantendo a máxima qualidade visual e fidelidade de cores." :
 activeTab === 'merge' ? "V10.0: Una documentos e imagens (RG/CPF) com Smart Scaling automático para A4 sem deformação." :
 activeTab === 'split' ? "V10.0: Separe cada página do seu PDF em arquivos individuais com opção de renomear." :
 "V10.0: Converta PDFs para Word, Excel, CSV ou XML e vice-versa com preservação de estrutura."
 }
 />
 <div className="space-y-6">
 {/* Toolbar */}
 <div className="flex justify-end gap-2">
 <button 
 onClick={resetAll}
 className="flex items-center gap-2 px-3 py-1.5 rounded-none bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 hover:text-white hover:border-white/20 transition-all"
 >
 <RefreshCw className="w-3 h-3" />
 LIMPAR TUDO
 </button>
 </div>

 {/* Upload Area */}
 {(activeTab === 'merge' || currentFiles.length === 0) && (
 <label className="flex flex-col items-center justify-center cursor-pointer py-12 border-2 border-dashed border-white/20 rounded-none hover:border-cyan-500 transition-all bg-white/5 group hover: ">
 <div className="w-16 h-16 bg-white/5 rounded-none flex items-center justify-center mb-4 border border-white/10 group-hover:border-cyan-500/50 transition-colors">
 <FileUp className="w-8 h-8 text-white/40 group-hover:text-cyan-400 transition-colors" />
 </div>
 <h3 className="text-lg font-bold mb-1">
 {activeTab === 'merge' ? 'Adicionar Arquivos' : 'Selecionar PDF'}
 </h3>
 <p className="text-white/40 text-sm md:text-base text-center px-4 font-montserrat">
 {activeTab === 'merge' 
 ? 'Selecione 2 ou mais PDFs/Imagens para unir em um único documento' 
 : activeTab === 'split' 
 ? 'Selecione um PDF para separar cada página individualmente'
 : activeTab === 'convert'
 ? 'Selecione um arquivo para converter para outro formato'
 : 'Selecione um PDF para otimizar o tamanho mantendo a qualidade'}
 </p>
 <input 
 type="file" 
 className="hidden" 
 accept={
 activeTab === 'merge' ? ".pdf,image/*" : 
 activeTab === 'convert' ? ".pdf,.docx,.xlsx,.csv,.xml" : 
 ".pdf"
 } 
 multiple={activeTab === 'merge'} 
 onChange={handleFileChange} 
 />
 </label>
 )}

 {/* File List */}
 {currentFiles.length > 0 && (
 <div className="mb-4 px-2 flex items-center justify-between">
 <div className="flex items-center gap-4">
 <button 
 onClick={() => {
 const allIndices = currentFiles.map((_, i) => i);
 const state = activeTab === 'optimize' ? optimizeState : mergeState;
 const areAllSelected = state.selectedIndices.length === currentFiles.length;
 
 if (activeTab === 'optimize') {
 setOptimizeState(prev => ({ ...prev, selectedIndices: areAllSelected ? [] : allIndices }));
 } else {
 setMergeState(prev => ({ ...prev, selectedIndices: areAllSelected ? [] : allIndices }));
 }
 }}
 className="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 uppercase tracking-widest transition-colors"
 >
 {(activeTab === 'optimize' ? optimizeState.selectedIndices : mergeState.selectedIndices).length === currentFiles.length 
 ? 'Desmarcar Todos' 
 : 'Selecionar Todos'}
 </button>
 
 {(activeTab === 'optimize' ? optimizeState.selectedIndices : mergeState.selectedIndices).length > 0 && (
 <button 
 onClick={downloadSelectedInputAsZip}
 className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors"
 >
 <Download className="w-3 h-3" />
 Baixar Selecionados (ZIP)
 </button>
 )}
 </div>
 <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
 {currentFiles.length} Arquivo(s)
 </span>
 </div>
 )}

 {currentFiles.length > 0 && (
 <div className={cn(
 "space-y-3 pr-2 custom-scrollbar",
 activeTab === 'merge' ? "grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0 max-h-[500px] overflow-y-auto" : "max-h-60 overflow-y-auto"
 )}>
 {currentFiles.map((f, i) => {
 const isSelected = (activeTab === 'optimize' ? optimizeState.selectedIndices : mergeState.selectedIndices).includes(i);
 return (
 <motion.div 
 key={i}
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className={cn(
 "group relative flex flex-col p-4 bg-white/5 rounded-none border-2 transition-all ",
 isSelected ? "border-cyan-500 bg-cyan-500/10" : "border-white/20 hover:border-cyan-500/50",
 activeTab !== 'merge' && "flex-row items-center justify-between"
 )}
 >
 {activeTab === 'merge' ? (
 <>
 <div className="flex gap-4 mb-4">
 <div 
 onClick={() => toggleSelect(i)}
 className={cn(
 "w-6 h-6 rounded-none border-2 flex items-center justify-center cursor-pointer transition-all shrink-0 mt-1",
 isSelected ? "bg-cyan-500 border-cyan-500" : "border-white/20 hover:border-white/40"
 )}
 >
 {isSelected && <Check className="w-4 h-4 text-black" />}
 </div>
 <FileThumbnail file={f.file} className="w-20 h-28 shrink-0" />
 <div className="flex-1 overflow-hidden">
 <input 
 type="text"
 value={f.customName}
 onChange={(e) => renameFile(i, e.target.value)}
 className="w-full bg-transparent border-none text-xs font-bold focus:ring-0 p-0 truncate text-cyan-400"
 />
 <p className="text-[10px] text-white/40 mt-1">{formatBytes(f.file.size)}</p>
 <div className="mt-3 flex flex-wrap gap-2">
 <span className="px-2 py-0.5 bg-white/5 rounded-none text-[8px] font-bold text-white/60 uppercase tracking-widest border border-white/10">
 {f.totalPages || 1} PÁGINAS
 </span>
 {f.selectedPages && f.selectedPages.length < (f.totalPages || 1) && (
 <span className="px-2 py-0.5 bg-amber-500/20 rounded-none text-[8px] font-bold text-amber-500 uppercase tracking-widest border border-amber-500/30">
 {f.selectedPages.length} SELECIONADAS
 </span>
 )}
 </div>
 </div>
 </div>
 <div className="flex gap-2 mt-auto">
 <button 
 onClick={() => setEditingFileIndex(i)}
 className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-none text-[10px] font-bold uppercase tracking-widest transition-all "
 >
 <Scissors className="w-3 h-3" />
 Páginas
 </button>
 <button 
 onClick={() => removeFile(i)}
 className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-none transition-all "
 >
 <Trash2 className="w-4 h-4 text-red-400" />
 </button>
 </div>
 </>
 ) : (
 <>
 <div className="flex items-center gap-4 overflow-hidden flex-1">
 <div 
 onClick={() => toggleSelect(i)}
 className={cn(
 "w-5 h-5 rounded-none border-2 flex items-center justify-center cursor-pointer transition-all shrink-0",
 isSelected ? "bg-cyan-500 border-cyan-500" : "border-white/20 hover:border-white/40"
 )}
 >
 {isSelected && <Check className="w-3 h-3 text-black" />}
 </div>
 <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
 <div className="overflow-hidden flex-1">
 <input 
 type="text"
 value={f.customName}
 onChange={(e) => renameFile(i, e.target.value)}
 className="w-full bg-transparent border-none text-xs font-bold focus:ring-0 focus:outline-none focus:text-cyan-400 transition-colors p-0 truncate"
 />
 <p className="text-[10px] text-white/40">{formatBytes(f.file.size)}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <button 
 onClick={() => removeFile(i)}
 className="p-2 hover:bg-white/10 rounded-none transition-colors border border-transparent hover:border-white/10"
 >
 <Trash2 className="w-4 h-4 text-white/20 hover:text-red-400" />
 </button>
 </div>
 </>
 )}
 </motion.div>
 );
 })}
 </div>
 )}

 {/* Output Filename */}
 {currentFiles.length > 0 && currentResult === null && currentSplitResults.length === 0 && (
 <div className="space-y-2 pt-4 border-t border-white/10">
 <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
 {activeTab === 'split' ? 'Prefixo dos Arquivos (Opcional)' : 'Nome do Arquivo de Saída'}
 </label>
 <div className="relative group">
 <input 
 type="text" 
 value={currentOutputFileName}
 onChange={(e) => setOutputFileName(e.target.value)}
 placeholder={activeTab === 'split' ? "Ex: pagina_extraida" : "Ex: resultado_final.pdf"}
 className="w-full bg-white/5 border border-white/10 rounded-none px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
 />
 <Edit3 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-cyan-400 transition-colors" />
 </div>
 </div>
 )}

 {/* Convert Options */}
 {activeTab === 'convert' && currentFiles.length > 0 && !currentResult && (
 <div className="bg-white/5 border border-white/10 rounded-none p-6">
 <h4 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-4">Formato de Saída</h4>
 <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
 {formats.map((f) => (
 <button
 key={f.id}
 onClick={() => setConvertState(prev => ({ ...prev, targetFormat: f.id }))}
 className={cn(
 "px-4 py-3 rounded-none border-2 font-bold text-[10px] transition-all ",
 convertState.targetFormat === f.id
 ? "bg-cyan-500 text-black border-cyan-400 "
 : "bg-white/5 text-white/40 border-white/20 hover:border-white/40 "
 )}
 >
 {f.label}
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Action Buttons */}
 {currentFiles.length > 0 && (
 <div className="pt-4 flex gap-3">
 {isProcessing ? (
 <button 
 onClick={cancelProcess}
 className="w-full flex items-center justify-center gap-3 py-4 bg-red-500/20 text-red-400 border-2 border-red-500/30 font-black rounded-none hover:bg-red-500/30 transition-all "
 >
 <X className="w-5 h-5" />
 CANCELAR PROCESSO
 </button>
 ) : (
 <>
 {activeTab === 'optimize' && (
 <div className="w-full space-y-4">
 <button 
 onClick={() => processPdf('optimize')}
 className="w-full flex items-center justify-center gap-3 py-5 bg-cyan-500 text-black font-montserrat font-black rounded-none hover:bg-cyan-400 transition-all border-2 border-cyan-400 relative overflow-hidden group"
 >
 <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
 <Zap className="w-6 h-6 animate-pulse" />
 <span className="relative z-10">OTIMIZAR V10.0 (ALTA COMPRESSÃO)</span>
 </button>
 <div className="p-4 bg-black/40 border border-cyan-500/30 rounded-none backdrop-blur-md relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
 <p className="text-[10px] text-cyan-400 font-montserrat font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
 <Loader2 className="w-3 h-3 animate-spin" />
 Motor Hacker V10.0: Ultra Fidelidade Ativa
 </p>
 <p className="text-[9px] text-white/60 font-montserrat leading-relaxed">
 O motor V10.0 utiliza compressão inteligente e re-codificação de alta fidelidade. Aplicando downsampling de 800px e quantização Trellis com mozjpeg para reduzir o peso binário preservando cores e detalhes originais para validade jurídica total.
 </p>
 </div>
 </div>
 )}

 {activeTab === 'merge' && (
 <div className="w-full space-y-4">
 {currentFiles.length === 1 && (
 <motion.div 
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-none flex items-center gap-3"
 >
 <AlertCircle className="w-5 h-5 text-amber-500" />
 <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
 Adicione pelo menos mais um arquivo para habilitar a união.
 </p>
 </motion.div>
 )}
 <button 
 onClick={() => processPdf('merge')}
 disabled={currentFiles.length < 2}
 className={cn(
 "w-full flex items-center justify-center gap-3 py-5 bg-purple-500 text-white font-montserrat font-black rounded-none transition-all border-2 border-purple-400 relative overflow-hidden group disabled:opacity-30 disabled:cursor-not-allowed",
 currentFiles.length >= 2 ? "hover:bg-purple-400 animate-pulse-subtle" : ""
 )}
 >
 <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
 <Merge className="w-6 h-6" />
 <span className="relative z-10">
 {currentFiles.length < 2 ? 'AGUARDANDO MAIS ARQUIVOS...' : 'UNIR COM FIDELIDADE V10.0'}
 </span>
 </button>
 <div className="p-4 bg-black/40 border border-purple-500/30 rounded-none backdrop-blur-md relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
 <p className="text-[9px] text-white/40 font-montserrat leading-relaxed italic">
 * V10.0: Smart Scaling para A4 (RG/CPF) e compressão de alta fidelidade sem perda de cores.
 </p>
 </div>
 </div>
 )}

 {activeTab === 'split' && (
 <div className="w-full space-y-4">
 <button 
 onClick={() => processPdf('split')}
 className="w-full flex items-center justify-center gap-3 py-5 bg-pink-500 text-white font-montserrat font-black rounded-none hover:bg-pink-400 transition-all border-2 border-pink-400 relative overflow-hidden group"
 >
 <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
 <Scissors className="w-6 h-6" />
 <span className="relative z-10">SEPARAR PDF INDIVIDUALMENTE</span>
 </button>
 <div className="p-4 bg-black/40 border border-pink-500/30 rounded-none backdrop-blur-md relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-pink-500" />
 <p className="text-[9px] text-white/40 font-montserrat leading-relaxed italic">
 * Cada página é extraída como um objeto atômico, mantendo a fidelidade absoluta do original.
 </p>
 </div>
 </div>
 )}

 {activeTab === 'convert' && (
 <div className="w-full space-y-4">
 <button 
 onClick={() => processPdf('convert')}
 className="w-full flex items-center justify-center gap-3 py-5 bg-blue-500 text-white font-montserrat font-black rounded-none hover:bg-blue-400 transition-all border-2 border-blue-400 relative overflow-hidden group"
 >
 <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
 <RefreshCw className="w-6 h-6" />
 <span className="relative z-10">CONVERTER AGORA</span>
 </button>
 <div className="p-4 bg-black/40 border border-blue-500/30 rounded-none backdrop-blur-md relative overflow-hidden">
 <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
 <p className="text-[9px] text-white/40 font-montserrat leading-relaxed italic">
 * Conversão inteligente com preservação de metadados e estrutura de documentos.
 </p>
 </div>
 </div>
 )}
 </>
 )}
 </div>
 )}
 </div>
 </motion.div>

 {/* Results */}
 <AnimatePresence>
 {currentResult && (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 className="mt-8 space-y-6"
 >
 {/* Main Result Card */}
 <div className="p-8 bg-emerald-500/10 border-2 border-emerald-500/50 rounded-none relative overflow-hidden group shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
 <CheckCircle2 className="w-32 h-32 text-emerald-400 -rotate-12" />
 </div>
 
 <div className="relative z-10 flex flex-col gap-8">
 <div className="flex flex-col md:flex-row items-center justify-between gap-6">
 <div className="flex items-center gap-5">
 <div className="p-4 bg-emerald-500/20 rounded-none ">
 <CheckCircle2 className="w-8 h-8 text-emerald-400" />
 </div>
 <div>
 <h3 className="text-2xl font-montserrat font-black uppercase tracking-tighter text-emerald-400">Processamento Concluído</h3>
 <div className="flex items-center gap-2 mt-1">
 <p className="text-xs font-montserrat text-white/60 tracking-wider">
 {activeTab === 'optimize' ? 'Otimização de alta fidelidade aplicada com sucesso.' : 
 activeTab === 'merge' ? 'Documentos e imagens unidos com Smart Scaling A4.' : 
 activeTab === 'split' ? 'Páginas do PDF separadas individualmente com sucesso.' :
 'Arquivo convertido com sucesso para o formato selecionado.'}
 </p>
 {(activeTab === 'merge' || activeTab === 'convert') && (
 <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-bold rounded-none border border-emerald-500/30 uppercase tracking-widest">
 Fidelidade Absoluta V10.1
 </span>
 )}
 </div>
 </div>
 </div>
 <div className="flex gap-3 w-full md:w-auto">
 <button 
 onClick={() => {
 if (activeTab === 'split') {
 downloadAllSplit();
 } else {
 const a = document.createElement('a');
 a.href = currentResult.url;
 a.download = currentResult.name;
 a.click();
 }
 }}
 className="flex-1 md:flex-none flex flex-col items-center justify-center gap-1 px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-black font-montserrat font-black rounded-none transition-all border-2 border-emerald-400 group/btn"
 >
 <div className="flex items-center gap-3">
 <Download className="w-6 h-6 group-hover/btn:translate-y-0.5 transition-transform" />
 <span>
 {activeTab === 'split' 
 ? (splitState.selectedIndices.length > 0 
 ? `BAIXAR SELEÇÃO (ZIP) - ${splitState.selectedIndices.length}` 
 : 'BAIXAR TUDO (ZIP)') 
 : activeTab === 'convert'
 ? 'BAIXAR ARQUIVO'
 : 'BAIXAR PDF'}
 </span>
 </div>
 <span className="text-[10px] opacity-70 font-bold tracking-widest">
 {formatBytes(currentResult.compressedSize)} - INTEGRIDADE 100%
 </span>
 </button>
 </div>
 </div>

 {/* Size Comparison Card */}
 {activeTab === 'optimize' && (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-white/10">
 <div className="bg-white/5 p-4 rounded-none border border-white/5 hover:bg-white/10 transition-all">
 <p className="text-[10px] font-montserrat font-bold text-white/40 uppercase mb-1">Tamanho Original</p>
 <p className="text-xl font-montserrat font-bold text-white">{formatBytes(currentResult.originalSize)}</p>
 </div>
 <div className="bg-white/5 p-4 rounded-none border border-white/5 hover:bg-white/10 transition-all relative overflow-hidden group">
 <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
 <p className="text-[10px] font-montserrat font-bold text-white/40 uppercase mb-1">Tamanho Final</p>
 <p className={cn(
 "text-xl font-montserrat font-bold transition-colors",
 currentResult.compressedSize < currentResult.originalSize ? "text-emerald-400" : "text-cyan-400"
 )}>
 {formatBytes(currentResult.compressedSize)}
 </p>
 <p className="text-[8px] text-emerald-400 font-montserrat mt-1 uppercase tracking-tighter">
 {currentResult.compressedSize < currentResult.originalSize 
 ? `Otimização concluída: Redução de ${formatBytes(currentResult.originalSize - currentResult.compressedSize)}`
 : 'Otimização concluída: Arquivo já estava no tamanho ideal'}
 </p>
 </div>
 <div className="bg-cyan-500/20 p-4 rounded-none border border-cyan-500/30 ">
 <p className="text-[10px] font-montserrat font-bold text-cyan-400/60 uppercase mb-1">Economia</p>
 <p className="text-xl font-montserrat font-bold text-cyan-400">
 {currentResult.originalSize > 0 
 ? Math.max(0, ((currentResult.originalSize - currentResult.compressedSize) / currentResult.originalSize * 100)).toFixed(1) 
 : 0}%
 </p>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Split Preview Grid */}
 {activeTab === 'split' && currentSplitResults.length > 0 && (
 <div className="space-y-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-4 rounded-none border border-white/10">
 <div className="flex items-center gap-4">
 <h3 className="text-xs font-michroma font-bold text-white/40 uppercase tracking-[0.2em]">Páginas Extraídas</h3>
 <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded-none border border-cyan-500/30">
 {splitState.selectedIndices.length} / {currentSplitResults.length} SELECIONADOS
 </span>
 </div>
 <div className="flex flex-wrap gap-2">
 <div className="flex items-center bg-white/5 border border-white/10 rounded-none px-3 overflow-hidden focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/50 transition-all">
 <span className="text-[9px] font-bold text-white/40 uppercase mr-2">NOME DO ZIP:</span>
 <input 
 type="text"
 value={currentOutputFileName}
 onChange={(e) => setOutputFileName(e.target.value)}
 placeholder="resultado.zip"
 className="bg-transparent border-none text-[10px] font-bold text-cyan-400 focus:ring-0 focus:outline-none p-2 w-32"
 />
 </div>
 <button 
 onClick={selectAllPages}
 className="px-4 py-2 bg-white/5 hover:bg-white/10 border-2 border-white/20 rounded-none text-[10px] font-bold transition-all flex items-center gap-2 "
 >
 {splitState.selectedIndices.length === currentSplitResults.length ? 'DESELECIONAR TUDO' : 'SELECIONAR TUDO'}
 </button>
 <button 
 onClick={() => downloadSelectedSplit(true)}
 disabled={splitState.selectedIndices.length === 0}
 className="px-4 py-2 bg-cyan-500 text-black border-2 border-cyan-400 rounded-none text-[10px] font-bold transition-all disabled:opacity-50 flex items-center gap-2 "
 >
 <FileArchive className="w-3 h-3" />
 BAIXAR SELEÇÃO (ZIP)
 </button>
 <button 
 onClick={() => downloadSelectedSplit(false)}
 disabled={splitState.selectedIndices.length === 0}
 className="px-4 py-2 bg-white/10 hover:bg-white/20 border-2 border-white/20 rounded-none text-[10px] font-bold transition-all disabled:opacity-50 flex items-center gap-2 "
 >
 <Download className="w-3 h-3" />
 BAIXAR INDIVIDUAL
 </button>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {currentSplitResults.map((page, i) => (
 <motion.div 
 key={i}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: i * 0.03 }}
 className={cn(
 "bg-black/40 border-2 rounded-none p-4 flex flex-col gap-4 group transition-all relative overflow-hidden ",
 splitState.selectedIndices.includes(i) ? "border-cyan-500" : "border-white/20 hover:border-cyan-500/50"
 )}
 >
 {/* Selection Checkbox Overlay */}
 <div 
 onClick={() => toggleSelect(i)}
 className="absolute top-3 left-3 z-20 cursor-pointer"
 >
 <div className={cn(
 "w-5 h-5 rounded-none border flex items-center justify-center transition-all",
 splitState.selectedIndices.includes(i) ? "bg-cyan-500 border-cyan-500" : "bg-black/40 border-white/20"
 )}>
 {splitState.selectedIndices.includes(i) && <CheckCircle2 className="w-3 h-3 text-black" />}
 </div>
 </div>

 {/* Thumbnail / Preview Area */}
 <div 
 onClick={() => setPreviewUrl(page.url)}
 className="aspect-[3/4] bg-white/5 rounded-none border border-white/5 overflow-hidden relative group/thumb cursor-zoom-in flex items-center justify-center"
 >
 <UrlThumbnail url={page.url} />

 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
 <div className="p-3 bg-cyan-500 rounded-none text-black shadow-lg transform scale-90 group-hover/thumb:scale-100 transition-transform">
 <Zap className="w-5 h-5" />
 </div>
 </div>
 </div>

 <div className="space-y-3">
 <div className="space-y-1">
 <label className="text-[8px] font-bold text-white/30 uppercase tracking-widest pl-1">Renomear Página</label>
 <div className="relative group">
 <Edit3 className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 group-focus-within:text-cyan-400" />
 <input 
 type="text"
 value={page.name}
 onChange={(e) => renameSplitPage(i, e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-none text-[10px] font-bold focus:ring-1 focus:ring-cyan-500 py-2 pl-7 pr-2 truncate transition-all"
 />
 </div>
 </div>
 
 <div className="flex items-center justify-between text-[9px] text-white/40 font-bold px-1">
 <span>PÁGINA {i + 1}</span>
 <span>{formatBytes(page.size)}</span>
 </div>

 <div className="flex gap-2">
 <button 
 onClick={() => setPreviewUrl(page.url)}
 className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-none text-[9px] font-bold transition-all flex items-center justify-center gap-2"
 >
 <Zap className="w-3 h-3" />
 VER
 </button>
 <a 
 href={page.url}
 download={page.name}
 className="flex-1 py-2 bg-white/5 hover:bg-cyan-500 hover:text-black rounded-none text-[9px] font-bold transition-all flex items-center justify-center gap-2"
 >
 <Download className="w-3 h-3" />
 BAIXAR
 </a>
 </div>
 </div>
 </motion.div>
 ))}
 </div>
 </div>
 )}
 </motion.div>
 )}
 </AnimatePresence>

 {/* Error */}
 <AnimatePresence>
 {error && (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 10 }}
 className="mt-6"
 >
 <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-none flex items-start gap-4 relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
 <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
 <div className="p-3 bg-red-500/20 rounded-none shrink-0">
 <AlertCircle className="w-6 h-6 text-red-400" />
 </div>
 <div className="flex-1">
 <h4 className="text-sm font-montserrat font-black text-red-400 uppercase tracking-tighter mb-1">
 {activeTab === 'optimize' ? 'Falha no Motor de Compressão' : 
 activeTab === 'merge' ? 'Falha na União de Arquivos' :
 activeTab === 'split' ? 'Falha na Separação do PDF' :
 'Falha na Conversão'}
 </h4>
 <p className="text-xs text-white/70 leading-relaxed font-montserrat">
 {error}
 </p>
 <button 
 onClick={() => setError(null)}
 className="mt-4 text-[10px] font-montserrat font-black text-red-400/60 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded-none px-2 py-1 -ml-2 uppercase tracking-widest transition-all flex items-center gap-2 border border-transparent hover:border-red-500/30"
 >
 <X className="w-3 h-3" />
 [ FECHAR AVISO ]
 </button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </main>

 {/* Page Selector Modal */}
 <AnimatePresence>
 {editingFileIndex !== null && (
 <PageSelectorModal 
 fileItem={currentFiles[editingFileIndex]}
 onClose={() => setEditingFileIndex(null)}
 onUpdate={(selectedPages) => {
 setFiles(prev => prev.map((f, idx) => 
 idx === editingFileIndex ? { ...f, selectedPages } : f
 ));
 }}
 />
 )}
 </AnimatePresence>

 {/* Preview Modal */}
 <AnimatePresence>
 {previewUrl && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
 >
 <motion.div
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 className="w-full max-w-5xl h-full max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-none overflow-hidden flex flex-col "
 >
 <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-cyan-500/20 rounded-none">
 <FileText className="w-5 h-5 text-cyan-400" />
 </div>
 <h3 className="text-sm font-michroma font-bold uppercase tracking-widest text-white/80">Visualização de Documento</h3>
 </div>
 <div className="flex items-center gap-2">
 <a 
 href={previewUrl} 
 target="_blank" 
 rel="noopener noreferrer"
 className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-none text-[10px] font-bold text-cyan-400 transition-all "
 >
 <ExternalLink className="w-3 h-3" />
 ABRIR EM NOVA ABA
 </a>
 <button 
 onClick={() => setPreviewUrl(null)}
 className="p-2 hover:bg-white/10 rounded-none transition-all text-white/40 hover:text-white"
 >
 <X className="w-6 h-6" />
 </button>
 </div>
 </div>
 <div className="flex-1 bg-[#111] relative overflow-hidden">
 <PDFCanvasViewer url={previewUrl} />
 </div>
 <div className="p-4 border-t border-white/10 flex justify-center bg-white/5">
 <button 
 onClick={() => setPreviewUrl(null)}
 className="px-8 py-3 bg-cyan-500 text-black font-michroma font-black text-xs rounded-none hover:bg-cyan-400 transition-all "
 >
 FECHAR VISUALIZAÇÃO
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Floating Progress Bar */}
 <FloatingProgress 
 fileName={currentFiles.length > 1 ? `${currentFiles.length} arquivos` : (currentFiles[0]?.customName || '')} 
 originalName={currentFiles.length === 1 ? currentFiles[0].originalName : undefined}
 progress={progress} 
 status={status} 
 isVisible={isProcessing} 
 />

 {/* Footer */}
 <footer className="fixed bottom-0 left-0 w-full p-4 text-center text-white/10 text-[8px] tracking-[0.3em] font-bold uppercase pointer-events-none">
 Copyright © 2026 Reinaldo Barreto da Silva • Integridade Documental Garantida • Processamento Seguro
 </footer>
 </div>
 );
}
