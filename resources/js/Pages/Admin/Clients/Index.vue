<script setup>
import Icon from '@/Components/Icon.vue';
import Pagination from '@/Components/Pagination.vue';
import AdminLayout from '@/Layouts/AdminLayout.vue';
import { Link, router } from '@inertiajs/vue3';
import { ref, watch } from 'vue';

const props = defineProps({ clients: Object, filters: Object });

const q = ref(props.filters.q ?? '');
let timer;
watch(q, (value) => {
    clearTimeout(timer);
    timer = setTimeout(() => router.get(route('admin.clients.index'), { q: value || undefined }, { preserveState: true, replace: true }), 300);
});
</script>

<template>
    <AdminLayout :title="$t('clients.title')">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 class="page-title">{{ $t('clients.title') }}</h1>
            <Link :href="route('admin.clients.create')" class="btn-primary"><Icon name="plus" />{{ $t('clients.new') }}</Link>
        </div>

        <input v-model="q" type="search" class="input mb-5" :placeholder="$t('clients.search_placeholder')" :aria-label="$t('common.search')" />

        <div v-if="clients.data.length === 0" class="card text-center text-muted">{{ $t('clients.empty') }}</div>
        <div v-else class="flex flex-col divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
            <Link v-for="c in clients.data" :key="c.id" :href="route('admin.clients.show', c.id)" class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-soft">
                <div class="min-w-0">
                    <div class="font-semibold">{{ c.name }}</div>
                    <div class="truncate text-sm text-muted">{{ [c.phone, c.email, c.address].filter(Boolean).join(' · ') }}</div>
                </div>
                <div class="shrink-0 text-right text-sm">
                    <div class="font-semibold">{{ c.orders_count }}</div>
                    <div class="text-muted">{{ $t('clients.orders_count') }}</div>
                </div>
            </Link>
        </div>

        <Pagination :paginator="clients" />
    </AdminLayout>
</template>
