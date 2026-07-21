/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // cheerio грузится только на сервере — оставляем его вне клиентского бандла.
  serverExternalPackages: ["cheerio"],
  // В репозитории несколько lockfile'ов — явно фиксируем корень этого проекта.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
