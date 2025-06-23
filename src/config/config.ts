export const config = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiry: process.env.JWT_EXPIRY || '1h',
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    s3: {
      bucket: process.env.AWS_S3_BUCKET || 'your-bucket-name'
    }
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || 'your-paystack-secret-key',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || 'your-paystack-public-key'
  }
};
