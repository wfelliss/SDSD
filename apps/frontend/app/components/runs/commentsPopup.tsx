import { useState, useEffect } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

interface CommentsPopupProps {
    isOpen: boolean;
    onClose: () => void;
    comments?: string | null;
    title?: string | null;
    runId?: number | null;
    onSave?: (id: number, comments: string) => Promise<unknown> | void;
}

export const CommentsPopup = ({ isOpen, onClose, comments, title, runId = null, onSave }: CommentsPopupProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comments ?? "");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEditContent(comments ?? "");
    }, [comments]);

  // Ensure lists render bullets despite global reset (some base CSS removes default list styles)
    const mdComponents: Partial<Components> = {
    ul: ({ ...props }) => (
        <ul className="list-disc list-inside ml-4" {...props} />
    ),
    ol: ({ ...props }) => (
        <ol className="list-decimal list-inside ml-4" {...props} />
    ),
    li: ({ ...props }) => <li className="mt-1" {...props} />,
    };

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!runId) return;
    setSaving(true);
    try {
      if (onSave) await onSave(runId, editContent);
      setIsEditing(false);
    } catch (e) {
      console.error("Failed to save comments", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl mx-4 rounded bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="mb-2 text-lg font-semibold">Comments{title ? ` — ${title}` : ""}</h2>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                className="px-3 py-1 rounded bg-slate-100 text-sm hover:bg-slate-200"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  className="px-3 py-1 rounded bg-slate-100 text-sm hover:bg-slate-200"
                  onClick={() => { setIsEditing(false); setEditContent(comments ?? ""); }}
                >
                  Cancel
                </button>
              </>
            )}
            <button
              className="ml-2 px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-2">
          {!isEditing ? (
            <div>
              <div className="h-64 overflow-auto rounded border border-slate-100 p-3 bg-slate-50 text-sm text-slate-700 prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={mdComponents}>
                  {editContent || "*No comments*"}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Raw Markdown</label>
                <textarea
                  className="h-64 w-full rounded border border-slate-200 p-2 text-sm font-mono"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Preview</label>
                <div className="h-64 overflow-auto rounded border border-slate-100 p-3 bg-slate-50 text-sm text-slate-700 prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={mdComponents}>
                    {editContent || "*No comments*"}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
