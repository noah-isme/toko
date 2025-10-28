export const isMock = () => (process.env.NEXT_PUBLIC_API_URL ?? 'mock') === 'mock';
