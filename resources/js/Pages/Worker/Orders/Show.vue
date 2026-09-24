<script setup>
import Icon from '@/Components/Icon.vue';
import InputError from '@/Components/InputError.vue';
import OrderChecklist from '@/Components/OrderChecklist.vue';
import OrderComments from '@/Components/OrderComments.vue';
import OrderDocuments from '@/Components/OrderDocuments.vue';
import OrderPhotos from '@/Components/OrderPhotos.vue';
import StatusBadge from '@/Components/StatusBadge.vue';
import { useNow } from '@/Composables/useNow';
import { formatDuration, formatTermin } from '@/i18n';
import WorkerLayout from '@/Layouts/WorkerLayout.vue';
import { Link, router, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({ order: Object, shift_open: Boolean });

const page = usePage();
const { t } = useI18n();
const now = useNow();

const mapsUrl = computed(() =>
    props.order.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.order.address.line)}` : null,
);
const running = computed(() => !!props.order.me.running_since);
const mySeconds = computed(() => props.order.me.seconds + (running.value ? (now.value - new Date(props.order.me.running_since)) / 1000 : 0));
const needsAnswer = computed(() => !props.order.me.accepted_at && ['scheduled', 'confirmed', 'in_progress'].includes(props.order.status));
const canDecline = computed(() => !props.order.me.declined_at && ['scheduled', 'confirmed'].includes(props.order.status));
const canWork = computed(() => ['confirmed', 'in_progress'].includes(props.order.status) && !!props.order.me.accepted_at);
const canComplete = computed(() => props.order.status === 'in_progress');
const enoughPhotos = computed(() => props.order.after_photos >= 2);
const photosAllowed = computed(() => !['completed', 'paid', 'rejected'].includes(props.order.status));
const errors = computed(() => page.props.errors);

const post = (name) => router.post(route(name, props.order.id), {}, { preserveScroll: true });

function decline() {
    if (confirm(t('worker.confirm_decline'))) post('worker.orders.decline');
}

function complete() {
    if (confirm(t('worker.confirm_complete'))) post('worker.orders.complete');
}
</script>

<template>
    <WorkerLayout :title="order.title">
        <Link :href="route('worker.orders.index')" class="link text-sm">← {{ $t('worker.my_orders') }}</Link>
        <div class="mb-4 mt-2">
            <div class="flex items-start justify-between gap-3">
                <h1 class="page-title">{{ order.title }}</h1>
                <StatusBadge :status="order.status" />
            </div>
            <div class="text-sm text-muted">#{{ order.number }}</div>
            <div v-if="mySeconds > 0" class="mt-1 text-sm font-semibold" :class="running ? 'text-accent' : 'text-muted'">
                {{ running ? $t('worker.working', { time: formatDuration(mySeconds) }) : $t('worker.worked', { time: formatDuration(mySeconds) }) }}
            </div>
        </div>

        <div class="flex flex-col gap-4">
            <!-- Accept / decline -->
            <section v-if="needsAnswer" class="card flex flex-col gap-3 border-amber-300 bg-amber-50">
                <span v-if="order.me.declined_at" class="text-sm font-semibold">{{ $t('worker.declined_badge') }}</span>
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" class="btn-primary" @click="post('worker.orders.accept')">{{ $t('worker.accept') }}</button>
                    <button v-if="canDecline" type="button" class="btn-secondary" @click="decline">{{ $t('worker.decline') }}</button>
                </div>
                <InputError :message="errors.status" />
            </section>

            <!-- Work clock -->
            <section v-if="canWork" class="card flex flex-col gap-3">
                <template v-if="!shift_open">
                    <p class="text-sm">{{ $t('shift.start_first') }}</p>
                    <button type="button" class="btn-primary" @click="router.post(route('worker.shift.start'), {}, { preserveScroll: true })">{{ $t('shift.start') }}</button>
                </template>
                <button v-else-if="!running" type="button" class="btn-primary min-h-[52px] text-base" @click="post('worker.orders.start')">{{ $t('worker.start_work') }}</button>
                <button v-else type="button" class="btn-secondary min-h-[52px] text-base" @click="post('worker.orders.stop')">{{ $t('worker.stop_work') }}</button>
                <InputError :message="errors.shift || errors.status" />
            </section>

            <section class="card flex flex-col gap-3">
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
                    <a v-if="mapsUrl" :href="mapsUrl" target="_blank" rel="noopener" class="btn-secondary"><Icon name="pin" />{{ $t('worker.route') }}</a>
                    <a v-if="order.client.phone" :href="`tel:${order.client.phone}`" class="btn-secondary"><Icon name="phone" />{{ $t('worker.call') }}</a>
                </div>
                <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-line pt-3 text-sm">
                    <dt class="text-muted">{{ $t('orders.sections.termin') }}</dt>
                    <dd class="font-semibold">{{ order.date ? formatTermin(order.date, order.start_time, order.end_time) : $t('orders.no_date') }}</dd>
                    <template v-if="order.workers.length > 1">
                        <dt class="text-muted">{{ $t('worker.team') }}</dt>
                        <dd>
                            <span v-for="(w, i) in order.workers" :key="w.id">
                                <a v-if="w.phone" :href="`tel:${w.phone}`" class="link">{{ w.name }}</a><span v-else>{{ w.name }}</span><span v-if="i < order.workers.length - 1">, </span>
                            </span>
                        </dd>
                    </template>
                </dl>
            </section>

            <section v-if="order.description" class="card">
                <h2 class="section-title">{{ $t('orders.sections.what') }}</h2>
                <p class="whitespace-pre-line">{{ order.description }}</p>
            </section>

            <section v-if="order.checklist.length" class="card">
                <h2 class="section-title">{{ $t('orders.sections.checklist') }}</h2>
                <OrderChecklist :order="order" />
            </section>

            <section class="card">
                <h2 class="section-title">{{ $t('orders.sections.photos') }}</h2>
                <OrderPhotos :order="order" :can-upload="photosAllowed" />
            </section>

            <section v-if="order.files.some((f) => f.kind === 'plan' || f.kind === 'document')" class="card">
                <h2 class="section-title">{{ $t('orders.sections.files') }}</h2>
                <OrderDocuments :order="order" />
            </section>

            <section class="card">
                <h2 class="section-title">{{ $t('comments.title_worker') }}</h2>
                <OrderComments :order="order" placeholder="comments.placeholder_worker" />
            </section>

            <section v-if="canComplete" class="flex flex-col gap-2">
                <button type="button" class="btn-primary min-h-[54px] text-base" :disabled="!enoughPhotos" @click="complete">{{ $t('worker.complete') }}</button>
                <p v-if="!enoughPhotos" class="text-center text-sm text-muted">{{ $t('photos.need_after') }} · {{ order.after_photos }}/2</p>
                <InputError :message="errors.status" class="text-center" />
            </section>
        </div>
    </WorkerLayout>
</template>
