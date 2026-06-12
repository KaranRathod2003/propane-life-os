import { useMemo, useState } from "react";
import {
  Plus,
  NotebookPen,
  Search,
  Trash2,
  Loader2,
  Hash,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { parseDate, todayISO } from "@/lib/date";
import type { JournalEntry } from "@/types";
import {
  useCreateEntry,
  useDeleteEntry,
  useEntries,
  useUpdateEntry,
} from "../hooks";

/** "#idea, podcast atomic-habits" -> ["idea","podcast","atomic-habits"] */
function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((t) => t.replace(/^#/, "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export function EntriesSection() {
  const entries = useEntries();
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const list = entries.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    const tagQuery = q.replace(/^#/, "");
    return list.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags.some((t) => t.includes(tagQuery))
    );
  }, [entries.data, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const e of filtered) {
      const arr = map.get(e.entry_date) ?? [];
      arr.push(e);
      map.set(e.entry_date, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Journal</h2>
        <Button variant="ghost" size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Write
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search text or #tag"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {entries.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title={query ? "No matches" : "No entries yet"}
          hint={
            query
              ? "Try a different word or tag."
              : "Capture a thought, an idea, a reflection. Tag it with #idea or #podcast."
          }
          action={
            !query ? (
              <Button onClick={() => setCreating(true)}>Write one</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, items]) => (
            <div key={date} className="space-y-2">
              <p className="px-1 text-xs font-medium text-muted-foreground">
                {format(parseDate(date), "EEEE, d MMM yyyy")}
              </p>
              {items.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEditing(e)}
                  className="block w-full text-left"
                >
                  <Card className="transition-colors hover:bg-secondary/40">
                    <CardContent className="space-y-1.5 p-4">
                      {e.title && (
                        <p className="font-medium">{e.title}</p>
                      )}
                      <p
                        className={cn(
                          "whitespace-pre-wrap text-sm text-muted-foreground",
                          "line-clamp-4"
                        )}
                      >
                        {e.content || "—"}
                      </p>
                      {e.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {e.tags.map((t) => (
                            <Badge key={t} variant="secondary">
                              <Hash className="h-3 w-3" />
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <EntryEditorSheet
        open={creating || !!editing}
        entry={editing}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
          }
        }}
      />
    </div>
  );
}

function EntryEditorSheet({
  open,
  entry,
  onOpenChange,
}: {
  open: boolean;
  entry: JournalEntry | null;
  onOpenChange: (v: boolean) => void;
}) {
  const create = useCreateEntry();
  const update = useUpdateEntry();
  const del = useDeleteEntry();

  // Re-key the inner form on the entry id so fields reset cleanly.
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-[92vh] overflow-y-auto no-scrollbar">
        <SheetHeader>
          <SheetTitle>{entry ? "Edit entry" : "New entry"}</SheetTitle>
        </SheetHeader>
        <EntryForm
          key={entry?.id ?? "new"}
          entry={entry}
          saving={create.isPending || update.isPending}
          onSubmit={(values) => {
            if (entry) {
              update.mutate(
                { id: entry.id, patch: values },
                { onSuccess: () => onOpenChange(false) }
              );
            } else {
              create.mutate(values, { onSuccess: () => onOpenChange(false) });
            }
          }}
          onDelete={
            entry
              ? () =>
                  del.mutate(entry.id, { onSuccess: () => onOpenChange(false) })
              : undefined
          }
        />
      </SheetContent>
    </Sheet>
  );
}

function EntryForm({
  entry,
  saving,
  onSubmit,
  onDelete,
}: {
  entry: JournalEntry | null;
  saving: boolean;
  onSubmit: (v: {
    title: string;
    content: string;
    tags: string[];
    entry_date: string;
  }) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [tagsRaw, setTagsRaw] = useState(entry?.tags.join(" ") ?? "");
  const [entryDate, setEntryDate] = useState(entry?.entry_date ?? todayISO());

  const tags = parseTags(tagsRaw);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        placeholder="Write freely… markdown-ish plain text is fine."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[180px]"
        autoFocus={!entry}
      />
      <div className="space-y-1.5">
        <Input
          placeholder="Tags: #idea #podcast atomic-habits"
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Badge key={t} variant="secondary">
                <Hash className="h-3 w-3" />
                {t}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <Input
        type="date"
        value={entryDate}
        onChange={(e) => setEntryDate(e.target.value)}
      />
      <div className="flex gap-2">
        {onDelete && (
          <Button variant="outline" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
        <Button
          size="lg"
          className="flex-1"
          disabled={saving || (!title.trim() && !content.trim())}
          onClick={() =>
            onSubmit({ title: title.trim(), content, tags, entry_date: entryDate })
          }
        >
          {saving && <Loader2 className="animate-spin" />}
          {entry ? "Save changes" : "Save entry"}
        </Button>
      </div>
    </div>
  );
}
