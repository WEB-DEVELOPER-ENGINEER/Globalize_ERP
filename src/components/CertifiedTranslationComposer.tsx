/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FilePlus, Image as ImageIcon, Stamp, Settings, Download, Eye, FileText, 
  Trash2, Plus, Layout, History, CheckCircle2, AlertCircle, Move, RotateCw, 
  Maximize, Minimize, Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, 
  Underline, List, Table as TableIcon, FileUp, Save, Undo, MoreHorizontal,
  FileDigit, ShieldCheck, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import dbInstance from '../db/store';
import { 
  Profile, UserRole, LetterheadTemplate, StampAsset, 
  LayoutPreset, PdfExportLog 
} from '../types';

interface ComposerProps {
  isRtl: boolean;
  currentRole: UserRole;
  currentUser: Profile;
}

type SubTab = 'compose' | 'assets' | 'logs' | 'presets';

export default function CertifiedTranslationComposer({ isRtl, currentRole, currentUser }: ComposerProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('compose');
  const [tick, setTick] = useState(0);

  // Core State for Composition
  const [clientName, setClientName] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [translationContent, setTranslationContent] = useState('');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalFileDataUrl, setOriginalFileDataUrl] = useState<string | null>(null);
  
  // Layout Logic
  const [selectedLetterhead, setSelectedLetterhead] = useState<string>('');
  const [selectedStamp, setSelectedStamp] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [originalPosition, setOriginalPosition] = useState<'before' | 'after' | 'exclude'>('after');
  
  // Interactive Stamp Position
  const [stampPos, setStampPos] = useState({ x: 450, y: 700 }); // Default A4 approx
  const [stampRotation, setStampRotation] = useState(0);
  const [stampScale, setStampScale] = useState(1);
  const [isNaturalVariation, setIsNaturalVariation] = useState(false);
  const [authorizedConfirmation, setAuthorizedConfirmation] = useState(false);

  // Asset Management States
  const [isUploadingLetterhead, setIsUploadingLetterhead] = useState(false);
  const [isUploadingStamp, setIsUploadingStamp] = useState(false);

  useEffect(() => {
    const unsub = dbInstance.subscribe(() => setTick(t => t + 1));
    return unsub;
  }, []);

  const editor = useEditor({
    extensions: [StarterKit],
    content: translationContent,
    onUpdate: ({ editor }) => {
      setTranslationContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-full font-serif',
      },
    },
  });

  useEffect(() => {
    if (editor && translationContent !== editor.getHTML()) {
      editor.commands.setContent(translationContent);
    }
  }, [translationContent, editor]);

  // Pre-load default assets
  useEffect(() => {
    const defaultLh = dbInstance.letterheads.find(l => l.isDefault);
    if (defaultLh) setSelectedLetterhead(defaultLh.id);
  }, [tick]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'original' | 'letterhead' | 'stamp') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'original') {
      setOriginalFile(file);
      const reader = new FileReader();
      reader.onload = (loadEvent) => setOriginalFileDataUrl(loadEvent.target?.result as string);
      reader.readAsDataURL(file);
    } else if (type === 'letterhead') {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const dataUrl = loadEvent.target?.result as string;
        dbInstance.addLetterhead({
          name: file.name,
          imageUrl: dataUrl,
          isDefault: dbInstance.letterheads.length === 0,
          placement: 'background',
          margins: { top: 20, bottom: 20, left: 20, right: 20 },
          opacity: 1
        });
      };
      reader.readAsDataURL(file);
    } else if (type === 'stamp') {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const dataUrl = loadEvent.target?.result as string;
        dbInstance.addStamp({
          name: file.name,
          type: 'company_stamp',
          imageUrl: dataUrl,
          defaultSize: 100,
          defaultOpacity: 1,
          defaultRotation: 0
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportPdf = async () => {
    if (!authorizedConfirmation) {
      alert(isRtl ? 'يرجى تأكيد تفويض استخدام الختم' : 'Please confirm authorization to use the stamp');
      return;
    }

    try {
      const surface = document.getElementById('pdf-a4-surface');
      if (!surface) return;

      // 1. Capture the HTML surface to a hi-res canvas
      const canvas = await html2canvas(surface, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // 2. If we have an original document and it's set to "after", we simulate merging
      // In a real environment with pdf-lib we'd do:
      // const mainPdfBytes = await PDFDocument.load(pdf.output('arraybuffer'));
      // ... merging ...

      const logId = `LOG-${Date.now()}`;
      const fileName = `Certified_${clientName || 'Translation'}_${referenceNo || 'REF'}.pdf`;

      pdf.save(fileName);

      dbInstance.addPdfLog({
        userId: currentUser.id,
        userName: currentUser.fullName,
        clientName: clientName || 'Walk-in Client',
        referenceNo: referenceNo || 'REF-T-001',
        letterheadName: dbInstance.letterheads.find(l => l.id === selectedLetterhead)?.name,
        stampName: dbInstance.stamps.find(s => s.id === selectedStamp)?.name,
        presetName: dbInstance.presets.find(p => p.id === selectedPreset)?.name,
        fileName: fileName,
        status: 'success'
      });

      dbInstance.addNotification({
        title: 'Certified PDF Exported',
        titleAr: 'تم تصدير ملف ترجمة معتمدة',
        message: `Generated official document for ${clientName}. Log ID: ${logId}`,
        messageAr: `تم إصدار ملف رسمي للعميل ${clientName}. رقم السجل: ${logId}`,
        userId: currentUser.id,
        type: 'success'
      });

    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Error generating PDF. Check console.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header & Sub-Tabs */}
      <div className="bg-white rounded-2xl border border-zinc-150 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <ShieldCheck size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-white font-bold tracking-tight">
                {isRtl ? 'محرر الترجمة المعتمدة' : 'Certified Translation Composer'}
              </h3>
              <p className="text-zinc-400 text-[10px] font-medium uppercase tracking-widest">Globalize Legal Terminal</p>
            </div>
          </div>
          
          <div className="flex items-center bg-zinc-800/50 p-1 rounded-xl">
            <button 
              onClick={() => setActiveSubTab('compose')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'compose' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              {isRtl ? 'إنشاء مستند' : 'Compose'}
            </button>
            <button 
              onClick={() => setActiveSubTab('assets')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'assets' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              {isRtl ? 'الأصول واللوجو' : 'Assets & Branding'}
            </button>
            <button 
              onClick={() => setActiveSubTab('presets')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'presets' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              {isRtl ? 'القوالب' : 'Presets'}
            </button>
            <button 
              onClick={() => setActiveSubTab('logs')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'logs' ? 'bg-white text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              {isRtl ? 'الأرشيف' : 'Audit Logs'}
            </button>
          </div>
        </div>

        <div className="p-0">
          {activeSubTab === 'compose' && (
            <div className="flex h-[800px]">
              {/* Left Panel: Inputs */}
              <div className="w-80 border-r border-zinc-100 flex flex-col bg-zinc-50/30 overflow-y-auto">
                <div className="p-5 space-y-6">
                  {/* Meta Information */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                       <FileText size={12} /> Document Info
                    </span>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder={isRtl ? 'اسم العميل' : 'Client Name'}
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                      />
                      <input 
                        type="text" 
                        placeholder={isRtl ? 'رقم المرجع' : 'Reference Number'}
                        value={referenceNo}
                        onChange={e => setReferenceNo(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Attachment Section */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                       <FileUp size={12} /> Original Document
                    </span>
                    <div className={`p-4 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-2 ${originalFile ? 'border-green-200 bg-green-50/30' : 'border-zinc-200 hover:border-zinc-300 bg-white'}`}>
                      {originalFile ? (
                        <>
                          <CheckCircle2 size={24} className="text-green-500" />
                          <p className="text-[10px] font-medium text-green-700 truncate w-full text-center">{originalFile.name}</p>
                          <button onClick={() => setOriginalFile(null)} className="text-[9px] text-zinc-400 hover:text-red-500 underline">Remove</button>
                        </>
                      ) : (
                        <>
                          <FilePlus size={24} className="text-zinc-300" />
                          <label className="text-[10px] font-bold text-zinc-900 cursor-pointer bg-zinc-100 px-3 py-1 rounded-md hover:bg-zinc-200 transition-all">
                             Browse File
                             <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'original')} />
                          </label>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Asset Selection */}
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">{isRtl ? 'اختر الترويسة' : 'Select Letterhead'}</label>
                      <select 
                        value={selectedLetterhead}
                        onChange={e => setSelectedLetterhead(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg outline-none bg-white"
                      >
                        <option value="">None (Empty Page)</option>
                        {dbInstance.letterheads.map(lh => (
                          <option key={lh.id} value={lh.id}>{lh.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">{isRtl ? 'اختر الختم' : 'Select Stamp'}</label>
                      <select 
                        value={selectedStamp}
                        onChange={e => setSelectedStamp(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg outline-none bg-white"
                      >
                        <option value="">No Stamp</option>
                        {dbInstance.stamps.map(st => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">{isRtl ? 'ترتيب المرفقات' : 'Original Position'}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setOriginalPosition('before')}
                          className={`px-2 py-1.5 text-[9px] font-bold rounded-md border transition-all ${originalPosition === 'before' ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-500 border-zinc-200'}`}
                        >Before Trans.</button>
                        <button 
                          onClick={() => setOriginalPosition('after')}
                          className={`px-2 py-1.5 text-[9px] font-bold rounded-md border transition-all ${originalPosition === 'after' ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-500 border-zinc-200'}`}
                        >After Trans.</button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-100">
                    <button 
                      onClick={handleExportPdf}
                      className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      <Download size={16} /> {isRtl ? 'تصدير وثيقة معتمدة' : 'Export Certified PDF'}
                    </button>
                    <div className="mt-3 flex items-start gap-2">
                      <input 
                        type="checkbox" 
                        id="auth-check" 
                        checked={authorizedConfirmation}
                        onChange={e => setAuthorizedConfirmation(e.target.checked)}
                        className="mt-0.5"
                      />
                      <label htmlFor="auth-check" className="text-[9px] leading-tight text-zinc-400 font-medium italic">
                        {isRtl ? 'أؤكد أنني مخول باستخدام الختم/التوقيع المختار لأغراض هذه الوثيقة.' : 'I confirm that I am authorized to use the selected stamp/signature for this document.'}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Panel: Preview & Editor */}
              <div className="flex-1 bg-zinc-100/50 flex flex-col overflow-hidden relative">
                {/* Editor Toolbar Overlay */}
                <div className="px-4 py-2 border-b bg-white border-zinc-150 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active Workspace</span>
                    <div className="flex items-center gap-1">
                       <button className="p-1.5 hover:bg-zinc-100 rounded text-zinc-500"><Undo size={14} /></button>
                       <button className="p-1.5 hover:bg-zinc-100 rounded text-zinc-500"><Save size={14} /></button>
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">Page 1 of 1</div>
                </div>

                <div className="flex-1 overflow-auto p-12 flex justify-center scrollbar-thin">
                  {/* A4 Page Simulation */}
                  <div id="pdf-a4-surface" className="w-[595px] min-h-[842px] bg-white shadow-2xl relative flex flex-col">
                    {/* Letterhead Background Layer */}
                    {selectedLetterhead && (
                      <div className="absolute inset-0 z-0 pointer-events-none opacity-90 overflow-hidden">
                        <img 
                          src={dbInstance.letterheads.find(l => l.id === selectedLetterhead)?.imageUrl} 
                          alt="LH" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Content Layer */}
                    <div className="relative z-10 p-16 flex-1 flex flex-col tiptap-certified">
                      <EditorContent editor={editor} className="flex-1 min-h-fit" />
                    </div>

                    {/* Stamp Layer */}
                    {selectedStamp && (
                      <motion.div 
                        drag
                        dragMomentum={false}
                        style={{ x: stampPos.x, y: stampPos.y, rotate: stampRotation, scale: stampScale }}
                        onDragEnd={(e, info) => setStampPos({ x: info.point.x, y: info.point.y })}
                        className="absolute z-20 cursor-move"
                      >
                         <img 
                          src={dbInstance.stamps.find(s => s.id === selectedStamp)?.imageUrl} 
                          alt="Stamp"
                          className="w-32 h-32 object-contain pointer-events-none"
                         />
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel: Layout Controls */}
              <div className="w-72 border-l border-zinc-100 bg-white p-5 space-y-6 overflow-y-auto">
                 <div className="space-y-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                       <Layout size={12} /> Styling & Layout
                    </span>

                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-zinc-500 uppercase">Stamp Parameters</label>
                       <div className="space-y-3 p-3 bg-zinc-50 rounded-lg">
                          <div className="space-y-1">
                             <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase">
                                <span>Size</span>
                                <span>{Math.round(stampScale * 100)}%</span>
                             </div>
                             <input type="range" min="0.5" max="2" step="0.1" value={stampScale} onChange={e => setStampScale(Number(e.target.value))} className="w-full h-1 bg-zinc-200 appearance-none rounded-full accent-purple-500" />
                          </div>
                          <div className="space-y-1">
                             <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase">
                                <span>Rotation</span>
                                <span>{stampRotation}°</span>
                             </div>
                             <input type="range" min="-180" max="180" step="1" value={stampRotation} onChange={e => setStampRotation(Number(e.target.value))} className="w-full h-1 bg-zinc-200 appearance-none rounded-full accent-purple-500" />
                          </div>
                          <div className="flex items-center justify-between pt-1">
                             <span className="text-[9px] font-bold text-zinc-400 uppercase">Natural Variation</span>
                             <button 
                                onClick={() => setIsNaturalVariation(!isNaturalVariation)}
                                className={`w-8 h-4 rounded-full transition-all relative ${isNaturalVariation ? 'bg-purple-600' : 'bg-zinc-300'}`}
                             >
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isNaturalVariation ? 'right-0.5' : 'left-0.5'}`} />
                             </button>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-zinc-500 uppercase">Typography</label>
                       <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center justify-between p-2 border border-zinc-150 rounded-lg">
                             <Type size={12} className="text-zinc-400" />
                             <select className="text-[10px] font-bold outline-none bg-transparent">
                                <option>Times New Roman</option>
                                <option>Arial</option>
                                <option>Sakkal Majalla</option>
                                <option>Inter</option>
                             </select>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 flex items-center justify-between p-2 border border-zinc-150 rounded-lg">
                               <span className="text-[10px] font-bold text-zinc-400">Size</span>
                               <input type="number" defaultValue={11} className="w-8 text-[10px] font-bold outline-none bg-transparent text-right" />
                            </div>
                            <div className="flex-1 flex items-center justify-between p-2 border border-zinc-150 rounded-lg">
                               <span className="text-[10px] font-bold text-zinc-400">LH</span>
                               <input type="number" step="0.1" defaultValue={1.5} className="w-8 text-[10px] font-bold outline-none bg-transparent text-right" />
                            </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="pt-2">
                    <button className="w-full py-2 border border-zinc-200 text-zinc-500 rounded-lg font-bold text-[10px] hover:bg-zinc-50 transition-all flex items-center justify-center gap-2">
                       <Save size={12} /> Save as Preset
                    </button>
                 </div>
              </div>
            </div>
          )}

          {activeSubTab === 'assets' && (
            <div className="p-8 grid grid-cols-2 gap-8 min-h-[600px]">
              {/* Manage Letterheads */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold flex items-center gap-2 text-zinc-900">
                    <ImageIcon size={18} className="text-zinc-400" /> 
                    {isRtl ? 'الترويسات والشعارات المعتمدة' : 'Official Letterheads'}
                  </h4>
                  <label className="px-3 py-1 bg-zinc-950 text-white rounded-lg text-[10px] font-bold cursor-pointer hover:bg-zinc-800 transition-all flex items-center gap-1.5">
                    <Plus size={12} /> Add Letterhead
                    <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'letterhead')} />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {dbInstance.letterheads.map(lh => (
                    <div key={lh.id} className="group relative border border-zinc-150 rounded-xl overflow-hidden bg-zinc-50">
                      <div className="aspect-[1/1.4] bg-white overflow-hidden p-2">
                        <img src={lh.imageUrl} className="w-full h-full object-contain opacity-60 group-hover:opacity-100 transition-all" alt="Lh" />
                      </div>
                      <div className="p-2.5 bg-white border-t border-zinc-100 flex items-center justify-between">
                        <div className="min-w-0">
                           <p className="text-[10px] font-bold text-zinc-900 truncate">{lh.name}</p>
                           <p className="text-[8px] text-zinc-400 font-medium">Size: A4</p>
                        </div>
                        <div className="flex items-center gap-1">
                           {lh.isDefault && <CheckCircle2 size={12} className="text-green-500" />}
                           <button className="p-1 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {dbInstance.letterheads.length === 0 && (
                    <div className="col-span-2 py-12 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 rounded-2xl text-zinc-300">
                      <ImageIcon size={32} />
                      <p className="text-xs font-medium mt-2">No official letterheads uploaded yet.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Manage Stamps */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold flex items-center gap-2 text-zinc-900">
                    <Stamp size={18} className="text-zinc-400" /> 
                    {isRtl ? 'الأختام والتوقيعات الرسمية' : 'Stamps & Signatures'}
                  </h4>
                  <label className="px-3 py-1 bg-zinc-950 text-white rounded-lg text-[10px] font-bold cursor-pointer hover:bg-zinc-800 transition-all flex items-center gap-1.5">
                    <Plus size={12} /> Add Stamp
                    <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'stamp')} />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {dbInstance.stamps.map(st => (
                    <div key={st.id} className="group relative border border-zinc-150 rounded-xl overflow-hidden bg-zinc-50">
                      <div className="aspect-square bg-white flex items-center justify-center p-4">
                         <img src={st.imageUrl} className="w-full h-full object-contain" alt="Stamp" />
                      </div>
                      <div className="p-2.5 bg-white border-t border-zinc-100 flex items-center justify-between">
                         <div className="min-w-0">
                            <p className="text-[10px] font-bold text-zinc-900 truncate">{st.name}</p>
                            <span className="text-[8px] uppercase font-bold text-purple-600 bg-purple-50 px-1 rounded">{st.type.replace('_',' ')}</span>
                         </div>
                         <button className="p-1 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                  {dbInstance.stamps.length === 0 && (
                    <div className="col-span-2 py-12 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 rounded-2xl text-zinc-300">
                      <Stamp size={32} />
                      <p className="text-xs font-medium mt-2">No official stamps uploaded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'presets' && (
            <div className="p-8 min-h-[600px] space-y-6">
               <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                 <div>
                   <h4 className="text-lg font-light text-zinc-900">{isRtl ? 'قوالب التنسيق المحفوظة' : 'Saved Layout Presets'}</h4>
                   <p className="text-xs text-zinc-400 font-medium">Quick configurations for repeat certified tasks.</p>
                 </div>
                 <button className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                    <Save size={14} /> Create Blank Preset
                 </button>
               </div>
               
               <div className="grid grid-cols-3 gap-6">
                 {dbInstance.presets.map(p => (
                   <div key={p.id} className="p-5 border border-zinc-150 rounded-2xl hover:border-purple-200 hover:shadow-lg transition-all group bg-white cursor-pointer relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <MoreHorizontal size={14} className="text-zinc-300 hover:text-zinc-900" />
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-zinc-50 rounded-xl group-hover:bg-purple-50 transition-colors">
                           <Layout size={20} className="text-zinc-400 group-hover:text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h5 className="text-[13px] font-bold text-zinc-900">{isRtl ? (p.nameAr || p.name) : p.name}</h5>
                          <div className="mt-2 space-y-1">
                             <div className="flex items-center justify-between text-[9px] font-medium text-zinc-400 uppercase">
                                <span>Page Size</span>
                                <span className="text-zinc-600">{p.pageSize}</span>
                             </div>
                             <div className="flex items-center justify-between text-[9px] font-medium text-zinc-400 uppercase">
                                <span>Original Doc</span>
                                <span className="text-zinc-600">Include {p.originalPosition}</span>
                             </div>
                             <div className="flex items-center justify-between text-[9px] font-medium text-zinc-400 uppercase">
                                <span>Stamp Style</span>
                                <span className="text-zinc-600">Custom Position</span>
                             </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-zinc-50 flex items-center gap-2">
                         <button className="flex-1 py-1.5 bg-zinc-950 text-white rounded-lg text-[10px] font-bold">Use Preset</button>
                         <button className="flex-1 py-1.5 bg-zinc-50 text-zinc-500 rounded-lg text-[10px] font-bold hover:bg-zinc-100">Edit</button>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeSubTab === 'logs' && (
            <div className="p-8 min-h-[600px] flex flex-col">
               <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                 <div>
                   <h4 className="text-lg font-light text-zinc-900">{isRtl ? 'سجل عمليات التصدير والتدقيق' : 'PDF Export Audit Trail'}</h4>
                   <p className="text-xs text-zinc-400 font-medium">A security log of every legally certified document generated.</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-zinc-50 rounded-lg text-zinc-400"><History size={16}/></button>
                    <button className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-[10px] font-bold transition-all">Download Report (CSV)</button>
                 </div>
               </div>

               <div className="flex-1 mt-6 overflow-x-auto">
                 <table className="w-full text-[11px]">
                   <thead>
                     <tr className="text-zinc-400 text-left border-b border-zinc-100">
                       <th className="pb-3 px-2 font-bold uppercase tracking-widest">{isRtl ? 'التاريخ والوقت' : 'Timestamp'}</th>
                       <th className="pb-3 px-2 font-bold uppercase tracking-widest">{isRtl ? 'العميل' : 'Client'}</th>
                       <th className="pb-3 px-2 font-bold uppercase tracking-widest">{isRtl ? 'المرجع' : 'Reference'}</th>
                       <th className="pb-3 px-2 font-bold uppercase tracking-widest">{isRtl ? 'المستخدم' : 'Authorized User'}</th>
                       <th className="pb-3 px-2 font-bold uppercase tracking-widest">{isRtl ? 'ملف التصدير' : 'Generated File'}</th>
                       <th className="pb-3 px-2 font-bold uppercase tracking-widest text-right">{isRtl ? 'الحالة' : 'Status'}</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-50">
                     {dbInstance.pdfLogs.map(log => (
                       <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                         <td className="py-3 px-2 font-medium text-zinc-500">{new Date(log.timestamp).toLocaleString()}</td>
                         <td className="py-3 px-2 font-bold text-zinc-900">{log.clientName}</td>
                         <td className="py-3 px-2 font-mono text-zinc-400">{log.referenceNo}</td>
                         <td className="py-3 px-2 font-semibold">
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[10px]">{log.userName[0]}</div>
                               {log.userName}
                            </div>
                         </td>
                         <td className="py-3 px-2 italic text-zinc-400">{log.fileName}</td>
                         <td className="py-3 px-2 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${log.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                               {log.status === 'success' ? 'COMPLETED' : 'FAILED'}
                            </span>
                         </td>
                       </tr>
                     ))}
                     {dbInstance.pdfLogs.length === 0 && (
                       <tr>
                         <td colSpan={6} className="py-12 text-center text-zinc-300 italic">No export history found. Documents generated will appear here for auditing.</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>

               <div className="mt-8 p-4 bg-zinc-50 rounded-2xl border border-zinc-150 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                     <AlertCircle size={20} />
                  </div>
                  <div className="flex-1">
                     <p className="text-[11px] font-bold text-zinc-800">Compliance Warning</p>
                     <p className="text-[10px] text-zinc-500 leading-snug">This audit trail is immutable in production environments. Any attempt to modify or delete logs of certified documents will be flagged for board review.</p>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .tiptap-certified .ProseMirror {
          min-height: 500px;
          outline: none;
        }
        .tiptap-certified .ProseMirror p {
          margin-bottom: 0.5em;
        }
      `}</style>
    </div>
  );
}
