<template>
  <Toast />
  <div class="card flex justify-center">
    <!-- Button to open the modal -->
    <Button label="Create New Group" @click="visible = true" />

    <!-- Modal for group creation -->
    <Dialog v-model:visible="visible" modal header="Create New Group" :style="{ width: '30rem' }">
      <span class="span-desc">Enter group details.</span>

      <!-- Group Name Input -->
      <div class="form-group">
        <label for="groupName" class="font-semibold w-24">Group Name </label>
        <InputText id="groupName" class="input" v-model="newGroupName" autocomplete="off" />
      </div>

      <!-- Person 1 Input -->
      <div class="form-group">
        <label for="person1" class="font-semibold w-24">Person 1 </label>
        <InputText id="person1" class="input" v-model="newPerson1" autocomplete="off" />
      </div>

      <!-- Person 2 Input -->
      <div class="form-group">
        <label for="person2" class="font-semibold w-24">Person 2 </label>
        <InputText id="person2" class="input" v-model="newPerson2" autocomplete="off" />
      </div>

      <div class="form-actions">
        <Button label="Cancel" severity="secondary" @click="visible = false" />
        <Button label="Create" severity="primary" :disabled="!isFormValid" @click="createGroup" />
      </div>
    </Dialog>

  </div>

  <div class="groups">
    <h1>Groups</h1>
    <div v-if="error">{{ error.message }}</div>
    <div v-if="pending">Loading...</div>
    <ConfirmDialog />

    <div class="flex align-items-center gap-2 mb-3">
      <Checkbox v-model="showArchived" binary />
      <label for="showArchived"> Show Archived Groups</label>
    </div>

    <DataTable v-if="data && data.length" :value="filteredGroups" tableStyle="min-width: 50rem"
      responsiveLayout="scroll">
      <Column field="id" header="ID"></Column>
      <Column field="name" header="Group Name">
        <template #body="slotProps">
          <NuxtLink :to="`/groups/${slotProps.data.id}`">{{ slotProps.data.name }}</NuxtLink>
        </template>
      </Column>
      <Column header="Date Created">
        <template #body="slotProps">
          {{ formatDate(slotProps.data.date_created) }}
        </template>
      </Column>
      <!-- <Column header="Group Balance">
        <template #body="slotProps">
          <div v-if="calculateBalance(slotProps.data.id) === 0">
            No Balance
          </div>
          <div v-else>
            <span v-if="parseFloat(balancePerson1) > parseFloat(balancePerson2)">
              {{ slotProps.data.person2 }} owes {{ slotProps.data.person1 }}: $
              {{ (parseFloat(balancePerson1) - parseFloat(balancePerson2)).toFixed(2) }}
            </span>
            <span v-else>
              {{ slotProps.data.person1 }} owes {{ slotProps.data.person2 }}: $
              {{ (parseFloat(balancePerson2) - parseFloat(balancePerson1)).toFixed(2) }}
            </span>
          </div>
        </template>
      </Column> -->
      <Column header="Group Balance">
      <template #body="slotProps">
        <div v-if="groupBalances[slotProps.data.id]?.balance === 0">
          <Badge value="No Balance" severity="info" />
        </div>
        <div v-else>
          <span v-if="groupBalances[slotProps.data.id]?.balancePerson1 > groupBalances[slotProps.data.id]?.balancePerson2">
            <Badge :value="slotProps.data.person2" severity="secondary" /> owes 
            <Badge :value="slotProps.data.person1" severity="primary" />: 
            <Badge 
              :value="`$${(groupBalances[slotProps.data.id]?.balancePerson1 - groupBalances[slotProps.data.id]?.balancePerson2).toFixed(2)}`" 
              severity="warn" 
            />
          </span>
          <span v-else>
            <Badge :value="slotProps.data.person1" severity="primary" /> owes 
            <Badge :value="slotProps.data.person2" severity="secondary" />: 
            <Badge 
              :value="`$${(groupBalances[slotProps.data.id]?.balancePerson2 - groupBalances[slotProps.data.id]?.balancePerson1).toFixed(2)}`" 
              severity="warn" 
            />
          </span>
        </div>
      </template>
    </Column>
      <Column header="Active Status">
        <template #body="slotProps">
          <Tag :value="slotProps.data.is_archived ? 'Archived' : 'Active'"
            :severity="slotProps.data.is_archived ? 'danger' : 'success'" />
        </template>
      </Column>
      <Column header="Settled Status">
        <template #body="slotProps">
          <Tag :value="slotProps.data.is_settled ? 'Yes' : 'No'"
            :severity="slotProps.data.is_settled ? 'success' : 'warn'" />
        </template>
      </Column>
      <Column header="Actions">
        <template #body="slotProps">
          <Button label="Delete" icon="pi pi-trash" class="p-button-danger p-button-text"
            @click="confirmDelete(slotProps.data.id)" />
          <Button v-if="slotProps.data.is_archived" label="Restore" icon="pi pi-folder-open"
            class="p-button-secondary p-button-text"
            @click="toggleArchiveGroup(slotProps.data.id, slotProps.data.is_archived)" />
          <Button v-else label="Archive" icon="pi pi-folder" class="p-button-secondary p-button-text"
            @click="toggleArchiveGroup(slotProps.data.id, slotProps.data.is_archived)" />

          <Button v-if="slotProps.data.is_settled" label="Unsettle Group" icon="pi pi-times"
            class="p-button-secondary p-button-text" @click="unsettleGroup(slotProps.data.id)" />
          <Button v-else label="Settle Group" icon="pi pi-check" class="p-button-primary p-button-text"
            @click="settleGroup(slotProps.data.id)" />
        </template>
      </Column>
    </DataTable>
  </div>

