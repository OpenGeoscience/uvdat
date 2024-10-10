<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { onMounted, ref, Ref, defineProps, defineEmits } from "vue";
import { Project, ProjectPermissions, User } from "@/types";
import { getUsers, updateProjectPermissions } from "@/api/rest";

const props = defineProps<{
  project: Project;
  permissions: Record<number, string>;
}>();
const emit = defineEmits(["updateSelectedProject"]);
const allUsers: Ref<User[]> = ref([]);
const showUserSelectDialog: Ref<boolean> = ref(false);
const userSelectDialogMode: Ref<"add" | "transfer"> = ref("add");
const selectedUsers: Ref<User[]> = ref([]);
const selectedPermissionLevel: Ref<string> = ref("follower");
const permissionLevels = ["follower", "collaborator"];
const userToRemove: Ref<User | undefined> = ref();

function savePermissions() {
  const newPermissions: ProjectPermissions = {
    owner_id: props.project.owner?.id,
    collaborator_ids: props.project.collaborators.map((u: User) => u.id),
    follower_ids: props.project.followers.map((u: User) => u.id),
  };
  if (userToRemove.value) {
    newPermissions.collaborator_ids = newPermissions.collaborator_ids.filter(
      (uid: number) => uid !== userToRemove.value?.id
    );
    newPermissions.follower_ids = newPermissions.follower_ids.filter(
      (uid: number) => uid !== userToRemove.value?.id
    );
  } else if (
    userSelectDialogMode.value === "transfer" &&
    selectedUsers.value.length === 1
  ) {
    if (!newPermissions.collaborator_ids.includes(newPermissions.owner_id)) {
      newPermissions.collaborator_ids.push(newPermissions.owner_id);
    }
    if (newPermissions.collaborator_ids.includes(selectedUsers.value[0].id)) {
      newPermissions.collaborator_ids = newPermissions.collaborator_ids.filter(
        (uid: number) => uid !== selectedUsers.value[0].id
      );
    }
    if (newPermissions.follower_ids.includes(selectedUsers.value[0].id)) {
      newPermissions.follower_ids = newPermissions.follower_ids.filter(
        (uid: number) => uid !== selectedUsers.value[0].id
      );
    }
    newPermissions.owner_id = selectedUsers.value[0].id;
  } else if (selectedPermissionLevel.value === "collaborator") {
    selectedUsers.value.forEach((u: User) => {
      if (!newPermissions.collaborator_ids.includes(u.id)) {
        newPermissions.collaborator_ids.push(u.id);
      }
    });
  } else if (selectedPermissionLevel.value === "follower") {
    selectedUsers.value.forEach((u: User) => {
      if (!newPermissions.follower_ids.includes(u.id)) {
        newPermissions.follower_ids.push(u.id);
      }
    });
  }
  updateProjectPermissions(props.project.id, newPermissions).then((project) => {
    emit("updateSelectedProject", project);
    selectedUsers.value = [];
    selectedPermissionLevel.value = "follower";
    showUserSelectDialog.value = false;
    userToRemove.value = undefined;
  });
}

onMounted(() => {
  getUsers().then((data) => {
    allUsers.value = data;
  });
});
</script>

