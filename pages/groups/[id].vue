<template>
  <div>
    <!-- Group Details Section -->
    <div class="group-details">
      <h1>Group Details</h1>

      <div v-if="error" class="alert alert-danger">{{ error.message }}</div>
      <div v-if="pending" class="loading-message">Loading...</div>
      <div v-if="data">
        <div class="balances">
          <div class="balance-item">
            <p class="person-balance">
              <strong>{{ data.person1 }}'s Balance:</strong>
              <span :class="{ 'positive-balance': balancePerson1 >= 0, 'negative-balance': balancePerson1 < 0 }">
                ${{ balancePerson1.toFixed(2) }}
              </span>
            </p>
          </div>
          <div class="balance-item">
            <p class="person-balance">
              <strong>{{ data.person2 }}'s Balance:</strong>
              <span :class="{ 'positive-balance': balancePerson2 >= 0, 'negative-balance': balancePerson2 < 0 }">
                ${{ balancePerson2.toFixed(2) }}
              </span>
            </p>
          </div>
        </div>

        <div class="settlement-summary">
          <p v-if="balancePerson1 < balancePerson2">
            <strong>{{ data.person1 }}</strong> owes <strong>{{ data.person2 }}: </strong>
            <span class="amount-due">${{ (balancePerson2 - balancePerson1).toFixed(2) }}</span>
          </p>
          <p v-else-if="balancePerson1 > balancePerson2">
            <strong>{{ data.person2 }}</strong> owes <strong>{{ data.person1 }}: </strong>
            <span class="amount-due">${{ (balancePerson1 - balancePerson2).toFixed(2) }}</span>
          </p>
          <p v-else>
            <span class="settled-message">Both persons are settled up.</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Files Section -->
    <div class="files-section">
      <h2>Files</h2>

      <div>
        <Toast />
        <FileUpload name="file" ref="uploadingFiles" @upload="onTemplatedUpload($event)" :multiple="true" accept=".csv" :maxFileSize="1000000" @select="onSelectedFiles"
          chooseLabel="Choose CSV File">
          <template #header="{ chooseCallback, uploadCallback, clearCallback, files }">
            <div>
              <h3>Upload</h3>
            </div>
            <div class="flex flex-wrap justify-between items-center flex-1 gap-4">
              <div>
                <Select v-model="uploadOwner" :options="owners" optionLabel="name" placeholder="Select Owner"
                  :disabled="uploadPending" />

                <Button @click="chooseCallback" icon="pi pi-images" rounded outlined severity="info"></Button>

                <Button @click="uploadEvent(uploadCallback)" icon="pi pi-cloud-upload" rounded outlined
                  severity="success" :disabled="!files || files.length === 0 || !uploadOwner"></Button>

                <Button @click="clearCallback()" icon="pi pi-times" rounded outlined severity="danger"
                  :disabled="!files || files.length === 0"></Button>

              </div>
            </div>

          </template>

          <template #content="{ files, uploadedFiles, removeUploadedFileCallback, removeFileCallback }">
            <div class="flex flex-col gap-8 pt-4">
              <div v-if="files.length > 0">
                <h5>Pending</h5>
                <div class="flex flex-wrap gap-4">
                  <div v-for="(file, index) of files" :key="file.name + file.type + file.size"
                    class="p-8 rounded-border flex flex-col border border-surface items-center gap-4">
                    <!-- <div>
                      <img role="presentation" :alt="file.name" :src="file.objectURL" width="100" height="50" />
                    </div> -->
                    <span class="font-semibold text-ellipsis max-w-60 whitespace-nowrap overflow-hidden">{{ file.name
                      }}</span>
                    <!-- <div>{{ formatSize(file.size) }}</div> -->
                    <Badge value="Pending" severity="warn" />
                    <Button icon="pi pi-times" @click="onRemoveTemplatingFile(file, removeFileCallback, index)" outlined
                      rounded severity="danger" />
                  </div>
                </div>
              </div>

              <div v-if="uploadedFiles.length > 0">
                <h5>Completed</h5>
                <div class="flex flex-wrap gap-4">
                  <div v-for="(file, index) of uploadedFiles" :key="file.name + file.type + file.size"
                    class="p-8 rounded-border flex flex-col border border-surface items-center gap-4">
                    <!-- <div>
                      <img role="presentation" :alt="file.name" :src="file.objectURL" width="100" height="50" />
                    </div> -->
                    <span class="font-semibold text-ellipsis max-w-60 whitespace-nowrap overflow-hidden">{{ file.name
                      }}</span>
                    <!-- <div>{{ formatSize(file.size) }}</div> -->
                    <Badge value="Completed" class="mt-4" severity="success" />
                    <Button icon="pi pi-times" @click="removeUploadedFileCallback(index)" outlined rounded
                      severity="danger" />
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template #empty>
            <div class="flex items-center justify-center flex-col">
              <i class="pi pi-cloud-upload !border-2 !rounded-full !p-8 !text-4xl !text-muted-color" />
              <p class="mt-6 mb-0">Drag and drop files to here to upload.</p>
            </div>
          </template>

        </FileUpload>
      </div>

      <!-- <div v-if="data" class="card flex gap-4 items-center justify-between flex-wrap upload-section">
        <h3>Upload New File:</h3>
        <Toast />


        <div class="flex-1">
          <div class="file-upload-wrapper">
            <FileUpload ref="fileupload" mode="basic" name="file" :customUpload="true" accept=".csv" :auto="false"
              @select="handleFileChange" @upload="onUpload" :disabled="uploadPending" chooseLabel="Choose CSV File"
              uploadLabel="Upload" cancelLabel="Cancel" />
          </div>
        </div>


        <div class="flex-1">
          <div class="owner-select-wrapper">
            <Select v-model="uploadOwner" :options="owners" optionLabel="name" placeholder="Select Owner"
              class="w-full md:w-14rem" :disabled="uploadPending" />
          </div>
        </div>


        <div class="flex-1">
          <div class="upload-button-wrapper">
            <Button label="Upload File" @click="uploadFile" severity="secondary"
              :disabled="!selectedFile || !uploadOwner || uploadPending" 
            />
          </div>
        </div>
      </div> -->

      <div v-if="data && data.person1 && data.person2">
        <DataTable :value="groupFiles" tableStyle="min-width: 50rem" responsiveLayout="scroll" selectionMode="single"
          v-model:selection="selectedFile" @rowSelect="onRowSelect" @rowUnselect="onRowUnselect">
          <Column field="id" header="ID"></Column>
          <Column field="name" header="File Name"></Column>
          <Column field="owner" header="Owner"></Column>
          <Column field="uploadDate" header="Upload Date"></Column>
          <Column field="balance_person1" :header="`${data.person1}'s Balance`"></Column>
          <Column field="balance_person2" :header="`${data.person2}'s Balance`"></Column>
          <Column header="Actions">
            <template #body="slotProps">
              <Button icon="pi pi-trash" class="p-button-danger" @click="confirmDeleteFile(slotProps.data)" />
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Loading state -->
      <div v-else class="loading-message">Loading files...</div>
    </div>

    <!-- Transactions Table Section -->
    <div class="transactions-section">
      <h2>Transactions</h2>
      <div v-if="uploadError" class="error">{{ uploadError }}</div>
      <div v-if="uploadPending">Uploading...</div>

      <div v-if="data">
        <div class="balance-item">
          <p><strong>{{ data.person1 }}'s File Balance (Unsubmitted):</strong> {{ fileBalancePerson1.toFixed(2) }}</p>
        </div>
        <div class="balance-item">
          <p><strong>{{ data.person2 }}'s File Balance (Unsubmitted):</strong> {{ fileBalancePerson2.toFixed(2) }}</p>
        </div>
      </div>


      <!-- Action Buttons Section -->
      <div class="button-actions">
        <Button label="Auto-Fill Actions Based on Past Selections" @click="queryPastSelections" icon="pi pi-plus"
          class="p-button-secondary" />
        <!-- <Button label="Reset All to Ignore" @click="resetAllToIgnore" icon="pi pi-sync" class="p-button-danger" /> -->
      </div>

      <DataTable v-if="transactions.length > 0" :value="transactions" tableStyle="min-width: 50rem"
        responsiveLayout="scroll" v-model:filters="filters" scrollable scrollHeight="550px" showGridlines dataKey="id"
        filterDisplay="menu" :loading="loading" :globalFilterFields="['date', 'description', 'amount']">
        <template #header>
          <div class="header-container">
            <Button type="button" icon="pi pi-filter-slash" label="Clear Filters" outlined @click="clearFilter()" />
            <IconField class="search-container">
              <InputIcon>
                <i class="pi pi-search" />
              </InputIcon>
              <InputText v-model="filters['global'].value" placeholder="Keyword Search" />
            </IconField>
          </div>
        </template>

        <!-- Date Column -->
        <Column field="date" header="Date">
          <template #filter="{ filterModel }">
            <DatePicker v-model="filterModel.value" dateFormat="mm/dd/yy" placeholder="mm/dd/yyyy" />
          </template>
        </Column>

        <!-- Description Column -->
        <Column field="description" header="Description">
          <template #filter="{ filterModel }">
            <InputText v-model="filterModel.value" placeholder="Search by description" />
          </template>
        </Column>

        <!-- Amount Column -->
        <Column field="amount" header="Amount">
          <template #filter="{ filterModel }">
            <InputNumber v-model="filterModel.value" mode="currency" currency="USD" locale="en-US" />
          </template>
        </Column>

        <!-- Ignore Action Column -->
        <Column header="Ignore">
          <template #body="slotProps">
            <RadioButton v-model="slotProps.data.action" value="Ignore"
              @change="handleActionChange(slotProps.data, 'Ignore')" />
          </template>
        </Column>

        <!-- Split 50/50 Action Column -->
        <Column header="Split 50/50">
          <template #body="slotProps">
            <RadioButton v-model="slotProps.data.action" value="Split 50/50"
              @change="handleActionChange(slotProps.data, 'Split 50/50')" />
          </template>
        </Column>

        <!-- Charge only Person1 Column -->
        <Column :header="`Charge only ${data.person1}`">
          <template #body="slotProps">
            <RadioButton v-model="slotProps.data.action" :value="`Charge only ${data.person1}`"
              @change="handleActionChange(slotProps.data, `Charge only ${data.person1}`)" />
          </template>
        </Column>

        <!-- Charge only Person2 Column -->
        <Column :header="`Charge only ${data.person2}`">
          <template #body="slotProps">
            <RadioButton v-model="slotProps.data.action" :value="`Charge only ${data.person2}`"
              @change="handleActionChange(slotProps.data, `Charge only ${data.person2}`)" />
          </template>
        </Column>

      </DataTable>

      <button @click="submitResults" class="submit-button">Submit Results</button>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRuntimeConfig, useFetch } from '#imports'
