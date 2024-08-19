<template>
  <div>
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

    <div class="upload-section">
      <h2>Upload CSV File</h2>
      <form @submit.prevent="uploadFile" class="upload-form">
        <div class="form-group">
          <label for="file-upload" class="form-label">Choose a CSV File:</label>
          <input type="file" id="file-upload" @change="handleFileChange" class="form-control" required />
        </div>

        <div class="form-group">
          <label for="owner" class="form-label">Select File Owner:</label>
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
    </div>

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
    return
  }

  const formData = new FormData()
  formData.append('file', selectedFile.value)
  formData.append('owner', selectedOwner.value)

  try {
    uploadPending.value = true
    uploadError.value = null
    const response = await fetch(`${config.public.apiBaseUrl}/groups/${groupId}/upload`, {
      method: 'POST',
      body: formData,
    })

    if (response.ok) {
      await fetchFiles() // Refresh the list of files
      await fetchGroupBalance() // Refresh the group balance
    } else {
      throw new Error('Error uploading file')
    }
  } catch (err) {
    console.error('Error uploading file:', err)
    uploadError.value = 'Error uploading file'
  } finally {
    uploadPending.value = false
  }
}

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

  // Ensure balances are numbers and update the display
  // balancePerson1.value += fileBalancePerson1.value
  // balancePerson2.value += fileBalancePerson2.value

  // balancePerson1.value = parseFloat(balancePerson1.value);
  // balancePerson2.value = parseFloat(balancePerson2.value);

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
.balances {
  margin-bottom: 20px;
}

.balances p {
  margin: 0;
  font-size: 18px;
}

.table-container {
  overflow-x: auto;
  margin-top: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

th,
td {
  padding: 12px;
  border: 1px solid #ddd;
  text-align: left;
}

th {
  background-color: #f4f4f4;
}

td {
  background-color: #ffffff;
}

tr:nth-child(even) {
  background-color: #f9f9f9;
}

.upload-form input[type="file"] {
  margin-right: 10px;
}

.upload-form select {
  margin-right: 10px;
}

.error {
  color: red;
  margin-top: 10px;
}

.submit-button {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.submit-button:hover {
  background-color: #0056b3;
}

.cancel-button {
  margin-top: 10px;
  padding: 10px 20px;
  background-color: #ff4d4d;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-left: 10px;
}

.cancel-button:hover {
  background-color: #e60000;
}

/* .upload-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
  max-width: 500px;
  /* Limit the form width 
 }  */

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  margin-bottom: 8px;
  font-weight: bold;
  font-size: 14px;
}

.form-control {
  padding: 8px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 100%;
  /* Ensure the input fits within the form */
  max-width: 400px;
  /* Limit the width of inputs */
}

/* .form-actions {
  display: flex;
  justify-content: flex-start;
} */

.btn {
  padding: 8px 16px;
  font-size: 14px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.file-list {
  list-style-type: none;
  padding: 0;
}

.file-list li {
  margin-bottom: 10px;
}

.file-list button {
  width: 100%;
  text-align: left;
  padding: 10px;
  border: none;
  /* background-color: #f4f4f4; */
  cursor: pointer;
}

.file-list button:hover {
  background-color: #54bbff77;
}

.selected-file {
  background-color: #4398f4;
  color: white;
  border: 2px solid #0056b3;
  font-weight: bold;
}

.group-details {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 10px;
  max-width: 600px;
  margin: 20px auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  color: #007bff;
}

.balances {
  margin-bottom: 20px;
}

.balance-item {
  margin-bottom: 10px;
}

.person-balance {
  font-size: 18px;
  margin: 0;
}

.positive-balance {
  color: green;
}

.negative-balance {
  color: red;
}

.settlement-summary {
  background-color: #e9f7ff;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  font-size: 16px;
  font-weight: bold;
}

.amount-due {
  color: #d9534f;
  font-weight: bold;
}

.settled-message {
  color: #5cb85c;
  font-weight: bold;
}

.alert.alert-danger {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 10px;
  text-align: center;
}

.loading-message {
  text-align: center;
  font-size: 16px;
  color: #007bff;
}

.upload-section,
.uploaded-files-section {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 10px;
  max-width: 600px;
  margin: 20px auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

h2 {
  text-align: center;
  color: #007bff;
  margin-bottom: 20px;
}

/* .upload-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
} */

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  margin-bottom: 8px;
  font-weight: bold;
  font-size: 14px;
}

.form-control {
  padding: 10px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.uploaded-files-section {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.file-balances {
  margin-bottom: 20px;
}

.balance-item {
  margin-bottom: 10px;
  font-size: 16px;
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.file-list li {
  margin-bottom: 10px;
}

.file-button {
  width: 100%;
  text-align: left;
  padding: 10px;
  border: 2px solid transparent;
  border-radius: 5px;
  background-color: #f8f9fa;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s, border-color 0.3s;
}

.file-button:hover {
  background-color: #54bbff77;
}

.selected-file {
  background-color: #007bff;
  color: white;
  border-color: #0056b3;
  font-weight: bold;
}

.upload-section, .uploaded-files-section {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 10px;
  max-width: 600px;
  margin: 20px auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.upload-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%; /* Make the form full width */
}

.form-group {
  display: flex;
  flex-direction: column;
  width: 100%; /* Make the form group full width */
}

.form-label {
  margin-bottom: 8px;
  font-weight: bold;
  font-size: 14px;
  text-align: center; /* Center the label text */
}

.form-control {
  padding: 10px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 100%; /* Make the input/select full width */
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.btn {
  padding: 10px 20px;
  font-size: 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

</style>
