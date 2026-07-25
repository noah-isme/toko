export interface Address {
  id: string;
  receiverName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Re-export from schemas for convenience
export type { AddressInput, AddressUpdateInput } from './schemas';
