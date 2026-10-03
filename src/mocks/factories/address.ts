import type { Faker } from '@faker-js/faker';

import type { Address } from '@/entities/address/types';

const FIXTURE_TIMESTAMP = '2026-01-01T00:00:00Z';

/** A curated address; every field can be overridden. */
export function buildAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: 'address-1',
    receiverName: 'John Jakarta',
    phone: '08123456789',
    addressLine1: 'Jl. Sudirman No. 12',
    addressLine2: 'Lt. 4',
    city: 'Jakarta',
    province: 'DKI Jakarta',
    postalCode: '10110',
    country: 'Indonesia',
    isDefault: true,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  };
}

/** The two addresses the route handler and the E2E session share. */
export function buildAddressList(): Address[] {
  return [
    buildAddress(),
    buildAddress({
      id: 'address-2',
      receiverName: 'Jane Bandung',
      phone: '08765432109',
      addressLine1: 'Jl. Dago No. 45',
      addressLine2: '',
      city: 'Bandung',
      province: 'Jawa Barat',
      postalCode: '40115',
      isDefault: false,
    }),
  ];
}

/** A generated address for the stateful MSW address book. */
export function buildRandomAddress(faker: Faker, overrides: Partial<Address> = {}): Address {
  const timestamp = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    receiverName: faker.person.fullName(),
    phone: faker.phone.number({ style: 'international' }),
    addressLine1: faker.location.streetAddress(),
    addressLine2: faker.location.secondaryAddress(),
    city: faker.location.city(),
    province: faker.location.state(),
    postalCode: faker.location.zipCode(),
    country: 'ID',
    isDefault: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}
