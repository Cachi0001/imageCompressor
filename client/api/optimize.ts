import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { optimizeImage } from '../lib/optimizer';
import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { s3, BUCKET, PUBLIC_URL } from '../lib/s3';
import * as crypto from 'crypto';

// Valid Client IDs (In a real app, use a database)
const VALID_CLIENTS = ['musefactory', 'client-a', 'client-b'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  // 2. Input Validation & Authorization
  const { url, w, q, f, client } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).send('Missing url parameter');
  }

  // Namespace Isolation
  const clientId = (typeof client === 'string' && VALID_CLIENTS.includes(client)) ? client : 'default';
  
  // Validate URL (Prevent SSRF to internal network)
  try {
    const parsedUrl = new URL(url);
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedUrl.hostname)) {
       return res.status(400).send('Invalid URL source');
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return res.status(400).send('Invalid protocol');
    }
  } catch (e) {
      return res.status(400).send('Invalid URL format');
  }

  // 3. Generate Cache Key with Namespace
  const width = w ? parseInt(w as string) : undefined;
  const quality = q ? parseInt(q as string) : 80;
  const format = (f as string) || 'webp';
  
  // Include clientId in hash to isolate caches if needed, or share. 
  // Ideally, same image + same settings = same hash to save storage.
  // But we store in `clientId/hash` to isolate storage.
  const keyString = `${url}-${width}-${quality}-${format}`;
  const hash = crypto.createHash('md5').update(keyString).digest('hex');
  const key = `${clientId}/${hash}.${format}`;

  try {
    // 4. Check S3 Cache
    try {
        await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
        
        // Exists! Redirect.
        // For R2, we might want to return the public URL if configured
        let redirectUrl = '';
        if (PUBLIC_URL) {
            redirectUrl = `${PUBLIC_URL}/${key}`;
        } else {
            console.warn('[Warning] S3_PUBLIC_URL is not set. Redirecting to a constructed URL that may not work for R2.');
            redirectUrl = `https://${BUCKET}.s3.${process.env.S3_REGION || 'auto'}.amazonaws.com/${key}`;
        }
        
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.redirect(301, redirectUrl);
    } catch (e) {
        // Not found, proceed to optimize
    }

    // 5. Fetch Original Image
    const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        maxContentLength: 50 * 1024 * 1024, // Limit input to 50MB to prevent DoS
        timeout: 8000 // 8s timeout to allow time for processing within 10s function limit
    });
    
    const buffer = Buffer.from(response.data);

    // 6. Optimize
    const { data, info } = await optimizeImage(buffer, { 
        width, 
        quality, 
        format: format as any 
    });

    // 7. Upload to S3
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: data,
        ContentType: `image/${format}`,
        // ACL: 'public-read' // R2 doesn't always support ACLs, bucket policy is better
    }));

    // 8. Log Metrics (Async, don't block response)
    // In production, push to a queue or metrics service
    console.log(`[${clientId}] Optimized: ${url} -> ${key} (${info.size} bytes)`);

    // 9. Serve Response
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', `image/${format}`);
    return res.send(data);

  } catch (error) {
    console.error('Optimization error:', error);
    // Return detailed error for debugging (remove in prod if sensitive)
    return res.status(500).send(`Error processing image: ${(error as Error).message}`);
  }
}
