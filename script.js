// ==== Category Limits ====
const categoryLimits = {
  Rent: 550,
  Phone: 215,
  Groceries: 180,
  Transportation: 200,
  Dining: 25,
  Clothing: 60,
  Entertainment: 26,
  Emergency: 60,
};

// ==== State Variables ====
let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
let undoStack = [];

// Keep track of the last opened month to restore it later
let lastOpenedMonthKey = null;

// ==== Initialize Current Date ====
function setCurrentDateTime() {
  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);
  document.getElementById("date").value = localISO;
}
setCurrentDateTime();

// ==== Form Submission ====
document.getElementById("expense-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const date = document.getElementById("date").value;
  const category = document.getElementById("category").value;
  const amount = parseFloat(document.getElementById("amount").value);
  if (!date || !category || isNaN(amount)) return;

  expenses.push({ date, category, amount });
  localStorage.setItem("expenses", JSON.stringify(expenses));
  updateRemainingBudget();
  showHistory();
  e.target.reset();
  setCurrentDateTime();

//   amountInput.blur();
    document.activeElement.blur();

});


// ==== Budget Display ====
function updateRemainingBudget() {
  const spent = {};
  expenses.forEach(e => spent[e.category] = (spent[e.category] || 0) + e.amount);

  const tableBody = document.getElementById("budget-body");
  tableBody.innerHTML = "";

  Object.entries(categoryLimits).forEach(([category, limit]) => {
    const used = spent[category] || 0;
    const remaining = limit - used;
    const percentUsed = ((used / limit) * 100).toFixed(1);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${category}</td>
      <td>$${used.toFixed(2)}</td>
      <td><strong>$${remaining.toFixed(2)}</strong></td>
      <td>${percentUsed}%</td>
    `;
    tableBody.appendChild(row);
  });
}


// ==== History View Grouped by Month and Date ====
// Function to show history view, optionally keeping a specific month open
function showHistory(keepOpen = false) {
  const grouped = {};

  // Group expenses by month and date
  expenses.forEach((entry) => {
    const dateObj = new Date(entry.date);
    const year = dateObj.getFullYear();
    const month = dateObj.toLocaleString("default", { month: "long" });
    const dateOnly = dateObj.toISOString().split("T")[0];
    const monthKey = `${month} ${year}`;

    if (!grouped[monthKey]) grouped[monthKey] = {};
    if (!grouped[monthKey][dateOnly]) grouped[monthKey][dateOnly] = [];

    grouped[monthKey][dateOnly].push(entry);
  });

  const historyView = document.getElementById("history-view");
  historyView.innerHTML = "";

  // Create collapsible month blocks
  for (const month in grouped) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = month;
    details.appendChild(summary);

    // Keep the last opened month open if required
    if (keepOpen && month === lastOpenedMonthKey) {
      details.open = true;
    }

    const monthDatesContainer = document.createElement("div");

    for (const date in grouped[month]) {
      const dateBtn = document.createElement("button");
      dateBtn.textContent = date;
      dateBtn.className = "date-button";
      dateBtn.onclick = () => showDateDetails(date, grouped[month][date]);
      monthDatesContainer.appendChild(dateBtn);
    }

    details.appendChild(monthDatesContainer);
    historyView.appendChild(details);
  }
}

// ==== Entry Details for Specific Date ====
// Function to show details of selected date entries with two back buttons
function showDateDetails(date, entries) {
  const historyView = document.getElementById("history-view");

  // Capture the month key to return to it later
  const dateObj = new Date(entries[0].date);
  const monthName = dateObj.toLocaleString("default", { month: "long" });
  const year = dateObj.getFullYear();
  lastOpenedMonthKey = `${monthName} ${year}`;

  // Header for selected date
  historyView.innerHTML = `
    <hr class="section-divider" />
    <h2>Entries on ${date}</h2>
  `;

  // Handle case with no entries
  if (entries.length === 0) {
    historyView.innerHTML += "<p>No entries for this date.</p>";
    return;
  }

  // Build entry table
  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Time</th>
        <th>Category</th>
        <th>Amount ($)</th>
      </tr>
    </thead>
    <tbody>
      ${entries.map(entry => `
        <tr>
          <td>${new Date(entry.date).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}</td>
          <td>${entry.category}</td>
          <td>$${entry.amount.toFixed(2)}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
  historyView.appendChild(table);

  // Create a container for dual back buttons
  const backButtonsWrapper = document.createElement("div");
  backButtonsWrapper.className = "back-buttons-wrapper";

  // Button to go back to currently open month
  const backToMonthBtn = document.createElement("button");
  backToMonthBtn.textContent = "🔙 Back to Month";
  backToMonthBtn.className = "back-btn";
  backToMonthBtn.onclick = () => showHistory(true);

  // Button to go back to full month list
  const backToAllBtn = document.createElement("button");
  backToAllBtn.textContent = "📅 Back to All Months";
  backToAllBtn.className = "back-btn";
  backToAllBtn.onclick = () => {
    lastOpenedMonthKey = null;
    showHistory(false);
  };

  // Append both buttons to the wrapper
  backButtonsWrapper.appendChild(backToMonthBtn);
  backButtonsWrapper.appendChild(backToAllBtn);

  // Append wrapper to the view
  historyView.appendChild(backButtonsWrapper);

  // Scroll the newly added history section into view
setTimeout(() => {
  historyView.scrollIntoView({ behavior: "smooth", block: "start" });
}, 100);

}

// ==== Export Function ====
function exportData() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  let hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  const timestamp = `${yyyy}-${mm}-${dd}_${String(hours).padStart(2, '0')}-${String(minutes).padStart(2, '0')}-${String(seconds).padStart(2, '0')}_${ampm}`;
  const filename = `expense-backup-${timestamp}.json`;
  const data = new Blob([JSON.stringify(expenses, null, 2)], { type: "application/json" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(data);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ==== Import Function ====
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        expenses = expenses.concat(imported);
        localStorage.setItem("expenses", JSON.stringify(expenses));
        updateRemainingBudget();
        showHistory();
        alert("Data imported successfully.");
      } else {
        alert("Invalid file format.");
      }
    } catch {
      alert("Error reading file.");
    }
  };
  reader.readAsText(file);
}

