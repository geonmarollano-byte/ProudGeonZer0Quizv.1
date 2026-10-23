"use strict";

/* ================= SCREEN ELEMENTS ================= */
const dialog = document.querySelector("#coming-soon");
const welcomeScreen = document.querySelector("#welcome-screen");
const homeScreen = document.querySelector("#home-screen");
const fullscreenButtons = document.querySelectorAll(".fullscreen");
const fullscreenNotes = [
  document.querySelector("#welcome-fullscreen-note"),
  document.querySelector("#home-fullscreen-note"),
];

/* ================= FULLSCREEN ================= */
function setFullscreenNotes(message) {
  fullscreenNotes.forEach((note) => {
    if (note) note.textContent = message;
  });
}
async function enterFullscreen() {
  if (
    !document.fullscreenEnabled ||
    !document.documentElement.requestFullscreen
  ) {
    setFullscreenNotes(
      "Fullscreen is unavailable in this browser. The screen still fits your display.",
    );
    return;
  }
  try {
    await document.documentElement.requestFullscreen();
    setFullscreenNotes("");
  } catch {
    setFullscreenNotes(
      "Fullscreen was blocked. You can keep playing in this view.",
    );
  }
}
fullscreenButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* Keep the responsive view. */
      }
    } else await enterFullscreen();
  });
});
document.addEventListener("fullscreenchange", () => {
  const label = document.fullscreenElement
    ? "Exit fullscreen"
    : "Enter fullscreen";
  fullscreenButtons.forEach((button) => {
    button.setAttribute("aria-label", label);
    button.title = label;
  });
});

/* ================= WELCOME SCREEN: PLAYER STATE ================= */
const STORAGE_KEY = "proudgeonzer0quiz.player.v1";
const DIFFICULTIES = {
  chill: "Chill Explorer",
  brave: "Brave Challenger",
  legendary: "Legendary Mastermind",
};
const MOTIVATIONS = [
  "Greatness begins with the courage to learn.",
  "Every expert was once a curious beginner.",
  "Small questions today, big victories tomorrow!",
  "Your brain is your superpower — power it up!",
  "Stay curious. Keep growing. Stay proud!",
  "One more question can change your whole game.",
];
const FUN_FACTS = [
  "Honey never spoils! Archaeologists found pots of honey in ancient Egyptian tombs that are over 3,000 years old — and still perfectly edible. 🍯",
  "Octopuses have three hearts, and two of them stop beating when they swim. 🐙",
  "The Philippines is made up of around 7,641 islands — that number can even change with the tide! 🇵🇭",
  "Bananas are berries, but strawberries are not. Botany is full of surprises! 🍌",
  "Your brain generates about 20 watts of electrical power — enough to dimly power a light bulb. 💡",
  "The first computer programmer was Ada Lovelace, who wrote an algorithm in the 1840s — before computers even existed! 💻",
  "Sea otters hold hands while they sleep so they don't drift away from each other. 🦦",
  "A single day on Venus is longer than an entire year on Venus. Space is wild! 🪐",
];
const WARMUP_QUESTIONS = [
  {
    id: "capital-ph",
    question: "🇵🇭 What is the capital city of the Philippines?",
    options: ["Cebu City", "Manila", "Davao City", "Iloilo City"],
    answer: "Manila",
    cheer: "Tama! Manila has been the capital since 1976. 🇵🇭",
  },
  {
    id: "red-planet",
    question: "🪐 Which planet is known as the Red Planet?",
    options: ["Venus", "Jupiter", "Mars", "Saturn"],
    answer: "Mars",
    cheer: "Exactly! Mars looks red because of rusty iron dust on its surface.",
  },
  {
    id: "math-7x8",
    question: "➗ Quick math sprint: what is 7 × 8?",
    options: ["54", "56", "63", "48"],
    answer: "56",
    cheer: "Sharp mind! 7 × 8 = 56. Math wizard in the making! ✨",
  },
  {
    id: "water-formula",
    question: "💧 What is the chemical formula for water?",
    options: ["CO₂", "O₂", "H₂O", "H₂SO₄"],
    answer: "H₂O",
    cheer: "Correct! Two hydrogen atoms plus one oxygen atom make H₂O.",
  },
  {
    id: "plant-gas",
    question: "🌱 Which gas do plants absorb from the air to grow?",
    options: ["Oxygen", "Carbon dioxide", "Helium", "Nitrogen gas"],
    answer: "Carbon dioxide",
    cheer: "Yes! Plants breathe in carbon dioxide and give us oxygen back.",
  },
  {
    id: "biggest-ocean",
    question: "🌊 Which is the largest ocean on Earth?",
    options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
    answer: "Pacific Ocean",
    cheer: "Tama ulit! The Pacific Ocean covers about a third of our planet.",
  },
];

