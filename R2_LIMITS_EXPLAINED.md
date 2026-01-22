# Understanding Cloudflare R2 Limits (Simple Guide)

You asked: *"Am I getting 10GB worth of storage for 1GB or for one month?"*

**The Short Answer:**
You get **10 GB of free storage every single month**, forever. It is not a one-time allowance. It is a recurring monthly allowance.

---

## 1. How Storage Works (The 10GB Limit)

Think of it like renting a storage unit.
*   **The First 10 GB is Free:** Cloudflare lets you occupy 10 GB of space for free.
*   **Calculated Monthly:** They check how much space you used that month.

**Scenario A: You stay small**
*   **January:** You upload 5 GB of images. (Total: 5 GB) -> **Cost: $0**
*   **February:** You upload 3 GB more. (Total: 8 GB) -> **Cost: $0**
*   **March:** You upload 1 GB more. (Total: 9 GB) -> **Cost: $0**
*   **Result:** You have stored these images for 3 months and paid nothing.

**Scenario B: You grow big**
*   **April:** You upload 5 GB more. (Total: 14 GB)
*   **Limit:** 10 GB is free. You are 4 GB over the limit.
*   **Cost:** You pay for the extra 4 GB.
*   **Price:** $0.015 per GB.
*   **April Bill:** 4 * $0.015 = **$0.06 (6 cents)**.

---

## 2. How "Views" Work (Class B Operations)

Every time someone loads your website and sees an image, that counts as a "Read" (Class B Operation).

*   **Limit:** You get **10,000,000 (10 Million)** views for free **every month**.
*   **Reset:** This counter resets to zero at the start of next month.

**Example:**
*   If your website gets 100,000 visitors a month, and each visitor sees 20 images.
*   Total Views = 2,000,000.
*   **Result:** You are well within the 10 Million limit. **Cost: $0**.

---

## 3. How "Uploads" Work (Class A Operations)

Every time you upload an image or change one, it's a "Write" (Class A Operation).

*   **Limit:** You get **1,000,000 (1 Million)** uploads for free **every month**.
*   **Reset:** Resets monthly.

**Example:**
*   Unless you are Facebook or Instagram uploading millions of photos a day, you will likely never hit this limit.

---

## 4. The "Hidden" Cost of Others (Bandwidth)

This is the most important part.
*   **Cloudinary / AWS S3:** They charge you for "Bandwidth" (Data Transfer). If your image goes viral and 1 million people download a 1MB image, that's 1,000 GB of bandwidth. AWS would charge you ~$90.00 for this.
*   **Cloudflare R2:** **$0.00**. Bandwidth is free.

## Summary Table

| Feature | Monthly Free Allowance | Cost if you go over |
| :--- | :--- | :--- |
| **Storage** (Space) | **10 GB** | $0.015 per GB / month |
| **Bandwidth** (Traffic) | **UNLIMITED** | **$0.00 (Free)** |
| **Uploads** (Writes) | **1 Million** | $4.50 per million |
| **Views** (Reads) | **10 Million** | $0.36 per million |

**Verdict:**
For a standard SaaS or E-commerce site, you will likely pay **$0/month** for a long time. If you eventually store 100GB of images (which is a lot of compressed images!), your bill would only be about **$1.35/month**.