// ==== Reset Function ====
function resetAllData() {
  const wantBackup = confirm("Do you want to export a backup before resetting all data?");
  if (wantBackup) exportData();

  const confirmed = confirm("Are you sure you want to reset all data?");
  if (confirmed) {
    localStorage.removeItem("expenses");
    expenses = [];
    undoStack = [];
    updateRemainingBudget();
    document.getElementById("history-view").innerHTML = "";
    alert("All data has been reset.");
  }
}

// ==== Undo/Redo Functions ====
function undoLastEntry() {
  if (!expenses.length) return alert("No entries to undo.");
  const last = expenses.at(-1);
  const confirmUndo = confirm(`Undo this entry?\nDate: ${new Date(last.date).toLocaleString()}\nCategory: ${last.category}\nAmount: $${last.amount.toFixed(2)}`);
  if (confirmUndo) {
    undoStack.push(expenses.pop());
    localStorage.setItem("expenses", JSON.stringify(expenses));
    updateRemainingBudget();
    showHistory();
    alert("Last entry has been undone.");
  }
}

function redoLastEntry() {
  if (!undoStack.length) return alert("No entry to redo.");
  expenses.push(undoStack.pop());
  localStorage.setItem("expenses", JSON.stringify(expenses));
  updateRemainingBudget();
  showHistory();
  alert("Last undone entry has been restored.");
}

// ==== Initial Load ====
updateRemainingBudget();
showHistory();

// Automatically refresh the datetime input at the start of every minute
function syncTimeToMinute() {
  const now = new Date();
  const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

  setTimeout(() => {
    setCurrentDateTime(); // Update immediately at next minute
    setInterval(setCurrentDateTime, 60000); // Update every full minute afterward
  }, msToNextMinute);
}

syncTimeToMinute();