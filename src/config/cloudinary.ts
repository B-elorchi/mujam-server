import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export const uploadToCloudinary = async (
  file: string | Buffer,
  folder: string,
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: resourceType,
    };

    if (typeof file === 'string') {
      cloudinary.uploader.upload(file, uploadOptions, (error, result) => {
        if (error) reject(error);
        else if (result) resolve({ url: result.secure_url, publicId: result.public_id });
        else reject(new Error('Upload failed'));
      });
    } else {
      cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) reject(error);
        else if (result) resolve({ url: result.secure_url, publicId: result.public_id });
        else reject(new Error('Upload failed'));
      }).end(file);
    }
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};