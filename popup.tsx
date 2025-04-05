/* art-guard/popup.tsx */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './popup.module.css';
import { useSyncProviders } from './hooks/useSyncProviders';
import type { EIP6963ProviderDetail } from './types/eip6963';
import { formatAddress } from './utils';
import { blockchainService } from './utils/blockchain';
// Keep imports for potential future real connection toggle
// import { connectWithWeb3Modal, disconnectWeb3Modal } from './utils/web3modal';
// import { ethers } from 'ethers'; // Only needed if using ethers directly for real connection
import ErrorBoundary from './ErrorBoundary';

// --- Icons (As functional components) ---
const ShieldIcon: React.FC = () => <span role="img" aria-label="shield">🛡️</span>;
const WalletIcon: React.FC = () => <span role="img" aria-label="wallet">💼</span>;
const DisconnectIcon: React.FC = () => <span role="img" aria-label="disconnect">❌</span>;
const UploadIcon: React.FC = () => <span role="img" aria-label="upload">☁️</span>;
const SearchIcon: React.FC = () => <span role="img" aria-label="search">🔍</span>;
const InfoIcon: React.FC = () => <span role="img" aria-label="info">ℹ️</span>;
const CheckCircleIcon: React.FC = () => <span role="img" aria-label="success">✅</span>;
const WarningIcon: React.FC = () => <span role="img" aria-label="warning">⚠️</span>;
// Basic SVG placeholder icon (grey circle) as a Base64 Data URL
const MOCK_WALLET_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjYThhOGE4Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI5IiBzdHJva2U9IiM1NTUiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==';

const BACKEND_URL = 'http://localhost:5001'; // Your Flask server URL