</template>


<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { format } from 'date-fns';

const toast = useToast();
const config = useRuntimeConfig()
const newGroupName = ref('')
const newPerson1 = ref('')
const newPerson2 = ref('')
const visible = ref(false);
const confirm = useConfirm();
const groupBalances = ref({});
const showArchived = ref(false); // Toggle to show/hide archived groups

const { data, pending, error, refresh } = useFetch(`${config.public.apiBaseUrl}/groups/`, {
  onRequest({ request, options }) {
    console.log('Fetching groups from:', request)
  },
  onResponse({ response }) {
    console.log('Groups fetched successfully:', response._data)
  },
  onResponseError({ response }) {
    console.error('Error fetching groups:', response)
  }
})


const isFormValid = computed(() => {
  return newGroupName.value && newPerson1.value && newPerson2.value;
});

const filteredGroups = computed(() => {
  return showArchived.value
    ? data.value.filter(group => !group.is_hidden)
    : data.value.filter(group => !group.is_hidden && !group.is_archived);
});

const formatDate = (date) => {
  return format(new Date(date), 'yyyy-MM-dd'); // Adjust format as needed
};

const fetchGroupBalances = async () => {
  try {
    const response = await fetch(`${config.public.apiBaseUrl}/groups/balances`);
    const data = await response.json();

    console.log(response)
    
    // Iterate over all group balances and store them in the groupBalances object
    data.forEach(groupBalance => {
      groupBalances.value[groupBalance.id] = {
        balancePerson1: parseFloat(groupBalance.balance_person1),
        balancePerson2: parseFloat(groupBalance.balance_person2),
        balance: Math.abs(parseFloat(groupBalance.balance_person1) - parseFloat(groupBalance.balance_person2))
      };
    });
    console.log(groupBalances)
  } catch (err) {
    console.error('Error fetching group balances:', err);
  }
};

// Function to calculate the balance for a specific group
const calculateBalance = async (groupId) => {
  // If the group's balance is not already fetched, fetch all group balances
  if (!groupBalances.value[groupId]) {
    await fetchGroupBalances();
  }
  return groupBalances.value[groupId]?.balance || 0;
};


// const calculateBalance = async (groupId) => {
//   await fetchGroupBalance(groupId)
//   console.log(balancePerson1.value)
//   console.log(balancePerson2.value)
//   // Calculate the balance difference
//   return Math.abs(balancePerson1.value - balancePerson2.value);
// };

// const fetchGroupBalance = async (groupId) => {
//   try {
//     const response = await fetch(`${config.public.apiBaseUrl}/groups/${groupId}/balance`)
//     const data = await response.json()
//     balancePerson1.value = parseFloat(data.balance_person1)
//     balancePerson2.value = parseFloat(data.balance_person2)
//   } catch (err) {
//     console.error('Error fetching group balance:', err)
//   }
// }

