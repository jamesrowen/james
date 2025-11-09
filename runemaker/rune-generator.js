
// --- 0. GLOBAL STATE AND CONSTANTS ---

const canvas = document.getElementById('runeCanvas');
const ctx = canvas.getContext('2d');
const controls = document.querySelectorAll('#controls input, #controls textarea, #top-bar input');

// UI Element References for Callbacks
const TEXT_INPUT = document.getElementById('textInput');
const NOTIFICATION_ELEMENT = document.getElementById('notification-area');
const NOTIFICATION_TIMEOUT = 3000; // 3 seconds

// Global UI Parameters
let text = '';
let runeSize = 0;
let thickness = 0;
let cornerRadius = 0;
let canvasWidth = 0;
let canvasHeight = 5000; // New global height
let canvasPadding = 0;
let canvasZoom = 1.0;
let fillColor = '';
let borderColor = '';
let borderThickness = 0;
let backgroundColor = '';
let showBoundingBox = true;
let enableWordWrap = true;
let charSpacing = 0;
let lineSpacing = 0;
let spaceWidth = 0;
let runeMap = {};

// --- 1. HELPER FUNCTIONS ---

/**
 * Converts a relative/absolute string value to an absolute pixel value.
 * RELIES ON GLOBAL: thickness and runeSize
 */
function parseValue(valueStr) {
    if (typeof valueStr === 'number') return valueStr;
    const str = String(valueStr).trim().toLowerCase();

    // 1. Check for Percentage ('%')
    if (str.endsWith('%')) {
        const percentage = parseFloat(str.slice(0, -1)) / 100;
        return percentage * runeSize;
    }
    // 2. Check for Absolute Pixels ('px')
    if (str.endsWith('px')) {
        const pixelValue = str.slice(0, -2);
        return parseFloat(pixelValue) || 0;
    }
    // 3. Check for Multiplier ('x')
    if (str.endsWith('x')) {
        const multiplier = parseFloat(str.slice(0, -1));
        return multiplier * thickness;
    }
    // 4. Default: Interpret as Absolute Pixel Value (e.g., '10')
    return parseFloat(str) || 0;
}

/**
 * Calculates the base pixel coordinates (Px, Py) within the runeSize x runeSize rune square
 * RELIES ON GLOBAL: runeSize
 */
function getStartPoint(start) {
    let baseX = 0;
    let baseY = 0;

    switch (start.toUpperCase()) {
        case 'TL': baseX = 0; baseY = 0; break;
        case 'TR': baseX = runeSize; baseY = 0; break;
        case 'BL': baseX = 0; baseY = runeSize; break;
        case 'BR': baseX = runeSize; baseY = runeSize; break;
        case 'C': baseX = runeSize / 2; baseY = runeSize / 2; break;
        default: console.error("Invalid start point:", start);
    }
    return { baseX, baseY };
}

/**
 * Reads all values from the UI controls and updates the global parameter variables.
 */
function updateUIParams() {
    text = TEXT_INPUT.value;
    runeSize = parseFloat(document.getElementById('runeSize').value);
    thickness = parseFloat(document.getElementById('thickness').value);
    cornerRadius = parseFloat(document.getElementById('cornerRadius').value);

    canvasWidth = parseFloat(document.getElementById('canvasWidth').value);
    canvasHeight = parseFloat(document.getElementById('canvasHeight').value); // New height read
    canvasZoom = parseFloat(document.getElementById('canvasZoom').value) || 1.0; // Renamed ID
    updateZoomLabel();
    canvasPadding = parseValue(document.getElementById('canvasPadding').value);

    fillColor = document.getElementById('fillColor').value;
    borderColor = document.getElementById('borderColor').value;
    borderThickness = parseFloat(document.getElementById('borderThickness').value);
    backgroundColor = document.getElementById('backgroundColor').value;
    showBoundingBox = document.getElementById('showBoundingBox').checked;
    enableWordWrap = document.getElementById('enableWordWrap').checked;

    charSpacing = parseValue(document.getElementById('charSpacing').value);
    lineSpacing = parseValue(document.getElementById('lineSpacing').value);
    spaceWidth = parseValue(document.getElementById('spaceWidth').value);
}

/**
 * Shows a temporary notification that slides down and then disappears.
 * @param {string} message - The message to display.
 * @param {boolean} isError - If true, displays a red background for errors.
 */
