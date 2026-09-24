<?php

namespace App\Http\Controllers;

use App\Enums\OrderFileKind;
use App\Models\Order;
use App\Models\OrderFile;
use App\Services\OrderFiles;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderFileController extends Controller
{
    private const PHOTO_KINDS = [OrderFileKind::Before, OrderFileKind::After];

    /** One file per request, so the phone can retry each photo on its own. */
    public function store(Request $request, Order $order, OrderFiles $files): RedirectResponse|Response
    {
        Gate::authorize('contribute', $order);

        $kind = OrderFileKind::tryFrom((string) $request->input('kind'));
        $isPhoto = in_array($kind, self::PHOTO_KINDS, true);

        // Plans and documents are added by the owner only.
        if ($kind && ! $isPhoto) {
            Gate::authorize('manageContent', $order);
        }

        $request->validate([
            'kind' => ['required', Rule::enum(OrderFileKind::class)],
            'file' => $isPhoto
                ? ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:25600']
                : ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx,dwg,txt', 'max:51200'],
        ]);

        $files->store($order, $request->file('file'), $kind, $request->user());

        return $request->expectsJson() ? response()->noContent() : back();
    }

    /** Only reachable through a temporary signed link issued to someone allowed to see the order. */
    public function show(Request $request, OrderFile $file): StreamedResponse
    {
        abort_if($file->order === null, 404);
        Gate::authorize('view', $file);

        $path = $request->boolean('preview') && $file->thumb_path ? $file->thumb_path : $file->path;
        $name = $file->original_name ?: basename($file->path);

        return Storage::disk(OrderFiles::DISK)->response($path, $name, [
            'Cache-Control' => 'private, max-age=1800',
        ], $request->boolean('download') ? 'attachment' : 'inline');
    }

    public function destroy(OrderFile $file, OrderFiles $files): RedirectResponse
    {
        abort_if($file->order === null, 404);
        Gate::authorize('delete', $file);

        $files->delete($file);

        return back();
    }
}
