import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_COLORS: Record<string, string> = {
  present:  "#10b981",
  absent:   "#ef4444",
  lwp:      "#f97316",
  late:     "#f59e0b",
  half_day: "#3b82f6",
  holiday:  "#8b5cf6",
  leave:    "#06b6d4",
};

interface StatusCounts {
  [status: string]: number;
}

export function AttendancePieChart({ data }: { data?: StatusCounts | null }) {
  const chartData = Object.entries(data ?? {})
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name.replace("_", " "), value, color: STATUS_COLORS[name] ?? "#6b7280" }));

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Status Distribution</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
              {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface WeeklyBarDatum {
  day: string;
  hours: number;
}

export function WeeklyBarChart({ data }: { data: WeeklyBarDatum[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Weekly Hours</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: unknown) => [`${v ?? 0}h`, "Hours"] as [string, string]} />
            <Bar dataKey="hours" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface MonthlyLineDatum {
  month: string;
  present: number;
  absent: number;
  lwp: number;
}

export function MonthlyLineChart({ data }: { data: MonthlyLineDatum[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Monthly Trend</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Present" />
            <Line type="monotone" dataKey="absent"  stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Absent" />
            <Line type="monotone" dataKey="lwp"     stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} name="LWP" />
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
