"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatINRCompact } from "@/lib/currency";

export const CHART_COLORS = [
  "#ec4899",
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#f43f5e",
];

const axisProps = {
  stroke: "#94a3b8",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e7e9f0",
  boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
  fontSize: 12,
};

export function RevenueAreaChart({
  data,
  height = 280,
}: {
  data: { label: string; revenue: number; bills?: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v) => formatINRCompact(v)} width={56} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => [formatINRCompact(v), "Revenue"]}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#db2777"
          strokeWidth={2}
          fill="url(#revGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MultiLineChart({
  data,
  lines,
  height = 280,
}: {
  data: Record<string, string | number>[];
  lines: { key: string; name: string; color?: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={40} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {lines.map((l, i) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.name}
            stroke={l.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarChartH({
  data,
  dataKey,
  nameKey,
  height = 280,
  money = false,
  color = "#8b5cf6",
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  nameKey: string;
  height?: number;
  money?: boolean;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" horizontal={false} />
        <XAxis
          type="number"
          {...axisProps}
          tickFormatter={(v) => (money ? formatINRCompact(v) : String(v))}
        />
        <YAxis type="category" dataKey={nameKey} {...axisProps} width={120} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => (money ? formatINRCompact(v) : v)}
        />
        <Bar dataKey={dataKey} fill={color} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BarChartV({
  data,
  dataKey,
  nameKey,
  height = 280,
  money = false,
  color = "#3b82f6",
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  nameKey: string;
  height?: number;
  money?: boolean;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
        <XAxis dataKey={nameKey} {...axisProps} />
        <YAxis
          {...axisProps}
          width={money ? 56 : 36}
          tickFormatter={(v) => (money ? formatINRCompact(v) : String(v))}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => (money ? formatINRCompact(v) : v)}
        />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 280,
  money = false,
}: {
  data: { name: string; value: number }[];
  height?: number;
  money?: boolean;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => {
            const pct = total ? ((v / total) * 100).toFixed(1) : "0";
            return [`${money ? formatINRCompact(v) : v} (${pct}%)`, ""];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
