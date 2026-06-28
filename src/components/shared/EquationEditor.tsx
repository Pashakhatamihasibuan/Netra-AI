'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ── KaTeX loader (singleton) ──────────────────────────────────────────────────
let katexLoaded = false;
let katexLoading = false;
const katexQueue: Array<() => void> = [];

function loadKaTeX(): Promise<void> {
  return new Promise((resolve) => {
    if (katexLoaded) { resolve(); return; }
    katexQueue.push(resolve);
    if (katexLoading) return;
    katexLoading = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js';
    script.onload = () => { katexLoaded = true; katexQueue.forEach((cb) => cb()); katexQueue.length = 0; };
    document.head.appendChild(script);
  });
}

// ── LaTeX → Unicode untuk sisipan langsung ke teks soal ─────────────────────
// Simbol-simbol ini bisa tampil sebagai plain text tanpa perlu KaTeX render
const LATEX_TO_UNICODE: Record<string, string> = {
  '\\times':    '×',
  '\\div':      '÷',
  '\\pm':       '±',
  '\\neq':      '≠',
  '\\leq':      '≤',
  '\\geq':      '≥',
  '\\approx':   '≈',
  '\\infty':    '∞',
  '\\pi':       'π',
  '\\angle':    '∠',
  '\\triangle': '△',
  '\\perp':     '⊥',
  '\\parallel': '∥',
  '\\%':        '%',
};

/**
 * Konversi latex ke representasi yang ramah guru:
 * - Simbol sederhana (×, ÷, π, …) → karakter Unicode langsung
 * - Ekspresi kompleks (frac, sqrt, …) → tetap dibungkus $...$ agar dirender KaTeX di sisi siswa
 */
function latexToEditable(latex: string): string {
  // Cek apakah SELURUH ekspresi adalah satu simbol sederhana
  const trimmed = latex.trim();
  if (LATEX_TO_UNICODE[trimmed]) return LATEX_TO_UNICODE[trimmed];

  // Ganti simbol inline dalam ekspresi kompleks
  let result = trimmed;
  for (const [cmd, uni] of Object.entries(LATEX_TO_UNICODE)) {
    // Ganti \times{ atau \times diikuti spasi/akhir
    result = result.replace(new RegExp(cmd.replace('\\', '\\\\') + '(?=[\\s{^_]|$)', 'g'), uni);
  }

  // Jika masih ada perintah LaTeX tersisa → bungkus dengan $
  if (/\\[a-zA-Z{]/.test(result) || /[\^_{}]/.test(result)) {
    return `$${result}$`;
  }
  return result;
}

// ── MathRenderer ─────────────────────────────────────────────────────────────
export function MathRenderer({ latex, display = false, className }: {
  latex: string; display?: boolean; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!latex.trim()) return;
    loadKaTeX().then(() => {
      if (!ref.current || !(window as any).katex) return;
      try {
        (window as any).katex.render(latex, ref.current, { displayMode: display, throwOnError: false });
        setErr(null);
      } catch (e) { setErr(e instanceof Error ? e.message : 'Error'); }
    });
  }, [latex, display]);
  if (err) return <span className="text-red-500 text-xs font-mono">{err}</span>;
  return <span ref={ref} className={className} />;
}

// ── MathText: render teks + LaTeX inline ($...$) / display ($$...$$) ─────────
export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$'))
          return <MathRenderer key={i} latex={part.slice(2, -2).trim()} display />;
        if (part.startsWith('$') && part.endsWith('$'))
          return <MathRenderer key={i} latex={part.slice(1, -1).trim()} />;
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

// ── Template data ─────────────────────────────────────────────────────────────
interface TemplateField { id: string; hint: string }
interface TemplateItem {
  sym: string; label: string;
  direct?: string;
  fields?: TemplateField[];
  tpl?: (v: Record<string, string>) => string;
}
interface TabGroup { label: string; items: TemplateItem[] }

