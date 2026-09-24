<script setup>
import InputError from '@/Components/InputError.vue';
import { addMonths, formatDate, formatDateTime, formatMoney, formatMonth } from '@/i18n';
import AdminLayout from '@/Layouts/AdminLayout.vue';
import { router, useForm, usePage } from '@inertiajs/vue3';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    month: String,
    period: Object,
    previous_closed: { type: Object, default: null },
    rows: Array,
    totals: Object,
    adjustments: Array,
    log: Array,
});

const page = usePage();
const { t } = useI18n();
const selectedId = ref(props.rows[0]?.user_id ?? null);
const selected = computed(() => props.rows.find((r) => r.user_id === selectedId.value));

const adjForm = useForm({ user_id: props.rows[0]?.user_id ?? null, type: 'bonus', amount: '', reason: '' });

function go(month) {
    router.get(route('admin.payroll.index'), { month }, { preserveState: false });
}

function close() {
    if (confirm(t('payroll.confirm_close', { month: formatMonth(props.month) }))) {
        router.post(route('admin.payroll.close', props.period.id), {}, { preserveScroll: true });
    }
}

function addAdjustment() {
    adjForm.post(route('admin.payroll.adjustments.store', props.period.id), { preserveScroll: true, onSuccess: () => adjForm.reset('amount', 'reason') });
}

function removeAdjustment(a) {
    if (confirm(t('common.confirm_delete'))) router.delete(route('admin.payroll.adjustments.destroy', a.id), { preserveScroll: true });
}

function rateText(d) {
    if (!d.rate || !d.model) return t('payroll.no_rate');
    const parts = [];
    if (['hourly', 'mixed'].includes(d.model)) parts.push(t('pay.per_hour', { amount: formatMoney(d.rate.hourly_cents) }));
    if (['per_job', 'mixed'].includes(d.model)) parts.push(t('pay.per_trip', { amount: formatMoney(d.rate.per_job_cents) }));
    if (d.model === 'fixed') parts.push(t('pay.per_month', { amount: formatMoney(d.rate.monthly_cents) }));
    return parts.join(' + ');
}

const adjust = (d) => d.bonus_cents - d.deduction_cents;
const signed = (cents) => (cents > 0 ? '+' : cents < 0 ? '−' : '') + formatMoney(Math.abs(cents));
const hours = (n) => Number(n).toLocaleString(page.props.locale);

function logText(l) {
    const action = t(`payroll.actions.${l.action}`);
    if (l.entity === 'payroll_adjustments') {
        const d = l.after ?? l.before ?? {};
        return `${action}: ${t(`payroll.types.${d.type}`)} ${formatMoney(d.amount_cents)}`;
    }
    return action;
}
</script>

