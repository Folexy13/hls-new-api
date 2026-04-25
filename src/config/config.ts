import 'dotenv/config';

export const config = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
  jwtExpiry: process.env.JWT_EXPIRY || '1h',
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:7000',
  whatsapp: {
    provider: process.env.WHATSAPP_PROVIDER || 'twilio',
    apiUrl: process.env.WHATSAPP_API_URL || '',
    apiKey: process.env.WHATSAPP_API_KEY || '',
    accountSid: process.env.WHATSAPP_ACCOUNT_SID || '',
    senderPhone: process.env.WHATSAPP_SENDER_PHONE || '',
  },
  email: {
    provider: process.env.EMAIL_PROVIDER || '',
    apiUrl: process.env.EMAIL_API_URL || '',
    apiKey: process.env.EMAIL_API_KEY || '',
    from: process.env.EMAIL_FROM || 'no-reply@hlsnigeria.com',
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    s3: {
      bucket: process.env.AWS_S3_BUCKET || 'your-bucket-name'
    }
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || 'your-paystack-secret-key',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || 'your-paystack-public-key'
  }
};
