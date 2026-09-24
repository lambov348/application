<?php

use App\Enums\OrderStatus;
use App\Models\Company;
use App\Models\OrderFile;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

beforeEach(function () {
    Storage::fake('local');
    $this->company = Company::factory()->create();
    $this->worker = worker($this->company);
    $this->order = order($this->company, [$this->worker], OrderStatus::InProgress);
});

function signedFileUrl(OrderFile $file, array $extra = []): string
{
    return URL::temporarySignedRoute('files.show', now()->addMinutes(30), ['file' => $file->id, ...$extra], absolute: false);
}

test('a worker uploads a photo; a preview of at most 2000 px is made', function () {
    $this->actingAs($this->worker)
        ->postJson("/orders/{$this->order->id}/files", ['kind' => 'after', 'file' => UploadedFile::fake()->image('kitchen.jpg', 4000, 3000)])
        ->assertNoContent();

    $file = OrderFile::sole();
    expect($file->kind->value)->toBe('after')
        ->and($file->uploaded_by)->toBe($this->worker->id)
        ->and($file->original_name)->toBe('kitchen.jpg');
    Storage::disk('local')->assertExists([$file->path, $file->thumb_path]);

    [$width, $height] = getimagesizefromstring(Storage::disk('local')->get($file->thumb_path));
    expect($width)->toBe(2000)->and($height)->toBe(1500)
        ->and($this->order->events()->where('type', 'file_uploaded')->exists())->toBeTrue();
});

test('photos must be images', function () {
    $this->actingAs($this->worker)
        ->postJson("/orders/{$this->order->id}/files", ['kind' => 'before', 'file' => UploadedFile::fake()->create('x.pdf', 100, 'application/pdf')])
        ->assertUnprocessable();
});

test('only the owner adds plans and documents', function () {
    $pdf = fn () => UploadedFile::fake()->create('Kuechenplan.pdf', 200, 'application/pdf');

    $this->actingAs($this->worker)->post("/orders/{$this->order->id}/files", ['kind' => 'plan', 'file' => $pdf()])->assertForbidden();
    $this->actingAs(owner($this->company))->post("/orders/{$this->order->id}/files", ['kind' => 'plan', 'file' => $pdf()])->assertSessionHasNoErrors();

    expect(OrderFile::sole()->thumb_path)->toBeNull();
});

test('a worker cannot upload to an order of a colleague', function () {
    $this->actingAs(worker($this->company))
        ->postJson("/orders/{$this->order->id}/files", ['kind' => 'after', 'file' => UploadedFile::fake()->image('a.jpg')])
        ->assertForbidden();
});

test('files are only served through a valid temporary link', function () {
    $file = OrderFile::factory()->create(['order_id' => $this->order->id]);
    Storage::disk('local')->put($file->path, 'jpeg-bytes');

    $this->actingAs($this->worker);
    $this->get("/files/{$file->id}")->assertForbidden();
    $this->get(signedFileUrl($file))->assertOk();

    $this->travel(31)->minutes();
    $this->get(signedFileUrl($file))->assertOk(); // a fresh link works
});

test('an expired link does not work', function () {
    $file = OrderFile::factory()->create(['order_id' => $this->order->id]);
    Storage::disk('local')->put($file->path, 'jpeg-bytes');
    $url = signedFileUrl($file);

    $this->travel(31)->minutes();

    $this->actingAs($this->worker)->get($url)->assertForbidden();
});

test('a valid link does not help people without access', function () {
    $file = OrderFile::factory()->create(['order_id' => $this->order->id]);
    Storage::disk('local')->put($file->path, 'jpeg-bytes');
    $url = signedFileUrl($file);

    $this->actingAs(worker($this->company))->get($url)->assertForbidden();
    $this->actingAs(owner())->get($url)->assertNotFound(); // other company
    auth()->logout();
    $this->get($url)->assertRedirect('/login');
});

test('the order page hands out temporary links', function () {
    $file = OrderFile::factory()->create(['order_id' => $this->order->id]);

    $this->actingAs($this->worker)
        ->get("/worker/orders/{$this->order->id}")
        ->assertInertia(fn ($page) => $page
            ->where('order.files.0.id', $file->id)
            ->where('order.files.0.url', fn ($url) => str_contains($url, 'signature=') && str_contains($url, 'expires=')));
});

test('a worker deletes only their own photos and only while the order is open', function () {
    $mine = OrderFile::factory()->create(['order_id' => $this->order->id, 'uploaded_by' => $this->worker->id]);
    $colleague = worker($this->company);
    $this->order->workers()->attach($colleague->id);
    $theirs = OrderFile::factory()->create(['order_id' => $this->order->id, 'uploaded_by' => $colleague->id]);

    $this->actingAs($this->worker);
    $this->delete("/files/{$theirs->id}")->assertForbidden();
    $this->delete("/files/{$mine->id}")->assertRedirect();
    expect($mine->fresh()->trashed())->toBeTrue();

    $late = OrderFile::factory()->create(['order_id' => $this->order->id, 'uploaded_by' => $this->worker->id]);
    $this->order->forceFill(['status' => OrderStatus::Completed])->save();
    $this->delete("/files/{$late->id}")->assertForbidden();
});
