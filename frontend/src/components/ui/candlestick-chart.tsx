"use client";

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  width?: number;
  height?: number;
  title?: string;
  showVolume?: boolean;
}

// Candlestick chart for financial data
export function CandlestickChart({
  data,
  width = 800,
  height = 400,
  title = "Price Chart",
  showVolume = true,
}: CandlestickChartProps) {
  // Transform data for Recharts
  const transformedData = data.map((item) => {
    const isBullish = item.close >= item.open;
    const bodyTop = Math.max(item.open, item.close);
    const bodyBottom = Math.min(item.open, item.close);
    const wickHigh = item.high;
    const wickLow = item.low;

    return {
      ...item,
      isBullish,
      bodyTop,
      bodyBottom,
      wickHigh,
      wickLow,
      // For the bar chart representation
      bodyRange: [bodyBottom, bodyTop],
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 text-white p-3 rounded-lg shadow-xl border border-gray-700">
          <p className="font-semibold mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-green-400">Open: ${data.open.toFixed(2)}</p>
            <p className="text-red-400">High: ${data.high.toFixed(2)}</p>
            <p className="text-blue-400">Low: ${data.low.toFixed(2)}</p>
            <p className={data.isBullish ? "text-green-400" : "text-red-400"}>
              Close: ${data.close.toFixed(2)} {data.isBullish ? "▲" : "▼"}
            </p>
            {data.volume && (
              <p className="text-gray-400">Volume: {data.volume.toLocaleString()}</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={transformedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#374151" }}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickFormatter={(value) => `$${value}`}
            axisLine={{ stroke: "#374151" }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Wick lines (high to low) */}
          {transformedData.map((entry, index) => (
            <ReferenceLine
              key={`wick-${index}`}
              segment={[
                { x: entry.date, y: entry.wickLow },
                { x: entry.date, y: entry.wickHigh },
              ]}
              stroke={entry.isBullish ? "#10b981" : "#ef4444"}
              strokeWidth={1}
            />
          ))}

          {/* Body bars (open to close) */}
          <Bar dataKey="bodyRange" barSize={12}>
            {transformedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isBullish ? "#10b981" : "#ef4444"}
                stroke={entry.isBullish ? "#059669" : "#dc2626"}
                strokeWidth={1}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>

      {showVolume && data[0]?.volume && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Volume
          </h4>
          <ResponsiveContainer width="100%" height={100}>
            <ComposedChart data={transformedData} margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Bar dataKey="volume" barSize={8}>
                {transformedData.map((entry, index) => (
                  <Cell
                    key={`vol-${index}`}
                    fill={entry.isBullish ? "#10b981" : "#ef4444"}
                    opacity={0.5}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Bullish (Close {'>'} Open)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">Bearish (Close {'<'} Open)</span>
        </div>
      </div>
    </div>
  );
}

// Generate sample candlestick data
export function generateCandlestickData(days: number = 30): CandlestickData[] {
  const data: CandlestickData[] = [];
  let price = 150;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));

    const volatility = 5;
    const change = (Math.random() - 0.5) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 3;
    const low = Math.min(open, close) - Math.random() * 3;
    const volume = Math.floor(Math.random() * 1000000) + 500000;

    data.push({
      date: date.toISOString().split("T")[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });

    price = close;
  }

  return data;
}

// Example usage data
export const exampleCandlestickData = generateCandlestickData(30);
