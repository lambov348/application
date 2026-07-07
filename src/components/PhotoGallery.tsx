// Простая галерея фото (ссылки на загруженные файлы).
export default function PhotoGallery({
  photos,
  emptyText = "—",
  alt = "Photo",
}: {
  photos: string[];
  emptyText?: string;
  alt?: string;
}) {
  if (photos.length === 0) {
    return <p className="text-sm text-gray-400">{emptyText}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((src) => (
        <a
          key={src}
          href={src}
          target="_blank"
          rel="noreferrer"
          className="block h-20 w-20 overflow-hidden rounded-lg border border-gray-200"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="h-full w-full object-cover" />
        </a>
      ))}
    </div>
  );
}
