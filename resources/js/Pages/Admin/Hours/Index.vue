<script setup>
import InputError from '@/Components/InputError.vue';
import { addMonths, formatDate, formatDuration, formatMonth, formatTime } from '@/i18n';
import AdminLayout from '@/Layouts/AdminLayout.vue';
import { router, useForm, usePage } from '@inertiajs/vue3';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({ month: String, closed: Boolean, worker: Number, workers: Array, orders: Array, shifts: Array });

const page = usePage();
const { t } = useI18n();
const tz = page.props.timezone;

// Local date / time parts of a UTC timestamp in the company timezone
const localDate = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(iso));
const localTime = (iso) => (iso ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date(iso)) : '');

function go(params) {
    router.get(route('admin.hours.index'), { month: props.month, worker: props.worker || undefined, ...params }, { preserveState: true, replace: true });
}

// One edit form at a time: { kind: 'log' | 'shift' | 'new', id }
const editing = ref(null);
const form = useForm({ date: '', start: '', end: '', reason: '', user_id: null, order_id: null });

function edit(kind, item) {
    editing.value = { kind, id: item?.id };
    form.clearErrors();
    form.reason = '';
    if (item) {
        form.date = localDate(item.started_at);
        form.start = localTime(item.started_at);
        form.end = localTime(item.ended_at) || localTime(new Date().toISOString());
    } else {
        form.date = new Date().toISOString().slice(0, 10);
        form.start = '08:00';
        form.end = '12:00';
        form.user_id = props.worker || props.workers[0]?.id;
        form.order_id = props.orders[0]?.id;
    }
}

function save() {
    const e = editing.value;
    const options = { preserveScroll: true, onSuccess: () => (editing.value = null) };
    if (e.kind === 'log') form.put(route('admin.hours.logs.update', e.id), options);
    else if (e.kind === 'shift') form.put(route('admin.hours.shifts.update', e.id), options);
    else form.post(route('admin.hours.logs.store'), options);
}

function remove(log) {
    const reason = prompt(t('hours.reason_placeholder'));
    if (reason) router.delete(route('admin.hours.logs.destroy', log.id), { data: { reason }, preserveScroll: true });
}

function reviewed(shift) {
    router.post(route('admin.hours.shifts.reviewed', shift.id), {}, { preserveScroll: true });
}

</script>

