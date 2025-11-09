/**
 * Generates SVG content by running the drawing loop and translating segments to XML paths.
 * RELIES ON GLOBAL: runeMap, canvasWidth, canvasHeight, thickness, etc.
 * @returns {string} The complete SVG XML string.
 */
function generateSvgContent() {
    updateUIParams(); // Ensure all globals (padding, size, etc.) are up-to-date

    // --- 1. PRE-CALCULATE LOGICAL BOUNDS (Original Scale) ---
    const finalWidth = canvasWidth + (canvasPadding * 2);
    const finalHeight = canvasHeight; // Using fixed height for scrollable content

    let svg = `<svg width="${finalWidth}" height="${finalHeight}" viewBox="0 0 ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="100%" height="100%" fill="${backgroundColor}" />`;

    // --- 2. START DRAWING LOOP (Unscaled Coordinates) ---
    let currentX = canvasPadding;
    let currentY = canvasPadding;

    const normalizedText = text.toUpperCase();
    const wrapLimit = canvasWidth + canvasPadding;

    for (const char of normalizedText) {
        let runeDef = runeMap[char];

        if (!runeDef || (Array.isArray(runeDef) && runeDef.length === 0)) {
            runeDef = runeMap['PLACEHOLDER'];
        }

        if (typeof runeDef === 'object' && runeDef.type) {
            if (runeDef.type === 'LINE_BREAK') {
                currentX = canvasPadding;
                currentY += runeSize + lineSpacing;
                continue;
            } else if (runeDef.type === 'SPACE') {
                currentX += spaceWidth + charSpacing;
                continue;
            }
        }

        // Word Wrap Check (Soft Break)
        const blockWidth = (runeSize + charSpacing); // Approximate width for individual char check
        if (currentX + blockWidth > wrapLimit) {
            currentX = canvasPadding;
            currentY += runeSize + lineSpacing;
        }

        // --- 3. Generate SVG Path for each Segment ---
        if (Array.isArray(runeDef)) {
            runeDef.forEach(segment => {
                const rectLength = parseValue(segment.length);
                const xOff = parseValue(segment.xOff);
                const yOff = parseValue(segment.yOff);
                const angleDeg = segment.direction;

                const { baseX, baseY } = getStartPoint(segment.start);
                const startX = currentX + baseX + xOff;
                const startY = currentY + baseY + yOff;

                const radiiIndices = segment.corners || [];

                // Get the SVG path data for the unrotated rectangle
                const pathData = getSvgPathData(rectLength, thickness, cornerRadius, radiiIndices);

                // Assemble the transformation matrix (Translation + Rotation)
                // SVG rotation is around a point (centerX, centerY) relative to the translated origin.
                const transform = `translate(${startX}, ${startY}) rotate(${angleDeg} 0 0)`;

                // Assemble the final SVG path element
                svg += `
                <path
                    d="${pathData}"
                    fill="${fillColor}"
                    stroke="${borderColor}"
                    stroke-width="${borderThickness}"
                    transform="${transform}"
                />`;
            });
        }

        // Advance X position
        currentX += runeSize + charSpacing;
    }

    svg += `</svg>`;
    return svg;
}

/**
 * Calculates the SVG Path Data string (d="...") for a single rounded rectangle.
 * @param {number} w - Rectangle width (rectLength).
 * @param {number} h - Rectangle height (thickness).
 * @param {number} r - Corner radius (global cornerRadius).
 * @param {array} corners - [0, 1, 2, 3] indices of rounded corners.
 * @returns {string} The SVG path data string.
 */
function getSvgPathData(w, h, r, corners) {
    if (w <= 0 || h <= 0) return '';
    const tl = corners.includes(0) ? r : 0; // Top-Left
    const tr = corners.includes(1) ? r : 0; // Top-Right
    const br = corners.includes(2) ? r : 0; // Bottom-Right
    const bl = corners.includes(3) ? r : 0; // Bottom-Left

    // Ensure radius doesn't exceed half the smallest dimension
    const maxR = Math.min(w / 2, h / 2);
    const rad = (r) => Math.min(r, maxR);

    // Apply limit to radii
    const rtl = rad(tl), rtr = rad(tr), rbr = rad(br), rbl = rad(bl);

    // SVG Path Commands: M=Move, L=Line, A=Arc (rx ry angle large-arc-flag sweep-flag x y)
    let d = `M ${rtl},0`; // Start just after the top-left curve

    // Top edge, then Top-Right arc
    d += `L ${w - rtr},0`;
    d += `A ${rtr} ${rtr} 0 0 1 ${w},${rtr}`;

    // Right edge, then Bottom-Right arc
    d += `L ${w},${h - rbr}`;
    d += `A ${rbr} ${rbr} 0 0 1 ${w - rbr},${h}`;

    // Bottom edge, then Bottom-Left arc
    d += `L ${rbl},${h}`;
    d += `A ${rbl} ${rbl} 0 0 1 0,${h - rbl}`;

    // Left edge, then Top-Left arc
    d += `L 0,${rtl}`;
    d += `A ${rtl} ${rtl} 0 0 1 ${rtl},0`;

    d += 'Z';
    return d;
}
