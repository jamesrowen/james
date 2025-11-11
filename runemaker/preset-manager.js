// preset-manager.js

// --- 0. CONSTANTS & GLOBALS ---
const ACTIVE_HIGHLIGHT_COLOR = '#fcc6b3';
const TEXT_PRESETS_KEY = 'TextPresets';
const SETTINGS_PRESETS_KEY = 'SettingsPresets';
const RUNE_SETS_KEY = 'RuneSets';
const WORKSPACE_STORAGE_KEY = 'RuneGeneratorActiveWorkspace';
let presetDrawCallback = null;
let GetTextInput = null;
let SetTextInput = null;

// Cconfiguration for all preset types (UI STATE IS STORED HERE)
const presetTypes = [
    {
        key: TEXT_PRESETS_KEY,
        simpleKey: 'text',
        containerId: 'preset-list-container',
        saveBtnId: 'savePresetBtn',
        nameInputId: '', // Text presets generate name from content
        activePreset: null
    }, {
        key: SETTINGS_PRESETS_KEY,
        simpleKey: 'settings',
        containerId: 'settings-list-container',
        saveBtnId: 'saveSettingsBtn',
        nameInputId: 'settingsPresetName',
        activePreset: null
    }, {
        key: RUNE_SETS_KEY,
        simpleKey: 'runeset',
        containerId: 'rune-sets-list-container',
        saveBtnId: 'saveRuneSetBtn',
        nameInputId: 'runeSetName',
        activePreset: null
    }
];


// --- 1. PERSISTENCE HELPERS ---

function getPresets(key) {
    let presets;
    const data = localStorage.getItem(key);
    try {
        presets = data ? JSON.parse(data) : {};
    } catch (e) {
        console.error(`Error parsing ${key} from localStorage:`, e);
        showNotification(`Error loading ${key} presets.`, true);
        return {};
    }
    // if no saved presets, load from file
    if (Object.keys(presets).length === 0) {
        if (key === TEXT_PRESETS_KEY) presets = TextPresets;
        else if (key === SETTINGS_PRESETS_KEY) presets = SettingsPresets;
        else if (key === RUNE_SETS_KEY) presets = RuneSets;
        savePresets(key, presets); // Save defaults for persistence
    }

    return presets;
}

function savePresets(key, presetsObject) {
    localStorage.setItem(key, JSON.stringify(presetsObject));
}

function generateTextPresetName(textContent) {
    let cleanText = textContent.replace(/[\r\n\s]+/g, ' ').trim();
    if (cleanText.length === 0) return "BLANK TEXT";
    let truncated = cleanText.substring(0, 22);
    if (cleanText.length > 22) truncated += '...';
    return truncated;
}

/** Saves the names of the currently active presets to localStorage. */
function saveActiveWorkspace() {
    const workspaceState = {
        text: presetTypes.find(t => t.key === TEXT_PRESETS_KEY).activePreset,
        settings: presetTypes.find(t => t.key === SETTINGS_PRESETS_KEY).activePreset,
        runeset: presetTypes.find(t => t.key === RUNE_SETS_KEY).activePreset,
    };
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspaceState));
}

/** Loads the names of the active presets from localStorage. */
function loadActiveWorkspace() {
    const data = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    try {
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error("Error parsing workspace state:", e);
        return {};
    }
}


function initializeWorkspace() {
    const activeNames = loadActiveWorkspace();

    presetTypes.forEach(type => {
        const storageKey = type.key;
        const simpleKey = type.simpleKey;
        const presetsObject = getPresets(storageKey);

        let nameToLoad = null;

        // 1. Check for saved preset name
        const savedName = activeNames[simpleKey];
        if (savedName && presetsObject.hasOwnProperty(savedName)) {
            nameToLoad = savedName;
        }

        // 2. Fallback to the First Available Preset (First key in object)
        if (!nameToLoad) {
            const firstPresetName = Object.keys(presetsObject)[0];
            if (firstPresetName) {
                nameToLoad = firstPresetName;
            }
        }

        // 3. Execute Load Action
        if (nameToLoad) {
            // Simulate the event target to trigger handleLoadPreset correctly
            const fakeEvent = { target: { dataset: { presetName: nameToLoad } } };

            // This triggers the load, updates UI state, and redraws the canvas
            handleLoadPreset(fakeEvent, storageKey);
        }
    });
}

// --- 2. SETTINGS STATE CAPTURE/RECALL ---

