
// --- Global Editor State (Used only within this file) ---
let ActiveRuneCode = '';
let ActiveSegmentData = []; // COPY of the runeMap definition we are actively editing
let ActiveSegmentIndex = -1;
let drawRunesCallback = null;
let segmentClipboard = null;

// Components used for dynamic UI updates
const RUNE_SELECTOR_CONTAINER = document.getElementById('rune-selector-buttons');
const SEGMENT_LIST_CONTAINER = document.getElementById('component-list');
const PROPERTIES_CONTAINER = document.getElementById('property-inputs');
const COPY_BUTTON = document.getElementById('copy-component-btn');
const PASTE_BUTTON = document.getElementById('paste-component-btn');

// Properties required for each segment and their input type
const SEGMENT_PROPERTIES = {
    start: { label: 'Start Point', type: 'select', options: ['TL', 'TR', 'BL', 'BR', 'C'] },
    length: { label: 'Length (px, x, %)', type: 'text' },
    direction: { label: 'Direction (°)', type: 'number' },
    xOff: { label: 'X Offset (px, x, %)', type: 'text' },
    yOff: { label: 'Y Offset (px, x, %)', type: 'text' },
};

// Helper array for corner button labels (Index corresponds to corner position)
const CORNER_LABELS = ['0', '1', '2', '3'];

// --- 1. INITIALIZATION ---

window.setupRuneEditor = function(map, drawCallback) {
    window.runeMap = map;
    drawRunesCallback = drawCallback;

    initializeEditorUI();

    document.getElementById('add-component-btn').addEventListener('click', addNewSegment);
    document.getElementById('runeset-export-btn').addEventListener('click', () => handleExport(RUNE_SETS_KEY));
    document.getElementById('copy-component-btn').addEventListener('click', copySegment);
    document.getElementById('paste-component-btn').addEventListener('click', pasteSegment);

    // Initial load for rune 'A'
    ActiveRuneCode = 'A';

    const initialBtn = RUNE_SELECTOR_CONTAINER.querySelector(`[data-rune-code="A"]`);
    if (initialBtn) {
        initialBtn.style.backgroundColor = '#fcc6b3';
        loadActiveRuneData('A');
    }
};

function initializeEditorUI() {
    const runeCodes = Object.keys(runeMap);

    const fragment = document.createDocumentFragment();

    runeCodes.forEach(code => {
        if (code === 'PLACEHOLDER') {
            return;
        }
        const btn = document.createElement('button');
        btn.textContent = code;
        btn.classList.add('rune-select-btn');

        btn.style.padding = '5px 8px';
        btn.style.border = '1px solid #ccc';
        btn.style.cursor = 'pointer';

        btn.dataset.runeCode = code;
        btn.addEventListener('click', handleRuneSelectionChange);
        fragment.appendChild(btn);
    });

    RUNE_SELECTOR_CONTAINER.innerHTML = '';
    RUNE_SELECTOR_CONTAINER.appendChild(fragment);
}

// --- 2. STATE MANAGEMENT & SYNCHRONIZATION ---

function loadActiveRuneData(code) {
    ActiveRuneCode = code;

    const definition = runeMap[ActiveRuneCode];

    if (Array.isArray(definition)) {
        ActiveSegmentData = definition.map(seg => ({ ...seg }));

        document.getElementById('add-component-btn').disabled = false;

    } else {
        ActiveSegmentData = null;
        ActiveSegmentIndex = -1;
        SEGMENT_LIST_CONTAINER.innerHTML = `<p style="color:red; font-weight:bold;">Cannot edit special character: ${ActiveRuneCode}.</p>`;
        PROPERTIES_CONTAINER.innerHTML = '';
        document.getElementById('add-component-btn').disabled = true;
        COPY_BUTTON.disabled = true;
        PASTE_BUTTON.disabled = true;
        return;
    }

    ActiveSegmentIndex = ActiveSegmentData.length > 0 ? 0 : -1;

    renderSegmentList();
    renderSegmentProperties();
    updateActionButtons();
    drawRunesCallback();
}

function handleRuneSelectionChange(event) {
    const newRuneCode = event.target.dataset.runeCode;
    if (!newRuneCode || newRuneCode === ActiveRuneCode) return;

    document.querySelectorAll('.rune-select-btn').forEach(btn => {
        btn.style.backgroundColor = '#f5f5f5';
        btn.style.fontWeight = 'normal';
    });
    event.target.style.backgroundColor = '#fcc6b3';
    event.target.style.fontWeight = 'bold';

    loadActiveRuneData(newRuneCode);
}

