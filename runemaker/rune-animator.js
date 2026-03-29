// rune-animator.js

// --- Global State ---
let CurAnimation;
let CurTransition;
let CurTransitionIndex = 0;
let TransitionProg = 0;
let HoldingFrame = false;
let HoldElapsed = 0;
// 0 = stopped, 1 = playing, 2 = paused
let TransportStatus = 'Stopped';
let OldTimestamp = 0;

// --- VIDEO RECORDING STATE ---
let MediaRecorderInstance = null;
let RecordedChunks = [];
let IsRecording = false;

// --- UI Element References ---
const TRANSITION_LIST = document.getElementById('transition-list');
const INSERT_TRANSITION_BTN = document.getElementById('insert-transition-button');
const PLAY_BTN = document.getElementById('play-anim-btn');
const STOP_BTN = document.getElementById('stop-anim-btn');
const RECORD_BTN = document.getElementById('record-btn');
const TRANSPORT_STATUS = document.getElementById('transport-status');
const PROGRESS_BAR = document.getElementById('progress-bar');
const PROGRESS_TEXT = document.getElementById('progress-text');


// --- 1. SETUP AND INITIALIZATION ---

function setupAnimator() {

    // this is now done in initializeWorkspace -> handleLoadPreset
    // CurAnimation = {
    //   settings: getPresets(SETTINGS_PRESETS_KEY)[0],
    //   transitions: [
    //     { duration: 2, holdTime: 1, spread: 3, gradient: 0, waveFn: "btt", segments: [0], text: "In a future where desert winds carry the pulse of electronic beats,dead ringer stands as a beacon of community and connection" },
    //     { duration: 2, holdTime: 0, spread: 2, gradient: 0, waveFn: "rtl", segments: [0, 1], text: "In a future where desert winds carry the pulse of electronic beats,dead ringer stands as a beacon of community and connection"  },
    //     { duration: 5, holdTime: 0, spread: 1, gradient: 0, waveFn: "cascade down", segments: [0, 1, 2, 3, 4], text: "In a future where desert winds carry the pulse of electronic beats,dead ringer stands as a beacon of community and connection" },
    //     { duration: 2, holdTime: 0, spread: 9, gradient: 0, waveFn: "diamond", segments: [0, 1, 2, 3, 4], text: "In a future where desert winds carry the pulse of electronic beats,dead ringer stands as a beacon of community and connection"  },
    //     { duration: 2, holdTime: 0, spread: 5, gradient: 0, waveFn: "diagonal skew", segments: [1, 2, 3, 4], text: "In a future where desert winds carry the pulse of electronic beats,dead ringer stands as a beacon of community and connection"  },
    //     { duration: 2, holdTime: 0, spread: 3, gradient: 0, waveFn: "center-circle", segments: [4], text: "In a future where desert winds carry the pulse of electronic beats,dead ringer stands as a beacon of community and connection"  }
    //   ]
    // };

    selectTransition(0);
    renderTransitionList();

    PLAY_BTN.addEventListener('click', () => startAnimation(false));
    STOP_BTN.addEventListener('click', stopAnimation);
    INSERT_TRANSITION_BTN.addEventListener('click', insertTransition);
    RECORD_BTN.addEventListener('click', toggleRecording);
};

// --- 2. TRANSITION MANAGEMENT ---

function insertTransition() {
    const keys = Object.keys(waveFunctions);
    const newTran = structuredClone(CurTransition);
    newTran.waveFn = keys[Math.floor(Math.random() * keys.length)];
    CurAnimation.transitions.splice(CurTransitionIndex + 1, 0, newTran);
    selectTransition(CurTransitionIndex + 1);
    renderTransitionList();
}

