// Set monthly limits for each category
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

let expenses = JSON.parse(localStorage.getItem("expenses")) || [];

function setCurrentDateTime() {
  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
  document.getElementById("date").value = localISO;
}


setCurrentDateTime();

document.getElementById("expense-form").addEventListener("submit", function (e) {
  e.preventDefault();

  const dateInput = document.getElementById("date");
  const category = document.getElementById("category").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const date = dateInput.value;

  if (!date || !category || isNaN(amount)) return;

  expenses.push({ date, category, amount });
  localStorage.setItem("expenses", JSON.stringify(expenses));

  updateRemainingBudget();
  showHistory(); // if user already clicked view
  document.getElementById("expense-form").reset();
  setCurrentDateTime(); // refill with now
});

function updateRemainingBudget() {
  const spent = {};
  expenses.forEach((item) => {
    spent[item.category] = (spent[item.category] || 0) + item.amount;
  });

  const tableBody = document.getElementById("budget-body");
  tableBody.innerHTML = ""; // Clear existing rows

  for (const category in categoryLimits) {
    const limit = categoryLimits[category];
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
  }
}

function showHistory() {
  const grouped = {};

  expenses.forEach((entry) => {
    const dateOnly = entry.date.split("T")[0];
    if (!grouped[dateOnly]) {
      grouped[dateOnly] = [];
    }
    grouped[dateOnly].push(entry);
  });

  const historyView = document.getElementById("history-view");
  historyView.innerHTML = "<h2>Expense History</h2>";

  for (const date in grouped) {
    const button = document.createElement("button");
    button.textContent = date;
    button.style.margin = "5px";
    button.onclick = () => showDateDetails(date, grouped[date]);
    historyView.appendChild(button);
  }
}

function showDateDetails(date, entries) {
  const historyView = document.getElementById("history-view");
  historyView.innerHTML = `<h2>Entries on ${date}</h2>`;

  if (entries.length === 0) {
    historyView.innerHTML += "<p>No entries for this date.</p>";
    return;
  }

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
          <td>${new Date(entry.date).toLocaleTimeString()}</td>
          <td>${entry.category}</td>
          <td>$${entry.amount.toFixed(2)}</td>
        </tr>
      `).join("")}
    </tbody>
  `;

  historyView.appendChild(table);
}

// Load budget summary on startup
updateRemainingBudget();

function resetAllData() {
  const wantBackup = confirm("Do you want to export a backup before resetting all data?");
  if (wantBackup) {
    exportData(); // Trigger download first
  }

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




function exportData() {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert to 12-hour format
  const formattedHour = String(hours).padStart(2, '0');

  const timestamp = `${yyyy}-${mm}-${dd}_${formattedHour}-${minutes}-${seconds}_${ampm}`;
  const filename = `expense-backup-${timestamp}.json`;

  const dataStr = JSON.stringify(expenses, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}





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
    } catch (err) {
      alert("Error reading file.");
    }
  };
  reader.readAsText(file);
}

updateRemainingBudget();
showHistory(); // ✅ Add this line to show history on load


let undoStack = [];

function undoLastEntry() {
  if (expenses.length === 0) {
    alert("No entries to undo.");
    return;
  }

  const lastEntry = expenses[expenses.length - 1];
  const confirmUndo = confirm(
    `Are you sure you want to undo this entry?\n\nDate: ${new Date(lastEntry.date).toLocaleString()}\nCategory: ${lastEntry.category}\nAmount: $${lastEntry.amount.toFixed(2)}`
  );

  if (confirmUndo) {
    const removed = expenses.pop();
    undoStack.push(removed);
    localStorage.setItem("expenses", JSON.stringify(expenses));
    updateRemainingBudget();
    showHistory();
    alert("Last entry has been undone.");
  }
}

function redoLastEntry() {
  if (undoStack.length === 0) {
    alert("No entry to redo.");
    return;
  }

  const restored = undoStack.pop();
  expenses.push(restored);
  localStorage.setItem("expenses", JSON.stringify(expenses));
  updateRemainingBudget();
  showHistory();
  alert("Last undone entry has been restored.");
}