function handlePropertyChange(event) {
    if (ActiveSegmentIndex === -1) return;

    const property = event.target.dataset.property;
    let value = event.target.value;

    if (SEGMENT_PROPERTIES[property].type === 'number') {
        value = parseFloat(value);
    }

    ActiveSegmentData[ActiveSegmentIndex][property] = value;

    runeMap[ActiveRuneCode] = ActiveSegmentData.map(seg => ({ ...seg }));

    drawRunesCallback();
    renderSegmentList(); // Update list display text
}

function updateActionButtons() {
    COPY_BUTTON.disabled = ActiveSegmentIndex === -1;

    PASTE_BUTTON.disabled = !segmentClipboard || !Array.isArray(ActiveSegmentData);

    if (segmentClipboard) {
        PASTE_BUTTON.textContent = `Paste [${segmentClipboard.start} ${segmentClipboard.direction}° ${segmentClipboard.length}]`;
    } else {
        PASTE_BUTTON.textContent = `Paste`;
    }
}

// --- 3. RENDERING FUNCTIONS ---

function renderSegmentList() {
    SEGMENT_LIST_CONTAINER.innerHTML = '';

    if (!Array.isArray(ActiveSegmentData)) return;

    ActiveSegmentData.forEach((segment, index) => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '5px';
        wrapper.style.display = 'flex';
        wrapper.style.gap = '5px';
        wrapper.style.alignItems = 'center';

        const btn = document.createElement('button');
        btn.textContent = `${index + 1} [${segment.start} ${segment.direction}° ${segment.length}]`;
        btn.classList.add('segment-select-btn');
        btn.style.flexGrow = '1';
        btn.style.padding = '5px';
        btn.dataset.index = index;

        if (index === ActiveSegmentIndex) {
            btn.classList.add('selected');
        }

        btn.addEventListener('click', handleSegmentSelection);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'X';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.style.marginLeft = '5px';
        deleteBtn.dataset.index = index;
        deleteBtn.addEventListener('click', deleteSegment);

        wrapper.appendChild(btn);
        wrapper.appendChild(deleteBtn);
        SEGMENT_LIST_CONTAINER.appendChild(wrapper);
    });
}

function renderSegmentProperties() {
    PROPERTIES_CONTAINER.innerHTML = '';

    if (ActiveSegmentIndex === -1 || !Array.isArray(ActiveSegmentData)) {
        PROPERTIES_CONTAINER.innerHTML = `<p style="font-size: small; color: #888;">Select a segment above to edit its properties.</p>`;
        return;
    }

    const segment = ActiveSegmentData[ActiveSegmentIndex];

    // --- Render Standard Properties (start, length, direction, xOff, yOff) ---
    for (const prop in SEGMENT_PROPERTIES) {
        const config = SEGMENT_PROPERTIES[prop];

        const group = document.createElement('div');
        group.classList.add('control-group');

        let currentValue = segment[prop];

        const label = document.createElement('label');
        label.textContent = config.label + ':';
        label.setAttribute('for', `edit-${prop}`);

        let input;

        if (config.type === 'select') {
            input = document.createElement('select');
            config.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                if (opt === currentValue) {
                    option.selected = true;
                }
                input.appendChild(option);
            });
        } else {
            input = document.createElement('input');
            input.type = config.type;
            input.value = currentValue;
        }

        input.id = `edit-${prop}`;
        input.dataset.property = prop;
        input.addEventListener('input', handlePropertyChange);

        group.appendChild(label);
        group.appendChild(input);
        PROPERTIES_CONTAINER.appendChild(group);
    }

    // --- Render Corner Toggle Buttons ---

    const cornerHeader = document.createElement('h4');
    cornerHeader.textContent = "Corner Rounding";
    cornerHeader.style.marginTop = '15px';
    cornerHeader.style.marginBottom = '5px';
    PROPERTIES_CONTAINER.appendChild(cornerHeader);

    const cornerContainer = document.createElement('div');
    cornerContainer.style.display = 'grid';
    cornerContainer.style.gridTemplateColumns = 'repeat(4, 1fr)';
    cornerContainer.style.gap = '5px';


    for (let index = 0; index < 4; index++) {
        const isRounded = (segment.corners || []).includes(index);

        const btn = document.createElement('button');
        btn.textContent = String(index);
        btn.dataset.cornerIndex = index;

        btn.style.padding = '8px 0';
        btn.style.border = '1px solid #333';
        btn.style.cursor = 'pointer';

        if (isRounded) {
            btn.style.backgroundColor = '#fcc6b3';
            btn.style.color = '#333';
        } else {
            btn.style.backgroundColor = '#ddd';
            btn.style.color = '#666';
        }

        btn.addEventListener('click', handleCornerToggle);
        cornerContainer.appendChild(btn);
    }

    PROPERTIES_CONTAINER.appendChild(cornerContainer);
}


