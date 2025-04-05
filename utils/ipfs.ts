import { ThirdwebStorage } from "@thirdweb-dev/storage";
import { Buffer } from 'buffer';

// Initialize ThirdwebStorage instance
const storage = new ThirdwebStorage();

/**
 * Convert base64 image data to a File object
 */
const base64ToFile = (base64Data: string, filename = 'evidence.png'): File => {
    // Extract the base64 data
    const [header, encoded] = base64Data.split(',');
    const contentType = header.split(':')[1].split(';')[0];
    
    // Convert base64 to binary
    const binaryData = Buffer.from(encoded, 'base64');
    
    // Create a Blob and then a File
    const blob = new Blob([binaryData], { type: contentType });
    return new File([blob], filename, { type: contentType });
};

/**
 * Upload evidence to IPFS
 * @param imageData - Base64 image data or image URL
 * @param metadata - Additional metadata to store with the image
 * @returns IPFS URI
 */
export const uploadToIPFS = async (
    imageData: string,
    metadata: Record<string, any> = {}
): Promise<string> => {
    try {
        let file: File;
        
        // Handle base64 data or URL
        if (imageData.startsWith('data:image/')) {
            file = base64ToFile(imageData);
        } else {
            // For URLs, fetch the image first
            const response = await fetch(imageData);
            const blob = await response.blob();
            file = new File([blob], 'evidence.png', { type: blob.type });
        }
        
        // Prepare metadata object
        const evidenceData = {
            image: file,
            ...metadata,
            timestamp: new Date().toISOString(),
            type: 'artguard_evidence'
        };
        
        // Upload to IPFS
        const uri = await storage.upload(evidenceData);
        return uri;
        
    } catch (error) {
        console.error('IPFS upload failed:', error);
        throw error;
    }
};

/**
 * Get data from IPFS
 * @param uri - IPFS URI
 * @returns Downloaded data
 */
export const getFromIPFS = async (uri: string): Promise<any> => {
    try {
        const data = await storage.download(uri);
        return data;
    } catch (error) {
        console.error('IPFS download failed:', error);
        throw error;
    }
};