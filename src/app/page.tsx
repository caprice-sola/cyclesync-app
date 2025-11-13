"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save, BarChart3, Calendar, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
//import { Separator } from "@/components/ui/separator";


/**
 * CycleSync — minimal client-only MVP
 * - Plan: weekly goals + per-day planning with phase nudges
 * - Log: quick daily entries (Energy/RPE/Sleep/Notes)
 * - Insights: chart + phase averages
 * Persists to localStorage (no backend).
 */

const LS_KEY = "cyclesync_data_v1";

const PHASES = [
  { value: "Menstrual", color: "bg-rose-200" },
  { value: "Follicular", color: "bg-emerald-200" },
  { value: "Ovulatory", color: "bg-indigo-200" },
  { value: "Luteal", color: "bg-amber-200" },
];

function useLocalState<T>(initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);
  return [state, setState];
}

// --- Plan↔Log helpers ---
function parseISO(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function inSameWeek(dateISO: string, weekStartISO: string) {
  if (!dateISO || !weekStartISO) return false;
  const d = parseISO(dateISO);
  const start = parseISO(weekStartISO);
  const end = addDays(start, 6);
  return d >= start && d <= end;
}
function weekdayIndexMonStart(dateISO: string) {
  if (!dateISO) return 0;
  const js = parseISO(dateISO).getDay(); // Sun=0..Sat=6
  return (js + 6) % 7; // Mon=0..Sun=6
}
function getPlannedFromPlan(dateISO: string, data: any): string | null {
  if (!dateISO || !data?.weeks?.length) return null;
  const wk = data.weeks.find((w: any) => w.weekStart && inSameWeek(dateISO, w.weekStart));
  if (!wk) return null;
  const di = weekdayIndexMonStart(dateISO);
  return wk.days?.[di]?.session || null;
}
function truncate(s: string | undefined, max = 32) {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function parseNullableNumber(raw: string): number | null {
  if (raw === "" || raw == null) return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}



type DayPlan = {
  session: string;
  intention: string;
  effort: number;
  fuel: string;
  sleep: number;
};

type WeekCheckin = {
  trend: string;
  recovery: number;
  wins: string;
  adjust: string;
};

type Week = {
  weekStart: string;
  phase: string;
  theme: string;
  goals: string[];
  nonnegotiables: string;
  motivation: string;
  days: DayPlan[];
  checkin: WeekCheckin;
};

type LogRow = {
  date: string;
  cycleDay: number;
  phase: string;
  planned: string;
  actual: string;
  rpe: number | null;
  energy: number | null;
  sleep: number | null;
  notes: string;
};

const emptyWeek = (): Week => ({
  weekStart: "",
  phase: "",
  theme: "",
  goals: ["", "", ""],
  nonnegotiables: "",
  motivation: "",
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(() => ({
    session: "",
    intention: "",
    effort: 3,
    fuel: "",
    sleep: 7,
  })),
  checkin: { trend: "", recovery: 3, wins: "", adjust: "" },
});

function emptyLogRow(): LogRow {
  return {
    date: new Date().toISOString().slice(0, 10),
    cycleDay: 1,
    phase: "",
    planned: "",
    actual: "",
    rpe: null,
    energy: null,
    sleep: null,
    notes: "",
  };
}

const seed = {
  weeks: [emptyWeek()],
  logs: [] as LogRow[],
  settings: { showPhaseNudges: true },
};

export default function Page() {
  const [data, setData] = useLocalState(seed);
  const [tab, setTab] = useState<"plan" | "log" | "insights">("plan");

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!hydrated) return <div className="min-h-screen grid place-items-center text-slate-500">Loading…</div>;

  const addWeek = () => setData((d) => ({ ...d, weeks: [...d.weeks, emptyWeek()] }));
  const removeWeek = (idx: number) =>
    setData((d) => ({ ...d, weeks: d.weeks.filter((_: Week, i: number) => i !== idx) }));

  const addLog = () => setData((d) => ({ ...d, logs: [...d.logs, emptyLogRow()] }));
  const removeLog = (idx: number) =>
    setData((d) => ({ ...d, logs: d.logs.filter((_: LogRow, i: number) => i !== idx) }));

  const updateWeek = (i: number, patch: Partial<Week>) =>
    setData((d) => {
      const weeks = d.weeks.slice();
      weeks[i] = { ...weeks[i], ...patch };
      return { ...d, weeks };
    });

  const updateWeekDay = (weekIdx: number, dayIdx: number, patch: Partial<DayPlan>) =>
    setData((d) => {
      const weeks = d.weeks.slice();
      const days = weeks[weekIdx].days.slice();
      days[dayIdx] = { ...days[dayIdx], ...patch };
      weeks[weekIdx] = { ...weeks[weekIdx], days };
      return { ...d, weeks };
    });

  const updateLog = (i: number, patch: Partial<LogRow>) =>
    setData((d) => {
      const logs = d.logs.slice();
      logs[i] = { ...logs[i], ...patch };
      return { ...d, logs };
    });

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white to-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">CycleSync</h1>
            <p className="text-slate-600">Weekly clarity. Cycle-aware training. Your patterns, visualized.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={addWeek} className="gap-2">
              <Plus className="h-4 w-4" />
              New Week
            </Button>
            <Button onClick={() => alert("Saved locally 💾")} className="gap-2">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </header>

        <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="w-full">
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="plan" className="gap-2">
              <Calendar className="h-4 w-4" />
              Plan
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-2">
              <Activity className="h-4 w-4" />
              Log
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          {/* PLAN */}
          <TabsContent value="plan" className="mt-4 space-y-6">
            {data.weeks.map((w: Week, i: number) => (
              <Card key={i} className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl">Week {i + 1}</CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">Phase nudges</span>
                      <Switch
                        checked={data.settings.showPhaseNudges}
                        onCheckedChange={(v) =>
                          setData((d) => ({ ...d, settings: { ...d.settings, showPhaseNudges: v } }))
                        }
                      />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeWeek(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-sm text-slate-600">Week start</label>
                      <Input type="date" value={w.weekStart} onChange={(e) => updateWeek(i, { weekStart: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Cycle phase</label>
                      <Select value={w.phase} onValueChange={(v) => updateWeek(i, { phase: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select phase" />
                        </SelectTrigger>
                        <SelectContent>
                          {PHASES.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm text-slate-600">Weekly theme</label>
                      <Input
                        value={w.theme}
                        onChange={(e) => updateWeek(i, { theme: e.target.value })}
                        placeholder="e.g., Power + clean form"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3">
                    {w.goals.map((g, gi) => (
                      <div key={gi}>
                        <label className="text-sm text-slate-600">Goal {gi + 1}</label>
                        <Input
                          value={g}
                          onChange={(e) => {
                            const goals = w.goals.slice();
                            goals[gi] = e.target.value;
                            updateWeek(i, { goals });
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-600">Non-negotiables</label>
                      <Textarea
                        value={w.nonnegotiables}
                        onChange={(e) => updateWeek(i, { nonnegotiables: e.target.value })}
                        placeholder="Sleep 7–8h, protein with meals, mobility 10 min"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Motivation anchor</label>
                      <Textarea
                        value={w.motivation}
                        onChange={(e) => updateWeek(i, { motivation: e.target.value })}
                        placeholder="Why this week matters to me…"
                      />
                    </div>
                  </div>

                  <PhaseNudges phase={w.phase} enabled={data.settings.showPhaseNudges} />

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, di) => (
                      <div key={d} className="rounded-2xl border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{d}</div>
                          {w.phase && <PhaseBadge phase={w.phase} />}
                        </div>
                        <div className="space-y-2">
                          <Input
                            placeholder="Session (Pole/CrossFit/Recovery)"
                            value={w.days[di].session}
                            onChange={(e) => updateWeekDay(i, di, { session: e.target.value })}
                          />
                          <Input
                            placeholder="Intention (power, technique, mobility)"
                            value={w.days[di].intention}
                            onChange={(e) => updateWeekDay(i, di, { intention: e.target.value })}
                          />
                          <LabeledSlider
                            label="Planned Effort"
                            min={1}
                            max={5}
                            value={[w.days[di].effort]}
                            onValueChange={(v) => updateWeekDay(i, di, { effort: v[0] })}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Fuel plan"
                              value={w.days[di].fuel}
                              onChange={(e) => updateWeekDay(i, di, { fuel: e.target.value })}
                            />
                            <Input
                              type="number"
                              placeholder="Sleep (h)"
                              value={w.days[di].sleep}
                              onChange={(e) => updateWeekDay(i, di, { sleep: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-4 gap-3">
                    <Input
                      placeholder="Energy trend (↓/→/↑)"
                      value={w.checkin.trend}
                      onChange={(e) => updateWeek(i, { checkin: { ...w.checkin, trend: e.target.value } })}
                    />
                    <LabeledSlider
                      label="Recovery score"
                      min={1}
                      max={5}
                      value={[w.checkin.recovery]}
                      onValueChange={(v) => updateWeek(i, { checkin: { ...w.checkin, recovery: v[0] } })}
                    />
                    <Input
                      placeholder="Wins"
                      value={w.checkin.wins}
                      onChange={(e) => updateWeek(i, { checkin: { ...w.checkin, wins: e.target.value } })}
                    />
                    <Input
                      placeholder="Adjustments"
                      value={w.checkin.adjust}
                      onChange={(e) => updateWeek(i, { checkin: { ...w.checkin, adjust: e.target.value } })}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* LOG */}
<TabsContent value="log" className="mt-4">
  <Card className="shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle>Daily Log</CardTitle>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={addLog} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Entry
        </Button>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      {data.logs.length === 0 && (
        <p className="text-slate-600">No entries yet. Click “Add Entry” to start logging.</p>
      )}

      {data.logs.map((row: LogRow, i: number) => (
        <div key={i} className="rounded-2xl border p-4 space-y-3 bg-white">
          {/* Summary header */}
<div className="space-y-1">
  {/* Row 1: date + phase | actions */}
  <div className="flex items-start justify-between gap-3">
  <div className="flex items-center gap-2">
    <span className="font-medium">{row.date || "No date"}</span>
    {row.phase && <PhaseBadge phase={row.phase} />}
  </div>
  <div className="flex items-center gap-2">
    <Button
      variant="secondary"
      size="sm"
      onClick={() => row.planned && updateLog(i, { actual: row.planned })}
    >
      Mark done
    </Button>
    <Button size="icon" variant="ghost" onClick={() => removeLog(i)} title="Delete entry">
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</div>

  {/* Row 2: meta line (muted) */}
  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
    {row.planned && (
      <span title={row.planned}>
        <span className="text-slate-400">Planned:</span> <span className="font-medium">{truncate(row.planned, 40)}</span>
      </span>
    )}
    {row.actual && (
      <span title={row.actual}>
        &nbsp;→ <span className="text-slate-400">Actual:</span> <span className="font-medium">{truncate(row.actual, 40)}</span>
      </span>
    )}

    {/* spacer */}
    {(row.planned || row.actual) && <span className="mx-1">·</span>}

    {/* quick chips (optional, remove if you don’t want them here) */}
    <Badge variant="secondary">RPE {row.rpe ?? "-"}</Badge>
    <Badge variant="secondary">E {row.energy ?? "-"}</Badge>
    <Badge variant="secondary">Sleep {row.sleep ?? "-"}</Badge>
  </div>


</div>

<div className="md:col-span-2">
  <label className="text-xs font-medium text-slate-600">Date</label>
  <Input
    type="date"
    value={row.date}
    onChange={(e) => {
      const newDate = e.target.value;
      const suggestion = getPlannedFromPlan(newDate, data);
      // If Planned is empty, auto-fill from Plan; otherwise keep user input.
      updateLog(i, {
        date: newDate,
        ...(row.planned ? {} : suggestion ? { planned: suggestion } : {})
      });
    }}
  />
  <p className="text-[11px] text-slate-500 mt-1">When this session happened.</p>
</div>


            {/* Cycle Day */}
            <div className="md:col-span-1">
              <label className="text-xs font-medium text-slate-600">Cycle Day</label>
              <Input
                type="number"
                min={1}
                value={row.cycleDay}
                onChange={(e) => updateLog(i, { cycleDay: Number(e.target.value) })}
              />
              <p className="text-[11px] text-slate-500 mt-1">Day 1 = first day of period.</p>
            </div>

            {/* Phase */}
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-600">Phase</label>
              <Select value={row.phase} onValueChange={(v) => updateLog(i, { phase: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  {PHASES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500 mt-1">For phase-based insights.</p>
            </div>

            {/* Planned Session */}
<div className="md:col-span-3">
  <label className="text-xs font-medium text-slate-600">Planned Session</label>
  <Input
    placeholder="e.g., CrossFit WOD / Pole — power combos"
    value={row.planned}
    onChange={(e) => updateLog(i, { planned: e.target.value })}
  />
  {(() => {
    const suggestion = getPlannedFromPlan(row.date, data);
    const showHint = suggestion && suggestion !== row.planned;
    return showHint ? (
      <div className="flex items-center gap-2 mt-1">
        <p className="text-[11px] text-slate-500">
          From Plan: <span className="font-medium">{suggestion}</span>
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => updateLog(i, { planned: suggestion! })}
        >
          Use plan
        </Button>
      </div>
    ) : (
      <p className="text-[11px] text-slate-500 mt-1">
        Tip: set your week on the Plan tab to auto-suggest here.
      </p>
    );
  })()}
</div>

{/* Actual Session */}
<div className="md:col-span-3">
  <label className="text-xs font-medium text-slate-600">Actual Session</label>
  <Input
    placeholder="What you actually did"
    value={row.actual}
    onChange={(e) => updateLog(i, { actual: e.target.value })}
  />
  {(() => {
    const fromPlan = getPlannedFromPlan(row.date, data);
    const canUsePlan = fromPlan && fromPlan !== row.actual;
    //const canCopyPlanned = row.planned && row.planned !== row.actual;

    return (
      <div className="flex flex-wrap items-center gap-2 mt-1">
        {canUsePlan ? (
          <>
            <p className="text-[11px] text-slate-500">
              From Plan: <span className="font-medium">{fromPlan}</span>
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => updateLog(i, { actual: fromPlan! })}
            >
              Use plan
            </Button>
          </>
        ) : (
          <p className="text-[11px] text-slate-500">Tip: your Plan can prefill this.</p>
        )}

        {/* {canCopyPlanned && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => updateLog(i, { actual: row.planned })}
          >
            Copy planned → actual
          </Button>
        )} */}
      </div>
    );
  })()}
</div>

            {/* Numbers row */}
            <div className="md:col-span-1">
              <label className="text-xs font-medium text-slate-600">RPE (1–10)</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={row.rpe ?? ""} // show empty when null
    onChange={(e) => updateLog(i, { rpe: parseNullableNumber(e.target.value) })}
    onBlur={() => {
      if (row.rpe != null) updateLog(i, { rpe: clamp(row.rpe, 1, 10) });
    }}
              />
              <p className="text-[11px] text-slate-500 mt-1">Effort. 10 = all-out.</p>
            </div>
            <div className="md:col-span-1">
              <label className="text-xs font-medium text-slate-600">Energy (1–5)</label>
              <Input
                type="number"
                min={1}
                max={5}
                value={row.energy ?? ""}
    onChange={(e) => updateLog(i, { energy: parseNullableNumber(e.target.value) })}
    onBlur={() => {
      if (row.energy != null) updateLog(i, { energy: clamp(row.energy, 1, 5) });
    }}
  />
              <p className="text-[11px] text-slate-500 mt-1">How charged you felt.</p>
            </div>
            <div className="md:col-span-1">
              <label className="text-xs font-medium text-slate-600">Sleep (h)</label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={row.sleep ?? ""}
    onChange={(e) => updateLog(i, { sleep: parseNullableNumber(e.target.value) })}
    onBlur={() => {
      if (row.sleep != null) updateLog(i, { sleep: clamp(row.sleep, 0, 24) });
    }}
              />
              <p className="text-[11px] text-slate-500 mt-1">Total hours last night.</p>
            </div>

            {/* Notes */}
            <div className="md:col-span-12">
              <label className="text-xs font-medium text-slate-600">Notes</label>
              <Textarea
                placeholder="Cramps, stress, PRs, good fuel, modifications…"
                value={row.notes}
                onChange={(e) => updateLog(i, { notes: e.target.value })}
              />
              <p className="text-[11px] text-slate-500 mt-1">Anything that explains the day.</p>
            </div>
  </div>
))}

    </CardContent>
  </Card>
</TabsContent>


          {/* INSIGHTS */}
          <TabsContent value="insights" className="mt-4 space-y-6">
            <PhaseStats logs={data.logs} />
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Energy & Effort Over Time</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <TrendChart logs={data.logs} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function LabeledSlider({
  label,
  value,
  onValueChange,
  min = 0,
  max = 10,
  step = 1,
}: {
  label: string;
  value: number[];
  onValueChange: (v: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-600">{label}</span>
        <Badge variant="secondary">{value[0]}</Badge>
      </div>
      <Slider min={min} max={max} step={step} value={value} onValueChange={onValueChange} />
    </div>
  );
}

function PhaseBadge({ phase }: { phase: string }) {
  const p = PHASES.find((x) => x.value === phase);
  return <span className={`text-xs px-2 py-1 rounded-full ${p?.color || "bg-slate-200"}`}>{phase || ""}</span>;
}

function PhaseNudges({ phase, enabled }: { phase: string; enabled: boolean }) {
  const tips = useMemo(
    () => ({
      Menstrual: ["Prioritize mobility + gentle technique", "Keep intensity low-to-mod; extend warm-ups"],
      Follicular: ["Build volume and strength", "Add a progressive load day"],
      Ovulatory: ["Great window to test skills/PRs", "Keep recovery honest"],
      Luteal: ["Refine form and manage intensity", "Buffer stressful days with sleep + carbs"],
    }),
    []
  );
  if (!enabled || !phase) return null;
  return (
    <div className="rounded-2xl border p-3 bg-white">
      <div className="text-sm font-medium mb-2">Phase nudges</div>
      <div className="flex flex-wrap gap-2">
        {tips[phase as keyof typeof tips]?.map((t, i) => (
          <Badge key={i} variant="outline" className="rounded-xl">
            {t}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ logs }: { logs: LogRow[] }) {
  const data = useMemo(() => {
    const sorted = [...logs].filter((x) => x.date).sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((r) => ({
      date: r.date,
      Energy: Number(r.energy) || 0,
      RPE: Number(r.rpe) || 0,
      Phase: r.phase,
    }));
  }, [logs]);

  if (!data.length) return <div className="text-slate-600">Add a few log entries to unlock the chart.</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, "auto"]} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: any, n: any) => [v as number, n as string]} />
        <Legend />
        <Line type="monotone" dataKey="Energy" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="RPE" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PhaseStats({ logs }: { logs: LogRow[] }) {
  type Agg = {
    n: number;                  // entries with this phase (any data)
    energy: number; cE: number; // sum + count for Energy
    rpe: number;    cR: number; // sum + count for RPE
    sleep: number;  cS: number; // sum + count for Sleep
  };

  const phases = PHASES.map(p => p.value);
  const agg: Record<string, Agg> = {};
  for (const p of phases) agg[p] = { n: 0, energy: 0, cE: 0, rpe: 0, cR: 0, sleep: 0, cS: 0 };

  for (const r of logs) {
    const k = r.phase;
    if (!k || !agg[k]) continue;
    agg[k].n += 1;
    if (r.energy != null) { agg[k].energy += r.energy; agg[k].cE++; }
    if (r.rpe    != null) { agg[k].rpe    += r.rpe;    agg[k].cR++; }
    if (r.sleep  != null) { agg[k].sleep  += r.sleep;  agg[k].cS++; }
  }

  const byPhase = phases.map(phase => {
    const a = agg[phase];
    return {
      phase,
      n: a.n,
      avgEnergy: a.cE ? (a.energy / a.cE).toFixed(1) : "-",
      cE: a.cE,
      avgRpe:    a.cR ? (a.rpe    / a.cR).toFixed(1) : "-",
      cR: a.cR,
      avgSleep:  a.cS ? (a.sleep  / a.cS).toFixed(1) : "-",
      cS: a.cS,
    };
  });

  function MetricRow({
    label, avg, count, title,
  }: { label: string; avg: string | number; count: number; title: string }) {
    const empty = count === 0;
    return (
      <div
        className={`${empty ? "text-slate-400" : "text-slate-700"} text-sm`}
        title={title}
      >
        <span>{label} <span className="text-slate-500">(n={count})</span>:</span>{" "}
        {empty ? <span className="italic">No data yet</span> : <span className="font-medium">{avg}</span>}
      </div>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Phase Averages</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {byPhase.map(row => (
          <div key={row.phase} className="rounded-2xl border p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{row.phase}</div>
              <PhaseBadge phase={row.phase} />
            </div>

            <div className="mt-2 text-sm space-y-1">
              <div className="text-slate-700">
                Entries: <span className="font-medium">{row.n}</span>
              </div>

              <MetricRow
                label="Avg Energy"
                avg={row.avgEnergy}
                count={row.cE}
                title={`Based on ${row.cE} Energy ${row.cE === 1 ? "entry" : "entries"}`}
              />
              <MetricRow
                label="Avg RPE"
                avg={row.avgRpe}
                count={row.cR}
                title={`Based on ${row.cR} RPE ${row.cR === 1 ? "entry" : "entries"}`}
              />
              <MetricRow
                label="Avg Sleep"
                avg={row.avgSleep}
                count={row.cS}
                title={`Based on ${row.cS} Sleep ${row.cS === 1 ? "entry" : "entries"}`}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
