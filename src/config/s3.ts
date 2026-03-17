import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    region: 'us-east-1', // MinIO doesn't strictly use regions, but the SDK requires one
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || '',
        secretAccessKey: process.env.MINIO_SECRET_KEY || '',
    },
    forcePathStyle: true, // Required for MinIO
});

const bucketName = process.env.MINIO_BUCKET || 'mujam';

export const uploadFile = async (
    file: Buffer,
    folder: string,
    contentType: string
): Promise<{ url: string; key: string }> => {
    const extension = contentType.split('/')[1] || 'bin';
    const fileName = `${uuidv4()}.${extension}`;
    const key = `${folder}/${fileName}`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: file,
            ContentType: contentType,
            // If the bucket is public, we don't need ACL, but we can set it if supported
            // ACL: 'public-read', 
        })
    );

    // Generate URL
    let endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
    if (endpoint.endsWith('/')) {
        endpoint = endpoint.slice(0, -1);
    }
    const url = `${endpoint}/${bucketName}/${key}`;

    return { url, key };
};

export const deleteFile = async (key: string): Promise<void> => {
    await s3Client.send(
        new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        })
    );
};

export default s3Client;
