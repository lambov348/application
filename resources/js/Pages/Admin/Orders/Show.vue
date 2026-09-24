<script setup>
import InputError from '@/Components/InputError.vue';
import OrderChecklist from '@/Components/OrderChecklist.vue';
import OrderComments from '@/Components/OrderComments.vue';
import OrderDocuments from '@/Components/OrderDocuments.vue';
import OrderPhotos from '@/Components/OrderPhotos.vue';
import StatusBadge from '@/Components/StatusBadge.vue';
import { formatDateTime, formatDuration, formatMoney, formatTermin } from '@/i18n';
import AdminLayout from '@/Layouts/AdminLayout.vue';
import { Link, router, useForm, usePage } from '@inertiajs/vue3';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({ order: Object });

const { t } = useI18n();
const page = usePage();
const rejecting = ref(false);
const statusForm = useForm({ status: '', reason: '' });

function move(status) {
    if (status === 'rejected') {
        rejecting.value = true;
        return;
    }
    statusForm.status = status;
    statusForm.reason = '';
    statusForm.post(route('admin.orders.status', props.order.id), { preserveScroll: true });
}

function reject() {
    statusForm.status = 'rejected';
    statusForm.post(route('admin.orders.status', props.order.id), {
        preserveScroll: true,
        onSuccess: () => {
            rejecting.value = false;
            statusForm.reset();
        },
    });
}

function destroy() {
    if (confirm(t('orders.confirm_delete', { number: props.order.number }))) {
        router.delete(route('admin.orders.destroy', props.order.id));
    }
}

const FIELD_LABELS = {
    client_id: 'client', address_id: 'address', title: 'title', description: 'description', date: 'date',
    start_time: 'start_time', end_time: 'end_time', price_cents: 'price', material_cents: 'material',
    source: 'source', offer_no: 'offer_no', payment_status: 'payment_status',
};

function eventText(e) {
    switch (e.type) {
        case 'status_changed':
            return t('orders.events.status_changed', { from: t(`statuses.${e.data.from}`), to: t(`statuses.${e.data.to}`) }) + (e.data.reason ? ` · ${e.data.reason}` : '');
        case 'updated':
            return t('orders.events.updated', {
                fields: Object.keys(e.data.changes).map((f) => (FIELD_LABELS[f] ? t(`orders.fields.${FIELD_LABELS[f]}`) : f)).join(', '),
            });
        case 'worker_assigned':
        case 'worker_unassigned':
        case 'worker_accepted':
        case 'worker_declined':
            return t(`orders.events.${e.type}`, { name: e.data.worker });
        case 'file_uploaded':
        case 'file_deleted':
            return t(`orders.events.${e.type}`, { name: e.data.name ?? t(`files.kinds.${e.data.kind}`) });
        case 'checklist_added':
        case 'checklist_removed':
        case 'checklist_checked':
        case 'checklist_unchecked':
            return t(`orders.events.${e.type}`, { text: e.data.text });
        default:
            return t(`orders.events.${e.type}`);
    }
}
</script>

