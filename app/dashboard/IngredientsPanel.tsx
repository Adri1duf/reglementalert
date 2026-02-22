'use client'

import { useActionState, useTransition, useEffect, useRef, useState } from 'react'
import { addIngredient, deleteIngredient, type ActionState } from './actions'

export type Ingredient = {
  id: string
  ingredient_name: string
  cas_number: string | null
  created_at: string
}

const initialState: ActionState = { error: null }

// planLimit: null = unlimited, number = max (0 = no subscription)
export default function IngredientsPanel({
  ingredients,
  planLimit,
}: {
  ingredients: Ingredient[]
  planLimit?: number | null
}) {
  // Determine gating state
  const hasNoSubscription = planLimit === 0
  const atLimit = planLimit !== null && planLimit !== undefined && planLimit > 0 && ingredients.length >= planLimit
  const canAdd = !hasNoSubscription && !atLimit
  const [state, formAction, addPending] = useActionState(addIngredient, initialState)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [, startDeleteTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  // Reset form after a successful add
  const prevPendingRef = useRef(false)
  useEffect(() => {
    if (prevPendingRef.current && !addPending && state.error === null) {
      formRef.current?.reset()
    }
    prevPendingRef.current = addPending
  }, [addPending, state.error])

  function handleDelete(id: string) {
    setDeletingIds((prev) => new Set(prev).add(id))
    startDeleteTransition(async () => {
      await deleteIngredient(id)
    })
  }

  return (
    <div className="space-y-4">
      {/* ── Section header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5">
        <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.607L5 14.5m14.8.5l-1.5 5.25M5 14.5l-1.5 5.25" />
        </svg>
        <h2 className="text-base font-semibold text-neutral-900">Monitored ingredients</h2>
        <span className="text-xs text-neutral-400 ml-auto">
          {planLimit !== null && planLimit !== undefined && planLimit > 0
            ? `${ingredients.length} / ${planLimit}`
            : planLimit === null
            ? `${ingredients.length}`
            : `${ingredients.length}`}
        </span>
      </div>

      {/* ── Add form / upgrade gate ────────────────────────────────────────── */}
      {hasNoSubscription ? (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
              <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-neutral-900">Subscribe to monitor ingredients</p>
              <p className="text-xs text-neutral-500 mt-0.5 mb-3">
                Choose a plan to start monitoring up to 50 ingredients (Starter) or unlimited (Pro).
              </p>
              <a
                href="/dashboard/subscription"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
              >
                View plans
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      ) : atLimit ? (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-neutral-900">Ingredient limit reached ({planLimit} / {planLimit})</p>
              <p className="text-xs text-neutral-500 mt-0.5 mb-3">
                Upgrade to Pro for unlimited ingredient monitoring.
              </p>
              <a
                href="/dashboard/subscription"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
              >
                Upgrade to Pro
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            Add ingredient
          </p>
          <form ref={formRef} action={formAction} className="flex flex-col sm:flex-row gap-2.5">
            <input
              name="ingredient_name"
              type="text"
              required
              placeholder="Ingredient name (e.g. Titanium dioxide)"
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-colors"
            />
            <input
              name="cas_number"
              type="text"
              placeholder="CAS number (optional)"
              className="w-full sm:w-40 px-3.5 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={addPending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:bg-teal-400 text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              {addPending ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Adding…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add
                </>
              )}
            </button>
          </form>
          {state.error && (
            <p className="mt-2.5 text-xs text-red-600 flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {state.error}
            </p>
          )}
        </div>
      )}

      {/* ── Ingredient list ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        {ingredients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.607L5 14.5m14.8.5l-1.5 5.25M5 14.5l-1.5 5.25" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-neutral-900">No ingredients yet</p>
            <p className="mt-1 text-xs text-neutral-400 max-w-xs">
              Add your first ingredient above to start monitoring for regulatory changes.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {ingredients.map((ing) => (
              <li key={ing.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50 transition-colors">
                <div className="h-7 w-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                  <svg className="h-3.5 w-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {ing.ingredient_name}
                  </p>
                  {ing.cas_number && (
                    <p className="text-xs font-mono text-neutral-400 mt-0.5">CAS {ing.cas_number}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(ing.id)}
                  disabled={deletingIds.has(ing.id)}
                  className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-neutral-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                  title="Remove ingredient"
                >
                  {deletingIds.has(ing.id) ? (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-neutral-300 border-t-transparent animate-spin" />
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
