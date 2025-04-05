// art-guard/content-script.ts

interface ImageInfo {
  url: string;
  alt?: string;
  dimensions?: { width: number; height: number };
  containerClasses?: string[];
}

function findNFTImages(): ImageInfo[] {
  const images: ImageInfo[] = [];
  
  // Common NFT image selectors
  const selectors = [
    'img[src*="nft"]',
    'img[alt*="NFT"]',
    'img[src*="token"]',
    // OpenSea specific selectors
    '.AssetMedia--img',
    '[data-testid="NFTImage"]',
    // Generic large images that might be NFTs
    'img[width="600"]',
    'img[width="500"]',
    'img[height="600"]',
    'img[height="500"]'
  ];

  const processedUrls = new Set<string>();

  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach((element: Element) => {
      if (element instanceof HTMLImageElement) {
        const url = element.src;
        
        // Skip if already processed or not a valid http(s) URL
        if (processedUrls.has(url) || !url.match(/^https?:\/\//)) return;
        
        processedUrls.add(url);
        
        const imageInfo: ImageInfo = {
          url,
          alt: element.alt || undefined,
          dimensions: {
            width: element.naturalWidth || element.width,
            height: element.naturalHeight || element.height
          },
          containerClasses: Array.from(element.parentElement?.classList || [])
        };
        
        images.push(imageInfo);
      }
    });
  });

  return images;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ active: true });
    return true;
  }
  
  if (message.action === 'scanPage') {
    try {
      const images = findNFTImages();
      
      if (images.length === 0) {
        sendResponse({
          success: false,
          message: 'No NFT images found on this page'
        });
        return true;
      }

      sendResponse({
        success: true,
        imageUrls: images.map(img => img.url),
        imageDetails: images
      });
    } catch (error) {
      console.error('Scan error:', error);
      sendResponse({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred while scanning for NFT images'
      });
    }
    return true; // Keep message channel open for async response
  }
});