const TABS: TabGroup[] = [
  {
    label: 'Pecahan & Akar',
    items: [
      { sym: 'a/b',       label: 'Pecahan',         fields: [{id:'a',hint:'Pembilang (atas)'},{id:'b',hint:'Penyebut (bawah)'}], tpl: v=>`\\frac{${v.a}}{${v.b}}` },
      { sym: '√x',        label: 'Akar kuadrat',    fields: [{id:'x',hint:'Isi dalam akar'}], tpl: v=>`\\sqrt{${v.x}}` },
      { sym: '∛x',        label: 'Akar kubik',      fields: [{id:'x',hint:'Isi dalam akar'}], tpl: v=>`\\sqrt[3]{${v.x}}` },
      { sym: 'ⁿ√x',       label: 'Akar ke-n',       fields: [{id:'n',hint:'Pangkat akar'},{id:'x',hint:'Isi dalam akar'}], tpl: v=>`\\sqrt[${v.n}]{${v.x}}` },
      { sym: 'xⁿ',        label: 'Pangkat',         fields: [{id:'x',hint:'Bilangan dasar'},{id:'n',hint:'Eksponen'}], tpl: v=>`${v.x}^{${v.n}}` },
      { sym: 'xₙ',        label: 'Indeks bawah',    fields: [{id:'x',hint:'Variabel'},{id:'n',hint:'Indeks'}], tpl: v=>`${v.x}_{${v.n}}` },
      { sym: 'a/b+c/d',   label: 'Jumlah pecahan',  fields: [{id:'a',hint:'Pembilang 1'},{id:'b',hint:'Penyebut 1'},{id:'c',hint:'Pembilang 2'},{id:'d',hint:'Penyebut 2'}], tpl: v=>`\\frac{${v.a}}{${v.b}} + \\frac{${v.c}}{${v.d}}` },
    ],
  },
  {
    label: 'Operasi & Simbol',
    items: [
      { sym: '×',  label: 'Kali',        direct: '\\times' },
      { sym: '÷',  label: 'Bagi',        direct: '\\div' },
      { sym: '±',  label: 'Plus-minus',  direct: '\\pm' },
      { sym: '≠',  label: 'Tidak sama',  direct: '\\neq' },
      { sym: '≤',  label: 'Kurang/sama', direct: '\\leq' },
      { sym: '≥',  label: 'Lebih/sama',  direct: '\\geq' },
      { sym: '≈',  label: 'Mendekati',   direct: '\\approx' },
      { sym: '∞',  label: 'Tak hingga',  direct: '\\infty' },
      { sym: '%',  label: 'Persen',      direct: '\\%' },
      { sym: 'π',  label: 'Pi',          direct: '\\pi' },
      { sym: '°',  label: 'Derajat',     fields: [{id:'n',hint:'Nilai sudut, mis: 90'}], tpl: v=>`${v.n}^{\\circ}` },
      { sym: 'Σ',  label: 'Sigma',       fields: [{id:'start',hint:'Mulai, mis: i=1'},{id:'end',hint:'Sampai, mis: n'}], tpl: v=>`\\sum_{${v.start}}^{${v.end}}` },
    ],
  },
  {
    label: 'Geometri',
    items: [
      { sym: 'Luas ○',     label: 'Luas lingkaran',       fields: [{id:'r',hint:'Jari-jari'}], tpl: v=>`\\pi ${v.r}^{2}` },
      { sym: 'Keliling ○', label: 'Keliling lingkaran',   fields: [{id:'r',hint:'Jari-jari'}], tpl: v=>`2\\pi ${v.r}` },
      { sym: 'Luas △',     label: 'Luas segitiga',        fields: [{id:'a',hint:'Alas'},{id:'t',hint:'Tinggi'}], tpl: v=>`\\frac{1}{2} \\times ${v.a} \\times ${v.t}` },
      { sym: 'Pitagoras',  label: 'Teorema Pythagoras',   fields: [{id:'a',hint:'Sisi a'},{id:'b',hint:'Sisi b'},{id:'c',hint:'Hipotenusa c'}], tpl: v=>`${v.a}^{2}+${v.b}^{2}=${v.c}^{2}` },
      { sym: 'Luas □',     label: 'Luas persegi',         fields: [{id:'s',hint:'Sisi'}], tpl: v=>`${v.s}^{2}` },
      { sym: 'Luas ▭',     label: 'Luas persegi panjang', fields: [{id:'p',hint:'Panjang'},{id:'l',hint:'Lebar'}], tpl: v=>`${v.p} \\times ${v.l}` },
      { sym: 'Vol. kubus', label: 'Volume kubus',         fields: [{id:'s',hint:'Rusuk'}], tpl: v=>`${v.s}^{3}` },
      { sym: 'Vol. balok', label: 'Volume balok',         fields: [{id:'p',hint:'Panjang'},{id:'l',hint:'Lebar'},{id:'t',hint:'Tinggi'}], tpl: v=>`${v.p} \\times ${v.l} \\times ${v.t}` },
      { sym: '∠', label: 'Sudut',       direct: '\\angle' },
      { sym: '△', label: 'Segitiga',    direct: '\\triangle' },
      { sym: '⊥', label: 'Tegak lurus', direct: '\\perp' },
      { sym: '∥', label: 'Sejajar',     direct: '\\parallel' },
    ],
  },
  {
    label: 'Aljabar',
    items: [
      { sym: 'ax²+bx+c', label: 'Persamaan kuadrat', fields: [{id:'a',hint:'Koef. a'},{id:'b',hint:'Koef. b'},{id:'c',hint:'Konstanta c'}], tpl: v=>`${v.a}x^{2}+${v.b}x+${v.c}=0` },
      { sym: 'Rumus ABC', label: 'Rumus kuadratik',   fields: [{id:'a',hint:'Koef. a'},{id:'b',hint:'Koef. b'},{id:'c',hint:'Konstanta c'}], tpl: v=>`x = \\frac{-${v.b} \\pm \\sqrt{${v.b}^{2}-4\\cdot${v.a}\\cdot${v.c}}}{2\\cdot${v.a}}` },
      { sym: '(a+b)²',   label: 'Kuadrat jumlah',    fields: [{id:'a',hint:'Nilai a'},{id:'b',hint:'Nilai b'}], tpl: v=>`(${v.a}+${v.b})^{2}=${v.a}^{2}+2\\cdot${v.a}\\cdot${v.b}+${v.b}^{2}` },
      { sym: '(a-b)²',   label: 'Kuadrat selisih',   fields: [{id:'a',hint:'Nilai a'},{id:'b',hint:'Nilai b'}], tpl: v=>`(${v.a}-${v.b})^{2}=${v.a}^{2}-2\\cdot${v.a}\\cdot${v.b}+${v.b}^{2}` },
      { sym: 'a²-b²',    label: 'Selisih kuadrat',   fields: [{id:'a',hint:'Nilai a'},{id:'b',hint:'Nilai b'}], tpl: v=>`${v.a}^{2}-${v.b}^{2}=(${v.a}+${v.b})(${v.a}-${v.b})` },
      { sym: 'SPL 2×2',  label: 'Sistem persamaan',  fields: [{id:'a',hint:'Koef x pers.1'},{id:'b',hint:'Koef y pers.1'},{id:'c',hint:'Hasil pers.1'},{id:'d',hint:'Koef x pers.2'},{id:'e',hint:'Koef y pers.2'},{id:'f',hint:'Hasil pers.2'}], tpl: v=>`\\begin{cases}${v.a}x+${v.b}y=${v.c}\\\\${v.d}x+${v.e}y=${v.f}\\end{cases}` },
    ],
  },
  {
    label: 'Statistik',
    items: [
      { sym: 'x̄ Rerata', label: 'Rumus rerata',  fields: [{id:'n',hint:'Jumlah data'}], tpl: v=>`\\bar{x}=\\frac{\\sum x}{${v.n}}` },
      { sym: 'Median',   label: 'Median ganjil', fields: [{id:'n',hint:'Banyak data'}], tpl: v=>`\\text{Median} = x_{\\frac{${v.n}+1}{2}}` },
      { sym: 'Modus',    label: 'Simbol modus',  direct: '\\text{Modus}' },
      { sym: 'P(%)',     label: 'Persentase',    fields: [{id:'a',hint:'Bagian'},{id:'b',hint:'Total'}], tpl: v=>`\\frac{${v.a}}{${v.b}}\\times 100\\%` },
      { sym: 'a : b',   label: 'Perbandingan',  fields: [{id:'a',hint:'Nilai a'},{id:'b',hint:'Nilai b'}], tpl: v=>`${v.a}:${v.b}` },
    ],
  },
];

