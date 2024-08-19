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

    <!-- Upload CSV Section -->
    <div class="upload-section">
      <h2>Upload CSV File</h2>
      <form @submit.prevent="uploadFile" class="upload-form">
        <div class="form-group">
          <label for="file-upload" class="form-label">Choose a CSV File: </label>
          <input type="file" id="file-upload" @change="handleFileChange" class="form-control" required />
        </div>

        <div class="form-group">
          <label for="owner" class="form-label">Select File Owner: </label>
          <select v-model="selectedOwner" id="owner" class="form-control" required>
            <option :value="data.person1">{{ data.person1 }}</option>
            <option :value="data.person2">{{ data.person2 }}</option>
          </select>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Upload</button>
        </div>
      </form>
    </div>

    <!-- Uploaded Files Section -->
    <div class="uploaded-files-section">
      <h2>Uploaded Files</h2>
      <div class="file-balances">
        <div class="balance-item">
          <p><strong>{{ data.person1 }}'s File Balance:</strong> {{ fileBalancePerson1.toFixed(2) }}</p>
        </div>
        <div class="balance-item">
          <p><strong>{{ data.person2 }}'s File Balance:</strong> {{ fileBalancePerson2.toFixed(2) }}</p>
        </div>
      </div>

      <ul class="file-list">
        <li v-for="file in files" :key="file.id">
          <button @click="fetchTransactions(file)" :class="{ 'selected-file': file.id === activeFile }"
            class="file-button">
            {{ file.name }} (ID: {{ file.id }}, Owner: {{ file.owner }})
          </button>
        </li>
      </ul>
      <div class="form-actions">
        <button @click="queryPastSelections" class="btn btn-secondary">Auto-Fill Actions Based on Past Selections</button>
      </div>

    </div>

    <!-- Transactions Table Section -->
    <h2>Transactions</h2>
    <div v-if="uploadError" class="error">{{ uploadError }}</div>
    <div v-if="uploadPending">Uploading...</div>
    <div class="table-container">
      <table v-if="transactions.length > 0">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Ignore</th>
            <th>Split 50/50</th>
            <th>Charge {{ data.person1 }}</th>
            <th>Charge {{ data.person2 }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(transaction, index) in transactions" :key="index">
            <td>{{ transaction.date }}</td>
            <td>{{ transaction.description }}</td>
            <td>{{ transaction.amount }}</td>
            <td>
              <input type="radio" :name="'action' + index" value="Ignore" v-model="transaction.action"
                @change="handleActionChange(transaction, 'Ignore')" />
            </td>
            <td>
              <input type="radio" :name="'action' + index" value="Split 50/50" v-model="transaction.action"
                @change="handleActionChange(transaction, 'Split 50/50')" />
            </td>
            <td>
              <input type="radio" :name="'action' + index" :value="`Charge only ${data.person1}`"
                v-model="transaction.action" @change="handleActionChange(transaction, `Charge only ${data.person1}`)" />
            </td>
            <td>
              <input type="radio" :name="'action' + index" :value="`Charge only ${data.person2}`"
                v-model="transaction.action" @change="handleActionChange(transaction, `Charge only ${data.person2}`)" />
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else>
        <p>No transactions found for this file.</p>
      </div>
    </div>

    <button @click="submitResults" class="submit-button">Submit Results</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRuntimeConfig, useFetch } from '#imports'

const route = useRoute()
const config = useRuntimeConfig()
const groupId = route.params.id

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
const selectedOwner = ref(null)
const selectedFile = ref(null)
const uploadPending = ref(false)
const uploadError = ref(null)
const transactions = ref([])
const files = ref([])

const balancePerson1 = ref(0)
const balancePerson2 = ref(0)

const fileBalancePerson1 = ref(0)
const fileBalancePerson2 = ref(0)

let originalTransactions = []

const handleFileChange = (event) => {
  selectedFile.value = event.target.files[0];
}

const selectFile = (file) => {
  selectedFile.value = file;  // Set the selected file
  selectedOwner.value = file.owner;  // Set the owner based on the selected file
  fetchTransactions(file.id);  // Fetch transactions for the selected file
};


const uploadFile = async () => {
  if (!selectedFile.value || !selectedOwner.value) {
    return;
  }

  const formData = new FormData();
  formData.append('file', selectedFile.value);
  formData.append('owner', selectedOwner.value);

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
      // Notify the user that the upload was successful
      alert('File uploaded successfully!');
    } else {
      throw new Error('Error uploading file');
    }
  } catch (err) {
    console.error('Error uploading file:', err);
    uploadError.value = 'Error uploading file';
  } finally {
    uploadPending.value = false;
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

    alert('Actions auto-filled based on past selections for the same owner!');
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
    files.value = data
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
      throw new Error("No file selected. Please select a file to view transactions.");
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

    // Notify submission was successful
    alert('Submission completed successfully!');

  } catch (error) {
    console.error('Error submitting results:', error);
    console.log('Data that was submitted:', JSON.stringify(transactions.value, null, 2));
    throw new Error('Error submitting results');
  }
}

onMounted(() => {
  fetchFiles()
  fetchGroupBalance()
  if (files.value.length > 0) {
    selectFile(files.value[0]);
  }
})
</script>

<style scoped>
/* Existing styles */

.group-details, .upload-section, .uploaded-files-section {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 10px;
  max-width: 600px;
  margin: 20px auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Add a more card-like style */
.balances, .file-balances {
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

.upload-form, .file-list {
  width: 100%;
}

/* Center and align the form */
.upload-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-actions {
  display: flex;
  justify-content: center;
}

.file-list button {
  margin-top: 10px;
}

.file-button {
  padding: 12px 15px;
  background-color: #f9f9f9;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 90%;
  transition: background-color 0.3s ease;
}

.file-button:hover {
  background-color: #e3f2fd;
}

.selected-file {
  background-color: #007bff;
  color: white;
}

.table-container {
  margin-top: 20px;
  background-color: #f9f9f9;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  margin-top: 10px;
}

th,
td {
  padding: 12px;
  border: 1px solid #ddd;
  text-align: left;
}

th {
  background-color: #007bff;
  color: white;
  text-align: center;
}

td {
  text-align: center;
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

</style>
