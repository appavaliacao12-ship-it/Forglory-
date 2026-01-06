
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, ZoomIn, ZoomOut, Pen, Highlighter, Hand, 
  Loader2, Eraser, Bold, Italic, 
  Underline, Type as TypeIcon, Save, ChevronDown, Smile, Pause, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Settings2
} from 'lucide-react';
import { DocumentData, Annotation, Tool, Notebook } from '../types';
import AnnotationCanvas from './AnnotationCanvas';
import { EMOJI_CATEGORIES } from '../App';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

const DRAW_COLORS = [
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Black', value: '#0f172a' }
];

interface DocumentViewerProps {
  document: DocumentData;
  notebooks: Notebook[];
  currentNotebookId: string;
  onClose: void;
  onSaveAnnotations: (docId: string, annotations: Annotation[]) => void;
  onAddFlashcard: (q: string, a: string, notebookId: string) => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  document, notebooks, currentNotebookId, onClose, onSaveAnnotations, onAddFlashcard 
}) => {
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<Tool>('scroll');
  const [color, setColor] = useState('#4f46e5');
  const [thickness, setThickness] = useState(3);
  const [annotations, setAnnotations] = useState<Annotation[]>(document.annotations || []);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 });

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  
  const questionRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  
  const startDistRef = useRef<number | null>(null);
  const startZoomRef = useRef<number>(1);

  useEffect(() => {
    const loadDocument = async () => {
      setLoading(true);
      try {
        if (document.type === 'pdf') {
          const loadingTask = pdfjs.getDocument(document.url);
          const pdf = await loadingTask.promise;
          const pages: string[] = [];
          let maxWidth = 0, totalHeight = 0;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = window.document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (context) {
              canvas.height = viewport.height; canvas.width = viewport.width;
              await page.render({ canvasContext: context, viewport }).promise;
              pages.push(canvas.toDataURL('image/jpeg', 0.8));
              maxWidth = Math.max(maxWidth, viewport.width);
              totalHeight += viewport.height;
            }
          }
          const baseW = maxWidth / 1.5;
          setPdfPages(pages); 
          setViewSize({ w: baseW, h: totalHeight / 1.5 });
          setZoom(window.innerWidth / baseW);
        } else {
          const img = new Image();
          img.onload = () => { 
            setViewSize({ w: img.width, h: img.height }); 
            setZoom(window.innerWidth / img.width);
            setLoading(false); 
          };
          img.src = document.url;
        }
      } catch (err) {
        console.error("Error loading document:", err);
      } finally { setLoading(false); }
    };
    loadDocument();
  }, [document]);

  const execCmd = (cmd: string, val: string | undefined = undefined) => { 
    window.document.execCommand(cmd, false, val); 
  };

  const handleSaveFlashcard = () => {
    const q = questionRef.current?.innerHTML || "";
    const a = answerRef.current?.innerHTML || "";
    if (!q.trim() && !a.trim()) return alert("Preencha o card.");
    onAddFlashcard(q, a, currentNotebookId);
    if (questionRef.current) questionRef.current.innerHTML = "";
    if (answerRef.current) answerRef.current.innerHTML = "";
    setIsEditorOpen(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      startDistRef.current = dist;
      startZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && startDistRef.current !== null) {
      if (e.cancelable) e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const ratio = currentDist / startDistRef.current;
      const newZoom = Math.min(Math.max(startZoomRef.current * ratio, 0.4), 8);
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    startDistRef.current = null;
  };

  return (
    <div className="absolute inset-0 bg-slate-900 flex flex-col overflow-hidden z-[100]">
      <div className={`relative flex flex-col bg-slate-950 overflow-hidden transition-all duration-500 ease-in-out ${isEditorOpen ? 'h-[50%]' : 'h-full'}`}>
        <div className="absolute top-4 left-0 right-0 z-[150] flex justify-center px-2">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl lg:rounded-full flex flex-wrap items-center justify-center gap-1.5 p-1.5 shadow-2xl border border-white/20 max-w-full">
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={18} /></button>
            <div className="w-px h-6 bg-slate-200 mx-0.5"></div>
            
            <div className="flex bg-slate-100/80 p-1 rounded-full items-center gap-0.5">
              {['scroll', 'pen', 'highlighter', 'eraser'].map(id => (
                <button key={id} onClick={() => setTool(id as Tool)} className={`p-2 rounded-full transition-all ${tool === id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>
                  {id === 'scroll' ? <Hand size={16} /> : id === 'pen' ? <Pen size={16} /> : id === 'highlighter' ? <Highlighter size={16} /> : <Eraser size={16} />}
                </button>
              ))}
            </div>

            {(tool === 'pen' || tool === 'highlighter') && (
              <>
                <div className="w-px h-6 bg-slate-200 mx-0.5"></div>
                <div className="flex items-center gap-1.5 px-1.5 overflow-x-auto no-scrollbar">
                  <div className="flex gap-1">
                    {DRAW_COLORS.map(c => (
                      <button 
                        key={c.value} 
                        onClick={() => setColor(c.value)}
                        className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full border-2 transition-all ${color === c.value ? 'scale-110 border-indigo-200 ring-2 ring-indigo-500' : 'border-white'}`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 border-l border-slate-200 pl-2">
                    <input 
                      type="range" min="1" max="15" value={thickness} 
                      onChange={(e) => setThickness(parseInt(e.target.value))} 
                      className="w-12 lg:w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="w-px h-6 bg-slate-200 mx-0.5"></div>

            <button onClick={() => setIsEditorOpen(!isEditorOpen)} className={`px-3 lg:px-4 py-2 rounded-xl lg:rounded-full font-black text-[9px] lg:text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${isEditorOpen ? 'bg-rose-500 text-white shadow-inner' : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'}`}>
               <TypeIcon size={14} /> <span className="hidden sm:inline">{isEditorOpen ? 'Ocultar' : 'Novo Card'}</span>
            </button>
          </div>
        </div>

        <div 
          className="flex-1 overflow-auto flex flex-col items-center pt-24 pb-12 no-scrollbar"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-indigo-400"><Loader2 size={32} className="animate-spin" /></div>
          ) : (
            <div className="relative bg-white shadow-2xl origin-top" style={{ width: viewSize.w * zoom, minHeight: viewSize.h * zoom }}>
              {document.type === 'pdf' ? pdfPages.map((p, i) => <img key={i} src={p} className="w-full h-auto block" draggable={false} alt="" />) : <img src={document.url} className="w-full h-auto block" draggable={false} alt="" />}
              <AnnotationCanvas 
                width={viewSize.w * zoom} height={viewSize.h * zoom} annotations={annotations} 
                onAddAnnotation={(ann) => { const u = [...annotations, ann]; setAnnotations(u); onSaveAnnotations(document.id, u); }}
                onUpdateAnnotations={as => { setAnnotations(as); onSaveAnnotations(document.id, as); }}
                tool={tool} color={color} thickness={thickness} intensity={tool === 'highlighter' ? 35 : 100} scale={zoom}
              />
            </div>
          )}
        </div>
      </div>

      <div className={`relative bg-white border-t border-slate-200 z-[200] transition-all duration-500 flex flex-col shadow-2xl ${isEditorOpen ? 'h-[50%]' : 'h-0 pointer-events-none'}`}>
        <div className="px-5 py-3 border-b flex items-center justify-between shrink-0 bg-white shadow-sm">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Pause size={16} fill="currentColor" /></div>
              <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-wider">Editor de Flashcard</h4>
           </div>
           <button onClick={() => setIsEditorOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 flex flex-col bg-slate-50 relative">
          <div className="px-4 py-2 border-b flex flex-wrap items-center gap-1.5 justify-center bg-white shrink-0 relative z-[300]">
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <button onMouseDown={e => { e.preventDefault(); execCmd('bold'); }} className="p-2 text-slate-400 hover:text-indigo-600"><Bold size={14} /></button>
                  <button onMouseDown={e => { e.preventDefault(); execCmd('italic'); }} className="p-2 text-slate-400 hover:text-indigo-600"><Italic size={14} /></button>
                  <button onMouseDown={e => { e.preventDefault(); execCmd('underline'); }} className="p-2 text-slate-400 hover:text-indigo-600"><Underline size={14} /></button>
              </div>
              
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <button onMouseDown={e => { e.preventDefault(); execCmd('justifyLeft'); }} className="p-2 text-slate-400 hover:text-indigo-600"><AlignLeft size={14} /></button>
                  <button onMouseDown={e => { e.preventDefault(); execCmd('justifyCenter'); }} className="p-2 text-slate-400 hover:text-indigo-600"><AlignCenter size={14} /></button>
                  <button onMouseDown={e => { e.preventDefault(); execCmd('justifyRight'); }} className="p-2 text-slate-400 hover:text-indigo-600"><AlignRight size={14} /></button>
              </div>

              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <button onMouseDown={e => { e.preventDefault(); execCmd('insertUnorderedList'); }} className="p-2 text-slate-400 hover:text-indigo-600"><List size={14} /></button>
                  <button onMouseDown={e => { e.preventDefault(); execCmd('insertOrderedList'); }} className="p-2 text-slate-400 hover:text-indigo-600"><ListOrdered size={14} /></button>
              </div>

              <div className="relative">
                <button onMouseDown={e => { e.preventDefault(); setIsEmojiPickerOpen(!isEmojiPickerOpen); }} className={`p-2 bg-white border rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all ${isEmojiPickerOpen ? 'border-indigo-600 shadow-inner' : 'border-slate-200'}`}><Smile size={16} /></button>
                {isEmojiPickerOpen && (
                  <div className="absolute top-full mt-2 right-0 w-[260px] max-w-[85vw] bg-white shadow-3xl rounded-2xl border border-slate-200 p-3 z-[11000] max-h-56 overflow-y-auto no-scrollbar ring-8 ring-black/5 animate-scale-in">
                     <div className="space-y-4">
                        {EMOJI_CATEGORIES.map(cat => (
                          <div key={cat.name}>
                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] block mb-2 border-b border-slate-100 pb-1">{cat.name}</span>
                            <div className="grid grid-cols-6 gap-1.5">
                               {cat.emojis.map((e, idx) => (
                                 <button key={`${e}-${idx}`} onMouseDown={evt => { evt.preventDefault(); execCmd('insertHTML', e); }} className="text-lg hover:bg-indigo-50 rounded-lg p-1 transition-all focus:outline-none text-center transform hover:scale-110">{e}</button>
                               ))}
                            </div>
                          </div>
                        ))}
                     </div>
                  </div>
                )}
              </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4 bg-white/30">
            <div className="space-y-1">
               <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest pl-1">Pergunta</span>
               <div ref={questionRef} contentEditable className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100/50 font-bold text-sm min-h-[70px] doc-editor-area shadow-sm" />
            </div>
            <div className="space-y-1">
               <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest pl-1">Resposta</span>
               <div ref={answerRef} contentEditable className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-100/50 text-sm min-h-[70px] doc-editor-area shadow-sm" />
            </div>
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3 bg-white shrink-0 shadow-inner">
             <button onClick={() => setIsEditorOpen(false)} className="px-5 py-2.5 bg-slate-50 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-slate-100 transition-colors">Cancelar</button>
             <button onClick={handleSaveFlashcard} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all"><Save size={14} /> Salvar</button>
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .doc-editor-area ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin: 0.5rem 0 !important; display: block !important; }
        .doc-editor-area ol { list-style-type: decimal !important; padding-left: 1.5rem !important; margin: 0.5rem 0 !important; display: block !important; }
        .doc-editor-area li { display: list-item !important; margin-bottom: 0.25rem; }
      `}</style>
    </div>
  );
};

export default DocumentViewer;
