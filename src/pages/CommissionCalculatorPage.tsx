import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OomaLogo } from '@/components/OomaLogo';
import {
  ChevronLeft,
  Calculator,
  DollarSign,
  Plus,
  Trash2,
  RotateCcw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Layers,
  PieChart as PieChartIcon,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

export interface Slab {
  id: number;
  min: number;
  max: number;
  pct: number;
}

const DEFAULT_SLABS: Slab[] = [
  { id: 1, min: 25000, max: 35000, pct: 12 },
  { id: 2, min: 36000, max: 45000, pct: 13 },
  { id: 3, min: 46000, max: 55000, pct: 14 },
  { id: 4, min: 56000, max: 65000, pct: 15 },
  { id: 5, min: 66000, max: 75000, pct: 16 },
  { id: 6, min: 76000, max: 85000, pct: 17 },
  { id: 7, min: 86000, max: 95000, pct: 18 },
  { id: 8, min: 96000, max: 100000, pct: 19 },
];

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n);
}

function fmtN(n: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2
  }).format(n);
}

function getSlab(slabs: Slab[], val: number): Slab | null {
  return slabs.find(s => val >= s.min && val <= s.max) || null;
}

function calc(projectVal: number, devPct: number, slabs: Slab[]) {
  const slab = getSlab(slabs, projectVal);
  const salesPct = slab ? slab.pct : 0;
  const salesAmt = projectVal * (salesPct / 100);
  const devAmt = projectVal * (devPct / 100);
  const companyAmt = projectVal - salesAmt - devAmt;
  const companyPct = 100 - salesPct - devPct;
  return { slab, salesPct, salesAmt, devPct, devAmt, companyPct, companyAmt };
}

interface DoughnutChartProps {
  sales: number;
  dev: number;
  company: number;
}

function DoughnutChartComponent({ sales, dev, company }: DoughnutChartProps) {
  const data = [
    { name: 'Company', value: Math.max(0, company), color: '#22c55e' },
    { name: 'Developers', value: Math.max(0, dev), color: '#3b82f6' },
    { name: 'Sales', value: Math.max(0, sales), color: '#f97316' },
  ];

  return (
    <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
      <PieChart width={176} height={176}>
        <Pie
          data={data}
          cx={88}
          cy={88}
          innerRadius={52}
          outerRadius={72}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Share']}
          contentStyle={{
            backgroundColor: '#111827',
            borderColor: '#374151',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#fff'
          }}
        />
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span className="text-xl font-extrabold text-white">{company.toFixed(1)}%</span>
        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Company</span>
      </div>
    </div>
  );
}

