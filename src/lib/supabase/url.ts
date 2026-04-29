export function getSupabaseUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!rawUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
  }

  const parsedUrl = new URL(rawUrl)

  // Accept malformed values copied from REST API settings like
  // https://<project>.supabase.co/rest/v1 and normalize to project URL.
  parsedUrl.pathname = ''
  parsedUrl.search = ''
  parsedUrl.hash = ''

  return parsedUrl.toString().replace(/\/$/, '')
}
