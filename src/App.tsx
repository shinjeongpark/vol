import { useState, useEffect, useMemo, useCallback, FormEvent } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Filter, 
  ArrowUpDown, 
  ShieldAlert, 
  ChevronRight,
  Activity,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MarketData, CategoryFilter } from "./types";
import StockAnalysis from "./components/StockAnalysis";

export default function App() {
  const [data, setData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof MarketData; direction: 'asc' | 'desc' } | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [quickSearch, setQuickSearch] = useState("");

  const handleQuickSearch = (e: FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      setSelectedSymbol(quickSearch.trim().toUpperCase());
      setQuickSearch("");
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/market-data");
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSort = (key: keyof MarketData) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];
    
    // Category Filter
    if (filter !== "All") {
      result = result.filter(item => item.category === filter);
    }
    
    // Search Filter
    if (searchTerm) {
      result = result.filter(item => 
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, filter, sortConfig, searchTerm]);

  const indices = useMemo(() => {
    return data.filter(item => item.symbol === "SPY" || item.symbol === "QQQ");
  }, [data]);

  return (
    <div className="min-h-screen h-screen flex flex-col bg-brand-bg text-white font-sans overflow-hidden">
      {/* Header Navigation */}
      <header className="h-16 border-b border-brand-border flex items-center justify-between px-6 bg-brand-header-bg shrink-0">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rotate-45"></div>
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase">
            Volatility <span className="text-blue-500">Sentinel</span>
            <span className="ml-2 text-[10px] font-mono font-normal bg-brand-border px-1.5 py-0.5 rounded text-gray-400">보초병 v1.0</span>
          </h1>
        </div>
        <div className="flex items-center space-x-12">
          <form onSubmit={handleQuickSearch} className="relative group">
            <input 
              type="text" 
              placeholder="티커 정밀 분석 (예: TSLA)" 
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="bg-brand-border/40 border border-brand-border rounded-full px-5 py-2 pl-12 text-xs font-mono focus:outline-none focus:border-blue-500 focus:bg-brand-card w-64 transition-all"
            />
            <Activity size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-dim group-focus-within:text-blue-500 transition-colors" />
            <button type="submit" className="hidden" />
          </form>

          <div className="flex items-center space-x-8 font-mono text-sm border-l border-brand-border pl-8">
            <div className="flex flex-col items-end">
              <span className="text-brand-text-dim text-[10px] uppercase tracking-widest leading-none mb-1">시장 상태</span>
              <span className="text-status-up flex items-center gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-status-up animate-pulse"></span>
                LIVE • OPEN
              </span>
            </div>
            <div className="flex flex-col items-end border-l border-brand-border pl-8">
              <span className="text-brand-text-dim text-[10px] uppercase tracking-widest leading-none mb-1">마지막 업데이트</span>
              <span className="text-blue-400 font-mono font-bold">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : "--:--:--"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Index Summary Bar */}
      <div className="h-20 bg-brand-bg border-b border-brand-border flex items-center px-6 space-x-12 shrink-0 overflow-x-auto scrollbar-none">
        {indices.length > 0 ? indices.map(idx => (
          <div key={idx.symbol} className="flex items-center space-x-4 shrink-0">
            <span className="font-mono text-brand-text-dim">{idx.symbol}</span>
            <span className="font-mono font-bold text-lg">${idx.price.toFixed(2)}</span>
            <span className={`text-[11px] font-bold ${idx.change >= 0 ? 'text-status-up' : 'text-status-down'}`}>
              {idx.change >= 0 ? '+' : ''}{idx.change.toFixed(2)}%
            </span>
            <div className="w-24 h-4 bg-brand-card rounded-full overflow-hidden flex items-center px-1 border border-brand-border">
              <div 
                className={`h-1 rounded-full transition-all duration-1000 ${idx.change >= 0 ? 'bg-status-up shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-status-down shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}
                style={{ width: `${Math.min(100, Math.max(5, (idx.price / idx.sma20) * 50))}%` }}
              ></div>
            </div>
          </div>
        )) : Array(2).fill(0).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 h-10 w-48 bg-brand-border/20 animate-pulse rounded" />
        ))}
        
        {/* Additional Index (Static/Mock for design purely) */}
        <div className="flex items-center space-x-4 shrink-0 opacity-60">
          <span className="font-mono text-brand-text-dim">VIX</span>
          <span className="font-mono font-bold text-lg">13.52</span>
          <span className="text-status-down text-xs">-4.12%</span>
          <div className="w-24 h-4 bg-brand-card rounded-full overflow-hidden flex items-center px-1 border border-brand-border">
            <div className="h-1 bg-status-down w-1/4 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-6 space-y-4 overflow-hidden">
        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex bg-brand-card p-1 rounded-lg border border-brand-border overflow-x-auto scrollbar-none">
            {(["All", "Stock", "Index", "Sector", "Leverage"] as CategoryFilter[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-1.5 text-[10px] font-bold uppercase transition-all rounded whitespace-nowrap ${
                  filter === cat 
                    ? "bg-blue-600 font-bold shadow-lg shadow-blue-600/20 text-white" 
                    : "text-brand-text-dim hover:text-white"
                }`}
              >
                {cat === "All" ? "전체 자산" : cat === "Stock" ? "개별종목" : cat === "Index" ? "지수" : cat === "Sector" ? "섹터" : "레버리지"}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="티커 또는 종목명 검색..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-brand-card border border-brand-border rounded px-3 py-1.5 pl-9 text-xs focus:outline-none focus:border-blue-500 w-64 transition-colors"
              />
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-dim" />
            </div>
            
            <div className="flex space-x-2">
              <div className="hidden lg:flex px-3 py-1.5 bg-brand-card border border-brand-border rounded text-[10px] uppercase text-brand-text-dim items-center">
                정렬: <span className="text-white ml-2">{sortConfig?.key || '기본'}</span>
              </div>
              <button 
                onClick={fetchData}
                disabled={loading}
                className="px-3 py-1.5 bg-brand-card border border-brand-border rounded text-[10px] uppercase text-brand-text-dim flex items-center cursor-pointer hover:bg-blue-900/20 disabled:opacity-50"
              >
                <RefreshCw size={10} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                데이터 갱신
              </button>
            </div>
          </div>
        </div>

        {/* Data Container with Table */}
        <div className="flex-1 bg-brand-card border border-brand-border rounded-xl overflow-hidden flex flex-col shadow-2xl">
          <div className="overflow-y-auto overflow-x-auto flex-1 scrollbar-thin scrollbar-thumb-brand-border scrollbar-track-transparent">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-brand-border bg-[#1C1F26] font-mono text-[11px] uppercase text-brand-text-dim tracking-widest">
                  <th className="py-4 px-6 cursor-pointer hover:text-white" onClick={() => handleSort('symbol')}>
                    티커 <SortIcon active={sortConfig?.key === 'symbol'} direction={sortConfig?.direction} />
                  </th>
                  <th className="py-4 px-6 text-right cursor-pointer hover:text-white" onClick={() => handleSort('price')}>
                    현재 가격 <SortIcon active={sortConfig?.key === 'price'} direction={sortConfig?.direction} />
                  </th>
                  <th className="py-4 px-6 text-right cursor-pointer hover:text-white" onClick={() => handleSort('change')}>
                    24H 변동 <SortIcon active={sortConfig?.key === 'change'} direction={sortConfig?.direction} />
                  </th>
                  <th className="py-4 px-6 text-right">표준편차 (1SD)</th>
                  <th className="py-4 px-6 text-right">표준편차 (2SD)</th>
                  <th className="py-4 px-6 text-right">볼린저 밴드 상태</th>
                </tr>
              </thead>
              <AnimatePresence mode="popLayout">
                <tbody className="divide-y divide-brand-border font-mono text-sm">
                  {filteredAndSortedData.map((item) => (
                    <motion.tr 
                      layout
                      key={item.symbol}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelectedSymbol(item.symbol)}
                      className="hover:bg-white/5 transition-colors group cursor-pointer"
                    >
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-blue-400">{item.symbol}</span>
                          <span className="text-[10px] text-brand-text-dim truncate max-w-[150px] font-sans">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className={`py-4 px-6 text-right font-bold ${item.change >= 0 ? 'text-status-up' : 'text-status-down'}`}>
                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                      </td>
                      <td className="py-4 px-6 text-right text-brand-text-dim">
                        {Math.abs(item.prob1SD).toFixed(2)}%
                      </td>
                      <td className="py-4 px-6 text-right text-brand-text-dim">
                        {Math.abs(item.prob2SD).toFixed(2)}%
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Badge status={item.bbStatus} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </AnimatePresence>
            </table>
            {filteredAndSortedData.length === 0 && !loading && (
              <div className="py-20 text-center text-brand-text-dim font-mono uppercase tracking-widest text-xs">
                {searchTerm ? `"${searchTerm}" 에 대한 검색 결과가 없습니다.` : "데이터가 없습니다."}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Analysis Modal/Page Overlay */}
      <AnimatePresence>
        {selectedSymbol && (
          <StockAnalysis 
            symbol={selectedSymbol} 
            onClose={() => setSelectedSymbol(null)} 
          />
        )}
      </AnimatePresence>

      {/* Bottom Status Bar */}
      <footer className="h-10 bg-brand-footer-bg border-t border-brand-border px-6 flex items-center justify-between font-mono text-[10px] text-brand-text-dim uppercase tracking-widest shrink-0">
        <div className="flex space-x-6">
          <div className="flex items-center">
            <span className={`w-2 h-2 rounded-full mr-2 shadow-[0_0_8px_rgba(16,185,129,0.6)] ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-status-up'}`}></span>
            API 연결 상태: {loading ? '동기화 중...' : '안정적'}
          </div>
          <div className="hidden sm:block">분석 엔진: SMA-20 Analytics Core v4.2</div>
        </div>
        <div className="flex space-x-4 items-center">
          <span className="text-blue-500 hidden md:inline">분석 모델: GAUSSIAN/STDDEV</span>
          <span className="text-gray-600 hidden md:inline">|</span>
          <span>Sentinel v1.0.4-STABLE</span>
        </div>
      </footer>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const styles = {
    "Upper Breakout": "border-emerald-500/50 bg-emerald-500/20 text-emerald-400",
    "Lower Breakout": "border-rose-500/50 bg-rose-500/20 text-rose-400 animate-pulse",
    "Neutral": "border-gray-500/30 bg-gray-500/10 text-gray-400"
  };
  
  return (
    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-tight ${styles[status as keyof typeof styles] || styles.Neutral}`}>
      {status === 'Neutral' ? 'Center SMA' : status}
    </span>
  );
}

function SortIcon({ active, direction }: { active?: boolean; direction?: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown size={12} className="inline ml-1 opacity-30" />;
  return <ArrowUpDown size={12} className={`inline ml-1 text-brand-accent ${direction === 'asc' ? 'rotate-180' : ''}`} />;
}
