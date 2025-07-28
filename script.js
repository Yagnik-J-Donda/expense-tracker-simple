// ==== Category Limits ====
let expenses = JSON.parse(localStorage.getItem("expenses") || "[]");
let categoryLimits = JSON.parse(localStorage.getItem("categoryLimits") || "{}");
let categoryKinds = JSON.parse(localStorage.getItem("categoryKinds") || "{}");

let deletedCategories = JSON.parse(localStorage.getItem("deletedCategories") || "[]");


document.getElementById("month-select").addEventListener("change", updateRemainingBudget);
document.getElementById("year-select").addEventListener("change", updateRemainingBudget);

function getMonthKeyFromDate(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.toLocaleString("en-US", { month: "long" }); // Use fixed locale
  return `${month} ${year}`;
}

function saveExpenses() {
  localStorage.setItem("expenses", JSON.stringify(expenses));
  localStorage.setItem("categoryLimits", JSON.stringify(categoryLimits));
  localStorage.setItem("categoryKinds", JSON.stringify(categoryKinds));
}

function renderCategoryDropdown() {
  const select = document.getElementById("category");
  select.innerHTML = '<option value="">--Select Category--</option>';

  Object.keys(categoryLimits).forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });
}
// renderCategoryDropdown();


// ==== State Variables ====
// checkAndHandleMonthChange();
let undoStack = [];
let lastOpenedMonthKey = null;
let sortDescending = true;
let categoryBeingEdited = null; // 🔄 Tracks which category is being edited

// ==== Initialize Current Date ====
function setCurrentDateTime() {
  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);
  document.getElementById("date").value = localISO;
}
setCurrentDateTime();

// Modified: Populate Year dropdown and auto-select current year
function populateYearDropdown() {
  const currentYear = new Date().getFullYear();
  const yearSelect = document.getElementById("year-select");
  yearSelect.innerHTML = ""; // Clear old options (if any)

  for (let y = currentYear - 2; y <= currentYear + 3; y++) {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = y;
    if (y === currentYear) option.selected = true; // ✅ Select current year by default
    yearSelect.appendChild(option);
  }
}

// 🔧 Added: Auto-select current month on load
document.getElementById("month-select").value = new Date().getMonth();

populateYearDropdown();

// 🔧 Added: Update both budget and history views when month/year changes
document.getElementById("month-select").addEventListener("change", () => {
  updateRemainingBudget();
  updateHistory();
});

document.getElementById("year-select").addEventListener("change", () => {
  updateRemainingBudget();
  updateHistory();
});

