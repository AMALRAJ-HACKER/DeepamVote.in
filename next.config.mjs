import { networkInterfaces } from 'node:os';

function localDevAddresses() {
  if (process.env.NODE_ENV !== 'development') return [];
  try {
    return Object.values(networkInterfaces()).flatMap(entries =>
      (entries ?? []).filter(entry => entry.family === 'IPv4').map(entry => entry.address)
    );
  } catch {
    // Isolated build environments may deny network-interface enumeration.
    return [];
  }
}

const config = {
  poweredByHeader: false,
  allowedDevOrigins: localDevAddresses(),
  async headers() {
    return [{ source: '/:path*', headers: [
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Content-Security-Policy',value:"frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' https://*.razorpay.com"}
    ]}];
  }
};
export default config;
