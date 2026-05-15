import { useState, useEffect, useMemo } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Cell, ReferenceLine
} from "recharts";
import { X, TrendingUp, TrendingDown, Activity, ShieldAlert, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface AnalysisData {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  sigma1: number;
  sigma2: number;
  chartData: {
    date: string;
    price: number;
    return: number;
    sma5: number;
    sma20: number;
    sma50: number;
    sma100: number;
    sma200: number;
    upper: number;
    lower: number;
    isBreakout: boolean;
  }[];
}

const CustomTooltip = ({ active, label }: any) => {
  if (active && label) {
    return (
      <div className="bg-[#16181D] border border-[#374151] rounded-lg px-3 py-2 text-[11px] font-mono shadow-2xl">
        <p className="text-white font-bold">{label}</p>
      </div>
    );
  }
  return null;
};

export default function StockAnalysis({ 
  symbol, 
  onClose 
}: { 
  symbol: string; 
  onClose: () => void 
}) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stock-analysis/${symbol}`);
        const result = await res.json();
        setData(result);
      } catch (error) {
        console.error("Analysis failed", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [symbol]);

  const barData = useMemo(() => {
    if (!data || !data.chartData) return [];
    return data.chartData.map(d => ({
      ...d,
      return: Math.min(0, d.return)
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-brand-bg/80 backdrop-blur-md flex items-center justify-center font-mono uppercase tracking-[0.2em] text-xs">
        <div className="flex flex-col items-center gap-4">
          <Activity className="text-blue-500 animate-spin" size={48} />
          <span>Analyzing Volatility Structure...</span>
        </div>
      </div>
    );
  }

  if (!data || !data.chartData || data.chartData.length === 0) return null;

  const currentStatus = data.chartData[data.chartData.length - 1];
  const isUpperBreak = data.currentPrice > currentStatus.upper;
  const isLowerBreak = data.currentPrice < currentStatus.lower;
  
  let bbStatusText = "안정 (밴드 내 유지)";
  let bbStatusColor = "text-brand-text-dim";
  if (isUpperBreak) {
    bbStatusText = "상단 돌파 (과매수 주의)";
    bbStatusColor = "text-status-up";
  } else if (isLowerBreak) {
    bbStatusText = "하단 이탈 (과매도 기회)";
    bbStatusColor = "text-status-down";
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-50 bg-brand-bg flex flex-col overflow-hidden"
    >
      {/* Header */}
      <header className="h-20 border-b border-brand-border flex items-center justify-between px-8 bg-brand-header-bg shrink-0">
        <div className="flex items-center space-x-10">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              {data.name} <span className="text-brand-text-dim font-mono text-sm font-normal">({data.symbol})</span>
            </h2>
            <div className={`text-xs font-bold ${bbStatusColor}`}>
              볼린저 밴드: {bbStatusText}
            </div>
          </div>
          
          <div className="flex space-x-8 h-10 items-center">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-mono text-brand-text-dim tracking-widest">현재가</span>
              <span className="font-mono font-bold text-lg text-white">${data.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-mono text-brand-text-dim tracking-widest">일수익률</span>
              <span className={`font-mono font-bold text-lg ${data.change >= 0 ? "text-status-up" : "text-status-down"}`}>
                {data.change >= 0 ? "+" : ""}{data.change.toFixed(2)}%
              </span>
            </div>
            <div className="w-px h-6 bg-brand-border mx-2"></div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-mono text-brand-text-dim tracking-widest leading-none mb-1">일간 변동성(1σ)</span>
              <span className="font-mono font-bold text-blue-400">{(data.sigma1 * 100).toFixed(2)}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-mono text-brand-text-dim tracking-widest leading-none mb-1">극단적 변동성(2σ)</span>
              <span className="font-mono font-bold text-emerald-400">{(data.sigma2 * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-3 hover:bg-white/10 rounded-full transition-all group"
        >
          <X size={28} className="text-brand-text-dim group-hover:text-white" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-brand-border scrollbar-track-transparent">
        {/* Integrated Analysis Panel (Synced Charts) */}
        <div className="bg-brand-card border border-brand-border rounded-2xl shadow-2xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
          
          <div className="p-8 pb-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="text-blue-500" size={18} />
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">정밀 변동성 구조 분석 <span className="text-brand-text-dim">(100거래일)</span></h3>
            </div>
            <div className="flex gap-6 text-[10px] font-mono text-brand-text-dim uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#10B981] opacity-60"></div> <span className="text-gray-400">BB (±2σ)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#4F46E5]"></div> <span>Price</span>
              </div>
              <div className="flex items-center gap-2 text-[#EF4444]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></div> <span>SMA 5</span>
              </div>
              <div className="flex items-center gap-2 text-[#F59E0B]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></div> <span>SMA 20</span>
              </div>
              <div className="flex items-center gap-2 text-[#10B981]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div> <span>SMA 50</span>
              </div>
              <div className="flex items-center gap-2 text-[#3B82F6]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></div> <span>SMA 100</span>
              </div>
              <div className="flex items-center gap-2 text-[#8B5CF6]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"></div> <span>SMA 200</span>
              </div>
            </div>
          </div>

          {/* Price & BB Chart */}
          <div className="h-[400px] p-8 pb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData} syncId="volatilitySync" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.12}/>
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.12}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  hide={true}
                />
                <YAxis 
                  stroke="#4B5563" 
                  fontSize={10} 
                  domain={['auto', 'auto']} 
                  tickFormatter={(val) => `$${val.toLocaleString()}`}
                  orientation="right"
                  axisLine={false}
                  tickMargin={10}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ stroke: "#4B5563", strokeWidth: 1 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="upper" 
                  stroke="#10B981" 
                  strokeOpacity={0.4} 
                  fill="none" 
                  isAnimationActive={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="lower" 
                  stroke="#10B981" 
                  strokeOpacity={0.4} 
                  fill="none" 
                  isAnimationActive={false}
                />
                <Area 
                  type="monotone" 
                  dataKey={(d: any) => [d.lower, d.upper]} 
                  stroke="none" 
                  fill="url(#colorBand)" 
                  isAnimationActive={false}
                />
                <Line type="monotone" dataKey="sma5" stroke="#EF4444" strokeWidth={1} dot={false} strokeOpacity={0.4} />
                <Line type="monotone" dataKey="sma20" stroke="#F59E0B" strokeWidth={1} dot={false} strokeOpacity={0.6} />
                <Line type="monotone" dataKey="sma50" stroke="#10B981" strokeWidth={1} dot={false} strokeOpacity={0.6} />
                <Line type="monotone" dataKey="sma100" stroke="#3B82F6" strokeWidth={1} dot={false} strokeOpacity={0.6} />
                <Line type="monotone" dataKey="sma200" stroke="#8B5CF6" strokeWidth={1} dot={false} strokeOpacity={0.6} />
                
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#4F46E5" 
                  strokeWidth={3} 
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.price > payload.upper) {
                      return <circle cx={cx} cy={cy} r={4} fill="#EF4444" stroke="white" strokeWidth={1} />;
                    }
                    if (payload.price < payload.lower) {
                      return <circle cx={cx} cy={cy} r={4} fill="#10B981" stroke="white" strokeWidth={1} />;
                    }
                    return null;
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Separator / Axis Labels */}
          <div className="px-8 flex justify-between items-center bg-[#1C1F26] py-1 border-y border-brand-border">
             <span className="text-[9px] font-mono text-brand-text-dim uppercase tracking-widest">하방 리스크(Risk) & 시그마(Sigma) 이탈 탐지</span>
             <div className="flex gap-4">
                <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest">1σ: {(data.sigma1*100).toFixed(1)}%</span>
                <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">2σ: {(data.sigma2*100).toFixed(1)}%</span>
             </div>
          </div>

          {/* Volatility Bar Chart */}
          <div className="h-[220px] p-8 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} syncId="volatilitySync" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2D35" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#4B5563" 
                  fontSize={10} 
                  tickFormatter={(val) => val.split("-").slice(1).join("/")} 
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#4B5563" 
                  fontSize={10} 
                  tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                  orientation="right"
                  axisLine={false}
                  domain={['auto', 0]}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                />
                <ReferenceLine y={-data.sigma1} stroke="#3B82F6" strokeDasharray="3 3" opacity={0.5} />
                <ReferenceLine y={-data.sigma2} stroke="#10B981" strokeDasharray="3 3" opacity={0.5} />
                <Bar dataKey="return">
                  {barData.map((entry, index) => {
                    const r = entry.return;
                    let color = "#2A2D35"; 
                    if (r < 0) {
                      if (Math.abs(r) >= data.sigma2) color = "#10B981";
                      else if (Math.abs(r) >= data.sigma1) color = "#3B82F6";
                      else color = "#EF4444";
                    }
                    return <Cell key={`cell-${index}`} fill={r > 0 ? "transparent" : color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="h-10 bg-[#161B22] border-t border-brand-border px-8 flex items-center justify-between font-mono text-[10px] text-brand-text-dim uppercase tracking-[0.3em] shrink-0">
        <div>Volatility Insight Engine v4.2 PRO</div>
        <div className="flex items-center space-x-6">
          <span className="text-gray-700">|</span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-time Feed Active
          </span>
        </div>
      </footer>
    </motion.div>
  );
}
