# ArtGuard

> Safeguarding Digital Art Authenticity with AI-Powered NFT Protection

ArtGuard is an intelligent browser extension that empowers digital artists and NFT creators with real-time plagiarism detection. Using advanced AI technology, we ensure the originality and integrity of digital art in the blockchain ecosystem.

## The Problem It Solves

In the rapidly growing NFT marketplace, digital art plagiarism has become a significant concern. ArtGuard addresses this challenge by:

- **Protecting Creators**: Artists can verify their work's uniqueness before minting NFTs, preventing accidental duplications and protecting their intellectual property.

- **Safeguarding Collectors**: Buyers can confidently invest in NFTs knowing they're purchasing authentic, original artwork rather than copied or derivative pieces.

- **Streamlining Verification**: Our browser extension integrates seamlessly with popular NFT marketplaces, making authenticity checks a natural part of the browsing and trading experience.

- **Real-time Detection**: Using advanced AI algorithms, ArtGuard performs instant similarity analysis against a vast database of existing digital art and NFTs.

- **Blockchain Integration**: Direct integration with blockchain technology ensures transparent and reliable verification of digital art ownership and authenticity.

This project is built with [Plasmo extension](https://docs.plasmo.com/) framework.

## Technologies Used
React, TypeScript, Web3.js, WebSocket, Plasmo Framework, Python, TensorFlow, ArrayBuffer API, Chrome Extension APIs, Blockchain Technology, IPFS, NFT Standards (ERC-721/ERC-1155), Error Boundary Components, CORS Middleware

## Technical Challenges and Solutions

During the development of ArtGuard, we encountered several significant technical challenges:

### 1. AVIF Image Format Detection
- **Challenge**: Implementing accurate detection of AVIF image format in browser extensions was complex due to limited browser API support.
- **Solution**: We developed a custom image format detection system using ArrayBuffer analysis and magic number verification, ensuring reliable AVIF detection across different browsers.

### 2. CORS and Backend Integration
- **Challenge**: Cross-Origin Resource Sharing (CORS) issues emerged when our extension tried to communicate with the backend server for image analysis.
- **Solution**: Implemented proper CORS headers configuration on the backend and utilized proxy middleware in development. We also added robust error handling for CORS-related failures.

### 3. Real-time Updates with WebSocket
- **Challenge**: Maintaining stable WebSocket connections for real-time plagiarism detection updates while handling connection drops and browser tab lifecycle.
- **Solution**: Implemented an automatic reconnection mechanism with exponential backoff, and added connection health monitoring to ensure reliable real-time updates.

### 4. React Component Error Handling
- **Challenge**: Preventing the entire extension from crashing when individual components encountered errors.
- **Solution**: Developed custom error boundary components and implemented graceful fallback UI, ensuring the extension remains functional even when specific features encounter issues.

## Getting Started

First, run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.

For further guidance, [visit our Documentation](https://docs.plasmo.com/)

## Making production build

Run the following:

```bash
pnpm build
# or
npm run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

## Submit to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!
