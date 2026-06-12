let contacts = JSON.parse(localStorage.getItem("contacts")) || [];
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let editId = null;

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  document.getElementById(screenId).classList.add("active");

  displayTransactions();
  displayContacts();
  displayRecentTransactions();
  displayOutstanding();
  updateSummary();
  updateDesktopDashboard();
}

function saveData() {
  localStorage.setItem("contacts", JSON.stringify(contacts));
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

function addContact() {
  let name = document.getElementById("contactName").value.trim();
  let phone = document.getElementById("contactPhone").value.trim();
  let openingCredit = Number(document.getElementById("openingCredit").value) || 0;
  let openingDebit = Number(document.getElementById("openingDebit").value) || 0;
  let contactType = document.getElementById("contactType").value;

  if (name === "") {
    alert("Please enter contact name");
    return;
  }

  let exists = contacts.some(c => c.name.toLowerCase() === name.toLowerCase());

  if (exists) {
    alert("Contact already exists");
    return;
  }

  contacts.push({
    id: Date.now(),
    name,
    phone,
    openingCredit,
    openingDebit,
    contactType
  });

  saveData();
  saveContactsToCloud();
  document.getElementById("contactName").value = "";
  document.getElementById("contactPhone").value = "";
  document.getElementById("openingCredit").value = "";
  document.getElementById("openingDebit").value = "";
  document.getElementById("contactType").value = "Customer";

  refreshAll();
}

function loadContacts() {
  let select = document.getElementById("personSelect");
  select.innerHTML = '<option value="">Select contact</option>';

  contacts.forEach(contact => {
    select.innerHTML += `<option value="${contact.name}">${contact.name}</option>`;
  });
}

function addTransaction() {
  let date = document.getElementById("date").value;
  let type = document.getElementById("type").value;
  let amount = Number(document.getElementById("amount").value);
  let dueDate = document.getElementById("dueDate").value;
  let selectedPerson = document.getElementById("personSelect").value;
  let newPerson = document.getElementById("newPerson").value.trim();
  let paymentMode = document.getElementById("paymentMode").value;
  let notes = document.getElementById("notes").value.trim();

  let person = selectedPerson || newPerson;

  if (date === "" || amount <= 0 || person === "") {
    alert("Please fill date, amount and person name");
    return;
  }

  if (newPerson && !contacts.some(c => c.name.toLowerCase() === newPerson.toLowerCase())) {
    contacts.push({
      id: Date.now(),
      name: newPerson,
      phone: "",
      openingCredit: 0,
      openingDebit: 0,
      contactType: "Other"
    });
  }

  if (editId === null) {
    transactions.push({
      id: Date.now(),
      date,
      type,
      amount,
      person,
      dueDate,
      paymentMode,
      notes
    });

    alert("Transaction saved successfully");
  } else {
    transactions = transactions.map(t => {
      if (t.id === editId) {
        return {
          id: editId,
          date,
          type,
          amount,
          person,
          dueDate,
          paymentMode,
          notes
        };
      }
      return t;
    });

    editId = null;
    alert("Transaction updated successfully");
  }

  saveData();
  saveContactsToCloud();
  saveTransactionsToCloud();
  document.getElementById("amount").value = "";
  document.getElementById("dueDate").value = "";
  document.getElementById("newPerson").value = "";
  document.getElementById("notes").value = "";
  document.getElementById("personSelect").value = "";

  refreshAll();
  showScreen("home");
}

function displayTransactions() {
  let list = document.getElementById("transactionList");
  let search = document.getElementById("search") ? document.getElementById("search").value.toLowerCase() : "";

  list.innerHTML = "";

  let filtered = transactions.filter(t =>
    t.person.toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    list.innerHTML = `<p class="small">No transactions found</p>`;
    return;
  }

  filtered.slice().reverse().forEach(t => {
    list.innerHTML += `
      <div class="transaction">
        <strong>${t.person}</strong>

        <div class="${t.type.toLowerCase()}">
          ${t.type} ₹${t.amount}
        </div>

        <div class="small">
          ${t.date} | Due: ${t.dueDate || "Not Set"} | ${t.paymentMode}
        </div>

        <div class="small">${t.notes || ""}</div>

        <button onclick="editTransaction(${t.id})">✏️ Edit</button>
        <button onclick="deleteTransaction(${t.id})">🗑 Delete</button>
      </div>
    `;
  });
}

function displayRecentTransactions() {
  let recent = document.getElementById("recentTransactions");
  recent.innerHTML = "";

  let latest = transactions.slice().reverse().slice(0, 5);

  if (latest.length === 0) {
    recent.innerHTML = `<p class="small">No transactions yet</p>`;
    return;
  }

  latest.forEach(t => {
    recent.innerHTML += `
      <div class="transaction">
        <strong>${t.person}</strong>

        <div class="${t.type.toLowerCase()}">
          ${t.type === "Credit" ? "+" : "-"} ₹${t.amount}
        </div>

        <div class="small">${t.date} | ${t.paymentMode}</div>
      </div>
    `;
  });
}

function deleteTransaction(id) {
  if (!confirm("Are you sure you want to delete this transaction?")) return;

  transactions = transactions.filter(t => t.id !== id);
  saveData();
  refreshAll();
}

function editTransaction(id) {
  let transaction = transactions.find(t => t.id === id);

  if (!transaction) {
    alert("Transaction not found");
    return;
  }

  editId = id;

  document.getElementById("date").value = transaction.date;
  document.getElementById("type").value = transaction.type;
  document.getElementById("amount").value = transaction.amount;
  document.getElementById("dueDate").value = transaction.dueDate || "";
  document.getElementById("paymentMode").value = transaction.paymentMode;
  document.getElementById("notes").value = transaction.notes || "";

  document.getElementById("personSelect").value = transaction.person;
  document.getElementById("newPerson").value = "";

  showScreen("add");
}

function updateSummary() {
  let totalCredit = 0;
  let totalDebit = 0;

  transactions.forEach(t => {
    if (t.type === "Credit") {
      totalCredit += Number(t.amount);
    } else {
      totalDebit += Number(t.amount);
    }
  });

  document.getElementById("totalCredit").innerText = "₹" + totalCredit;
  document.getElementById("totalDebit").innerText = "₹" + totalDebit;
  document.getElementById("netBalance").innerText = "₹" + (totalCredit - totalDebit);
}

function getPersonBalance(personName) {
  let contact = contacts.find(c => c.name === personName);

  let openingCredit = contact ? Number(contact.openingCredit) || 0 : 0;
  let openingDebit = contact ? Number(contact.openingDebit) || 0 : 0;

  let credit = 0;
  let debit = 0;

  transactions.forEach(t => {
    if (t.person === personName) {
      if (t.type === "Credit") credit += Number(t.amount);
      else debit += Number(t.amount);
    }
  });

  return openingCredit - openingDebit + credit - debit;
}

function displayContacts() {
  let list = document.getElementById("contactList");
  list.innerHTML = "";

  if (contacts.length === 0) {
    list.innerHTML = `<p class="small">No contacts added yet</p>`;
    return;
  }

  contacts.forEach(contact => {
    let balance = getPersonBalance(contact.name);

    list.innerHTML += `
      <div class="contact-card" onclick="openPersonLedger('${contact.name}')">
        <strong>${contact.name}</strong>

        <div class="small">${contact.phone || "No phone number"}</div>
        <div class="small">${contact.contactType || "Other"}</div>

        <div class="small">Opening Credit: ₹${contact.openingCredit || 0}</div>
        <div class="small">Opening Debit: ₹${contact.openingDebit || 0}</div>

        <div class="${balance >= 0 ? "credit" : "debit"}">
          ${balance >= 0 ? "Receivable" : "Payable"} ₹${Math.abs(balance)}
        </div>
      </div>
    `;
  });
}

function openPersonLedger(personName) {
  showScreen("personLedger");

  document.getElementById("ledgerPersonName").innerText = personName;

  let contact = contacts.find(c => c.name === personName);

  let openingCredit = contact ? Number(contact.openingCredit) || 0 : 0;
  let openingDebit = contact ? Number(contact.openingDebit) || 0 : 0;

  let credit = 0;
  let debit = 0;
  let personTransactions = [];

  transactions.forEach(t => {
    if (t.person === personName) {
      personTransactions.push(t);

      if (t.type === "Credit") credit += Number(t.amount);
      else debit += Number(t.amount);
    }
  });

  document.getElementById("personCredit").innerText = "₹" + credit;
  document.getElementById("personDebit").innerText = "₹" + debit;
  document.getElementById("personNet").innerText = "₹" + (openingCredit - openingDebit + credit - debit);

  let list = document.getElementById("personTransactions");
  list.innerHTML = "";

  if (personTransactions.length === 0) {
    list.innerHTML = `<p class="small">No transactions for this person</p>`;
    return;
  }

  personTransactions.slice().reverse().forEach(t => {
    list.innerHTML += `
      <div class="transaction">
        <div class="${t.type.toLowerCase()}">
          ${t.type} ₹${t.amount}
        </div>

        <div class="small">${t.date} | ${t.paymentMode}</div>
        <div class="small">Due: ${t.dueDate || "Not Set"}</div>
        <div class="small">${t.notes || ""}</div>
      </div>
    `;
  });
}

function displayOutstanding() {
  let receivableList = document.getElementById("receivableList");
  let payableList = document.getElementById("payableList");

  receivableList.innerHTML = "";
  payableList.innerHTML = "";

  contacts.forEach(contact => {
    let balance = getPersonBalance(contact.name);

    if (balance > 0) {
      receivableList.innerHTML += `
        <div class="contact-card">
          <strong>${contact.name}</strong>
          <div class="credit">Receivable ₹${balance}</div>
        </div>
      `;
    } else if (balance < 0) {
      payableList.innerHTML += `
        <div class="contact-card">
          <strong>${contact.name}</strong>
          <div class="debit">Payable ₹${Math.abs(balance)}</div>
        </div>
      `;
    }
  });

  if (receivableList.innerHTML === "") {
    receivableList.innerHTML = `<p class="small">No receivables</p>`;
  }

  if (payableList.innerHTML === "") {
    payableList.innerHTML = `<p class="small">No payables</p>`;
  }
}

function downloadCSV() {
  let csv = "Date,Due Date,Person,Type,Amount,Payment Mode,Notes\n";

  transactions.forEach(t => {
    csv += `${t.date},${t.dueDate || ""},${t.person},${t.type},${t.amount},${t.paymentMode},${t.notes || ""}\n`;
  });

  let blob = new Blob([csv], { type: "text/csv" });
  let url = URL.createObjectURL(blob);

  let a = document.createElement("a");
  a.href = url;
  a.download = "ledger.csv";
  a.click();

  URL.revokeObjectURL(url);
}

function backupData() {
  const data = {
    contacts,
    transactions
  };

  const jsonData = JSON.stringify(data, null, 2);

  const blob = new Blob([jsonData], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "ledger-backup.json";
  a.click();

  URL.revokeObjectURL(url);
}

function restoreData(event) {
  const file = event.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);

      contacts = data.contacts || [];
      transactions = data.transactions || [];

      saveData();
      refreshAll();

      alert("Backup restored successfully");
    } catch (error) {
      alert("Invalid backup file");
    }
  };

  reader.readAsText(file);
}

function exportPersonPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let personName = document.getElementById("ledgerPersonName").innerText;
  let contact = contacts.find(c => c.name === personName);

  if (!contact) {
    alert("Contact not found");
    return;
  }

  let openingCredit = Number(contact.openingCredit) || 0;
  let openingDebit = Number(contact.openingDebit) || 0;

  let personTransactions = transactions.filter(t => t.person === personName);

  let transactionCredit = 0;
  let transactionDebit = 0;

  personTransactions.forEach(t => {
    if (t.type === "Credit") transactionCredit += Number(t.amount);
    else transactionDebit += Number(t.amount);
  });

  let currentBalance = openingCredit - openingDebit + transactionCredit - transactionDebit;

  doc.setFontSize(18);
  doc.text("LEDGER STATEMENT", 70, 15);

  doc.setFontSize(12);
  doc.text(`Person: ${contact.name}`, 15, 30);
  doc.text(`Phone: ${contact.phone || "N/A"}`, 15, 38);
  doc.text(`Contact Type: ${contact.contactType || "Other"}`, 15, 46);

  doc.text(`Opening Credit: Rs. ${openingCredit}`, 15, 60);
  doc.text(`Opening Debit: Rs. ${openingDebit}`, 15, 68);

  doc.text("Transactions", 15, 82);

  let y = 92;

  doc.text("Date", 15, y);
  doc.text("Type", 55, y);
  doc.text("Amount", 95, y);
  doc.text("Mode", 135, y);

  y += 8;

  personTransactions.forEach(t => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }

    doc.text(t.date, 15, y);
    doc.text(t.type, 55, y);
    doc.text("Rs. " + t.amount, 95, y);
    doc.text(t.paymentMode, 135, y);

    y += 8;
  });

  y += 8;

  if (y > 260) {
    doc.addPage();
    y = 20;
  }

  doc.text(`Transaction Credit: Rs. ${transactionCredit}`, 15, y);
  y += 8;
  doc.text(`Transaction Debit: Rs. ${transactionDebit}`, 15, y);
  y += 8;
  doc.text(`Current Balance: Rs. ${currentBalance}`, 15, y);

  doc.save(`${personName}-ledger-statement.pdf`);
}

