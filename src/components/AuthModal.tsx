import { useEffect, useState } from 'react';

export default function AuthModal() {
  const [name, setName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem('agent-name');
    if (!storedName) {
      setIsOpen(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem('agent-name', name.trim());
      localStorage.setItem('agent-id', name.trim().toLowerCase().replace(/\s+/g, '-'));
      setIsOpen(false);
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('agent-authenticated', { detail: name.trim() }));
      // Reload to refresh data with new agent context
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚡</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to Ops</h2>
          <p className="text-gray-400">Enter your name to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ruben"
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          Your name will be used to track task assignments and activity
        </p>
      </div>
    </div>
  );
}
