import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const key = req.query.key as string;
  const accountId = process.env.R2_ACCOUNT_ID || "bd0262d2d19a6073af4681161582d9dc";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || 'video';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return res.status(500).send('R2 not configured');
  }

  const S3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  const signedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
  return res.redirect(302, signedUrl);
}
