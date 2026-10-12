# API Refactoring Summary

## Changes Made (2025-12-07)

### Problem

Ada duplikasi dan inkonsistensi antara:

1. Address types di `lib/api/types.ts` (dari API contract)
2. Address entity di `entities/address/` (implementasi internal)

### Solution Implemented

#### 1. **Unified Type System**

- Menghapus duplicate Address interface dari `lib/api/types.ts`
- Menggunakan entity Address sebagai single source of truth
- API contract types sekarang bernama `ApiAddressResponse` (snake_case)

#### 2. **Data Transformation Layer**

Created `/lib/api/mappers/address.ts` dengan fungsi:

- `mapAddressFromApi()` - Transform snake_case API response → camelCase entity
- `mapAddressToApi()` - Transform camelCase entity → snake_case API request
- `mapAddressUpdateToApi()` - Transform partial updates

#### 3. **Updated Services**

`/lib/api/services/address.ts`:

- Menggunakan entity types (Address, AddressInput)
- Automatic transformation dengan mappers
- Return type sekarang konsisten dengan entity

#### 4. **Updated React Hooks**

`/lib/api/hooks.react-query.ts`:

- Import AddressInput dari entity
- Type-safe hooks dengan entity types
- Consistent API surface

#### 5. **Fixed Type Inconsistencies**

- CreateCartResponse: voucher sekarang `string | null | undefined` (bukan mandatory)
- All Address-related types now use entity format

### Files Changed

```
src/lib/api/
├── types.ts                    # ✏️ Updated: Renamed to ApiAddressResponse
├── mappers/
│   ├── address.ts             # ➕ New: Data transformers
│   └── index.ts               # ➕ New: Mapper exports
├── services/
│   └── address.ts             # ✏️ Updated: Use entity types + mappers
├── hooks.react-query.ts       # ✏️ Updated: Import from entity
└── index.ts                   # ✏️ Updated: Export mappers

src/entities/address/
└── types.ts                   # ✏️ Updated: Re-export AddressInput
```

### Benefits

1. **Single Source of Truth**: Address types hanya ada di satu tempat
2. **Clear Separation**: API layer vs Domain layer
3. **Type Safety**: Automatic transformation dengan type checking
4. **Maintainability**: Perubahan entity tidak break API layer
5. **Consistency**: Semua component menggunakan format yang sama

### Breaking Changes

⚠️ **None for existing usage** - Semua public API tetap sama:

```typescript
// Still works the same
import { useAddresses, useCreateAddress } from '@/lib/api';
import type { Address } from '@/lib/api';

const { data } = useAddresses();
const create = useCreateAddress();
await create.mutateAsync({ fullName: '...', ... });
```

### Migration Guide

Jika ada code yang import Address dari lib/api/types:

```typescript
// ❌ Old (now ApiAddressResponse)
import type { Address } from '@/lib/api/types';

// ✅ New (recommended)
import type { Address } from '@/lib/api';
// or
import type { Address } from '@/entities/address/types';
```

### Testing

- ✅ Type checking: Pass
- ✅ Build: Pass
- ✅ All exports working correctly
- ✅ Backwards compatible

### Next Steps

Consider applying same pattern to other entities:

- Cart (if needed)
- Product (if transformation needed)
- Order (if transformation needed)

## Conclusion

Refactoring berhasil menyelesaikan:

- ✅ Type duplication
- ✅ snake_case vs camelCase transformation
- ✅ API contract alignment
- ✅ Maintainability improvement

Architecture sekarang lebih clean dan scalable.
