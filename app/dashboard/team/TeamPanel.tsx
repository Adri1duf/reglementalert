'use client'

import { useActionState, useTransition, useEffect, useRef, useState } from 'react'
import { sendInvitation, cancelInvitation, removeTeamMember, type ActionState } from '../actions'

// ── Types ─────────────────────────────────────────────────────────────────────

export type TeamMember = {
  id: string
  company_name: string
  email: string | null
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

export type PendingInvitation = {
  id: string
  email: string
  role: 'admin' | 'member'
  created_at: string
  expires_at: string
}

type Props = {
  members: TeamMember[]
  invitations: PendingInvitation[]
  currentUserId: string
  currentRole: 'owner' | 'admin' | 'member'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = { owner: 'Owner', admin: 'Admin', member: 'Member' }

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-teal-50 text-teal-700 border border-teal-200',
  admin: 'bg-blue-50 text-blue-700 border border-blue-200',
  member: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days < 1) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const initialState: ActionState = { error: null }

// ── Component ─────────────────────────────────────────────────────────────────

export default function TeamPanel({ members, invitations, currentUserId, currentRole }: Props) {
  const canManage = currentRole === 'owner' || currentRole === 'admin'

  // Invite form
  const [inviteState, inviteAction, invitePending] = useActionState(sendInvitation, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  // Reset form after successful invite
  const prevPendingRef = useRef(false)
  useEffect(() => {
    if (prevPendingRef.current && !invitePending && inviteState.error === null) {
      formRef.current?.reset()
    }
    prevPendingRef.current = invitePending
  }, [invitePending, inviteState.error])

  // Cancel invitation
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set())
  const [, startCancelTransition] = useTransition()

  function handleCancelInvitation(id: string) {
    setCancellingIds((prev) => new Set(prev).add(id))
    startCancelTransition(async () => {
      await cancelInvitation(id)
    })
  }

  // Remove member
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [, startRemoveTransition] = useTransition()

  function handleRemoveMember(id: string) {
    setRemovingIds((prev) => new Set(prev).add(id))
    startRemoveTransition(async () => {
      await removeTeamMember(id)
    })
  }

  return (
    <div className="space-y-6">

      {/* ── Team members ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
          <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <h2 className="text-sm font-semibold text-neutral-900">Team members</h2>
          <span className="ml-auto text-xs text-neutral-400">{members.length} {members.length === 1 ? 'member' : 'members'}</span>
        </div>

        <ul className="divide-y divide-neutral-50">
          {members.map((member) => {
            const isMe = member.id === currentUserId
            const canRemove = !isMe && currentRole === 'owner' && member.role !== 'owner'
            return (
              <li key={member.id} className="flex items-center gap-4 px-5 py-3.5">
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-teal-700">{initials(member.company_name)}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {member.company_name}
                    {isMe && <span className="ml-1.5 text-xs text-neutral-400">(you)</span>}
                  </p>
                  {member.email && (
                    <p className="text-xs text-neutral-400 truncate">{member.email}</p>
                  )}
                </div>

                {/* Role badge */}
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_BADGE[member.role]}`}>
                  {ROLE_LABELS[member.role]}
                </span>

                {/* Remove button (owner only, not self, not other owners) */}
                {canRemove && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={removingIds.has(member.id)}
                    title="Remove from team"
                    className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-neutral-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                  >
                    {removingIds.has(member.id) ? (
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-neutral-300 border-t-transparent animate-spin" />
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.765z" />
                      </svg>
                    )}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* ── Invite form (owner / admin only) ─────────────────────────────── */}
      {canManage && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            Invite a colleague
          </p>
          <form ref={formRef} action={inviteAction} className="flex flex-col sm:flex-row gap-2.5">
            <input
              name="email"
              type="email"
              required
              placeholder="colleague@company.com"
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-colors"
            />
            <select
              name="role"
              defaultValue="member"
              className="w-full sm:w-32 px-3.5 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-colors"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={invitePending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:bg-teal-400 text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              {invitePending ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  Send invite
                </>
              )}
            </button>
          </form>
          {inviteState.error && (
            <p className="mt-2.5 text-xs text-red-600 flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {inviteState.error}
            </p>
          )}
          {!inviteState.error && !invitePending && inviteState.error === null && (
            <p className="mt-2.5 text-xs text-neutral-400">
              They will receive an email with a link valid for 7 days.
            </p>
          )}
        </div>
      )}

      {/* ── Pending invitations ───────────────────────────────────────────── */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center gap-2">
            <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
            </svg>
            <h2 className="text-sm font-semibold text-neutral-900">Pending invitations</h2>
            <span className="ml-auto text-xs text-neutral-400">{invitations.length}</span>
          </div>

          <ul className="divide-y divide-neutral-50">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{inv.email}</p>
                  <p className="text-xs text-neutral-400">
                    Invited {timeAgo(inv.created_at)} · expires {new Date(inv.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_BADGE[inv.role]}`}>
                  {ROLE_LABELS[inv.role]}
                </span>
                {canManage && (
                  <button
                    onClick={() => handleCancelInvitation(inv.id)}
                    disabled={cancellingIds.has(inv.id)}
                    title="Cancel invitation"
                    className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-neutral-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                  >
                    {cancellingIds.has(inv.id) ? (
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-neutral-300 border-t-transparent animate-spin" />
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
