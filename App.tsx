

import React, { useState, useEffect, useRef } from 'react';
import Card from './components/Card';
import Button from './components/Button';
import CanvasEditor from './components/CanvasEditor';
import { SavedProject, Language, Theme } from './types';
import { translations } from './translations';
import { getAllProjects, deleteProject, clearAllProjects } from './services/db';

// Generate a large set of random seeds for true variety
const generateRandomExamples = (count: number) => {
  return Array.from({ length: count }).map(() => {
    // Generate a unique random seed
    const seed = Math.random().toString(36).substring(7) + Date.now().toString(36);
    return {
      id: seed,
      // Picsum seed endpoint gives consistent image for a seed
      thumb: `https://picsum.photos/seed/${seed}/800/800`,
      full: `https://picsum.photos/seed/${seed}/2400/2400`
    };
  });
};

function App() {
  const [view, setView] = useState<'HOME' | 'EDITOR' | 'GALLERY'>('HOME');
  const [activeProject, setActiveProject] = useState<Partial<SavedProject> | null>(null);
  const [galleryItems, setGalleryItems] = useState<SavedProject[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  
  // Example State - Initialize with 100 random examples
  const [examples, setExamples] = useState(() => generateRandomExamples(100));
  const [loadingExample, setLoadingExample] = useState(false);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [isHoveringExample, setIsHoveringExample] = useState(false);
  
  // Settings
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('banana_lang') as Language;
    if (saved && ['en', 'vi', 'ko'].includes(saved)) {
      return saved;
    }
    const browserLang = navigator.language.substring(0, 2).toLowerCase();
    if (browserLang === 'vi') return 'vi';
    if (browserLang === 'ko') return 'ko';
    return 'en';
  });
  const [theme, setTheme] = useState<Theme>('auto');

  // Drag State
  const [isDragging, setIsDragging] = useState(false);

  // Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const t = translations[lang];

  // Load settings
  useEffect(() => {
    // Language is handled in initial state
    const savedTheme = localStorage.getItem('banana_theme') as Theme;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  // Theme Logic
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    let effectiveTheme = theme;
    if (theme === 'auto') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    root.classList.add(effectiveTheme);
    localStorage.setItem('banana_theme', theme);
  }, [theme]);

  // Lang Persistence
  useEffect(() => {
    localStorage.setItem('banana_lang', lang);
  }, [lang]);

  // Load Gallery
  useEffect(() => {
    if (view === 'GALLERY') {
      setLoadingGallery(true);
      getAllProjects()
        .then(items => setGalleryItems(items))
        .catch(console.error)
        .finally(() => setLoadingGallery(false));
    }
  }, [view]);

  // Auto Rotate Example
  useEffect(() => {
    // Preload next few images to avoid flickering
    const preloadIndexes = [
        (currentExampleIndex + 1) % examples.length,
        (currentExampleIndex + 2) % examples.length
    ];
    preloadIndexes.forEach(idx => {
        const img = new Image();
        img.src = examples[idx].thumb;
    });
  }, [currentExampleIndex, examples]);

  useEffect(() => {
    if (isHoveringExample) return;

    const interval = setInterval(() => {
      setCurrentExampleIndex(prev => (prev + 1) % examples.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isHoveringExample, examples]);

  const handleNextExample = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setCurrentExampleIndex(prev => (prev + 1) % examples.length);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const project: Partial<SavedProject> = {
        id: Date.now().toString(),
        thumbnail: evt.target?.result as string, 
        createdAt: Date.now(),
        history: [], 
      };
      setActiveProject(project);
      setView('EDITOR');
    };
    reader.readAsDataURL(file);
  };

  const handleUseExample = async () => {
    setLoadingExample(true);
    try {
      // Capture current example to avoid race conditions if index changes during fetch
      const selectedExample = examples[currentExampleIndex];
      
      // Fetch the High Res version
      const response = await fetch(selectedExample.full);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onload = (e) => {
          if (e.target?.result) {
              const project: Partial<SavedProject> = {
                  id: Date.now().toString(),
                  thumbnail: e.target.result as string,
                  createdAt: Date.now(),
                  history: [],
              };
              setActiveProject(project);
              setView('EDITOR');
          }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
       console.error("Error loading example image", error);
    } finally {
      setLoadingExample(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Paste Handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (view !== 'HOME') return;
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          processFile(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [view]);

  // Drag Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        processFile(file);
      }
    }
  };

  const handleReset = () => {
    setActiveProject(null);
    setView('HOME');
  };

  const handleDeleteProject = (id: string) => {
    setConfirmDialog({
      title: t.delete,
      message: t.delete + "?",
      confirmLabel: t.delete,
      onConfirm: async () => {
        await deleteProject(id);
        setGalleryItems(prev => prev.filter(p => p.id !== id));
        setConfirmDialog(null);
      }
    });
  };

  const handleOpenProject = (project: SavedProject) => {
    setActiveProject(project);
    setView('EDITOR');
  };
  
  const handleClearAll = () => {
    setConfirmDialog({
      title: t.deleteAll,
      message: t.deleteAll + "?",
      confirmLabel: t.deleteAll,
      onConfirm: async () => {
        await clearAllProjects();
        setGalleryItems([]);
        setConfirmDialog(null);
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      {/* Navigation */}
      <nav className="py-6 mb-8 shrink-0">
        <div className="container mx-auto px-6 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-2xl font-black text-text select-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1016 1016" className="w-28 h-28 drop-shadow-md hover:scale-110 transition-transform duration-300">
                <path fill="#4A1400" d="M153 216c5-1 22 6 28 8l30 10 10 18-10 17c-11 28-14 63-4 92 4 10 14 19 20 28l18 29a405 405 0 0 0 344 179c52-1 100-13 150-27 43-11 88-18 133-12 10 2 39-2 45 8l17 39a324 324 0 0 1-100 123c-26 21-72 44-103 56a541 541 0 0 1-411-9 403 403 0 0 1-211-215c-16-43-24-105-6-149l11-21c4-6 8-10 11-17a217 217 0 0 0 17-113c-1-5-7-9-8-15-2-5-2-11 0-17 4-7 11-10 19-12Z" data-index="1" style={{opacity:1}}/>
                <path fill="#FED92A" d="m155 251 11 5 32 9-7 36c-5 28-6 48 11 74l9 13c9 10 16 23 23 34 15 23 31 44 50 63l15 14c16 14 26 23 44 36a410 410 0 0 0 338 61l56-15c43-11 89-20 134-13 4 0 19 3 20 5 4 5 9 20 12 27l-23 20c-11 10-23 19-36 28a628 628 0 0 1-372 110 489 489 0 0 1-285-129c-33-32-58-77-68-121-10-42-13-89 16-124l9-13v-1l11-26c6-29 6-64 0-93Z" data-index="2" style={{opacity:1, visibility:'visible', fill:'#ff7ac8'}}/>
                <path fill="#FEAD28" d="M144 370c1 1 2 2 1 3l-2 28v14l-1 8 2 26a270 270 0 0 0 86 157c-14-3-26-16-38-9-10 6-6 23-5 32-33-32-58-77-68-121-10-42-13-89 16-124l9-13v-1Z" data-index="3" style={{opacity:1, visibility:'visible', fill:'#f844ad'}}/>
                <path fill="#371405" d="m141 420 1-23v15l-1 8Z" data-index="4"/>
                <path fill="#fff" d="M211 388c9 10 16 23 23 34 15 23 31 44 50 63l15 14c1 6 6 19-6 18-12 0-24-11-32-20-22-26-37-57-46-90l-4-19Z" data-index="5" style={{visibility:'visible', opacity:1}}/>
                <path fill="#4A1400" d="M143 415c2 19 5 37 11 56 14 45 39 84 70 118l33 33c-10-4-19-10-27-16l-14-14a270 270 0 0 1-74-169l1-8Z" data-index="6" style={{opacity:1}}/>
                <path fill="#FEAD28" d="m166 256 32 9-7 36c-2-3-2-9-3-13l-5-13c-4-8-12-13-17-19Z" data-index="7" style={{opacity:1, visibility:'visible', fill:'#8a1559'}}/>
                <path fill="#4A1400" d="M295 598a429 429 0 0 0 287 79 980 980 0 0 0 190-43l21-9 1 1c-10 6-23 10-33 15-46 19-95 29-145 37-21 3-42 7-64 7-79 0-164-17-230-63l-28-23 1-1Z" data-index="8" style={{opacity:1}}/>
                <path fill="#371405" d="m292 595-8-8 9 7-1 1Z" data-index="9"/>
                <path fill="#704F13" d="m787 621 6-3h1l-6 3h-1Z" data-index="10"/>
                <path fill="#FEAD28" d="M184 645c42 34 78 54 128 76 76 32 156 54 239 42 128-16 261-66 354-157 5 9 9 17 5 27-5 11-12 23-20 32-37 42-89 78-141 101-63 27-140 43-208 44h-27c-59 0-116-11-171-32-61-24-126-65-165-119-11-15-17-28-25-45l20 21 11 10Z" data-index="11" style={{opacity:1, visibility:'visible', fill:'#ce2c8a'}}/>
                <path fill="#B25F0D" d="M541 810h-27c-59 0-116-11-171-32-61-24-126-65-165-119-11-15-17-28-25-45l20 21 11 10c0 2 3 4 4 6a501 501 0 0 0 356 148l30 2c-6 3-31 7-33 9Z" data-index="12" style={{opacity:1, visibility:'visible', fill:'#8a1559'}}/>
                <path fill="#FEAD28" d="M151 228h9l27 8 17 5c2 4 3 6 3 10l-12-3-36-12c-3-1-7-6-8-8Z" data-index="13" style={{opacity:1, visibility:'visible', fill:'#be418a'}}/>
            </svg>
            {t.appName}
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
             {/* View Switcher */}
             <div className="flex gap-2 p-1 bg-white/50 dark:bg-gray-800/50 rounded-2xl shadow-inner backdrop-blur-sm">
                 <button 
                   onClick={() => setView('HOME')} 
                   className={`px-3 py-1.5 rounded-xl font-bold transition-all text-sm ${view === 'HOME' || view === 'EDITOR' ? 'bg-white dark:bg-gray-700 shadow-clay text-text' : 'text-text-muted hover:text-text'}`}
                 >
                   {t.editor}
                 </button>
                 <button 
                   onClick={() => setView('GALLERY')}
                   className={`px-3 py-1.5 rounded-xl font-bold transition-all text-sm ${view === 'GALLERY' ? 'bg-white dark:bg-gray-700 shadow-clay text-text' : 'text-text-muted hover:text-text'}`}
                 >
                   {t.gallery}
                 </button>
             </div>

             {/* Settings */}
             <div className="flex gap-2">
                 <select 
                   value={lang} 
                   onChange={(e) => setLang(e.target.value as Language)}
                   className="bg-white/50 dark:bg-gray-800/50 rounded-xl px-2 py-1 text-sm font-bold text-text border-none focus:ring-2 focus:ring-purple"
                 >
                   <option value="vi">🇻🇳 VI</option>
                   <option value="en">🇺🇸 EN</option>
                   <option value="ko">🇰🇷 KO</option>
                 </select>

                 <button 
                   onClick={() => setTheme(t => t === 'light' ? 'dark' : t === 'dark' ? 'auto' : 'light')}
                   className="w-8 h-8 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 rounded-xl text-text hover:bg-white dark:hover:bg-gray-700 transition-colors"
                   title={`Theme: ${theme}`}
                 >
                   <span className="material-symbols-rounded text-lg">
                     {theme === 'light' ? 'light_mode' : theme === 'dark' ? 'dark_mode' : 'brightness_auto'}
                   </span>
                 </button>
             </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 flex-grow pb-20">
        {view === 'GALLERY' && (
           <div className="animate-float-up">
              <div className="flex justify-between items-end mb-10">
                <div>
                    <h2 className="text-4xl font-black text-text mb-4">{t.galleryTitle}</h2>
                    <p className="text-text-muted">{t.gallerySubtitle}</p>
                </div>
                {galleryItems.length > 0 && (
                    <Button variant="danger" onClick={handleClearAll} className="!px-4 !py-2 !text-sm">
                        {t.deleteAll}
                    </Button>
                )}
              </div>

              {loadingGallery ? (
                  <div className="flex justify-center py-20">
                      <span className="material-symbols-rounded animate-spin text-4xl text-purple">progress_activity</span>
                  </div>
              ) : galleryItems.length === 0 ? (
                <div className="text-center py-20 opacity-80">
                  <span className="material-symbols-rounded text-8xl text-purple mb-4">perm_media</span>
                  <p className="text-xl font-bold text-text mb-4">{t.galleryEmpty}</p>
                  <button onClick={() => setView('HOME')} className="text-pink font-bold underline text-lg">{t.goCreate}</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {galleryItems.map(item => (
                    <Card key={item.id} className="p-4 group relative" hoverEffect>
                       <div className="rounded-xl overflow-hidden aspect-square mb-4 bg-gray-100 dark:bg-gray-700 relative">
                         <img src={item.thumbnail} alt="Project" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                            <Button onClick={() => handleOpenProject(item)} variant="primary" className="!px-4 !py-2">
                                {t.open}
                            </Button>
                         </div>
                       </div>
                       <div className="flex justify-between items-start">
                         <div>
                            <p className="font-bold text-text truncate max-w-[200px]">{new Date(item.updatedAt).toLocaleDateString()}</p>
                            <p className="text-xs text-text-muted">{new Date(item.updatedAt).toLocaleTimeString()}</p>
                         </div>
                         <button 
                           onClick={() => handleDeleteProject(item.id)}
                           className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                           title="Delete"
                         >
                           <span className="material-symbols-rounded text-sm">delete</span>
                         </button>
                       </div>
                    </Card>
                  ))}
                </div>
              )}
           </div>
        )}

        {(view === 'HOME' || view === 'EDITOR') && (
          !activeProject ? (
            <div className="max-w-4xl mx-auto text-center mt-12 animate-float-up">
              <h1 className="text-3xl md:text-6xl font-black text-text mb-6 leading-tight whitespace-pre-line">
                {t.heroTitle}
              </h1>
              <p className="text-xl text-text-muted mb-12 max-w-2xl mx-auto">
                {t.heroSubtitle}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                {/* Upload Card */}
                <Card 
                  className={`
                    p-12 flex flex-col items-center justify-center min-h-[400px] border-4 relative overflow-hidden group transition-all duration-300
                    ${isDragging 
                      ? 'border-purple scale-105 shadow-[0_0_50px_rgba(179,136,255,0.4)] bg-purple-50/50 dark:bg-purple-900/20' 
                      : 'border-dashed border-purple/20 hover:border-purple/40'}
                  `}
                >
                  <div 
                    className="absolute inset-0 z-10"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  ></div>
                  
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                  />
                  
                  <div className={`
                    w-24 h-24 bg-gradient-to-br from-pink to-purple rounded-3xl shadow-clay flex items-center justify-center mb-6 transition-transform duration-300
                    ${isDragging ? 'scale-125 rotate-12' : 'group-hover:scale-110 rotate-3 group-hover:rotate-12'}
                  `}>
                     <span className={`material-symbols-rounded text-5xl text-white transition-all ${isDragging ? 'animate-bounce' : ''}`}>
                       {isDragging ? 'download' : 'add_photo_alternate'}
                     </span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-text mb-2">
                    {isDragging ? t.uploadTitle : t.uploadTitle}
                  </h3>
                  <p className="text-text-muted font-semibold">
                    {isDragging ? "Release to start magic!" : t.uploadSubtitle}
                  </p>
                  
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-yellow rounded-full opacity-20 blur-2xl"></div>
                  <div className="absolute -top-10 -left-10 w-40 h-40 bg-pink rounded-full opacity-20 blur-2xl"></div>
                </Card>

                {/* Demo Visual */}
                <div 
                  className="relative hidden md:block" 
                  onMouseEnter={() => setIsHoveringExample(true)} 
                  onMouseLeave={() => setIsHoveringExample(false)}
                >
                  <Card className="p-4 rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                    <div className="relative group rounded-2xl overflow-hidden aspect-square shadow-inner bg-gray-200 dark:bg-gray-700">
                        {/* Previous Image (Background) for slide effect */}
                        <img 
                          src={examples[(currentExampleIndex - 1 + examples.length) % examples.length].thumb} 
                          alt="Previous" 
                          className="absolute inset-0 w-full h-full object-cover" 
                        />
                        
                        {/* Current Image (Foreground) */}
                        <img 
                          key={currentExampleIndex}
                          src={examples[currentExampleIndex].thumb} 
                          alt="Demo" 
                          className="absolute inset-0 w-full h-full object-cover animate-slide-in-right z-10" 
                        />
                        
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col gap-3 items-center justify-center backdrop-blur-[2px] z-20">
                            <Button 
                                onClick={handleUseExample} 
                                icon="auto_fix_high" 
                                variant="primary"
                                isLoading={loadingExample}
                            >
                                {t.useExample}
                            </Button>
                            <Button
                                onClick={handleNextExample}
                                variant="secondary"
                                className="!p-3 !rounded-full"
                                title={t.rotate}
                            >
                                <span className="material-symbols-rounded">refresh</span>
                            </Button>
                        </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <CanvasEditor 
              initialProject={activeProject}
              onBack={handleReset} 
              lang={lang}
            />
          )
        )}
      </main>

      {/* Footer Attribution */}
      {(!activeProject && view !== 'EDITOR') || view === 'GALLERY' ? (
        <footer className="py-8 text-center text-text-muted text-sm font-bold opacity-60 hover:opacity-100 transition-opacity">
          {t.madeBy}
        </footer>
      ) : null}

      {/* Global Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <Card className="max-w-sm w-full p-6 flex flex-col gap-4">
              <h3 className="text-2xl font-black text-text">{confirmDialog.title}</h3>
              <p className="text-text-muted font-medium">{confirmDialog.message}</p>
              <div className="flex justify-end gap-3 mt-4">
                 <Button variant="ghost" onClick={() => setConfirmDialog(null)}>{t.cancel}</Button>
                 <Button variant="danger" onClick={confirmDialog.onConfirm}>
                    {confirmDialog.confirmLabel || t.apply}
                 </Button>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
}

export default App;