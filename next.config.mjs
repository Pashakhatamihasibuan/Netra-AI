/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // MediaPipe tasks-vision ships .wasm assets that need to be resolved as-is
    config.resolve.extensionAlias = { '.js': ['.js', '.ts', '.tsx'] };
    return config;
  },
};
export default nextConfig;
