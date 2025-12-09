export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Hardware Shop',
  currency: process.env.NEXT_PUBLIC_CURRENCY || 'LKR',
  timezone: process.env.NEXT_PUBLIC_TIMEZONE || 'Asia/Colombo',
  allowNegativeStock: process.env.NEXT_PUBLIC_ALLOW_NEGATIVE_STOCK === 'true',
  lowStockThreshold: parseInt(process.env.NEXT_PUBLIC_LOW_STOCK_THRESHOLD || '10'),
  defaultTaxRate: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TAX_RATE || '18'),
};
