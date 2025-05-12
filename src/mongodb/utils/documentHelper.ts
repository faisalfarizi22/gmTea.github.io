// src/mongodb/utils/documentHelper.ts

import { Document } from 'mongoose';

/**
 * Helper function to safely get a property from a Mongoose document
 * This helps avoid TypeScript property access errors
 * 
 * @param doc Mongoose document
 * @param prop Property name to access
 * @param defaultValue Default value if property doesn't exist
 * @returns The property value or default value
 */
export function getDocumentValue<T>(
  doc: Document | null | undefined,
  prop: string,
  defaultValue: T
): T {
  if (!doc) return defaultValue;
  
  // Try using get() method first
  if (typeof doc.get === 'function') {
    const value = doc.get(prop);
    return value !== undefined ? value : defaultValue;
  }
  
  // Fallback to direct access if needed
  const value = (doc as any)[prop];
  return value !== undefined ? value : defaultValue;
}

/**
 * Helper function to check if a property exists on a Mongoose document
 * 
 * @param doc Mongoose document
 * @param prop Property name to check
 * @returns True if property exists
 */
export function hasDocumentProperty(
  doc: Document | null | undefined,
  prop: string
): boolean {
  if (!doc) return false;
  
  // Try using get() method first
  if (typeof doc.get === 'function') {
    return doc.get(prop) !== undefined;
  }
  
  // Fallback to direct access
  return (doc as any)[prop] !== undefined;
}

/**
 * Convert a Mongoose document to a plain object safely for TypeScript
 * 
 * @param doc Mongoose document
 * @returns Plain JavaScript object
 */
export function documentToObject<T extends Record<string, any>>(
  doc: Document | null | undefined
): T | null {
  if (!doc) return null;
  
  if (typeof doc.toObject === 'function') {
    return doc.toObject() as T;
  }
  
  // Fallback to direct conversion
  return doc as unknown as T;
}

/**
 * Shorthand for getDocumentValue
 */
export const docVal = getDocumentValue;

/**
 * Default export
 */
export default {
  getDocumentValue,
  hasDocumentProperty,
  documentToObject,
  docVal
};