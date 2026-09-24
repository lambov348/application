<script setup>
import InputError from '@/Components/InputError.vue';
import AdminLayout from '@/Layouts/AdminLayout.vue';
import { Link, useForm, usePage } from '@inertiajs/vue3';
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import { formatDate, formatMoney } from '@/i18n';

const props = defineProps({ worker: { type: Object, default: null }, rates: { type: Array, default: null } });
const page = usePage();
const { t } = useI18n();

const form = useForm({
    name: props.worker?.name ?? '',
    login: props.worker?.login ?? '',
    phone: props.worker?.phone ?? '',
    locale: props.worker?.locale ?? page.props.locale,
});

const title = computed(() => (props.worker ? 'workers.edit_title' : 'workers.create_title'));

const rateForm = useForm({ model: props.rates?.[0]?.model ?? 'hourly', hourly: '', per_job: '', monthly: '', valid_from: new Date().toISOString().slice(0, 10) });
const paysHours = computed(() => ['hourly', 'mixed'].includes(rateForm.model));
const paysTrips = computed(() => ['per_job', 'mixed'].includes(rateForm.model));

function saveRate() {
    rateForm.post(route('admin.workers.rates.store', props.worker.id), { preserveScroll: true, onSuccess: () => rateForm.reset('hourly', 'per_job', 'monthly') });
}

function rateText(r) {
    const parts = [];
    if (['hourly', 'mixed'].includes(r.model)) parts.push(t('pay.per_hour', { amount: formatMoney(r.hourly_cents) }));
    if (['per_job', 'mixed'].includes(r.model)) parts.push(t('pay.per_trip', { amount: formatMoney(r.per_job_cents) }));
    if (r.model === 'fixed') parts.push(t('pay.per_month', { amount: formatMoney(r.monthly_cents) }));
    return parts.join(' + ');
}

function submit() {
    props.worker ? form.put(route('admin.workers.update', props.worker.id)) : form.post(route('admin.workers.store'));
}
</script>

<template>
    <AdminLayout :title="$t(title)">
        <div class="mb-6">
            <Link :href="route('admin.workers.index')" class="link text-sm">← {{ $t('common.back') }}</Link>
            <h1 class="page-title mt-2">{{ $t(title) }}</h1>
        </div>

        <form class="card flex max-w-xl flex-col gap-4" @submit.prevent="submit">
            <div>
                <label for="name" class="label">{{ $t('workers.fields.name') }}</label>
                <input id="name" v-model="form.name" type="text" class="input" required maxlength="255" />
                <InputError :message="form.errors.name" />
            </div>
            <div>
                <label for="login" class="label">{{ $t('workers.fields.login') }}</label>
                <input id="login" v-model="form.login" type="text" class="input" autocapitalize="none" required minlength="3" maxlength="50" />
                <p class="mt-1 text-xs text-muted">{{ $t('workers.login_hint') }}</p>
                <InputError :message="form.errors.login" />
            </div>
            <div>
                <label for="phone" class="label">{{ $t('workers.fields.phone') }}</label>
                <input id="phone" v-model="form.phone" type="tel" class="input" />
                <InputError :message="form.errors.phone" />
            </div>
            <div>
                <label for="locale" class="label">{{ $t('workers.fields.locale') }}</label>
                <select id="locale" v-model="form.locale" class="input">
                    <option v-for="l in page.props.locales" :key="l" :value="l">{{ $t(`languages.${l}`) }}</option>
                </select>
                <InputError :message="form.errors.locale" />
            </div>
            <p v-if="!worker" class="rounded-xl bg-soft px-3.5 py-3 text-sm">{{ $t('workers.start_password_hint') }}</p>
            <div class="flex gap-3">
                <button type="submit" class="btn-primary" :disabled="form.processing">{{ $t('common.save') }}</button>
                <Link :href="route('admin.workers.index')" class="btn-secondary">{{ $t('common.cancel') }}</Link>
            </div>
        </form>

        <section v-if="rates" class="card mt-5 flex max-w-xl flex-col gap-4">
            <h2 class="section-title mb-0">{{ $t('pay.title') }}</h2>
            <p v-if="rates.length === 0" class="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-900">{{ $t('pay.none') }}</p>
            <ul v-else class="flex flex-col divide-y divide-line">
                <li v-for="(r, i) in rates" :key="r.id" class="flex flex-wrap justify-between gap-2 py-2" :class="{ 'text-muted': i > 0 }">
                    <span><span class="font-semibold">{{ $t(`pay.models.${r.model}`) }}</span> · {{ rateText(r) }}</span>
                    <span class="text-sm">{{ r.valid_to ? $t('pay.period', { from: formatDate(r.valid_from), to: formatDate(r.valid_to) }) : $t('pay.period_open', { from: formatDate(r.valid_from) }) }}</span>
                </li>
            </ul>
            <form class="grid gap-3 border-t border-line pt-4 sm:grid-cols-2" @submit.prevent="saveRate">
                <div class="sm:col-span-2">
                    <label for="model" class="label">{{ $t('pay.model') }}</label>
                    <select id="model" v-model="rateForm.model" class="input">
                        <option v-for="m in ['hourly', 'per_job', 'mixed', 'fixed']" :key="m" :value="m">{{ $t(`pay.models.${m}`) }}</option>
                    </select>
                </div>
                <div v-if="paysHours">
                    <label for="hourly" class="label">{{ $t('pay.hourly') }}</label>
                    <input id="hourly" v-model="rateForm.hourly" type="text" inputmode="decimal" class="input" placeholder="0,00" />
                    <InputError :message="rateForm.errors.hourly" />
                </div>
                <div v-if="paysTrips">
                    <label for="per_job" class="label">{{ $t('pay.per_job') }}</label>
                    <input id="per_job" v-model="rateForm.per_job" type="text" inputmode="decimal" class="input" placeholder="0,00" />
                    <InputError :message="rateForm.errors.per_job" />
                </div>
                <div v-if="rateForm.model === 'fixed'">
                    <label for="monthly" class="label">{{ $t('pay.monthly') }}</label>
                    <input id="monthly" v-model="rateForm.monthly" type="text" inputmode="decimal" class="input" placeholder="0,00" />
                    <InputError :message="rateForm.errors.monthly" />
                </div>
                <div>
                    <label for="valid_from" class="label">{{ $t('pay.valid_from') }}</label>
                    <input id="valid_from" v-model="rateForm.valid_from" type="date" class="input" />
                    <InputError :message="rateForm.errors.valid_from || rateForm.errors.period" />
                </div>
                <p class="text-xs text-muted sm:col-span-2">{{ $t('pay.hint') }}</p>
                <div class="sm:col-span-2"><button type="submit" class="btn-primary" :disabled="rateForm.processing">{{ $t('pay.add') }}</button></div>
            </form>
        </section>
    </AdminLayout>
</template>