function captureCurrentSettings() {
    return {
        runeSize: parseFloat(document.getElementById('runeSize').value),
        thickness: parseFloat(document.getElementById('thickness').value),
        cornerRadius: parseFloat(document.getElementById('cornerRadius').value),
        charSpacing: document.getElementById('charSpacing').value,
        lineSpacing: document.getElementById('lineSpacing').value,
        spaceWidth: document.getElementById('spaceWidth').value,
        fillColor: document.getElementById('fillColor').value,
        borderColor: document.getElementById('borderColor').value,
        borderThickness: parseFloat(document.getElementById('borderThickness').value),
        backgroundColor: document.getElementById('backgroundColor').value,
        backgroundTransparent: document.getElementById('backgroundTransparent').checked,
        canvasWidth: parseFloat(document.getElementById('canvasWidth').value),
        canvasHeight: parseFloat(document.getElementById('canvasHeight').value),
        canvasPadding: document.getElementById('canvasPadding').value,
        canvasZoom: parseFloat(document.getElementById('canvasZoom').value),
        showBoundingBox: document.getElementById('showBoundingBox').checked,
        enableWordWrap: document.getElementById('enableWordWrap').checked,
    };
}

function applySettingsToUI(settingsToLoad) {
    for (const key in settingsToLoad) {
        const input = document.getElementById(key);
        if (input) {
            if (input.type === 'checkbox') input.checked = settingsToLoad[key];
            else input.value = settingsToLoad[key];
        }
    }
}

function captureCurrentRuneMap() {
    // Crucial: Creates a deep clone of the global runeMap object
    return JSON.parse(JSON.stringify(runeMap));
}

function applyRuneMap(savedMap) {
    // 1. Clear the current global map (essential for a clean load)
    for (const key in runeMap) {
        if (runeMap.hasOwnProperty(key)) delete runeMap[key];
    }
    // 2. Load the saved map data into the global runeMap
    Object.assign(runeMap, savedMap);
    initializeEditorUI();
    // 4. Redraw the canvas
    presetDrawCallback();
}

// --- 3. CORE ACTION HANDLERS ---

function handleSavePreset(key, nameInputId) {
    let name;
    let data;

    if (key === TEXT_PRESETS_KEY) {
        data = GetTextInput().trim();
        if (!data) return showNotification("Cannot save an empty text input.", true);
        name = generateTextPresetName(data);
    } else {
        const nameInput = document.getElementById(nameInputId);
        name = nameInput.value.trim();
        if (!name) return showNotification("Please enter a name.", true);
        if (key === SETTINGS_PRESETS_KEY) {
          data = captureCurrentSettings();
        } else if (key === RUNE_SETS_KEY) {
          data = captureCurrentRuneMap();
        }
    }

    const presets = getPresets(key);
    const isNewPreset = !presets.hasOwnProperty(name);

    presets[name] = data;
    savePresets(key, presets);
    // We simulate an event object to call handleLoadPreset directly.
    const fakeEvent = { target: { dataset: { presetName: name } } };
    handleLoadPreset(fakeEvent, key);// Provide appropriate notification

    if (isNewPreset) {
        showNotification(`"${name}" preset created!`);
    } else {
        showNotification(`"${name}" preset updated!`);
    }

    renderAllPresets();
}

function handleLoadPreset(event, key) {
    const name = event.target.dataset.presetName;
    const presets = getPresets(key);
    const dataToLoad = presets[name];

    if (dataToLoad === undefined) return;

    // Find the specific type object to update its state
    const type = presetTypes.find(t => t.key === key);

    if (key === TEXT_PRESETS_KEY) {
        SetTextInput(dataToLoad);
    } else if (key === RUNE_SETS_KEY) {
        applyRuneMap(dataToLoad);
        const nameInput = document.getElementById(type.nameInputId);
        if (nameInput) nameInput.value = name;
    } else {
        applySettingsToUI(dataToLoad);
        const nameInput = document.getElementById(type.nameInputId);
        if (nameInput) nameInput.value = name;
    }
    type.activePreset = name;

    saveActiveWorkspace();
    renderAllPresets();
    presetDrawCallback();
}

function handleDeletePreset(event, key) {
    const deleteControls = event.target.closest('div');
    const name = deleteControls.dataset.presetName;

    // Find the preset type object
    const type = presetTypes.find(t => t.key === key);

    // Clear active state if deleted
    if (name === type.activePreset) {
        type.activePreset = null;
    }

    const presets = getPresets(key);
    delete presets[name];
    savePresets(key, presets);

    showNotification(`Preset "${name}" deleted.`);

    renderAllPresets();
}