const Popup = () => {
  // --- Wallet State ---
  const providers = useSyncProviders(); // Still discover real providers
  const [selectedWallet, setSelectedWallet] = useState<EIP6963ProviderDetail | null>(null);
  const [userAccount, setUserAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);

  // --- App-Specific State ---
  const [sourceInputMethod, setSourceInputMethod] = useState<'upload' | 'url'>('upload');
  const [isScanButtonDisabled, setIsScanButtonDisabled] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any[] | null>(null); // Consider defining a Result type
  const [appError, setAppError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Added type for ref

  // --- Loading/Wallet Connection Effects ---
  useEffect(() => {
    const discoveryTimeout = setTimeout(() => setIsLoadingProviders(false), 300);
    return () => clearTimeout(discoveryTimeout);
  }, []);

  // --- *** FAKE WALLET CONNECTION HANDLER *** ---
  const handleConnect = useCallback(async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    setWalletError(null);
    setAppError(null);
    console.log("Faking wallet connection...");

    await new Promise(resolve => setTimeout(resolve, 400));

    const mockAddress = '0xAbC123dE456f789012345678901234567890DeF1';
    const mockWalletInfo: EIP6963ProviderDetail['info'] = {
        name: 'Wallet', icon: MOCK_WALLET_ICON, uuid: 'mock-wallet-uuid-12345'
    };

    setUserAccount(mockAddress);
    setSelectedWallet({ info: mockWalletInfo, provider: {} }); // provider is just a placeholder

    setIsConnecting(false);
    console.log("Wallet connection faked successfully. User account set to:", mockAddress);
  }, [isConnecting]);
  // --- *** END FAKE WALLET CONNECTION HANDLER *** ---

  // --- Disconnect Handler ---
  const handleDisconnect = useCallback(async () => {
    console.log("Disconnecting wallet (clearing fake state)...");
    setIsConnecting(true);
    setSelectedWallet(null);
    setUserAccount(null);
    setWalletError(null);
    setScanResult(null);
    setIsScanning(false);
    setIsScanButtonDisabled(true);
    await new Promise(resolve => setTimeout(resolve, 200));
    setIsConnecting(false);
    console.log("Fake wallet state cleared.");
  }, []);

  // --- Source Input Handlers ---
  const handleSourceMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMethod = event.target.value as 'upload' | 'url';
    console.log("Source method changed to:", newMethod);
    setSourceInputMethod(newMethod);
    setFileName(null);
    setSourceUrl('');
    setAppError(null);
    setScanResult(null);
    // Disable scan button initially when switching to URL mode
    setIsScanButtonDisabled(newMethod === 'url');
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear file input
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setAppError(null);
    setScanResult(null);
    const file = event.target.files?.[0];

    if (!file) {
      setFileName(null);
      setIsScanButtonDisabled(true);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setAppError('Please select an image file');
      setFileName(null);
      setIsScanButtonDisabled(true);
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setAppError('File size must be less than 5MB');
      setFileName(null);
      setIsScanButtonDisabled(true);
      return;
    }
    setFileName(file.name);
    setIsScanButtonDisabled(false); // Re-enable scan button when a new NFT is uploaded
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAppError(null);
    setScanResult(null);
    const url = event.target.value;
    setSourceUrl(url);
    setIsScanButtonDisabled(url.trim() === ''); // Enable if URL is not empty
  };

  // --- Scan Handler (Using Mock Backend) ---
  const handleScan = async () => {
    // Guard clauses
    if (isScanButtonDisabled || isScanning) return;
    if (!userAccount) {
      setAppError("Please connect your wallet first.");
      return;
    }

    // Validate inputs
    let sourceImageIdentifier: string | null = null;

    if (sourceInputMethod === 'upload') {
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (!fileInput?.files?.[0]) {
        setAppError('No file selected for upload.');
        return;
      }
      const file = fileInput.files[0];
      try {
        sourceImageIdentifier = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string); // Get base64 data URL
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      } catch (fileReadError: any) {
        setAppError(`Failed to read file: ${fileReadError.message}`);
        setIsScanning(false);
        return;
      }
    } else { // 'url' mode
      if (!sourceUrl || !sourceUrl.trim()) {
        setAppError('Please enter a valid source image URL.');
        return;
      }
      try {
        new URL(sourceUrl.trim());
        sourceImageIdentifier = sourceUrl.trim();
      } catch (_) {
        setAppError('Invalid source image URL format.');
        return;
      }
    }

    if (!sourceImageIdentifier) {
      setAppError("Could not determine source image.");
      return;
    }

    // Start Scan Process
    setIsScanning(true);
    setAppError(null);
    setScanResult(null);
    console.log("Scan initiated with source:", sourceInputMethod);

    const scanTimeout = setTimeout(() => {
      if (isScanning) {
        console.warn('Scan operation timed out!');
        setAppError('Scan timed out - is the backend running or reachable?');
        setIsScanning(false);
      }
    }, 20000);

    try {
      const response = await fetch(`${BACKEND_URL}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceImageIdentifier,
          sourceType: sourceInputMethod,
          targetImageUrls: [] // Will be populated with target URLs from the current page
        }),
      });

      const data = await response.json();

      if (data.success) {
        const randomResultCount = Math.floor(Math.random() * 10) + 1; // Random number between 1 and 10
        const randomResults = data.results.slice(0, randomResultCount); // Slice results to random count
        setScanResult(randomResults);
        setIsScanButtonDisabled(true);
        console.log("Scan process complete.", randomResults);
      } else {
        setAppError(data.message || "An unexpected error occurred during the scan.");
        setScanResult(null);
      }
    } catch (error: any) {
      console.error("Error during scan process:", error);
      setAppError(error.message || "An unexpected error occurred during the scan.");
      setScanResult(null);
    } finally {
      clearTimeout(scanTimeout);
      setIsScanning(false);
    }
  }; // --- End handleScan ---

  // --- Render ---
  return (
    <ErrorBoundary>
      <React.Fragment>
        <div className={styles.appContainer}>
          {/* App Bar Section */}
          <div className={styles.appBar}>
            <div className={styles.titleContainer}>
              <ShieldIcon /> <span className={styles.title}>ArtGuard</span>
            </div>
            {/* Wallet Connection Area */}
            <div className={styles.walletArea}>
              {userAccount && selectedWallet ? (
                <div className={styles.walletInfo}>
                  <img src={selectedWallet.info.icon} alt={selectedWallet.info.name} width="20" height="20" style={{ borderRadius: '4px', marginRight: '5px' }} />
                  <span className={styles.address} title={userAccount}>{formatAddress(userAccount)}</span>
                  <button className={styles.disconnectButton} onClick={handleDisconnect} disabled={isConnecting}>
                    <DisconnectIcon /> {isConnecting ? '' : 'Disconnect'}
                  </button>
                </div>
              ) : (
                !isLoadingProviders && (
                  <button className={styles.connectButton} onClick={handleConnect} disabled={isConnecting}>
                    <WalletIcon />
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                )
              )}
              {/* Loading Indicator */}
              {isLoadingProviders && !userAccount && (
                <span style={{ color: '#ccc', fontSize: '0.8em', marginLeft: '10px' }}>Loading...</span>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className={styles.content}>
            {/* Error Display Area */}
            {walletError && (
              <div className={`${styles.infoAlert} ${styles.errorAlert}`}>
                <InfoIcon /> <p>{walletError}</p>
              </div>
            )}
            {appError && (
              <div className={`${styles.infoAlert} ${styles.errorAlert}`}>
                <InfoIcon /> <p>{appError}</p>
              </div>
            )}

            {/* Connect Prompt (Only show if not connected and done loading) */}
            {!userAccount && !isLoadingProviders && (
              <div className={styles.infoAlert}>
                <InfoIcon /> <p>Connect your wallet to enable scanning.</p>
              </div>
            )}

            {/* Input Card (Show only if connected) */}
            {userAccount && (
              <div className={styles.card}>
                <h2 className={styles.cardTitle}>Check NFT Plagiarism</h2>
                <p className={styles.cardDescription}>
                  Provide source NFT (upload/URL) to check against images on the current page.
                </p>
                {/* Input Method Selector */}
                <div className={styles.inputMethodSelector}>
                  <p className={styles.sourceLabel}>Source NFT Image:</p>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input type="radio" name="sourceMethod" value="upload" checked={sourceInputMethod === 'upload'} onChange={handleSourceMethodChange} className={styles.radioInput} /> Upload
                    </label>
                    <label className={styles.radioLabel}>
                      <input type="radio" name="sourceMethod" value="url" checked={sourceInputMethod === 'url'} onChange={handleSourceMethodChange} className={styles.radioInput} /> URL
                    </label>
                  </div>
                </div>
                {/* Upload Area */}
                {sourceInputMethod === 'upload' && (
                  <div
                    className={styles.uploadArea}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        if (fileInputRef.current) {
                          fileInputRef.current.files = e.dataTransfer.files;
                          const changeEvent = new Event('change', { bubbles: true });
                          fileInputRef.current.dispatchEvent(changeEvent);
                        }
                      }
                    }}
                  >
                    <input type="file" id="file-upload" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} ref={fileInputRef} />
                    {fileName ? (
                      <div className={styles.fileNameDisplay}>
                        <UploadIcon /><span>{fileName}</span>
                      </div>
                    ) : (
                      <>
                        <UploadIcon />
                        <p className={styles.uploadText}>Drag & drop or click</p>
                        <div className={styles.chooseFileButton}>Choose File</div>
                      </>
                    )}
                  </div>
                )}
                {/* URL Input */}
                {sourceInputMethod === 'url' && (
                  <div className={styles.urlInputContainer}>
                    <input type="text" placeholder="https://... URL of the source NFT image" className={styles.urlInput} value={sourceUrl} onChange={handleUrlChange} />
                  </div>
                )}
                {/* Scan Button */}
                <button
                  className={styles.scanButton}
                  disabled={isScanButtonDisabled || isScanning}
                  onClick={handleScan}
                  title={isScanButtonDisabled ? "Provide image/URL" : "Scan page"}
                >
                  <SearchIcon />
                  {isScanning ? 'SCANNING...' : 'Scan Current Page'}
                </button>
              </div>
            )}

            {/* --- Results Area --- */}
            {isScanning && (
              <div className={styles.loadingContainer}>
                {/* Replace with your own loading indicator if not using MUI's CircularProgress */}
                <div>Loading...</div>
                <span>Scanning...</span>
              </div>
            )}

            {!isScanning && scanResult && scanResult.length > 0 && (
              <div className={`${styles.card} ${styles.resultsCard}`}>
                <h3 className={styles.resultsTitle}>Scan Results ({scanResult.length} comparison{scanResult.length !== 1 ? 's' : ''}):</h3>
                <div className={styles.resultsList}>
                  {scanResult.map((result, index) => (
                    <div key={index} className={styles.resultItem}>
                      <img
                        src={result.targetUrl}
                        alt={`Target ${index + 1}`}
                        className={styles.resultThumbnail}
                        onError={(e) => {
                          e.currentTarget.src = MOCK_WALLET_ICON;
                          e.currentTarget.style.objectFit = 'contain';
                        }}
                      />
                      <div className={styles.resultDetails}>
                        <span className={styles.resultSimilarity} style={{ color: result.isPlagiarized ? '#f44336' : '#4caf50' }}>
                          {(result.similarity * 100).toFixed(1)}% Match {result.isPlagiarized ? <WarningIcon /> : <CheckCircleIcon />}
                        </span>
                        <a href={result.targetUrl || 'https://opensea.io/404'} target="_blank" rel="noopener noreferrer" className={styles.resultLink} title={result.targetUrl || 'OpenSea 404'}>
                          View Target
                        </a>
                        {result.txHash && (
                          <a href={`https://mumbai.polygonscan.com/tx/${result.txHash}`} target="_blank" rel="noopener noreferrer" className={styles.txLink} title="View report transaction on Polygonscan">
                            Reported ✅
                          </a>
                        )}
                        {result.blockchainError && (
                          <span className={styles.blockchainError} title={result.blockchainError}>
                            <InfoIcon /> Report Failed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isScanning && scanResult && scanResult.length === 0 && (
              <div className={styles.infoAlert}>
                <InfoIcon /> <p>Scan complete. No potential plagiarism detected.</p>
              </div>
            )}

            {!userAccount && !isLoadingProviders && !appError && !walletError && (
              <div className={styles.infoAlert}>
                <InfoIcon /> <p>Connect your wallet to start scanning.</p>
              </div>
            )}
          </div>
        </div>
      </React.Fragment>
    </ErrorBoundary>
  );
};

export default Popup;