function handleCornerToggle(event) {
    if (ActiveSegmentIndex === -1) return;

    const btn = event.target;
    const indexToToggle = parseInt(btn.dataset.cornerIndex);
    const segment = ActiveSegmentData[ActiveSegmentIndex];

    if (!segment.corners) {
        segment.corners = [];
    }

    const currentCorners = segment.corners;
    const isCurrentlyRounded = currentCorners.includes(indexToToggle);

    if (isCurrentlyRounded) {
        segment.corners = currentCorners.filter(i => i !== indexToToggle);
        btn.style.backgroundColor = '#ddd';
        btn.style.color = '#666';
    } else {
        currentCorners.push(indexToToggle);
        currentCorners.sort((a, b) => a - b);
        btn.style.backgroundColor = '#fcc6b3';
        btn.style.color = '#333';
    }

    runeMap[ActiveRuneCode] = ActiveSegmentData.map(seg => ({ ...seg }));

    drawRunesCallback();
}

// --- 4. ACTION FUNCTIONS ---

function handleSegmentSelection(event) {
    const newIndex = parseInt(event.target.closest('div').querySelector('.segment-select-btn').dataset.index);
    if (newIndex !== ActiveSegmentIndex) {
        ActiveSegmentIndex = newIndex;
        renderSegmentList();
        renderSegmentProperties();
        drawRunesCallback();
        updateActionButtons();
    }
}

function addNewSegment() {
    if (!Array.isArray(ActiveSegmentData)) return;

    const newSegment = {
        start: 'C',
        length: '50',
        direction: 0,
        xOff: '0',
        yOff: '0',
        corners: [0, 1, 2, 3]
    };
    ActiveSegmentData.push(newSegment);
    ActiveSegmentIndex = ActiveSegmentData.length - 1;

    runeMap[ActiveRuneCode] = ActiveSegmentData.map(seg => ({ ...seg }));

    renderSegmentList();
    renderSegmentProperties();
    drawRunesCallback();
    updateActionButtons();
}

function deleteSegment(event) {
    const indexToDelete = parseInt(event.target.dataset.index);
    if (!Array.isArray(ActiveSegmentData) || indexToDelete === -1) return;

    ActiveSegmentData.splice(indexToDelete, 1);

    if (ActiveSegmentIndex === indexToDelete) {
        ActiveSegmentIndex = ActiveSegmentData.length > 0 ? 0 : -1;
    } else if (ActiveSegmentIndex > indexToDelete) {
        ActiveSegmentIndex--;
    }

    runeMap[ActiveRuneCode] = ActiveSegmentData.map(seg => ({ ...seg }));

    renderSegmentList();
    renderSegmentProperties();
    drawRunesCallback();
    updateActionButtons();
}

function copySegment() {
    if (ActiveSegmentIndex === -1 || !Array.isArray(ActiveSegmentData)) return;

    const originalSegment = ActiveSegmentData[ActiveSegmentIndex];

    // Deep copy the segment, ensuring the 'corners' array is cloned
    segmentClipboard = {
        ...originalSegment,
        corners: originalSegment.corners ? [...originalSegment.corners] : []
    };

    document.getElementById('paste-component-btn').textContent = `Paste [${segmentClipboard.start} ${segmentClipboard.direction}° ${segmentClipboard.length}]`;
    document.getElementById('paste-component-btn').disabled = false;
    updateActionButtons();
}

function pasteSegment() {
    if (!segmentClipboard || !Array.isArray(ActiveSegmentData)) return;

    const newSegment = {
        ...segmentClipboard,
        corners: segmentClipboard.corners ? [...segmentClipboard.corners] : []
    };

    const pasteIndex = ActiveSegmentData.length;

    ActiveSegmentData.splice(pasteIndex, 0, newSegment);
    ActiveSegmentIndex = pasteIndex;

    runeMap[ActiveRuneCode] = ActiveSegmentData.map(seg => ({ ...seg }));

    renderSegmentList();
    renderSegmentProperties();
    drawRunesCallback();
    updateActionButtons();
}
