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
let expenses = JSON.parse(localStorage.getItem("expenses") || "[]");
let undoStack = [];
let lastOpenedMonthKey = null;
let sortDescending = true;

// ==== Initialize Current Date ====
function setCurrentDateTime() {
  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);
  document.getElementById("date").value = localISO;
}
setCurrentDateTime();

// ==== Save and Reload ====
function saveExpenses() {
  localStorage.setItem("expenses", JSON.stringify(expenses));
  updateRemainingBudget();
  showHistory();
}

// ==== Form Submission ====
document.getElementById("expense-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const date = document.getElementById("date").value;
  const category = document.getElementById("category").value;
  const amount = parseFloat(document.getElementById("amount").value);
  if (!date || !category || isNaN(amount)) return;

  expenses.push({ date, category, amount });
  saveExpenses();
  e.target.reset();
  setCurrentDateTime();
  document.activeElement.blur();
});

// ==== Budget Display ====
function updateRemainingBudget() {
  const spent = {};
  expenses.forEach(e => spent[e.category] = (spent[e.category] || 0) + e.amount);

  const tableBody = document.getElementById("budget-body");
  tableBody.innerHTML = "";

  const totalLimit = Object.values(categoryLimits).reduce((a, b) => a + b, 0);

  Object.entries(categoryLimits).forEach(([category, limit]) => {
    const used = spent[category] || 0;
    const remaining = limit - used;
    const percentUsed = ((used / limit) * 100).toFixed(1);
    const allocationPercent = ((limit / totalLimit) * 100).toFixed(1);
    const usedOfTotal = ((used / totalLimit) * 100).toFixed(1);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${category}</td>
      <td>$${used.toFixed(2)}</td>
      <td><strong>$${remaining.toFixed(2)}</strong></td>
      <td>${percentUsed}%</td>
      <td>${usedOfTotal}% / ${allocationPercent}%</td>
    `;
    tableBody.appendChild(row);
  });
}

// ==== History View Grouped by Month and Date ====
function showHistory(keepOpen = false) {
  const grouped = {};
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

  const monthKeys = Object.keys(grouped).sort((a, b) => {
    const dateA = new Date(`${a} 01`);
    const dateB = new Date(`${b} 01`);
    return sortDescending ? dateB - dateA : dateA - dateB;
  });

  monthKeys.forEach((month) => {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = month;
    details.appendChild(summary);
    if (keepOpen && month === lastOpenedMonthKey) details.open = true;

    // 🔽 Sort dropdown
    const sortContainer = document.createElement("div");
    sortContainer.style.margin = "10px 0";

    const sortLabel = document.createElement("label");
    sortLabel.textContent = "Sort by: ";
    sortLabel.style.marginRight = "8px";

    const sortSelect = document.createElement("select");
    sortSelect.className = "date-sort-dropdown";

    const options = [
      { value: "dateAsc", label: "📅 Date Ascending" },
      { value: "dateDesc", label: "📅 Date Descending" }
    ];

    options.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      sortSelect.appendChild(option);
    });

    const monthDatesContainer = document.createElement("div");

    sortSelect.onchange = () => {
      renderMonthDates(grouped[month], monthDatesContainer, sortSelect.value, grouped);
    };

    sortContainer.appendChild(sortLabel);
    sortContainer.appendChild(sortSelect);
    details.appendChild(sortContainer);
    details.appendChild(monthDatesContainer);

    renderMonthDates(grouped[month], monthDatesContainer, "dateDesc", grouped);
    historyView.appendChild(details);
  });
}

function renderMonthDates(datesObj, container, sortMode, grouped) {
  container.innerHTML = "";

  const sortedDates = Object.keys(datesObj).sort((a, b) => {
    const totalA = datesObj[a].reduce((sum, entry) => sum + entry.amount, 0);
    const totalB = datesObj[b].reduce((sum, entry) => sum + entry.amount, 0);

    switch (sortMode) {
      case "dateAsc":
        return new Date(a) - new Date(b);
      case "dateDesc":
        return new Date(b) - new Date(a);
      default:
        return new Date(b) - new Date(a);
    }
  });

  sortedDates.forEach((date) => {
    const dateBtn = document.createElement("button");
    dateBtn.textContent = date;
    dateBtn.className = "date-button";
    dateBtn.onclick = () => showDateDetails(date, datesObj[date], grouped);
    container.appendChild(dateBtn);
  });
}

// ==== Entry Details for Specific Date ====
function showDateDetails(date, entries, grouped) {
  const historyView = document.getElementById("history-view");
  historyView.innerHTML = "";

  const container = document.createElement("div");

  const monthKey = new Date(date).toLocaleString("default", { month: "long", year: "numeric" });

  // 🔙 Back Buttons
  const backButtonsWrapper = document.createElement("div");
  backButtonsWrapper.className = "back-buttons-wrapper";

  const backToMonthBtn = document.createElement("button");
  backToMonthBtn.textContent = "← Back to Month View";
  backToMonthBtn.className = "back-btn";
  backToMonthBtn.onclick = () => showHistory(true);

  const backToDatesBtn = document.createElement("button");
  backToDatesBtn.textContent = "← Back to Dates";
  backToDatesBtn.className = "back-btn";
  backToDatesBtn.onclick = () => {
    const monthData = grouped[monthKey];
    const containerForDates = document.createElement("div");
    renderMonthDates(monthData, containerForDates, "dateDesc", grouped);
    historyView.innerHTML = "";

    const details = document.createElement("details");
    details.open = true;
    const summary = document.createElement("summary");
    summary.textContent = monthKey;
    details.appendChild(summary);
    details.appendChild(containerForDates);
    historyView.appendChild(details);
  };

  backButtonsWrapper.appendChild(backToMonthBtn);
  backButtonsWrapper.appendChild(backToDatesBtn);
  container.appendChild(backButtonsWrapper);

  const heading = document.createElement("h3");
  heading.textContent = `Entries for ${date}`;
  heading.style.marginTop = "15px";
  container.appendChild(heading);

  const sortDiv = document.createElement("div");
  sortDiv.style.margin = "10px 0";

  const sortLabel = document.createElement("label");
  sortLabel.textContent = "Sort by: ";
  sortLabel.style.marginRight = "8px";

  const sortSelect = document.createElement("select");
  sortSelect.className = "date-sort-dropdown";

  const options = [
    { value: "amount-desc", text: "Amount Descending" },
    { value: "amount-asc", text: "Amount Ascending" },
    { value: "time-desc", text: "Time Descending" },
    { value: "time-asc", text: "Time Ascending" },
  ];

  options.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.text;
    sortSelect.appendChild(o);
  });

  sortSelect.onchange = () => {
    renderDateEntries(entries, sortSelect.value, listContainer);
  };

  sortDiv.appendChild(sortLabel);
  sortDiv.appendChild(sortSelect);
  container.appendChild(sortDiv);

  const listContainer = document.createElement("div");
  container.appendChild(listContainer);

  renderDateEntries(entries, "amount-desc", listContainer);
  historyView.appendChild(container);
}

function renderDateEntries(entries, sortType, container) {
  container.innerHTML = "";

  const sorted = [...entries].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();

    switch (sortType) {
      case "amount-asc":
        return a.amount - b.amount;
      case "amount-desc":
        return b.amount - a.amount;
      case "time-asc":
        return timeA - timeB;
      case "time-desc":
      default:
        return timeB - timeA;
    }
  });

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Time</th>
        <th>Category</th>
        <th>Amount ($)</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  sorted.forEach(entry => {
    const row = document.createElement("tr");
    const timeCell = document.createElement("td");
    timeCell.textContent = new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const catCell = document.createElement("td");
    catCell.textContent = entry.category;

    const amountCell = document.createElement("td");
    amountCell.textContent = `$${entry.amount}`;

    row.appendChild(timeCell);
    row.appendChild(catCell);
    row.appendChild(amountCell);
    tbody.appendChild(row);
  });

  container.appendChild(table);
}

// (Other functions remain unchanged: exportData, importData, resetAllData, undo/redo, syncTimeToMinute...)




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
      if (!Array.isArray(imported)) return alert("Invalid file format.");

      let newEntries = 0;
      const existing = new Set(expenses.map(e => `${e.date}|${e.category}|${e.amount}`));

      for (const entry of imported) {
        const key = `${entry.date}|${entry.category}|${entry.amount}`;
        if (!existing.has(key)) {
          expenses.push(entry);
          existing.add(key);
          newEntries++;
        }
      }

      if (newEntries > 0) {
        localStorage.setItem("expenses", JSON.stringify(expenses));
        updateRemainingBudget();
        showHistory();
        alert(`✅ ${newEntries} new entries were imported successfully.`);
      } else {
        alert("⚠️ All entries in the file already exist. No duplicates added.");
      }
    } catch {
      alert("❌ Error reading or parsing file.");
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
    saveExpenses();
    alert("Last entry has been undone.");
  }
}

function redoLastEntry() {
  if (!undoStack.length) return alert("No entry to redo.");
  expenses.push(undoStack.pop());
  saveExpenses();
  alert("Last undone entry has been restored.");
}

// ==== Initial Load ====
saveExpenses();

// ==== Auto-Sync Time ====
function syncTimeToMinute() {
  const now = new Date();
  const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

  setTimeout(() => {
    setCurrentDateTime();
    setInterval(setCurrentDateTime, 60000);
  }, msToNextMinute);
}
syncTimeToMinute();
