'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionState = { error: string | null }

export async function addIngredient(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated. Please sign in again.' }

  const name = (formData.get('ingredient_name') as string | null)?.trim()
  const cas = (formData.get('cas_number') as string | null)?.trim() || null

  if (!name) return { error: 'Ingredient name is required.' }

  const { error } = await supabase
    .from('monitored_ingredients')
    .insert({ user_id: user.id, ingredient_name: name, cas_number: cas })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { error: null }
}

export async function deleteIngredient(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('monitored_ingredients')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { error: null }
}

export async function markAllAlertsAsRead(): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('regulatory_alerts')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { error: null }
}

export async function markAlertAsRead(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('regulatory_alerts')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', user.id) // RLS + belt-and-suspenders

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { error: null }
}
