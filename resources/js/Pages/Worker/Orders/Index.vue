<script setup>
import Icon from '@/Components/Icon.vue';
import InputError from '@/Components/InputError.vue';
import StatusBadge from '@/Components/StatusBadge.vue';
import { useNow } from '@/Composables/useNow';
import { formatDate, formatDuration, formatMoney, formatMonth, formatTermin, formatTime } from '@/i18n';
import WorkerLayout from '@/Layouts/WorkerLayout.vue';
import { Link, router, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({ orders: Array, shift: { type: Object, default: null }, my_month: Object });

const page = usePage();
const { t } = useI18n();
const now = useNow();

const firstName = computed(() => page.props.auth.user.name.split(' ')[0]);
const today = computed(() => new Date().toISOString().slice(0, 10));
const shiftSeconds = computed(() => (props.shift ? (now.value - new Date(props.shift.started_at)) / 1000 : 0));

function startShift() {
    router.post(route('worker.shift.start'), {}, { preserveScroll: true });
}

function endShift() {
    if (confirm(t('shift.confirm_end'))) {
        router.post(route('worker.shift.end'), {}, { preserveScroll: true });
    }
}
</script>

<template>
    <WorkerLayout :title="$t('worker.my_orders')">
        <div class="mb-4">
            <h1 class="page-title">{{ $t('worker.hello', { name: firstName }) }}</h1>
            <p class="text-sm text-muted first-letter:uppercase">{{ formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' }) }}</p>
        </div>

        <!-- Shift -->
        <section v-if="shift" class="mb-5 flex flex-col gap-3 rounded-card bg-ink p-5 text-white">
            <div class="flex items-center justify-between">
                <span class="flex items-center gap-2 text-sm font-semibold"><span class="h-2.5 w-2.5 rounded-full bg-emerald-400" />{{ $t('shift.running') }}</span>
                <span class="text-sm text-sidebar-sub">{{ $t('shift.since', { time: formatTime(shift.started_at, page.props.timezone) }) }}</span>
            </div>
            <div class="font-display text-3xl font-semibold">{{ formatDuration(shiftSeconds) }}</div>
            <Link v-if="shift.current" :href="route('worker.orders.show', shift.current.order_id)" class="text-sm text-sidebar-text underline">
                {{ $t('shift.now', { title: [shift.current.address, shift.current.title].filter(Boolean).join(' · ') }) }}
            </Link>
            <button type="button" class="btn min-h-[52px] bg-white text-ink" @click="endShift">{{ $t('shift.end') }}</button>
        </section>
        <section v-else class="card mb-5 flex flex-col gap-3">
            <span class="font-semibold">{{ $t('shift.not_started') }}</span>
            <button type="button" class="btn-primary min-h-[52px] text-base" @click="startShift">{{ $t('shift.start') }}</button>
        </section>
        <InputError :message="page.props.errors.shift" class="-mt-3 mb-4" />

        <h2 class="section-title">{{ $t('worker.my_orders') }}</h2>
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
                <div v-if="o.address" class="flex items-center gap-2 text-sm text-muted"><Icon name="pin" :size="16" />{{ o.address }}</div>
                <div class="flex items-center justify-between text-xs text-muted">
                    <span>#{{ o.number }} · {{ o.client }}</span>
                    <span v-if="o.declined" class="font-semibold text-stone-600">{{ $t('worker.declined_badge') }}</span>
                    <span v-else-if="!o.accepted" class="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">{{ $t('worker.new_badge') }}</span>
                </div>
            </Link>
        </div>

        <section class="card mt-6">
            <div class="mb-3 flex items-baseline justify-between">
                <h2 class="font-semibold">{{ $t('worker.my_month', { month: formatMonth(my_month.month, { month: 'long' }) }) }}</h2>
                <span class="text-xs text-muted">{{ $t('worker.private') }}</span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center">
                <div><div class="font-display text-lg font-semibold">{{ my_month.hours.toLocaleString() }}</div><div class="text-xs text-muted">{{ $t('worker.hours_label') }}</div></div>
                <div><div class="font-display text-lg font-semibold">{{ my_month.trips }}</div><div class="text-xs text-muted">{{ $t('worker.trips_label') }}</div></div>
                <div><div class="font-display text-lg font-semibold">{{ formatMoney(my_month.gross_cents) }}</div><div class="text-xs text-muted">{{ $t('worker.gross_label') }}</div></div>
            </div>
        </section>
    </WorkerLayout>
</template>
