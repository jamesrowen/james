
// --- 0. GLOBAL STATE AND CONSTANTS ---

const canvas = document.getElementById('runeCanvas');
const ctx = canvas.getContext('2d');
const controls = document.querySelectorAll('#controls input, #controls textarea, #top-bar input');

// UI Element References for Callbacks
const TEXT_INPUT = document.getElementById('textInput');
const NOTIFICATION_ELEMENT = document.getElementById('notification-area');
const NOTIFICATION_TIMEOUT = 3000; // 3 seconds

// Global UI Parameters
let CurRenderText = '';
let runeSize = 0;
let thickness = 0;
let cornerRadius = 0;
let canvasWidth = 0;
let canvasHeight = 5000;
let canvasPadX = 0;
let canvasPadY = 0;
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
let CurrentTab = 'generator';

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
 * Reads all values from the UI controls and updates the global parameter variables.
 */
function updateUIParams() {
    CurRenderText = TEXT_INPUT.value;
    runeSize = parseFloat(document.getElementById('runeSize').value);
    thickness = parseFloat(document.getElementById('thickness').value);
    cornerRadius = parseFloat(document.getElementById('cornerRadius').value);

    canvasWidth = parseFloat(document.getElementById('canvasWidth').value);
    canvasHeight = parseFloat(document.getElementById('canvasHeight').value); // New height read
    canvasZoom = parseFloat(document.getElementById('canvasZoom').value) || 1.0; // Renamed ID
    updateZoomLabel();
    canvasPadX = parseValue(document.getElementById('canvasPadX').value);
    canvasPadY = parseValue(document.getElementById('canvasPadY').value);

    fillColor = document.getElementById('fillColor').value;
    borderColor = document.getElementById('borderColor').value;
    borderThickness = parseFloat(document.getElementById('borderThickness').value);
    backgroundColor = document.getElementById('backgroundColor').value;
    backgroundTransparent = document.getElementById('backgroundTransparent').checked;
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

function updateZoomLabel() {
    const slider = document.getElementById('canvasZoom');
    const label = document.getElementById('zoomValueLabel');
    if (slider && label) {
        // Read the value and format it
        label.textContent = parseFloat(slider.value).toFixed(2) + 'x';
    }
}

// --- 2. DRAWING FUNCTIONS ---

function drawRunes() {
    if (Object.keys(runeMap).length === 0) {
      return;
    }
    updateUIParams();
    canvas.width = (canvasWidth + (canvasPadX * 2)) * canvasZoom;
    canvas.height = (canvasHeight + (canvasPadY * 2)) * canvasZoom;

    ctx.save();
    if (!backgroundTransparent) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.scale(canvasZoom, canvasZoom);

    // text morphing - generate two rune grids
    let runeGrid = generateRuneGrid(CurRenderText);
    let oldRuneGrid = runeGrid;
    if (CurTransitionIndex > 0) {
        oldRuneGrid = generateRuneGrid(CurAnimation.transitions[CurTransitionIndex - 1].text);
    }
    // pad grids with space characters to make them the same size
    let yMax = Math.max(runeGrid.length, oldRuneGrid.length);
    let xMax = 0;
    for (let y = 0; y < yMax; y++) {
        while (runeGrid.length < yMax) runeGrid.push([]);
        while (oldRuneGrid.length < yMax) oldRuneGrid.push([]);
        xMax = Math.max(xMax, runeGrid[y].length, oldRuneGrid[y].length);
    }
    // this loop needs final xMax value from last loop
    for (let y = 0; y < yMax; y++) {
        while (runeGrid[y].length < xMax) {
            runeGrid[y].push({
              runeChar: ' ',
              xPos: runeGrid[y].length > 0 ? (runeGrid[y][runeGrid[y].length - 1].xPos + spaceWidth + charSpacing) : canvasPadX,
              yPos: runeGrid[y].length > 0 ? runeGrid[y][runeGrid[y].length - 1].yPos : y * (runeSize + lineSpacing) + canvasPadY
            });
        }
        while (oldRuneGrid[y].length < xMax) {
            oldRuneGrid[y].push({
              runeChar: ' ',
              xPos: oldRuneGrid[y].length > 0 ? (oldRuneGrid[y][oldRuneGrid[y].length - 1].xPos + spaceWidth + charSpacing) : canvasPadX,
              yPos: oldRuneGrid[y].length > 0 ? oldRuneGrid[y][oldRuneGrid[y].length - 1].yPos : y * (runeSize + lineSpacing) + canvasPadY
            });
        }
    }

    let prog = (TransportStatus === 'Stopped' && CurrentTab !== 'animator') ? 1 : TransitionProg;
    for (let y = 0; y < yMax; y++) {
        for (let x = 0; x < xMax; x++) {
            drawRune(runeGrid[y][x], oldRuneGrid[y][x], x, y, runeGrid[y].length, runeGrid.length, prog);
        }
    }
    ctx.restore();
}

function generateRuneGrid(text) {
    let runeGrid = [[]];
    let xPos = canvasPadX;
    let yPos = canvasPadY;
    let xIndex = 0, yIndex = 0;
    const normalizedText = text.toUpperCase();
    const wrapLimit = canvasWidth + canvasPadX;
    function moveToNextLine() {
        xPos = canvasPadX;
        xIndex = 0;
        yPos += runeSize + lineSpacing;
        yIndex += 1;
        runeGrid.push([]);
    }

    if (enableWordWrap) {
        const wordList = getWordList(normalizedText);

        for (const block of wordList) {
            if (block.type === 'LINE_BREAK') {
                moveToNextLine();
                continue;
            } else if (block.type === 'SPACE') {
                runeGrid[yIndex][xIndex] = { runeChar: ' ', xPos, yPos };
                xPos += block.width;
                xIndex += 1;
                continue;
            }
            const wrappedLine = (xPos + block.width > wrapLimit && xPos !== canvasPadX);
            if (wrappedLine) {
                moveToNextLine();
            }
            if (block.type === 'WORD') {
                for (let i = 0; i < block.text.length; i++) {
                    runeGrid[yIndex][xIndex] = { runeChar: block.text[i], xPos, yPos };
                    xPos += runeSize + charSpacing;
                    xIndex += 1;
                }
            }
        }
    } else {
        // --- PATH 2: WORD WRAP DISABLED ---
        for (const char of normalizedText) {
            if (char === '\n') {
                moveToNextLine();
                continue;
            } else if (char === ' ') {
                runeGrid[yIndex][xIndex] = { runeChar: ' ', xPos, yPos };
                xPos += spaceWidth + charSpacing;
                xIndex += 1;
                continue;
            }
            // Simple Line Wrap Check
            if (xPos + runeSize > wrapLimit) {
                moveToNextLine();
            }

            runeGrid[yIndex][xIndex] = { runeChar: char, xPos, yPos };
            xPos += runeSize + charSpacing;
            xIndex += 1;
        }
    }
    return runeGrid;
}

// helper that can only be used inside drawRunes
function drawRune(newRune, oldRune, xIndex, yIndex, xSize, ySize, tranProg) {
    if (showBoundingBox) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.strokeRect(xPos, yPos, runeSize, runeSize);
    }

    let newRuneSegs = (newRune.runeChar === ' ' ? [] : runeMap[newRune.runeChar]) || runeMap['PLACEHOLDER'];
    let oldRuneSegs = (oldRune.runeChar === ' ' ? [] : runeMap[oldRune.runeChar]) || runeMap['PLACEHOLDER'];
    let runeDelay = 0;
    let spreadCalc = 0;
    if (CurTransition) {
      spreadCalc = Math.min(Math.max((CurTransition.spread / 100), .0001), 1);
      let maxDelay = 1 - spreadCalc;
      runeDelay = waveFunctions[CurTransition.waveFn](xIndex, yIndex, xSize, ySize) * maxDelay;
    }

    for (let i = 0; i < Math.max(newRuneSegs.length, oldRuneSegs.length); i++) {
        let newSeg = newRuneSegs.length > i ? newRuneSegs[i] : null;
        let oldSeg = oldRuneSegs.length > i ? oldRuneSegs[i] : null;

        let segProg = 1;
        // caclulate segment transition
        if (!(TransportStatus === 'Stopped' && CurrentTab !== 'animator')) {
            segProg = Math.min(Math.max(tranProg - runeDelay, 0) / spreadCalc, 1);
            let lastSegments = [];
            if (CurTransitionIndex > 0)
                lastSegments = CurAnimation.transitions[CurTransitionIndex - 1].segments;
            // collapse all "wing" segments to same index
            let segIndex = (i > 4) ? 4 : i;
            if (lastSegments.includes(segIndex) && CurTransition.segments.includes(segIndex)) {
                segProg = 1;
            } else if (!lastSegments.includes(segIndex) && !CurTransition.segments.includes(segIndex)) {
                segProg = 0;
            } else if (lastSegments.includes(segIndex) && !CurTransition.segments.includes(segIndex)) {
                segProg = 1 - segProg;
            }
        }

        drawRuneSegment(ctx, newSeg, oldSeg, newRune.xPos, newRune.yPos, segProg, tranProg);
    }

    // ctx.fillStyle = 'white';
    // ctx.font = "30px monospace";
    // ctx.fillText(newRune.runeChar, newRune.xPos, newRune.yPos + 20);
    // ctx.fillStyle = 'green';
    // ctx.fillText(runeDelay.toFixed(1), newRune.xPos, newRune.yPos + 60);
    // ctx.fillStyle = 'blue';
    // ctx.fillText(Math.floor(runeDelay * 100), newRune.xPos + 20, newRune.yPos + 100);
}


