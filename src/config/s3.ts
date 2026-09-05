import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadBucketCommand,
    HeadObjectCommand,
    CreateBucketCommand,
    PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
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

/** Anonymous read so browser <img src="…"> works (MinIO default is private). */
function publicReadBucketPolicy(bucket: string): string {
    return JSON.stringify({
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${bucket}/*`],
            },
        ],
    });
}

let ensurePublicReadPromise: Promise<void> | null = null;

async function ensureBucketExistsAndPublicRead(): Promise<void> {
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    } catch {
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
    }
    await s3Client.send(
        new PutBucketPolicyCommand({
            Bucket: bucketName,
            Policy: publicReadBucketPolicy(bucketName),
        })
    );
}

function ensurePublicReadOnce(): Promise<void> {
    if (!ensurePublicReadPromise) {
        ensurePublicReadPromise = ensureBucketExistsAndPublicRead().catch((err) => {
            ensurePublicReadPromise = null;
            throw err;
        });
    }
    return ensurePublicReadPromise;
}

export const uploadFile = async (
    file: Buffer,
    folder: string,
    contentType: string
): Promise<{ url: string; key: string }> => {
    await ensurePublicReadOnce();

    const extension = contentType.split('/')[1] || 'bin';
    const fileName = `${uuidv4()}.${extension}`;
    const key = `${folder}/${fileName}`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: file,
            ContentType: contentType,
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

/** Public URL for an object key (same shape uploadFile returns). */
export const publicUrlForKey = (key: string): string => {
    let endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
    if (endpoint.endsWith('/')) {
        endpoint = endpoint.slice(0, -1);
    }
    return `${endpoint}/${bucketName}/${key}`;
};

export const objectExists = async (key: string): Promise<boolean> => {
    try {
        await s3Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
        return true;
    } catch {
        return false;
    }
};

/**
 * Upload at a caller-chosen key (uploadFile generates a uuid name instead).
 * Deterministic keys make regeneration idempotent — re-running kids TTS
 * overwrites the same object rather than orphaning copies.
 */
export const uploadFileAtKey = async (
    file: Buffer,
    key: string,
    contentType: string
): Promise<{ url: string; key: string }> => {
    await ensurePublicReadOnce();

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: file,
            ContentType: contentType,
        })
    );

    return { url: publicUrlForKey(key), key };
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
