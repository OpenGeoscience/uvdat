<script setup lang="ts">
import { ref } from 'vue';
import { useStyleStore } from '@/store';
import { ColorMap } from '@/types';

const styleStore = useStyleStore();
const colormaps: ColorMap[] = styleStore.colormaps;

const emit = defineEmits(['cancel'])

const name = ref()

function createColormap() {
    // TODO
}
</script>

<template>
    <v-card color="background">
        <v-card-subtitle class="pa-2" style="background-color: rgb(var(--v-theme-surface))">
            New Colormap
            <v-icon
                icon="mdi-close"
                style="float:right"
                @click="emit('cancel')"
            />
        </v-card-subtitle>

        <v-card-text>
            <v-text-field
                label="Name"
                v-model="name"
                autofocus
                :rules="[() => !colormaps?.map((c) => c.name).includes(name) || `Colormap ''${name}'' already exists.`]"
            />
        </v-card-text>

        <v-card-actions>
            <v-btn class="secondary-button" @click="emit('cancel')">
                <v-icon color="primary" class="mr-1">mdi-close-circle</v-icon>
                Cancel
            </v-btn>
            <v-btn class="primary-button" variant="tonal" @click="createColormap">
                <v-icon color="button-text" class="mr-1">mdi-plus-circle</v-icon>
                Create Colormap
            </v-btn>
        </v-card-actions>
    </v-card>
</template>
