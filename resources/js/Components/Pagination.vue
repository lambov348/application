<script setup>
import { Link } from '@inertiajs/vue3';

defineProps({ paginator: { type: Object, required: true } });
</script>

<template>
    <nav v-if="paginator.last_page > 1" class="mt-4 flex items-center justify-between gap-3 text-sm">
        <Link v-if="paginator.prev_page_url" :href="paginator.prev_page_url" preserve-scroll class="btn-secondary">{{ $t('common.previous') }}</Link>
        <span v-else />
        <span class="text-muted">{{ paginator.current_page }} / {{ paginator.last_page }}</span>
        <Link v-if="paginator.next_page_url" :href="paginator.next_page_url" preserve-scroll class="btn-secondary">{{ $t('common.next') }}</Link>
        <span v-else />
    </nav>
</template>
