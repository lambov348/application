<script setup>
import Icon from '@/Components/Icon.vue';
import StatusBadge from '@/Components/StatusBadge.vue';
import { formatTermin } from '@/i18n';
import WorkerLayout from '@/Layouts/WorkerLayout.vue';
import { Link } from '@inertiajs/vue3';

defineProps({ orders: Array });
</script>

<template>
    <WorkerLayout :title="$t('worker.my_orders')">
        <h1 class="page-title mb-4">{{ $t('worker.my_orders') }}</h1>
        <div v-if="orders.length === 0" class="card text-center text-muted">{{ $t('worker.empty') }}</div>
        <div class="flex flex-col gap-3">
            <Link v-for="o in orders" :key="o.id" :href="route('worker.orders.show', o.id)" class="card flex flex-col gap-2">
                <div class="flex items-start justify-between gap-2">
                    <span class="font-display text-[15px] font-semibold">{{ o.title }}</span>
                    <StatusBadge :status="o.status" />
                </div>
                <div class="flex items-center gap-2 text-sm">
                    <Icon name="calendar" :size="16" class="text-muted" />
                    {{ o.date ? formatTermin(o.date, o.start_time, o.end_time, { weekday: 'short', day: '2-digit', month: '2-digit' }) : $t('orders.no_date') }}
                </div>
                <div v-if="o.address" class="flex items-center gap-2 text-sm text-muted">
                    <Icon name="pin" :size="16" />{{ o.address }}
                </div>
                <div class="text-xs text-muted">#{{ o.number }} · {{ o.client }}</div>
            </Link>
        </div>
    </WorkerLayout>
</template>