function updateDesktopDashboard() {
  let totalCredit = 0;
  let totalDebit = 0;

  transactions.forEach(t => {
    if (t.type === "Credit") {
      totalCredit += Number(t.amount);
    } else {
      totalDebit += Number(t.amount);
    }
  });

  if (document.getElementById("desktopTotalCredit")) {
    document.getElementById("desktopTotalCredit").innerText = "₹" + totalCredit;
    document.getElementById("desktopTotalDebit").innerText = "₹" + totalDebit;
    document.getElementById("desktopNetBalance").innerText = "₹" + (totalCredit - totalDebit);
    document.getElementById("desktopTotalTransactions").innerText = transactions.length;
  }

  let desktopRecent = document.getElementById("desktopRecentTransactions");

  if (!desktopRecent) return;

  desktopRecent.innerHTML = "";

  let latest = transactions.slice().reverse().slice(0, 5);

  if (latest.length === 0) {
    desktopRecent.innerHTML = `<p class="small">No transactions yet</p>`;
    return;
  }

  latest.forEach(t => {
    desktopRecent.innerHTML += `
      <div class="transaction">
        <strong>${t.person}</strong>

        <div class="${t.type.toLowerCase()}">
          ${t.type === "Credit" ? "+" : "-"} ₹${t.amount}
        </div>

        <div class="small">${t.date} | ${t.paymentMode}</div>
      </div>
    `;
  });
}


