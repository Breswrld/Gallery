(() => {
  const contentsTable = "table_of_contents";
  const supabaseUrl = "https://jrmsbpfkxhtcnhdvplmh.supabase.co";
  const supabasePublishableKey = "sb_publishable_MnTE5qUeTlKNb1TlV6QhrQ_UYIhJjxd";
  const list = document.getElementById("contents-list");
  const status = document.getElementById("contents-status");
  const computerList = document.getElementById("computer-contents-list");
  const computerStatus = document.getElementById("computer-contents-status");
  const editButton = document.getElementById("contents-edit");
  const computerEditButton = document.getElementById("computer-contents-edit");
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
  const dynamicSections = document.getElementById("dynamic-sections");
  const computerDynamicSections = document.getElementById("computer-dynamic-sections");
  const projectImageUrls = new Set();
  const computerImageUrls = new Set();
  const computerProjectImageUrls = new Set();
  const computerMediaImageUrls = new Set();
  let currentUser = null;

  function showStatus(message) {
    status.textContent = message;
    status.hidden = false;
    computerStatus.textContent = message;
    computerStatus.hidden = false;
  }

  function clearStatus() {
    status.textContent = "";
    status.hidden = true;
    computerStatus.textContent = "";
    computerStatus.hidden = true;
  }

  function addProjectImage(grid, file, urls) {
    if (!file.type.startsWith("image/")) return false;
    const url = URL.createObjectURL(file);
    urls.add(url);
    const figure = document.createElement("figure");
    figure.className = "project-media__item";
    const image = document.createElement("img");
    image.src = url;
    image.alt = file.name;
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.setAttribute("aria-label", `Remove ${file.name}`);
    removeButton.addEventListener("click", () => {
      URL.revokeObjectURL(url);
      urls.delete(url);
      figure.remove();
    });
    figure.append(image, removeButton);
    grid.append(figure);
    return true;
  }

  function bindProjectUploader(input, grid, message, urls) {
    input.addEventListener("change", () => {
      const files = [...input.files];
      const invalidFiles = files.filter((file) => !file.type.startsWith("image/"));
      for (const file of files) addProjectImage(grid, file, urls);
      message.textContent = invalidFiles.length
        ? "Only image files can be added to the gallery."
        : "";
      input.value = "";
    });
  }

  function createProjectSection(entry, platform) {
    const isComputer = platform === "computer";
    const section = document.createElement("section");
    const sectionId = `${platform}-project-${String(entry.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
    section.className = isComputer ? "computer__project" : "project-media";
    section.id = sectionId;
    section.setAttribute("aria-label", `${entry.title} project section`);

    const gallery = document.createElement("div");
    gallery.className = isComputer ? "computer__project-gallery" : "project-media__gallery";
    const upload = document.createElement("label");
    upload.className = isComputer ? "computer__upload" : "project-media__upload";
    upload.append(document.createTextNode("+ Add photos"));
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.multiple = true;
    fileInput.setAttribute("aria-label", `Upload photos for ${entry.title}`);
    upload.append(fileInput);
    const grid = document.createElement("div");
    grid.className = isComputer ? "computer__project-grid" : "project-media__grid";
    const message = document.createElement("p");
    message.className = isComputer ? "computer__message" : "project-media__message";
    message.setAttribute("role", "status");
    const urls = isComputer ? computerProjectImageUrls : projectImageUrls;
    bindProjectUploader(fileInput, grid, message, urls);
    gallery.append(upload, grid, message);

    const content = document.createElement("div");
    content.className = isComputer ? "computer__project-content" : "project-media__content";
    const title = document.createElement("input");
    title.className = isComputer ? "computer__project-title" : "project-media__title";
    title.type = "text";
    title.value = entry.title;
    title.maxLength = 120;
    title.setAttribute("aria-label", `${entry.title} section title`);
    const description = document.createElement("textarea");
    description.className = isComputer ? "computer__project-description" : "project-media__description";
    description.value = "Add a description for this project.";
    description.maxLength = 5000;
    description.rows = 5;
    description.setAttribute("aria-label", `${entry.title} section description`);
    content.append(title, description);
    section.append(gallery, content);
    return { section, sectionId };
  }

  function initializeComputerGallery() {
    bindProjectUploader(
      document.querySelector(".computer-section__upload input"),
      document.getElementById("phone-computer-gallery"),
      document.getElementById("phone-computer-upload-status"),
      computerImageUrls
    );
    bindProjectUploader(
      document.querySelector(".computer__upload input"),
      document.getElementById("computer-media-gallery"),
      document.getElementById("computer-media-upload-status"),
      computerMediaImageUrls
    );
  }

  initializeComputerGallery();

  if (!window.supabase) {
    showStatus("Could not load the Supabase client.");
    return;
  }

  const supabase = window.supabase.createClient(supabaseUrl, supabasePublishableKey);

  function showError(message) {
    error.textContent = message;
  }

  async function renderEntries() {
    clearStatus();
    let result;
    try {
      result = await supabase
        .from(contentsTable)
        .select("id, title")
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

    const phoneItems = document.createDocumentFragment();
    const computerItems = document.createDocumentFragment();
    const phoneSections = document.createDocumentFragment();
    const computerSections = document.createDocumentFragment();
    for (const entry of entries) {
      if (
        !entry
        || !(typeof entry.id === "string" && entry.id.trim() || Number.isSafeInteger(entry.id))
        || typeof entry.title !== "string"
      ) {
        showStatus("Could not display the table of contents: an entry is invalid.");
        return false;
      }

      const { section: phoneSection, sectionId: phoneSectionId } = createProjectSection(entry, "phone");
      const { section: computerSection, sectionId: computerSectionId } = createProjectSection(entry, "computer");
      for (const [items, sectionId] of [
        [phoneItems, phoneSectionId],
        [computerItems, computerSectionId]
      ]) {
        const row = document.createElement("tr");
        const titleCell = document.createElement("td");
        const link = document.createElement("a");
        link.href = `#${sectionId}`;
        link.textContent = entry.title;
        titleCell.append(link);
        const actionsCell = document.createElement("td");
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "contents__remove";
        removeButton.dataset.removeId = entry.id;
        removeButton.textContent = "Remove";
        removeButton.hidden = !currentUser;
        removeButton.setAttribute("aria-label", `Remove ${entry.title} from the table of contents`);
        actionsCell.append(removeButton);
        row.append(titleCell, actionsCell);
        items.append(row);
      }
      phoneSections.append(phoneSection);
      computerSections.append(computerSection);
    }

    for (const url of projectImageUrls) URL.revokeObjectURL(url);
    projectImageUrls.clear();
    for (const url of computerProjectImageUrls) URL.revokeObjectURL(url);
    computerProjectImageUrls.clear();
    dynamicSections.replaceChildren(phoneSections);
    computerDynamicSections.replaceChildren(computerSections);
    const phoneComputerRow = list.querySelector(".contents__computer-row");
    const computerRow = computerList.querySelector(".computer__computer-row");
    list.replaceChildren(phoneComputerRow, phoneItems);
    computerList.replaceChildren(computerRow, computerItems);
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

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "editor__remove";
    removeButton.textContent = "Remove title";
    removeButton.addEventListener("click", () => {
      row.remove();
      updateRemoveButtons();
    });

    row.append(titleLabel, removeButton);
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
  computerEditButton.addEventListener("click", openEditor);

  document.getElementById("editor-add").addEventListener("click", addEntryRow);
  document.getElementById("editor-cancel").addEventListener("click", () => dialog.close());

  for (const contentsList of [list, computerList]) {
    contentsList.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-remove-id]");
      if (!button || !currentUser) return;
      const id = button.dataset.removeId;
      if (!id || !window.confirm("Remove this title and its section?")) return;
      button.disabled = true;
      const { error: deleteError } = await supabase.from(contentsTable).delete().eq("id", id);
      if (deleteError) {
        button.disabled = false;
        showStatus(`Could not remove the title: ${deleteError.message}`);
        return;
      }
      await renderEntries();
    });
  }

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

    const newEntries = [];
    for (const row of entryList.querySelectorAll(".editor__entry-row")) {
      const titleInput = row.querySelector('[data-field="title"]');
      const title = titleInput.value.trim();
      if (!title) {
        showError("Enter a title in each row.");
        titleInput.focus();
        return;
      }
      newEntries.push({ title, href: "" });
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
    for (const contentsList of [list, computerList]) {
      for (const button of contentsList.querySelectorAll("[data-remove-id]")) {
        button.hidden = !currentUser;
      }
    }
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
