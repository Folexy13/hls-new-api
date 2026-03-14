import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';
import { config } from '../config/config';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
}

export class CloudinaryService {
  /**
   * Upload a file buffer to Cloudinary
   * @param file Express.Multer.File object
   * @param folder Folder name in Cloudinary
   * @returns Upload result with URL and public ID
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'supplements'
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
            });
          } else {
            reject(new Error('Cloudinary upload failed: No result returned'));
          }
        }
      );

      // Convert buffer to stream and pipe to upload
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });
  }

  /**
   * Upload a base64 encoded image to Cloudinary
   * @param base64Data Base64 encoded image data (with or without data URI prefix)
   * @param folder Folder name in Cloudinary
   * @returns Upload result with URL and public ID
   */
  async uploadBase64(
    base64Data: string,
    folder: string = 'supplements'
  ): Promise<CloudinaryUploadResult> {
    try {
      // Ensure the base64 string has the proper data URI format
      const dataUri = base64Data.startsWith('data:')
        ? base64Data
        : `data:image/jpeg;base64,${base64Data}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: 'auto',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a file from Cloudinary
   * @param publicId The public ID of the file to delete
   */
  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new Error(`Cloudinary delete failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate an optimized URL for an image
   * @param publicId The public ID of the image
   * @param options Transformation options
   */
  getOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
    } = {}
  ): string {
    return cloudinary.url(publicId, {
      secure: true,
      transformation: [
        {
          width: options.width || 400,
          height: options.height || 400,
          crop: options.crop || 'fill',
          quality: options.quality || 'auto:good',
          fetch_format: 'auto',
        },
      ],
    });
  }
}

// Export singleton instance
export const cloudinaryService = new CloudinaryService();
