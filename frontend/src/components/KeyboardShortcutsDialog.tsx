import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    {
      category: "Navigation",
      items: [
        { keys: [`${mod}`, "H"], description: "Go to Timer (Home)" },
        { keys: [`${mod}`, "P"], description: "Go to Projects" },
        { keys: [`${mod}`, "E"], description: "Go to Entries" },
        { keys: [`${mod}`, ","], description: "Go to Settings" },
      ],
    },
    {
      category: "Timer",
      items: [
        { keys: ["Space"], description: "Start/Pause timer" },
        { keys: ["S"], description: "Stop timer" },
      ],
    },
    {
      category: "General",
      items: [
        { keys: ["?"], description: "Show keyboard shortcuts" },
        { keys: ["Esc"], description: "Close dialogs" },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate faster
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <kbd
                          key={i}
                          className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded text-xs text-muted-foreground">
          <p>💡 Tip: Shortcuts don't work when typing in input fields</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