export default function CommissionCalculatorPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<'calculator' | 'slabs' | 'multi'>('calculator');
  const [projectVal, setProjectVal] = useState<number | ''>('');
  const [devPct, setDevPct] = useState<number | ''>(30);
  const [slabs, setSlabs] = useState<Slab[]>(() => {
    try {
      const s = localStorage.getItem('oomalabs_slabs');
      return s ? JSON.parse(s) : DEFAULT_SLABS;
    } catch {
      return DEFAULT_SLABS;
    }
  });
  const [editingSlabId, setEditingSlabId] = useState<number | null>(null);
  const [numProjects, setNumProjects] = useState<number>(5);
  const [slabError, setSlabError] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem('oomalabs_slabs', JSON.stringify(slabs));
    } catch {}
  }, [slabs]);

  const numericProjectVal = typeof projectVal === 'number' ? projectVal : 0;
  const numericDevPct = typeof devPct === 'number' ? devPct : 0;
  const result = calc(numericProjectVal, numericDevPct, slabs);

  const multi = {
    totalRevenue: numericProjectVal * numProjects,
    totalSales: result.salesAmt * numProjects,
    totalDev: result.devAmt * numProjects,
    totalCompany: result.companyAmt * numProjects,
  };

  const validateSlabs = (newSlabs: Slab[]) => {
    const sorted = [...newSlabs].sort((a, b) => a.min - b.min);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].min <= sorted[i - 1].max) {
        return 'Overlapping slabs detected. Please fix ranges.';
      }
    }
    return '';
  };

  const updateSlab = (id: number, field: keyof Slab, val: string | number) => {
    const updated = slabs.map(s => (s.id === id ? { ...s, [field]: Number(val) } : s));
    const err = validateSlabs(updated);
    setSlabError(err);
    setSlabs(updated);
  };

  const addSlab = () => {
    const newId = Math.max(0, ...slabs.map(s => s.id)) + 1;
    const newSlabs = [...slabs, { id: newId, min: 0, max: 0, pct: 10 }];
    setSlabs(newSlabs);
    setEditingSlabId(newId);
  };

  const deleteSlab = (id: number) => {
    const updated = slabs.filter(s => s.id !== id);
    setSlabs(updated);
    setSlabError(validateSlabs(updated));
  };

  const resetSlabs = () => {
    setSlabs(DEFAULT_SLABS);
    setSlabError('');
  };

  const exportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Project Value', projectVal],
      ['Sales %', result.salesPct],
      ['Sales Amount', result.salesAmt.toFixed(2)],
      ['Developer %', result.devPct],
      ['Developer Amount', result.devAmt.toFixed(2)],
      ['Company %', result.companyPct],
      ['Company Amount', result.companyAmt.toFixed(2)],
      [''],
      [`Multi-Project Summary (${numProjects} projects)`, ''],
      ['Total Revenue', multi.totalRevenue],
      ['Total Sales Commission', multi.totalSales.toFixed(2)],
      ['Total Developer Payout', multi.totalDev.toFixed(2)],
      ['Total Company Revenue', multi.totalCompany.toFixed(2)],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'oomalabs_commission.csv';
    a.click();
  };

  const salesBarW = Math.max(0, Math.min(100, result.salesPct));
  const devBarW = Math.max(0, Math.min(100, result.devPct));
  const compBarW = Math.max(0, Math.min(100, result.companyPct));

  return (
    <div className="h-screen h-[100dvh] w-full overflow-y-auto bg-[#0a0f1c] text-gray-100 font-sans selection:bg-indigo-500/30 relative custom-scrollbar">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[30%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0c0c0e]/95 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all active:scale-95 flex items-center gap-1 text-xs font-bold"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Admin Panel</span>
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <OomaLogo size={24} />
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase">
              Commission Calculator
            </h1>
          </div>
          <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">
            Admin Confidential
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <ShieldCheck className="h-3 w-3" /> Admin Only
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex bg-[#11111d] p-1.5 rounded-2xl border border-white/5 mb-8 max-w-md mx-auto sm:mx-0 overflow-x-auto gap-1">
          <button
            onClick={() => setTab('calculator')}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              tab === 'calculator'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Calculator className="h-3.5 w-3.5 flex-shrink-0" />
            Calculator
          </button>
          <button
            onClick={() => setTab('slabs')}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              tab === 'slabs'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5 flex-shrink-0" />
            Commission Slabs
          </button>
          <button
            onClick={() => setTab('multi')}
            className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              tab === 'multi'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" />
            Multi-Project
          </button>
        </div>

        {/* TAB 1: CALCULATOR */}
        {tab === 'calculator' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Row: Input Card & Doughnut Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Project Details Card */}
              <div className="bg-[#111827]/70 backdrop-blur-xl border border-white/5 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-6 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Project Inputs
                  </h3>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        Project Value (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={projectVal}
                          onChange={ev => {
                            const val = ev.target.value;
                            setProjectVal(val === '' ? '' : Number(val));
                          }}
                          placeholder="0"
                          min={0}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-8 pr-4 text-white text-lg font-bold outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">
                        Developer Percentage (%)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                          %
                        </span>
                        <input
                          type="number"
                          value={devPct}
                          onChange={ev => {
                            const val = ev.target.value;
                            if (val === '') {
                              setDevPct('');
                            } else {
                              const num = Number(val);
                              setDevPct(Math.max(0, Math.min(100, Math.round(num * 100) / 100)));
                            }
                          }}
                          placeholder="30"
                          min={0}
                          max={100}
                          step={1}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-8 pr-4 text-white text-lg font-bold outline-none focus:border-purple-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5">
                  {result.slab ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 flex-wrap">
                      <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                      Active slab: ₹{fmtN(result.slab.min)} - ₹{fmtN(result.slab.max)} @ {result.slab.pct}%
                    </span>
                  ) : numericProjectVal > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      No matching slab for this project value
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Split Visualization Card */}
              <div className="bg-[#111827]/70 backdrop-blur-xl border border-white/5 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4 flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" />
                  Split Visualization
                </h3>

                {/* Doughnut Chart */}
                <DoughnutChartComponent
                  sales={result.salesPct}
                  dev={result.devPct}
                  company={result.companyPct}
                />

                {/* Stacked Bar Track */}
                <div className="mt-4">
                  <div className="h-3 bg-black/40 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${compBarW}%` }}
                    />
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${devBarW}%` }}
                    />
                    <div
                      className="h-full bg-orange-500 transition-all duration-500"
                      style={{ width: `${salesBarW}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-center sm:justify-around flex-wrap gap-3 mt-3 text-xs font-semibold text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Company {result.companyPct.toFixed(1)}%
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      Devs {result.devPct}%
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      Sales {result.salesPct}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Company Card */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">
                  Company Share
                </div>
                <div className="text-3xl font-extrabold text-emerald-400 mb-1">
                  {result.companyPct.toFixed(1)}%
                </div>
                <div className="text-sm font-semibold text-emerald-200/80">
                  {fmt(result.companyAmt)}
                </div>
              </div>

              {/* Developers Card */}
              <div className="bg-blue-950/20 border border-blue-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">
                  Developer Payout
                </div>
                <div className="text-3xl font-extrabold text-blue-400 mb-1">
                  {result.devPct}%
                </div>
                <div className="text-sm font-semibold text-blue-200/80">
                  {fmt(result.devAmt)}
                </div>
              </div>

              {/* Sales Card */}
              <div className="bg-orange-950/20 border border-orange-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-2">
                  Sales Commission
                </div>
                <div className="text-3xl font-extrabold text-orange-400 mb-1">
                  {result.salesPct}%
                </div>
                <div className="text-sm font-semibold text-orange-200/80">
                  {fmt(result.salesAmt)}
                </div>
              </div>
            </div>

            {/* Summary Breakdown Card */}
            <div className="bg-[#111827]/70 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                Summary Breakdown
              </h3>

              <div className="divide-y divide-white/5 text-sm">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-gray-400">Project Value</span>
                  <span className="font-bold text-white">{fmt(numericProjectVal)}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-gray-400">Sales Commission ({result.salesPct}%)</span>
                  <span className="font-bold text-orange-400">{fmt(result.salesAmt)}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-gray-400">Developer Payout ({result.devPct}%)</span>
                  <span className="font-bold text-blue-400">{fmt(result.devAmt)}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-gray-400">Company Revenue</span>
                  <span className="font-extrabold text-emerald-400 text-base">
                    {fmt(result.companyAmt)}
                  </span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-gray-400">Company Percentage</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {result.companyPct.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5">
                <button
                  onClick={exportCSV}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 text-xs font-bold transition-all flex items-center gap-2"
                >
                  <Download className="h-4 w-4" /> Export CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COMMISSION SLABS */}
        {tab === 'slabs' && (
          <div className="bg-[#111827]/70 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Commission Slabs Manager</h3>
                <p className="text-xs text-gray-400">
                  Configure project value ranges and corresponding sales commission percentages.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={resetSlabs}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/10 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset to Default
                </button>
                <button
                  onClick={addSlab}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-purple-600/30"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Slab
                </button>
              </div>
            </div>

            {slabError && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {slabError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-[10px] font-extrabold uppercase tracking-wider">
                    <th className="py-3 px-4">Min (₹)</th>
                    <th className="py-3 px-4">Max (₹)</th>
                    <th className="py-3 px-4">Sales %</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {slabs.map(s => {
                    const isActive = result.slab && result.slab.id === s.id;
                    const isEditing = editingSlabId === s.id;

                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors ${
                          isActive
                            ? 'bg-purple-500/10 border-l-4 border-l-purple-500'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input
                              type="number"
                              value={s.min}
                              onChange={ev => updateSlab(s.id, 'min', ev.target.value)}
                              className="bg-black/60 border border-white/10 rounded-lg py-1 px-2 text-xs text-white outline-none focus:border-purple-500 w-28"
                            />
                          ) : (
                            <span className="font-semibold text-gray-200">₹{fmtN(s.min)}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input
                              type="number"
                              value={s.max}
                              onChange={ev => updateSlab(s.id, 'max', ev.target.value)}
                              className="bg-black/60 border border-white/10 rounded-lg py-1 px-2 text-xs text-white outline-none focus:border-purple-500 w-28"
                            />
                          ) : (
                            <span className="font-semibold text-gray-200">₹{fmtN(s.max)}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input
                              type="number"
                              value={s.pct}
                              min={0}
                              max={100}
                              onChange={ev => updateSlab(s.id, 'pct', ev.target.value)}
                              className="bg-black/60 border border-white/10 rounded-lg py-1 px-2 text-xs text-white outline-none focus:border-purple-500 w-16"
                            />
                          ) : (
                            <span className="font-bold text-orange-400">{s.pct}%</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isActive ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingSlabId(isEditing ? null : s.id)}
                              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold transition-all"
                            >
                              {isEditing ? 'Save' : 'Edit'}
                            </button>
                            <button
                              onClick={() => deleteSlab(s.id)}
                              className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                              title="Delete Slab"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl text-xs text-indigo-300">
              Slabs are saved automatically to your browser session. Changes apply to the calculator instantly.
            </div>
          </div>
        )}

        {/* TAB 3: MULTI-PROJECT */}
        {tab === 'multi' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-[#111827]/70 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4">
                Multi-Project Forecast Configuration
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2">
                    Number of Projects
                  </label>
                  <input
                    type="number"
                    value={numProjects}
                    min={1}
                    max={500}
                    onChange={ev =>
                      setNumProjects(Math.max(1, Number(ev.target.value) || 1))
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-white text-lg font-bold outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2">
                    Project Value Each
                  </label>
                  <div className="py-3 px-4 bg-black/20 border border-white/5 rounded-2xl text-lg font-bold text-white">
                    {fmt(numericProjectVal)}
                  </div>
                </div>
              </div>
            </div>

            {/* Forecast Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-3xl p-6 shadow-xl">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">
                  Total Company Revenue
                </div>
                <div className="text-2xl font-extrabold text-emerald-400 mb-1">
                  {fmt(multi.totalCompany)}
                </div>
                <div className="text-xs font-semibold text-emerald-200/80">
                  {numProjects} projects × {result.companyPct.toFixed(1)}%
                </div>
              </div>

              <div className="bg-blue-950/20 border border-blue-500/30 rounded-3xl p-6 shadow-xl">
                <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">
                  Total Developer Payout
                </div>
                <div className="text-2xl font-extrabold text-blue-400 mb-1">
                  {fmt(multi.totalDev)}
                </div>
                <div className="text-xs font-semibold text-blue-200/80">
                  {numProjects} projects × {result.devPct}%
                </div>
              </div>

              <div className="bg-orange-950/20 border border-orange-500/30 rounded-3xl p-6 shadow-xl">
                <div className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-2">
                  Total Sales Commission
                </div>
                <div className="text-2xl font-extrabold text-orange-400 mb-1">
                  {fmt(multi.totalSales)}
                </div>
                <div className="text-xs font-semibold text-orange-200/80">
                  {numProjects} projects × {result.salesPct}%
                </div>
              </div>

              <div className="bg-[#11111d] border border-white/10 rounded-3xl p-6 shadow-xl">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Total Gross Revenue
                </div>
                <div className="text-2xl font-extrabold text-white mb-1">
                  {fmt(multi.totalRevenue)}
                </div>
                <div className="text-xs font-semibold text-gray-500">
                  {numProjects} × {fmt(numericProjectVal)}
                </div>
              </div>
            </div>

            {/* Detailed Breakdown Card */}
            <div className="bg-[#111827]/70 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                Detailed Multi-Project Breakdown
              </h3>

              <div className="divide-y divide-white/5 text-sm">
                <div className="py-3 flex justify-between items-center">
                  <span className="text-gray-400">Total Revenue</span>
                  <span className="font-bold text-white">{fmt(multi.totalRevenue)}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-gray-400">Total Sales Commission</span>
                  <span className="font-bold text-orange-400">{fmt(multi.totalSales)}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-gray-400">Total Developer Payout</span>
                  <span className="font-bold text-blue-400">{fmt(multi.totalDev)}</span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <span className="text-gray-400">Total Company Revenue</span>
                  <span className="font-extrabold text-emerald-400 text-base">
                    {fmt(multi.totalCompany)}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5">
                <button
                  onClick={exportCSV}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 text-xs font-bold transition-all flex items-center gap-2"
                >
                  <Download className="h-4 w-4" /> Export CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
