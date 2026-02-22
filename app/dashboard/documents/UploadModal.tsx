'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Ingredient = {
  id: string
  ingredient_name: string
}

const DOC_TYPES = [
  { value: 'sds', label: 'Safety Data Sheet (SDS)' },
  { value: 'certificate', label: 'Certificate of Analysis' },
  { value: 'test_report', label: 'Test Report' },
  { value: 'reach_dossier', label: 'REACH Dossier' },
  { value: 'other', label: 'Other' },
] as const

const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Props = {
  ingredients: Ingredient[]
  onClose: () => void
}

export default function UploadModal({ ingredients, onClose }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState('')
  const [ingredientId, setIngredientId] = useState('')
  const [description, setDescription] = useState('')
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const pickFile = useCallback((f: File) => {
    setFile(f)
    setError('')
  }, [])

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) pickFile(f)
  }
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) pickFile(f)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return setError('Please select a file.')
    if (!docType) return setError('Please select a document type.')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('document_type', docType)
    if (ingredientId) formData.append('ingredient_id', ingredientId)
    if (description) formData.append('description', description)

    setUploading(true)
    setProgress(0)
    setError('')

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/documents/upload')

    xhr.upload.addEventListener('progress', (ev) => {
      if (ev.lengthComputable) {
        setProgress(Math.round((ev.loaded / ev.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      setUploading(false)
      if (xhr.status === 201) {
        router.refresh()
        onClose()
      } else {
        let msg = 'Upload failed.'
        try {
          const body = JSON.parse(xhr.responseText)
          if (body.error) msg = body.error
        } catch {}
        setError(msg)
        setProgress(0)
      }
    })

    xhr.addEventListener('error', () => {
      setUploading(false)
      setError('Network error. Please try again.')
      setProgress(0)
    })

    xhr.send(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-900">Upload document</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 py-8 ${
              dragging
                ? 'border-teal-400 bg-teal-50'
                : file
                ? 'border-teal-300 bg-teal-50/50'
                : 'border-neutral-200 hover:border-teal-300 hover:bg-neutral-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              onChange={onFileChange}
              className="sr-only"
              disabled={uploading}
            />
            {file ? (
              <>
                <svg className="h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-neutral-800">{file.name}</p>
                <p className="text-xs text-neutral-400">{formatSize(file.size)}</p>
              </>
            ) : (
              <>
                <svg className="h-8 w-8 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm text-neutral-500">
                  <span className="font-medium text-teal-600">Click to upload</span> or drag & drop
                </p>
                <p className="text-xs text-neutral-400">PDF, DOCX, XLSX, PNG, JPG — max 10 MB</p>
              </>
            )}
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-neutral-400 text-right">{progress}%</p>
            </div>
          )}

          {/* Document type */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Document type *</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              disabled={uploading}
              className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-neutral-900"
            >
              <option value="">Select a type…</option>
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Ingredient (optional) */}
          {ingredients.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Link to ingredient <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <select
                value={ingredientId}
                onChange={(e) => setIngredientId(e.target.value)}
                disabled={uploading}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-neutral-900"
              >
                <option value="">No ingredient</option>
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>{ing.ingredient_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Description (optional) */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Notes <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              rows={2}
              placeholder="e.g. Revision 3 — approved March 2025"
              className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none placeholder:text-neutral-300"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