function refreshAll() {
  loadContacts();
  displayTransactions();
  displayRecentTransactions();
  displayContacts();
  displayOutstanding();
  updateSummary();
  updateDesktopDashboard();
}

window.onload = function () {
  loadDesktopContacts();
displayDesktopContacts();
displayDesktopDues();
  if (document.getElementById("date")) {
    document.getElementById("date").valueAsDate = new Date();
  }

  refreshAll();
};
function showDesktopPage(pageId) {
  const targetPage = document.getElementById(pageId);

  if (!targetPage) {
    console.error("Desktop page not found:", pageId);
    alert("Desktop page not found: " + pageId);
    return;
  }

  document.querySelectorAll(".desktop-page").forEach(page => {
    page.classList.remove("active-desktop-page");
  });

  targetPage.classList.add("active-desktop-page");

  loadDesktopContacts();
  displayDesktopContacts();
  displayDesktopDues();

  if (typeof displayDesktopHistory === "function") {
    displayDesktopHistory();
  }

  updateDesktopDashboard();
}

function loadDesktopContacts() {
  let select = document.getElementById("desktopPersonSelect");

  if (!select) return;

  select.innerHTML = '<option value="">Select contact</option>';

  contacts.forEach(contact => {
    select.innerHTML += `<option value="${contact.name}">${contact.name}</option>`;
  });
}

