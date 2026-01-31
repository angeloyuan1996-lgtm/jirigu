import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Check, X, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useUsername } from '@/hooks/useUsername';
import { toast } from 'sonner';

export const UsernameDisplay: React.FC = () => {
  const { username, loading, updateUsername } = useUsername();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleStartEdit = () => {
    setEditValue(username);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const handleSave = async () => {
    if (!editValue.trim() || editValue === username) {
      handleCancel();
      return;
    }

    setSaving(true);
    const result = await updateUsername(editValue);
    setSaving(false);

    if (result.success) {
      setIsEditing(false);
      setEditValue('');
      toast.success('Username updated!');
    } else {
      toast.error(result.error || 'Failed to update username');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (loading) {
    return (
      <div 
        className="px-3 py-1.5 rounded-full text-sm font-bold border-[2px] border-[#333] flex items-center gap-2"
        style={{ backgroundColor: '#FFFEF5', color: '#333' }}
      >
        <User className="w-4 h-4" />
        <span className="animate-pulse">...</span>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {isEditing ? (
        <motion.div
          key="editing"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="flex items-center gap-1"
        >
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            disabled={saving}
            className="h-8 w-28 text-sm font-bold border-[2px] border-[#333] rounded-lg px-2"
            style={{ backgroundColor: '#FFFEF5', color: '#333' }}
            maxLength={20}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSave}
            disabled={saving}
            className="w-7 h-7 flex items-center justify-center rounded-full border-[2px] border-[#333]"
            style={{ backgroundColor: '#22C55E' }}
          >
            <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleCancel}
            disabled={saving}
            className="w-7 h-7 flex items-center justify-center rounded-full border-[2px] border-[#333]"
            style={{ backgroundColor: '#EF4444' }}
          >
            <X className="w-4 h-4 text-white" strokeWidth={2.5} />
          </motion.button>
        </motion.div>
      ) : (
        <motion.button
          key="display"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStartEdit}
          className="px-3 py-1.5 rounded-full text-sm font-bold border-[2px] border-[#333] flex items-center gap-2 cursor-pointer group"
          style={{ backgroundColor: '#FFFEF5', color: '#333' }}
        >
          <User className="w-4 h-4" />
          <span className="max-w-[100px] truncate">{username}</span>
          <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
