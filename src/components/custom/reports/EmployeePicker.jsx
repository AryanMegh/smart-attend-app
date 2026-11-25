import { useEffect, useState } from "react";
import { listEmployees } from "@/lib/firestoreApi";
import { Users } from "lucide-react";

/**
 * Admin-only: choose whose attendance the Reports / History page shows.
 * Calls onChange(uid, employeeObject). Lists regular employees first and
 * defaults to the first of them (an admin's own attendance is usually empty).
 */
export default function EmployeePicker({ value, onChange }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    listEmployees()
      .then((list) => {
        if (!alive) return;
        const sorted = [...list].sort((a, b) => {
          const ra = a.role === "admin" ? 1 : 0, rb = b.role === "admin" ? 1 : 0;
          return ra - rb || String(a.name || "").localeCompare(String(b.name || ""));
        });
        setEmployees(sorted);
        if (!value && sorted.length) onChange(sorted[0].id, sorted[0]);
      })
      .catch((e) => alive && setErr(e.message || "Couldn't load employees"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-2 flex-wrap rounded-xl border bg-muted/40 px-3 py-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <label htmlFor="emp-picker" className="text-sm font-medium">Employee</label>
      <select
        id="emp-picker"
        value={value || ""}
        disabled={loading || !employees.length}
        onChange={(e) => onChange(e.target.value, employees.find((x) => x.id === e.target.value))}
        className="min-w-[14rem] rounded-lg border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
      >
        {loading && <option>Loading…</option>}
        {!loading && !employees.length && <option>No employees found</option>}
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name || e.email}{e.employeeCode ? ` (${e.employeeCode})` : ""}{e.role === "admin" ? " – admin" : ""}
          </option>
        ))}
      </select>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