const createGroup = async () => {
  try {
    await $fetch(`${config.public.apiBaseUrl}/groups/`, {
      method: 'POST',
      body: {
        name: newGroupName.value,
        person1: newPerson1.value,
        person2: newPerson2.value,
        is_hidden: false,
        is_archived: false
      }
    })
    newGroupName.value = ''
    newPerson1.value = ''
    newPerson2.value = ''
    await refresh() // Refresh the list of groups
  } catch (err) {
    console.error('Error creating group:', err)
  }
}

const confirmDelete = (groupId) => {
  confirm.require({
    message: 'Are you sure you want to delete this group?',
    header: 'Delete Confirmation',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true
    },
    acceptProps: {
      label: 'Delete',
      severity: 'danger'
    },
    accept: () => {
      hideGroup(groupId); // Call delete logic if confirmed
    }
  });
};

const hideGroup = async (groupId) => {
  try {
    const response = await fetch(`${config.public.apiBaseUrl}/groups/${groupId}/hide`, {
      method: 'PUT'
    });

    if (response.ok) {
      // Show success message
      toast.add({ severity: 'info', summary: 'Success', detail: 'Group deleted successfully', life: 3000 });

      // Refresh the list of groups
      await refresh();
    } else {
      throw new Error('Failed to delete group');
    }
  } catch (error) {
    console.error('Error hiding group:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete group', life: 3000 });
  }
}

// Function to toggle the archive state of a group (archive/restore)
const toggleArchiveGroup = async (groupId, isArchived) => {
  try {
    const endpoint = isArchived ? `${config.public.apiBaseUrl}/groups/${groupId}/restore` : `${config.public.apiBaseUrl}/groups/${groupId}/archive`;

    await $fetch(endpoint, { method: 'PATCH' });

    // Show success message
    toast.add({
      severity: isArchived ? 'success' : 'info',
      summary: isArchived ? 'Success' : 'Info',
      detail: `Group ${isArchived ? 'restored' : 'archived'} successfully`,
      life: 3000
    });

    console.log(`${isArchived ? 'Restored' : 'Archived'} group ${groupId}`);
    await refresh(); // Refresh the group list after action

  } catch (error) {
    console.error(`Failed to ${isArchived ? 'restore' : 'archive'} group:`, error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to ${isArchived ? 'restore' : 'archive'} group.`,
      life: 3000
    });
  }
};

const settleGroup = async (groupId) => {
  try {
    await $fetch(`${config.public.apiBaseUrl}/groups/${groupId}/settle`, { method: 'PATCH' });

    // Show success message
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Group settled successfully',
      life: 3000
    });
    console.log('Group settled successfully');
    await refresh(); // Refresh the group list after action

  } catch (error) {
    console.error("Failed to settle group:", error);

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to settled group.`,
      life: 3000
    });
  }
}

const unsettleGroup = async (groupId) => {
  try {

    await $fetch(`${config.public.apiBaseUrl}/groups/${groupId}/unsettle`, { method: 'PATCH' });

    // Show success message
    toast.add({
      severity: 'info',
      summary: 'Success',
      detail: 'Group unsettled successfully',
      life: 3000
    });
    console.log('Group unsettled successfully');
    await refresh(); // Refresh the group list after action

    // Handle success and refresh group list
  } catch (error) {
    console.error("Failed to unsettle group:", error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to settled group.`,
      life: 3000
    });
  }
}


// Add a watcher to refresh the data when the route changes
watch(() => useRoute().path, async (newPath, oldPath) => {
  console.log(`Route changed from ${oldPath} to ${newPath}`)
  await refresh()
})

// Fetch balances for all groups on component mount
onMounted(() => {
  fetchGroupBalances()
});

</script>

<style scoped>
.mb-3 {
  margin-bottom: 1rem;
}

.groups {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 10px;
  width: 90%;
  margin: 20px auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.input {
  flex: 1;
  max-width: 250px;
  /* Adjust max-width as needed */
}

.span-desc {
  color: #6c757d;
  /* Equivalent to text-surface-500 */
  display: block;
  /* Equivalent to block */
  margin-bottom: 2rem;
}
</style>
