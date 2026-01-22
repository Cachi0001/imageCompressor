import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
const AUTH_CODE = "0533";
const s3 = new S3Client({
    region: process.env.S3_REGION || 'auto',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
});
const BUCKET = process.env.S3_BUCKET || 'musefactory-images';
export default async function handler(req, res) {
    // Security: Check Authentication
    const authHeader = req.headers.authorization;
    const authCode = authHeader ? authHeader.replace('Bearer ', '') : req.query.code;
    if (authCode !== AUTH_CODE) {
        return res.status(401).json({ error: 'Unauthorized. Invalid Access Code.' });
    }
    // Basic Metrics Calculation (In a real app, use Redis/Database)
    // Here we scan S3 to estimate usage (Note: This is slow/expensive at scale, but works for monitoring small buckets)
    try {
        const listCommand = new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 1000 });
        const s3Response = await s3.send(listCommand);
        const objects = s3Response.Contents || [];
        const totalObjects = objects.length;
        const totalSize = objects.reduce((acc, obj) => acc + (obj.Size || 0), 0);
        // Group by Client (Namespace)
        const clientUsage = {};
        objects.forEach(obj => {
            const key = obj.Key || '';
            const client = key.split('/')[0] || 'unknown';
            if (!clientUsage[client]) {
                clientUsage[client] = { count: 0, size: 0 };
            }
            clientUsage[client].count++;
            clientUsage[client].size += (obj.Size || 0);
        });
        // Return HTML UI
        const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Image Service Monitoring</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f4f4f9; }
            .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
            h1 { color: #333; }
            .stat { font-size: 24px; font-weight: bold; color: #0070f3; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
            th { color: #666; font-size: 14px; text-transform: uppercase; }
            .badge { background: #e1f5fe; color: #0288d1; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .login-container { text-align: center; margin-top: 100px; }
            input { padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
            button { padding: 10px 20px; background: #0070f3; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
        </style>
    </head>
    <body>
        ${authCode !== AUTH_CODE ? `
            <div class="login-container">
                <h1>Restricted Access</h1>
                <p>Please enter access code to view monitoring dashboard.</p>
                <form method="GET">
                    <input type="password" name="code" placeholder="Access Code" required>
                    <button type="submit">Access</button>
                </form>
            </div>
        ` : `
            <h1>System Status: Operational 🟢</h1>
            
            <div class="card">
                <h2>Global Usage</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <div class="stat">${totalObjects}</div>
                        <div>Cached Images</div>
                    </div>
                    <div>
                        <div class="stat">${(totalSize / 1024 / 1024).toFixed(2)} MB</div>
                        <div>Total Storage Used</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h2>Client Usage (Namespaces)</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Client ID</th>
                            <th>Images</th>
                            <th>Storage</th>
                            <th>Est. Cost (R2)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(clientUsage).map(([client, usage]) => `
                        <tr>
                            <td><span class="badge">${client}</span></td>
                            <td>${usage.count}</td>
                            <td>${(usage.size / 1024 / 1024).toFixed(2)} MB</td>
                            <td>$0.00 (Free Tier)</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="card">
                <h2>System Health</h2>
                <ul>
                    <li><strong>Region:</strong> ${process.env.S3_REGION || 'auto'}</li>
                    <li><strong>Endpoint:</strong> ${process.env.S3_ENDPOINT ? 'Custom (R2)' : 'AWS Standard'}</li>
                    <li><strong>Public Access:</strong> ${process.env.S3_PUBLIC_URL ? 'Enabled' : 'Direct S3'}</li>
                </ul>
            </div>
        `}
    </body>
    </html>
    `;
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
    }
    catch (error) {
        console.error('Monitoring Error:', error);
        return res.status(500).send('Failed to retrieve system metrics');
    }
}
//# sourceMappingURL=monitor.js.map