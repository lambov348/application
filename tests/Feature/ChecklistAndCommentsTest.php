<?php

use App\Enums\OrderStatus;
use App\Models\ChecklistItem;
use App\Models\Company;
use App\Models\OrderComment;

beforeEach(function () {
    $this->company = Company::factory()->create();
    $this->owner = owner($this->company);
    $this->worker = worker($this->company);
    $this->order = order($this->company, [$this->worker], OrderStatus::InProgress);
});

test('the owner builds the checklist', function () {
    $this->actingAs($this->owner);
    $this->post("/orders/{$this->order->id}/checklist", ['text' => 'Demontage alte Küche'])->assertSessionHasNoErrors();
    $this->post("/orders/{$this->order->id}/checklist", ['text' => 'Unterschränke, 7 Stück']);

    expect($this->order->checklist()->pluck('text')->all())->toBe(['Demontage alte Küche', 'Unterschränke, 7 Stück']);

    $this->delete('/checklist/'.$this->order->checklist()->first()->id);
    expect($this->order->checklist()->count())->toBe(1)
        ->and($this->order->events()->pluck('type')->all())->toContain('checklist_added', 'checklist_removed');
});

test('workers cannot change the checklist, only tick it', function () {
    $item = $this->order->checklist()->create(['text' => 'Spüle einsetzen']);

    $this->actingAs($this->worker);
    $this->post("/orders/{$this->order->id}/checklist", ['text' => 'X'])->assertForbidden();
    $this->delete("/checklist/{$item->id}")->assertForbidden();

    $this->post("/checklist/{$item->id}/toggle")->assertRedirect();
    $item->refresh();
    expect($item->done_by)->toBe($this->worker->id)->and($item->done_at)->not->toBeNull();

    $this->post("/checklist/{$item->id}/toggle");
    expect($item->fresh()->done_at)->toBeNull();
});

test('only people on the order can tick its checklist', function () {
    $item = $this->order->checklist()->create(['text' => 'Spüle einsetzen']);

    $this->actingAs(worker($this->company))->post("/checklist/{$item->id}/toggle")->assertForbidden();
    $this->actingAs(owner())->post("/checklist/{$item->id}/toggle")->assertNotFound();

    expect($item->fresh()->done_at)->toBeNull();
});

test('workers and owner exchange remarks on the order', function () {
    $this->actingAs($this->worker)
        ->post("/orders/{$this->order->id}/comments", ['text' => 'Kunde möchte andere Griffe'])
        ->assertSessionHasNoErrors();

    $this->actingAs($this->owner)
        ->get("/admin/orders/{$this->order->id}")
        ->assertInertia(fn ($page) => $page
            ->where('order.comments.0.text', 'Kunde möchte andere Griffe')
            ->where('order.comments.0.user', $this->worker->name));

    expect($this->order->events()->where('type', 'comment_added')->exists())->toBeTrue();
});

test('people outside the order cannot write remarks', function () {
    $this->actingAs(worker($this->company))->post("/orders/{$this->order->id}/comments", ['text' => 'x'])->assertForbidden();
    $this->actingAs(owner())->post("/orders/{$this->order->id}/comments", ['text' => 'x'])->assertNotFound();

    expect(OrderComment::count())->toBe(0)->and(ChecklistItem::count())->toBe(0);
});