// ── FieldModal ────────────────────────────────────────────────────────────────
function FieldModal({ item, onConfirm, onCancel }: {
  item: TemplateItem;
  onConfirm: (latex: string) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries((item.fields ?? []).map((f) => [f.id, '']))
  );
  const [preview, setPreview] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  const updatePreview = useCallback((vals: Record<string, string>) => {
    if (!item.tpl) return;
    const filled = Object.fromEntries(
      (item.fields ?? []).map((f) => [f.id, vals[f.id].trim() || f.hint.split(',')[0].split(' ')[0]])
    );
    try { setPreview(item.tpl(filled)); } catch { setPreview(''); }
  }, [item]);

  useEffect(() => { updatePreview(values); }, []);

  useEffect(() => {
    if (!preview.trim() || !previewRef.current) return;
    loadKaTeX().then(() => {
      if (!previewRef.current || !(window as any).katex) return;
      try { (window as any).katex.render(preview, previewRef.current, { displayMode: true, throwOnError: false }); }
      catch { if (previewRef.current) previewRef.current.textContent = preview; }
    });
  }, [preview]);

  function handleChange(id: string, val: string) {
    const next = { ...values, [id]: val };
    setValues(next);
    updatePreview(next);
  }

  function handleConfirm() {
    if (!item.tpl) return;
    const filled = Object.fromEntries(
      (item.fields ?? []).map((f) => [f.id, values[f.id].trim() || f.hint.split(',')[0].split(' ')[0]])
    );
    onConfirm(item.tpl(filled));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-sm p-5">
        <p className="font-semibold text-[#0D2B1E] mb-3">{item.label}</p>
        <div className="space-y-2">
          {(item.fields ?? []).map((f) => (
            <div key={f.id}>
              <label className="block text-xs text-gray-500 mb-0.5">{f.hint}</label>
              <input
                autoFocus={item.fields?.[0]?.id === f.id}
                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B8A5A]/40 focus:border-[#1B8A5A]"
                value={values[f.id]}
                onChange={(e) => handleChange(f.id, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') onCancel(); }}
                placeholder={f.hint}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 bg-[#F0FAF5] rounded-xl px-3 py-2.5 min-h-[44px] flex items-center justify-center">
          <div ref={previewRef} className="text-lg text-[#0D2B1E]" />
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
          <button type="button" onClick={handleConfirm} className="px-4 py-1.5 text-sm font-medium text-white bg-[#1B8A5A] rounded-lg hover:bg-[#15724A]">Gunakan</button>
        </div>
      </div>
    </div>
  );
}

// ── EquationEditor utama ──────────────────────────────────────────────────────
interface EquationEditorProps {
  value: string;
  onChange: (v: string) => void;
  onInsert?: (text: string) => void;
  label?: string;
  showInsertButton?: boolean;
}

export function EquationEditor({ value, onChange, onInsert, label = 'Rumus', showInsertButton = false }: EquationEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [modalItem, setModalItem] = useState<TemplateItem | null>(null);

  function insertAt(snippet: string) {
    const ta = taRef.current;
    if (!ta) { onChange(value + snippet); return; }
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const space = value.length && !value.slice(0, start).endsWith(' ') ? ' ' : '';
    const next  = value.slice(0, start) + space + snippet + ' ' + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      const pos = start + space.length + snippet.length + 1;
      ta.setSelectionRange(pos, pos);
      ta.focus();
    });
  }

  function handleItem(item: TemplateItem) {
    if (item.direct) { insertAt(item.direct); return; }
    setModalItem(item);
  }

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50">
          <div className="flex gap-0.5 px-2 pt-2 overflow-x-auto scrollbar-none">
            {TABS.map((g, i) => (
              <button key={g.label} type="button" onClick={() => setActiveTab(i)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-t-lg text-xs font-medium transition-colors ${activeTab === i ? 'bg-white text-[#1B8A5A] border border-b-0 border-gray-200 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 px-2 py-2">
            {TABS[activeTab].items.map((item) => (
              <button key={item.sym + item.label} type="button" onClick={() => handleItem(item)} title={item.label}
                className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:border-[#1B8A5A] hover:text-[#1B8A5A] hover:bg-[#F0FAF5] transition-colors">
                {item.sym}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3">
          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
          <div className="flex gap-2 items-start">
            <textarea ref={taRef} value={value} onChange={(e) => onChange(e.target.value)}
              placeholder="Klik template di atas, atau ketik LaTeX manual…"
              className="flex-1 font-mono text-sm rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B8A5A]/40 focus:border-[#1B8A5A] resize-none bg-gray-50 min-h-[44px]"
              rows={2} />
            {showInsertButton && onInsert && value.trim() && (
              <button type="button" onClick={() => { onInsert(latexToEditable(value.trim())); }}
                className="shrink-0 bg-[#1B8A5A] text-white rounded-xl px-3 py-2 text-sm font-medium hover:bg-[#15724A] transition-colors self-stretch">
                Sisipkan
              </button>
            )}
          </div>
        </div>
        {value.trim() && (
          <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl bg-[#F0FAF5] border border-[#D1EDE0]">
            <p className="text-[10px] font-semibold text-[#1B8A5A] uppercase tracking-wide mb-1.5">Tampilan rumus</p>
            <div className="text-base text-[#0D2B1E] overflow-x-auto"><MathRenderer latex={value} display /></div>
          </div>
        )}
      </div>
      {modalItem && (
        <FieldModal
          item={modalItem}
          onConfirm={(latex) => { insertAt(latexToEditable(latex)); setModalItem(null); }}
          onCancel={() => setModalItem(null)}
        />
      )}
    </>
  );
}

// ── MathEquationInsert: tombol inline untuk QuizForm ─────────────────────────
interface MathEquationInsertProps { onInsert: (text: string) => void }

export function MathEquationInsert({ onInsert }: MathEquationInsertProps) {
  const [open, setOpen] = useState(false);
  const [latex, setLatex] = useState('');

  return (
    <div className="mt-1.5">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-[#1B8A5A] hover:text-[#15724A] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#F0FAF5] transition-colors">
        {open ? '✕ Tutup editor rumus' : '+ Tambah rumus matematika'}
      </button>
      {open && (
        <div className="mt-2">
          <EquationEditor
            value={latex}
            onChange={setLatex}
            showInsertButton
            onInsert={(text) => { onInsert(text); setLatex(''); setOpen(false); }}
            label="Ketik atau pilih rumus"
          />
        </div>
      )}
    </div>
  );
}
