<script setup>
import ClientPicker from '@/Components/ClientPicker.vue';
import InputError from '@/Components/InputError.vue';
import AdminLayout from '@/Layouts/AdminLayout.vue';
import { Link, useForm } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    order: { type: Object, default: null },
    client: { type: Object, default: null },
    workers: Array,
});

const selectedClient = ref(props.client);

const form = useForm({
    client_id: props.order?.client_id ?? props.client?.id ?? null,
    address_id: props.order?.address_id ?? props.client?.addresses[0]?.id ?? null,
    title: props.order?.title ?? '',
    description: props.order?.description ?? '',
    date: props.order?.date ?? '',
    start_time: props.order?.start_time ?? '',
    end_time: props.order?.end_time ?? '',
    price: props.order?.price ?? '',
    material: props.order?.material ?? '',
    source: props.order?.source ?? '',
    offer_no: props.order?.offer_no ?? '',
    payment_status: props.order?.payment_status ?? 'unpaid',
    worker_ids: props.order?.worker_ids ?? [],
});

watch(selectedClient, (client) => {
    form.client_id = client?.id ?? null;
    form.address_id = client?.addresses[0]?.id ?? null;
});

const addresses = computed(() => selectedClient.value?.addresses ?? []);
const title = computed(() => (props.order ? 'orders.edit_title' : 'orders.create_title'));

function submit() {
    const options = { preserveScroll: true };
    props.order ? form.put(route('admin.orders.update', props.order.id), options) : form.post(route('admin.orders.store'), options);
}
</script>

<template>
    <AdminLayout :title="$t(title, { number: order?.number })">
        <div class="mb-6">
            <Link :href="order ? route('admin.orders.show', order.id) : route('admin.orders.index')" class="link text-sm">← {{ $t('common.back') }}</Link>
            <h1 class="page-title mt-2">{{ $t(title, { number: order?.number }) }}</h1>
        </div>

        <form class="grid gap-5 lg:grid-cols-3" @submit.prevent="submit">
            <div class="flex flex-col gap-5 lg:col-span-2">
                <section class="card flex flex-col gap-4">
                    <h2 class="section-title">{{ $t('orders.sections.client_object') }}</h2>
                    <div>
                        <div class="mb-1.5 flex items-center justify-between">
                            <span class="label mb-0">{{ $t('orders.fields.client') }}</span>
                            <Link :href="route('admin.clients.create')" class="link text-sm">+ {{ $t('orders.new_client') }}</Link>
                        </div>
                        <ClientPicker v-model="selectedClient" />
                        <InputError :message="form.errors.client_id" />
                    </div>
                    <div v-if="selectedClient">
                        <label for="address_id" class="label">{{ $t('orders.fields.address') }}</label>
                        <select id="address_id" v-model="form.address_id" class="input">
                            <option :value="null">{{ $t('orders.no_address') }}</option>
                            <option v-for="a in addresses" :key="a.id" :value="a.id">{{ a.line }}</option>
                        </select>
                        <InputError :message="form.errors.address_id" />
                    </div>
                </section>

                <section class="card flex flex-col gap-4">
                    <h2 class="section-title">{{ $t('orders.sections.what') }}</h2>
                    <div>
                        <label for="title" class="label">{{ $t('orders.fields.title') }}</label>
                        <input id="title" v-model="form.title" type="text" class="input" required maxlength="255" />
                        <InputError :message="form.errors.title" />
                    </div>
                    <div>
                        <label for="description" class="label">{{ $t('orders.fields.description') }}</label>
                        <textarea id="description" v-model="form.description" rows="5" class="input py-2.5" />
                        <InputError :message="form.errors.description" />
                    </div>
                </section>

                <section class="card flex flex-col gap-4">
                    <h2 class="section-title">{{ $t('orders.sections.termin') }}</h2>
                    <div class="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label for="date" class="label">{{ $t('orders.fields.date') }}</label>
                            <input id="date" v-model="form.date" type="date" class="input" />
                            <InputError :message="form.errors.date" />
                        </div>
                        <div>
                            <label for="start_time" class="label">{{ $t('orders.fields.start_time') }}</label>
                            <input id="start_time" v-model="form.start_time" type="time" class="input" />
                            <InputError :message="form.errors.start_time" />
                        </div>
                        <div>
                            <label for="end_time" class="label">{{ $t('orders.fields.end_time') }}</label>
                            <input id="end_time" v-model="form.end_time" type="time" class="input" />
                            <InputError :message="form.errors.end_time" />
                        </div>
                    </div>
                </section>
            </div>

            <div class="flex flex-col gap-5">
                <section class="card flex flex-col gap-3">
                    <h2 class="section-title">{{ $t('orders.sections.workers') }}</h2>
                    <p v-if="workers.length === 0" class="text-sm text-muted">{{ $t('orders.no_workers') }}</p>
                    <label v-for="w in workers" :key="w.id" class="flex min-h-tap items-center gap-3">
                        <input v-model="form.worker_ids" type="checkbox" :value="w.id" class="h-5 w-5 rounded border-field text-accent focus:ring-accent" />
                        <span>{{ w.name }} <span v-if="!w.is_active" class="text-sm text-muted">({{ $t('orders.inactive') }})</span></span>
                    </label>
                    <InputError :message="form.errors.worker_ids || Object.entries(form.errors).find(([k]) => k.startsWith('worker_ids.'))?.[1]" />
                </section>

                <section class="card flex flex-col gap-4">
                    <h2 class="section-title">{{ $t('orders.sections.money') }}</h2>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="price" class="label">{{ $t('orders.fields.price') }}</label>
                            <input id="price" v-model="form.price" type="text" inputmode="decimal" class="input" placeholder="0,00" />
                            <InputError :message="form.errors.price" />
                        </div>
                        <div>
                            <label for="material" class="label">{{ $t('orders.fields.material') }}</label>
                            <input id="material" v-model="form.material" type="text" inputmode="decimal" class="input" placeholder="0,00" />
                            <InputError :message="form.errors.material" />
                        </div>
                    </div>
                    <div>
                        <label for="payment_status" class="label">{{ $t('orders.fields.payment_status') }}</label>
                        <select id="payment_status" v-model="form.payment_status" class="input">
                            <option v-for="p in ['unpaid', 'invoiced', 'paid']" :key="p" :value="p">{{ $t(`payment.${p}`) }}</option>
                        </select>
                        <InputError :message="form.errors.payment_status" />
                    </div>
                    <div>
                        <label for="offer_no" class="label">{{ $t('orders.fields.offer_no') }}</label>
                        <input id="offer_no" v-model="form.offer_no" type="text" class="input" maxlength="50" />
                        <InputError :message="form.errors.offer_no" />
                    </div>
                    <div>
                        <label for="source" class="label">{{ $t('orders.fields.source') }}</label>
                        <input id="source" v-model="form.source" type="text" class="input" maxlength="100" />
                        <InputError :message="form.errors.source" />
                    </div>
                </section>

                <div class="flex gap-3">
                    <button type="submit" class="btn-primary flex-1" :disabled="form.processing">{{ $t('common.save') }}</button>
                    <Link :href="order ? route('admin.orders.show', order.id) : route('admin.orders.index')" class="btn-secondary">{{ $t('common.cancel') }}</Link>
                </div>
            </div>
        </form>
    </AdminLayout>
</template>
