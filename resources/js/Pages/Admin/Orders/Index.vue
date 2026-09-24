<script setup>
import Icon from '@/Components/Icon.vue';
import Pagination from '@/Components/Pagination.vue';
import StatusBadge from '@/Components/StatusBadge.vue';
import { formatDate, formatMoney, formatTermin, formatTimeRange } from '@/i18n';
import AdminLayout from '@/Layouts/AdminLayout.vue';
import { Link, router } from '@inertiajs/vue3';
import { ref } from 'vue';

const props = defineProps({
    orders: Object,
    filters: Object,
    counts: Object,
});

const statuses = ['new', 'scheduled', 'confirmed', 'in_progress', 'completed', 'paid', 'rejected'];
const q = ref(props.filters.q ?? '');

function apply(status = props.filters.status) {
    router.get(route('admin.orders.index'), { status: status || undefined, q: q.value || undefined }, { preserveState: true, replace: true });
}
</script>

<template>
    <AdminLayout :title="$t('orders.title')">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 class="page-title">{{ $t('orders.title') }}</h1>
            <Link :href="route('admin.orders.create')" class="btn-primary"><Icon name="plus" />{{ $t('orders.new') }}</Link>
        </div>

        <form class="mb-4 flex gap-2" @submit.prevent="apply()">
            <input v-model="q" type="search" class="input" :placeholder="$t('orders.search_placeholder')" :aria-label="$t('common.search')" />
            <button type="submit" class="btn-secondary">{{ $t('common.search') }}</button>
        </form>

        <div class="mb-5 flex gap-2 overflow-x-auto pb-1">
            <button type="button" class="btn shrink-0 border" :class="!filters.status ? 'border-ink bg-ink text-white' : 'border-line bg-white'" @click="apply(null)">
                {{ $t('common.all') }}
            </button>
            <button
                v-for="s in statuses"
                :key="s"
                type="button"
                class="btn shrink-0 border"
                :class="filters.status === s ? 'border-ink bg-ink text-white' : 'border-line bg-white'"
                @click="apply(s)"
            >
                {{ $t(`statuses.${s}`) }}
                <span class="text-xs opacity-70">{{ counts[s] ?? 0 }}</span>
            </button>
        </div>

        <div v-if="orders.data.length === 0" class="card text-center text-muted">{{ $t('orders.empty') }}</div>

        <!-- Desktop table -->
        <div v-else class="hidden overflow-hidden rounded-card border border-line bg-white md:block">
            <table class="w-full text-left text-sm">
                <thead class="border-b border-line text-xs uppercase tracking-wider text-muted">
                    <tr>
                        <th class="px-4 py-3 font-semibold">{{ $t('orders.fields.number') }}</th>
                        <th class="px-4 py-3 font-semibold">{{ $t('orders.fields.date') }}</th>
                        <th class="px-4 py-3 font-semibold">{{ $t('orders.fields.client') }}</th>
                        <th class="px-4 py-3 font-semibold">{{ $t('orders.fields.workers') }}</th>
                        <th class="px-4 py-3 font-semibold">{{ $t('orders.fields.status') }}</th>
                        <th class="px-4 py-3 text-right font-semibold">{{ $t('orders.fields.sum') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="order in orders.data" :key="order.id" class="cursor-pointer border-b border-line last:border-0 hover:bg-soft" @click="router.visit(route('admin.orders.show', order.id))">
                        <td class="px-4 py-3">
                            <Link :href="route('admin.orders.show', order.id)" class="font-semibold" @click.stop>#{{ order.number }}</Link>
                            <div class="text-muted">{{ order.title }}</div>
                        </td>
                        <td class="whitespace-nowrap px-4 py-3">
                            <template v-if="order.date">{{ formatDate(order.date) }}<div class="text-muted">{{ formatTimeRange(order.start_time, order.end_time) }}</div></template>
                            <span v-else class="text-muted">{{ $t('orders.no_date') }}</span>
                        </td>
                        <td class="px-4 py-3">{{ order.client }}<div class="text-muted">{{ order.address }}</div></td>
                        <td class="px-4 py-3">{{ order.workers.join(', ') || $t('common.none') }}</td>
                        <td class="px-4 py-3"><StatusBadge :status="order.status" /></td>
                        <td class="whitespace-nowrap px-4 py-3 text-right font-semibold">{{ formatMoney(order.price_cents) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Mobile cards -->
        <div class="flex flex-col gap-3 md:hidden">
            <Link v-for="order in orders.data" :key="order.id" :href="route('admin.orders.show', order.id)" class="card flex flex-col gap-2">
                <div class="flex items-start justify-between gap-2">
                    <span class="font-semibold">#{{ order.number }}</span>
                    <StatusBadge :status="order.status" />
                </div>
                <div>{{ order.title }}</div>
                <div class="text-sm text-muted">{{ order.client }} · {{ order.address }}</div>
                <div class="flex justify-between text-sm">
                    <span>{{ order.date ? formatTermin(order.date, order.start_time, order.end_time) : $t('orders.no_date') }}</span>
                    <span class="font-semibold">{{ formatMoney(order.price_cents) }}</span>
                </div>
            </Link>
        </div>

        <Pagination :paginator="orders" />
    </AdminLayout>
</template>