function toggleDeleteConfirm(event) {
    const deleteBtn = event.target;
    const deleteControls = deleteBtn.closest('div');
    const confirmBtn = deleteControls.querySelector('.delete-confirm-btn');

    if (confirmBtn.style.display === 'none') {
        confirmBtn.style.display = 'block';
        deleteBtn.style.display = 'none';
    } else {
        confirmBtn.style.display = 'none';
        deleteBtn.style.display = 'block';
    }
}

function handleExport(key) {
    const presets = getPresets(key);

    if (Object.keys(presets).length === 0) {
        showNotification("No presets of this type to export.", true);
        return;
    }
    const formattedData = JSON.stringify(presets, null, 4);

    navigator.clipboard.writeText(formattedData).then(() => {
        showNotification(`${key} JSON copied to clipboard!`);
    }).catch(err => {
        console.error('Could not copy text: ', err);
        showNotification('Could not copy data. See console for data to copy manually.', true);
    });

}

// --- 4. RENDERER (Centralized) ---

/**
 * Single function to render either the Text or Settings preset lists.
 */
function renderPresetSection(type) {
    const activePresetName = type.activePreset; // READ STATE DIRECTLY FROM OBJECT
    const container = document.getElementById(type.containerId);

    const presets = getPresets(type.key);
    container.innerHTML = '';
    const names = Object.keys(presets);

    if (names.length === 0) {
        container.innerHTML = `<p style="font-size: small; color: #888; margin: 0;">No presets saved.</p>`;
        return;
    }

    names.forEach(name => {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.gap = '5px';
        wrapper.style.marginBottom = '2px';

        // 1. Load Button
        const loadBtn = document.createElement('button');
        loadBtn.textContent = name;
        loadBtn.dataset.presetName = name;
        loadBtn.style.flexGrow = '1';
        loadBtn.style.padding = '3px 5px';
        loadBtn.style.textAlign = 'left';
        loadBtn.style.borderWidth = '1px';

        if (name === activePresetName) {
            loadBtn.style.backgroundColor = ACTIVE_HIGHLIGHT_COLOR;
        }

        loadBtn.addEventListener('click', (e) => handleLoadPreset(e, type.key));

        // 2. Delete Controls Container
        const deleteControls = document.createElement('div');
        deleteControls.style.display = 'flex';
        deleteControls.style.gap = '5px';
        deleteControls.dataset.presetName = name;

        // 3. Delete Button (X) - Toggler
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'X';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.addEventListener('click', toggleDeleteConfirm);
        deleteControls.appendChild(deleteBtn);

        // 4. Confirm Button - Final Deleter
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '?';
        confirmBtn.style.display = 'none';
        confirmBtn.classList.add('delete-confirm-btn');
        confirmBtn.addEventListener('click', (e) => handleDeletePreset(e, type.key));
        deleteControls.appendChild(confirmBtn);

        wrapper.appendChild(loadBtn);
        wrapper.appendChild(deleteControls);
        container.appendChild(wrapper);
    });
}


// --- 5. EXPOSED RENDER FUNCTIONS ---

function renderAllPresets() {
    presetTypes.forEach(type => renderPresetSection(type));
}


// --- 6. PUBLIC SETUP ENTRY POINT ---

window.setupPresetManager = function(getTextInput, setTextInput, redrawCanvas) {
    // 1. Assign Callbacks
    GetTextInput = getTextInput;
    SetTextInput = setTextInput;
    presetDrawCallback = redrawCanvas;

    // 3. Attach Event Listeners
    presetTypes.forEach(type => {
        const saveBtn = document.getElementById(type.saveBtnId);
        if (saveBtn) {
            // Pass the key and the name input ID for generalized saving
            saveBtn.addEventListener('click', () => handleSavePreset(type.key, type.nameInputId));
        }
    });

    const exportBtn = document.getElementById('exportSettingsBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => handleExport(SETTINGS_PRESETS_KEY));
    }

    const exportTextBtn = document.getElementById('exportTextPresetsBtn');
    if (exportTextBtn) {
        exportTextBtn.addEventListener('click', () => handleExport(TEXT_PRESETS_KEY));
    }

    // 4. Initial Render
    renderAllPresets();
};
