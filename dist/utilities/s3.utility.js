"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
class S3Service {
    constructor() {
        this.bucket = process.env.AWS_S3_BUCKET || '';
        this.s3Client = new client_s3_1.S3Client({
            region: process.env.AWS_REGION || '',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        });
    }
    /**
     * Upload a file to S3
     * @param file File buffer and metadata
     * @returns Object URL and key
     */
    async uploadFile(file) {
        const key = `podcasts/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });
        await this.s3Client.send(command);
        return {
            url: `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
            key,
        };
    }
    /**
     * Get a signed URL for streaming
     * @param key S3 object key
     * @param expiresIn URL expiration time in seconds
     */
    async getSignedUrl(key, expiresIn = 3600) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        return (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn });
    }
    /**
     * Delete a file from S3
     * @param key S3 object key
     */
    async deleteFile(key) {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        await this.s3Client.send(command);
    }
    /**
     * Stream a file from S3
     * @param key S3 object key
     */
    async createReadStream(key) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        const response = await this.s3Client.send(command);
        return response.Body;
    }
}
exports.S3Service = S3Service;
//# sourceMappingURL=s3.utility.js.map