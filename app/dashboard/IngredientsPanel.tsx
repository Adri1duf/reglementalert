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

export default function IngredientsPanel({ ingredients }: { ingredients: Ingredient[] }) {
  const [state, formAction, addPending] = useActionState(addIngredient, initialState)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [, startDeleteTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  // Reset form fields after a successful add
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
      // Item disappears from the list via revalidatePath — no manual cleanup needed
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Add form ── */}
      <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <h2 className="text-sm font-semibold text-foreground mb-4">Add ingredient to monitor</h2>
        <form ref={formRef} action={formAction} className="flex flex-col sm:flex-row gap-3">
          <input
            name="ingredient_name"
            type="text"
            required
            placeholder="Ingredient name (e.g. Titanium dioxide)"
            className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="cas_number"
            type="text"
            placeholder="CAS number (optional)"
            className="w-full sm:w-44 px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={addPending}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {addPending ? 'Adding…' : '+ Add'}
          </button>
        </form>
        {state.error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{state.error}</p>
        )}
      </div>

      {/* ── Ingredients list ── */}
      <div className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Monitored ingredients</h2>
          <span className="text-xs text-neutral-400">
            {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
          </span>
        </div>

        {ingredients.length === 0 ? (
          <div className="text-center py-10 space-y-1">
            <p className="text-sm font-medium text-foreground">No ingredients yet</p>
            <p className="text-xs text-neutral-400">
              Add your first ingredient above to start monitoring regulatory changes.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 -my-1">
            {ingredients.map((ing) => (
              <li key={ing.id} className="flex items-center justify-between py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {ing.ingredient_name}
                  </p>
                  {ing.cas_number && (
                    <p className="text-xs text-neutral-400 mt-0.5">CAS {ing.cas_number}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(ing.id)}
                  disabled={deletingIds.has(ing.id)}
                  className="shrink-0 text-xs text-neutral-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                >
                  {deletingIds.has(ing.id) ? 'Removing…' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