<template>
  <div style="max-width: 500px">
    <v-list>
      <v-list-subheader>
        Owner
        <v-tooltip activator="parent" location="end">
          Permissions: Read, Write, Delete, Access Control
        </v-tooltip>
      </v-list-subheader>
      <v-list-item
        v-if="project.owner"
        :title="
          project.owner.first_name && project.owner.last_name
            ? project.owner.first_name + ' ' + project.owner.last_name
            : project.owner.username
        "
        :subtitle="project.owner.email"
      >
        <template v-slot:prepend>
          <v-btn
            flat
            icon
            color="primary"
            size="small"
            class="mx-3 user-circle"
            :ripple="false"
          >
            {{ project.owner.first_name[0] }}
            {{ project.owner.last_name[0] }}
            <v-tooltip activator="parent" location="end">
              {{ project.owner.first_name }}
              {{ project.owner.last_name }}
            </v-tooltip>
          </v-btn>
        </template>
        <template v-slot:append>
          <v-icon
            v-if="permissions[project.id] === 'own'"
            icon="mdi-pencil"
            @click="
              showUserSelectDialog = true;
              userSelectDialogMode = 'transfer';
            "
          />
        </template>
      </v-list-item>
      <v-list-subheader>
        Collaborators
        <v-tooltip activator="parent" location="end">
          Permissions: Read, Write
        </v-tooltip>
      </v-list-subheader>
      <v-list-item
        v-for="collaborator in project.collaborators"
        :key="collaborator.id"
        :title="
          collaborator.first_name && collaborator.last_name
            ? collaborator.first_name + ' ' + collaborator.last_name
            : collaborator.username
        "
        :subtitle="collaborator.email"
      >
        <template v-slot:prepend>
          <v-btn
            flat
            icon
            color="primary"
            size="small"
            class="mx-3 user-circle"
            :ripple="false"
          >
            {{ collaborator.first_name[0] }}
            {{ collaborator.last_name[0] }}
            <v-tooltip activator="parent" location="end">
              {{ collaborator.first_name }}
              {{ collaborator.last_name }}
            </v-tooltip>
          </v-btn>
        </template>
        <template v-slot:append>
          <v-icon
            v-if="permissions[project.id] === 'own'"
            icon="mdi-trash-can"
            @click="userToRemove = collaborator"
          />
        </template>
      </v-list-item>
      <v-list-item
        v-if="!project.collaborators.length"
        subtitle="No collaborators"
        class="mx-4"
      />
      <v-list-subheader>
        Followers
        <v-tooltip activator="parent" location="end">
          Permissions: Read, Write
        </v-tooltip>
      </v-list-subheader>
      <v-list-item
        v-for="follower in project.followers"
        :key="follower.id"
        :title="
          follower.first_name && follower.last_name
            ? follower.first_name + ' ' + follower.last_name
            : follower.username
        "
        :subtitle="follower.email"
      >
        <template v-slot:prepend>
          <v-btn
            flat
            icon
            color="primary"
            size="small"
            class="mx-3 user-circle"
            :ripple="false"
          >
            {{ follower.first_name[0] }}
            {{ follower.last_name[0] }}
            <v-tooltip activator="parent" location="end">
              {{ follower.first_name }}
              {{ follower.last_name }}
            </v-tooltip>
          </v-btn>
        </template>
        <template v-slot:append>
          <v-icon
            v-if="permissions[project.id] === 'own'"
            icon="mdi-trash-can"
            @click="userToRemove = follower"
          />
        </template>
      </v-list-item>
      <v-list-item
        v-if="!project.followers.length"
        subtitle="No followers"
        class="mx-4"
      />
    </v-list>
    <v-btn
      v-if="permissions[project.id] === 'own'"
      color="primary"
      @click="
        showUserSelectDialog = true;
        userSelectDialogMode = 'add';
      "
    >
      Add Users
    </v-btn>
    <v-dialog v-model="showUserSelectDialog" width="500">
      <v-card>
        <v-card-title class="pa-3 bg-grey-lighten-2 text-grey-darken-2">
          {{
            userSelectDialogMode === "add" ? "Add Users" : "Select New Owner"
          }}
          <v-btn
            class="close-button transparent"
            variant="flat"
            icon
            @click="showUserSelectDialog = false"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-messages
          color="red"
          :active="userSelectDialogMode === 'transfer'"
          :messages="[
            'Warning: After transferring ownership to another user, you will no \
            longer be able to make changes to permissions or delete the project. \
            You will be added as a collaborator with read/write permissions.',
          ]"
          class="pa-3"
        />
        <v-card-text>
          <v-select
            v-model="selectedUsers"
            :items="allUsers"
            :label="
              userSelectDialogMode === 'add'
                ? 'Users to add'
                : 'New project owner'
            "
            item-title="username"
            :rules="[
              (v) =>
                !(userSelectDialogMode === 'transfer' && v.length > 1) ||
                'Must select one new owner',
            ]"
            return-object
            multiple
            clearable
            chips
            closable-chips
          >
            <template v-slot:item="{ props, item }">
              <v-list-item
                v-bind="props"
                :title="
                  item.raw.first_name && item.raw.last_name
                    ? item.raw.first_name + ' ' + item.raw.last_name
                    : item.raw.username
                "
                :subtitle="item.raw.email"
              ></v-list-item>
            </template>
          </v-select>
          <v-select
            v-if="userSelectDialogMode === 'add'"
            v-model="selectedPermissionLevel"
            :items="permissionLevels"
            label="Permission Level"
          />
          <v-card-actions>
            <v-btn
              color="primary"
              @click="savePermissions"
              :disabled="!selectedUsers.length"
            >
              Submit
            </v-btn>
          </v-card-actions>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-dialog :model-value="!!userToRemove" width="500">
      <v-card>
        <v-card-title class="pa-3 bg-grey-lighten-2 text-grey-darken-2">
          Remove User
          <v-btn
            class="close-button transparent"
            variant="flat"
            icon
            @click="userToRemove = undefined"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text v-if="userToRemove">
          Are you sure you want to remove {{ userToRemove.username }} from this
          project?
        </v-card-text>
        <v-card-actions class="d-flex" style="justify-content: space-evenly">
          <v-btn color="red" @click="savePermissions">Delete</v-btn>
          <v-btn
            color="primary"
            @click="userToRemove = undefined"
            variant="tonal"
          >
            Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.user-circle {
  letter-spacing: -2px;
  font-weight: bold;
}
</style>
