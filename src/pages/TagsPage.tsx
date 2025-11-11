import { useState, useEffect } from "react";
import { storage } from "@/lib/storage";
import { Hash } from "lucide-react";

export default function TagsPage() {
  const [tags, setTags] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = () => {
    const entries = storage.getEntries();
    const tagCounts = new Map<string, number>();

    entries.forEach(entry => {
      entry.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    setTags(tagCounts);
  };

  const sortedTags = Array.from(tags.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="container mx-auto px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {sortedTags.length} unique tags
        </p>
      </div>

      {sortedTags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Hash className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No tags yet</h3>
          <p className="text-muted-foreground">Tags will appear here once you add them to entries</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sortedTags.map(([tag, count], index) => (
            <div
              key={tag}
              className="flex items-center justify-between p-4 rounded border border-border hover:bg-surface transition-colors animate-slide-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-center gap-3">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{tag}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {count} {count === 1 ? 'entry' : 'entries'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
