/**
 * Generates WebP width variants for existing R2 images:
 *   variants/400/<key>.webp, variants/800/<key>.webp, variants/1200/<key>.webp
 *
 * The cf-image-worker serves these when ?w=<width> is requested and falls back
 * to the original otherwise, so this is safe to re-run and safe to roll back
 * (delete the variants/ prefix to restore old behaviour).
 *
 * - Dry run by default (DRY_RUN=true): only lists what it would convert.
 * - Idempotent: skips keys that already have the variants.
 * - Never modifies or deletes originals.
 *
 * Env (.env at ../../.env — or export the vars):
 *   S3_ENDPOINT            e.g. https://<ACCOUNT_ID>.r2.cloudflarestorage.com
 *   S3_ACCESS_KEY_ID       R2 API token (read + write on the bucket)
 *   S3_SECRET_ACCESS_KEY   R2 API token secret
 *   S3_BUCKET              default "my-images" (the IMG_CACHE bucket)
 *   VARIANT_PREFIX         default "musefactory/" — folder to process
 *   VARIANT_QUALITY        default 80
 *   DRY_RUN                "false" to actually write
 *
 * Run:  npx ts-node scripts/generate-variants.ts
 */
import { ListObjectsV2Command, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { s3 } from '../lib/s3'
import { optimizeImage } from '../lib/optimizer'
import fs from 'node:fs'
import path from 'node:path'

const BUCKET = process.env.S3_BUCKET || 'my-images'
const PREFIX = process.env.VARIANT_PREFIX || 'musefactory/'
const WIDTHS = [400, 800, 1200]
const QUALITY = Number(process.env.VARIANT_QUALITY || 80)
const DRY_RUN = (process.env.DRY_RUN ?? 'true') !== 'false'
const CONCURRENCY = 3
const LOG_FILE = path.resolve(__dirname, '..', '..', 'variant-migration-log.json')

const IMAGE_RE = /\.(jpe?g|png|webp)$/i
const variantKey = (w: number, key: string) => `variants/${w}/${key}.webp`

async function exists(Key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key }))
    return true
  } catch {
    return false
  }
}

async function generate(key: string, log: Array<Record<string, unknown>>): Promise<void> {
  const missing: number[] = []
  for (const w of WIDTHS) {
    if (!(await exists(variantKey(w, key)))) missing.push(w)
  }
  if (missing.length === 0) {
    log.push({ key, status: 'skipped' })
    return
  }
  if (DRY_RUN) {
    log.push({ key, status: 'would-convert', widths: missing })
    return
  }

  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const input = Buffer.from(await obj.Body!.transformToByteArray())
  for (const w of missing) {
    const { data } = await optimizeImage(input, { format: 'webp', quality: QUALITY, width: w })
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: variantKey(w, key),
        Body: data,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )
    log.push({ key, width: w, before: input.length, after: data.length, status: 'done' })
  }
}

async function main(): Promise<void> {
  const log: Array<Record<string, unknown>> = []
  const queue: string[] = []
  let token: string | undefined

  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX, ContinuationToken: token })
    )
    for (const o of page.Contents ?? []) {
      if (o.Key && IMAGE_RE.test(o.Key)) queue.push(o.Key)
    }
    token = page.NextContinuationToken
  } while (token)

  console.log(`Found ${queue.length} image objects under "${PREFIX}". Dry run: ${DRY_RUN}`)
  if (queue.length === 0) return

  let cursor = 0
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (cursor < queue.length) {
      const key = queue[cursor++]
      try {
        await generate(key, log)
      } catch (err: any) {
        log.push({ key, status: 'error', msg: String(err?.message ?? err) })
      }
    }
  })
  await Promise.all(workers)

  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2))
  const done = log.filter((l) => l.status === 'done').length
  console.log(`Entries: ${log.length}, converted: ${done}. Log: ${LOG_FILE}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})