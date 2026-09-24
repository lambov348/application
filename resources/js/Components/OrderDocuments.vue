<script setup>
import InputError from '@/Components/InputError.vue';
import { router, useForm } from '@inertiajs/vue3';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

// Plans and documents. Everyone on the order can open them; only the owner adds them.
const props = defineProps({
    order: { type: Object, required: true },
    canManage: { type: Boolean, default: false },
});
const { t } = useI18n();

const docs = computed(() => props.order.files.filter((f) => f.kind === 'plan' || f.kind === 'document'));
const form = useForm({ kind: 'plan', file: null });

function upload(event) {
    form.file = event.target.files[0];
    form.post(route('orders.files.store', props.order.id), {
        preserveScroll: true,
        forceFormData: true,
        onFinish: () => (event.target.value = ''),
    });
}

function remove(file) {
    if (confirm(t('files.confirm_delete'))) {
        router.delete(route('files.destroy', file.id), { preserveScroll: true });
    }
}

function ext(name) {
    return (name?.split('.').pop() ?? '').slice(0, 4).toUpperCase();
}
</script>

<template>
    <p v-if="docs.length === 0" class="text-sm text-muted">{{ $t('files.empty') }}</p>
    <ul v-else class="flex flex-col gap-2">
        <li v-for="f in docs" :key="f.id" class="flex items-center gap-3 rounded-xl border border-line p-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soft text-xs font-bold">{{ ext(f.name) }}</span>
            <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ f.name }}</span>
                <span class="text-xs text-muted">{{ $t(`files.kinds.${f.kind}`) }}</span>
            </span>
            <a :href="f.download_url" class="link text-sm">{{ $t('files.download') }}</a>
            <button v-if="canManage && f.can_delete" type="button" class="text-sm text-red-700" @click="remove(f)">{{ $t('common.delete') }}</button>
        </li>
    </ul>
    <div v-if="canManage" class="mt-3 flex flex-wrap items-center gap-2">
        <label class="sr-only" for="doc-kind">{{ $t('files.kind') }}</label>
        <select id="doc-kind" v-model="form.kind" class="input w-auto">
            <option value="plan">{{ $t('files.kinds.plan') }}</option>
            <option value="document">{{ $t('files.kinds.document') }}</option>
        </select>
        <label class="btn-secondary cursor-pointer">
            <input type="file" class="hidden" :disabled="form.processing" @change="upload" />
            + {{ $t('files.add') }}
        </label>
        <InputError :message="form.errors.file" class="w-full" />
    </div>
</template>
