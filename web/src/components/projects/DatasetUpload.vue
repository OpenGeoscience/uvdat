<script setup lang="ts">
import { Dataset } from '@/types';
import { computed, ref, watch } from 'vue';


const props = defineProps<{
  allDatasets: Dataset[];
}>();

const open = ref<boolean>(false)
const name = ref<string>()
const description = ref<string>()
const category = ref<string>()
const mandatoryRule = [
  (v: any) => (v ? true : "Input required.")
];

const categories = computed(() => {
    return [...new Set(props.allDatasets?.map((d) => d.category))]
})

const valid = computed(() => {
    return name.value && description.value && category.value
})

function cancel() {
    open.value = false
    name.value = undefined
    description.value = undefined
    category.value = undefined
}

function submit() {
    console.log('submit')
}

watch(open, () => {
    if(!open) cancel()
})
</script>

<template>
    <v-btn color="primary" @click="open=true">
        <v-icon icon="mdi-upload" class="mr-2" />
        Upload New Dataset

        <v-dialog v-model="open" persistent width="700">
            <v-card class="dataset-upload-card" color="background">
                <div class="px-4 py-2" style="background-color: rgb(var(--v-theme-surface)); height: 40px">
                    Upload Dataset

                    <v-icon
                        icon="mdi-close"
                        style="position: absolute; top: 10px; right: 5px;"
                        v-tooltip="'Warning: unsaved changes will be discarded'"
                        @mousedown="cancel"
                    />
                </div>
                <div class="pa-5 d-flex" style="flex-direction: column; row-gap: 10px">
                    <v-text-field
                        autofocus
                        label="Dataset Name"
                        v-model="name"
                        :rules="mandatoryRule"
                        hide-details="auto"
                    />
                    <v-text-field
                        label="Description"
                        v-model="description"
                        :rules="mandatoryRule"
                        hide-details="auto"
                    />
                    <v-combobox
                        label="Combobox"
                        v-model="category"
                        :items="categories"
                        :rules="mandatoryRule"
                        hide-details="auto"
                    >
                        <template v-slot:append-inner>
                            <v-icon
                                v-if="!categories.includes(category)"
                                icon="mdi-information-outline"
                                class="ml-2"
                                color="primary"
                                v-tooltip="'You are creating a new category'"
                            />
                        </template>
                    </v-combobox>
                </div>

                <v-card-actions style="float: right;">
                    <v-btn class="secondary-button" @click="cancel">
                        <v-icon color="primary" class="mr-1">mdi-close-circle</v-icon>
                        Cancel
                    </v-btn>
                    <v-btn
                        class="primary-button"
                        :disabled="!valid"
                        @click="submit"
                    >
                        <v-icon color="button-text" class="mr-1" icon="mdi-upload" />
                        Upload
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-btn>
</template>

<style>
.dataset-upload-card {
    max-height: 80vh!important;
    overflow-y: auto;
    overflow-x: hidden;
}
</style>