import RadioButton from 'primevue/radiobutton';

const route = useRoute()
const config = useRuntimeConfig()
const groupId = route.params.id
const toast = useToast();

const { data, pending, error } = useFetch(`${config.public.apiBaseUrl}/groups/${groupId}`, {
  onRequest({ request, options }) {
    console.log('Fetching group details from:', request)
  },
  onResponse({ response }) {
    console.log('Group details fetched successfully:', response._data)
  },
  onResponseError({ response }) {
    console.error('Error fetching group details:', response)
  }
})

const activeFile = ref(0)
const uploadOwner = ref(null)
const selectedOwner = ref('')
const selectedFile = ref(null)
const uploadPending = ref(false)
const uploadError = ref(null)
const transactions = ref([])
let uploadingFiles = ref([])
const groupFiles = ref([])
// const fileupload = ref(null);

const balancePerson1 = ref(0)
const balancePerson2 = ref(0)

const fileBalancePerson1 = ref(0)
const fileBalancePerson2 = ref(0)

const filters = ref({});
const loading = ref(false);

let originalTransactions = []

// Owners dropdown options
// Computed property to generate owner options for Select component
const owners = computed(() => {
  if (data.value) {
    return [
      { name: data.value.person1, value: data.value.person1 },
      { name: data.value.person2, value: data.value.person2 }
    ];
  }
  return [];
});


