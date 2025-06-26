"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    uploadFile(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = `podcasts/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            });
            yield this.s3Client.send(command);
            return {
                url: `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
                key,
            };
        });
    }
    /**
     * Get a signed URL for streaming
     * @param key S3 object key
     * @param expiresIn URL expiration time in seconds
     */
    getSignedUrl(key_1) {
        return __awaiter(this, arguments, void 0, function* (key, expiresIn = 3600) {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            return (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn });
        });
    }
    /**
     * Delete a file from S3
     * @param key S3 object key
     */
    deleteFile(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            yield this.s3Client.send(command);
        });
    }
    /**
     * Stream a file from S3
     * @param key S3 object key
     */
    createReadStream(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            const response = yield this.s3Client.send(command);
            return response.Body;
        });
    }
}
exports.S3Service = S3Service;
