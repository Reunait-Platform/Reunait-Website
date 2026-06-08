import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { config } from '../config/config.js';
import { uploadToS3, getPresignedGetUrl } from './s3Service.js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Configure AWS Lambda client using config values
const lambdaClient = new LambdaClient({
    region: config.awsRegion,
    credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey
    }
});

// S3 client for deletion
const s3Client = new S3Client({
    region: config.awsRegion,
    credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey
    }
});


// Helper to delete from S3
const deleteFromS3 = async (key) => {
    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: config.awsTempImageBucket,
            Key: key
        }));
    } catch (error) {
        console.error('Error deleting from S3:', error);
    }
};

// Helper for simple retries with backoff
const retry = async (fn, retries = 2, delay = 300) => {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return retry(fn, retries - 1, delay);
    }
};

// Generate embeddings using AWS Lambda
const generateEmbeddings = async (image1, image2, doVerify = true, caseId = 'default', country = 'default') => {
    // image1, image2: { buffer, originalname, mimetype }
    // doVerify: boolean
    // caseId, country: for S3 path uniqueness
    let key1, key2;
    try {
        // Upload both images to S3 with retries (2 retries, 300ms delay) (uploadToS3 now generates keys with extensions)
        await retry(() => uploadToS3(image1, caseId, 1, country, config.awsTempImageBucket), 2, 300);
        await retry(() => uploadToS3(image2, caseId, 2, country, config.awsTempImageBucket), 2, 300);
        
        // Generate the correct keys (standardized to .jpg) to match what uploadToS3 creates
        const countryPath = country.replace(/\s+/g, '_').toLowerCase();
        key1 = `${countryPath}/${caseId}_1.jpg`;  // Standardized to JPEG
        key2 = `${countryPath}/${caseId}_2.jpg`;  // Standardized to JPEG
        
        // ===== IMAGEKIT APPROACH (NEW) =====
        // Generate ImageKit URLs with smart crop and face detection
        const imageKitBaseUrl = `${config.imageKitBaseUrl}/${config.imageKitId}`;
        const imageKitUrl1 = `${imageKitBaseUrl}/${key1}?tr=w-224,h-224,c-maintain_ratio,fo-face,q-80`;
        const imageKitUrl2 = `${imageKitBaseUrl}/${key2}?tr=w-224,h-224,c-maintain_ratio,fo-face,q-80`;
        
        
        // Use ImageKit URLs for Lambda
        const url1 = imageKitUrl1;
        const url2 = imageKitUrl2;
        
        // ===== S3 PRESIGNED URL APPROACH (COMMENTED OUT) =====
        // Generate presigned GET URLs for Lambda
        // const url1 = await getPresignedGetUrl(config.awsTempImageBucket, key1, 300); // 5 min expiry
        // const url2 = await getPresignedGetUrl(config.awsTempImageBucket, key2, 300);
        
        // Prepare payload for Lambda
        const payload = {
            url1,
            url2,
            do_verify: doVerify
        };
        
        
        // Create invoke command
        const command = new InvokeCommand({
            FunctionName: config.awsLambdaFunctionName,
            Payload: JSON.stringify(payload),
            InvocationType: 'RequestResponse' // Synchronous invocation
        });
        
        // Invoke Lambda function with retries (2 retries, 500ms delay to absorb cold starts)
        const result = await retry(() => lambdaClient.send(command), 2, 500);
        
        // Parse the response
        const rawResponse = new TextDecoder().decode(result.Payload);
        const responseData = JSON.parse(rawResponse);
        
        // Check for Lambda errors
        if (responseData.statusCode && responseData.statusCode !== 200) {
            const errorBody = JSON.parse(responseData.body);
            throw new Error(errorBody.error || 'Lambda function error');
        }
        // Parse the body if it exists (Lambda response format)
        let embeddings;
        if (responseData.body) {
            const bodyData = JSON.parse(responseData.body);
            embeddings = [bodyData.embedding1, bodyData.embedding2];
        } else {
            // Direct response format
            embeddings = [responseData.embedding1, responseData.embedding2];
        }
        // NOTE: Temp S3 images are kept for S3-to-S3 copy in the controller success path
        return embeddings;
    } catch (error) {
        console.error('Error generating embeddings via Lambda:', error);
        // Attempt cleanup if upload succeeded but error occurred
        if (key1) {
            try { await deleteFromS3(key1); } catch (e) { console.error('Error in error-cleanup deleteFromS3 (key1):', e); }
        }
        if (key2) {
            try { await deleteFromS3(key2); } catch (e) { console.error('Error in error-cleanup deleteFromS3 (key2):', e); }
        }
        throw error;
    }
};

export { generateEmbeddings }; 