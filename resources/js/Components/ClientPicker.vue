<script setup>
import axios from 'axios';
import { ref, watch } from 'vue';

// Quick client search for the order form.
const model = defineModel({ type: Object, default: null });

const q = ref('');
const results = ref([]);
const searched = ref(false);
let timer;

watch(q, (value) => {
    clearTimeout(timer);
    if (value.trim().length < 2) {
        results.value = [];
        searched.value = false;
        return;
    }
    timer = setTimeout(async () => {
        const { data } = await axios.get(route('admin.clients.search'), { params: { q: value } });
        results.value = data;
        searched.value = true;
    }, 250);
});

function pick(client) {
    model.value = client;
    q.value = '';
    results.value = [];
}
</script>

<template>
    <div v-if="model" class="flex items-center justify-between gap-3 rounded-xl border border-line bg-soft px-3.5 py-2.5">
        <div>
            <div class="font-semibold">{{ model.name }}</div>
            <div v-if="model.phone" class="text-sm text-muted">{{ model.phone }}</div>
        </div>
        <button type="button" class="link text-sm" @click="model = null">{{ $t('orders.client_change') }}</button>
    </div>
    <div v-else class="relative">
        <input v-model="q" type="search" class="input" :placeholder="$t('orders.client_search')" autocomplete="off" />
        <ul v-if="results.length" class="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg">
            <li v-for="client in results" :key="client.id">
                <button type="button" class="block min-h-tap w-full px-3.5 py-2 text-left hover:bg-soft" @click="pick(client)">
                    <span class="font-medium">{{ client.name }}</span>
                    <span class="block text-sm text-muted">{{ [client.phone, client.addresses[0]?.line].filter(Boolean).join(' · ') }}</span>
                </button>
            </li>
        </ul>
        <p v-else-if="searched" class="mt-1.5 text-sm text-muted">{{ $t('orders.client_none_found') }}</p>
    </div>
</template>
