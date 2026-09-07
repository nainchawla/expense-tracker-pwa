const App = (() => {
  let state = {
    view: "expense",
    settings: null,
    incomes: [],
    expenses: [],
    cycles: [],
    selectedCycle: null,
  };
  const $ = (s) => document.querySelector(s),
    id = () => crypto.randomUUID(),
    now = () => new Date().toISOString(),
    money = (n) =>
      `${state.settings.currencySymbol}${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>'"]/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[c],
    );
  async function load() {
    state.settings =
      (await DB.get("settings", "settings")) ||
      structuredClone(DEFAULT_SETTINGS);
    if (!(await DB.get("settings", "settings")))
      await DB.put("settings", state.settings);
    [state.incomes, state.expenses, state.cycles] = await Promise.all(
      ["incomeEvents", "expenses", "cycles"].map(DB.all),
    );
    state.selectedCycle =
      state.selectedCycle || sortedCycles(state.cycles).at(-1)?.id || null;
    render();
  }
  const cycleFor = async (date, startSalary = false) => {
    let existing = sortedCycles(state.cycles)
      .filter((c) => new Date(c.startDate) <= new Date(date))
      .at(-1);
    if (startSalary || !existing) {
      const cycle = {
        id: dateId(date),
        label: labelFor(date),
        startDate: date,
        endDate: null,
      };
      if (state.cycles.some((c) => c.id === cycle.id)) return cycle.id;
      if (existing) {
        existing.endDate = date;
        await DB.put("cycles", existing);
        state.cycles = state.cycles.map((c) =>
          c.id === existing.id ? existing : c,
        );
      }
      await DB.put("cycles", cycle);
      state.cycles.push(cycle);
      state.selectedCycle = cycle.id;
      return cycle.id;
    }
    return existing.id;
  };
  const header = (title, sub = "") =>
    `<header><h1>${title}</h1><p class="sub">${sub}</p></header>`;
  function render() {
    const app = $("#app");
    const views = {
      dashboard: dashboard,
      expense: expenseForm,
      income: incomeForm,
      history: history,
      settings: settings,
    };
    app.innerHTML = (views[state.view] || dashboard)();
    document
      .querySelectorAll("#bottom-nav button")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.view === state.view),
      );
    bind();
  }
  function dashboard() {
    if (!state.cycles.length)
      return (
        header("My Budget", "A private, offline-first expense tracker") +
        `<div class="notice"><strong>Start your first cycle.</strong><p>Add your salary or other income to create a budget and see category balances.</p><button data-go="income">Add income</button></div>`
      );
    const balances = calculateBalances(
        state.settings,
        state.incomes,
        state.expenses,
        state.cycles,
      ),
      current = balances[state.selectedCycle] || [];
    const totalIncome = state.incomes.reduce((s, x) => s + x.amount, 0),
      totalSpent = state.expenses.reduce((s, x) => s + x.amount, 0),
      remaining = current.reduce((s, x) => s + x.cycleRemaining, 0);
    return (
      header(
        "My Budget",
        state.cycles.find((c) => c.id === state.selectedCycle)?.label || "",
      ) +
      `<div class="actions"><select id="cycle-select">${sortedCycles(
        state.cycles,
      )
        .map(
          (c) =>
            `<option value="${c.id}" ${c.id === state.selectedCycle ? "selected" : ""}>${esc(c.label)}</option>`,
        )
        .join(
          "",
        )}</select></div><div class="summary"><div class="card"><div class="label">This cycle's budget</div><div class="number">${money(current.reduce((s, x) => s + x.allocated, 0))}</div></div><div class="card"><div class="label">Cycle spent</div><div class="number">${money(current.reduce((s, x) => s + x.spent, 0))}</div></div><div class="card"><div class="label">Spendable this cycle</div><div class="number">${money(remaining)}</div></div></div><h2>Category budgets</h2><p class="sub">Previous balances are held as a reserve and are used only after this cycle's budget is exhausted.</p><div class="categories">${current.map((c) => `<article class="card category" style="--color:${c.color}"><div class="category-head"><strong>${esc(c.name)}</strong><strong class="${c.cycleRemaining < 0 ? "negative" : ""}">${money(c.cycleRemaining)} left</strong></div><div class="label">This cycle budget ${money(c.allocated)} · spent ${money(c.spent)}</div><div class="label">Carry-over reserve ${money(c.reserveRemaining)}${c.reserveUsed ? ` · used ${money(c.reserveUsed)}` : ""}</div><div class="progress"><i style="width:${c.allocated ? Math.max(0, (c.spent / c.allocated) * 100) : 0}%"></i></div></article>`).join("")}</div><h2>All time</h2><div class="summary"><div class="card"><div class="label">Income</div><div class="number">${money(totalIncome)}</div></div><div class="card"><div class="label">Spent</div><div class="number">${money(totalSpent)}</div></div></div>`
    );
  }
  const categoryOptions = () =>
    state.settings.categories
      .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)
      .join("");
  function expenseForm() {
    return (
      header("Add expense", "Balances update immediately") +
      `<form id="expense-form"><label>Description<input name="description" required maxlength="100" placeholder="e.g. Groceries"></label><div class="row"><label>Amount<input name="amount" type="number" inputmode="decimal" min="0.01" step="0.01" required></label><label>Category<select name="categoryId">${categoryOptions()}</select></label></div><label>Date and time<input name="date" type="datetime-local" value="${localDateTimeInput()}" required></label><label>Note <textarea name="note" placeholder="Optional"></textarea></label><button>Save expense</button></form>`
    );
  }
  function incomeForm() {
    return (
      header("Add income", "Salary starts a new budget cycle") +
      `<form id="income-form"><div class="row"><label>Type<select name="type"><option value="salary">Salary</option><option value="bonus">Bonus</option><option value="gift">Gift</option><option value="other">Other</option></select></label><label>Amount<input name="amount" type="number" inputmode="decimal" min="0.01" step="0.01" required></label></div><label>Date and time<input name="date" type="datetime-local" value="${localDateTimeInput()}" required></label><label>How should it be allocated?<select name="splitMode" id="split-mode"><option value="percentage">Split by budget percentages</option><option value="fullCategory">Put all in one category</option></select></label><label id="target-wrap" hidden>Target category<select name="targetCategoryId">${categoryOptions()}</select></label><div id="split-preview" class="preview">Enter an amount to preview the split.</div><label>Note <textarea name="note" placeholder="Optional"></textarea></label><button>Save income</button></form>`
    );
  }
  function history() {
    const events = [
      ...state.incomes.map((x) => ({ ...x, kind: "Income", detail: x.type })),
      ...state.expenses.map((x) => ({
        ...x,
        kind: "Expense",
        detail: x.description,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    return (
      header("History", "Your complete transaction log") +
      `<div class="actions"><button class="secondary" data-export="json">Export JSON</button><button class="secondary" data-export="txt">Export TXT</button><button class="secondary" data-export="csv">Export CSV</button></div><div class="card" style="margin-top:16px">${events.length ? events.map((x) => `<div class="entry"><div><strong>${esc(x.detail)}</strong><small>${x.kind} · ${new Date(x.date).toLocaleString()}</small></div><div><strong class="${x.kind === "Expense" ? "negative" : ""}">${x.kind === "Expense" ? "-" : "+"}${money(x.amount)}</strong><div class="actions"><button class="secondary" data-delete="${x.kind}:${x.id}">Delete</button></div></div></div>`).join("") : `<div class="empty">No transactions yet.</div>`}</div>`
    );
  }
  function settings() {
    const cats = state.settings.categories;
    return (
      header("Settings", "Changes affect future income only") +
      `<form id="settings-form"><label>Currency symbol<input name="currencySymbol" value="${esc(state.settings.currencySymbol)}" maxlength="4"></label><label>Currency code<input name="currency" value="${esc(state.settings.currency)}" maxlength="6"></label><h2>Budget categories</h2><div id="categories-edit">${cats.map((c) => `<div class="settings-row"><input name="cat-name" value="${esc(c.name)}" required><input name="cat-percent" type="number" min="0" max="100" step="0.01" value="${c.percent}" required><input name="cat-color" type="color" value="${c.color}" aria-label="Category color"></div>`).join("")}</div><div class="label" id="percent-total">Total: ${cats.reduce((s, c) => s + c.percent, 0)}%</div><button>Save settings</button></form><h2>Data</h2><p class="sub">JSON is the complete portable backup for reinstalling or moving to a new phone.</p><div class="actions"><label class="secondary" style="padding:10px 14px;border-radius:10px;cursor:pointer">Import backup<input id="import-file" type="file" accept="application/json,.json" hidden></label><button class="danger" id="clear-history">Clear history only</button><button class="danger" id="reset">Reset all data</button></div>`
    );
  }
  function bind() {
    document.querySelectorAll("[data-go]").forEach(
      (b) =>
        (b.onclick = () => {
          state.view = b.dataset.go;
          render();
        }),
    );
    $("#cycle-select")?.addEventListener("change", (e) => {
      state.selectedCycle = e.target.value;
      render();
    });
    $("#expense-form")?.addEventListener("submit", saveExpense);
    $("#income-form")?.addEventListener("submit", saveIncome);
    $("#income-form") && setupPreview();
    $("#settings-form")?.addEventListener("submit", saveSettings);
    document
      .querySelectorAll("[data-delete]")
      .forEach((b) => (b.onclick = deleteEvent));
    document
      .querySelectorAll("[data-export]")
      .forEach((b) => (b.onclick = () => exportData(b.dataset.export)));
    $("#import-file")?.addEventListener("change", importData);
    $("#clear-history")?.addEventListener("click", clearHistory);
    $("#reset")?.addEventListener("click", resetData);
  }
  async function saveExpense(e) {
    e.preventDefault();
    const f = new FormData(e.target),
      amount = round2(f.get("amount"));
    if (!(amount > 0)) return toast("Enter an amount greater than zero.");
    const date = new Date(f.get("date")).toISOString(),
      record = {
        id: id(),
        description: f.get("description").trim(),
        amount,
        categoryId: f.get("categoryId"),
        date,
        cycleId: await cycleFor(date),
        note: f.get("note").trim(),
        createdAt: now(),
        updatedAt: now(),
      };
    await DB.put("expenses", record);
    state.expenses.push(record);
    state.view = "dashboard";
    toast("Expense saved.");
    render();
  }
  async function saveIncome(e) {
    e.preventDefault();
    const f = new FormData(e.target),
      amount = round2(f.get("amount"));
    if (!(amount > 0)) return toast("Enter an amount greater than zero.");
    const type = f.get("type"),
      date = new Date(f.get("date")).toISOString(),
      record = {
        id: id(),
        type,
        amount,
        date,
        splitMode: f.get("splitMode"),
        targetCategoryId: f.get("targetCategoryId") || null,
        allocations: splitIncome(
          amount,
          state.settings.categories,
          f.get("splitMode"),
          f.get("targetCategoryId"),
        ),
        cycleId: await cycleFor(date, type === "salary"),
        note: f.get("note").trim(),
        createdAt: now(),
        updatedAt: now(),
      };
    await DB.put("incomeEvents", record);
    state.incomes.push(record);
    state.view = "dashboard";
    toast("Income saved.");
    render();
  }
  function setupPreview() {
    const f = $("#income-form"),
      update = () => {
        const a = Number(f.amount.value);
        $("#target-wrap").hidden = f.splitMode.value !== "fullCategory";
        $("#split-preview").innerHTML =
          a > 0
            ? splitIncome(
                a,
                state.settings.categories,
                f.splitMode.value,
                f.targetCategoryId.value,
              )
                .map(
                  (x) =>
                    `<div>${esc(state.settings.categories.find((c) => c.id === x.categoryId).name)}: <strong>${money(x.amount)}</strong></div>`,
                )
                .join("")
            : "Enter an amount to preview the split.";
      };
    f.addEventListener("input", update);
    f.addEventListener("change", update);
  }
  async function saveSettings(e) {
    e.preventDefault();
    const f = new FormData(e.target),
      names = f.getAll("cat-name"),
      percents = f.getAll("cat-percent").map(Number),
      colors = f.getAll("cat-color"),
      total = round2(percents.reduce((a, b) => a + b, 0));
    if (total !== 100)
      return toast(`Percentages must total 100% (currently ${total}%).`);
    state.settings = {
      ...state.settings,
      currency: f.get("currency").trim() || "INR",
      currencySymbol: f.get("currencySymbol").trim() || "₹",
      categories: names.map((name, i) => ({
        ...state.settings.categories[i],
        name: name.trim(),
        percent: percents[i],
        color: colors[i],
      })),
    };
    await DB.put("settings", state.settings);
    toast("Settings saved.");
    render();
  }
  async function deleteEvent(e) {
    const [kind, eventId] = e.currentTarget.dataset.delete.split(":");
    if (!confirm("Delete this transaction?")) return;
    const store = kind === "Income" ? "incomeEvents" : "expenses";
    await DB.del(store, eventId);
    state[kind === "Income" ? "incomes" : "expenses"] = state[
      kind === "Income" ? "incomes" : "expenses"
    ].filter((x) => x.id !== eventId);
    toast("Transaction deleted.");
    render();
  }
  function download(name, type, data) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function exportData(type) {
    if (type === "json")
      return download(
        `my-budget-backup-${dateId(now())}.json`,
        "application/json",
        JSON.stringify(
          {
            backupFormat: "my-budget-backup",
            backupVersion: 2,
            exportedAt: now(),
            data: {
              settings: state.settings,
              incomeEvents: state.incomes,
              expenses: state.expenses,
              cycles: state.cycles,
            },
          },
          null,
          2,
        ),
      );
    if (type === "txt")
      return download(
        `my-budget-report-${dateId(now())}.txt`,
        "text/plain;charset=utf-8",
        textReport(),
      );
    const rows = [
      ["date", "type", "description", "category", "amount", "note"],
      ...state.incomes.map((x) => [x.date, x.type, x.note, "", x.amount, ""]),
      ...state.expenses.map((x) => [
        x.date,
        "expense",
        x.description,
        state.settings.categories.find((c) => c.id === x.categoryId)?.name ||
          x.categoryId,
        x.amount,
        x.note,
      ]),
    ];
    download(
      `my-budget-${dateId(now())}.csv`,
      "text/csv",
      rows
        .map((r) =>
          r
            .map((v) => '"' + String(v ?? "").replaceAll('"', '""') + '"')
            .join(","),
        )
        .join("\n"),
    );
  }
  function textReport() {
    const balances = calculateBalances(
      state.settings,
      state.incomes,
      state.expenses,
      state.cycles,
    );
    const categoryName = (categoryId) =>
      state.settings.categories.find((c) => c.id === categoryId)?.name || categoryId;
    const line = (label, value) => `${label}: ${value}`;
    const events = [
      ...state.incomes.map((x) => ({ ...x, kind: "Income" })),
      ...state.expenses.map((x) => ({ ...x, kind: "Expense" })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    const totalIncome = state.incomes.reduce((sum, x) => sum + x.amount, 0);
    const totalSpent = state.expenses.reduce((sum, x) => sum + x.amount, 0);
    const lines = [
      "MY BUDGET — DATA REPORT",
      "=".repeat(28),
      line("Generated", new Date().toLocaleString()),
      line("Currency", `${state.settings.currency} (${state.settings.currencySymbol})`),
      line("Total income recorded", money(totalIncome)),
      line("Total expenses recorded", money(totalSpent)),
      "",
      "BUDGET CATEGORIES",
      "-".repeat(28),
      ...state.settings.categories.map((c) =>
        `${c.name}: ${c.percent}% allocation`,
      ),
      "",
      "CYCLE OVERVIEW",
      "-".repeat(28),
    ];
    for (const cycle of sortedCycles(state.cycles)) {
      lines.push(`${cycle.label} (starts ${new Date(cycle.startDate).toLocaleString()})`);
      for (const c of balances[cycle.id] || [])
        lines.push(
          `  ${c.name} — allocated ${money(c.allocated)}, spent ${money(c.spent)}, this-cycle left ${money(c.cycleRemaining)}, carry-over reserve ${money(c.reserveRemaining)}`,
        );
      lines.push("");
    }
    lines.push("COMPLETE TRANSACTION HISTORY", "-".repeat(28));
    if (!events.length) lines.push("No transaction records currently stored.");
    for (const event of events) {
      lines.push(`${new Date(event.date).toLocaleString()} — ${event.kind} — ${money(event.amount)}`);
      if (event.kind === "Income") {
        lines.push(`  Type: ${event.type}; cycle: ${event.cycleId}`);
        lines.push(
          `  Allocation: ${(event.allocations || []).map((a) => `${categoryName(a.categoryId)} ${money(a.amount)}`).join(", ") || "None"}`,
        );
      } else {
        lines.push(`  ${event.description}; category: ${categoryName(event.categoryId)}; cycle: ${event.cycleId}`);
      }
      if (event.note) lines.push(`  Note: ${event.note}`);
    }
    if (state.settings.historyBaseline)
      lines.push("", "Note: Earlier transactions were cleared while their then-current budget balances were retained.");
    return `${lines.join("\n")}\n`;
  }
  function backupPayload(raw) {
    /* Version 1 backups stored the data at the top level. Version 2 wraps it
       with metadata, while retaining the same portable record structure. */
    const data = raw?.data && raw.backupFormat === "my-budget-backup" ? raw.data : raw;
    if (
      !data?.settings ||
      !Array.isArray(data.incomeEvents) ||
      !Array.isArray(data.expenses) ||
      !Array.isArray(data.cycles)
    )
      throw Error("Invalid backup");
    return data;
  }
  async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = backupPayload(JSON.parse(await file.text()));
      if (!confirm("This replaces all current data. Continue?")) return;
      for (const s of ["settings", "incomeEvents", "expenses", "cycles"])
        await DB.clear(s);
      await DB.put("settings", data.settings);
      for (const x of data.incomeEvents) await DB.put("incomeEvents", x);
      for (const x of data.expenses) await DB.put("expenses", x);
      for (const x of data.cycles) await DB.put("cycles", x);
      state.selectedCycle = null;
      await load();
      toast("Backup restored.");
    } catch {
      toast("That file is not a valid My Budget backup.");
    }
  }
  async function clearHistory() {
    if (!state.cycles.length) return toast("There is no history to clear.");
    if (!confirm("Clear all income and expense history? Your current budget, carry-over reserve, settings, and categories will be kept.")) return;
    const latest = sortedCycles(state.cycles).at(-1);
    const balances = calculateBalances(
      state.settings,
      state.incomes,
      state.expenses,
      state.cycles,
    )[latest.id] || [];
    state.settings = {
      ...state.settings,
      historyBaseline: {
        version: 1,
        clearedAt: now(),
        cycleId: latest.id,
        categories: balances.map((c) => ({
          categoryId: c.id,
          opening: c.opening,
          allocated: c.allocated,
          spent: c.spent,
        })),
      },
    };
    await DB.put("settings", state.settings);
    await Promise.all([DB.clear("incomeEvents"), DB.clear("expenses")]);
    state.incomes = [];
    state.expenses = [];
    state.selectedCycle = latest.id;
    state.view = "dashboard";
    toast("History cleared. Current budget and reserves were kept.");
    render();
  }
  async function resetData() {
    if (
      prompt("Type DELETE to erase every local transaction and setting.") !==
      "DELETE"
    )
      return;
    for (const s of ["settings", "incomeEvents", "expenses", "cycles"])
      await DB.clear(s);
    state.selectedCycle = null;
    await load();
    toast("All local data was reset.");
  }
  function toast(message) {
    document.querySelector(".toast")?.remove();
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    document.body.append(el);
    setTimeout(() => el.remove(), 2600);
  }
  function init() {
    document.querySelectorAll("#bottom-nav button").forEach(
      (b) =>
        (b.onclick = () => {
          state.view = b.dataset.view;
          render();
        }),
    );
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    navigator.storage?.persist?.();
    load();
  }
  return { init };
})();
document.addEventListener("DOMContentLoaded", App.init);
