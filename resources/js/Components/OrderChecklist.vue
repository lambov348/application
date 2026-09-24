<script setup>
import { formatDateTime } from '@/i18n';
import { router, useForm, usePage } from '@inertiajs/vue3';

const props = defineProps({
    order: { type: Object, required: true },
    canManage: { type: Boolean, default: false },
});
const page = usePage();
const form = useForm({ text: '' });

function toggle(item) {
    router.post(route('checklist.toggle', item.id), {}, { preserveScroll: true, preserveState: true });
}

function add() {
    form.post(route('orders.checklist.store', props.order.id), { preserveScroll: true, onSuccess: () => form.reset() });
}

function remove(item) {
    router.delete(route('checklist.destroy', item.id), { preserveScroll: true });
}
</script>

<template>
    <p v-if="order.checklist.length === 0 && !canManage" class="text-sm text-muted">{{ $t('checklist.empty') }}</p>
    <ul class="flex flex-col gap-1">
        <li v-for="item in order.checklist" :key="item.id" class="flex items-center gap-3">
            <label class="flex min-h-tap flex-1 cursor-pointer items-center gap-3">
                <input type="checkbox" :checked="!!item.done_at" class="h-6 w-6 rounded-md border-field text-accent focus:ring-accent" @change="toggle(item)" />
                <span :class="{ 'text-muted line-through': item.done_at }">
                    {{ item.text }}
                    <span v-if="item.done_at" class="block text-xs no-underline">{{ item.done_by }} · {{ formatDateTime(item.done_at, page.props.timezone) }}</span>
                </span>
            </label>
            <button v-if="canManage" type="button" class="px-2 text-muted hover:text-red-700" :aria-label="$t('checklist.remove')" @click="remove(item)">×</button>
        </li>
    </ul>
    <form v-if="canManage" class="mt-2 flex gap-2" @submit.prevent="add">
        <input v-model="form.text" type="text" class="input" :placeholder="$t('checklist.add_placeholder')" maxlength="500" required />
        <button type="submit" class="btn-secondary" :disabled="form.processing">{{ $t('checklist.add') }}</button>
    </form>
</template>