function drawRuneSegment(ctx, newSeg, oldSeg, runeXPos, runeYPos, segProg, tranProg) {
    let rectLength;
    let angleRad;
    let segStart;
    let radii = [0, 0, 0, 0];
    const oldRadii = [0, 0, 0, 0];

    // morph segment from old text to new text
    if (newSeg == null) {
        rectLength = lerp(parseValue(oldSeg.length), 0, tranProg, easeOutQuad) * segProg;
        angleRad = oldSeg.direction * Math.PI / 180;
        segStart = getStartPoint(oldSeg);
        oldSeg.corners.forEach(i => radii[i] = cornerRadius);
    } else if (oldSeg == null) {
        rectLength = lerp(0, parseValue(newSeg.length), tranProg, easeOutQuad) * segProg;
        angleRad = newSeg.direction * Math.PI / 180;
        segStart = getStartPoint(newSeg);
        newSeg.corners.forEach(i => radii[i] = cornerRadius);
    } else {
      rectLength = lerp(parseValue(oldSeg.length), parseValue(newSeg.length), tranProg) * segProg;
      let newRectParams = {
        direction: oldSeg.direction,
        x: getStartPoint(oldSeg).x,
        y: getStartPoint(oldSeg).y
      }
      // if new and old segments are 180 degrees apart, flip the old segment in rendering for smoother animation
      const angleDelta = Math.abs(oldSeg.direction - newSeg.direction);
      if (angleDelta > 90 && angleDelta <= 180) {
        newRectParams = getFlippedRect(newRectParams.x, newRectParams.y, oldSeg.direction, parseValue(oldSeg.length));
      }
      angleRad = interpolateShortAngle(newRectParams.direction, newSeg.direction, tranProg) * Math.PI / 180;
      segStart = {
        x: lerp(newRectParams.x, getStartPoint(newSeg).x, tranProg),
        y: lerp(newRectParams.y, getStartPoint(newSeg).y, tranProg)
      };
      for (let i = 0; i < 4; i++) {
          if (newSeg.corners.length > i) {
              radii[newSeg.corners[i]] = cornerRadius;
          }
          if (oldSeg.corners.length > i) {
              oldRadii[oldSeg.corners[i]] = cornerRadius;
          }
      }
      radii = radii.map((val, i) => Math.max(lerp(oldRadii[i], val, tranProg, easeInQuad), 0));
    }

    ctx.save();
    ctx.translate(runeXPos + segStart.x, runeYPos + segStart.y);
    ctx.rotate(angleRad);
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(0, 0, rectLength, thickness, radii);
    } else {
        ctx.rect(0, 0, rectLength, thickness);
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


/**
 * Calculates the starting coordinates for a rune segment (relative to the rune's position)
 */
function getStartPoint(segment) {
    let segStartX = 0;
    let segStartY = 0;
    switch (segment.start.toUpperCase()) {
        case 'TL': segStartX = 0; segStartY = 0; break;
        case 'CL': segStartX = 0; segStartY = runeSize / 2; break;
        case 'TR': segStartX = runeSize; segStartY = 0; break;
        case 'BL': segStartX = 0; segStartY = runeSize; break;
        case 'BR': segStartX = runeSize; segStartY = runeSize; break;
        case 'C': segStartX = runeSize / 2; segStartY = runeSize / 2; break;
        default: console.error("Invalid start point:", start);
    }
    return {
      x: segStartX + parseValue(segment.xOff),
      y: segStartY + parseValue(segment.yOff)
    };
}

function exportCanvas(mimeType) {
    const baseName = generateFilename(TEXT_INPUT.value);
    let url;
    let extension;

    if (mimeType === 'image/svg+xml') {
        const svgContent = generateSvgContent(TEXT_INPUT.value);
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
    a.download = `runetext ${baseName}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showNotification(`Image exported as ${baseName}.${extension}`);
}

// --- 3. EVENT LISTENERS ---

controls.forEach(control => {
    control.addEventListener('input', () => drawRunes());
});

// Initial draw on load
window.onload = () => {
    updateUIParams();
    setupRuneEditor();
    setupPresetManager();
    initializeWorkspace();
    setupAnimator();
    openTab('animator');
    drawRunes();


    // export button listeners
    document.querySelectorAll('.export-format-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const format = e.target.dataset.format;
            if (format == 'video/mp4') {
              exportVideoFile();
            } else {
              exportCanvas(format);
            }
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
    if (prefix.length === 0) {
        prefix = 'empty';
    }
    return `(${activePreset}) - ${prefix}`;
}

/**
 * Calculates the definition of a "flipped" rectangle that starts at the
 * OPPOSITE CORNER of the original one and draws backward, resulting in the
 * same visual shape.
 */
function getFlippedRect(x1, y1, direction, length) {
    // --- 1. Calculate the New Position (The opposite corner) ---
    const thetaRad = degToRad(direction);
    const perpThetaRad = degToRad(direction + 90); // Perpendicular direction
    // calculate offset along length and width
    const offsetX = length * Math.cos(thetaRad) + thickness * Math.cos(perpThetaRad);
    const offsetY = length * Math.sin(thetaRad) + thickness * Math.sin(perpThetaRad);

    let newDir = direction + 180;
    newDir = newDir % 360;
    if (newDir < 0) {
        newDir += 360;
    }

    return {
        x: x1 + offsetX,
        y: y1 + offsetY,
        direction: newDir
    };
}

const degToRad = (degrees) => degrees * (Math.PI / 180);
const lerp = (a, b, t, func = easeLinear) => a + (b - a) * func(t);
const easeLinear = (t) => t;
const easeInQuad = (t) => t * t;
const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function interpolateShortAngle(a, b, t) {
    let delta = b - a;
    let d = (delta + 180) % 360;
    if (d < 0) {
        d += 360;
    }
    d -= 180;
    let interpolatedAngle = a + d * t;
    let normalizedAngle = interpolatedAngle % 360;
    if (normalizedAngle < 0) {
        normalizedAngle += 360;
    }
    return normalizedAngle;
}
