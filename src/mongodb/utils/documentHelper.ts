import { Document } from 'mongoose';


export function getDocumentValue<T>(
  doc: Document | null | undefined,
  prop: string,
  defaultValue: T
): T {
  if (!doc) return defaultValue;
  
  if (typeof doc.get === 'function') {
    const value = doc.get(prop);
    return value !== undefined ? value : defaultValue;
  }
  
  const value = (doc as any)[prop];
  return value !== undefined ? value : defaultValue;
}


export function hasDocumentProperty(
  doc: Document | null | undefined,
  prop: string
): boolean {
  if (!doc) return false;
  
  if (typeof doc.get === 'function') {
    return doc.get(prop) !== undefined;
  }
  
  return (doc as any)[prop] !== undefined;
}

export function documentToObject<T extends Record<string, any>>(
  doc: Document | null | undefined
): T | null {
  if (!doc) return null;
  
  if (typeof doc.toObject === 'function') {
    return doc.toObject() as T;
  }
  
  return doc as unknown as T;
}


export const docVal = getDocumentValue;

export default {
  getDocumentValue,
  hasDocumentProperty,
  documentToObject,
  docVal
};