<template>
    <AdminLayout :title="$t('payroll.title')">
        <p class="text-sm text-muted">{{ $t('payroll.subtitle') }}</p>
        <div class="mb-3 mt-1 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
                <h1 class="page-title">{{ $t('payroll.title') }}</h1>
                <div class="flex items-center rounded-xl border border-line bg-white">
                    <button type="button" class="btn px-3" :aria-label="$t('common.previous')" @click="go(addMonths(month, -1))">‹</button>
                    <span class="min-w-40 text-center font-semibold first-letter:uppercase">{{ formatMonth(month) }}</span>
                    <button type="button" class="btn px-3" :aria-label="$t('common.next')" @click="go(addMonths(month, 1))">›</button>
                </div>
            </div>
            <button v-if="!period.closed" type="button" class="btn-primary" @click="close">{{ $t('payroll.close') }}</button>
        </div>

        <div class="mb-5 flex flex-col gap-1 rounded-xl bg-soft px-4 py-3 text-sm">
            <span v-if="period.closed" class="font-semibold text-accent-dark">{{ $t('payroll.closed_banner', { date: formatDateTime(period.closed_at, page.props.timezone) }) }}</span>
            <span v-else-if="previous_closed" class="font-semibold">{{ $t('payroll.previous_closed', { month: formatMonth(previous_closed.month), date: formatDate(previous_closed.closed_at.slice(0, 10)) }) }}</span>
            <span>{{ $t('payroll.rule') }}</span>
            <span class="text-xs text-muted">{{ $t('payroll.internal') }}</span>
        </div>
        <InputError :message="page.props.errors.period" class="mb-4" />

        <!-- Summary -->
        <div class="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div class="card"><div class="text-sm text-muted">{{ $t('payroll.summary.gross') }}</div><div class="font-display text-2xl font-semibold">{{ formatMoney(totals.gross_cents) }}</div></div>
            <div class="card"><div class="text-sm text-muted">{{ $t('payroll.summary.advance') }}</div><div class="font-display text-2xl font-semibold">{{ formatMoney(totals.advance_cents) }}</div></div>
            <div class="card"><div class="text-sm text-muted">{{ $t('payroll.summary.payable') }}</div><div class="font-display text-2xl font-semibold text-amber-800">{{ formatMoney(totals.payable_cents) }}</div></div>
            <div class="card"><div class="text-sm text-muted">{{ $t('payroll.summary.hours') }}</div><div class="font-display text-2xl font-semibold">{{ hours(totals.hours) }}</div></div>
        </div>

        <!-- Table -->
        <div v-if="rows.length === 0" class="card mb-5 text-center text-muted">{{ $t('payroll.empty') }}</div>
        <div v-else class="mb-5 overflow-x-auto rounded-card border border-line bg-white">
            <table class="w-full min-w-[820px] text-left text-sm">
                <thead class="border-b border-line text-xs uppercase tracking-wider text-muted">
                    <tr>
                        <th class="px-4 py-3 font-semibold">{{ $t('payroll.columns.worker') }}</th>
                        <th class="px-4 py-3 font-semibold">{{ $t('payroll.columns.model') }}</th>
                        <th class="px-4 py-3 text-right font-semibold">{{ $t('payroll.columns.hours') }}</th>
                        <th class="px-4 py-3 text-right font-semibold">{{ $t('payroll.columns.trips') }}</th>
                        <th class="px-4 py-3 text-right font-semibold">{{ $t('payroll.columns.adjust') }}</th>
                        <th class="px-4 py-3 text-right font-semibold">{{ $t('payroll.columns.gross') }}</th>
                        <th class="px-4 py-3 text-right font-semibold">{{ $t('payroll.columns.advance') }}</th>
                        <th class="px-4 py-3 text-right font-semibold">{{ $t('payroll.columns.payable') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="r in rows"
                        :key="r.user_id"
                        class="cursor-pointer border-b border-line"
                        :class="r.user_id === selectedId ? 'bg-accent-light/60' : 'hover:bg-soft'"
                        @click="selectedId = r.user_id"
                    >
                        <td class="px-4 py-3 font-semibold">{{ r.name }}</td>
                        <td class="px-4 py-3">
                            {{ r.details.model ? $t(`pay.models.${r.details.model}`) : '—' }}
                            <div class="text-xs text-muted">{{ rateText(r.details) }}</div>
                        </td>
                        <td class="px-4 py-3 text-right">{{ hours(r.hours) }}</td>
                        <td class="px-4 py-3 text-right">{{ r.trips }}</td>
                        <td class="px-4 py-3 text-right" :class="adjust(r.details) > 0 ? 'text-accent' : adjust(r.details) < 0 ? 'text-red-700' : 'text-muted'">
                            {{ adjust(r.details) ? signed(adjust(r.details)) : '—' }}
                        </td>
                        <td class="px-4 py-3 text-right font-semibold">{{ formatMoney(r.gross_cents) }}</td>
                        <td class="px-4 py-3 text-right">{{ formatMoney(r.details.advance_cents) }}</td>
                        <td class="px-4 py-3 text-right font-semibold">{{ formatMoney(r.payable_cents) }}</td>
                    </tr>
                </tbody>
                <tfoot class="font-semibold">
                    <tr>
                        <td class="px-4 py-3" colspan="2">{{ $t('payroll.total') }}</td>
                        <td class="px-4 py-3 text-right">{{ hours(totals.hours) }}</td>
                        <td class="px-4 py-3 text-right">{{ totals.trips }}</td>
                        <td class="px-4 py-3 text-right">{{ totals.adjust_cents ? signed(totals.adjust_cents) : '—' }}</td>
                        <td class="px-4 py-3 text-right">{{ formatMoney(totals.gross_cents) }}</td>
                        <td class="px-4 py-3 text-right">{{ formatMoney(totals.advance_cents) }}</td>
                        <td class="px-4 py-3 text-right">{{ formatMoney(totals.payable_cents) }}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div class="grid gap-5 lg:grid-cols-2">
            <!-- Formula -->
            <section v-if="selected" class="card">
                <h2 class="section-title">{{ $t('payroll.formula', { name: selected.name }) }}</h2>
                <div class="flex flex-col gap-1.5 text-sm">
                    <div v-for="(g, i) in selected.details.hour_groups" :key="'h' + i" class="flex justify-between">
                        <span>{{ $t('payroll.columns.hours') }}: {{ hours(g.hours) }} × {{ formatMoney(g.rate_cents) }}</span><span>{{ formatMoney(g.amount_cents) }}</span>
                    </div>
                    <div v-for="(g, i) in selected.details.trip_groups" :key="'t' + i" class="flex justify-between">
                        <span>{{ $t('payroll.columns.trips') }}: {{ g.count }} × {{ formatMoney(g.rate_cents) }} <span class="text-xs text-muted">({{ g.orders.map((n) => '#' + n).join(', ') }})</span></span><span>{{ formatMoney(g.amount_cents) }}</span>
                    </div>
                    <div v-if="selected.details.fixed_cents" class="flex justify-between"><span>{{ $t('payroll.fixed') }}</span><span>{{ formatMoney(selected.details.fixed_cents) }}</span></div>
                    <div v-if="selected.details.bonus_cents" class="flex justify-between text-accent"><span>+ {{ $t('payroll.bonus') }}</span><span>{{ formatMoney(selected.details.bonus_cents) }}</span></div>
                    <div v-if="selected.details.deduction_cents" class="flex justify-between text-red-700"><span>− {{ $t('payroll.deduction') }}</span><span>{{ formatMoney(selected.details.deduction_cents) }}</span></div>
                    <div class="flex justify-between border-t border-line pt-2 font-semibold"><span>= {{ $t('payroll.columns.gross') }}</span><span>{{ formatMoney(selected.gross_cents) }}</span></div>
                    <div v-if="selected.details.advance_cents" class="flex justify-between"><span>− {{ $t('payroll.advance') }}</span><span>{{ formatMoney(selected.details.advance_cents) }}</span></div>
                    <div class="flex justify-between font-display text-lg font-semibold"><span>{{ $t('payroll.columns.payable') }}</span><span>{{ formatMoney(selected.payable_cents) }}</span></div>
                    <p v-if="selected.details.unrated_seconds" class="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
                        {{ $t('payroll.unrated', { hours: hours((selected.details.unrated_seconds / 3600).toFixed(2)) }) }}
                    </p>
                </div>
                <p class="mt-3 text-xs text-muted">{{ $t('payroll.formula_hint') }}</p>
            </section>

            <!-- Adjustments -->
            <section class="card">
                <h2 class="section-title">{{ $t('payroll.adjustments') }}</h2>
                <p v-if="adjustments.length === 0" class="mb-3 text-sm text-muted">{{ $t('payroll.no_adjustments') }}</p>
                <ul v-else class="mb-3 flex flex-col divide-y divide-line text-sm">
                    <li v-for="a in adjustments" :key="a.id" class="flex items-start justify-between gap-3 py-2">
                        <span>
                            <span class="font-semibold">{{ a.worker }}</span> · {{ $t(`payroll.types.${a.type}`) }}
                            <span :class="a.type === 'bonus' ? 'text-accent' : 'text-red-700'">{{ a.type === 'bonus' ? '+' : '−' }}{{ formatMoney(a.amount_cents) }}</span>
                            <span class="block text-xs text-muted">{{ a.reason }} · {{ a.author }}</span>
                        </span>
                        <button v-if="!period.closed" type="button" class="text-muted hover:text-red-700" :aria-label="$t('common.delete')" @click="removeAdjustment(a)">×</button>
                    </li>
                </ul>
                <form v-if="!period.closed && rows.length" class="grid gap-2 sm:grid-cols-2" @submit.prevent="addAdjustment">
                    <select v-model="adjForm.user_id" class="input" :aria-label="$t('hours.worker')"><option v-for="r in rows" :key="r.user_id" :value="r.user_id">{{ r.name }}</option></select>
                    <select v-model="adjForm.type" class="input" :aria-label="$t('payroll.adjustment_type')">
                        <option v-for="ty in ['bonus', 'deduction', 'advance']" :key="ty" :value="ty">{{ $t(`payroll.types.${ty}`) }}</option>
                    </select>
                    <input v-model="adjForm.amount" type="text" inputmode="decimal" class="input" :placeholder="$t('payroll.amount')" required />
                    <input v-model="adjForm.reason" type="text" class="input" :placeholder="$t('hours.reason')" required maxlength="500" />
                    <InputError :message="adjForm.errors.amount || adjForm.errors.reason || adjForm.errors.user_id" class="sm:col-span-2" />
                    <button type="submit" class="btn-secondary sm:col-span-2" :disabled="adjForm.processing">+ {{ $t('payroll.add_adjustment') }}</button>
                </form>
            </section>

            <!-- Log -->
            <section class="card lg:col-span-2">
                <h2 class="section-title">{{ $t('payroll.log') }}</h2>
                <p v-if="log.length === 0" class="text-sm text-muted">{{ $t('payroll.no_log') }}</p>
                <ul v-else class="flex flex-col gap-2 text-sm">
                    <li v-for="l in log" :key="l.id" class="flex gap-3">
                        <span class="w-32 shrink-0 text-muted">{{ formatDateTime(l.created_at, page.props.timezone) }}</span>
                        <span>{{ logText(l) }}<span v-if="l.reason" class="text-muted"> · {{ l.reason }}</span><span class="text-muted"> · {{ l.user }}</span></span>
                    </li>
                </ul>
            </section>
        </div>
    </AdminLayout>
</template>