function addDesktopTransaction() {
  let date = document.getElementById("desktopDate").value;
  let type = document.getElementById("desktopType").value;
  let amount = Number(document.getElementById("desktopAmount").value);
  let selectedPerson = document.getElementById("desktopPersonSelect").value;
  let newPerson = document.getElementById("desktopNewPerson").value.trim();
  let paymentMode = document.getElementById("desktopPaymentMode").value;
  let notes = document.getElementById("desktopNotes").value.trim();

  let person = selectedPerson || newPerson;

  if (date === "" || amount <= 0 || person === "") {
    alert("Please fill date, amount and person name");
    return;
  }

  if (newPerson && !contacts.some(c => c.name.toLowerCase() === newPerson.toLowerCase())) {
    contacts.push({
      id: Date.now(),
      name: newPerson,
      phone: "",
      openingCredit: 0,
      openingDebit: 0,
      contactType: "Other"
    });
  }

  transactions.push({
    id: Date.now(),
    date,
    type,
    amount,
    person,
    dueDate: "",
    paymentMode,
    notes
  });

  saveData();
  saveContactsToCloud();
  saveTransactionsToCloud();
  document.getElementById("desktopAmount").value = "";
  document.getElementById("desktopNewPerson").value = "";
  document.getElementById("desktopNotes").value = "";
  document.getElementById("desktopPersonSelect").value = "";

  refreshAll();
  showDesktopPage("desktopDashboardPage");

  alert("Transaction saved successfully");
}

function displayDesktopContacts() {
  let list = document.getElementById("desktopContactsList");

  if (!list) return;

  list.innerHTML = "";

  if (contacts.length === 0) {
    list.innerHTML = `<p class="small">No contacts added yet</p>`;
    return;
  }

  contacts.forEach(contact => {
    let balance = getPersonBalance(contact.name);

    list.innerHTML += `
      <div class="contact-card">
        <strong>${contact.name}</strong>
        <div class="small">${contact.phone || "No phone number"}</div>
        <div class="small">${contact.contactType || "Other"}</div>
        <div class="${balance >= 0 ? "credit" : "debit"}">
          ${balance >= 0 ? "Receivable" : "Payable"} ₹${Math.abs(balance)}
        </div>
      </div>
    `;
  });
}

