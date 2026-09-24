<?php

namespace App\Services;

use App\Enums\OrderFileKind;
use App\Models\Order;
use App\Models\OrderFile;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

/**
 * Order files live on the private disk and are only served through the app.
 */
class OrderFiles
{
    public const DISK = 'local';

    public const PREVIEW_SIZE = 2000;

    public function store(Order $order, UploadedFile $upload, OrderFileKind $kind, User $by): OrderFile
    {
        $dir = "orders/{$order->id}";
        $name = (string) Str::uuid();
        $ext = strtolower($upload->guessExtension() ?: $upload->getClientOriginalExtension() ?: 'bin');

        $path = $upload->storeAs($dir, "{$name}.{$ext}", self::DISK);
        $thumbPath = null;

        if (str_starts_with((string) $upload->getMimeType(), 'image/')) {
            // Upright (EXIF) and at most ~2000 px, re-encoded as JPEG.
            $image = (new ImageManager(new Driver))->read($upload->getRealPath());
            $image->scaleDown(self::PREVIEW_SIZE, self::PREVIEW_SIZE);
            $thumbPath = "{$dir}/{$name}_preview.jpg";
            Storage::disk(self::DISK)->put($thumbPath, (string) $image->toJpeg(82));
        }

        $file = $order->files()->create([
            'uploaded_by' => $by->id,
            'kind' => $kind,
            'path' => $path,
            'thumb_path' => $thumbPath,
            'size_bytes' => $upload->getSize(),
            'mime' => $upload->getMimeType(),
            'original_name' => mb_substr($upload->getClientOriginalName(), 0, 255),
        ]);

        $order->logEvent('file_uploaded', ['kind' => $kind->value, 'name' => $file->original_name]);

        return $file;
    }

    public function delete(OrderFile $file): void
    {
        $file->delete(); // soft delete; the stored file stays for the history
        $file->order->logEvent('file_deleted', ['kind' => $file->kind->value, 'name' => $file->original_name]);
    }
}
