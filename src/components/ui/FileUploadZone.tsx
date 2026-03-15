import { useCallback, useState } from 'react'
import { Upload, X, FileText } from 'lucide-react'
import clsx from 'clsx'

interface FileUploadZoneProps {
  files: File[]
  onChange: (files: File[]) => void
  accept?: string
  maxFiles?: number
}

export default function FileUploadZone({ files, onChange, accept = '*', maxFiles = 5 }: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return
    const combined = [...files, ...Array.from(newFiles)].slice(0, maxFiles)
    onChange(combined)
  }, [files, onChange, maxFiles])

  const removeFile = (index: number) => onChange(files.filter((_, i) => i !== index))

  return (
    <div className="space-y-3">
      <label
        className={clsx(
          'flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all',
          dragging ? 'border-[#4E5A7A] bg-[#4E5A7A]/5' : 'border-slate-200 hover:border-[#4E5A7A]/50 hover:bg-slate-50'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
      >
        <Upload className="w-8 h-8 text-slate-400" />
        <p className="ui-page-intro text-center text-[13px]">
          <span className="font-semibold text-[#4E5A7A]">Click to upload</span> or drag and drop
        </p>
        <p className="ui-data-note">Max {maxFiles} files</p>
        <input type="file" className="hidden" multiple accept={accept} onChange={(e) => addFiles(e.target.files)} />
      </label>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
              <FileText className="w-4 h-4 text-[#4E5A7A] flex-shrink-0" />
              <span className="ui-data-value flex-1 truncate text-[13px]">{file.name}</span>
              <span className="ui-data-note">{(file.size / 1024).toFixed(0)} KB</span>
              <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