function showNotification(message, isError = false) {
    if (!NOTIFICATION_ELEMENT) return;

    // Clear any existing timeouts to prevent conflict
    clearTimeout(window._notificationTimer);

    // Set message and style
    NOTIFICATION_ELEMENT.textContent = message;
    NOTIFICATION_ELEMENT.classList.remove('error');

    if (isError) {
        NOTIFICATION_ELEMENT.classList.add('error');
    }

    // Show the notification
    NOTIFICATION_ELEMENT.classList.add('show');

    // Hide the notification after the timeout
    window._notificationTimer = setTimeout(() => {
        NOTIFICATION_ELEMENT.classList.remove('show');
    }, NOTIFICATION_TIMEOUT);
}

// --- CALLBACK FUNCTIONS FOR PRESET MANAGER ---

/** Returns the current text input content. */
function getTextInput() {
    return TEXT_INPUT.value;
}
/** Sets the text input content. */
function setTextInput(newText) {
    TEXT_INPUT.value = newText;
}

/**
 * Breaks the input text into words, spaces, and line breaks, calculating their widths.
 * RELIES ON GLOBAL: runeSize, charSpacing, spaceWidth
 * @param {string} text - The input text.
 * @returns {Array<{text: string, type: string, width: number}>} List of drawable blocks.
 */
function getWordList(text) {
    const blocks = [];
    // Regex matches: (Word characters) OR (Newline character) OR (Space character)
    const regex = /(\S+|\n|\s)/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
        const char = match[0];

        let type;
        let width = 0;

        if (char === '\n') {
            type = 'LINE_BREAK';
        } else if (char.match(/\s/)) {
            type = 'SPACE';
            width = spaceWidth + charSpacing;
        } else {
            type = 'WORD';
            // Width of the word = (Rune Size + Char Spacing) * number of characters
            const numRunes = char.length;
            width = (runeSize + charSpacing) * numRunes;
        }

        blocks.push({ text: char, type: type, width: width });
    }

    return blocks;
}

// --- 2. DRAWING FUNCTIONS ---

/**
 * Draws a single, custom-defined, rotated, and rounded rectangle segment.
 */
function drawRuneComponent(ctx, segment, currentRuneX, currentRuneY) {
    const rectLength = parseValue(segment.length);
    const xOff = parseValue(segment.xOff);
    const yOff = parseValue(segment.yOff);
    const angleRad = segment.direction * Math.PI / 180;

    const radii = [0, 0, 0, 0];
    (segment.corners || []).forEach(index => {
        if (index >= 0 && index <= 3) {
            radii[index] = cornerRadius;
        }
    });

    const { baseX, baseY } = getStartPoint(segment.start);
    const startX = baseX + xOff;
    const startY = baseY + yOff;

    ctx.save();

    ctx.translate(currentRuneX + startX, currentRuneY + startY);
    ctx.rotate(angleRad);

    const rectX = 0;
    const rectY = 0;
    const rectW = rectLength;
    const rectH = thickness;

    ctx.beginPath();

    if (ctx.roundRect) {
        ctx.roundRect(rectX, rectY, rectW, rectH, radii);
    } else {
        ctx.rect(rectX, rectY, rectW, rectH);
    }

    ctx.fillStyle = fillColor;
    ctx.fill();

    if (borderThickness > 0) {
        ctx.lineWidth = borderThickness;
        ctx.strokeStyle = borderColor;
        ctx.stroke();
    }

    ctx.restore();
}


