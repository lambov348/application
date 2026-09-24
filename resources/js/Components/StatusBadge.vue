<script setup>
defineProps({ status: { type: String, required: true } });

const styles = {
    new: 'bg-sky-50 text-sky-800 ring-sky-200',
    scheduled: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
    confirmed: 'bg-violet-50 text-violet-800 ring-violet-200',
    in_progress: 'bg-amber-50 text-amber-800 ring-amber-200',
    completed: 'bg-accent-light text-accent-dark ring-accent/30',
    paid: 'bg-emerald-600 text-white ring-emerald-600',
    rejected: 'bg-stone-100 text-stone-600 ring-stone-200',
};
</script>

<template>
    <span class="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset" :class="styles[status]">
        {{ $t(`statuses.${status}`) }}
    </span>
</template>
