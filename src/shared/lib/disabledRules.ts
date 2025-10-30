export type DisabledReasonCode =
  | 'ready'
  | 'processing'
  | 'missing-address'
  | 'missing-shipping-option'
  | 'missing-order-draft'
  | 'missing-order-id'
  | 'unknown';

export interface DisabledRuleResult {
  disabled: boolean;
  reasonCode: DisabledReasonCode;
  message: string;
}

const FALLBACK_MESSAGE = 'Lengkapi data yang diperlukan.';

export interface CheckoutProceedRuleOptions {
  hasAddress: boolean;
  hasShippingOption: boolean;
  isProcessing?: boolean;
}

export function getCheckoutProceedRule({
  hasAddress,
  hasShippingOption,
  isProcessing = false,
}: CheckoutProceedRuleOptions): DisabledRuleResult {
  if (isProcessing) {
    return {
      disabled: true,
      reasonCode: 'processing',
      message: 'Sedang memproses pilihan Anda…',
    };
  }

  if (!hasAddress) {
    return {
      disabled: true,
      reasonCode: 'missing-address',
      message: 'Lengkapi alamat pengiriman terlebih dahulu.',
    };
  }

  if (!hasShippingOption) {
    return {
      disabled: true,
      reasonCode: 'missing-shipping-option',
      message: 'Pilih opsi pengiriman untuk melanjutkan.',
    };
  }

  return {
    disabled: false,
    reasonCode: 'ready',
    message: '',
  };
}

export interface PayNowRuleOptions {
  hasOrderDraft: boolean;
  hasOrderId: boolean;
  isProcessing?: boolean;
}

export function getPayNowRule({
  hasOrderDraft,
  hasOrderId,
  isProcessing = false,
}: PayNowRuleOptions): DisabledRuleResult {
  if (isProcessing) {
    return {
      disabled: true,
      reasonCode: 'processing',
      message: 'Pembayaran sedang diproses…',
    };
  }

  if (!hasOrderId) {
    return {
      disabled: true,
      reasonCode: 'missing-order-id',
      message: 'Order ID tidak ditemukan. Periksa ulang tautan Anda.',
    };
  }

  if (!hasOrderDraft) {
    return {
      disabled: true,
      reasonCode: 'missing-order-draft',
      message: 'Draft pesanan tidak tersedia. Kembali ke langkah sebelumnya.',
    };
  }

  return {
    disabled: false,
    reasonCode: 'ready',
    message: '',
  };
}

export function normalizeDisabledMessage(result: DisabledRuleResult): DisabledRuleResult {
  if (!result.disabled) {
    return result;
  }

  if (!result.message) {
    return {
      ...result,
      message: FALLBACK_MESSAGE,
      reasonCode: result.reasonCode ?? 'unknown',
    };
  }

  return result;
}