const defaultState = () => ({
  name: "",
  avatar: "🦊",
  difficulty: "brave",
  topics: ["General Knowledge"],
  xp: 0,
  coins: 0,
  sound: true,
  solved: [],
  dailyRewardClaimed: false,
  profileComplete: false,
});

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const saved = JSON.parse(raw);
    const state = { ...defaultState(), ...saved };
    if (!DIFFICULTIES[state.difficulty]) state.difficulty = "brave";
    if (!Array.isArray(state.topics)) state.topics = ["General Knowledge"];
    if (!Array.isArray(state.solved)) state.solved = [];
    return state;
  } catch {
    // Private modes and restricted contexts can still play without saving.
    return defaultState();
  }
}
const player = loadState();
function saveState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
  } catch {
    /* Playing without saved progress is fine. */
  }
}

const el = {
  nameInput: document.querySelector("#player-name"),
  nameCount: document.querySelector("#name-count"),
  greetingName: document.querySelector("#greeting-name"),
  heroAvatar: document.querySelector("#hero-avatar"),
  summaryAvatar: document.querySelector("#summary-avatar"),
  summaryText: document.querySelector("#summary-text"),
  summarySub: document.querySelector("#summary-sub"),
  motivation: document.querySelector("#motivation-text"),
  levelValue: document.querySelector("#level-value"),
  coinCount: document.querySelector("#coin-count"),
  xpValue: document.querySelector("#xp-value"),
  xpNext: document.querySelector("#xp-next"),
  xpFill: document.querySelector("#xp-fill"),
  xpProgress: document.querySelector("#xp-progress"),
  topicSummary: document.querySelector("#topic-summary"),
  warmupQuestion: document.querySelector("#warmup-question"),
  warmupOptions: document.querySelector("#warmup-options"),
  warmupFeedback: document.querySelector("#warmup-feedback"),
  warmupNext: document.querySelector("#warmup-next"),
  dailyDots: document.querySelector("#daily-dots"),
  dailyCount: document.querySelector("#daily-count"),
  funFact: document.querySelector("#fun-fact"),
  soundToggle: document.querySelector("#sound-toggle"),
  welcomeTitle: document.querySelector("#welcome-title"),
  welcomeScroll: document.querySelector("#welcome-scroll"),
  welcomeAnnouncement: document.querySelector("#welcome-announcement"),
  dialogName: document.querySelector("#dialog-name"),
  dialogSummary: document.querySelector("#dialog-summary"),
  homeAvatar: document.querySelector("#home-avatar"),
  homeGreetingName: document.querySelector("#home-greeting-name"),
  homeStyle: document.querySelector("#home-style"),
  homeTopicInline: document.querySelector("#home-topic-inline"),
  homeLevel: document.querySelector("#home-level"),
  homeTopics: document.querySelector("#home-topics"),
  homeSummaryAvatar: document.querySelector("#home-summary-avatar"),
  homeSummaryText: document.querySelector("#home-summary-text"),
  homeSummarySub: document.querySelector("#home-summary-sub"),
  homeScroll: document.querySelector("#home-scroll"),
  homeAnnouncement: document.querySelector("#home-announcement"),
  homeTitle: document.querySelector("#home-title"),
  badgeList: document.querySelector("#badge-list"),
  badgeCount: document.querySelector("#badge-count"),
  startQuiz: document.querySelector("#start-quiz"),
};

const displayName = () => player.name.trim() || "Challenger";
const level = () => Math.floor(player.xp / 100) + 1;