<template>
    <AdminLayout :title="`#${order.number}`">
        <div class="mb-6">
            <Link :href="route('admin.orders.index')" class="link text-sm">← {{ $t('orders.title') }}</Link>
            <div class="mt-2 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div class="flex flex-wrap items-center gap-3">
                        <h1 class="page-title">#{{ order.number }}</h1>
                        <StatusBadge :status="order.status" />
                    </div>
                    <p class="mt-1 text-muted">{{ order.title }} · {{ order.client.name }}</p>
                </div>
                <div class="flex gap-2">
                    <Link :href="route('admin.orders.edit', order.id)" class="btn-secondary">{{ $t('common.edit') }}</Link>
                    <button type="button" class="btn-danger" @click="destroy">{{ $t('common.delete') }}</button>
                </div>
            </div>
        </div>

        <div class="grid gap-5 lg:grid-cols-3">
            <div class="flex flex-col gap-5 lg:col-span-2">
                <section class="card">
                    <h2 class="section-title">{{ $t('orders.sections.client_object') }}</h2>
                    <dl class="grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt class="text-sm text-muted">{{ $t('orders.fields.client') }}</dt>
                            <dd>
                                <Link :href="route('admin.clients.show', order.client.id)" class="link">{{ order.client.name }}</Link>
                                <div v-if="order.client.phone"><a :href="`tel:${order.client.phone}`">{{ order.client.phone }}</a></div>
                                <div v-if="order.client_email" class="text-sm">{{ order.client_email }}</div>
                            </dd>
                        </div>
                        <div>
                            <dt class="text-sm text-muted">{{ $t('orders.fields.address') }}</dt>
                            <dd v-if="order.address">
                                {{ order.address.line }}
                                <div class="text-sm text-muted">
                                    <span v-if="order.address.floor">{{ $t('orders.floor', { floor: order.address.floor }) }} · </span>
                                    <span v-if="order.address.has_elevator !== null">{{ order.address.has_elevator ? $t('orders.elevator_yes') : $t('orders.elevator_no') }}</span>
                                </div>
                                <div v-if="order.address.parking_note" class="text-sm text-muted">{{ $t('orders.parking', { note: order.address.parking_note }) }}</div>
                            </dd>
                            <dd v-else class="text-muted">{{ $t('orders.no_address') }}</dd>
                        </div>
                    </dl>
                </section>

                <section class="card">
                    <h2 class="section-title">{{ $t('orders.sections.what') }}</h2>
                    <p class="whitespace-pre-line">{{ order.description || $t('common.none') }}</p>
                </section>

                <section class="card grid gap-4 sm:grid-cols-2">
                    <div>
                        <h2 class="section-title">{{ $t('orders.sections.termin') }}</h2>
                        <p v-if="order.date" class="font-semibold">{{ formatTermin(order.date, order.start_time, order.end_time) }}</p>
                        <p v-else class="text-muted">{{ $t('orders.no_date') }}</p>
                    </div>
                    <div>
                        <h2 class="section-title">{{ $t('orders.sections.workers') }}</h2>
                        <ul v-if="order.workers.length" class="flex flex-col gap-1">
                            <li v-for="w in order.workers" :key="w.id">
                                {{ w.name }}
                                <span v-if="w.accepted_at" class="text-xs text-accent">· {{ $t('orders.worker_accepted') }}</span>
                                <span v-else-if="w.declined_at" class="text-xs text-red-700">· {{ $t('orders.worker_declined') }}</span>
                            </li>
                        </ul>
                        <p v-else class="text-muted">{{ $t('common.none') }}</p>
                    </div>
                </section>

                <section class="card">
                    <h2 class="section-title">{{ $t('orders.sections.checklist') }}</h2>
                    <OrderChecklist :order="order" can-manage />
                </section>

                <section class="card">
                    <h2 class="section-title">{{ $t('orders.sections.photos') }}</h2>
                    <OrderPhotos :order="order" />
                    <p v-if="order.next_statuses.includes('completed')" class="mt-3 text-xs text-muted">{{ $t('photos.need_after') }} · {{ order.after_photos }}/2</p>
                </section>

                <section class="card">
                    <h2 class="section-title">{{ $t('orders.sections.files') }}</h2>
                    <OrderDocuments :order="order" can-manage />
                </section>

                <section class="card">
                    <h2 class="section-title">{{ $t('orders.sections.comments') }}</h2>
                    <OrderComments :order="order" />
                </section>

                <section class="card">
                    <h2 class="section-title">{{ $t('orders.sections.history') }}</h2>
                    <ol class="flex flex-col gap-3">
                        <li v-for="e in order.events" :key="e.id" class="flex gap-3 text-sm">
                            <span class="w-32 shrink-0 text-muted">{{ formatDateTime(e.created_at, page.props.timezone) }}</span>
                            <span>{{ eventText(e) }} <span class="text-muted">· {{ e.user ?? $t('orders.events.system') }}</span></span>
                        </li>
                    </ol>
                </section>
            </div>

            <div class="flex flex-col gap-5">
                <section class="card flex flex-col gap-3">
                    <h2 class="section-title">{{ $t('orders.sections.status') }}</h2>
                    <StatusBadge :status="order.status" class="self-start" />
                    <p v-if="order.reject_reason" class="text-sm"><span class="text-muted">{{ $t('orders.reject_reason_label') }}:</span> {{ order.reject_reason }}</p>
                    <template v-if="!rejecting">
                        <button
                            v-for="s in order.next_statuses"
                            :key="s"
                            type="button"
                            :class="s === 'rejected' ? 'btn-danger' : 'btn-primary'"
                            :disabled="statusForm.processing"
                            @click="move(s)"
                        >
                            {{ $t(`orders.actions.${s}`) }}
                        </button>
                    </template>
                    <form v-else class="flex flex-col gap-3" @submit.prevent="reject">
                        <label for="reason" class="label mb-0">{{ $t('orders.reject_reason') }}</label>
                        <textarea id="reason" v-model="statusForm.reason" rows="3" class="input py-2.5" required />
                        <div class="flex gap-2">
                            <button type="submit" class="btn-danger flex-1" :disabled="statusForm.processing">{{ $t('orders.reject_title') }}</button>
                            <button type="button" class="btn-secondary" @click="rejecting = false">{{ $t('common.cancel') }}</button>
                        </div>
                    </form>
                    <p v-if="order.next_statuses.includes('completed')" class="text-xs text-muted">{{ $t('orders.completed_hint') }}</p>
                    <InputError :message="statusForm.errors.status || statusForm.errors.reason" />
                </section>

                <section class="card flex flex-col gap-2">
                    <h2 class="section-title">{{ $t('orders.sections.hours') }}</h2>
                    <p v-if="order.hours.length === 0" class="text-sm text-muted">{{ $t('hours.none') }}</p>
                    <div v-for="h in order.hours" :key="h.worker" class="flex justify-between gap-2">
                        <span>{{ h.worker }} <span v-if="h.running" class="text-xs text-accent">· {{ $t('hours.running') }}</span></span>
                        <span class="font-semibold">{{ formatDuration(h.seconds) }}</span>
                    </div>
                </section>

                <section class="card flex flex-col gap-3">
                    <h2 class="section-title">{{ $t('orders.sections.money') }}</h2>
                    <div class="flex justify-between"><span class="text-muted">{{ $t('orders.money.price') }}</span><span class="font-display font-semibold">{{ formatMoney(order.price_cents) }}</span></div>
                    <div class="flex justify-between"><span class="text-muted">{{ $t('orders.money.material') }}</span><span>{{ formatMoney(order.material_cents) }}</span></div>
                    <div class="flex justify-between"><span class="text-muted">{{ $t('orders.fields.payment_status') }}</span><span>{{ $t(`payment.${order.payment_status}`) }}</span></div>
                    <div v-if="order.offer_no" class="flex justify-between"><span class="text-muted">{{ $t('orders.fields.offer_no') }}</span><span>{{ order.offer_no }}</span></div>
                    <div v-if="order.source" class="flex justify-between"><span class="text-muted">{{ $t('orders.fields.source') }}</span><span>{{ order.source }}</span></div>
                </section>
            </div>
        </div>
    </AdminLayout>
</template>
