document.addEventListener("DOMContentLoaded", () => {
  const contentsTable = "table_of_contents";
  const imagesTable = "project_images";
  const mediaBucket = "project-media";
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
  const signOutButton = document.getElementById("editor-signout");
  const emailLabel = form.querySelector('label[for="editor-email"]');
  const passwordLabel = form.querySelector('label[for="editor-password"]');
  const dynamicSections = document.getElementById("dynamic-sections");
  const computerDynamicSections = document.getElementById("computer-dynamic-sections");
  const addRowButton = document.getElementById("editor-add");
  const cancelButton = document.getElementById("editor-cancel");
  const lightbox = document.getElementById("photo-lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxClose = document.getElementById("lightbox-close");

  let currentUser = null;
  let closeAfterSignIn = false;

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

  function createArrowIcon(direction) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("viewBox", "0 0 24 24");
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", direction === "left" ? "M19 12H5m6 6-6-6 6-6" : "M5 12h14m-6-6 6 6-6 6");
    svg.append(path);
    return svg;
  }

  function createNavBar(platform, prevHref, nextHref) {
    const isComputer = platform === "computer";
    const nav = document.createElement("nav");
    nav.className = isComputer ? "computer__nav" : "project-media__nav";
    nav.setAttribute("aria-label", "Section navigation");

    const backLink = document.createElement("a");
    backLink.className = isComputer ? "computer__back" : "project-media__back";
    backLink.href = isComputer ? "#computer-home" : "#next-section";
    backLink.append(createArrowIcon("left"), document.createTextNode(isComputer ? "Back to contents" : "Contents"));

    const steps = document.createElement("div");
    steps.className = isComputer ? "computer__nav-steps" : "project-media__nav-steps";

    if (prevHref) {
      const prevLink = document.createElement("a");
      prevLink.className = isComputer ? "computer__step" : "project-media__step";
      prevLink.href = prevHref;
      prevLink.append(createArrowIcon("left"), document.createTextNode("Prev"));
      steps.append(prevLink);
    }

    if (nextHref) {
      const nextLink = document.createElement("a");
      nextLink.className = isComputer ? "computer__step" : "project-media__step";
      nextLink.href = nextHref;
      nextLink.append(document.createTextNode("Next"), createArrowIcon("right"));
      steps.append(nextLink);
    }

    nav.append(backLink, steps);
    return nav;
  }

  const supabase = createClient(supabaseUrl, supabasePublishableKey);

  function showError(message) {
    error.textContent = message;
  }

  function syncAuthUI() {
    const isEditor = Boolean(currentUser);
    signOutButton.hidden = !isEditor;

    for (const button of document.querySelectorAll("[data-remove-id]")) {
      button.hidden = !isEditor;
    }
    for (const upload of document.querySelectorAll("[data-project-upload]")) {
      upload.hidden = !isEditor;
    }
    for (const signInBtn of document.querySelectorAll("[data-project-signin]")) {
      signInBtn.hidden = isEditor;
    }
    for (const removeBtn of document.querySelectorAll("[data-remove-image-id]")) {
      removeBtn.hidden = !isEditor;
    }
    for (const saveBtn of document.querySelectorAll("[data-project-save]")) {
      saveBtn.hidden = !isEditor;
    }
    for (const field of document.querySelectorAll("[data-project-field]")) {
      field.readOnly = !isEditor;
    }
  }

  function buildImageFigure(imgRecord, projectId) {
    const figure = document.createElement("figure");
    figure.className = "project-media__item";
    figure.dataset.imageId = imgRecord.id;

    const image = document.createElement("img");
    image.src = imgRecord.url;
    image.alt = imgRecord.file_name || "Project photo";
    image.referrerPolicy = "no-referrer";
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", `Zoom in on ${imgRecord.file_name || "photo"}`);

    const openPhoto = () => {
      lightboxImage.src = imgRecord.url;
      lightboxImage.alt = imgRecord.file_name || "Project photo";
      lightboxImage.classList.remove("is-zoomed");
      lightboxCaption.textContent = imgRecord.file_name || "Tap photo to zoom closer";
      lightbox.showModal();
    };

    image.addEventListener("click", openPhoto);
    image.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPhoto();
      }
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.dataset.removeImageId = imgRecord.id;
    removeButton.textContent = "Remove";
    removeButton.hidden = !currentUser;
    removeButton.setAttribute("aria-label", `Remove ${imgRecord.file_name || "photo"}`);

    removeButton.addEventListener("click", async () => {
      if (!currentUser) return;
      removeButton.disabled = true;

      const { error: dbError } = await supabase
        .from(imagesTable)
        .delete()
        .eq("id", imgRecord.id);

      if (dbError) {
        removeButton.disabled = false;
        const msg = figure.closest(".project-media, .computer__project")?.querySelector("[data-project-message]");
        if (msg) msg.textContent = `Could not remove photo: ${dbError.message}`;
        return;
      }

      if (imgRecord.storage_path) {
        await supabase.storage.from(mediaBucket).remove([imgRecord.storage_path]);
      }

      for (const el of document.querySelectorAll(`[data-project-id="${projectId}"] [data-image-id="${imgRecord.id}"]`)) {
        el.remove();
      }
    });

    figure.append(image, removeButton);
    return figure;
  }

  async function handlePhotoUpload(files, entry, messageEl) {
    if (!currentUser) return;
    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    const hasInvalid = validFiles.length !== files.length;

    if (!validFiles.length) {
      messageEl.textContent = "Only image files can be added to the gallery.";
      return;
    }

    messageEl.textContent = "Uploading...";

    for (const file of validFiles) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uniquePart = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const storagePath = `${entry.id}/${uniquePart}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(mediaBucket)
        .upload(storagePath, file, { upsert: false });

      if (uploadError) {
        messageEl.textContent = `Upload failed: ${uploadError.message}`;
        return;
      }

      const { data: publicData } = supabase.storage
        .from(mediaBucket)
        .getPublicUrl(storagePath);

      const { data: insertedRow, error: insertError } = await supabase
        .from(imagesTable)
        .insert({
          project_id: entry.id,
          storage_path: storagePath,
          url: publicData.publicUrl,
          file_name: file.name.slice(0, 255)
        })
        .select("id, project_id, storage_path, url, file_name")
        .single();

      if (insertError || !insertedRow) {
        await supabase.storage.from(mediaBucket).remove([storagePath]);
        messageEl.textContent = `Could not save photo record: ${insertError?.message ?? "Unknown error"}`;
        return;
      }

      for (const grid of document.querySelectorAll(`[data-project-id="${entry.id}"] [data-project-grid]`)) {
        grid.append(buildImageFigure(insertedRow, entry.id));
      }
    }

    messageEl.textContent = hasInvalid
      ? "Uploaded images. Non-image files were skipped."
      : "";
  }

  function autoSizeTextarea(textarea) {
    if (!textarea || !textarea.isConnected) return;
    textarea.style.height = "auto";
    if (textarea.scrollHeight > 0) {
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }

  function autoSizeAllDescriptions() {
    for (const el of document.querySelectorAll(".computer__project-description, .project-media__description")) {
      autoSizeTextarea(el);
    }
  }

  async function saveProjectText(entry, titleInput, descInput, saveBtn, saveStatusEl) {
    if (!currentUser) return;
    const nextTitle = titleInput.value.trim();
    const nextDescription = descInput.value;

    if (!nextTitle) {
      saveStatusEl.textContent = "Title cannot be empty.";
      titleInput.focus();
      return;
    }

    saveBtn.disabled = true;
    saveStatusEl.textContent = "Saving...";

    const { error: updateError } = await supabase
      .from(contentsTable)
      .update({
        title: nextTitle,
        description: nextDescription
      })
      .eq("id", entry.id);

    saveBtn.disabled = false;

    if (updateError) {
      saveStatusEl.textContent = `Could not save: ${updateError.message}`;
      return;
    }

    entry.title = nextTitle;
    entry.description = nextDescription;

    for (const el of document.querySelectorAll(`[data-project-id="${entry.id}"] [data-project-field="title"]`)) {
      el.value = nextTitle;
    }
    for (const el of document.querySelectorAll(`[data-project-id="${entry.id}"] [data-project-field="description"]`)) {
      el.value = nextDescription;
      autoSizeTextarea(el);
    }
    for (const link of document.querySelectorAll(`[data-toc-link-id="${entry.id}"]`)) {
      link.textContent = nextTitle;
    }
    for (const statusText of document.querySelectorAll(`[data-project-id="${entry.id}"] [data-save-status]`)) {
      statusText.textContent = "Saved";
    }
  }

  function createProjectSection(entry, projectImages, platform, prevHref, nextHref) {
    const isComputer = platform === "computer";
    const section = document.createElement("section");
    const sectionId = `${platform}-project-${String(entry.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
    section.className = isComputer ? "computer__project" : "project-media";
    section.id = sectionId;
    section.dataset.projectId = String(entry.id);
    section.setAttribute("aria-label", `${entry.title} project section`);

    const gallery = document.createElement("div");
    gallery.className = isComputer ? "computer__project-gallery" : "project-media__gallery";

    const navBar = createNavBar(platform, prevHref, nextHref);

    const toolbar = document.createElement("div");

    const signInToAddBtn = document.createElement("button");
    signInToAddBtn.type = "button";
    signInToAddBtn.className = isComputer ? "computer__upload" : "project-media__upload";
    signInToAddBtn.dataset.projectSignin = "true";
    signInToAddBtn.hidden = Boolean(currentUser);
    signInToAddBtn.textContent = "Sign in to add photos";
    signInToAddBtn.addEventListener("click", () => openEditor(true));

    const upload = document.createElement("label");
    upload.className = isComputer ? "computer__upload" : "project-media__upload";
    upload.dataset.projectUpload = "true";
    upload.hidden = !currentUser;
    upload.append(document.createTextNode("+ Add photos"));

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.multiple = true;
    fileInput.setAttribute("aria-label", `Upload photos for ${entry.title}`);
    upload.append(fileInput);

    toolbar.append(signInToAddBtn, upload);

    const grid = document.createElement("div");
    grid.className = isComputer ? "computer__project-grid" : "project-media__grid";
    grid.dataset.projectGrid = "true";

    for (const imgRecord of projectImages) {
      grid.append(buildImageFigure(imgRecord, entry.id));
    }

    const message = document.createElement("p");
    message.className = isComputer ? "computer__message" : "project-media__message";
    message.dataset.projectMessage = "true";
    message.setAttribute("role", "status");

    fileInput.addEventListener("change", async () => {
      const files = [...(fileInput.files ?? [])];
      fileInput.value = "";
      if (files.length) {
        await handlePhotoUpload(files, entry, message);
      }
    });

    gallery.append(navBar, toolbar, grid, message);

    const content = document.createElement("div");
    content.className = isComputer ? "computer__project-content" : "project-media__content";

    const title = document.createElement("input");
    title.className = isComputer ? "computer__project-title" : "project-media__title";
    title.type = "text";
    title.value = entry.title;
    title.maxLength = 120;
    title.readOnly = !currentUser;
    title.dataset.projectField = "title";
    title.setAttribute("aria-label", `${entry.title} section title`);

    const description = document.createElement("textarea");
    description.className = isComputer ? "computer__project-description" : "project-media__description";
    description.value = entry.description ?? "Add a description for this project.";
    description.maxLength = 5000;
    description.rows = 1;
    description.readOnly = !currentUser;
    description.dataset.projectField = "description";
    description.setAttribute("aria-label", `${entry.title} section description`);

    const actions = document.createElement("div");
    actions.className = "project-media__actions";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "project-media__save";
    saveBtn.textContent = "Save changes";
    saveBtn.dataset.projectSave = "true";
    saveBtn.hidden = !currentUser;

    const saveStatus = document.createElement("p");
    saveStatus.className = "project-media__save-status";
    saveStatus.dataset.saveStatus = "true";
    saveStatus.setAttribute("role", "status");

    const onSave = () => saveProjectText(entry, title, description, saveBtn, saveStatus);
    saveBtn.addEventListener("click", onSave);

    for (const field of [title, description]) {
      field.addEventListener("input", () => {
        if (field === description) {
          autoSizeTextarea(description);
        }
        if (currentUser) saveStatus.textContent = "Unsaved changes";
      });
      field.addEventListener("blur", () => {
        if (currentUser && (title.value.trim() !== entry.title || description.value !== (entry.description ?? ""))) {
          onSave();
        }
      });
    }

    actions.append(saveBtn, saveStatus);
    content.append(title, description, actions);
    section.append(gallery, content);
    return { section, sectionId };
  }

  async function renderEntries() {
    clearStatus();
    let entriesResult;
    let imagesResult;
    try {
      [entriesResult, imagesResult] = await Promise.all([
        supabase
          .from(contentsTable)
          .select("id, title, description")
          .order("created_at", { ascending: true })
          .order("id", { ascending: true }),
        supabase
          .from(imagesTable)
          .select("id, project_id, storage_path, url, file_name")
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
      ]);
    } catch (err) {
      showStatus(`Could not load the table of contents: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }

    const { data: entries, error: loadError } = entriesResult;
    if (loadError) {
      showStatus(`Could not load the table of contents: ${loadError.message}`);
      return false;
    }

    if (!Array.isArray(entries)) {
      showStatus("Could not load the table of contents: Supabase returned invalid data.");
      return false;
    }

    const { data: images, error: imagesError } = imagesResult;
    if (imagesError) {
      showStatus(`Could not load project images: ${imagesError.message}`);
    }

    const imagesByProject = new Map();
    if (Array.isArray(images)) {
      for (const img of images) {
        const key = String(img.project_id);
        if (!imagesByProject.has(key)) imagesByProject.set(key, []);
        imagesByProject.get(key).push(img);
      }
    }

    const phoneItems = document.createDocumentFragment();
    const computerItems = document.createDocumentFragment();
    const phoneSections = document.createDocumentFragment();
    const computerSections = document.createDocumentFragment();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (
        !entry
        || !((typeof entry.id === "string" && entry.id.trim()) || Number.isSafeInteger(entry.id))
        || typeof entry.title !== "string"
      ) {
        showStatus("Could not display the table of contents: an entry is invalid.");
        return false;
      }

      const prevEntry = i > 0 ? entries[i - 1] : null;
      const nextEntry = i < entries.length - 1 ? entries[i + 1] : null;

      const phonePrevHref = prevEntry
        ? `#phone-project-${String(prevEntry.id).replace(/[^a-zA-Z0-9_-]/g, "")}`
        : "#next-section";
      const phoneNextHref = nextEntry
        ? `#phone-project-${String(nextEntry.id).replace(/[^a-zA-Z0-9_-]/g, "")}`
        : null;

      const computerPrevHref = prevEntry
        ? `#computer-project-${String(prevEntry.id).replace(/[^a-zA-Z0-9_-]/g, "")}`
        : "#computer-home";
      const computerNextHref = nextEntry
        ? `#computer-project-${String(nextEntry.id).replace(/[^a-zA-Z0-9_-]/g, "")}`
        : null;

      const projectImages = imagesByProject.get(String(entry.id)) ?? [];
      const { section: phoneSection, sectionId: phoneSectionId } = createProjectSection(
        entry,
        projectImages,
        "phone",
        phonePrevHref,
        phoneNextHref
      );
      const { section: computerSection, sectionId: computerSectionId } = createProjectSection(
        entry,
        projectImages,
        "computer",
        computerPrevHref,
        computerNextHref
      );

      for (const [items, sectionId] of [
        [phoneItems, phoneSectionId],
        [computerItems, computerSectionId]
      ]) {
        const row = document.createElement("tr");
        const titleCell = document.createElement("td");
        const rowContent = document.createElement("div");
        rowContent.className = "contents__row";

        const link = document.createElement("a");
        link.href = `#${sectionId}`;
        link.dataset.tocLinkId = String(entry.id);
        link.textContent = entry.title;

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "contents__remove";
        removeButton.dataset.removeId = String(entry.id);
        removeButton.textContent = "Remove";
        removeButton.hidden = !currentUser;
        removeButton.setAttribute("aria-label", `Remove ${entry.title} from the table of contents`);

        rowContent.append(link, removeButton);
        titleCell.append(rowContent);
        row.append(titleCell);
        items.append(row);
      }

      phoneSections.append(phoneSection);
      computerSections.append(computerSection);
    }

    dynamicSections.replaceChildren(phoneSections);
    computerDynamicSections.replaceChildren(computerSections);
    list.replaceChildren(phoneItems);
    computerList.replaceChildren(computerItems);
    syncAuthUI();
    requestAnimationFrame(autoSizeAllDescriptions);
    return true;
  }

  function updateRemoveButtons() {
    const rows = entryList.querySelectorAll(".editor__entry-row");
    for (const row of rows) {
      const removeBtn = row.querySelector(".editor__remove");
      if (removeBtn) removeBtn.hidden = rows.length === 1;
    }
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
    signOutButton.hidden = true;
    heading.textContent = "Sign in to edit";
    help.textContent = "Use your Supabase editor account to add, edit, or remove projects.";
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
    signOutButton.hidden = false;
    heading.textContent = "Add table of contents entries";
    help.textContent = "Add one or more project titles, then save them together.";
    submit.textContent = "Save entries";
  }

  function openEditor(shouldCloseAfterSignIn = false) {
    closeAfterSignIn = shouldCloseAfterSignIn;
    error.textContent = "";
    if (currentUser) {
      showEntryForm();
    } else {
      showSignInForm();
    }
    dialog.showModal();
    if (currentUser) {
      entryList.querySelector('[data-field="title"]')?.focus();
    } else {
      emailInput.focus();
    }
  }

  const handleOpenTocEditor = () => openEditor(false);
  const handleCancel = () => dialog.close();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    currentUser = null;
    syncAuthUI();
    dialog.close();
  };

  const handleListClick = async (event) => {
    const button = event.target?.closest("[data-remove-id]");
    if (!button || !currentUser) return;
    const id = button.dataset.removeId;
    if (!id) return;

    if (button.dataset.confirming !== "true") {
      button.dataset.confirming = "true";
      button.textContent = "Confirm?";
      window.setTimeout(() => {
        if (button.isConnected && button.dataset.confirming === "true") {
          button.dataset.confirming = "false";
          button.textContent = "Remove";
        }
      }, 3000);
      return;
    }

    button.disabled = true;

    const { data: projectImages } = await supabase
      .from(imagesTable)
      .select("storage_path")
      .eq("project_id", id);

    if (Array.isArray(projectImages) && projectImages.length) {
      const paths = projectImages.map((img) => img.storage_path).filter(Boolean);
      if (paths.length) {
        await supabase.storage.from(mediaBucket).remove(paths);
      }
    }

    const { error: deleteError } = await supabase
      .from(contentsTable)
      .delete()
      .eq("id", id);

    if (deleteError) {
      button.disabled = false;
      button.dataset.confirming = "false";
      button.textContent = "Remove";
      showStatus(`Could not remove the title: ${deleteError.message}`);
      return;
    }

    await renderEntries();
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    error.textContent = "";

    if (!currentUser) {
      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: emailInput.value.trim(),
          password: passwordInput.value
        });
        if (signInError) {
          showError(`Could not sign in: ${signInError.message}`);
          return;
        }
        currentUser = data.user;
        syncAuthUI();
        if (closeAfterSignIn) {
          closeAfterSignIn = false;
          dialog.close();
        } else {
          showEntryForm();
          entryList.querySelector('[data-field="title"]')?.focus();
        }
      } catch (err) {
        showError(`Could not sign in: ${err instanceof Error ? err.message : String(err)}`);
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
      // Kept href: "" since your table has an href column
      newEntries.push({
        title,
        href: "",
        description: "Add a description for this project."
      });
    }

    try {
      const { error: insertError } = await supabase.from(contentsTable).insert(newEntries);
      if (insertError) {
        showError(`Could not save entries: ${insertError.message}`);
        return;
      }
    } catch (err) {
      showError(`Could not save entries: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    if (await renderEntries()) {
      dialog.close();
    }
  };

  const closeLightbox = () => {
    lightbox.close();
    lightboxImage.classList.remove("is-zoomed");
    lightboxImage.removeAttribute("src");
    lightboxCaption.textContent = "";
  };

  const handleLightboxImageClick = () => {
    lightboxImage.classList.toggle("is-zoomed");
  };

  const handleLightboxBackdropClick = (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  };

  const handleKeyDown = (event) => {
    if (dialog.open || lightbox.open) return;
    const activeTag = document.activeElement?.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    const isDesktop = window.matchMedia("(min-width: 992px)").matches;
    const scroller = document.querySelector(isDesktop ? ".computer" : ".phone");
    if (!scroller) return;

    const delta = event.key === "ArrowRight" ? window.innerWidth : -window.innerWidth;
    scroller.scrollBy({ left: delta, behavior: "smooth" });
  };

  editButton.addEventListener("click", handleOpenTocEditor);
  computerEditButton.addEventListener("click", handleOpenTocEditor);
  addRowButton.addEventListener("click", addEntryRow);
  cancelButton.addEventListener("click", handleCancel);
  signOutButton.addEventListener("click", handleSignOut);
  list.addEventListener("click", handleListClick);
  computerList.addEventListener("click", handleListClick);
  form.addEventListener("submit", handleFormSubmit);
  lightboxClose.addEventListener("click", closeLightbox);
  lightboxImage.addEventListener("click", handleLightboxImageClick);
  lightbox.addEventListener("click", handleLightboxBackdropClick);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("resize", autoSizeAllDescriptions);

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    syncAuthUI();
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
    showStatus(`Could not connect to Supabase: ${err instanceof Error ? err.message : String(err)}`);
  });
});