# Current Architecture
## Overview
NexWallet is a cutting-edge platform that combines blockchain technology with artificial intelligence to provide a seamless and intelligent wallet management experience. It supports multiple blockchain networks and offers unique features such as AI-driven transaction signing.
## Key Features
- **Multi-Chain Support**: Solana, Base, Ethereum, Arbitrum, and more.
- **AI-Driven Interactions**: Text and voice command capabilities.
- **Unique Transaction Signing**: First platform to offer AI agent transaction signing.
- **Real-Time Data Integration**: Utilizes Cookie DataSwarm API for up-to-date blockchain data.
- **Robust Security**: Advanced authentication and security measures.
## Technical Documentation
### Architecture Overview
- **Backend**:
  - **API Service**: Handles all blockchain interactions and API requests.
  - **Database**: Utilizes PostgreSQL for storing user data, agent configurations, and transaction history.
  - **Authentication**: Implements OAuth 2.0 for secure user authentication.
- **Frontend**:
  - **React Components**: Reusable UI components for a seamless user experience.

## Main changes done in SEND AI
 
 - SolanaAgentKit now includes a callback mechanism.
     <img width="629" alt="Screenshot 2025-01-23 at 15 21 08" src="https://github.com/user-attachments/assets/ed8d88d2-4525-4e8f-afe5-b8e5b30fd2b3" />
 
 - Private keys are no longer mandatory; public keys can also be used. When using a public key, the UI mode variable must be set to true.
     <img width="480" alt="Screenshot 2025-01-23 at 15 21 14" src="https://github.com/user-attachments/assets/dba0a627-f5dd-4da8-a161-929b26764a96" />
# NexWallet Deployment Guide

This guide explains how to set up and deploy the NexWallet application using GitHub Actions and a self-hosted runner.

## Project Structure

- `backend/`: Backend API service
- `frontend_app/`: Frontend React application
- `.github/workflows/`: Will be added.