function displayDesktopDues() {
  let receivableList = document.getElementById("desktopReceivableList");
  let payableList = document.getElementById("desktopPayableList");

  if (!receivableList || !payableList) return;

  receivableList.innerHTML = "";
  payableList.innerHTML = "";

  contacts.forEach(contact => {
    let balance = getPersonBalance(contact.name);

    if (balance > 0) {
      receivableList.innerHTML += `
        <div class="contact-card">
          <strong>${contact.name}</strong>
          <div class="credit">Receivable ₹${balance}</div>
        </div>
      `;
    } else if (balance < 0) {
      payableList.innerHTML += `
        <div class="contact-card">
          <strong>${contact.name}</strong>
          <div class="debit">Payable ₹${Math.abs(balance)}</div>
        </div>
      `;
    }
  });

  if (receivableList.innerHTML === "") {
    receivableList.innerHTML = `<p class="small">No receivables</p>`;
  }

  if (payableList.innerHTML === "") {
    payableList.innerHTML = `<p class="small">No payables</p>`;
  }
}
function addDesktopContact() {
  let name = document.getElementById("desktopContactName").value.trim();
  let phone = document.getElementById("desktopContactPhone").value.trim();
  let openingCredit = Number(document.getElementById("desktopOpeningCredit").value) || 0;
  let openingDebit = Number(document.getElementById("desktopOpeningDebit").value) || 0;
  let contactType = document.getElementById("desktopContactType").value;

  if (name === "") {
    alert("Please enter contact name");
    return;
  }

  let exists = contacts.some(c => c.name.toLowerCase() === name.toLowerCase());

  if (exists) {
    alert("Contact already exists");
    return;
  }

  contacts.push({
    id: Date.now(),
    name,
    phone,
    openingCredit,
    openingDebit,
    contactType
  });

  saveData();
  saveContactsToCloud();
  document.getElementById("desktopContactName").value = "";
  document.getElementById("desktopContactPhone").value = "";
  document.getElementById("desktopOpeningCredit").value = "";
  document.getElementById("desktopOpeningDebit").value = "";
  document.getElementById("desktopContactType").value = "Customer";

  refreshAll();
  showDesktopPage("desktopContactsPage");

  alert("Contact added successfully");
}
function displayDesktopHistory() {

  let list = document.getElementById("desktopHistoryList");

  if (!list) return;

  let search = "";

  if (document.getElementById("desktopHistorySearch")) {
    search = document.getElementById("desktopHistorySearch").value.toLowerCase();
  }

  list.innerHTML = "";

  let filtered = transactions.filter(t =>
    t.person.toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    list.innerHTML = "<p>No transactions found</p>";
    return;
  }

  filtered.slice().reverse().forEach(t => {

    list.innerHTML += `
      <div class="transaction">

        <strong>${t.person}</strong>

        <div class="${t.type.toLowerCase()}">
          ${t.type} ₹${t.amount}
        </div>

        <div class="small">
          ${t.date} | ${t.paymentMode}
        </div>

        <div class="small">
          ${t.notes || ""}
        </div>

      </div>
    `;
  });
}
function registerUser() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            alert("Registration Successful");
        })
        .catch(error => {
            alert(error.message);
        });
}

function loginUser() {
    console.log("AUTH TEST:", auth);
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            alert("Login Successful");
        })
        .catch(error => {
            alert(error.message);
        });
}

auth.onAuthStateChanged(user => {
  if (user) {
    document.body.classList.remove("auth-mode");

    document.getElementById("authBox").style.display = "none";
    if (typeof loadTransactionsFromCloud === "function") {
       loadTransactionsFromCloud();
}
    if (typeof loadContactsFromCloud === "function") {
     loadContactsFromCloud();
}
   refreshAll();
  } else {
    document.body.classList.add("auth-mode");

    document.getElementById("authBox").style.display = "block";
  }
});
function getCurrentUserId() {
  const user = auth.currentUser;

  if (!user) {
    alert("Please login first");
    return null;
  }

  return user.uid;
}
function saveContactsToCloud() {
  console.log("Saving contacts to cloud...");

  const uid = getCurrentUserId();

  console.log("UID:", uid);
  console.log("Contacts:", contacts);

  if (!uid) return;

  db.collection("users").doc(uid).set({
    contacts: contacts
  }, { merge: true })
  .then(() => {
    console.log("Contacts saved to Firestore successfully");
  })
  .catch(error => {
    console.error("Firestore save error:", error);
  });
}
function saveTransactionsToCloud() {
  console.log("Saving transactions to cloud...");

  const uid = getCurrentUserId();
  console.log("UID:", uid);
  console.log("Transactions:", transactions);

  if (!uid) return;

  db.collection("users").doc(uid).set({
    transactions: transactions
  }, { merge: true })
  .then(() => {
    console.log("Transactions saved to Firestore successfully");
  })
  .catch(error => {
    console.error("Firestore transaction save error:", error);
  });
}

function loadTransactionsFromCloud() {
  const uid = getCurrentUserId();
  if (!uid) return;

  db.collection("users").doc(uid).get()
    .then(doc => {
      if (doc.exists && doc.data().transactions) {
        transactions = doc.data().transactions;
        saveData();
        refreshAll();
      }
    })
    .catch(error => {
      console.log(error);
    });
}