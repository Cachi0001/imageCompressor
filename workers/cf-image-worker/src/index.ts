export interface Env {
  IMG_CACHE?: R2Bucket
  ALLOWED_HOSTS?: string
  DEFAULT_QUALITY?: string
  DEFAULT_FORMAT?: string
  USE_R2_CACHE?: string
  MAX_WIDTH?: string
  MAX_HEIGHT?: string
  ACCOUNT_ID?: string
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max)
}

function parseList(v?: string): Set<string> {
  if (!v) return new Set()
  return new Set(
    v
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean),
  )
}

function normalizeUrl(u: string): URL | null {
  try {
    const url = new URL(u)
    return url
  } catch {
    return null
  }
}

function cacheKey(url: URL, params: Record<string, string | number | undefined>) {
  const parts = [
    url.toString(),
    `fmt=${params.format ?? ''}`,
    `q=${params.quality ?? ''}`,
    `w=${params.width ?? ''}`,
    `h=${params.height ?? ''}`,
    `fit=${params.fit ?? ''}`,
  ]
  return parts.join('&')
}

function makeHeaders(contentType: string | null, ttlSeconds: number) {
  const h = new Headers()
  if (contentType) h.set('Content-Type', contentType)
  h.set('Cache-Control', `public, max-age=${ttlSeconds}`)
  h.set('Access-Control-Allow-Origin', '*')
  h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  h.set('Access-Control-Allow-Headers', '*')
  h.set('Timing-Allow-Origin', '*')
  return h
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: makeHeaders(null, 0)
        });
    }

    const url = new URL(req.url)

    // === Upload Endpoint (Direct to R2) ===
    if (req.method === 'POST' && url.pathname === '/upload') {
      if (!env.IMG_CACHE) {
        return new Response('R2 binding IMG_CACHE not set', { status: 500, headers: makeHeaders('text/plain', 0) })
      }

      try {
        const formData = await req.formData()
        const file = formData.get('image') as File | null
        const clientId = (formData.get('client') as string) || 'default'

        if (!file) {
          return new Response('No image file provided', { status: 400, headers: makeHeaders('text/plain', 0) })
        }

        // Streaming Upload: Pass stream directly to R2
        // Generate simple unique key
        const ext = file.name.split('.').pop() || 'bin'
        const randomId = crypto.randomUUID().split('-')[0]
        const key = `${clientId}/${Date.now()}-${randomId}.${ext}`

        // Save original file to R2 (Stream)
        await env.IMG_CACHE.put(key, file.stream(), {
          httpMetadata: { contentType: file.type }
        })

        // Return the Public Worker URL for this file
        return new Response(JSON.stringify({
          key: key,
          url: `${url.origin}/image?r2key=${encodeURIComponent(key)}`
        }), {
          headers: makeHeaders('application/json', 0)
        })

      } catch (err: any) {
        return new Response(`Upload failed: ${err.message}`, { status: 500, headers: makeHeaders('text/plain', 0) })
      }
    }

    // === Delete Endpoint ===
    if (req.method === 'DELETE' && url.pathname === '/delete') {
      if (!env.IMG_CACHE) {
        return new Response('R2 binding IMG_CACHE not set', { status: 500, headers: makeHeaders('text/plain', 0) })
      }

      try {
        const body: any = await req.json()
        const key = body.key as string

        if (!key) {
          return new Response('Missing "key" in body', { status: 400, headers: makeHeaders('text/plain', 0) })
        }

        // Delete from R2
        await env.IMG_CACHE.delete(key)

        return new Response(JSON.stringify({ success: true, deleted: key }), {
          headers: makeHeaders('application/json', 0)
        })
      } catch (err: any) {
        return new Response(`Delete failed: ${err.message}`, { status: 500, headers: makeHeaders('text/plain', 0) })
      }
    }

    if (url.pathname !== '/' && url.pathname !== '/image') {
      return new Response('Not Found', { status: 404, headers: makeHeaders('text/plain', 0) })
    }

    const r2key = url.searchParams.get('r2key')
    const src = url.searchParams.get('url') ?? ''

    // Resolve Source: URL or R2 Key
    let sourceUrlString = src;
    let r2ObjectBody: ReadableStream | null = null;
    let r2ContentType = 'image/jpeg';

    if (r2key && env.IMG_CACHE) {
        // Fetch from R2 directly (internal)
        const obj = await env.IMG_CACHE.get(r2key);
        if (!obj) return new Response('R2 Object Not Found', { status: 404 });
        r2ObjectBody = obj.body;
        r2ContentType = obj.httpMetadata?.contentType || 'image/jpeg';
        // We can't easily pass a stream to 'fetch' for image resizing service (it needs a URL).
        // However, we can return the raw image if no resize params are present.
        // Or, to resize R2 objects without public URLs, we need to serve it on a temp route or use a worker-to-worker fetch.
        // For simplicity: We will assume R2 has a public domain OR we serve raw if not public.
        
        // Actually, Cloudflare Image Resizing supports `fetch(request)` where request body is the image.
        // But that's for POST.
        // Let's stick to the URL method for now to be safe with the current code structure.
        // We will assume the user provides a full URL for 'src'.
    }

    // Standard Image Resizing Logic
    const format = (url.searchParams.get('format') ?? env.DEFAULT_FORMAT ?? 'webp').toLowerCase()
    const quality = clamp(
      Number(url.searchParams.get('quality') ?? env.DEFAULT_QUALITY ?? 75) || 75,
      30,
      95,
    )
    const fit = (url.searchParams.get('fit') ?? 'cover') as 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'

    const maxW = clamp(Number(env.MAX_WIDTH ?? 4096) || 4096, 64, 8192)
    const maxH = clamp(Number(env.MAX_HEIGHT ?? 4096) || 4096, 64, 8192)
    const width = clamp(Number(url.searchParams.get('width') || 0) || 0, 0, maxW) || undefined
    const height = clamp(Number(url.searchParams.get('height') || 0) || 0, 0, maxH) || undefined

    const allowedHosts = parseList(env.ALLOWED_HOSTS)
    
    // If using R2 Key, we need a way to resize it. 
    // If we can't resize R2 streams easily without public URLs, let's just serve it raw if requested, or require public URL.
    if (r2key && env.IMG_CACHE) {
         const obj = await env.IMG_CACHE.get(r2key);
         if (!obj) return new Response('Not Found', { status: 404 });
         // If no resize needed, return raw
         if (!width && !height && format === 'webp') { // defaults
             return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg' }})
         }
         // If resize needed, we need a URL. 
         // Strategy: We can't resize private R2 objects easily in this specific setup without a public URL.
         // FALLBACK: Return raw for now.
         return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg' }})
    }

    const sourceUrl = normalizeUrl(src)
    if (!sourceUrl) {
      return new Response('Invalid source URL', { status: 400 })
    }
    if (allowedHosts.size > 0 && !allowedHosts.has(sourceUrl.hostname.toLowerCase())) {
      return new Response('Source host not allowed', { status: 403 })
    }

    const key = cacheKey(sourceUrl, { format, quality, width, height, fit })
    const cache = caches.default
    const cached = await cache.match(key)
    if (cached) {
      return cached
    }

    // Optional persistent cache in R2 (READ)
    const useR2 = (env.USE_R2_CACHE ?? '').toLowerCase() === '1'
    if (useR2 && env.IMG_CACHE) {
      const obj = await env.IMG_CACHE.get(key)
      if (obj) {
        const headers = makeHeaders(obj.httpMetadata?.contentType ?? 'image/*', 60 * 60 * 24 * 7)
        return new Response(obj.body, { headers })
      }
    }

    // Fetch and compress via Cloudflare Image Resizing
    const abort = new AbortController()
    const timeoutMs = 15000
    const id = setTimeout(() => abort.abort(), timeoutMs)
    try {
      const cfOptions: ImageTransformOptions = {
        format: (['webp', 'avif', 'jpeg', 'png'] as const).includes(format as any) ? (format as any) : 'webp',
        quality,
        fit,
      }
      if (width) cfOptions.width = width
      if (height) cfOptions.height = height

      const transformed = await fetch(sourceUrl.toString(), {
        signal: abort.signal,
        // @ts-ignore - cf property is available in Workers runtime
        cf: { image: cfOptions },
      })

      if (!transformed.ok) {
        // Forward the upstream error details for debugging
        const errText = await transformed.text()
        return new Response(`Upstream error: ${transformed.status} - ${errText.slice(0, 100)}`, { status: 502 })
      }

      // Clone for edge cache
      const contentType = transformed.headers.get('Content-Type')
      const resp = new Response(transformed.body, {
        headers: makeHeaders(contentType, 60 * 60 * 24 * 7),
      })
      ctx.waitUntil(cache.put(key, resp.clone()))

      // Persist to R2 if enabled
      if (useR2 && env.IMG_CACHE) {
        const putHeaders: R2HTTPMetadata = { contentType: contentType ?? 'image/*' }
        ctx.waitUntil(env.IMG_CACHE.put(key, resp.clone().body as ReadableStream, { httpMetadata: putHeaders }))
      }

      return resp
    } catch (err: any) {
      const isAbort = err && (err.name === 'AbortError' || err.message?.includes('aborted'))
      const status = isAbort ? 504 : 500
      return new Response(isAbort ? 'Timeout fetching source image' : 'Image processing error', { status })
    } finally {
      clearTimeout(id)
    }
  },
}

type ImageFormat = 'avif' | 'webp' | 'jpeg' | 'png'
type Fit = 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'
interface ImageTransformOptions {
  width?: number
  height?: number
  format?: ImageFormat
  quality?: number
  fit?: Fit
}