// 🔧 Added: Show selected date's entries when changed (IT IS A LISTENER)
document.getElementById("history-date-select").addEventListener("change", (e) => {
  const selectedDate = e.target.value;

  // ✅ Save the selected date to localStorage
  localStorage.setItem("selectedHistoryDate", selectedDate);

  // ✅ Show that date's history
  renderDateHistory(selectedDate);

  // ⏳ Wait for history DOM to update before measuring
  setTimeout(() => {
    const historySection = document.getElementById("history-view");
    const rect = historySection.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;

    if (rect.bottom > windowHeight) {
      historySection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, 150);
});

// ==== Save and Reload ====
function saveExpenses() {
  localStorage.setItem("expenses", JSON.stringify(expenses));
  localStorage.setItem("categoryLimits", JSON.stringify(categoryLimits));
  localStorage.setItem("categoryKinds", JSON.stringify(categoryKinds));
  updateRemainingBudget();
  showHistory();
}

// ==== Form Submission ====
document.getElementById("expense-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const date = document.getElementById("date").value;
  const category = document.getElementById("category").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const details = document.getElementById("details").value.trim(); // ✅ New: capture details

  // ❌ Prevent submission if date/category/amount missing or amount is 0 or negative
  if (!date || !category || isNaN(amount) || amount <= 0) {
    alert("Please enter a valid amount greater than 0.");
    return;
  }

  expenses.push({ date, category, amount, details }); // ✅ Save details too
  saveExpenses();

  e.target.reset();
  document.getElementById("details").value = ""; // ✅ Clear details explicitly (optional)
  setCurrentDateTime(); // ✅ Refill current time after reset
  document.activeElement.blur();
});



// 🔧 Updated: Show all dates in history selector (not filtered by month/year)
function updateHistory() {
  const dateSelect = document.getElementById("history-date-select");
  const historyView = document.getElementById("history-view");

  dateSelect.innerHTML = "";
  historyView.innerHTML = "";

  const allDates = expenses
    .map(e => new Date(e.date).toLocaleDateString('en-CA'));

  const uniqueDates = [...new Set(allDates)].sort((a, b) => new Date(b) - new Date(a));

  if (uniqueDates.length === 0) {
    dateSelect.innerHTML = `<option value="">No entries found</option>`;
    historyView.innerHTML = `<p style="text-align:center;">No history available.</p>`;
    return;
  }

  uniqueDates.forEach(date => {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = date;
    dateSelect.appendChild(option);
  });

  renderDateHistory(uniqueDates[0]); // Load most recent date by default
}

function renderDateHistory(dateStr) {
  const historyView = document.getElementById("history-view");
  historyView.innerHTML = "";

  const entries = expenses.filter(e => new Date(e.date).toLocaleDateString('en-CA') === dateStr);
  if (entries.length === 0) {
    historyView.innerHTML = `<p style="text-align:center;">No entries for ${dateStr}</p>`;
    return;
  }

  const title = document.createElement("h3");
  title.textContent = `Entries for ${dateStr}`;
  historyView.appendChild(title);

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

  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  sorted.forEach(entry => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
      <td>${entry.category}</td>
      <td>$${entry.amount.toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });

  historyView.appendChild(table);
}

function renderRecycleBin() {
  const binList = document.getElementById("recycle-bin-list");
  binList.innerHTML = "";

  if (deletedCategories.length === 0) {
    binList.innerHTML = "<li><em>No deleted categories</em></li>";
    return;
  }

  deletedCategories.forEach((entry, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>🗂️ ${entry.category} (${entry.monthKey})</span>
      <button onclick="restoreCategory(${index})">♻️ Restore</button>
    `;
    binList.appendChild(li);
  });
}

function restoreCategory(index) {
  const entry = deletedCategories[index];
  if (!entry) return;

  const { category, monthKey } = entry;

  // 🟢 Restore with default values (or prompt if needed)
  categoryLimits[category] = 0;
  categoryKinds[category] = "Flexible";

  localStorage.setItem("categoryLimits", JSON.stringify(categoryLimits));
  localStorage.setItem("categoryKinds", JSON.stringify(categoryKinds));

  deletedCategories.splice(index, 1);
  localStorage.setItem("deletedCategories", JSON.stringify(deletedCategories));

  renderRecycleBin();
  updateRemainingBudget();
  alert(`Category "${category}" restored for ${monthKey}`);
}


// ==== Budget Display ====
function updateRemainingBudget() {
  const selectedMonth = parseInt(document.getElementById("month-select").value);
  const selectedYear = parseInt(document.getElementById("year-select").value);

  const spent = {};
  expenses.forEach(e => {
    const d = new Date(e.date);
    if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
      spent[e.category] = (spent[e.category] || 0) + e.amount;
    }
  });

  const tableBody = document.getElementById("budget-body");
  tableBody.innerHTML = "";

  const totalLimit = Object.values(categoryLimits).reduce((a, b) => a + b, 0);

  // 🧾 Fill table rows for each category
  Object.entries(categoryLimits).forEach(([category, limit]) => {
    const used = spent[category] || 0;
    const remaining = limit - used;
    const percentUsed = ((used / limit) * 100).toFixed(1);
    const allocationPercent = ((limit / totalLimit) * 100).toFixed(1);
    const usedOfTotal = ((used / totalLimit) * 100).toFixed(1);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td style="cursor: pointer; color: #3f51b5;" onclick="openCategoryEditModal('${category}')">${category}</td>
      <td>
        <span style="color: #f57c00; cursor: pointer; text-decoration: underline;" onclick="viewCategoryExpenses('${category}')">
          <strong style="color: inherit;">$${used.toFixed(2)}</strong>
        </span>
      </td>
      <td><strong style="color: #388e3c;">$${remaining.toFixed(2)}</strong></td>
      <td><strong style="color: #0077cc;">$${limit.toFixed(2)}</strong></td>
      <td>${percentUsed}%</td>
      <td>${usedOfTotal}% / ${allocationPercent}%</td>
    `;

    tableBody.appendChild(row);
  });

  // 📊 Total Summary Box: Shows total spent, remaining, projected, and % used
  const totalSummaryBox = document.getElementById("total-summary");

  let totalUsed = 0;
  let fullLimit = 0;

  for (let category in categoryLimits) {
    totalUsed += spent[category] || 0;
    fullLimit += categoryLimits[category];
  }

  const totalRemaining = fullLimit - totalUsed;
  const percentUsed = fullLimit > 0 ? ((totalUsed / fullLimit) * 100).toFixed(1) : "0.0";

  totalSummaryBox.innerHTML = `
  <div class="total-summary-grid">
    <div class="label">💸 Total Spent:</div>
    <div class="value">$${totalUsed.toFixed(2)}</div>

    <div class="label">💼 Total Remaining:</div>
    <div class="value">$${totalRemaining.toFixed(2)}</div>

    <div class="label">📈 Total Projected:</div>
    <div class="value" style="color: ${fullLimit > 0 ? 'green' : 'gray'}">$${fullLimit.toFixed(2)}</div>

    <div class="label">📊 Used:</div>
    <div class="value">${percentUsed}%</div>
  </div>
  `;
}

// 📋 Show a modal listing all expenses for a specific category and month
function viewCategoryExpenses(category) {
  // Get the currently selected month and year from dropdowns
  const selectedMonth = parseInt(document.getElementById("month-select").value);
  const selectedYear = parseInt(document.getElementById("year-select").value);

  // Get references to modal elements
  const modal = document.getElementById("category-expense-modal");
  const title = document.getElementById("expense-modal-title");
  const list = document.getElementById("expense-list");

  // Set modal title to include the selected category name
  title.textContent = `💼 Expenses for "${category}"`;

  // 🔍 Filter expenses for:
  // - matching category
  // - matching selected month and year
  const filtered = expenses.filter(e => {
    const d = new Date(e.date);
    return e.category === category &&
           d.getMonth() === selectedMonth &&
           d.getFullYear() === selectedYear;
  });

  // 📝 Display filtered expenses or show "No expenses" message
  if (filtered.length === 0) {
    list.innerHTML = `<p>No expenses found for this category this month.</p>`;
  } else {
    list.innerHTML = filtered.map((e, index) => {
      const dateStr = new Date(e.date).toLocaleDateString();
      const detailsHTML = e.details && e.details.trim() !== ""
        ? `<div style="font-size: 0.85em; color: #555; margin-top: 4px;">↳ ${e.details}</div>`
        : "";

      return `
        <div style="padding:10px; border-bottom:1px solid #eee;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>📅 <b>${dateStr}</b></span>
            <button onclick="editExpense('${category}', '${e.date}', ${e.amount})"
              style="background: none; border: none; color: #3F51B5; font-weight: 600; cursor: pointer; font-size: 0.9rem;">✏️ Edit</button>
          </div>
          <div style="margin-top: 6px;">
            💵 $${e.amount.toFixed(2)}
            ${detailsHTML}
          </div>
        </div>
      `;
    }).join("");
  }

  // 📦 Show the modals
  document.getElementById("modal-overlay").style.display = "block"; // Show overlay
  document.getElementById("category-expense-modal").style.display = "block"; // Show modal
  document.body.classList.add("no-scroll"); // Lock scroll
}

function editExpense(category, dateStr, oldAmount) {
  // 🧠 Convert date string back to Date object for accurate matching
  const targetDate = new Date(dateStr);
  const formattedTargetDate = targetDate.toLocaleDateString();

  // 🔍 Find the matching expense entry
  const expToEdit = expenses.find(e =>
    e.category === category &&
    new Date(e.date).toLocaleDateString() === formattedTargetDate &&
    e.amount === oldAmount
  );

  // ❌ If not found, exit
  if (!expToEdit) {
    alert("Expense not found.");
    return;
  }

  // 📝 Ask user for updated amount and optional new details
  const newAmount = prompt("Edit amount:", expToEdit.amount);
  if (newAmount === null || isNaN(newAmount)) return;

  const newDetails = prompt("Edit details (optional):", expToEdit.details || "");

  // ✅ Update values
  expToEdit.amount = parseFloat(newAmount);
  expToEdit.details = newDetails;

  // 💾 Save and refresh
  saveExpenses(); // Should already exist in your code
  viewCategoryExpenses(category); // Refresh modal with updated data
}


// ❌ Close the category expenses modal
function closeCategoryExpenseModal() {
  const modal = document.getElementById("category-expense-modal");
  const overlay = document.getElementById("modal-overlay");

  if (modal) modal.style.display = "none";       // Hide popup
  if (overlay) overlay.style.display = "none";   // Hide background dim
  document.body.classList.remove("no-scroll");   // Unlock scroll
}


// ==== History View Grouped by Month and Date ====
function showHistory(keepOpen = false) {
  const grouped = {};
  expenses.forEach((entry) => {
    const dateObj = new Date(entry.date);
    const year = dateObj.getFullYear();
    const month = dateObj.toLocaleString("default", { month: "long" });
    const dateOnly = dateObj.toLocaleDateString('en-CA');  // Format: YYYY-MM-DD
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

    if (details.open) {
        setTimeout(() => details.scrollIntoView({ behavior: "smooth" }), 0);
    }


    // Sort dropdown
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

const monthKey = getMonthKeyFromDate(date);

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
  const monthKeyForBackBtn = getMonthKeyFromDate(date);

backToDatesBtn.onclick = () => {
  const grouped = {};
  expenses.forEach((entry) => {
  const dateObj = new Date(entry.date);
  const dateOnly = dateObj.toLocaleDateString('en-CA');
  const monthKey = getMonthKeyFromDate(entry.date);
  if (!grouped[monthKey]) grouped[monthKey] = {};
  if (!grouped[monthKey][dateOnly]) grouped[monthKey][dateOnly] = [];
  grouped[monthKey][dateOnly].push(entry);
});


  const monthData = grouped[monthKeyForBackBtn];
  if (!monthData) {
    alert("⚠️ Could not find entries for this month.");
    return;
  }

  historyView.innerHTML = "";

  const details = document.createElement("details");
  details.open = true;

  const summary = document.createElement("summary");
  summary.textContent = monthKeyForBackBtn;
  details.appendChild(summary);

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
    renderMonthDates(monthData, monthDatesContainer, sortSelect.value, grouped);
  };

  sortContainer.appendChild(sortLabel);
  sortContainer.appendChild(sortSelect);
  details.appendChild(sortContainer);
  details.appendChild(monthDatesContainer);

  renderMonthDates(monthData, monthDatesContainer, "dateDesc", grouped);
  historyView.appendChild(details);

  // Optional: scroll into view
  historyView.scrollIntoView({ behavior: "smooth" });
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

// Automatically scroll to this section
  historyView.scrollIntoView({ behavior: "smooth" });
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
    amountCell.textContent = `$${entry.amount.toFixed(2)}`;

    row.appendChild(timeCell);
    row.appendChild(catCell);
    row.appendChild(amountCell);
    tbody.appendChild(row);
  });

  container.appendChild(table);
}

// ==== Export Function ====
function exportData() {
  const now = new Date();

  const day = now.getDate();
  const monthName = now.toLocaleString("en-US", { month: "long" }); // e.g., March
  const year = now.getFullYear();

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // convert to 12-hour format

  const formattedDate = `${day} ${monthName} ${year}`;
  const formattedTime = `${String(hours).padStart(2, '0')}-${minutes}-${seconds} ${ampm}`;
  const timestamp = `${formattedDate} at ${formattedTime}`;

  const filename = `Expense Backup - ${timestamp}.json`;

  const fullData = {
    expenses,
    categoryLimits,
    categoryKinds
  };

  const data = new Blob([JSON.stringify(fullData, null, 2)], { type: "application/json" });

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

      if (!imported.expenses || !Array.isArray(imported.expenses)) {
        return alert("❌ Invalid file format: missing 'expenses'.");
      }

      let newEntries = 0;
      const existing = new Set(expenses.map(e => `${e.date}|${e.category}|${e.amount}`));

      for (const entry of imported.expenses) {
        const key = `${entry.date}|${entry.category}|${entry.amount}`;
        if (!existing.has(key)) {
          expenses.push(entry);
          existing.add(key);
          newEntries++;
        }
      }

      // ✅ Merge Category Limits if provided
      if (imported.categoryLimits) {
        Object.entries(imported.categoryLimits).forEach(([cat, limit]) => {
          categoryLimits[cat] = limit;
        });
      }

      // ✅ Merge Category Kinds if provided
      if (imported.categoryKinds) {
        Object.entries(imported.categoryKinds).forEach(([cat, kind]) => {
          categoryKinds[cat] = kind;
        });
      }

      if (newEntries > 0) {
        localStorage.setItem("expenses", JSON.stringify(expenses));
        localStorage.setItem("categoryLimits", JSON.stringify(categoryLimits));
        localStorage.setItem("categoryKinds", JSON.stringify(categoryKinds));

        renderCategoryDropdown();
        updateRemainingBudget();
        showHistory();

        alert(`✅ ${newEntries} new entries were imported successfully.`);
      } else {
        alert("⚠️ All entries in the file already exist. No duplicates added.");
      }

    } catch (err) {
      console.error(err);
      alert("❌ Error reading or parsing the file.");
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

updateHistory(); // add this line after it

// 🧩 1. Opens the edit modal for a variable category
function openCategoryEditModal(category) {
  const kind = categoryKinds[category];

  // ✅ Ask for confirmation instead of blocking
  if (kind === "Fixed") {
    const confirmEdit = confirm(`"${category}" is a Fixed category.\nAre you sure you want to edit it?`);
    if (!confirmEdit) return;
  }

  categoryBeingEdited = category;
  document.getElementById("edit-type-name").value = category;
  document.getElementById("edit-type-limit").value = categoryLimits[category];
  document.getElementById("edit-category-modal").style.display = "block";
}


// 🧩 2. Applies the changes made to the category (name and/or limit)
function applyCategoryEdit() {
  const newName = document.getElementById("edit-type-name").value.trim();
  const newLimit = parseFloat(document.getElementById("edit-type-limit").value);

  if (!newName || isNaN(newLimit) || newLimit < 0) {
    alert("Please enter a valid name and limit.");
    return;
  }

  if (newName !== categoryBeingEdited) {
    if (categoryLimits[newName]) {
      alert("This category name already exists.");
      return;
    }

    // 1. Assign new name and limit
    categoryLimits[newName] = newLimit;
    categoryKinds[newName] = categoryKinds[categoryBeingEdited];

    // 2. Update all expenses that had the old category name
    expenses.forEach(e => {
      if (e.category === categoryBeingEdited) {
        e.category = newName;
      }
    });

    // 3. Delete old category
    delete categoryLimits[categoryBeingEdited];
    delete categoryKinds[categoryBeingEdited];
  } else {
    categoryLimits[newName] = newLimit;
  }

  // ✅ Save all changes to localStorage
  localStorage.setItem("categoryLimits", JSON.stringify(categoryLimits));
  localStorage.setItem("categoryKinds", JSON.stringify(categoryKinds));
  localStorage.setItem("expenses", JSON.stringify(expenses));

  updateRemainingBudget();
  renderCategoryDropdown();
  closeCategoryEditModal();
}




// 🧩 3. Closes the category edit modal
function closeCategoryEditModal() {
  document.getElementById("edit-category-modal").style.display = "none";
  categoryBeingEdited = null;
}

// 🧩 3. Deletes the category edit modal
function deleteCategory() {
  const category = categoryBeingEdited;
  if (!category) return;

  const selectedMonthKey = getMonthKeyFromDate(new Date().toISOString());
  const confirmDelete = confirm(`Are you sure you want to delete the category "${category}" for the selected month?`);

  if (!confirmDelete) return;

  // 🗑️ Move to recycle bin
  deletedCategories.push({ category, monthKey: selectedMonthKey });
  localStorage.setItem("deletedCategories", JSON.stringify(deletedCategories));

  // 🧼 Remove from UI logic
  delete categoryLimits[category];
  delete categoryKinds[category];

  localStorage.setItem("categoryLimits", JSON.stringify(categoryLimits));
  localStorage.setItem("categoryKinds", JSON.stringify(categoryKinds));

  updateRemainingBudget();
  renderRecycleBin();
  closeCategoryEditModal();

  alert(`Category "${category}" deleted successfully for the selected month.`);
}




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

// function checkAndHandleMonthChange() {
//     const now = new Date();
//     const currentMonth = now.getMonth();
//     const currentYear = now.getFullYear();
//     const currentKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    
//     const lastMonthKey = localStorage.getItem("lastSavedMonth");
    
//     if (lastMonthKey && lastMonthKey !== currentKey) {
//         // Save final budget snapshot
//         const finalSnapshot = document.getElementById("budget-body").innerHTML;
//         localStorage.setItem(`finalBudget_${lastMonthKey}`, finalSnapshot);
        
//         // Ask user to download summary
//         if (confirm(`Download budget summary for ${lastMonthKey}?`)) {
//             const wrapper = document.createElement("table");
//             wrapper.innerHTML = `
//             <thead><tr><th>Type</th><th>Spent ($)</th><th>Remaining ($)</th><th>% Used</th><th>Usage vs Allocated</th></tr></thead>
//             <tbody>${finalSnapshot}</tbody>
//             `;
//             const blob = new Blob([wrapper.outerHTML], { type: "text/html" });
//             const a = document.createElement("a");
//             a.href = URL.createObjectURL(blob);
//             a.download = `budget-summary-${lastMonthKey}.html`;
//             a.click();
//             URL.revokeObjectURL(a.href);
//         }
        
//         // Clear all spent category values
//         expenses = [];
//         undoStack = [];
//         saveExpenses();
//     }
    
//     // Update the last saved month key
//     localStorage.setItem("lastSavedMonth", currentKey);
// }

// function showPastBudgetSnapshots() {
//     const view = document.getElementById("snapshot-view");
//     view.innerHTML = "<h3>Saved Budget Summaries</h3>";
    
//     Object.keys(localStorage).forEach(key => {
//         if (key.startsWith("finalBudget_")) {
//             const date = key.replace("finalBudget_", "");
//             const button = document.createElement("button");
//             button.textContent = `📅 ${date}`;
//             button.onclick = () => {
//                 const html = localStorage.getItem(key);
//                 const wrapper = document.createElement("div");
//                 wrapper.innerHTML = `<h4>${date}</h4><table><thead><tr><th>Type</th><th>Spent ($)</th><th>Remaining ($)</th><th>% Used</th><th>Usage vs Allocated</th></tr></thead><tbody>${html}</tbody></table>`;
//                 view.appendChild(wrapper);
//                 wrapper.scrollIntoView({ behavior: "smooth" });
//             };
//             view.appendChild(button);
//         }
//     });
    
//     if (view.innerHTML === "<h3>Saved Budget Summaries</h3>") {
//         view.innerHTML += "<p>No saved snapshots found.</p>";
//     }
// }

// 🔘 [Modal] Handle Done Button to Close Edit Category Modal
// Close on "✅ Done" at top-right
document.addEventListener("DOMContentLoaded", function () {
  // === Sidebar Setup ===
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("nav-overlay");
  const menuToggle = document.getElementById("menu-toggle");

  function openSidebar() {
    sidebar.style.left = "0";
    overlay.style.display = "block";
  }

  function closeSidebar() {
    sidebar.style.left = "-100%";
    overlay.style.display = "none";
  }

  menuToggle.addEventListener("click", function (event) {
    event.stopPropagation();
    const isOpen = sidebar.style.left === "0px";
    isOpen ? closeSidebar() : openSidebar();
  });

  overlay.addEventListener("click", closeSidebar);

  // 🆕 Force-close sidebar on page load
  closeSidebar();

  // === Load Saved Categories ===
  const savedLimits = localStorage.getItem("categoryLimits");
  const savedKinds = localStorage.getItem("categoryKinds");
  if (savedLimits) Object.assign(categoryLimits, JSON.parse(savedLimits));
  if (savedKinds) Object.assign(categoryKinds, JSON.parse(savedKinds));

  // === Confirm Edit Modal Logic ===
  function confirmEditFixedCategory(callback) {
    const modal = document.getElementById("confirm-edit-fixed-modal");
    const confirmBtn = document.getElementById("confirm-edit-fixed-btn");

    modal.style.display = "block";
    const handleConfirm = () => {
      modal.style.display = "none";
      confirmBtn.removeEventListener("click", handleConfirm);
      callback();
    };
    confirmBtn.addEventListener("click", handleConfirm);
  }

  function closeFixedEditConfirmModal() {
    document.getElementById("confirm-edit-fixed-modal").style.display = "none";
  }

  // === Restore Selected History Date ===
  const savedHistoryDate = localStorage.getItem("selectedHistoryDate");
  const historyDropdown = document.getElementById("history-date-select");

  if (savedHistoryDate && [...historyDropdown.options].some(opt => opt.value === savedHistoryDate)) {
    historyDropdown.value = savedHistoryDate;
    renderDateHistory(savedHistoryDate);
  } else {
    const latest = historyDropdown.value || new Date().toISOString().split("T")[0];
    renderDateHistory(latest);
  }

  // === Render Initial Data ===
  renderCategoryDropdown();
  updateRemainingBudget();

  // === Onboarding Check ===
  const hasSeenOnboarding = localStorage.getItem("onboardingShown");
  if (!hasSeenOnboarding) {
    showOnboardingModal();
  }

  const okBtn = document.getElementById("onboarding-ok-btn");
  if (okBtn) {
    okBtn.addEventListener("click", () => {
      localStorage.setItem("onboardingShown", "true");
      closeOnboardingModal();
    });
  }

  // === Render Recycle bin ===
  renderRecycleBin();

});




// ✅ Show the onboarding modal
function showOnboardingModal() {
  const modal = document.getElementById("onboarding-modal");
  if (modal) modal.style.display = "flex";
}

// ✅ Close the onboarding modal
function closeOnboardingModal() {
  const modal = document.getElementById("onboarding-modal");
  if (modal) modal.style.display = "none";
}

// ✅ Expose for Settings > "❓ Onboarding Again"
window.showOnboardingModalAgain = function () {
  localStorage.setItem("onboardingShown", "false");
  showOnboardingModal();
};





  // ➕ [Add Category] Show Confirmation Popup
  const categoryForm = document.getElementById("category-form");
  categoryForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("new-type-name").value.trim();
    const kind = document.getElementById("new-type-kind").value;
    const limit = parseFloat(document.getElementById("new-type-limit").value);

    if (!name || isNaN(limit) || limit < 0) {
      alert("Please enter a valid name and limit.");
      return;
    }

    if (categoryLimits[name]) {
      alert("This category already exists.");
      return;
    }

    window.tempNewType = { name, kind, limit };

    const confirmBox = document.getElementById("confirm-add-type-modal");
    const details = document.getElementById("confirm-type-details");
    details.innerHTML = `<b>Name:</b> ${name}<br><b>Kind:</b> ${kind}<br><b>Limit:</b> $${limit.toFixed(2)}`;
    confirmBox.style.display = "block";
  });

  // 📅 [Footer Year Auto Update]
  const yearSpan = document.getElementById("current-year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
// });



// Helper Functions to Confirm/Add/Close
document.getElementById("confirm-add-type-btn").addEventListener("click", function () {
  if (!window.tempNewType) return;

  const { name, kind, limit } = window.tempNewType;

  // ✅ Add to categories
  categoryLimits[name] = limit;
  categoryKinds[name] = kind;

  // ✅ Save everything (including categories)
  saveExpenses();

  // ✅ Refresh UI
  renderCategoryDropdown();
  updateRemainingBudget();

  // ✅ Clear form inputs
  document.getElementById("new-type-name").value = "";
  document.getElementById("new-type-limit").value = "";

  // ✅ Close modal
  closeConfirmAddTypeModal();

  // ✅ Clear temp state
  window.tempNewType = null;

  // ✅ Feedback (optional)
  alert(`✅ "${name}" (${kind}) added with $${limit.toFixed(2)} limit.`);
});

function closeConfirmAddTypeModal() {
  const modal = document.getElementById("confirm-add-type-modal");
  if (modal) modal.style.display = "none";
}


// Submit form with Enter key or "Apply" button for changing esixting category
document.getElementById("edit-category-form").addEventListener("submit", function (e) {
  e.preventDefault();
  applyCategoryEdit(); // apply but don’t force close
});

// 🚀 Press Enter to Apply + Close Modal
document.addEventListener("keydown", function (event) {
  const modal = document.getElementById("edit-category-modal");
  if (modal.style.display === "block" && event.key === "Enter") {
    event.preventDefault(); // Prevent form submission
    applyCategoryEdit();
  }
});

// MODAL🖱️ Close the popup when user clicks on the background overlay
document.getElementById("modal-overlay").addEventListener("click", closeCategoryExpenseModal);


// 📊 Show Yearly, Half-Yearly, and Quarterly Averages for each category
// 📊 Calculates and populates Yearly, Half-Yearly, and Quarterly Averages
/*function showAverages() {
  const now = new Date();

  // 🗓️ Define time ranges
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  // 📦 Initialize totals and counts for each category
  const categoryTotals = {};
  const categoryCounts = {
    yearly: {},
    halfYearly: {},
    quarterly: {}
  };

  // 🔄 Loop through all expenses to accumulate totals and counts
  expenses.forEach(exp => {
    if (!categoryTotals[exp.category]) {
      categoryTotals[exp.category] = { yearly: 0, halfYearly: 0, quarterly: 0 };
      categoryCounts.yearly[exp.category] = 0;
      categoryCounts.halfYearly[exp.category] = 0;
      categoryCounts.quarterly[exp.category] = 0;
    }

    const expDate = new Date(exp.date);

    // 📅 Yearly
    if (expDate >= oneYearAgo) {
      categoryTotals[exp.category].yearly += exp.amount;
      categoryCounts.yearly[exp.category]++;
    }

    // 📆 Half-Yearly
    if (expDate >= sixMonthsAgo) {
      categoryTotals[exp.category].halfYearly += exp.amount;
      categoryCounts.halfYearly[exp.category]++;
    }

    // 📌 Quarterly
    if (expDate >= threeMonthsAgo) {
      categoryTotals[exp.category].quarterly += exp.amount;
      categoryCounts.quarterly[exp.category]++;
    }
  });

  // 📝 Populate the averages table
  const tbody = document.querySelector("#averages-table tbody");
  tbody.innerHTML = ""; // Clear previous rows

  Object.keys(categoryTotals).forEach(category => {
    const yearlyAvg = categoryCounts.yearly[category]
      ? (categoryTotals[category].yearly / categoryCounts.yearly[category]).toFixed(2)
      : "0.00";

    const halfYearlyAvg = categoryCounts.halfYearly[category]
      ? (categoryTotals[category].halfYearly / categoryCounts.halfYearly[category]).toFixed(2)
      : "0.00";

    const quarterlyAvg = categoryCounts.quarterly[category]
      ? (categoryTotals[category].quarterly / categoryCounts.quarterly[category]).toFixed(2)
      : "0.00";

    // 📦 Add row to the table
    const row = `
      <tr>
        <td>${category}</td>
        <td>$${yearlyAvg}</td>
        <td>$${halfYearlyAvg}</td>
        <td>$${quarterlyAvg}</td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}*/

// 📊 Show Full View Averages (Q1–Q4, H1–H2, Yearly)
// 📊 Calculates and populates Per Month Averages for Yearly, Half-Yearly, and Quarterly
// 📊 Show Full View Averages (Q1–Q4, H1–H2, Yearly) with zero-check fix
function showAverages() {
  const now = new Date();
  const currentYear = now.getFullYear();

  // 🗓️ Define quarters and halves
  const quarters = {
    Q1: [0, 1, 2],   // Jan, Feb, Mar
    Q2: [3, 4, 5],   // Apr, May, Jun
    Q3: [6, 7, 8],   // Jul, Aug, Sep
    Q4: [9, 10, 11]  // Oct, Nov, Dec
  };

  const halves = {
    H1: [0, 1, 2, 3, 4, 5],  // Jan–Jun
    H2: [6, 7, 8, 9, 10, 11] // Jul–Dec
  };

  // 📦 Initialize monthly totals per category
  const monthlyTotals = {}; // { category: [month0, month1, ..., month11] }

  Object.keys(categoryLimits).forEach(category => {
    monthlyTotals[category] = Array(12).fill(0);
  });

  // 🔄 Loop through all expenses and sum totals per category per month
  expenses.forEach(exp => {
    const expDate = new Date(exp.date);
    if (expDate.getFullYear() === currentYear) {
      const monthIndex = expDate.getMonth(); // 0 = Jan, 11 = Dec
      const category = exp.category;
      monthlyTotals[category][monthIndex] += exp.amount;
    }
  });

  // 📝 Populate the averages table
  const tbody = document.querySelector("#averages-table tbody");
  tbody.innerHTML = ""; // Clear previous rows

  Object.keys(monthlyTotals).forEach(category => {
    const totals = monthlyTotals[category];

    // 📊 Compute Quarter Averages (Q1–Q4)
    const qAverages = Object.values(quarters).map(q => {
      const quarterTotal = q.reduce((sum, m) => sum + totals[m], 0);
      const hasExpenses = q.some(m => totals[m] > 0);
      return hasExpenses ? (quarterTotal / 3).toFixed(2) : "0.00";
    });

    // 📊 Compute Half-Year Averages (H1 & H2)
    const hAverages = Object.values(halves).map(h => {
      const halfTotal = h.reduce((sum, m) => sum + totals[m], 0);
      const hasExpenses = h.some(m => totals[m] > 0);
      return hasExpenses ? (halfTotal / 6).toFixed(2) : "0.00";
    });

    // 📊 Compute Yearly Average
    const yearlyTotal = totals.reduce((sum, val) => sum + val, 0);
    const hasYearlyExpenses = yearlyTotal > 0;
    const yearlyAvg = hasYearlyExpenses ? (yearlyTotal / 12).toFixed(2) : "0.00";

    // 📦 Add row to the table
    const row = `
      <tr>
        <td>${category}</td>
        <td>$${qAverages[0]}</td>
        <td>$${qAverages[1]}</td>
        <td>$${qAverages[2]}</td>
        <td>$${qAverages[3]}</td>
        <td>$${hAverages[0]}</td>
        <td>$${hAverages[1]}</td>
        <td>$${yearlyAvg}</td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}


// 📊 Toggle the Averages Section with Smooth Animation
function toggleAverages() {
  const section = document.getElementById("averages-section");
  const btn = document.getElementById("view-averages-btn");

  if (section.style.display === "none" || section.style.display === "") {
    // ▶️ Show section
    showAverages(); // Populate data
    section.style.display = "block"; // Make visible
    setTimeout(() => {
      section.classList.add("show"); // Fade in
    }, 10);
    btn.textContent = "🔽 Hide Category Averages";
    section.scrollIntoView({ behavior: "smooth" });
  } else {
    // ⏹ Hide section
    section.classList.remove("show"); // Start fade out
    setTimeout(() => {
      section.style.display = "none"; // Fully hide after fade out
    }, 300); // Match CSS transition time
    btn.textContent = "📊 View Category Averages";
  }
}



// ==== Initial Load ====
// 🔧 Initial setup: save current data and show current month/year view
saveExpenses();   // Already present
populateYearDropdown(); // Make sure it's called here
document.getElementById("month-select").value = new Date().getMonth(); // ✅ Set current month
updateRemainingBudget();
updateHistory();
