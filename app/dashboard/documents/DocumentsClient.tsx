'use client'

import { useState, useTransition } from 'react'
import UploadModal from './UploadModal'
import { deleteDocument } from './actions'

export type Document = {
  id: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  document_type: string
  description: string | null
  uploaded_at: string
  ingredient_id: string | null
  monitored_ingredients: { ingredient_name: string } | null
}

type Ingredient = {
  id: string
  ingredient_name: string
}

const DOC_TYPE_LABELS: Record<string, string> = {
  sds: 'SDS',
  certificate: 'Certificate',
  test_report: 'Test Report',
  reach_dossier: 'REACH Dossier',
  other: 'Other',
}

const DOC_TYPE_COLORS: Record<string, string> = {
  sds: 'bg-blue-50 text-blue-700 border-blue-200',
  certificate: 'bg-green-50 text-green-700 border-green-200',
  test_report: 'bg-purple-50 text-purple-700 border-purple-200',
  reach_dossier: 'bg-orange-50 text-orange-700 border-orange-200',
  other: 'bg-neutral-50 text-neutral-600 border-neutral-200',
}

function fileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') {
    return (
      <svg className="h-8 w-8 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    )
  }
  if (mimeType.startsWith('image/')) {
    return (
      <svg className="h-8 w-8 text-teal-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    )
  }
  // Word / Excel
  return (
    <svg className="h-8 w-8 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Props = {
  initialDocuments: Document[]
  ingredients: Ingredient[]
  docLimit: number | null
}

export default function DocumentsClient({ initialDocuments, ingredients, docLimit }: Props) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [showUpload, setShowUpload] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterIngredient, setFilterIngredient] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Sync when server re-renders after router.refresh()
  // (router.refresh triggers parent Server Component re-render → new props)

  const filtered = documents.filter((doc) => {
    if (search && !doc.file_name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterType && doc.document_type !== filterType) return false
    if (filterIngredient && doc.ingredient_id !== filterIngredient) return false
    return true
  })

  const atLimit = docLimit !== null && documents.length >= docLimit

  async function handleDownload(id: string, fileName: string) {
    const res = await fetch(`/api/documents/${id}/download`)
    const json = await res.json()
    if (json.url) {
      const a = document.createElement('a')
      a.href = json.url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this document? This cannot be undone.')) return
    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteDocument(id)
      if (!result.error) {
        setDocuments((prev) => prev.filter((d) => d.id !== id))
      }
      setDeletingId(null)
    })
  }

  const handleModalClose = () => {
    setShowUpload(false)
    // Parent (Server Component) will re-render via router.refresh() called from UploadModal,
    // but since we're fully client-side here, we re-fetch via page reload on next navigation.
    // The UploadModal calls router.refresh() which triggers a server re-render.
  }

  return (
    <>
      {showUpload && (
        <UploadModal
          ingredients={ingredients}
          onClose={handleModalClose}
        />
      )}

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Documents</h2>
          <p className="text-sm text-neutral-400 mt-0.5">
            {docLimit === null
              ? `${documents.length} document${documents.length !== 1 ? 's' : ''}`
              : `${documents.length} / ${docLimit} documents`}
          </p>
        </div>

        {atLimit ? (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Limit reached —{' '}
            <a href="/dashboard/subscription" className="underline font-medium">upgrade your plan</a>
          </div>
        ) : (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload document
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search by file name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white w-56"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        >
          <option value="">All types</option>
          {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        {ingredients.length > 0 && (
          <select
            value={filterIngredient}
            onChange={(e) => setFilterIngredient(e.target.value)}
            className="text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="">All ingredients</option>
            {ingredients.map((ing) => (
              <option key={ing.id} value={ing.id}>{ing.ingredient_name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="h-12 w-12 text-neutral-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-sm font-medium text-neutral-400">
            {documents.length === 0 ? 'No documents yet' : 'No documents match your filters'}
          </p>
          {documents.length === 0 && !atLimit && (
            <button
              onClick={() => setShowUpload(true)}
              className="mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium underline underline-offset-2"
            >
              Upload your first document
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-neutral-200 px-4 py-3 flex items-center gap-3 group"
            >
              {fileIcon(doc.file_type)}

              <div className="flex-1 min-w-0">
                <button
                  onClick={() => handleDownload(doc.id, doc.file_name)}
                  className="text-sm font-medium text-neutral-900 hover:text-teal-600 transition-colors truncate block text-left w-full"
                >
                  {doc.file_name}
                </button>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  {doc.monitored_ingredients && (
                    <span className="text-xs text-neutral-400">
                      {doc.monitored_ingredients.ingredient_name}
                    </span>
                  )}
                  <span className="text-xs text-neutral-300">{formatSize(doc.file_size)}</span>
                  <span className="text-xs text-neutral-300">
                    {new Date(doc.uploaded_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {doc.description && (
                  <p className="text-xs text-neutral-400 mt-0.5 truncate">{doc.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    DOC_TYPE_COLORS[doc.document_type] ?? DOC_TYPE_COLORS.other
                  }`}
                >
                  {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                </span>

                <button
                  onClick={() => handleDownload(doc.id, doc.file_name)}
                  title="Download"
                  className="p-1.5 text-neutral-300 hover:text-teal-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </button>

                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  title="Delete"
                  className="p-1.5 text-neutral-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                >
                  {deletingId === doc.id ? (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