<template>
    <AdminLayout :title="$t('hours.title')">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h1 class="page-title">{{ $t('hours.title') }}</h1>
            <button v-if="!closed" type="button" class="btn-primary" @click="edit('new', null)">+ {{ $t('hours.add') }}</button>
        </div>
        <p class="mb-5 text-sm text-muted">{{ $t('hours.subtitle') }}</p>

        <div class="mb-5 flex flex-wrap items-center gap-2">
            <div class="flex items-center rounded-xl border border-line bg-white">
                <button type="button" class="btn px-3" :aria-label="$t('common.previous')" @click="go({ month: addMonths(month, -1) })">‹</button>
                <span class="min-w-40 text-center font-semibold first-letter:uppercase">{{ formatMonth(month) }}</span>
                <button type="button" class="btn px-3" :aria-label="$t('common.next')" @click="go({ month: addMonths(month, 1) })">›</button>
            </div>
            <select class="input w-auto" :value="worker ?? ''" :aria-label="$t('hours.worker')" @change="go({ worker: $event.target.value || undefined })">
                <option value="">{{ $t('hours.all_workers') }}</option>
                <option v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>
        </div>

        <p v-if="closed" class="mb-4 rounded-xl bg-soft px-4 py-3 text-sm">{{ $t('hours.closed_month') }}</p>
        <InputError :message="page.props.errors.period" class="mb-4" />

        <!-- Shared edit form -->
        <form v-if="editing" class="card mb-5 grid gap-3 border-accent sm:grid-cols-4" @submit.prevent="save">
            <template v-if="editing.kind === 'new'">
                <div class="sm:col-span-2">
                    <label class="label" for="h-worker">{{ $t('hours.worker') }}</label>
                    <select id="h-worker" v-model="form.user_id" class="input"><option v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}</option></select>
                    <InputError :message="form.errors.user_id" />
                </div>
                <div class="sm:col-span-2">
                    <label class="label" for="h-order">{{ $t('hours.order') }}</label>
                    <select id="h-order" v-model="form.order_id" class="input"><option v-for="o in orders" :key="o.id" :value="o.id">#{{ o.number }} {{ o.title }}</option></select>
                    <InputError :message="form.errors.order_id" />
                </div>
            </template>
            <div class="sm:col-span-2">
                <label class="label" for="h-date">{{ $t('hours.date') }}</label>
                <input id="h-date" v-model="form.date" type="date" class="input" required />
            </div>
            <div>
                <label class="label" for="h-start">{{ $t('hours.start') }}</label>
                <input id="h-start" v-model="form.start" type="time" class="input" required />
            </div>
            <div>
                <label class="label" for="h-end">{{ $t('hours.end') }}</label>
                <input id="h-end" v-model="form.end" type="time" class="input" required />
                <InputError :message="form.errors.end" />
            </div>
            <div class="sm:col-span-4">
                <label class="label" for="h-reason">{{ $t('hours.reason') }}</label>
                <input id="h-reason" v-model="form.reason" type="text" class="input" :placeholder="$t('hours.reason_placeholder')" required maxlength="500" />
                <InputError :message="form.errors.reason || form.errors.period" />
            </div>
            <div class="flex gap-2 sm:col-span-4">
                <button type="submit" class="btn-primary" :disabled="form.processing">{{ $t('hours.save') }}</button>
                <button type="button" class="btn-secondary" @click="editing = null">{{ $t('common.cancel') }}</button>
            </div>
        </form>

        <div v-if="shifts.length === 0" class="card text-center text-muted">{{ $t('hours.empty') }}</div>
        <div class="flex flex-col gap-3">
            <section v-for="s in shifts" :key="s.id" class="card" :class="{ 'border-amber-300 bg-amber-50/40': s.needs_review }">
                <div class="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <div class="font-semibold">{{ s.worker }} · {{ formatDate(localDate(s.started_at), { weekday: 'short', day: '2-digit', month: '2-digit' }) }}</div>
                        <div class="text-sm text-muted">
                            {{ $t('hours.shift') }} {{ formatTime(s.started_at, tz) }}–{{ s.ended_at ? formatTime(s.ended_at, tz) : $t('hours.running') }}
                            · <span class="font-semibold text-ink">{{ formatDuration(s.seconds) }}</span> {{ $t('hours.on_orders') }}
                        </div>
                        <div v-if="s.needs_review" class="mt-1 text-sm font-semibold text-amber-900">{{ $t('hours.needs_review') }}</div>
                    </div>
                    <div v-if="!closed" class="flex flex-wrap gap-2">
                        <button v-if="s.needs_review" type="button" class="btn-secondary" @click="reviewed(s)">{{ $t('hours.review_ok') }}</button>
                        <button v-if="s.ended_at" type="button" class="btn-secondary" @click="edit('shift', s)">{{ $t('hours.edit') }}</button>
                    </div>
                </div>
                <ul v-if="s.logs.length" class="mt-3 flex flex-col divide-y divide-line border-t border-line">
                    <li v-for="l in s.logs" :key="l.id" class="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                        <span class="min-w-0 flex-1 truncate">{{ l.order }}</span>
                        <span class="text-muted">{{ formatTime(l.started_at, tz) }}–{{ l.ended_at ? formatTime(l.ended_at, tz) : $t('hours.running') }}</span>
                        <span class="w-24 text-right font-semibold">{{ formatDuration(l.seconds) }}</span>
                        <span v-if="!closed && l.ended_at" class="flex gap-3">
                            <button type="button" class="link" @click="edit('log', l)">{{ $t('hours.edit') }}</button>
                            <button type="button" class="text-red-700" @click="remove(l)">{{ $t('hours.delete') }}</button>
                        </span>
                    </li>
                </ul>
            </section>
        </div>
    </AdminLayout>
</template>
