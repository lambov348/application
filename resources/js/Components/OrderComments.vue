<script setup>
import InputError from '@/Components/InputError.vue';
import { formatDateTime } from '@/i18n';
import { useForm, usePage } from '@inertiajs/vue3';

const props = defineProps({
    order: { type: Object, required: true },
    placeholder: { type: String, default: 'comments.placeholder' },
});
const page = usePage();
const form = useForm({ text: '' });

function send() {
    form.post(route('orders.comments.store', props.order.id), { preserveScroll: true, onSuccess: () => form.reset() });
}
</script>

<template>
    <p v-if="order.comments.length === 0" class="mb-3 text-sm text-muted">{{ $t('comments.empty') }}</p>
    <ul v-else class="mb-3 flex flex-col gap-2">
        <li v-for="c in order.comments" :key="c.id" class="rounded-xl p-3" :class="c.mine ? 'ml-6 bg-accent-light' : 'mr-6 bg-soft'">
            <div class="mb-1 text-xs text-muted">{{ c.user }} · {{ formatDateTime(c.created_at, page.props.timezone) }}</div>
            <p class="whitespace-pre-line text-sm">{{ c.text }}</p>
        </li>
    </ul>
    <form class="flex flex-col gap-2" @submit.prevent="send">
        <textarea v-model="form.text" rows="3" class="input py-2.5" :placeholder="$t(placeholder)" maxlength="5000" required />
        <InputError :message="form.errors.text" />
        <button type="submit" class="btn-secondary self-start" :disabled="form.processing">{{ $t('comments.send') }}</button>
    </form>
</template>
