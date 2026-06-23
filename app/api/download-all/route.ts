import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const portalId = searchParams.get('portalId')

  if (!portalId) {
    return NextResponse.json({ error: 'Missing portalId' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Get files for this portal
  const { data: files } = await supabase
    .from('files')
    .select('*')
    .eq('portal_id', portalId)

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files found' }, { status: 404 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  // Fetch all files and build a zip using streaming
  // We'll use the JSZip-compatible approach via ArrayBuffer
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  await Promise.all(
    files.map(async (file) => {
      const fileUrl = `${supabaseUrl}/storage/v1/object/public/deliverables/${file.file_path}`
      const response = await fetch(fileUrl)
      if (response.ok) {
        const buffer = await response.arrayBuffer()
        zip.file(file.name, buffer)
      }
    })
  )

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })

  return new Response(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="deliverables.zip"',
    },
  })
}