function deleteTransition(index) {
    if (CurAnimation.transitions.length > 1) {
        CurAnimation.transitions.splice(index, 1);

        let newIndex = CurTransitionIndex;
        if (CurTransitionIndex === index) {
          if (CurTransitionIndex === CurAnimation.transitions.length - 1) {
            newIndex--;
          }
        } else if (CurTransitionIndex > index) {
            newIndex--;
        }
        selectTransition(newIndex);
        renderTransitionList();
    } else {
        showNotification("Cannot delete the last sequence item.", true);
    }
}

function selectTransition(index) {
    CurTransitionIndex = index;
    TransitionProg = 0;
    HoldingFrame = false;
    HoldElapsed = 0;
    CurTransition = CurAnimation.transitions[index];
    CurRenderText = CurTransition.text;
    TEXT_INPUT.value = CurTransition.text;
    let transitionItems = document.querySelectorAll('.transition-item');
    transitionItems.forEach(item => item.classList.remove('active'));
    if (transitionItems.length > index) transitionItems[index].classList.add('active');
    if (TransportStatus !== 'Playing') {
      drawRunes();
    }
}

// --- 2. HANDLE INPUT ---

function handleTransitionInput(event, index, field) {
    if (CurAnimation.transitions[index][field] === event.target.value)
      return;

    CurAnimation.transitions[index][field] = event.target.value;
    TransitionProg = 0;
    HoldingFrame = false;
    HoldElapsed = 0;
    updateProgressDisplay();
    drawRunes();
}

function handleSegmentToggle(event, transIndex, field) {
    const segmentIndex = parseInt(event.target.dataset.segIndex);
    const transition = CurAnimation.transitions[transIndex];
    const segmentArray = transition[field];

    if (segmentArray.includes(segmentIndex)) {
        transition[field] = segmentArray.filter(i => i !== segmentIndex);
    } else {
        segmentArray.push(segmentIndex);
        segmentArray.sort((a, b) => a - b); // Keep it sorted for consistency
    }
    renderTransitionList();
}

// --- 4. ANIMATION CONTROL ---
/**
 * Updates the progress bar and text display.
 */
function updateProgressDisplay() {
    let totalDuration = CurAnimation.transitions.reduce(
      (acc, tran) => acc + parseFloat(tran.duration) + parseFloat(tran.holdTime), 0.0
    );
    let completedTranElapsed = CurAnimation.transitions.reduce(
      (acc, tran, i) => (i < CurTransitionIndex) ? acc + parseFloat(tran.duration) + parseFloat(tran.holdTime) : acc, 0
    );
    let currentTranElapsed = TransitionProg * parseFloat(CurTransition.duration) + HoldElapsed;
    let statusText = `${parseFloat(completedTranElapsed + currentTranElapsed).toFixed(1)}s / ${parseFloat(totalDuration).toFixed(1)}s ` +
        `[${CurTransitionIndex + 1} of ${CurAnimation.transitions.length}]`;

    PROGRESS_BAR.style.left = `${(completedTranElapsed + currentTranElapsed) / totalDuration * 100}%`;
    TRANSPORT_STATUS.textContent = TransportStatus;
    PROGRESS_TEXT.textContent = statusText;
}

