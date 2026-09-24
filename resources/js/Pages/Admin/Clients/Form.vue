<script setup>
import InputError from '@/Components/InputError.vue';
import AdminLayout from '@/Layouts/AdminLayout.vue';
import { Link, useForm, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

const props = defineProps({ client: { type: Object, default: null } });
const page = usePage();

const emptyAddress = () => ({ id: null, street: '', zip: '', city: '', floor: '', has_elevator: null, parking_note: '' });

const form = useForm({
    name: props.client?.name ?? '',
    phone: props.client?.phone ?? '',
    email: props.client?.email ?? '',
    locale: props.client?.locale ?? 'de',
    notes: props.client?.notes ?? '',
    addresses: props.client?.addresses?.map((a) => ({ ...a })) ?? [emptyAddress()],
});

const title = computed(() => (props.client ? 'clients.edit_title' : 'clients.create_title'));

function submit() {
    props.client ? form.put(route('admin.clients.update', props.client.id)) : form.post(route('admin.clients.store'));
}
</script>

<template>
    <AdminLayout :title="$t(title)">
        <div class="mb-6">
            <Link :href="client ? route('admin.clients.show', client.id) : route('admin.clients.index')" class="link text-sm">← {{ $t('common.back') }}</Link>
            <h1 class="page-title mt-2">{{ $t(title) }}</h1>
        </div>

        <form class="flex max-w-3xl flex-col gap-5" @submit.prevent="submit">
            <section class="card grid gap-4 sm:grid-cols-2">
                <div class="sm:col-span-2">
                    <label for="name" class="label">{{ $t('clients.fields.name') }}</label>
                    <input id="name" v-model="form.name" type="text" class="input" required maxlength="255" />
                    <InputError :message="form.errors.name" />
                </div>
                <div>
                    <label for="phone" class="label">{{ $t('clients.fields.phone') }}</label>
                    <input id="phone" v-model="form.phone" type="tel" class="input" />
                    <InputError :message="form.errors.phone" />
                </div>
                <div>
                    <label for="email" class="label">{{ $t('clients.fields.email') }}</label>
                    <input id="email" v-model="form.email" type="email" class="input" />
                    <InputError :message="form.errors.email" />
                </div>
                <div>
                    <label for="locale" class="label">{{ $t('clients.fields.locale') }}</label>
                    <select id="locale" v-model="form.locale" class="input">
                        <option v-for="l in page.props.locales" :key="l" :value="l">{{ $t(`languages.${l}`) }}</option>
                    </select>
                    <InputError :message="form.errors.locale" />
                </div>
                <div class="sm:col-span-2">
                    <label for="notes" class="label">{{ $t('clients.fields.notes') }}</label>
                    <textarea id="notes" v-model="form.notes" rows="3" class="input py-2.5" />
                    <InputError :message="form.errors.notes" />
                </div>
            </section>

            <section class="card flex flex-col gap-4">
                <h2 class="section-title">{{ $t('clients.addresses') }}</h2>
                <div v-for="(a, i) in form.addresses" :key="i" class="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-6">
                    <div class="sm:col-span-6">
                        <label :for="`street-${i}`" class="label">{{ $t('addresses.street') }}</label>
                        <input :id="`street-${i}`" v-model="a.street" type="text" class="input" required />
                        <InputError :message="form.errors[`addresses.${i}.street`]" />
                    </div>
                    <div class="sm:col-span-2">
                        <label :for="`zip-${i}`" class="label">{{ $t('addresses.zip') }}</label>
                        <input :id="`zip-${i}`" v-model="a.zip" type="text" inputmode="numeric" class="input" required />
                        <InputError :message="form.errors[`addresses.${i}.zip`]" />
                    </div>
                    <div class="sm:col-span-4">
                        <label :for="`city-${i}`" class="label">{{ $t('addresses.city') }}</label>
                        <input :id="`city-${i}`" v-model="a.city" type="text" class="input" required />
                        <InputError :message="form.errors[`addresses.${i}.city`]" />
                    </div>
                    <div class="sm:col-span-2">
                        <label :for="`floor-${i}`" class="label">{{ $t('addresses.floor') }}</label>
                        <input :id="`floor-${i}`" v-model="a.floor" type="text" class="input" />
                    </div>
                    <div class="sm:col-span-2">
                        <label :for="`elevator-${i}`" class="label">{{ $t('addresses.has_elevator') }}</label>
                        <select :id="`elevator-${i}`" v-model="a.has_elevator" class="input">
                            <option :value="null">{{ $t('common.unknown') }}</option>
                            <option :value="true">{{ $t('common.yes') }}</option>
                            <option :value="false">{{ $t('common.no') }}</option>
                        </select>
                    </div>
                    <div class="sm:col-span-2">
                        <label :for="`parking-${i}`" class="label">{{ $t('addresses.parking_note') }}</label>
                        <input :id="`parking-${i}`" v-model="a.parking_note" type="text" class="input" />
                    </div>
                    <div class="sm:col-span-6">
                        <button type="button" class="link text-sm text-red-700" @click="form.addresses.splice(i, 1)">{{ $t('clients.remove_address') }}</button>
                    </div>
                </div>
                <button type="button" class="btn-secondary self-start" @click="form.addresses.push(emptyAddress())">+ {{ $t('clients.add_address') }}</button>
            </section>

            <div class="flex gap-3">
                <button type="submit" class="btn-primary" :disabled="form.processing">{{ $t('common.save') }}</button>
                <Link :href="client ? route('admin.clients.show', client.id) : route('admin.clients.index')" class="btn-secondary">{{ $t('common.cancel') }}</Link>
            </div>
        </form>
    </AdminLayout>
</template>
