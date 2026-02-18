import { useEffect, useState } from 'react';

export const keyboardShortcuts = {
  'n': 'New task',
  'f': 'Focus search',
  'Escape': 'Close modal',
  '?': 'Show shortcuts',
};

export function useKeyboardShortcuts(handlers: {
  onNewTask?: () => void;
  onFocusSearch?: () => void;
  onClose?: () => void;
}) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape' && handlers.onClose) {
          handlers.onClose();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'n':
          if (handlers.onNewTask) {
            e.preventDefault();
            handlers.onNewTask();
          }
          break;
        case 'k':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (handlers.onFocusSearch) {
              handlers.onFocusSearch();
            }
          }
          break;
        case 'f':
          e.preventDefault();
          if (handlers.onFocusSearch) {
            handlers.onFocusSearch();
          }
          break;
        case 'escape':
          if (handlers.onClose) {
            handlers.onClose();
          }
          break;
        case '?':
          e.preventDefault();
          setShowHelp(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);

  return { showHelp, setShowHelp };
}

export default function KeyboardShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full m-4 border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">⌨️ Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        
        <div className="space-y-3">
          {Object.entries(keyboardShortcuts).map(([key, description]) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
              <span className="text-gray-300">{description}</span>
              <kbd className="px-3 py-1 bg-gray-700 rounded text-sm font-mono">{key}</kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Press <kbd className="px-2 py-0.5 bg-gray-700 rounded">?</kbd> anytime to show this help
        </div>
      </div>
    </div>
  );
}
