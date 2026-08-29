(() => {
  const RING_CIRCUMFERENCE = 2 * Math.PI * 108; // matches r=108 in the SVG

  const modeDefaults = { work: 25, short: 5, long: 15 };
  const modeLabels = {
    work: "Time to focus",
    short: "Short break — breathe",
    long: "Long break — stretch a little",
  };

  const els = {
    timeDisplay: document.getElementById("timeDisplay"),
    sessionLabel: document.getElementById("sessionLabel"),
    ringProgress: document.querySelector(".ring-progress"),
    startBtn: document.getElementById("startBtn"),
    resetBtn: document.getElementById("resetBtn"),
    skipBtn: document.getElementById("skipBtn"),
    pomoCount: document.getElementById("pomoCount"),
    roundCount: document.getElementById("roundCount"),
    modeTabs: document.querySelectorAll(".mode-tab"),
    taskForm: document.getElementById("taskForm"),
    taskInput: document.getElementById("taskInput"),
    taskList: document.getElementById("taskList"),
    taskProgress: document.getElementById("taskProgress"),
    emptyHint: document.getElementById("emptyHint"),
    settingsToggle: document.getElementById("settingsToggle"),
    settingsPanel: document.getElementById("settingsPanel"),
    workLen: document.getElementById("workLen"),
    shortLen: document.getElementById("shortLen"),
    longLen: document.getElementById("longLen"),
    soundToggle: document.getElementById("soundToggle"),
  };

  els.ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;

  // ---------- State ----------
  let mode = "work";
  let secondsLeft = modeDefaults.work * 60;
  let totalSeconds = secondsLeft;
  let running = false;
  let tickHandle = null;
  let pomoCount = loadNumber("ff_pomoCount", 0);
  let round = loadNumber("ff_round", 1);
  let tasks = loadJSON("ff_tasks", []);

  const lens = loadJSON("ff_lengths", null);
  if (lens) {
    modeDefaults.work = lens.work;
    modeDefaults.short = lens.short;
    modeDefaults.long = lens.long;
    els.workLen.value = lens.work;
    els.shortLen.value = lens.short;
    els.longLen.value = lens.long;
  }
  const soundOn = loadJSON("ff_sound", true);
  els.soundToggle.checked = soundOn;

  secondsLeft = modeDefaults[mode] * 60;
  totalSeconds = secondsLeft;

  // ---------- Persistence helpers ----------
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  function loadNumber(key, fallback) {
    const v = loadJSON(key, fallback);
    return typeof v === "number" && !Number.isNaN(v) ? v : fallback;
  }
  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ---------- Timer rendering ----------
  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  function render() {
    els.timeDisplay.textContent = formatTime(secondsLeft);
    els.sessionLabel.textContent = modeLabels[mode];
    els.pomoCount.textContent = pomoCount;
    els.roundCount.textContent = round;
    els.startBtn.textContent = running ? "Pause" : "Start";

    const progressFraction = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
    els.ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progressFraction);

    const ringColor = mode === "work" ? "var(--accent)" : mode === "short" ? "var(--accent-2)" : "var(--accent-3)";
    els.ringProgress.style.stroke = ringColor;

    els.modeTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));

    document.title = `${formatTime(secondsLeft)} · Focus Flow`;
  }

  function setMode(newMode, { resetRunning = true } = {}) {
    mode = newMode;
    totalSeconds = modeDefaults[mode] * 60;
    secondsLeft = totalSeconds;
    if (resetRunning) {
      running = false;
      clearInterval(tickHandle);
    }
    render();
  }

  function beep() {
    if (!els.soundToggle.checked) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = mode === "work" ? 660 : 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
      setTimeout(() => ctx.close(), 700);
    } catch {
      /* audio not available, ignore */
    }
  }

  function handleSessionEnd() {
    beep();
    if (mode === "work") {
      pomoCount += 1;
      save("ff_pomoCount", pomoCount);
      if (round >= 4) {
        round = 1;
        save("ff_round", round);
        setMode("long");
      } else {
        setMode("short");
      }
    } else {
      if (mode === "short") {
        round += 1;
        save("ff_round", round);
      }
      setMode("work");
    }
  }

  function tick() {
    secondsLeft -= 1;
    if (secondsLeft <= 0) {
      secondsLeft = 0;
      render();
      clearInterval(tickHandle);
      running = false;
      handleSessionEnd();
      return;
    }
    render();
  }

  function toggleRunning() {
    running = !running;
    if (running) {
      tickHandle = setInterval(tick, 1000);
    } else {
      clearInterval(tickHandle);
    }
    render();
  }

  function resetTimer() {
    running = false;
    clearInterval(tickHandle);
    totalSeconds = modeDefaults[mode] * 60;
    secondsLeft = totalSeconds;
    render();
  }

  function skipSession() {
    running = false;
    clearInterval(tickHandle);
    handleSessionEnd();
  }

  // ---------- Tasks ----------
  function saveTasks() {
    save("ff_tasks", tasks);
  }

  function renderTasks() {
    els.taskList.innerHTML = "";
    tasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item" + (task.done ? " done" : "");

      const check = document.createElement("button");
      check.type = "button";
      check.className = "task-check";
      check.setAttribute("aria-label", "Toggle done");
      check.textContent = task.done ? "✓" : "";
      check.addEventListener("click", () => {
        task.done = !task.done;
        saveTasks();
        renderTasks();
      });

      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "task-remove";
      remove.textContent = "✕";
      remove.setAttribute("aria-label", "Remove task");
      remove.addEventListener("click", () => {
        tasks = tasks.filter((t) => t.id !== task.id);
        saveTasks();
        renderTasks();
      });

      li.append(check, text, remove);
      els.taskList.appendChild(li);
    });

    const doneCount = tasks.filter((t) => t.done).length;
    els.taskProgress.textContent = `${doneCount} / ${tasks.length} done`;
    els.emptyHint.style.display = tasks.length === 0 ? "block" : "none";
  }

  els.taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = els.taskInput.value.trim();
    if (!value) return;
    tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2), text: value, done: false });
    saveTasks();
    renderTasks();
    els.taskInput.value = "";
    els.taskInput.focus();
  });

  // ---------- Settings ----------
  els.settingsToggle.addEventListener("click", () => {
    els.settingsPanel.classList.toggle("open");
  });

  function applyLengthChange() {
    const work = Math.max(1, Math.min(120, Number(els.workLen.value) || 25));
    const short = Math.max(1, Math.min(60, Number(els.shortLen.value) || 5));
    const long = Math.max(1, Math.min(90, Number(els.longLen.value) || 15));
    modeDefaults.work = work;
    modeDefaults.short = short;
    modeDefaults.long = long;
    save("ff_lengths", { work, short, long });
    if (!running) {
      totalSeconds = modeDefaults[mode] * 60;
      secondsLeft = totalSeconds;
      render();
    }
  }

  [els.workLen, els.shortLen, els.longLen].forEach((input) => {
    input.addEventListener("change", applyLengthChange);
  });

  els.soundToggle.addEventListener("change", () => {
    save("ff_sound", els.soundToggle.checked);
  });

  // ---------- Controls ----------
  els.startBtn.addEventListener("click", toggleRunning);
  els.resetBtn.addEventListener("click", resetTimer);
  els.skipBtn.addEventListener("click", skipSession);

  els.modeTabs.forEach((tab) => {
    tab.addEventListener("click", () => setMode(tab.dataset.mode));
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && document.activeElement.tagName !== "INPUT") {
      e.preventDefault();
      toggleRunning();
    }
  });

  // ---------- Init ----------
  render();
  renderTasks();
})();
