# How to Get S3 Credentials

You need an object storage provider to store your images. You can use **AWS S3** (Standard) or **Cloudflare R2** (Faster/Cheaper, S3 Compatible).

## Option A: AWS S3 (Standard)

### 1. Get Access Keys (Credentials)
1.  Log in to the **AWS Console**.
2.  Search for **IAM** (Identity and Access Management).
3.  Go to **Users** > **Create user**.
    *   Name: `image-service-user`
4.  Click **Next**.
5.  **Permissions options**: Select "Attach policies directly".
6.  Search for `AmazonS3FullAccess` and select it. (For production, you should create a more restrictive policy, but this works for setup).
7.  Create the user.
8.  Click on the newly created user name.
9.  Go to the **Security credentials** tab.
10. Scroll down to **Access keys** and click **Create access key**.
11. Select **Application running outside AWS**.
12. Copy the **Access key** and **Secret access key**.
    *   `S3_ACCESS_KEY_ID` = Access key
    *   `S3_SECRET_ACCESS_KEY` = Secret access key

### 2. Create Bucket
1.  Search for **S3** in AWS Console.
2.  Click **Create bucket**.
3.  Name: e.g., `my-image-service-bucket` (Must be unique globally).
4.  Region: Choose one close to your users (e.g., `us-east-1`).
    *   `S3_BUCKET` = `my-image-service-bucket`
    *   `S3_REGION` = `us-east-1`
5.  **Object Ownership**: ACLs enabled (optional, but makes public access easier for simple setups) or keep default.
6.  **Block Public Access settings**: Uncheck "Block all public access" if you want images to be viewable by the public directly. Acknowledge the warning.
7.  Create Bucket.

---

## Option B: Cloudflare R2 (Recommended for Speed/Cost)
*No egress fees, often faster.*

### Pricing (as of 2024/2025)
*   **Storage**: $0.015 / GB-month (First 10GB/month Free)
*   **Data Transfer (Egress)**: **$0 (Free)** (This is the big saver compared to AWS)
*   **Class A Operations (Writes)**: $4.50 / million (First 1M/month Free)
*   **Class B Operations (Reads)**: $0.36 / million (First 10M/month Free)

1.  Log in to **Cloudflare Dashboard**.
2.  Go to **R2** from the sidebar.
3.  **Create Bucket**:
    *   Name: `my-images`
    *   `S3_BUCKET` = `my-images`
4.  **Get Credentials**:
    *   On the R2 overview page, click **Manage R2 API Tokens**.
    *   Click **Create API Token**.
    *   Permissions: **Admin Read & Write**.
    *   Create.
    *   Copy:
        *   `S3_ACCESS_KEY_ID` = Access Key ID
        *   `S3_SECRET_ACCESS_KEY` = Secret Access Key
        *   `S3_ENDPOINT` = The URL provided (e.g., `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`)
5.  **Region**: R2 handles regions automatically, but you can set `S3_REGION` to `auto` or `us-east-1` in your `.env`.

---

## Summary for .env

**AWS Example:**
```env
S3_BUCKET=my-website-images
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Cloudflare R2 Example:**
```env
S3_BUCKET=my-website-images
S3_REGION=auto
S3_ACCESS_KEY_ID=234897234...
S3_SECRET_ACCESS_KEY=234234...
S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
```
