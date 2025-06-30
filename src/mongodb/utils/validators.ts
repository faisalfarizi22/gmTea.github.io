import { ethers } from 'ethers';

export const isValidAddress = (address: string): boolean => {
  try {
    return ethers.utils.isAddress(address);
  } catch (e) {
    return false;
  }
};

export const isValidUsername = (username: string): boolean => {
  if (!username) return false;
  
  const usernameRegex = /^[a-z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

export const isValidTxHash = (hash: string): boolean => {
  if (!hash) return false;
  
  const txHashRegex = /^0x[a-fA-F0-9]{64}$/;
  return txHashRegex.test(hash);
};

export const isValidTier = (tier: number): boolean => {
  return tier >= 0 && tier <= 4 && Number.isInteger(tier);
};

export const validatePagination = (
  page: any,
  limit: any,
  defaultLimit: number = 10
): { page: number; limit: number; skip: number } => {
  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || defaultLimit;
  
  const safePage = Math.max(1, parsedPage);
  const safeLimit = Math.min(100, Math.max(1, parsedLimit)); 
  
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit
  };
};

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

export const getSafeErrorMessage = (error: any): string => {
  if (process.env.NODE_ENV === 'development') {
    return error?.message || 'An error occurred';
  }
  
  return 'An error occurred. Please try again later.';
};
