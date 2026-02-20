'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendInvitationEmail } from '@/lib/email'

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

// ── Team management ────────────────────────────────────────────────────────────

export async function sendInvitation(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name, role, company_id, email')
    .eq('id', user.id)
    .single<{ company_name: string; role: string; company_id: string | null; email: string | null }>()

  if (!profile) return { error: 'Profile not found.' }
  if (!['owner', 'admin'].includes(profile.role)) return { error: 'Insufficient permissions.' }

  const email = (formData.get('email') as string | null)?.trim().toLowerCase()
  const role = (formData.get('role') as string | null) ?? 'member'

  if (!email) return { error: 'Email is required.' }
  if (!['admin', 'member'].includes(role)) return { error: 'Invalid role.' }

  const companyId = profile.company_id ?? user.id

  // Prevent duplicate pending invite
  const { data: existing } = await supabase
    .from('team_invitations')
    .select('id')
    .eq('company_id', companyId)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return { error: 'A pending invitation for this email already exists.' }

  const { data: invitation, error: invErr } = await supabase
    .from('team_invitations')
    .insert({ company_id: companyId, invited_by: user.id, email, role })
    .select('token')
    .single<{ token: string }>()

  if (invErr || !invitation) return { error: invErr?.message ?? 'Failed to create invitation.' }

  try {
    await sendInvitationEmail({
      to: email,
      companyName: profile.company_name,
      inviterEmail: user.email ?? profile.email ?? profile.company_name,
      role: role as 'admin' | 'member',
      token: invitation.token,
    })
  } catch (e) {
    return { error: `Invitation created but email failed to send: ${(e as Error).message}` }
  }

  revalidatePath('/dashboard/team')
  return { error: null }
}

export async function cancelInvitation(id: string): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('team_invitations')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/team')
  return { error: null }
}

export async function removeTeamMember(memberId: string): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single<{ role: string; company_id: string | null }>()

  if (!currentProfile || currentProfile.role !== 'owner') {
    return { error: 'Only the account owner can remove team members.' }
  }

  const companyId = currentProfile.company_id ?? user.id
  const admin = createAdminClient()

  const { data: memberProfile } = await admin
    .from('profiles')
    .select('role, company_id')
    .eq('id', memberId)
    .single<{ role: string; company_id: string | null }>()

  if (!memberProfile || memberProfile.company_id !== companyId) {
    return { error: 'Member not found in your company.' }
  }
  if (memberProfile.role === 'owner') {
    return { error: 'Cannot remove the account owner.' }
  }

  const { error } = await admin
    .from('profiles')
    .update({ company_id: null, role: 'owner' })
    .eq('id', memberId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/team')
  return { error: null }
}

export async function acceptInvitationForCurrentUser(token: string): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated.' }

  const admin = createAdminClient()

  const { data: invitation } = await admin
    .from('team_invitations')
    .select('id, company_id, role, status, expires_at')
    .eq('token', token)
    .single<{ id: string; company_id: string; role: string; status: string; expires_at: string }>()

  if (!invitation) return { error: 'Invalid invitation link.' }
  if (invitation.status !== 'pending') return { error: 'This invitation has already been used or cancelled.' }
  if (new Date(invitation.expires_at) < new Date()) return { error: 'This invitation has expired.' }

  // Check if user is already in a different company
  const { data: currentProfile } = await admin
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single<{ company_id: string | null }>()

  if (currentProfile?.company_id && currentProfile.company_id !== invitation.company_id) {
    return { error: 'You are already a member of another company.' }
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({ company_id: invitation.company_id, role: invitation.role })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  const { error: invError } = await admin
    .from('team_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id)

  if (invError) return { error: invError.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/team')
  return { error: null }
}
