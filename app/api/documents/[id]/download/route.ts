import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params

  // Fetch the document — RLS enforces company-scoped access
  const { data: document } = await supabase
    .from('documents')
    .select('file_path, file_name')
    .eq('id', id)
    .single<{ file_path: string; file_name: string }>()

  if (!document) {
    return Response.json({ error: 'Document not found.' }, { status: 404 })
  }

  // Generate a signed URL valid for 1 hour using admin client
  const admin = createAdminClient()
  const { data: signedData, error } = await admin.storage
    .from('regulatory-documents')
    .createSignedUrl(document.file_path, 3600, {
      download: document.file_name,
    })

  if (error || !signedData) {
    return Response.json({ error: 'Failed to generate download URL.' }, { status: 500 })
  }

  return Response.json({ url: signedData.signedUrl })
}
