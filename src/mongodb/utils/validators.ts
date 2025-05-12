// src/mongodb/utils/validators.ts
import { ethers } from 'ethers';

/**
 * Validate Ethereum address
 */
export const isValidAddress = (address: string): boolean => {
  try {
    return ethers.utils.isAddress(address);
  } catch (e) {
    return false;
  }
};

/**
 * Validate username format
 */
export const isValidUsername = (username: string): boolean => {
  if (!username) return false;
  
  // Username should be 3-20 characters, containing only alphanumeric and underscore
  const usernameRegex = /^[a-z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

/**
 * Validate transaction hash
 */
export const isValidTxHash = (hash: string): boolean => {
  if (!hash) return false;
  
  // Transaction hash should be a 0x-prefixed 64-character hex string
  const txHashRegex = /^0x[a-fA-F0-9]{64}$/;
  return txHashRegex.test(hash);
};

/**
 * Validate tier number
 */
export const isValidTier = (tier: number): boolean => {
  return tier >= 0 && tier <= 4 && Number.isInteger(tier);
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (
  page: any,
  limit: any,
  defaultLimit: number = 10
): { page: number; limit: number; skip: number } => {
  // Parse page and limit to integers
  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || defaultLimit;
  
  // Validate values
  const safePage = Math.max(1, parsedPage);
  const safeLimit = Math.min(100, Math.max(1, parsedLimit)); // Max 100 items per page
  
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit
  };
};

/**
 * Validate query parameters
 */
export const validateQueryParam = (
  param: any,
  validator: (value: any) => boolean,
  defaultValue: any = null
): any => {
  if (param !== undefined && validator(param)) {
    return param;
  }
  
  return defaultValue;
};

/**
 * Generate safe error message to return to clients
 */
export const getSafeErrorMessage = (error: any): string => {
  // Don't expose internal error details
  if (process.env.NODE_ENV === 'development') {
    return error?.message || 'An error occurred';
  }
  
  return 'An error occurred. Please try again later.';
};
