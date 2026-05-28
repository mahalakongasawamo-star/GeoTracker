/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@geotracker/shared"],
  webpack: (config) => {
    // @geotracker/shared uses the ESM-bundler convention of suffixing
    // relative imports with `.js` in TypeScript source (`export * from
    // "./scoring.js"`). Next.js's webpack doesn't try `.ts`/`.tsx` for a
    // `.js` import on its own; without this alias, value imports (not
    // type-only) from the workspace package fail to resolve at build.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
