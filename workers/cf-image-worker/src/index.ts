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

function normalizeR2Key(raw: string): string {
  let k = raw
  for (let i = 0; i < 2; i++) {
    try {
      const decoded = decodeURIComponent(k)
      if (decoded === k) break
      k = decoded
    } catch {
      break
    }
  }
  return k
}

function parseRangeHeader(rangeHeader: string | null): { offset: number; length?: number } | null {
  if (!rangeHeader) return null
  const m = /^bytes=(\d+)-(\d+)?$/.exec(rangeHeader.trim())
  if (!m) return null
  const start = Number(m[1])
  const end = m[2] ? Number(m[2]) : undefined
  if (!Number.isFinite(start) || start < 0) return null
  if (end !== undefined) {
    if (!Number.isFinite(end) || end < start) return null
    return { offset: start, length: end - start + 1 }
  }
  return { offset: start }
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
  h.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS')
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

    const streamFromR2 = async (keyRaw: string): Promise<Response> => {
      if (!env.IMG_CACHE) {
        return new Response('R2 binding IMG_CACHE not set', { status: 500, headers: makeHeaders('text/plain', 0) })
      }

      const key = normalizeR2Key(keyRaw)
      const range = parseRangeHeader(req.headers.get('Range'))
      const obj = await env.IMG_CACHE.get(key, range ? { range } : undefined)
      if (!obj) {
        return new Response('R2 Object Not Found', { status: 404, headers: makeHeaders('text/plain', 0) })
      }

      const contentType = obj.httpMetadata?.contentType || 'application/octet-stream'
      const headers = makeHeaders(contentType, 60 * 60 * 24 * 30)
      headers.set('Accept-Ranges', 'bytes')

      if (range && obj.size !== undefined) {
        const start = range.offset
        const end = range.length ? start + range.length - 1 : obj.size - 1
        headers.set('Content-Range', `bytes ${start}-${end}/${obj.size}`)
        if (range.length) headers.set('Content-Length', String(range.length))
        if (req.method === 'HEAD') return new Response(null, { status: 206, headers })
        return new Response(obj.body as ReadableStream, { status: 206, headers })
      }

      if (req.method === 'HEAD') return new Response(null, { headers })
      return new Response(obj.body as ReadableStream, { headers })
    }

    const putToR2 = async (keyRaw: string): Promise<Response> => {
      if (!env.IMG_CACHE) {
        return new Response('R2 binding IMG_CACHE not set', { status: 500, headers: makeHeaders('text/plain', 0) })
      }
      const key = normalizeR2Key(keyRaw)
      if (!req.body) {
        return new Response('Missing request body', { status: 400, headers: makeHeaders('text/plain', 0) })
      }
      const contentType = req.headers.get('Content-Type') || 'application/octet-stream'
      await env.IMG_CACHE.put(key, req.body, { httpMetadata: { contentType } })
      return new Response(
        JSON.stringify({
          key,
          url: `${url.origin}/image?r2key=${encodeURIComponent(key)}`,
        }),
        { headers: makeHeaders('application/json', 0) },
      )
    }

    // === Upload Endpoint (Direct to R2) ===
    if (req.method === 'POST' && url.pathname === '/upload') {
      if (!env.IMG_CACHE) {
        return new Response('R2 binding IMG_CACHE not set', { status: 500, headers: makeHeaders('text/plain', 0) })
      }

      try {
        const formData = await req.formData()
        // Allow 'file' or 'image' field
        const fileEntry = formData.get('file') || formData.get('image')
        const file = fileEntry as unknown as File | null
        const clientId = (formData.get('client') as string) || 'default'

        if (!file) {
          return new Response('No file provided', { status: 400, headers: makeHeaders('text/plain', 0) })
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

    // === Backward-compatible File Read Aliases ===
    // GET/HEAD /api/files/<encodedKey>  -> stream from R2
    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname.startsWith('/api/files/')) {
      const keyPart = url.pathname.slice('/api/files/'.length)
      return streamFromR2(keyPart)
    }

    // GET/HEAD /api/videos/<key> -> stream from R2 (supports either "videos/<key>" or raw key)
    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname.startsWith('/api/videos/')) {
      const keyPart = url.pathname.slice('/api/videos/'.length)
      const normalized = normalizeR2Key(keyPart)
      const key = normalized.includes('/') ? normalized : `videos/${normalized}`
      return streamFromR2(key)
    }

    // PUT /api/videos/<key> -> store raw bytes to R2 (streaming; supports 500MB+ reliably)
    if (req.method === 'PUT' && url.pathname.startsWith('/api/videos/')) {
      const keyPart = url.pathname.slice('/api/videos/'.length)
      const normalized = normalizeR2Key(keyPart)
      const key = normalized.includes('/') ? normalized : `videos/${normalized}`
      return putToR2(key)
    }

    // PUT /api/files/<key> -> store raw bytes to R2 (streaming)
    if (req.method === 'PUT' && url.pathname.startsWith('/api/files/')) {
      const keyPart = url.pathname.slice('/api/files/'.length)
      return putToR2(keyPart)
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

    if (r2key) {
      const key = normalizeR2Key(r2key)
      const resp = await streamFromR2(key)
      if (!resp.ok) return resp

      const ct = resp.headers.get('Content-Type') || ''
      if (ct.startsWith('video/')) return resp
      if (!width && !height && format === 'webp') return resp
      return resp
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
