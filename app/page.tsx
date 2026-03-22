"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Users,
  Calendar,
  User,
  CalendarCheck,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { rescheduleSuggestionSlots } from "@/lib/reschedule-suggestions";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeSlot = string; // "day-hour", e.g. "0-9" = Monday 9am

type Member = {
  id: string;
  name: string;
  color: string;
  availability: TimeSlot[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["週一", "週二", "週三", "週四", "週五"];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
const COLORS = [
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-cyan-500",
];

const slot = (day: number, hour: number): TimeSlot => `${day}-${hour}`;

// ─── Fake initial data ────────────────────────────────────────────────────────

// 假資料：三人皆有「週三 9–11」共同空閒，方便展示
const INITIAL_MEMBERS: Member[] = [
  {
    id: "me",
    name: "我",
    color: "bg-blue-500",
    availability: [
      slot(0, 9), slot(0, 10), slot(0, 11),          // Mon 9–12
      slot(0, 14), slot(0, 15), slot(0, 16),         // Mon 14–17
      slot(2, 9),  slot(2, 10), slot(2, 11),         // Wed 9–12（共同）
      slot(3, 14), slot(3, 15), slot(3, 16),         // Thu 14–17
      slot(4, 9),  slot(4, 10),                      // Fri 9–11
    ],
  },
  {
    id: "xiao-liang",
    name: "小梁",
    color: "bg-green-500",
    availability: [
      slot(0, 9),  slot(0, 10), slot(0, 11),         // Mon 9–12
      slot(2, 9),  slot(2, 10), slot(2, 11),         // Wed 9–12（共同）
      slot(2, 14), slot(2, 15), slot(2, 16),         // Wed 14–17
      slot(4, 9),  slot(4, 10),                      // Fri 9–11
    ],
  },
  {
    id: "lu-lu",
    name: "盧盧",
    color: "bg-purple-500",
    availability: [
      slot(1, 10), slot(1, 11), slot(1, 12),         // Tue 10–13
      slot(2, 9),  slot(2, 10), slot(2, 11),         // Wed 9–12（共同）
      slot(3, 14), slot(3, 15),                      // Thu 14–16
    ],
  },
];

// ─── Schedule Grid Component ──────────────────────────────────────────────────

function ScheduleGrid({
  availability,
  onToggle,
  emerald = false,
}: {
  availability: TimeSlot[];
  onToggle?: (day: number, hour: number) => void;
  emerald?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="w-14" />
            {DAYS.map((d) => (
              <th key={d} className="p-2 text-center font-medium text-sm">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((h) => (
            <tr key={h}>
              <td className="text-right pr-3 text-muted-foreground text-xs py-0.5 whitespace-nowrap">
                {h}:00
              </td>
              {DAYS.map((_, d) => {
                const s = slot(d, h);
                const active = availability.includes(s);
                const cellClass = active
                  ? emerald
                    ? "bg-emerald-400 border-emerald-400"
                    : "bg-primary border-primary"
                  : "bg-muted border-border hover:bg-muted/60";
                return (
                  <td key={d} className="p-0.5">
                    <div
                      className={`h-8 rounded border transition-colors ${cellClass} ${onToggle ? "cursor-pointer" : "cursor-default"}`}
                      onClick={() => onToggle?.(d, h)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex gap-4 mb-5 text-xs text-muted-foreground">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded ${item.color}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

/** 兩人並列顯示（含「我」時固定「我」在前） */
function formatPairMemberNames(x: Member, y: Member): string {
  if (x.id === "me") return `${x.name}、${y.name}`;
  if (y.id === "me") return `${y.name}、${x.name}`;
  return [x.name, y.name]
    .sort((n1, n2) => n1.localeCompare(n2, "zh-Hant"))
    .join("、");
}

function RecommendationSlotRow({
  timeSlot,
  onSelect,
  detail,
}: {
  timeSlot: TimeSlot;
  onSelect: (s: TimeSlot) => void;
  detail?: string;
}) {
  const [d, h] = timeSlot.split("-").map(Number);
  const label = `${DAYS[d]} ${h}:00–${h + 1}:00`;
  return (
    <li>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <div className="min-w-0">
          <span className="text-sm font-medium">{label}</span>
          {detail ? (
            <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          onClick={() => onSelect(timeSlot)}
        >
          改爲此時段
        </Button>
      </div>
    </li>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function MeetFlow() {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState("xiao-liang");
  /** 已選定的一小時會議時段（與格子鍵相同，例如 "2-9"） */
  const [meetingSlot, setMeetingSlot] = useState<TimeSlot | null>(
    slot(2, 9)
  );

  const me = members.find((m) => m.id === "me")!;
  const others = members.filter((m) => m.id !== "me");
  const viewing = members.find((m) => m.id === viewId) ?? others[0];

  const commonSlots = DAYS.flatMap((_, d) =>
    HOURS.filter((h) =>
      members.every((m) => m.availability.includes(slot(d, h)))
    ).map((h) => slot(d, h))
  );

  const meetingConflict =
    meetingSlot !== null && !commonSlots.includes(meetingSlot);

  const attendeesAtMeetingSlot =
    meetingSlot !== null
      ? members.filter((m) => m.availability.includes(meetingSlot))
      : [];

  const meetingConflictNotice =
    meetingConflict && meetingSlot
      ? attendeesAtMeetingSlot.length === 2
        ? `此時段只有兩人能出席：${formatPairMemberNames(
            attendeesAtMeetingSlot[0],
            attendeesAtMeetingSlot[1]
          )}`
        : attendeesAtMeetingSlot.length === 1
          ? `此時段只有一人可出席：${attendeesAtMeetingSlot[0].name}`
          : attendeesAtMeetingSlot.length === 0
            ? "此時段無人可出席。"
            : `此時段無法讓全員出席。可出席：${[...attendeesAtMeetingSlot]
                .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"))
                .map((m) => m.name)
                .join("、")}（共 ${attendeesAtMeetingSlot.length} 人）`
      : "";

  /** 更改會議時間用：依目前選定時段排序的其他共同空閒（可點選套用） */
  const changeMeetingRecommendations =
    commonSlots.length > 0
      ? rescheduleSuggestionSlots(commonSlots, meetingSlot, 8)
      : [];

  /** 恰好兩人空閒的時段，依「兩人一組」分區塊（三人以上團隊） */
  const twoMemberPairBlocks =
    members.length >= 3
      ? (() => {
          type PairAcc = { a: Member; b: Member; slots: Set<TimeSlot> };
          const map = new Map<string, PairAcc>();

          for (let d = 0; d < DAYS.length; d++) {
            for (const h of HOURS) {
              const s = slot(d, h);
              const avail = members.filter((m) => m.availability.includes(s));
              if (avail.length !== 2) continue;
              const [x, y] = [...avail].sort((p, q) =>
                p.id.localeCompare(q.id)
              );
              const key = `${x.id}:${y.id}`;
              let entry = map.get(key);
              if (!entry) {
                entry = { a: x, b: y, slots: new Set() };
                map.set(key, entry);
              }
              entry.slots.add(s);
            }
          }

          const rank = (t: TimeSlot) => {
            const [di, hi] = t.split("-").map(Number);
            return di * 100 + hi;
          };

          const blocks = Array.from(map.values()).map(({ a, b, slots }) => {
            const label = formatPairMemberNames(a, b);
            const slotList = rescheduleSuggestionSlots(
              [...slots],
              meetingSlot,
              8
            );
            return {
              pairKey: `${a.id}:${b.id}`,
              label,
              slots: slotList,
              sortKey: Math.min(...[...slots].map(rank)),
            };
          });

          return blocks
            .filter((b) => b.slots.length > 0)
            .sort((p, q) => p.sortKey - q.sortKey);
        })()
      : [];

  function toggleMySlot(day: number, hour: number) {
    const s = slot(day, hour);
    setMembers((prev) =>
      prev.map((m) =>
        m.id !== "me"
          ? m
          : {
              ...m,
              availability: m.availability.includes(s)
                ? m.availability.filter((x) => x !== s)
                : [...m.availability, s],
            }
      )
    );
  }

  function addMember() {
    const name = newName.trim();
    if (!name) return;
    const color = COLORS[members.length % COLORS.length];
    const newMember: Member = {
      id: `member-${Date.now()}`,
      name,
      color,
      availability: [],
    };
    setMembers((prev) => [...prev, newMember]);
    setNewName("");
    setOpen(false);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <CalendarCheck className="w-5 h-5" />
          <h1 className="text-lg font-semibold tracking-tight">MeetFlow</h1>
          <Badge variant="secondary" className="text-xs font-normal">
            Beta
          </Badge>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Tabs defaultValue="members">
          <TabsList className="mb-8 h-auto min-h-10 flex-wrap gap-1 py-1">
            <TabsTrigger value="members" className="gap-1.5 text-sm">
              <Users className="w-3.5 h-3.5" />
              成員
            </TabsTrigger>
            <TabsTrigger value="my-schedule" className="gap-1.5 text-sm">
              <User className="w-3.5 h-3.5" />
              我的時間表
            </TabsTrigger>
            <TabsTrigger value="view-member" className="gap-1.5 text-sm">
              <Calendar className="w-3.5 h-3.5" />
              查看成員
            </TabsTrigger>
            <TabsTrigger value="common" className="gap-1.5 text-sm">
              <CalendarCheck className="w-3.5 h-3.5" />
              共同空閒
            </TabsTrigger>
            <TabsTrigger value="reschedule" className="gap-1.5 text-sm">
              <CalendarClock className="w-3.5 h-3.5" />
              更改會議時間推薦
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Members ── */}
          <TabsContent value="members">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold">成員列表</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  共 {members.length} 位成員
                </p>
              </div>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    加入成員
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xs">
                  <DialogHeader>
                    <DialogTitle>加入新成員</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-3 mt-2">
                    <Input
                      placeholder="輸入成員名稱"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addMember()}
                      autoFocus
                    />
                    <Button onClick={addMember} disabled={!newName.trim()}>
                      確認加入
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback
                        className={`${m.color} text-white text-sm font-semibold`}
                      >
                        {m.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.availability.length} 個空閒時段
                      </p>
                    </div>
                    {m.id === "me" && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        你
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Tab 2: My Schedule ── */}
          <TabsContent value="my-schedule">
            <div className="mb-5">
              <h2 className="text-base font-semibold">我的時間表</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                點擊格子來切換你的空閒時段
              </p>
            </div>
            <Card>
              <CardContent className="pt-6">
                <Legend
                  items={[
                    { color: "bg-primary", label: "空閒" },
                    { color: "bg-muted border border-border", label: "忙碌" },
                  ]}
                />
                <ScheduleGrid
                  availability={me.availability}
                  onToggle={toggleMySlot}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 3: View Member ── */}
          <TabsContent value="view-member">
            <div className="mb-5">
              <h2 className="text-base font-semibold">查看成員時間表</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                選擇成員來查看他們的空閒時段
              </p>
            </div>

            {others.length === 0 ? (
              <p className="text-muted-foreground text-sm py-12 text-center">
                尚無其他成員，請先在「成員」頁加入
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-5">
                  {others.map((m) => (
                    <Button
                      key={m.id}
                      variant={viewing?.id === m.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewId(m.id)}
                    >
                      {m.name}
                    </Button>
                  ))}
                </div>

                {viewing && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback
                            className={`${viewing.color} text-white text-xs font-semibold`}
                          >
                            {viewing.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        {viewing.name} 的時間表
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Legend
                        items={[
                          { color: "bg-primary", label: "空閒" },
                          {
                            color: "bg-muted border border-border",
                            label: "忙碌",
                          },
                        ]}
                      />
                      <ScheduleGrid availability={viewing.availability} />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Tab 4: Common Availability ── */}
          <TabsContent value="common">
            <div className="mb-5">
              <h2 className="text-base font-semibold">共同空閒時間</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                所有 {members.length} 位成員都空閒的時段
              </p>
            </div>

            <Card className="mb-5 border-dashed">
              <CardContent className="pt-5 pb-5">
                <p className="text-sm font-medium">會議時間（一小時）</p>
                <p className="text-sm text-muted-foreground mt-1">
                  目前選定的會議時段如下。若要改期，請到「更改會議時間推薦」分頁選擇推薦時段，或點下方共同空閒列表。
                </p>
                {meetingSlot ? (
                  (() => {
                    const [d, h] = meetingSlot.split("-").map(Number);
                    return (
                      <p className="text-sm mt-3 font-medium">
                        已選定：{DAYS[d]} {h}:00–{h + 1}:00
                        {meetingConflict && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            時間衝突
                          </Badge>
                        )}
                      </p>
                    );
                  })()
                ) : (
                  <p className="text-sm mt-3 text-muted-foreground">
                    尚未選定會議時段
                  </p>
                )}
                {meetingConflict && (
                  <div
                    className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                    role="status"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{meetingConflictNotice}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Legend
                  items={[
                    { color: "bg-emerald-400", label: "共同空閒" },
                    { color: "bg-muted border border-border", label: "非共同" },
                  ]}
                />
                {commonSlots.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10 text-sm">
                    目前沒有共同空閒時段
                  </p>
                ) : (
                  <ScheduleGrid availability={commonSlots} emerald />
                )}
              </CardContent>
            </Card>

            {commonSlots.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {commonSlots.map((s) => {
                  const [d, h] = s.split("-").map(Number);
                  const selected = meetingSlot === s;
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setMeetingSlot(s)}
                      className={`text-sm px-3 py-2 rounded-lg border text-left transition-shadow bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200 hover:opacity-95 ${
                        selected
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : ""
                      }`}
                    >
                      {DAYS[d]} {h}:00–{h + 1}:00
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Tab 5: 更改會議時間推薦 ── */}
          <TabsContent value="reschedule">
            <div className="mb-5">
              <h2 className="text-base font-semibold">更改會議時間推薦</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                列出「全員」與「僅兩人」同時空閒的推薦時段；右側按鈕可設為新的一小時會議時間。
              </p>
            </div>

            <Card className="mb-5 border-dashed">
              <CardContent className="pt-5 pb-5">
                <p className="text-sm font-medium">目前會議時間</p>
                {meetingSlot ? (
                  (() => {
                    const [d, h] = meetingSlot.split("-").map(Number);
                    return (
                      <p className="text-sm mt-2 font-medium">
                        {DAYS[d]} {h}:00–{h + 1}:00
                        {meetingConflict && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            時間衝突
                          </Badge>
                        )}
                      </p>
                    );
                  })()
                ) : (
                  <p className="text-sm mt-2 text-muted-foreground">
                    尚未選定；請從下方推薦或「共同空閒」分頁選擇。
                  </p>
                )}
                {meetingConflict && (
                  <div
                    className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                    role="status"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{meetingConflictNotice}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  可選推薦時段（全員可出席）
                </CardTitle>
                <p className="text-sm font-normal text-muted-foreground">
                  已排除目前選定時段，並優先列出較接近的下一個全員共同空檔。
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {commonSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    尚無共同空閒，無法推薦改期時段。請先到「共同空閒」查看或請成員更新空閒。
                  </p>
                ) : changeMeetingRecommendations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    目前沒有其他可選的共同空閒；請調整成員空閒，或到「共同空閒」從完整列表中選擇。
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2" role="list">
                    {changeMeetingRecommendations.map((s) => (
                      <RecommendationSlotRow
                        key={s}
                        timeSlot={s}
                        onSelect={setMeetingSlot}
                      />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="mt-5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  只有兩人可以的時間
                </CardTitle>
                <p className="text-sm font-normal text-muted-foreground">
                  依兩人組合分區塊；區塊內為該兩人「恰好都空閒」且其他人不行的時段（非全員）。
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {members.length < 3 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    成員達三人以上時，會列出「恰好兩人」同時空閒的時段；目前團隊人數較少，請以上方「全員」列表為主。
                  </p>
                ) : twoMemberPairBlocks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    目前沒有恰好兩位成員同時空閒的時段。
                  </p>
                ) : (
                  <div className="flex flex-col gap-5">
                    {twoMemberPairBlocks.map(({ pairKey, label, slots }) => (
                      <div
                        key={pairKey}
                        className="rounded-xl border border-border bg-muted/40 p-4 dark:bg-muted/20"
                      >
                        <h3 className="text-sm font-semibold mb-3 pb-2 border-b border-border/80">
                          {label}
                        </h3>
                        <ul className="flex flex-col gap-2" role="list">
                          {slots.map((s) => (
                            <RecommendationSlotRow
                              key={s}
                              timeSlot={s}
                              onSelect={setMeetingSlot}
                            />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
