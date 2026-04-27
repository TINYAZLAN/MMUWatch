import { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { filename, contentType } = req.body;
  if (!filename || !contentType) {
    return res.status(400).json({ error: 'Filename and contentType are required' });
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = req.body.cloudflareConfig?.accessKeyId || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = req.body.cloudflareConfig?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || 'video';
  const s3ApiEndpoint = process.env.S3_API || `https://${accountId}.r2.cloudflarestorage.com`;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return res.status(500).json({ error: 'R2 environment variables not configured' });
  }

  let endpointUrl = s3ApiEndpoint;
  try {
    const parsedURL = new URL(s3ApiEndpoint);
    endpointUrl = parsedURL.origin;
  } catch(e) {}

  const S3 = new S3Client({
    region: 'auto',
    endpoint: endpointUrl,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  const key = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
  
  if (!process.env.R2_PUBLIC_DOMAIN) {
    return res.status(500).json({ error: 'R2_PUBLIC_DOMAIN is not configured' });
  }
  const publicDomain = process.env.R2_PUBLIC_DOMAIN;
  const publicUrl = `${publicDomain.replace(/\/$/, '')}/${key}`;

  return res.json({ signedUrl, publicUrl, key });
}
