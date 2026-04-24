import express from "express";
import path from "path";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "MMU Tube Server is running" });
  });

  app.post("/api/signed-url", async (req, res) => {
    try {
      const { filename, contentType } = req.body;

      if (!filename || !contentType) {
        return res.status(400).json({ error: "Filename and contentType are required" });
      }

      const accountId = "bd0262d2d19a6073af4681161582d9dc";
      const bucketName = "video";
      const accessKeyId = req.body.cloudflareConfig?.accessKeyId || process.env.R2_ACCESS_KEY_ID;
      const secretAccessKey = req.body.cloudflareConfig?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY;
      const publicDomain = "/api/video";

      if (!accessKeyId || !secretAccessKey) {
        return res.status(500).json({ error: "Cloudflare R2 is not fully configured on the server. Please add R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY to your environment variables." });
      }

      const S3 = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      // Generate a unique object key
      const key = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
      });

      const signedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
      
      // Calculate the final public URL where the video/image will be accessible
      const publicUrl = `${publicDomain.replace(/\/$/, '')}/${key}`;

      res.json({ signedUrl, publicUrl, key });
    } catch (error) {
      console.error("Error generating signed URL:", error);
      res.status(500).json({ error: "Internal server error generating signed URL" });
    }
  });

  app.get("/api/video/:key", async (req, res) => {
    try {
      const { key } = req.params;
      
      const accountId = "bd0262d2d19a6073af4681161582d9dc";
      const bucketName = "video";
      const accessKeyId = process.env.R2_ACCESS_KEY_ID;
      const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

      if (!accessKeyId || !secretAccessKey) {
        return res.status(500).send("Cloudflare R2 is not fully configured on the server.");
      }

      const S3 = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
      res.redirect(302, signedUrl);
    } catch (error) {
      console.error("Error generating playback URL:", error);
      res.status(500).send("Internal server error playing video");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
