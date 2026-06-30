/**
 * @file src/features/doctor/components/ConsultationNotes.tsx
 * @description TipTap rich-text editor for consultation notes.
 * Spec 5.13:
 *   - StarterKit + Placeholder + CharacterCount extensions
 *   - Toolbar: Bold, Italic, Bullet list, Ordered list, H2, H3
 *   - Auto-save every 30s while typing (debounced mutation)
 *   - "Save and Complete" button (min 50 chars)
 *   - Character count shown below editor
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useRef } from 'react';
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3, Save,
} from 'lucide-react';
import { useAddNotes } from '../hooks/useDoctorQueue';

interface ConsultationNotesProps {
  consultationId: string;
  initialContent?: string;
  onCompleted:    () => void;
}

export function ConsultationNotes({
  consultationId,
  initialContent = '',
  onCompleted,
}: ConsultationNotesProps) {
  const addNotesMutation = useAddNotes();
  const autoSaveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Write your consultation notes here…' }),
      CharacterCount,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] px-4 py-3 focus:outline-none',
      },
    },
    // Auto-save every 30s on content change
    onUpdate: ({ editor: ed }) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        const text = ed.getText().trim();
        if (text.length >= 50) {
          addNotesMutation.mutate({ consultationId, notes: ed.getHTML() });
        }
      }, 30_000);
    },
  });

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  const charCount = editor?.storage.characterCount?.characters() ?? 0;
  const MIN_CHARS = 50;
  const canSave   = charCount >= MIN_CHARS;

  function handleSaveAndComplete() {
    if (!editor || !canSave) return;
    addNotesMutation.mutate(
      { consultationId, notes: editor.getHTML() },
      { onSuccess: onCompleted }
    );
  }

  if (!editor) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50">
        {[
          { icon: <Bold size={14} />,         action: () => editor.chain().focus().toggleBold().run(),          isActive: editor.isActive('bold'),         label: 'Bold' },
          { icon: <Italic size={14} />,       action: () => editor.chain().focus().toggleItalic().run(),        isActive: editor.isActive('italic'),       label: 'Italic' },
          { icon: <Heading2 size={14} />,     action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive('heading', { level: 2 }), label: 'H2' },
          { icon: <Heading3 size={14} />,     action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: editor.isActive('heading', { level: 3 }), label: 'H3' },
          { icon: <List size={14} />,         action: () => editor.chain().focus().toggleBulletList().run(),    isActive: editor.isActive('bulletList'),   label: 'Bullet list' },
          { icon: <ListOrdered size={14} />,  action: () => editor.chain().focus().toggleOrderedList().run(),  isActive: editor.isActive('orderedList'),  label: 'Numbered list' },
        ].map(({ icon, action, isActive, label }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            aria-label={label}
            title={label}
            className={`
              p-1.5 rounded-md text-sm font-medium transition-colors
              focus:outline-none focus:ring-2 focus:ring-primary-500
              ${isActive
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }
            `}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />

      {/* Footer: char count + save button */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
        <span className={`text-xs ${charCount < MIN_CHARS ? 'text-gray-400' : 'text-accent-600'}`}>
          {charCount} characters {charCount < MIN_CHARS ? `(min ${MIN_CHARS})` : '✓'}
        </span>
        <button
          type="button"
          onClick={handleSaveAndComplete}
          disabled={!canSave || addNotesMutation.isPending}
          aria-busy={addNotesMutation.isPending}
          className="
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold
            bg-accent-600 hover:bg-accent-700 disabled:bg-gray-300 disabled:cursor-not-allowed
            text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-1
            transition-colors
          "
        >
          {addNotesMutation.isPending ? (
            <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <Save size={13} aria-hidden="true" />
          )}
          Save &amp; Complete
        </button>
      </div>
    </div>
  );
}
