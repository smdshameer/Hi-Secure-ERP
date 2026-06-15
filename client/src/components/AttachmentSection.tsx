import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

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

function getIconForMime(mime: string) {
  if (mime.includes('pdf')) return 'ti-file-description text-red-500';
  if (mime.includes('image')) return 'ti-photo text-blue-500';
  if (mime.includes('sheet') || mime.includes('excel')) return 'ti-file-spreadsheet text-green-500';
  if (mime.includes('word') || mime.includes('document')) return 'ti-file-text text-indigo-500';
  return 'ti-file text-gray-500';
}

export default function AttachmentSection({ entityType, entityId }: AttachmentSectionProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = () => {
    setLoading(true);
    api.get(`/attachments/${entityType}/${entityId}`)
      .then(res => {
        if (Array.isArray(res.data)) {
          setAttachments(res.data);
        }
      })
      .catch(err => console.error('Failed to fetch attachments', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (entityId) {
      fetchAttachments();
    }
  }, [entityType, entityId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB limit.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity_type', entityType);
    formData.append('entity_id', String(entityId));

    try {
      await api.post('/attachments/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchAttachments();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await api.delete(`/attachments/${id}`);
      setAttachments(prev => prev.filter(a => a.attachment_id !== id));
    } catch (err) {
      alert('Failed to delete attachment.');
    }
  };

  const handleDownload = (id: number, name: string) => {
    // We can download using an api endpoint that serves the file
    // To ensure JWT is passed, we fetch the blob or open with token in URL if endpoint supports it,
    // but the cleanest and safest way is downloading via axios and creating a download link!
    api.get(`/attachments/${id}/download`, { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', name);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      })
      .catch(() => alert('Failed to download file.'));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-5 space-y-4">
      <div className="flex justify-between items-center border-b border-gray-100 pb-3 flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-gray-800 text-[13.5px] flex items-center gap-2">
            <i className="ti ti-paperclip text-[17px] text-gray-500" />
            File Attachments
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Upload PDFs, images, Excel, or Word sheets up to 5MB.</p>
        </div>

        {/* Upload Button */}
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
            <i className="ti ti-upload text-[14px]" />
            {uploading ? 'Uploading...' : 'Attach File'}
          </button>
        </div>
      </div>

      {/* Attachments List */}
      {loading ? (
        <div className="text-center py-4 text-[12px] text-gray-400">Loading attachments...</div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-6 text-gray-400 flex flex-col items-center justify-center gap-1 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
          <i className="ti ti-paperclip text-[22px] text-gray-300" />
          <p className="text-[12px] font-medium text-gray-500">No attachments yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attachments.map(att => (
            <div 
              key={att.attachment_id} 
              className="flex items-center justify-between p-3 border border-gray-100 hover:border-gray-200 rounded-lg bg-gray-50/40 hover:bg-gray-50 transition-colors duration-150"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <i className={`ti ${getIconForMime(att.mime_type)} text-[20px] flex-shrink-0`} />
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-gray-700 truncate" title={att.file_name}>
                    {att.file_name}
                  </p>
                  <p className="text-[9.5px] text-gray-400 font-medium">
                    {new Date(att.uploaded_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
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
                  <i className="ti ti-download text-[14px]" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(att.attachment_id, att.file_name)}
                  className="w-7 h-7 flex items-center justify-center bg-white hover:bg-red-50 text-gray-500 hover:text-red-650 border border-gray-150 rounded-md transition-colors cursor-pointer"
                  title="Delete file"
                >
                  <i className="ti ti-trash text-[14px]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}