function renderPlayer() {
  const name = displayName();
  el.greetingName.textContent = name;
  el.heroAvatar.textContent = player.avatar;
  el.summaryAvatar.textContent = player.avatar;
  el.nameCount.textContent = String(el.nameInput.value.length);
  el.summaryText.textContent = `${name} · ${DIFFICULTIES[player.difficulty]}`;
  el.summarySub.textContent =
    player.topics.length > 0
      ? `${player.topics.length} favorite topic${player.topics.length === 1 ? "" : "s"} picked · Ready for your first quest?`
      : "No topic picked yet — surprise me, game!";
  el.levelValue.textContent = String(level());
  el.coinCount.textContent = String(player.coins);
  el.xpValue.textContent = String(player.xp);
  const intoLevel = player.xp % 100;
  el.xpNext.textContent = `${100 - intoLevel} XP TO LEVEL ${level() + 1}`;
  el.xpFill.style.width = `${intoLevel}%`;
  el.xpProgress.setAttribute("aria-valuenow", String(intoLevel));
  el.topicSummary.textContent =
    player.topics.length > 0
      ? `Your quest topics: ${player.topics.join(", ")}`
      : "No topics picked yet — the whole quiz world is open to you!";
  document.querySelectorAll(".avatar-option").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.avatar === player.avatar),
    );
  });
  const difficultyButtons = [
    ...document.querySelectorAll(".difficulty-option"),
  ];
  difficultyButtons.forEach((button) => {
    const checked = button.dataset.difficulty === player.difficulty;
    button.setAttribute("aria-checked", String(checked));
    // Roving tabindex keeps the radio group a single stop for keyboard users.
    button.tabIndex = checked ? 0 : -1;
  });
  document.querySelectorAll(".topic-chip").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(player.topics.includes(button.dataset.topic)),
    );
  });
  el.soundToggle.classList.toggle("is-muted", !player.sound);
  el.soundToggle.setAttribute("aria-pressed", String(player.sound));
  el.soundToggle.setAttribute(
    "aria-label",
    player.sound ? "Turn sound off" : "Turn sound on",
  );

  // Home screen: same player, but presented as a quest hub.
  el.homeGreetingName.textContent = name;
  el.homeAvatar.textContent = player.avatar;
  el.homeStyle.textContent = DIFFICULTIES[player.difficulty];
  el.homeLevel.textContent = String(level());
  el.homeTopicInline.textContent =
    player.topics.length > 0
      ? `${player.topics.length} favorite topic${player.topics.length === 1 ? "" : "s"}`
      : "All topics unlocked";
  el.homeSummaryAvatar.textContent = player.avatar;
  el.homeSummaryText.textContent = `Ready to play, ${name}?`;
  el.homeSummarySub.textContent = player.dailyRewardClaimed
    ? `${player.xp} XP · ${player.coins} coins · Quest complete today!`
    : `${player.xp} XP · ${player.coins} coins · Quest of the day is waiting.`;
  renderHomeTopics();
  renderBadges();
  renderDailyQuest();
}

function renderHomeTopics() {
  if (!el.homeTopics) return;
  el.homeTopics.replaceChildren();
  if (player.topics.length === 0) {
    const empty = document.createElement("p");
    empty.className = "card-note empty-topics";
    empty.textContent =
      "No topics yet — the whole quiz world is open to you! Tap EDIT PLAYER CARD to choose some.";
    el.homeTopics.appendChild(empty);
    return;
  }
  player.topics.forEach((topic) => {
    const pill = document.createElement("span");
    pill.className = "topic-pill";
    pill.textContent = topic;
    el.homeTopics.appendChild(pill);
  });
}

function renderBadges() {
  if (!el.badgeList) return;
  const solvedCount = player.solved.length;
  const earned = {
    "first-steps": solvedCount >= 1,
    "brain-spark": solvedCount >= 3,
    "quest-master": player.dailyRewardClaimed,
  };
  let total = 0;
  el.badgeList.querySelectorAll(".badge").forEach((badge) => {
    const unlocked = Boolean(earned[badge.dataset.badge]);
    if (unlocked) total += 1;
    badge.classList.toggle("is-earned", unlocked);
    const state = badge.querySelector(".badge-state");
    if (state) state.textContent = unlocked ? "EARNED" : "LOCKED";
  });
  el.badgeCount.textContent = `${total} / 3`;
}

function renderDailyQuest() {
  const solvedCount = Math.min(player.solved.length, 5);
  el.dailyDots.replaceChildren();
  for (let index = 0; index < 5; index += 1) {
    const dot = document.createElement("span");
    dot.className = `daily-dot${index < solvedCount ? " is-done" : ""}`;
    el.dailyDots.appendChild(dot);
  }
  el.dailyCount.textContent = player.dailyRewardClaimed
    ? "QUEST COMPLETE! 🎉"
    : `${solvedCount} / 5 SOLVED`;
}

