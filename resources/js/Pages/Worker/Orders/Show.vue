<script setup>
import Icon from '@/Components/Icon.vue';
import StatusBadge from '@/Components/StatusBadge.vue';
import { formatTermin } from '@/i18n';
import WorkerLayout from '@/Layouts/WorkerLayout.vue';
import { Link } from '@inertiajs/vue3';
import { computed } from 'vue';

const props = defineProps({ order: Object });

const mapsUrl = computed(() =>
    props.order.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.order.address.line)}` : null,
);
</script>

<template>
    <WorkerLayout :title="order.title">
        <Link :href="route('worker.orders.index')" class="link text-sm">← {{ $t('worker.my_orders') }}</Link>
        <div class="mb-4 mt-2 flex items-start justify-between gap-3">
            <div>
                <h1 class="page-title">{{ order.title }}</h1>
                <div class="text-sm text-muted">#{{ order.number }}</div>
            </div>
            <StatusBadge :status="order.status" />
        </div>

        <div class="flex flex-col gap-4">
            <section class="card">
                <h2 class="section-title">{{ $t('orders.sections.termin') }}</h2>
                <p class="font-semibold">{{ order.date ? formatTermin(order.date, order.start_time, order.end_time) : $t('orders.no_date') }}</p>
            </section>

            <section class="card flex flex-col gap-3">
                <h2 class="section-title">{{ $t('orders.sections.client_object') }}</h2>
                <div>
                    <div class="font-semibold">{{ order.client.name }}</div>
                    <template v-if="order.address">
                        <div>{{ order.address.line }}</div>
                        <div class="text-sm text-muted">
                            <span v-if="order.address.floor">{{ $t('orders.floor', { floor: order.address.floor }) }} · </span>
                            <span v-if="order.address.has_elevator !== null">{{ order.address.has_elevator ? $t('orders.elevator_yes') : $t('orders.elevator_no') }}</span>
                        </div>
                        <div v-if="order.address.parking_note" class="text-sm text-muted">{{ $t('orders.parking', { note: order.address.parking_note }) }}</div>
                    </template>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <a v-if="order.client.phone" :href="`tel:${order.client.phone}`" class="btn-secondary"><Icon name="phone" />{{ $t('worker.call') }}</a>
                    <a v-if="mapsUrl" :href="mapsUrl" target="_blank" rel="noopener" class="btn-secondary"><Icon name="pin" />{{ $t('worker.route') }}</a>
                </div>
            </section>

            <section class="card">
                <h2 class="section-title">{{ $t('orders.sections.what') }}</h2>
                <p class="whitespace-pre-line">{{ order.description || $t('common.none') }}</p>
            </section>

            <section class="card">
                <h2 class="section-title">{{ $t('worker.team') }}</h2>
                <ul class="flex flex-col gap-2">
                    <li v-for="w in order.workers" :key="w.id" class="flex items-center justify-between">
                        <span>{{ w.name }}</span>
                        <a v-if="w.phone" :href="`tel:${w.phone}`" class="link text-sm">{{ w.phone }}</a>
                    </li>
                </ul>
            </section>
        </div>
    </WorkerLayout>
</template>
