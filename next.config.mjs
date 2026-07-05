/** @type {import('next').NextConfig} */
const nextConfig = {
  // Разрешаем чуть больший размер тела запроса для загрузки фото в Server Actions.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
