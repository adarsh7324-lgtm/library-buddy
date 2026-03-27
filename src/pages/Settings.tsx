import { useState, useEffect } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Save, Library } from 'lucide-react';
import { motion } from 'framer-motion';

const Settings = () => {
  const { settings, updateSettings } = useLibrary();
  const [libraryName, setLibraryName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings?.libraryName) {
      setLibraryName(settings.libraryName);
    }
  }, [settings]);

  const handleSave = async () => {
    const trimmed = libraryName.trim();
    if (!trimmed) {
      toast.error('Library name cannot be empty');
      return;
    }
    setIsSaving(true);
    try {
      await updateSettings({ libraryName: trimmed });
      toast.success('Library name updated successfully!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-white">Settings</h1>
          <p className="text-white/60 mt-0.5 text-sm">Manage your library preferences</p>
        </div>
      </div>

      {/* Library Branding Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-panel rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]"
      >
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
          <Library className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-white text-lg">Library Branding</h2>
            <p className="text-white/50 text-xs mt-0.5">
              This name will appear across the app — sidebar, WhatsApp messages, and PDF ID cards.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/70 text-sm font-medium">Library Name</Label>
            <Input
              id="library-name-input"
              value={libraryName}
              onChange={(e) => setLibraryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="e.g. City Central Library"
              className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20 backdrop-blur-sm h-11"
              maxLength={60}
            />
            <p className="text-white/30 text-xs">{libraryName.length}/60 characters</p>
          </div>

          {/* Preview */}
          {libraryName.trim() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-2">Preview</p>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-primary/30 flex items-center justify-center">
                  <Library className="w-3 h-3 text-primary" />
                </div>
                <span className="font-display font-bold text-sm text-white">
                  {libraryName.trim()}
                </span>
              </div>
            </motion.div>
          )}

          <Button
            id="save-settings-btn"
            onClick={handleSave}
            disabled={isSaving || !libraryName.trim()}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-semibold gap-2 h-10 px-6"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Future settings sections can be added here */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="glass-panel rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] opacity-50 pointer-events-none"
      >
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-5 h-5 text-white/30" />
          <div>
            <h2 className="font-semibold text-white/50 text-base">More Settings</h2>
            <p className="text-white/30 text-xs mt-0.5">Additional preferences coming soon.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
