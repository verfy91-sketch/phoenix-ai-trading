/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',                 // enable static export
  distDir: 'build',                 // output directly to the 'build' folder
  images: {
    unoptimized: true,              // required for static export
  },
}
module.exports = nextConfig