function drawRunes() {
    updateUIParams();

    // 1. Setup Canvas
    canvas.width = (canvasWidth + (canvasPadding * 2)) * canvasZoom;
    canvas.height = canvasHeight * canvasZoom;

    ctx.save();
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(canvasZoom, canvasZoom);

    let currentX = canvasPadding;
    let currentY = canvasPadding;

    const normalizedText = text.toUpperCase();
    const wrapLimit = canvasWidth + canvasPadding;

    // --- Core Draw Loop ---

    if (enableWordWrap) {
        // --- PATH 1: WORD WRAP ENABLED (Using block/word logic) ---
        const wordList = getWordList(normalizedText);

        for (const block of wordList) {
            const blockWidth = block.width;

            if (block.type === 'LINE_BREAK') {
                currentX = canvasPadding;
                currentY += runeSize + lineSpacing;
                continue;
            }

            // Word Wrap Check (Soft Break)
            const wrappedLine = (currentX + blockWidth > wrapLimit && currentX !== canvasPadding);
            if (wrappedLine) {
                currentX = canvasPadding; // Move to next line
                currentY += runeSize + lineSpacing;
            }

            if (block.type === 'SPACE') {
                if (wrappedLine) {
                  continue;
                }
                currentX += blockWidth;
                continue;
            }

            // Draw Word Runes
            if (block.type === 'WORD') {
                for (let i = 0; i < block.text.length; i++) {
                    const char = block.text[i];
                    let runeDef = runeMap[char];

                    if (!runeDef || (Array.isArray(runeDef) && runeDef.length === 0)) {
                        runeDef = runeMap['PLACEHOLDER'];
                    }

                    if (Array.isArray(runeDef)) {
                        if (showBoundingBox) {
                            ctx.strokeStyle = 'red';
                            ctx.lineWidth = 1;
                            ctx.strokeRect(currentX, currentY, runeSize, runeSize);
                        }
                        runeDef.forEach(segment => {
                            drawRuneComponent(ctx, segment, currentX, currentY);
                        });
                    }

                    // Advance X position for the next character
                    currentX += runeSize + charSpacing;
                }
            }
        }

    } else {
        // --- PATH 2: WORD WRAP DISABLED (Character-by-character, simple line break) ---
        for (const char of normalizedText) {
            let runeDef = runeMap[char];

            if (!runeDef || (Array.isArray(runeDef) && runeDef.length === 0)) {
                runeDef = runeMap['PLACEHOLDER'];
            }

            // Handle Line Breaks and Spaces directly
            if (char === '\n' || (typeof runeDef === 'object' && runeDef.type === 'LINE_BREAK')) {
                currentX = canvasPadding;
                currentY += runeSize + lineSpacing;
                continue;
            } else if (char === ' ' || (typeof runeDef === 'object' && runeDef.type === 'SPACE')) {
                currentX += spaceWidth + charSpacing;
                continue;
            }

            // Simple Line Wrap Check (if the next character exceeds the limit)
            if (currentX + runeSize > wrapLimit) {
                currentX = canvasPadding;
                currentY += runeSize + lineSpacing;
            }

            // Draw Character
            if (Array.isArray(runeDef)) {
                if (showBoundingBox) {
                    ctx.strokeStyle = 'red';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(currentX, currentY, runeSize, runeSize);
                }
                runeDef.forEach(segment => {
                    drawRuneComponent(ctx, segment, currentX, currentY);
                });
            }

            currentX += runeSize + charSpacing;
        }
    }

    ctx.restore();
}

function exportCanvas(mimeType) {
    const baseName = generateFilename(TEXT_INPUT.value);
    let url;
    let extension;

    if (mimeType === 'image/svg+xml') {
        const svgContent = generateSvgContent();
        // Convert the XML string to a data URL
        url = 'data:image/svg+xml;charset=utf8,' + encodeURIComponent(svgContent);
        extension = 'svg';
    } else {
        // PNG/JPEG (Raster) Export Logic
        // The canvas width/height needs to be temporarily large if zoom > 1 for high-res output
        url = canvas.toDataURL(mimeType, 0.9);
        extension = mimeType.split('/')[1].replace('jpeg', 'jpg');
    }

    // Trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showNotification(`Image exported as ${baseName}.${extension}`);
}

// --- 3. EVENT LISTENERS ---

controls.forEach(control => {
    control.addEventListener('input', drawRunes);
});

// Initial draw on load
window.onload = () => {
    // 1. Initial parameter update and draw
    updateUIParams();
    drawRunes();

    if (window.setupRuneEditor) {
        setupRuneEditor(runeMap, drawRunes);
    }

    if (window.setupPresetManager) {
        setupPresetManager(getTextInput, setTextInput, drawRunes);
        initializeWorkspace();
    }

    // export button listeners
    document.querySelectorAll('.export-format-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const format = e.target.dataset.format;

            document.querySelectorAll('.export-format-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            exportCanvas(format);
        });
    });
};

function generateFilename(textContent) {
    let activePreset = presetTypes.find(t => t.key === SETTINGS_PRESETS_KEY).activePreset || '';
    // 1. Sanitize: Replace line breaks/special characters with spaces
    let cleanText = textContent.replace(/[\r\n\s]+/g, ' ').trim();
    let prefix = cleanText.substring(0, 20);
    // (remove non-alphanumeric/space)
    prefix = prefix.replace(/[^a-z0-9\s]/gi, '').trim();
    prefix = prefix.replace(/\s+/g, '_');
    if (prefix.length === 0) {
        prefix = 'empty';
    }
    return `runetext_${activePreset}_${prefix}`;
}

function updateZoomLabel() {
    const slider = document.getElementById('canvasZoom');
    const label = document.getElementById('zoomValueLabel');
    if (slider && label) {
        // Read the value and format it
        label.textContent = parseFloat(slider.value).toFixed(1) + 'x';
    }
}
