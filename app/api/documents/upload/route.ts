import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { documentLimit } from '@/lib/stripe/server'

export const dynamic = 'force-dynamic'

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
])

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

const VALID_DOC_TYPES = new Set([
  'sds', 'certificate', 'test_report', 'reach_dossier', 'other',
])

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

  // Fetch subscription for limit check
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan, subscription_status')
    .eq('id', user.id)
    .single<{ subscription_plan: string | null; subscription_status: string | null }>()

  // Count existing company-wide documents (RLS handles scoping)
  const { count: docCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })

  const limit = documentLimit(
    profile?.subscription_plan ?? null,
    profile?.subscription_status ?? null
  )

  if (limit !== null && (docCount ?? 0) >= limit) {
    return Response.json(
      { error: `Document limit reached (${limit}). Upgrade your plan to upload more.` },
      { status: 403 }
    )
  }

  // Parse form data
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const documentType = formData.get('document_type') as string | null
  const ingredientId = (formData.get('ingredient_id') as string | null) || null
  const description = (formData.get('description') as string | null) || null

  if (!file) return Response.json({ error: 'No file provided.' }, { status: 400 })
  if (!documentType || !VALID_DOC_TYPES.has(documentType)) {
    return Response.json({ error: 'Invalid document type.' }, { status: 400 })
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return Response.json(
      { error: 'File type not allowed. Use PDF, DOCX, XLSX, PNG, or JPG.' },
      { status: 400 }
    )
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'File exceeds the 10 MB limit.' }, { status: 400 })
  }

  // Build a safe, unique storage path
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
  const filePath = `${user.id}/${Date.now()}_${safeName}`

  // Upload to Supabase Storage via admin client (bypasses storage RLS)
  const admin = createAdminClient()
  const fileBuffer = await file.arrayBuffer()

  const { error: storageError } = await admin.storage
    .from('regulatory-documents')
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (storageError) {
    return Response.json(
      { error: `Storage upload failed: ${storageError.message}` },
      { status: 500 }
    )
  }

  // Create DB record (via regular client so RLS INSERT policy is applied)
  const { data: document, error: dbError } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      ingredient_id: ingredientId,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      document_type: documentType,
      description,
    })
    .select()
    .single()

  if (dbError) {
    // Roll back storage upload to avoid orphaned files
    await admin.storage.from('regulatory-documents').remove([filePath])
    return Response.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
  }

  return Response.json({ document }, { status: 201 })
}
