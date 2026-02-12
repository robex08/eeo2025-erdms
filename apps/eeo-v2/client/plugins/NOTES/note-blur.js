import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, GripHorizontal, ChevronRight, ChevronLeft, StickyNote, Maximize2 } from 'lucide-react';

// --- STICKY NOTES LOGIC (OVERLAY) ---

const COLORS = [
  { bg: 'bg-yellow-200', shadow: 'shadow-yellow-400/50' },
  { bg: 'bg-green-200', shadow: 'shadow-green-400/50' },
  { bg: 'bg-blue-200', shadow: 'shadow-blue-400/50' },
  { bg: 'bg-pink-200', shadow: 'shadow-pink-400/50' },
  { bg: 'bg-purple-200', shadow: 'shadow-purple-400/50' },
  { bg: 'bg-orange-200', shadow: 'shadow-orange-400/50' },
];

function StickyOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zIndexCounter, setZIndexCounter] = useState(1);
  const containerRef = useRef(null);
  
  // Načtení dat
  useEffect(() => {
    const savedNotes = localStorage.getItem('sticky-notes-full-data');
    if (savedNotes) {
      try {
        const parsed = JSON.parse(savedNotes);
        setNotes(parsed);
        if (parsed.length > 0) {
          const maxZ = Math.max(...parsed.map(n => n.zIndex || 1));
          setZIndexCounter(maxZ + 1);
        }
      } catch (e) { console.error(e); }
    } else {
      addNote(window.innerWidth / 2 - 120, window.innerHeight / 3, "Jsem overlay poznámka!\nVidíš ten web pod námi rozmazaně?");
    }
  }, []);

  // Ukládání
  useEffect(() => {
    localStorage.setItem('sticky-notes-full-data', JSON.stringify(notes));
  }, [notes]);

  const addNote = (x, y, content = "") => {
    const randomRotation = Math.random() * 4 - 2;
    const randomColorIdx = Math.floor(Math.random() * COLORS.length);
    
    // Pokud nejsou souřadnice, dáme to doprostřed okna (nebo viewportu)
    const finalX = x ?? (window.innerWidth / 2 - 120);
    const finalY = y ?? (window.innerHeight / 2 - 120);

    const newNote = {
      id: Date.now(),
      x: finalX,
      y: finalY,
      content,
      colorIdx: randomColorIdx,
      rotation: randomRotation,
      zIndex: zIndexCounter,
      width: 240,
      height: 240
    };

    setNotes(prev => [...prev, newNote]);
    setZIndexCounter(prev => prev + 1);
  };

  const updateNoteContent = (id, newContent) => {
    setNotes(notes.map(note => note.id === id ? { ...note, content: newContent } : note));
  };

  const deleteNote = (id) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const bringToFront = (id) => {
    setNotes(notes.map(note => note.id === id ? { ...note, zIndex: zIndexCounter } : note));
    setZIndexCounter(prev => prev + 1);
  };

  // --- Drag Logic ---
  const handleMouseDown = (e, id) => {
    bringToFront(id);
    if (e.target.tagName === 'TEXTAREA' || e.target.closest('button')) return;

    const note = notes.find(n => n.id === id);
    if (!note) return;

    setDraggingId(id);
    setOffset({
      x: e.clientX - note.x,
      y: e.clientY - note.y
    });
  };

  const handleMouseMove = (e) => {
    if (!draggingId) return;

    let newX = e.clientX - offset.x;
    let newY = e.clientY - offset.y;

    setNotes(prev => prev.map(note => 
      note.id === draggingId ? { ...note, x: newX, y: newY } : note
    ));
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, offset]);


  const overlayContent = (
    <>
      {/* HLAVNÍ KONTEJNER (OVERLAY) */}
      <div 
        ref={containerRef}
        className={`fixed inset-0 h-full w-full transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) z-[9999]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* POZADÍ - Téměř průhledné s jemným blurem */}
        <div className="absolute inset-0 bg-stone-900/10 backdrop-blur-sm"></div>

        {/* OVLÁDACÍ LIŠTA (HEADER) - plovoucí nahoře */}
        <div className="absolute top-0 left-0 w-full h-16 flex items-center justify-between px-6 z-50 bg-gradient-to-b from-black/5 to-transparent pointer-events-none">
           {/* Levá část headeru (aktivní prvky musí mít pointer-events-auto) */}
           <div className="pointer-events-auto flex items-center gap-3">
             <span className="font-bold text-slate-700/80 flex items-center gap-2 bg-white/40 px-3 py-1 rounded-full backdrop-blur-md shadow-sm border border-white/20">
               <StickyNote size={18}/> Tabule
             </span>
             <button 
               onClick={() => addNote()}
               className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 px-4 font-bold text-sm"
             >
               <Plus size={18} /> Nová
             </button>
           </div>

           {/* Pravá část - Tlačítko zavřít */}
           <div className="pointer-events-auto">
             <button 
               onClick={() => setIsOpen(false)}
               className="bg-white/50 hover:bg-white text-slate-700 p-2 rounded-full backdrop-blur-md shadow-sm border border-white/20 transition-all hover:rotate-90"
               title="Zavřít tabuli"
             >
               <X size={24} />
             </button>
           </div>
        </div>

        {/* OBLAST PRO POZNÁMKY */}
        {/* w-full h-full aby zabralo celou obrazovku */}
        <div className="w-full h-full relative overflow-hidden"> 
           {notes.map((note) => {
            const style = COLORS[note.colorIdx];
            return (
              <div
                key={note.id}
                className={`absolute flex flex-col p-0 transition-shadow ${style.bg} ${draggingId === note.id ? 'cursor-grabbing shadow-2xl scale-105' : 'cursor-grab shadow-lg'} hover:shadow-xl`}
                style={{
                  left: note.x,
                  top: note.y,
                  width: note.width,
                  height: note.height,
                  zIndex: note.zIndex,
                  transform: `rotate(${note.rotation}deg)`,
                  transition: draggingId === note.id ? 'none' : 'box-shadow 0.2s, transform 0.2s', 
                }}
                onMouseDown={(e) => handleMouseDown(e, note.id)}
              >
                {/* Špendlík */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none filter drop-shadow-md">
                  <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-red-800 shadow-inner relative">
                      <div className="absolute top-1 left-1 w-1 h-1 bg-white/50 rounded-full"></div>
                  </div>
                </div>

                {/* Hlavička */}
                <div className="h-8 w-full flex justify-between items-start px-2 pt-2 opacity-0 hover:opacity-100 transition-opacity">
                   <div className="text-black/20 cursor-grab"><GripHorizontal size={16}/></div>
                   <button onClick={() => deleteNote(note.id)} className="text-slate-500 hover:text-red-600 p-1 rounded hover:bg-black/5">
                     <X size={16} />
                   </button>
                </div>

                {/* Obsah */}
                <textarea
                  value={note.content}
                  onChange={(e) => updateNoteContent(note.id, e.target.value)}
                  placeholder="Poznámka..."
                  className={`w-full h-full bg-transparent resize-none border-0 focus:ring-0 p-4 pt-0 text-slate-800 font-medium leading-relaxed outline-none font-handwriting`}
                  style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}
                />
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-black/5 rounded-tl-lg pointer-events-none"></div>
              </div>
            );
          })}
        </div>

        {/* OUŠKO (TAB) PRO OTEVŘENÍ */}
        {/* Toto ouško je viditelné POUZE když je panel ZAVŘENÝ. 
            Jinak by při plné šířce odletělo mimo obrazovku vpravo. */}
        <button
          onClick={() => setIsOpen(true)}
          className={`absolute top-1/2 right-[-50px] w-[50px] h-32 rounded-r-2xl shadow-[5px_0_15px_-3px_rgba(0,0,0,0.15)] flex items-center justify-center cursor-pointer transition-all border-y border-r border-stone-300/50 backdrop-blur-md
            bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 hover:w-[60px] hover:right-[-60px]
            ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
          `}
          style={{ marginTop: '-64px' }}
          title="Otevřít poznámky"
        >
          <ChevronRight size={28} />
          
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 text-xs uppercase tracking-widest font-bold whitespace-nowrap opacity-40 pointer-events-none">
            Poznámky
          </div>
        </button>
      </div>
    </>
  );

  return createPortal(overlayContent, document.body);
}

// --- HLAVNÍ APLIKACE (DEMO) ---

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-100 to-indigo-50 font-sans text-slate-800 p-8 sm:p-16 transition-all">
      
      <StickyOverlay />

      {/* Obsah hlavní stránky */}
      <div className="max-w-4xl mx-auto bg-white p-12 rounded-3xl shadow-xl border border-white/50 relative overflow-hidden">
        
        {/* Dekorativní pozadí pro ukázku průhlednosti */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-300 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-300 rounded-full blur-[100px] opacity-20 translate-y-1/2 -translate-x-1/2"></div>

        <h1 className="text-4xl font-extrabold mb-6 text-slate-900 tracking-tight relative z-10">
          Demo Webové Stránky
        </h1>
        <p className="text-lg text-slate-600 mb-8 leading-relaxed relative z-10">
          Všimni si "ouška" na levé hraně obrazovky. Klikni na něj a uvidíš novou verzi:
          <br/>
          <strong>Overlay přes celé okno s efektem mléčného skla.</strong>
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 relative z-10">
          <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
              <Maximize2 size={20} className="text-blue-500"/>
              Full Screen Mode
            </h3>
            <p className="text-slate-500">
              Nástěnka se nyní roztáhne přes celé okno prohlížeče, takže máš spoustu místa na poznámky.
            </p>
          </div>
          <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100 shadow-sm">
             <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
              <span className="text-2xl">💧</span>
              Glassmorphism
            </h3>
            <p className="text-slate-500">
              Pozadí nástěnky je téměř průhledné a mírně rozmazané (`backdrop-blur`), takže neztratíš kontakt s webem pod ním.
            </p>
          </div>
        </div>

        <div className="prose prose-slate max-w-none text-slate-500 relative z-10">
          <p>
            Když nástěnku otevřeš, ouško zmizí a objeví se tlačítko <strong>X</strong> v pravém horním rohu pro zavření. 
            To je nutné, protože původní ouško by odletělo mimo obrazovku.
          </p>
          <button className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition-colors">
            Nějaké fiktivní tlačítko webu
          </button>
        </div>
      </div>
    </div>
  );
}