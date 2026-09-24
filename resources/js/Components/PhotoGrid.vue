<script setup>
import { router } from '@inertiajs/vue3';
import { useI18n } from 'vue-i18n';

defineProps({ photos: { type: Array, required: true } });
const { t } = useI18n();

function remove(photo) {
    if (confirm(t('photos.confirm_delete'))) {
        router.delete(route('files.destroy', photo.id), { preserveScroll: true });
    }
}
</script>

<template>
    <p v-if="photos.length === 0" class="text-sm text-muted">{{ $t('photos.empty') }}</p>
    <div v-else class="grid grid-cols-3 gap-2">
        <div v-for="p in photos" :key="p.id" class="relative">
            <a :href="p.url" target="_blank" rel="noopener" class="block aspect-square overflow-hidden rounded-xl bg-soft">
                <img :src="p.preview_url" :alt="p.name" loading="lazy" class="h-full w-full object-cover" />
            </a>
            <button
                v-if="p.can_delete"
                type="button"
                class="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                :aria-label="$t('photos.delete')"
                @click="remove(p)"
            >
                ×
            </button>
        </div>
    </div>
</template>