const uploadFile = async (file) => {
  console.log('Uploading file.....')
  console.log('Files: ', file)

  if (!file || !uploadOwner.value) {
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('owner', uploadOwner.value.value);

  try {
    uploadPending.value = true;
    uploadError.value = null;

    const response = await fetch(`${config.public.apiBaseUrl}/groups/${groupId}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      await fetchFiles(); // Refresh the list of files
      await fetchGroupBalance(); // Refresh the group balance
      toast.add({ severity: 'info', summary: 'Success', detail: 'File uploaded successfully!', life: 3000 });
    } else {
      throw new Error('Error uploading file');
    }
  } catch (err) {
    console.error('Error uploading file:', err);
    uploadError.value = 'Error uploading file';
    toast.add({ severity: 'error', summary: 'Upload Failed', detail: 'Error uploading file', life: 3000 });
  } finally {
    uploadPending.value = false;
    // fileupload.value.clear(); // Clear the FileUpload component after upload
  }
};

const onRemoveTemplatingFile = (file, removeFileCallback, index) => {
    removeFileCallback(index);
};


const onSelectedFiles = (event) => {
    uploadingFiles.value = event.files;
};

const uploadEvent = (callback) => {
    callback();
};

const onTemplatedUpload = () => {
    uploadingFiles.value.forEach(file => {
      uploadFile(file);
    })
    // toast.add({ severity: "info", summary: "Success", detail: "File Uploaded", life: 3000 });
    uploadingFiles = []
};

const selectFile = (file) => {
  selectedFile.value = file;  // Set the selected file
  selectedOwner.value = file.owner;  // Set the owner based on the selected file
  fetchTransactions(file.id);  // Fetch transactions for the selected file
};

const initFilters = () => {
  filters.value = {
    global: { value: null, matchMode: 'contains' },
    date: { value: null, matchMode: 'equals' },
    description: { value: null, matchMode: 'contains' },
    amount: { value: null, matchMode: 'equals' },
  };
};

const clearFilter = () => {
  initFilters();
};

const onRowSelect = (event) => {
  fetchTransactions(event.data); // Handle the selected row action
};

const onRowUnselect = () => {
  selectedFile.value = null
  selectedOwner.value = ''
  fetchTransactions(null)
}

const confirmDeleteFile = (file) => {
  if (confirm(`Are you sure you want to delete the file: ${file.name}? This action cannot be undone.`)) {
    deleteFile(file);
  }
};

const deleteFile = async (file) => {
  try {
    const response = await fetch(`${config.public.apiBaseUrl}/groups/${groupId}/files/${file.id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      // Remove the file from the files array
      groupFiles.value = groupFiles.value.filter(f => f.id !== file.id);

      await fetchGroupBalance()

      // Show a success message
      toast.add({ severity: 'success', summary: 'Success', detail: 'File deleted successfully', life: 3000 });
    } else {
      throw new Error('Failed to delete file.');
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete file.', life: 3000 });
  }
};

const queryPastSelections = async () => {
  try {
    // Ensure transactions are loaded
    if (!transactions.value.length) {
      console.error('No transactions available to query.');
      return;
    }

    // Extract the descriptions from the current transactions
    const descriptions = transactions.value.map(t => t.description);

    // Log the extracted descriptions
    console.log('Descriptions:', descriptions);

    // Prepare the payload with descriptions and the selected owner
    const payload = {
      descriptions: descriptions,
      owner: selectedOwner.value
    };

    // Log the payload before sending
    console.log('Payload:', payload);

    // Call the API to get past actions for these descriptions and the owner
    const pastActions = await $fetch(`${config.public.apiBaseUrl}/transactions/query-actions`, {
      method: 'POST',
      body: payload
    });

    // Log the response from the API
    console.log('Past Actions:', pastActions);

    // Update the transactions with the auto-selected actions
    transactions.value = transactions.value.map(transaction => {
      if (pastActions[transaction.description]) {
        // sets the past action as the current action
        transaction.action = pastActions[transaction.description];

        //updates the balance (the past action is now the new action)
        handleActionChange(transaction, pastActions[transaction.description]);
      }
      return transaction;
    });

    alert('Auto-filled actions based on previous files.');
  } catch (error) {
    console.error('Error querying past actions:', error);
    alert('Failed to auto-fill actions.');
  }
};

const fetchFiles = async () => {
  try {
    const response = await fetch(`${config.public.apiBaseUrl}/groups/${groupId}/files`)
    const data = await response.json()
    console.log('Files fetched successfully:', data)
    groupFiles.value = data
  } catch (err) {
    console.error('Error fetching files:', err)
  }
}

const fetchGroupBalance = async () => {
  try {
    const response = await fetch(`${config.public.apiBaseUrl}/groups/${groupId}/balance`)
    const data = await response.json()
    balancePerson1.value = parseFloat(data.balance_person1)
    balancePerson2.value = parseFloat(data.balance_person2)
  } catch (err) {
    console.error('Error fetching group balance:', err)
  }
}

const fetchTransactions = async (file) => {
  try {
    if (!file) {
      console.log("No file selected. Please select a file to view transactions.");
      transactions.value = [];
      return
    }
    activeFile.value = file.id
    selectedFile.value = file; // Set the selected file here
    selectedOwner.value = file.owner

    // Assuming balance information is available in selectedFile.value
    fileBalancePerson1.value = file.balance_person1 || 0; // Default to 0 if undefined
    fileBalancePerson2.value = file.balance_person2 || 0; // Default to 0 if undefined

    const response = await fetch(`${config.public.apiBaseUrl}/files/${file.id}/transactions`);
    const data = await response.json();

    if (data && Array.isArray(data)) {
      transactions.value = data.map(transaction => ({
        ...transaction,
        file_id: file.id,
        previous_action: transaction.action // Save the initial action for each transaction
      }));
      originalTransactions = JSON.parse(JSON.stringify(transactions.value)); // Deep clone to store original state
    } else {
      transactions.value = [];
    }
  } catch (err) {
    console.error('Error fetching transactions:', err);
    console.error(selectedFile.value)
    transactions.value = [];
  }
}

const handleActionChange = (transaction, newAction) => {

  const amount = parseFloat(transaction.amount);
  const owner = data.value.owner;  // Assume owner is set in your data


  if (newAction === 'Ignore') {
    // reverses the action
    if (transaction.previous_action === 'Split 50/50') {

      if (transaction.owner === data.value.person1) {
        // Owner is person1, so adjust balance for person2
        fileBalancePerson2.value -= amount / 2;
      } else {
        // Owner is person2, so adjust balance for person1
        fileBalancePerson1.value -= amount / 2;
      }
    } else if (transaction.previous_action === `Charge only ${data.value.person1}`) {
      fileBalancePerson1.value -= amount;
    } else if (transaction.previous_action === `Charge only ${data.value.person2}`) {
      fileBalancePerson2.value -= amount;
    }
  } else if (newAction === 'Split 50/50') {
    if (transaction.previous_action === 'Ignore') {
      if (transaction.owner === data.value.person1) {
        // Owner is person1, so adjust balance for person2
        fileBalancePerson2.value += amount / 2;
      } else {
        // Owner is person2, so adjust balance for person1
        fileBalancePerson1.value += amount / 2;
      }
    } else if (transaction.previous_action === `Charge only ${data.value.person1}`) {
      fileBalancePerson1.value -= amount;

      if (transaction.owner === data.value.person1) {
        // Owner is person1, so adjust balance for person2
        fileBalancePerson2.value += amount / 2;
      } else {
        // Owner is person2, so adjust balance for person1
        fileBalancePerson1.value += amount / 2;
      }

    } else if (transaction.previous_action === `Charge only ${data.value.person2}`) {
      fileBalancePerson2.value -= amount;

      if (transaction.owner === data.value.person1) {
        // Owner is person1, so adjust balance for person2
        fileBalancePerson2.value += amount / 2;
      } else {
        // Owner is person2, so adjust balance for person1
        fileBalancePerson1.value += amount / 2;
      }
    }
  } else if (newAction === `Charge only ${data.value.person1}`) {
    fileBalancePerson1.value += amount;

    if (transaction.previous_action === 'Split 50/50') {
      if (transaction.owner === data.value.person1) {
        // Owner is person1, so adjust balance for person2
        fileBalancePerson2.value -= amount / 2;
      } else {
        // Owner is person2, so adjust balance for person1
        fileBalancePerson1.value -= amount / 2;
      }
    } else if (transaction.previous_action === `Charge only ${data.value.person2}`) {
      fileBalancePerson2.value -= amount;
    }
  } else if (newAction === `Charge only ${data.value.person2}`) {
    fileBalancePerson2.value += amount;

    if (transaction.previous_action === 'Split 50/50') {
      if (transaction.owner === data.value.person1) {
        // Owner is person1, so adjust balance for person2
        fileBalancePerson2.value -= amount / 2;
      } else {
        // Owner is person2, so adjust balance for person1
        fileBalancePerson1.value -= amount / 2;
      }
    } else if (transaction.previous_action === `Charge only ${data.value.person1}`) {
      fileBalancePerson1.value -= amount;
    }
  }

  // Update the previous action to the new action
  transaction.previous_action = newAction;

};

async function submitResults() {
  try {
    console.log('Preparing to submit transactions:', transactions.value);

    // Ensure the owner is added to each transaction before submission
    transactions.value = transactions.value.map(transaction => ({
      ...transaction,
      owner: selectedOwner // Assuming `fileOwner` is defined correctly
    }));

    // Submit the transactions
    const transactionResponse = await $fetch(`${config.public.apiBaseUrl}/groups/${groupId}/transactions`, {
      method: 'POST',
      body: transactions.value,
    });

    console.log('Transactions submitted successfully:', transactionResponse);

    // Use the already calculated balances for submission
    const fileBalancePayload = {
      balance_person1: fileBalancePerson1.value.toFixed(2),
      balance_person2: fileBalancePerson2.value.toFixed(2),
    };

    console.log('File balance payload:', fileBalancePayload);
    console.log("FileID: ", selectedFile.value)

    // Submit the updated balances to the file
    const balanceResponse = await $fetch(`${config.public.apiBaseUrl}/files/${selectedFile.value.id}/balances`, {
      method: 'POST',
      body: fileBalancePayload,
    });

    console.log('File balances updated successfully:', balanceResponse);

    // Refresh the group balance after submission
    await fetchGroupBalance();
    await fetchFiles();

    // Notify submission was successful
    // alert('Submission completed successfully!');
    toast.add({ severity: 'info', summary: 'Success', detail: 'Transactions submitted successfully!', life: 4000 });

  } catch (error) {
    console.error('Error submitting results:', error);
    console.log('Data that was submitted:', JSON.stringify(transactions.value, null, 2));
    throw new Error('Error submitting results');
  }
}



onMounted(() => {
  // console.log('Data on mount: ', data) 
  fetchFiles()
  fetchGroupBalance()
  if (groupFiles.value.length > 0) {
    selectFile(groupFiles.value[0]);
  }
  initFilters();

  // Mock data fetching here
  loading.value = false;
})
</script>

<style scoped>
/* Existing styles */

.group-details,
.files-section,
.transactions-section {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 10px;
  width: 90%;
  margin: 20px auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Add a more card-like style */
.balances,
.file-balances {
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 5px;
  background-color: #f4f4f4;
}

.settlement-summary {
  padding: 15px;
  border-radius: 8px;
  background-color: #e9f7ff;
  text-align: center;
}

.amount-due {
  color: #d9534f;
  font-weight: bold;
}

.settled-message {
  color: #5cb85c;
  font-weight: bold;
}

.upload-section {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 10px;
  width: 100%;
  margin: 20px auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.file-upload,
.dropdown {
  width: 100%;
}

.selected-file {
  background-color: #007bff;
  color: white;
}

.submit-button {
  width: 100%;
  padding: 10px 0;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 5px;
  background-color: #007bff;
  color: white;
  transition: background-color 0.3s ease;
  margin-top: 20px;
}

.submit-button:hover {
  background-color: #0056b3;
}

.file-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.file-row:hover {
  background-color: #f4f4f4;
  cursor: pointer;
}

.selected-file {
  background-color: #007bff72 !important;
  color: white;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-container i {
  font-size: 1.2rem;
}

.search-container input {
  width: 100%;
  max-width: 300px;
}

.transactions-section {
  margin-top: 20px;
}

.balance-item {
  margin: 10px 0;
}

.button-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 10px;
}

.p-button-secondary {
  background-color: #0878cd;
  border: 5px;
  color: white;
}

/* .p-button-danger {
  background-color: #d9534f;
  border: none;
}  */

.button-actions .p-button {
  width: 100%;
  max-width: 300px;
}

.card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.file-upload-wrapper,
.owner-select-wrapper,
.upload-button-wrapper {
  width: 100%;
  max-width: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.file-upload-wrapper {
  max-width: 400px;
}

.owner-select-wrapper {
  max-width: 200px;
}

.upload-button-wrapper {
  max-width: 150px;
}
</style>
