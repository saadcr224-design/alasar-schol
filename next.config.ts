import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  typescript: { tsconfigPath: 'tsconfig.next.json' },
  webpack(config, { webpack }) {
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(
      /^@\/lib\/runtime$/, resolve(process.cwd(), 'lib/vercel-runtime.ts')
    ));
    return config;
  },
};

export default nextConfig;
