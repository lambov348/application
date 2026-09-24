<script setup>
import StatusBadge from '@/Components/StatusBadge.vue';
import { formatDate, formatMoney } from '@/i18n';
import AdminLayout from '@/Layouts/AdminLayout.vue';
import { Link, router } from '@inertiajs/vue3';
import { useI18n } from 'vue-i18n';

const props = defineProps({ client: Object, orders: Array });
const { t } = useI18n();

function destroy() {
    if (confirm(t('common.confirm_delete'))) {
        router.delete(route('admin.clients.destroy', props.client.id));
    }
}
</script>

<template>
    <AdminLayout :title="client.name">
        <div class="mb-6">
            <Link :href="route('admin.clients.index')" class="link text-sm">← {{ $t('clients.title') }}</Link>
            <div class="mt-2 flex flex-wrap items-start justify-between gap-3">
                <h1 class="page-title">{{ client.name }}</h1>
                <div class="flex flex-wrap gap-2">
                    <Link :href="route('admin.orders.create', { client_id: client.id })" class="btn-primary">+ {{ $t('clients.new_order') }}</Link>
                    <Link :href="route('admin.clients.edit', client.id)" class="btn-secondary">{{ $t('common.edit') }}</Link>
                    <button type="button" class="btn-danger" @click="destroy">{{ $t('common.delete') }}</button>
                </div>
            </div>
        </div>

        <div class="grid gap-5 lg:grid-cols-3">
            <div class="flex flex-col gap-5">
                <section class="card flex flex-col gap-2">
                    <h2 class="section-title">{{ $t('clients.contact') }}</h2>
                    <a v-if="client.phone" :href="`tel:${client.phone}`" class="link">{{ client.phone }}</a>
                    <a v-if="client.email" :href="`mailto:${client.email}`" class="link">{{ client.email }}</a>
                    <div class="text-sm"><span class="text-muted">{{ $t('clients.fields.locale') }}:</span> {{ $t(`languages.${client.locale}`) }}</div>
                    <p v-if="client.notes" class="whitespace-pre-line text-sm">{{ client.notes }}</p>
                </section>
                <section class="card">
                    <h2 class="section-title">{{ $t('clients.addresses') }}</h2>
                    <ul v-if="client.addresses.length" class="flex flex-col gap-3">
                        <li v-for="a in client.addresses" :key="a.id">
                            {{ a.line }}
                            <div class="text-sm text-muted">
                                <span v-if="a.floor">{{ $t('orders.floor', { floor: a.floor }) }} · </span>
                                <span v-if="a.has_elevator !== null">{{ a.has_elevator ? $t('orders.elevator_yes') : $t('orders.elevator_no') }}</span>
                            </div>
                            <div v-if="a.parking_note" class="text-sm text-muted">{{ $t('orders.parking', { note: a.parking_note }) }}</div>
                        </li>
                    </ul>
                    <p v-else class="text-muted">{{ $t('clients.no_addresses') }}</p>
                </section>
            </div>

            <section class="card lg:col-span-2">
                <h2 class="section-title">{{ $t('clients.history') }}</h2>
                <p v-if="orders.length === 0" class="text-muted">{{ $t('clients.no_orders') }}</p>
                <ul v-else class="flex flex-col divide-y divide-line">
                    <li v-for="o in orders" :key="o.id">
                        <Link :href="route('admin.orders.show', o.id)" class="flex items-center justify-between gap-3 py-3">
                            <div>
                                <div class="font-semibold">#{{ o.number }} · {{ o.title }}</div>
                                <div class="text-sm text-muted">{{ o.date ? formatDate(o.date) : $t('orders.no_date') }}</div>
                            </div>
                            <div class="flex shrink-0 flex-col items-end gap-1">
                                <StatusBadge :status="o.status" />
                                <span class="text-sm font-semibold">{{ formatMoney(o.price_cents) }}</span>
                            </div>
                        </Link>
                    </li>
                </ul>
            </section>
        </div>
    </AdminLayout>
</template>
