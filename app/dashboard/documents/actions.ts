'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteDocument(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // Fetch the document to get the file path (RLS enforces ownership for DELETE)
  const { data: document } = await supabase
    .from('documents')
    .select('file_path, user_id')
    .eq('id', id)
    .single<{ file_path: string; user_id: string }>()

  if (!document) return { error: 'Document not found.' }

  // Only the uploader can delete (matches RLS policy, but double-check here)
  if (document.user_id !== user.id) return { error: 'Permission denied.' }

  // Delete from storage first (admin client bypasses storage RLS)
  const admin = createAdminClient()
  await admin.storage.from('regulatory-documents').remove([document.file_path])

  // Delete DB record (RLS delete policy: user_id = auth.uid())
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)

  if (dbError) return { error: dbError.message }

  revalidatePath('/dashboard/documents')
  return {}
}