function startAnimation(isRecordingMode = false) {
    if (!isRecordingMode) {
        if (TransportStatus === 'Playing') {
            TransportStatus = 'Paused';
            PLAY_BTN.innerText = '▶ Play';
            STOP_BTN.disabled = false;
            INSERT_TRANSITION_BTN.disabled = false;
            updateProgressDisplay();
            return;
        }
    }

    updateUIParams();

    // Set status based on call context
    if (TransportStatus !== 'Recording') {
        TransportStatus = 'Playing';
        PLAY_BTN.innerText = '⏸ Pause';
        STOP_BTN.disabled = false;
        INSERT_TRANSITION_BTN.disabled = true;
    }

    CurRenderText = CurTransition.text;
    TEXT_INPUT.value = CurTransition.text;
    OldTimestamp = performance.now();

    const frame = (curTime) => {
        if (TransportStatus !== 'Playing' && TransportStatus !== 'Recording') {
             return;
        }

        let delta = curTime - OldTimestamp;
        OldTimestamp = curTime;
        TransitionProg += (delta / Math.max(CurTransition.duration * 1000, 10));

        if (TransitionProg >= 1) {
            if (!HoldingFrame) {
                HoldingFrame = true;
                HoldElapsed = 0;
                TransitionProg = 1;
            } else {
                HoldElapsed += delta / 1000;
                TransitionProg = 1;
                if (HoldElapsed >= CurTransition.holdTime) {
                    HoldingFrame = false;
                    HoldElapsed = 0;
                    TransitionProg = 0;

                    CurTransitionIndex++;
                    if (CurTransitionIndex >= CurAnimation.transitions.length) {
                        CurTransitionIndex = 0;
                    }
                    selectTransition(CurTransitionIndex);
                }
            }
        }

        drawRunes();
        updateProgressDisplay();
        window.requestAnimationFrame(frame);
    };

    window.requestAnimationFrame(frame);
}

function stopAnimation() {
    TransportStatus = 'Stopped';
    PLAY_BTN.innerText = '▶ Play';
    STOP_BTN.disabled = true;
    INSERT_TRANSITION_BTN.disabled = false;

    CurTransitionIndex = 0;
    CurTransition = CurAnimation.transitions[0];
    TransitionProg = 0;
    HoldingFrame = false;
    HoldElapsed = 0;
    updateProgressDisplay();
    drawRunes();
}


// --- 5. RENDERER ---

function renderTransitionList() {
    TRANSITION_LIST.innerHTML = '';
    CurAnimation.transitions.forEach((tran, index) => {
        const div = document.createElement('div');
        div.classList.add('transition-item');
        if (index === CurTransitionIndex) {
            div.classList.add('active');
        }
        const waveSelect = document.createElement('select');
        waveSelect.dataset.index = index;
        waveSelect.dataset.field = "waveFn";

        Object.entries(waveFunctions).forEach(([name, fn]) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            if (name === tran.waveFn) {
                option.selected = true;
            }
            waveSelect.appendChild(option);
        });

        const content = `
            <div style="flex-grow: 1; min-width: 150px; cursor: pointer;" data-index="${index}">
                <textarea rows="5" data-index="${index}" data-field="text">${tran.text}</textarea>

                <div class="transition-input-grid">
                    <label>Duration:</label>
                    <label>Hold:</label>
                    <label>Spread:</label>
                    <label>Gradient:</label>
                    <input type="number" data-index="${index}" data-field="duration" value="${tran.duration}" step=".5">
                    <input type="number" data-index="${index}" data-field="holdTime" value="${tran.holdTime}" step=".1">
                    <input type="number" data-index="${index}" data-field="spread" value="${tran.spread}" step="1">
                    <input type="number" data-index="${index}" data-field="gradient" value="${tran.gradient}" step=".01">
                </div>

                <div class="control-group">
                    <label>Wave Shape:</label>
                    <div id="wave-select-placeholder-${index}"></div>
                    <label>Segments:</label>
                    <div class="segment-toggle-group" data-index="${index}" data-field="segments">
                        ${generateSegmentToggles(tran.segments)}
                    </div>
                </div>
            </div>
            <button class="delete-btn" data-index="${index}">X</button>
        `;
        div.innerHTML = content;
        div.querySelector(`#wave-select-placeholder-${index}`).replaceWith(waveSelect);

        // Attach listeners
        div.querySelector('div').addEventListener('click', (e) => {
            selectTransition(index);
        });

        div.querySelectorAll('textarea, input, select').forEach(input => {
            input.addEventListener('input', (e) => {
                handleTransitionInput(e, index, e.target.dataset.field);
            });
        });

        div.querySelectorAll('.toggle-btn').forEach(btn => {
            const outerDiv = btn.closest('.segment-toggle-group');
            btn.addEventListener('click', (e) => {
                // Prevent the click event from bubbling up and triggering selectTransition
                e.stopPropagation();
                handleSegmentToggle(e, outerDiv.dataset.index, outerDiv.dataset.field);
            });
        });
        div.querySelector('.delete-btn').addEventListener('click', () => deleteTransition(index));

        TRANSITION_LIST.appendChild(div);

        updateProgressDisplay();
    });
}

