/** @type {import('next').NextConfig} */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: appRoot
};

export default nextConfig;
