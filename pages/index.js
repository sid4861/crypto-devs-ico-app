import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { Contract, providers, utils, BigNumber } from "ethers";
import React, { useState, useRef, useEffect } from "react";
import Web3Modal from "web3modal";
import {
  NFT_CONTRACT_ABI,
  NFT_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";

export default function Home() {

  const zero = BigNumber.from(0);
  const web3modalRef = useRef();
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokensMinted, setTokensMinted] = useState(zero);
  const [balanceOfCryptoDevTokens, setBalanceOfCryptoDevTokens] = useState(
    zero
  );
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero);
  const [tokenAmount, setTokenAmount] = useState(zero);
  const [currentAccount, setCurrentAccount] = useState("");

  /**
   * checking if metamask is installed 
   */

  const checkIfMetamaskIsInstalled = async () => {
    const { ethereum } = window;
    if (!ethereum) {
      alert("Install metamask browser extension")
    } else {
      // check if we're authorized to access the user's wallet
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts.length !== 0) {
        const account = accounts[0];
        setCurrentAccount(account);
      }
    }
  }

  /**
   * authorises app to use user's metamask account
   */
  const connectMetamask = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Install metamask browser extension")
      } else {
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        setCurrentAccount(accounts[0]);
      }
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * returns provider or signer to interact with blockchain
   */
  const getProviderOrSigner = async (needSigner = false) => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        // const provider = await web3modalRef.current.connect();
        const web3Provider = new providers.Web3Provider(ethereum);

        const { chainId } = await web3Provider.getNetwork();
        if (chainId !== 4) {
          window.alert("Change the network to Rinkeby");
          throw new Error("Change network to Rinkeby");
        }

        if (needSigner) {
          const signer = web3Provider.getSigner();
          return signer;
        }
        return web3Provider;
      }
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * connects to metamask - web3modal
   */
  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * getTotalTokensMinted: Retrieves how many tokens have been minted till now
   * out of the total supply
   */
  const getTotalTokensMinted = async () => {
    try {
      const provider = await getProviderOrSigner();
      const contract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);
      const _tokensMinted = await contract.totalSupply();
      setTokensMinted(_tokensMinted);
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * getBalanceOfCryptoDevTokens: checks the balance of Crypto Dev Tokens's held by an address
   */
  const getBalanceOfCryptoDevTokens = async () => {
    try {
      const provider = await getProviderOrSigner();
      const contract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);

      const signer = await getProviderOrSigner(true);
      const address = signer.getAddress();
      const balance = await contract.balanceOf(address);

      setBalanceOfCryptoDevTokens(balance);

    } catch (error) {
      console.log(error);
      setBalanceOfCryptoDevTokens(zero);
    }
  }

  /**
  * getTokensToBeClaimed: checks the balance of tokens that can be claimed by the user
  */
  const getTokensToBeClaimed = async () => {
    try {
      const provider = await getProviderOrSigner();
      const signer = await getProviderOrSigner(true);

      const address = signer.getAddress();

      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, provider);
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);

      const nftBalance = await nftContract.balanceOf(address);
      if (nftBalance === zero) {
        setTokensToBeClaimed(zero);
      } else {
        let amount = 0;
        for (let i = 0; i < nftBalance; i++) {
          const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
          const isClaimed = await tokenContract.tokenIdsClaimed(tokenId);
          if (!isClaimed) {
            amount++;
          }
        }
        setTokensToBeClaimed(BigNumber.from(amount));
      }
    } catch (error) {
      console.log(error);
      setTokensToBeClaimed(zero);
    }
  }

  /**
  * claimCryptoDevTokens: Helps the user claim Crypto Dev Tokens
  */
  const claimCryptoDevTokens = async () => {
    try {
      // We need a Signer here since this is a 'write' transaction.
      // Create an instance of tokenContract
      const signer = await getProviderOrSigner(true);
      // Create an instance of tokenContract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      const tx = await tokenContract.claim();
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("Sucessfully claimed Crypto Dev Tokens");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * mintCryptoDevToken: mints `amount` number of tokens to a given address
   */
  const mintCryptoDevToken = async (amount) => {
    try {
      // We need a Signer here since this is a 'write' transaction.
      // Create an instance of tokenContract
      const signer = await getProviderOrSigner(true);
      // Create an instance of tokenContract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      // Each token is of `0.001 ether`. The value we need to send is `0.001 * amount`
      const value = 0.001 * amount;
      const tx = await tokenContract.mint(amount, {
        // value signifies the cost of one crypto dev token which is "0.001" eth.
        // We are parsing `0.001` string to ether using the utils library from ethers.js
        value: utils.parseEther(value.toString()),
      });
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("Sucessfully minted Crypto Dev Tokens");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  };

  // useEffect(() => {
  //   if (!walletConnected) {
  //     web3modalRef.current = new Web3Modal({
  //       network: "rinkeby",
  //       providerOptions: {},
  //       disableInjectedProvider: false
  //     });
  //     connectWallet();
  //     getTotalTokensMinted();
  //     getBalanceOfCryptoDevTokens();
  //     getTokensToBeClaimed();
  //   }
  // }, [walletConnected]);

  useEffect(() => {
    checkIfMetamaskIsInstalled();
  }, []);

  useEffect(() => {
    if (currentAccount !== "") {
      getTotalTokensMinted();
      getBalanceOfCryptoDevTokens();
      getTokensToBeClaimed();
    }
  }, [currentAccount]);

  /*
        renderButton: Returns a button based on the state of the dapp
      */
  const renderButton = () => {
    // If we are currently waiting for something, return a loading button
    if (loading) {
      return (
        <div>
          <button className={styles.button}>Loading...</button>
        </div>
      );
    }

    // If tokens to be claimed are greater than 0, Return a claim button
    if (tokensToBeClaimed > 0) {
      return (
        <div>
          <div className={styles.description}>
            {tokensToBeClaimed * 10} Tokens can be claimed!
          </div>
          <button className={styles.button} onClick={claimCryptoDevTokens}>
            Claim Tokens
          </button>
        </div>
      );
    }

    // If user doesn't have any tokens to claim, show the mint button
    return (
      <div style={{ display: "flex-col" }}>
        <div>
          <input
            type="number"
            placeholder="Amount of Tokens"
            // BigNumber.from converts the `e.target.value` to a BigNumber
            onChange={(e) => setTokenAmount(BigNumber.from(e.target.value))}
            className={styles.input}
          />
        </div>

        <button
          className={styles.button}
          disabled={!(tokenAmount > 0)}
          onClick={() => mintCryptoDevToken(tokenAmount)}
        >
          Mint Tokens
        </button>
      </div>
    );

  }

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="ICO-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs ICO!</h1>
          <div className={styles.description}>
            You can claim or mint Crypto Dev tokens here
          </div>
          {currentAccount !== "" ? (
            <div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                You have minted {utils.formatEther(balanceOfCryptoDevTokens)} Crypto
                Dev Tokens
              </div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                Overall {utils.formatEther(tokensMinted)}/10000 have been minted!!!
              </div>
              {renderButton()}
            </div>
          ) : (
            <button onClick={connectMetamask} className={styles.button}>
              Connect your wallet
            </button>
          )}
        </div>
        <div>
          <img className={styles.image} src="./0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  )
}
