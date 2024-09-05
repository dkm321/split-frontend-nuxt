<template>
  <div>
    <h1>Groups</h1>
    <div v-if="error">{{ error.message }}</div>
    <div v-if="pending">Loading...</div>
    <ul v-if="data && data.length">
      <li v-for="group in data" :key="group.id">
        <NuxtLink :to="`/groups/${group.id}`">{{ group.name }}</NuxtLink>
        <Button 
          label="Delete" 
          icon="pi pi-trash" 
          class="p-button-danger p-button-text" 
          @click="hideGroup(group.id)" 
        />
      </li>
    </ul>
    
    <h2>Create a New Group</h2>
    <form @submit.prevent="createGroup">
      <input v-model="newGroupName" placeholder="Group Name" required />
      <input v-model="newPerson1" placeholder="Person 1" required />
      <input v-model="newPerson2" placeholder="Person 2" required />
      <Button label="Create" icon="pi pi-check" @click="createGroup"/>

    </form>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const toast = useToast();
const config = useRuntimeConfig()
const newGroupName = ref('')
const newPerson1 = ref('')
const newPerson2 = ref('')

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


// Add a watcher to refresh the data when the route changes
watch(() => useRoute().path, async (newPath, oldPath) => {
  console.log(`Route changed from ${oldPath} to ${newPath}`)
  await refresh()
})
</script>

<style scoped>
/* Add any styles here */
</style>
