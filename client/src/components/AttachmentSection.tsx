import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import {
  IconPaperclip, IconUpload, IconDownload, IconTrash,
  IconFileDescription, IconPhoto, IconFileSpreadsheet, IconFileTypeDoc, IconFile,
} from '@tabler/icons-react';

interface Attachment {
  attachment_id: number;
  entity_type: string;
  entity_id: number;
  file_name: string;
  file_path: string;
  mime_type: string;
  uploaded_at: string;
  uploaded_by: number;
}

interface AttachmentSectionProps {
  entityType: string;
  entityId: number;
}

interface MimeIcon {
  icon: React.FC<{ size?: number; stroke?: number; className?: string }>;
  color: string;
}

function getIconForMime(mime: string): MimeIcon {
  if (mime.includes('pdf')) return { icon: IconFileDescription, color: 'text-red-500' };
  if (mime.includes('image')) return { icon: IconPhoto, color: 'text-blue-500' };
  if (mime.includes('sheet') || mime.includes('excel')) return { icon: IconFileSpreadsheet, color: 'text-green-500' };
  if (mime.includes('word') || mime.includes('document')) return { icon: IconFileTypeDoc, color: 'text-indigo-500' };
  return { icon: IconFile, color: 'text-gray-500' };
}

export default function AttachmentSection({ entityType, entityId }: AttachmentSectionProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAttachments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/attachments/${entityType}/${entityId}`);
      setAttachments(data);
    } catch {
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAttachments(); }, [entityType, entityId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        await api.post('/api/attachments/upload?entity_type=' + entityType + '&entity_id=' + entityId, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      await loadAttachments();
    } catch {
      alert('Failed to upload file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (attachmentId: number, name: string) => {
    try {
      const url = '/api/attachments/' + attachmentId + '/download';
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', name);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      alert('Failed to download file.');
    }
  };

  const handleDelete = async (attachmentId: number, name: string) => {
    if (!confirm('Delete "' + name + '"?')) return;
    try {
      await api.delete('/api/attachments/' + attachmentId);
      await loadAttachments();
    } catch {
      alert('Failed to delete file.');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-5 space-y-4">
      <div className="flex justify-between items-center border-b border-gray-100 pb-3 flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-gray-800 text-[13.5px] flex items-center gap-2">
            <IconPaperclip size={17} className="text-gray-500" />
            File Attachments
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Upload PDFs, images, Excel, or Word sheets up to 5MB.</p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg text-[11px] font-bold transition-all duration-150 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <IconUpload size={14} stroke={2} />
            {uploading ? 'Uploading...' : 'Attach File'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4 text-[12px] text-gray-400">Loading attachments...</div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-6 text-gray-400 flex flex-col items-center justify-center gap-1 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
          <IconPaperclip size={22} className="text-gray-300" />
          <p className="text-[12px] font-medium text-gray-500">No attachments yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attachments.map((att) => {
            const { icon: AttIcon, color } = getIconForMime(att.mime_type);
            return (
              <div
                key={att.attachment_id}
                className="flex items-center justify-between p-3 border border-gray-100 hover:border-gray-200 rounded-lg bg-gray-50/40 hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <AttIcon size={20} stroke={1.5} className={'flex-shrink-0 ' + color} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-gray-700 truncate" title={att.file_name}>
                      {att.file_name}
                    </p>
                    <p className="text-[9.5px] text-gray-400 font-medium">
                      {new Date(att.uploaded_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(att.attachment_id, att.file_name)}
                    className="w-7 h-7 flex items-center justify-center bg-white hover:bg-blue-50 text-gray-500 hover:text-blue-600 border border-gray-150 rounded-md transition-colors cursor-pointer"
                    title="Download file"
                  >
                    <IconDownload size={14} stroke={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(att.attachment_id, att.file_name)}
                    className="w-7 h-7 flex items-center justify-center bg-white hover:bg-red-50 text-gray-500 hover:text-red-650 border border-gray-150 rounded-md transition-colors cursor-pointer"
                    title="Delete file"
                  >
                    <IconTrash size={14} stroke={1.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
