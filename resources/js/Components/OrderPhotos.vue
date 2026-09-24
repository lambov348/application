<script setup>
import PhotoGrid from '@/Components/PhotoGrid.vue';
import PhotoUploader from '@/Components/PhotoUploader.vue';
import { computed } from 'vue';

const props = defineProps({
    order: { type: Object, required: true },
    canUpload: { type: Boolean, default: true },
});

const before = computed(() => props.order.files.filter((f) => f.kind === 'before'));
const after = computed(() => props.order.files.filter((f) => f.kind === 'after'));
</script>

<template>
    <div class="grid gap-5 sm:grid-cols-2">
        <div class="flex flex-col gap-3">
            <h3 class="font-semibold">{{ $t('photos.before') }} <span class="text-sm font-normal text-muted">· {{ before.length }}</span></h3>
            <PhotoGrid :photos="before" />
            <PhotoUploader v-if="canUpload" :order-id="order.id" kind="before" />
        </div>
        <div class="flex flex-col gap-3">
            <h3 class="font-semibold">{{ $t('photos.after') }} <span class="text-sm font-normal text-muted">· {{ after.length }}</span></h3>
            <PhotoGrid :photos="after" />
            <PhotoUploader v-if="canUpload" :order-id="order.id" kind="after" />
        </div>
    </div>
</template>
