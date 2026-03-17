import { Client } from 'minio';

// Initialize MinIO client
const getMinioClient = () => {
  if (!process.env.MINIO_ENDPOINT) {
    console.warn('MINIO_ENDPOINT not set - file storage will be mocked');
    return null;
  }

  // Parse endpoint to handle URLs with protocol
  let endpoint = process.env.MINIO_ENDPOINT;
  let useSSL = process.env.MINIO_USE_SSL === 'true';

  // Remove protocol if present
  if (endpoint.startsWith('https://')) {
    endpoint = endpoint.replace('https://', '');
    useSSL = true;
  } else if (endpoint.startsWith('http://')) {
    endpoint = endpoint.replace('http://', '');
    useSSL = false;
  }

  // Remove trailing slash
  endpoint = endpoint.replace(/\/$/, '');

  // For HTTPS URLs, don't specify port - let MinIO client use default 443
  // For custom ports, set MINIO_PORT in env
  const port = process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT) : (useSSL ? 443 : 9000);

  console.log('Initializing MinIO client:', { endpoint, port, useSSL });

  return new Client({
    endPoint: endpoint,
    port: port,
    useSSL: useSSL,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    pathStyle: true, // Use path-style URLs (bucket.endpoint.com/bucket/file instead of bucket.endpoint.com/file)
  });
};

let minioClient: Client | null = null;

const getClient = () => {
  if (!minioClient) {
    minioClient = getMinioClient();
  }
  return minioClient;
};

/**
 * Upload a file buffer to MinIO storage
 * @param bucket - Bucket name (e.g., 'audioSentences', 'images')
 * @param buffer - File buffer
 * @param filename - File name
 * @param contentType - MIME type
 * @returns Public URL of the uploaded file
 */
export const uploadFile = async (
  bucket: string,
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> => {
  const client = getClient();

  if (!client) {
    // Mock mode - return a fake URL
    console.log(`[STORAGE MOCK] Upload: ${bucket}/${filename} (${contentType})`);
    return `https://storage.mujam.com/${bucket}/${filename}`;
  }

  // Use bucket from env or fallback to parameter
  const bucketName = process.env.MINIO_BUCKET || bucket;

  try {
    // Ensure bucket exists
    const bucketExists = await client.bucketExists(bucketName);
    if (!bucketExists) {
      console.log(`Creating bucket: ${bucketName}`);
      await client.makeBucket(bucketName, 'us-east-1');
      
      // Set bucket policy to public read
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      await client.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log(`Bucket ${bucketName} created with public read policy`);
    }

    // Upload file
    console.log(`Uploading file to ${bucketName}/${filename}`);
    await client.putObject(bucketName, filename, buffer, buffer.length, {
      'Content-Type': contentType,
    });

    // Generate public URL
    let endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const useSSL = process.env.MINIO_USE_SSL === 'true';
    const protocol = useSSL ? 'https' : 'http';
    
    // Remove protocol if present in endpoint
    endpoint = endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Build URL - for standard ports (80/443), don't include port in URL
    const port = parseInt(process.env.MINIO_PORT || (useSSL ? '443' : '80'));
    const portPart = (port === 443 && useSSL) || (port === 80 && !useSSL) ? '' : `:${port}`;
    
    const fileUrl = `${protocol}://${endpoint}${portPart}/${bucketName}/${filename}`;
    console.log(`File uploaded successfully: ${fileUrl}`);
    
    return fileUrl;
  } catch (error) {
    console.error('MinIO upload error:', error);
    throw new Error(`Failed to upload file to storage: ${error}`);
  }
};

/**
 * Delete a file from MinIO storage
 * @param fileUrl - Full URL of the file to delete
 */
export const deleteFile = async (fileUrl: string): Promise<void> => {
  const client = getClient();

  if (!client) {
    console.log(`[STORAGE MOCK] Delete: ${fileUrl}`);
    return;
  }

  try {
    // Extract bucket and filename from URL
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const bucket = pathParts[0];
    const filename = pathParts.slice(1).join('/');

    await client.removeObject(bucket, filename);
  } catch (error) {
    console.error('MinIO delete error:', error);
    throw new Error('Failed to delete file from storage');
  }
};

/**
 * Get a presigned URL for temporary access to a file
 * @param bucket - Bucket name
 * @param filename - File name
 * @param expirySeconds - URL expiry time in seconds (default: 3600 = 1 hour)
 * @returns Presigned URL
 */
export const getPresignedUrl = async (
  bucket: string,
  filename: string,
  expirySeconds: number = 3600
): Promise<string> => {
  const client = getClient();

  if (!client) {
    console.log(`[STORAGE MOCK] Presigned URL: ${bucket}/${filename}`);
    return `https://storage.mujam.com/${bucket}/${filename}?expires=${expirySeconds}`;
  }

  try {
    return await client.presignedGetObject(bucket, filename, expirySeconds);
  } catch (error) {
    console.error('MinIO presigned URL error:', error);
    throw new Error('Failed to generate presigned URL');
  }
};
