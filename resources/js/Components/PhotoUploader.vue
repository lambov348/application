<script setup>
import { router } from '@inertiajs/vue3';
import axios from 'axios';
import { computed, ref } from 'vue';

// Uploads photos one by one; each photo is retried on a broken connection.
const props = defineProps({
    orderId: { type: Number, required: true },
    kind: { type: String, required: true },
});

const input = ref(null);
const queue = ref([]); // { file, state: 'waiting' | 'uploading' | 'done' | 'failed', error }
const busy = ref(false);

const done = computed(() => queue.value.filter((i) => i.state === 'done').length);
const failed = computed(() => queue.value.filter((i) => i.state === 'failed'));

const RETRY_DELAYS = [1000, 3000, 8000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function uploadOne(item) {
    item.state = 'uploading';
    for (let attempt = 0; ; attempt++) {
        try {
            const data = new FormData();
            data.append('kind', props.kind);
            data.append('file', item.file);
            await axios.post(route('orders.files.store', props.orderId), data, { headers: { Accept: 'application/json' } });
            item.state = 'done';
            return;
        } catch (e) {
            const status = e.response?.status;
            // Validation or permission errors will not get better by retrying.
            if ((status && status < 500 && status !== 408 && status !== 429) || attempt >= RETRY_DELAYS.length) {
                item.state = 'failed';
                item.error = e.response?.data?.errors?.file?.[0] ?? e.response?.data?.message ?? null;
                return;
            }
            await sleep(RETRY_DELAYS[attempt]);
        }
    }
}

async function run() {
    if (busy.value) return;
    busy.value = true;
    for (const item of queue.value) {
        if (item.state === 'waiting') await uploadOne(item);
    }
    busy.value = false;
    router.reload({ only: ['order'], preserveScroll: true });
    if (failed.value.length === 0) queue.value = [];
}

function picked(event) {
    queue.value.push(...[...event.target.files].map((file) => ({ file, state: 'waiting', error: null })));
    event.target.value = '';
    run();
}

function retry() {
    failed.value.forEach((i) => (i.state = 'waiting'));
    run();
}
</script>

<template>
    <div class="flex flex-col gap-2">
        <input ref="input" type="file" accept="image/*" multiple class="hidden" @change="picked" />
        <button type="button" class="btn-secondary w-full" :disabled="busy" @click="input.click()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
            {{ $t('photos.add') }}
        </button>
        <p v-if="busy" class="text-sm text-muted" role="status">{{ $t('photos.uploading', { done: done + 1 > queue.length ? queue.length : done + 1, total: queue.length }) }}</p>
        <div v-if="!busy && failed.length" class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
            <p>{{ $t('photos.failed', { count: failed.length }) }}</p>
            <p v-for="(f, i) in failed.filter((f) => f.error)" :key="i" class="text-xs">{{ f.file.name }}: {{ f.error }}</p>
            <button type="button" class="link mt-1 text-red-800 underline" @click="retry">{{ $t('photos.retry') }}</button>
        </div>
    </div>
</template>
