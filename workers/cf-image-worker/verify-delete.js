const https = require('https');

// 1. Upload a file first (to get a key to delete)
// We reuse the verify logic but focused on cleanup
const hostname = 'cf-image-worker.sabimage.workers.dev';
const boundary = '----WebKitFormBoundaryDeleteTest';

const uploadData = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="client"\r\n\r\n` +
    `test-delete\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="image"; filename="delete-me.txt"\r\n` +
    `Content-Type: text/plain\r\n\r\n` +
    `Delete me please\r\n` +
    `--${boundary}--`;

const uploadOptions = {
    hostname,
    path: '/upload',
    method: 'POST',
    headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(uploadData)
    }
};

console.log('--- STEP 1: UPLOADING ---');
const req = https.request(uploadOptions, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        if (res.statusCode === 200) {
            const json = JSON.parse(data);
            const key = json.key;
            console.log(`Uploaded Key: ${key}`);
            deleteFile(key);
        } else {
            console.error('Upload failed, cannot test delete');
        }
    });
});
req.write(uploadData);
req.end();

function deleteFile(key) {
    console.log('\n--- STEP 2: DELETING ---');
    const deleteData = JSON.stringify({ key });
    
    const deleteOptions = {
        hostname,
        path: '/delete',
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(deleteData)
        }
    };

    const req = https.request(deleteOptions, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            console.log(`DELETE STATUS: ${res.statusCode}`);
            console.log(`DELETE RESPONSE: ${data}`);
            
            if (res.statusCode === 200) {
                console.log('RESULT: ✅ DELETE SUCCESS');
                verifyGone(key);
            } else {
                console.log('RESULT: ❌ DELETE FAILED');
            }
        });
    });
    req.write(deleteData);
    req.end();
}

function verifyGone(key) {
    console.log('\n--- STEP 3: VERIFYING GONE ---');
    // Try to fetch it via the image endpoint
    const checkUrl = `https://${hostname}/image?r2key=${encodeURIComponent(key)}`;
    
    https.get(checkUrl, (res) => {
        console.log(`CHECK STATUS: ${res.statusCode}`);
        if (res.statusCode === 404) {
            console.log('RESULT: ✅ VERIFIED GONE (404 Not Found)');
        } else {
            console.log('RESULT: ⚠️ STILL EXISTS (Expected 404)');
        }
    });
}