/* -------- Tiny, dependency-free sound effects (Web Audio) -------- */
let audioContext;
function playTones(notes) {
  if (!player.sound) return;
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audioContext = audioContext || new AudioCtor();
    if (audioContext.state === "suspended") void audioContext.resume();
    notes.forEach(([frequency, delay, duration]) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + delay;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.05);
    });
  } catch {
    /* Sound is a bonus; silence never breaks the game. */
  }
}
const soundClick = () => playTones([[620, 0, 0.09]]);
const soundSuccess = () =>
  playTones([
    [660, 0, 0.12],
    [880, 0.09, 0.12],
    [990, 0.18, 0.2],
  ]);
const soundWrong = () => playTones([[220, 0, 0.16]]);

/* -------- Confetti celebration (skipped for reduced motion) -------- */
function celebrate(layerId = "welcome-confetti") {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.querySelector(`#${layerId}`);
  if (!layer) return;
  layer.replaceChildren();
  const colors = ["#e9bb71", "#ffe1a8", "#7bc47f", "#7cc7e8", "#e89ad1"];
  for (let index = 0; index < 28; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.45}s`;
    piece.style.setProperty(
      "--confetti-drift",
      `${Math.round(Math.random() * 120 - 60)}px`,
    );
    layer.appendChild(piece);
  }
  window.setTimeout(() => layer.replaceChildren(), 3200);
}

/* -------- Warm-up mini quiz -------- */
let warmupIndex = 0;
let warmupSolved = false;
function shuffled(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}
function renderWarmup() {
  const quiz = WARMUP_QUESTIONS[warmupIndex % WARMUP_QUESTIONS.length];
  warmupSolved = false;
  el.warmupQuestion.textContent = quiz.question;
  el.warmupFeedback.textContent = "";
  el.warmupFeedback.className = "warmup-feedback";
  el.warmupNext.hidden = true;
  el.warmupOptions.replaceChildren();
  shuffled(quiz.options).forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "warmup-option";
    button.textContent = option;
    button.addEventListener("click", () => answerWarmup(button, quiz, option));
    el.warmupOptions.appendChild(button);
  });
}
function answerWarmup(button, quiz, option) {
  if (warmupSolved) return;
  if (option !== quiz.answer) {
    button.classList.add("is-wrong");
    button.disabled = true;
    el.warmupFeedback.textContent =
      "Almost! Hindi pa ’yan — try another answer, you can do it!";
    el.warmupFeedback.className = "warmup-feedback is-bad";
    soundWrong();
    return;
  }
  warmupSolved = true;
  button.classList.add("is-correct");
  el.warmupOptions
    .querySelectorAll(".warmup-option")
    .forEach((optionButton) => {
      optionButton.disabled = true;
    });
  const alreadyRewarded = player.solved.includes(quiz.id);
  if (!alreadyRewarded) {
    player.solved.push(quiz.id);
    player.xp += 10;
    player.coins += 5;
    if (player.solved.length >= 5 && !player.dailyRewardClaimed) {
      player.dailyRewardClaimed = true;
      player.coins += 50;
      el.warmupFeedback.textContent = `${quiz.cheer} 🎉 +10 XP · QUEST OF THE DAY COMPLETE — bonus +50 coins!`;
    } else {
      el.warmupFeedback.textContent = `🎉 ${quiz.cheer} +10 XP and +5 coins!`;
    }
  } else {
    el.warmupFeedback.textContent = `🎉 ${quiz.cheer} (Already solved — try a new question for more XP!)`;
  }
  el.warmupFeedback.className = "warmup-feedback is-good";
  el.warmupNext.hidden = false;
  saveState();
  renderPlayer();
  soundSuccess();
  if (!alreadyRewarded) celebrate("home-confetti");
}
el.warmupNext.addEventListener("click", () => {
  // Prefer a question the player has not solved yet so new questions
  // never repeat until the whole set has been seen.
  const indexes = WARMUP_QUESTIONS.map((_, index) => index);
  const fresh = indexes.filter(
    (index) =>
      index !== warmupIndex &&
      !player.solved.includes(WARMUP_QUESTIONS[index].id),
  );
  const pool = fresh.length
    ? fresh
    : indexes.filter((index) => index !== warmupIndex);
  warmupIndex = pool[Math.floor(Math.random() * pool.length)] ?? warmupIndex;
  renderWarmup();
  soundClick();
});

/* -------- Fun facts -------- */
let factIndex = 0;
function renderFact() {
  el.funFact.textContent = FUN_FACTS[factIndex % FUN_FACTS.length];
}
document.querySelector("#fact-shuffle").addEventListener("click", () => {
  let next = Math.floor(Math.random() * FUN_FACTS.length);
  if (next === factIndex) next = (next + 1) % FUN_FACTS.length;
  factIndex = next;
  renderFact();
  soundClick();
});

/* -------- Player card controls -------- */
el.nameInput.addEventListener("input", () => {
  player.name = el.nameInput.value;
  saveState();
  renderPlayer();
});
document.querySelectorAll(".avatar-option").forEach((button) => {
  button.addEventListener("click", () => {
    player.avatar = button.dataset.avatar;
    saveState();
    renderPlayer();
    soundClick();
  });
});
function chooseDifficulty(button) {
  player.difficulty = button.dataset.difficulty;
  saveState();
  renderPlayer();
  soundClick();
  button.focus({ preventScroll: true });
}
document.querySelectorAll(".difficulty-option").forEach((button, index, all) => {
  button.addEventListener("click", () => chooseDifficulty(button));
  button.addEventListener("keydown", (event) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    chooseDifficulty(all[(index + step + all.length) % all.length]);
  });
});
document.querySelectorAll(".topic-chip").forEach((button) => {
  button.addEventListener("click", () => {
    const topic = button.dataset.topic;
    player.topics = player.topics.includes(topic)
      ? player.topics.filter((item) => item !== topic)
      : [...player.topics, topic];
    saveState();
    renderPlayer();
    soundClick();
  });
});
el.soundToggle.addEventListener("click", () => {
  player.sound = !player.sound;
  saveState();
  renderPlayer();
  soundClick();
});

/* ================= SCREEN NAVIGATION ================= */
const screens = {
  welcome: welcomeScreen,
  home: homeScreen,
};

function showScreen(name, { celebrate: shouldCelebrate = true } = {}) {
  Object.entries(screens).forEach(([key, node]) => {
    node.hidden = key !== name;
  });
  if (name === "welcome") {
    el.welcomeScroll.scrollTop = 0;
    el.motivation.textContent =
      MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
    el.welcomeAnnouncement.textContent = `Welcome, ${displayName()}! Set up your player card, then proceed to your quest hub.`;
    if (shouldCelebrate) {
      celebrate("welcome-confetti");
      soundSuccess();
    }
    el.welcomeTitle.focus({ preventScroll: true });
  }
  if (name === "home") {
    el.homeScroll.scrollTop = 0;
    el.homeAnnouncement.textContent = `Welcome back, ${displayName()}! Your quest hub is ready.`;
    if (shouldCelebrate) {
      celebrate("home-confetti");
      soundClick();
    }
    el.homeTitle.focus({ preventScroll: true });
  }
}

document.querySelector("#home-back").addEventListener("click", () => {
  soundClick();
  showScreen("welcome");
});

/* -------- Player card → Home (profile is set, enter the quest hub) -------- */
document.querySelector("#proceed").addEventListener("click", () => {
  player.profileComplete = true;
  saveState();
  renderPlayer();
  showScreen("home");
});
document.querySelector("#edit-profile").addEventListener("click", () => {
  soundClick();
  showScreen("welcome");
});

/* -------- Start Quiz: honest, reversible next step -------- */
el.startQuiz.addEventListener("click", () => {
  el.dialogName.textContent = displayName();
  const topics =
    player.topics.length > 0 ? player.topics.join(", ") : "surprise topics";
  el.dialogSummary.textContent =
    `Quest hub cleared as a ${DIFFICULTIES[player.difficulty]}. ` +
    `You have ${player.xp} XP and ${player.coins} coins, with ${player.solved.length} warm-up ` +
    `question${player.solved.length === 1 ? "" : "s"} solved. Topics: ${topics}. ` +
    `The full quiz arena is coming in the next update, ${displayName()}!`;
  soundSuccess();
  dialog.showModal();
});
document
  .querySelector("#close-dialog")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  // Dialog padding belongs to the dialog too; only dismiss actual backdrop taps.
  const bounds = dialog.getBoundingClientRect();
  const outside =
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom;
  if (event.target === dialog && outside) dialog.close();
});

/* -------- First paint of the player card + quest hub -------- */
el.nameInput.value = player.name;
factIndex = Math.floor(Math.random() * FUN_FACTS.length);
renderFact();
renderWarmup();
renderPlayer();

/* -------- Launch: returning players land on their hub, new players on the card -------- */
const hasSavedProfile =
  player.profileComplete === true || player.xp > 0 || player.solved.length > 0;
showScreen(hasSavedProfile ? "home" : "welcome", { celebrate: false });

// Cache the small, dependency-free app for later offline visits.
if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    // Local-file use and restricted browser contexts still work without caching.
  });
}