function generateSegmentToggles(data) {
    let html = "";
    ['1', '2', '3', '4', '>'].forEach((label, i) => {
        const activeClass = (data || []).includes(i) ? 'active' : '';
        html += `<button class="toggle-btn ${activeClass}" data-seg-index="${i}">${label}</button>`;
    });
    return html;
}

/**
 * Global keydown handler to toggle animation with the spacebar.
 * It ensures the animation only toggles if the user isn't currently typing in an input field.
 */
function handleSpacebarToggle(event) {
    if (event.code === 'Space') {
        const isTyping = document.activeElement.tagName === 'TEXTAREA';
        if (!isTyping) {
            // Prevent default spacebar action (like scrolling)
            event.preventDefault();
            startAnimation();
        }
    }
}
function toggleRecording() {
    if (!window.MediaRecorder) {
        showNotification("MediaRecorder API not supported in this browser.", true);
        return;
    }

    if (IsRecording) {
        // --- STOP RECORDING ---
        MediaRecorderInstance.stop();
        IsRecording = false;
        RECORD_BTN.innerText = '⏺ Record';
        // Re-enable UI elements
        PLAY_BTN.disabled = false;
        STOP_BTN.disabled = false;
        INSERT_TRANSITION_BTN.disabled = false;

        // Stop the animation if it was running solely for recording
        if (TransportStatus === 'Recording') {
            stopAnimation();
            TransportStatus = 'Stopped';
        }

        showNotification("Recording stopped. Processing video...");

    } else {
        // --- START RECORDING ---
        try {
            const stream = canvas.captureStream(30);
            RecordedChunks = [];
            let mimeType = 'video/webm; codecs="vp9"';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm';
            }
            MediaRecorderInstance = new MediaRecorder(stream, { mimeType });
            // 3. Setup data handlers
            MediaRecorderInstance.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    RecordedChunks.push(event.data);
                }
            };
            MediaRecorderInstance.onstop = exportVideoFile;
            // 4. Start recording and animation
            MediaRecorderInstance.start();
            IsRecording = true;
            RECORD_BTN.innerText = '⏹ Stop';
            TransportStatus = 'Recording';

            // Disable UI elements that modify the animation during recording
            PLAY_BTN.disabled = true;
            STOP_BTN.disabled = true;
            INSERT_TRANSITION_BTN.disabled = true;

            // Start animation if it is not already playing
            if (TransportStatus !== 'Playing') {
                startAnimation(true); // Start animation in record mode
            }
            showNotification("Recording started (30 FPS)...");

        } catch (e) {
            console.error("Error starting MediaRecorder:", e);
            showNotification("Failed to start recording. Check console.", true);
            IsRecording = false;
        }
    }
}

function exportVideoFile() {
    if (RecordedChunks.length === 0) {
        showNotification("No video data recorded.", true);
        return;
    }
    // Create a Blob from the chunks (assumes mimeType was set to 'video/webm')
    const blob = new Blob(RecordedChunks, { type: MediaRecorderInstance.mimeType });
    const url = URL.createObjectURL(blob);
    const baseName = generateFilename(document.getElementById('textInput').value);
    const extension = MediaRecorderInstance.mimeType.includes('mp4') ? 'mp4' : 'webm';

    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `runetext ${baseName}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    URL.revokeObjectURL(url);
    RecordedChunks = [];
    showNotification(`Video exported as ${baseName}.${extension}`);
}

// --- 6. EVENT LISTENERS ---

document.addEventListener('keydown', handleSpacebarToggle);
