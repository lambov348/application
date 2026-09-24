<script setup>
import Icon from '@/Components/Icon.vue';
import InputError from '@/Components/InputError.vue';
import GuestLayout from '@/Layouts/GuestLayout.vue';
import { useForm } from '@inertiajs/vue3';

defineProps({ status: { type: String, default: null } });

const form = useForm({ login: '', password: '', remember: false });

function submit() {
    form.post(route('login'), { onFinish: () => form.reset('password') });
}
</script>

<template>
    <GuestLayout :title="$t('auth.sign_in')">
        <div v-if="status" class="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-900">{{ status }}</div>
        <form class="flex flex-col gap-4" @submit.prevent="submit">
            <div>
                <label for="login" class="label">{{ $t('auth.login') }}</label>
                <input id="login" v-model="form.login" type="text" class="input h-[52px]" autocomplete="username" autocapitalize="none" autofocus required />
                <InputError :message="form.errors.login" />
            </div>
            <div>
                <label for="password" class="label">{{ $t('auth.password') }}</label>
                <input id="password" v-model="form.password" type="password" class="input h-[52px]" autocomplete="current-password" required />
                <InputError :message="form.errors.password" />
            </div>
            <label class="flex min-h-tap items-center gap-3 text-sm">
                <input v-model="form.remember" type="checkbox" class="h-5 w-5 rounded border-field text-accent focus:ring-accent" />
                {{ $t('auth.remember') }}
            </label>
            <button type="submit" class="btn-primary h-[54px] text-base" :disabled="form.processing">{{ $t('auth.sign_in') }}</button>
            <div class="flex items-center gap-2.5 rounded-xl bg-soft px-3.5 py-3 text-[13px] leading-snug text-[#3D4047]">
                <Icon name="lock" class="shrink-0" />
                <span>{{ $t('auth.first_hint') }}</span>
            </div>
        </form>
    </GuestLayout>
</template>
