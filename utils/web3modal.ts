import Web3Modal from 'web3modal';
import { ethers } from 'ethers';
import WalletConnectProvider from '@walletconnect/web3-provider';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';

// Provider options configuration
const providerOptions = {
    walletconnect: {
        package: WalletConnectProvider,
        options: {
            infuraId: 'YOUR_INFURA_PROJECT_ID', // Replace with your Infura project ID
        },
    },
    coinbasewallet: {
        package: CoinbaseWalletSDK,
        options: {
            appName: 'ArtGuard',
            infuraId: 'YOUR_INFURA_PROJECT_ID', // Replace with your Infura project ID
        },
    },
};

// Web3Modal instance configuration
const web3ModalConfig = {
    cacheProvider: false, // Disable caching for now
    providerOptions,
    theme: 'dark',
    disableInjectedProvider: false,
};

let web3Modal: Web3Modal | null = null;

/**
 * Initialize Web3Modal instance
 */
export const initWeb3Modal = () => {
    if (!web3Modal) {
        web3Modal = new Web3Modal(web3ModalConfig);
    }
    return web3Modal;
};

/**
 * Connect to wallet using Web3Modal
 * @returns Provider and connection details
 */
export const connectWithWeb3Modal = async () => {
    try {
        const modal = initWeb3Modal();
        const instance = await modal.connect();
        const provider = new ethers.providers.Web3Provider(instance);
        const signer = provider.getSigner();
        const address = await signer.getAddress();

        // Subscribe to accounts change
        instance.on('accountsChanged', (accounts: string[]) => {
            if (accounts.length === 0) {
                // Handle disconnection
                modal.clearCachedProvider();
            }
        });

        // Subscribe to chainId change
        instance.on('chainChanged', () => {
            window.location.reload();
        });

        return {
            provider,
            signer,
            address,
            displayAddress: `${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
        };
    } catch (error) {
        console.error('Error connecting with Web3Modal:', error);
        throw error;
    }
};

/**
 * Disconnect wallet
 */
export const disconnectWeb3Modal = async () => {
    if (web3Modal) {
        web3Modal.clearCachedProvider();
        web3Modal = null;
    }
};