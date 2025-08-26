<script setup lang="ts">
import { ref, computed } from 'vue';
import { useStyleStore } from '@/store';
import { ColorMap } from '@/types';
import ColormapPreview from './ColormapPreview.vue';

const styleStore = useStyleStore();

const colormaps: ColorMap[] = styleStore.colormaps;

const emit = defineEmits(['close'])

const name = ref()

const markers = ref([
    {color: '#000', value: 0},
    {color: '#fff', value: 1},
])

const nameExistsRule = () => !colormaps?.map((c) => c.name).includes(name.value) || `Colormap ''${name.value}'' already exists.`

const valid = computed(() => {
    return name.value && name.value.length && markers.value && markers.value.length && nameExistsRule() === true
})

const currentColormap = computed(() => {
    return  {
        name: name.value,
        markers: markers.value,
        discrete: false,
        n_colors: 5,
        null_color: 'transparent',
    }
})

function createColormap() {
    if (valid.value) {
        colormaps.push(currentColormap.value)
        emit('close')
    }
}
</script>

<template>
    <v-card color="background">
        <v-card-subtitle class="pa-2" style="background-color: rgb(var(--v-theme-surface))">
            New Colormap
            <v-icon
                icon="mdi-close"
                style="float:right"
                @click="emit('close')"
            />
        </v-card-subtitle>

        <v-card-text>
            <v-text-field
                label="Name"
                v-model="name"
                autofocus
                :rules="[nameExistsRule]"
            />
            <ColormapPreview
                :colormap="currentColormap"
                :discrete="false"
                :nColors="-1"
            />
        </v-card-text>

        <v-card-actions>
            <v-btn class="secondary-button" @click="emit('close')">
                <v-icon color="primary" class="mr-1">mdi-close-circle</v-icon>
                close
            </v-btn>
            <v-btn class="primary-button" variant="tonal" @click="createColormap" :disabled="!valid">
                <v-icon color="button-text" class="mr-1">mdi-plus-circle</v-icon>
                Create Colormap
            </v-btn>
        </v-card-actions>
    </v-card>
</template>
