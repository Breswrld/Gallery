(() => {
  const contentsTable = "table_of_contents";
  const supabaseUrl = "https://jrmsbpfkxhtcnhdvplmh.supabase.co";
  const supabasePublishableKey = "sb_publishable_MnTE5qUeTlKNb1TlV6QhrQ_UYIhJjxd";
  const list = document.getElementById("contents-list");
  const status = document.getElementById("contents-status");
  const editButton = document.getElementById("contents-edit");
  const dialog = document.getElementById("contents-dialog");
  const form = document.getElementById("contents-form");
  const emailInput = document.getElementById("editor-email");
  const passwordInput = document.getElementById("editor-password");
  const entryFields = document.getElementById("editor-entry");
  const entryList = document.getElementById("editor-entry-list");
  const heading = document.getElementById("editor-title");
  const help = document.getElementById("editor-help");
  const error = document.getElementById("editor-error");
  const submit = document.getElementById("editor-submit");
  const emailLabel = form.querySelector('label[for="editor-email"]');
  const passwordLabel = form.querySelector('label[for="editor-password"]');
  let currentUser = null;

  function showStatus(message) {
    status.textContent = message;
    status.hidden = false;
  }

  function clearStatus() {
    status.textContent = "";
    status.hidden = true;
  }

  if (!window.supabase) {
    showStatus("Could not load the Supabase client.");
    return;
  }

  const supabase = window.supabase.createClient(supabaseUrl, supabasePublishableKey);

  function showError(message) {
    error.textContent = message;
  }

  function safeHref(value) {
    const href = value.trim();
    if (!href) return "";
    if (href.startsWith("#")) return href;
    let parsed;
    try {
      parsed = new URL(href, document.baseURI);
    } catch {
      return null;
    }
    return ["http:", "https:", "mailto:", "file:"].includes(parsed.protocol) ? href : null;
  }

  async function renderEntries() {
    clearStatus();
    let result;
    try {
      result = await supabase
        .from(contentsTable)
        .select("id, title, href")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
    } catch (err) {
      showStatus(`Could not load the table of contents: ${err.message}`);
      return false;
    }

    const { data: entries, error: loadError } = result;
    if (loadError) {
      showStatus(`Could not load the table of contents: ${loadError.message}`);
      return false;
    }

    if (!Array.isArray(entries)) {
      showStatus("Could not load the table of contents: Supabase returned invalid data.");
      return false;
    }

    const items = document.createDocumentFragment();
    for (const entry of entries) {
      if (!entry || typeof entry.title !== "string" || typeof entry.href !== "string") {
        showStatus("Could not display the table of contents: an entry is invalid.");
        return false;
      }

      const href = safeHref(entry.href);
      if (href === null) {
        showStatus("Could not display the table of contents: an entry link is invalid.");
        return false;
      }

      const row = document.createElement("tr");
      const titleCell = document.createElement("td");
      if (href) {
        const link = document.createElement("a");
        link.href = href;
        link.textContent = entry.title;
        titleCell.append(link);
      } else {
        titleCell.textContent = entry.title;
      }
      row.append(titleCell);
      items.append(row);
    }

    list.replaceChildren(items);
    return true;
  }

  function addEntryRow() {
    const row = document.createElement("fieldset");
    row.className = "editor__entry-row";

    const titleLabel = document.createElement("label");
    titleLabel.textContent = "Entry title";
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.maxLength = 120;
    titleInput.required = true;
    titleInput.dataset.field = "title";
    titleLabel.append(titleInput);

    const linkLabel = document.createElement("label");
    linkLabel.textContent = "Link (optional)";
    const linkInput = document.createElement("input");
    linkInput.type = "text";
    linkInput.maxLength = 500;
    linkInput.placeholder = "Page URL or #section";
    linkInput.dataset.field = "link";
    linkLabel.append(linkInput);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "editor__remove";
    removeButton.textContent = "Remove title";
    removeButton.addEventListener("click", () => {
      row.remove();
      updateRemoveButtons();
    });

    row.append(titleLabel, linkLabel, removeButton);
    entryList.append(row);
    updateRemoveButtons();
    titleInput.focus();
  }

  function updateRemoveButtons() {
    const rows = entryList.querySelectorAll(".editor__entry-row");
    for (const row of rows) {
      row.querySelector(".editor__remove").hidden = rows.length === 1;
    }
  }

  function resetEntryRows() {
    entryList.replaceChildren();
    addEntryRow();
  }

  function showSignInForm() {
    emailInput.value = "";
    emailInput.required = true;
    emailInput.hidden = false;
    emailLabel.hidden = false;
    passwordInput.value = "";
    passwordInput.required = true;
    passwordInput.hidden = false;
    passwordLabel.hidden = false;
    entryFields.hidden = true;
    heading.textContent = "Sign in to add entries";
    help.textContent = "Use the editor account configured in Supabase.";
    submit.textContent = "Sign in";
  }

  function showEntryForm() {
    emailInput.required = false;
    emailInput.hidden = true;
    emailLabel.hidden = true;
    passwordInput.required = false;
    passwordInput.hidden = true;
    passwordLabel.hidden = true;
    resetEntryRows();
    entryFields.hidden = false;
    heading.textContent = "Add table of contents entries";
    help.textContent = "Add one or more titles and links, then save them together.";
    submit.textContent = "Save entries";
  }

  function openEditor() {
    error.textContent = "";
    if (currentUser) {
      showEntryForm();
    } else {
      showSignInForm();
    }
    dialog.showModal();
    if (currentUser) {
      entryList.querySelector('[data-field="title"]').focus();
    } else {
      emailInput.focus();
    }
  }

  editButton.addEventListener("click", openEditor);

  document.getElementById("editor-add").addEventListener("click", addEntryRow);
  document.getElementById("editor-cancel").addEventListener("click", () => dialog.close());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = "";

    if (!currentUser) {
      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: emailInput.value.trim(),
          password: passwordInput.value
        });
        if (signInError) {
          console.error("Login failed:", signInError.message);
          showError(`Could not sign in: ${signInError.message}`);
          return;
        }
        currentUser = data.user;
        showEntryForm();
        entryList.querySelector('[data-field="title"]').focus();
      } catch (err) {
        showError(`Could not sign in: ${err.message}`);
      }
      return;
    }

    const rows = [...entryList.querySelectorAll(".editor__entry-row")];
    const newEntries = [];
    for (const row of rows) {
      const titleInput = row.querySelector('[data-field="title"]');
      const linkInput = row.querySelector('[data-field="link"]');
      const title = titleInput.value.trim();
      if (!title) {
        showError("Enter a title in each row.");
        titleInput.focus();
        return;
      }
      const href = safeHref(linkInput.value);
      if (href === null) {
        showError("Use a page URL, an #section link, or leave the link blank.");
        linkInput.focus();
        return;
      }
      newEntries.push({ title, href });
    }

    try {
      const { error: insertError } = await supabase.from(contentsTable).insert(newEntries);
      if (insertError) {
        showError(`Could not save entries: ${insertError.message}`);
        return;
      }
    } catch (err) {
      showError(`Could not save entries: ${err.message}`);
      return;
    }

    if (await renderEntries()) {
      dialog.close();
    }
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
  });

  async function initialize() {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      showStatus(`Could not check sign-in status: ${sessionError.message}`);
    } else {
      currentUser = data.session?.user ?? null;
    }
    await renderEntries();
  }

  initialize().catch((err) => {
    showStatus(`Could not connect to Supabase: ${err.message}`);
  });
})();
