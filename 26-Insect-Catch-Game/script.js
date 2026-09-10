const screens = document.querySelectorAll(".screen");
const chooseInsectButtons = document.querySelectorAll(".choose-insect-btn");
const startButton = document.getElementById("start-btn");
const gameContainer = document.getElementById("game-container");
const timeElement = document.getElementById("time");
const scoreElement = document.getElementById("score");
const message = document.getElementById("message");
let seconds = 0;
let score = 0;
let selectedInsect = {};

startButton.addEventListener("click", () => screens[0].classList.add("up"));

const increaseScore = () => {
  score++;
  if (score > 19) message.classList.add("visible");
  scoreElement.innerHTML = `Skor: ${score}`;
};

const addInsects = () => {
  setTimeout(createInsect, 1000);
  setTimeout(createInsect, 1500);
};

const catchInsect = function (e) {
  if (e && e.cancelable) e.preventDefault();
  increaseScore();
  this.classList.add("caught");
  setTimeout(() => {
    if (this && this.remove) this.remove();
  }, 2000);
  addInsects();
};

const getRandomLocation = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const x = Math.random() * Math.max(80, width - 120) + 20;
  const y = Math.random() * Math.max(80, height - 160) + 60;
  return { x, y };
};

const createInsect = () => {
  const insect = document.createElement("div");
  insect.classList.add("insect");
  const { x, y } = getRandomLocation();
  insect.style.top = `${y}px`;
  insect.style.left = `${x}px`;
  insect.innerHTML = `<img src="${selectedInsect.src}" 
  alt="${selectedInsect.alt}" 
  style="transform: rotate(${Math.random() * 360}deg)" />`;
  insect.addEventListener("click", catchInsect);
  insect.addEventListener("pointerdown", catchInsect);
  gameContainer.appendChild(insect);
};

const increaseTime = () => {
  let m = Math.floor(seconds / 60);
  let s = seconds % 60;
  m = m < 10 ? `0${m}` : m;
  s = s < 10 ? `0${s}` : s;
  timeElement.innerHTML = `Waktu: ${m}:${s}`;
  seconds++;
};

const startGame = () => setInterval(increaseTime, 1000);

chooseInsectButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const image = button.querySelector("img");
    const src = image.getAttribute("src");
    const alt = image.getAttribute("alt");
    selectedInsect = { src, alt };
    screens[1].classList.add("up");
    setTimeout(createInsect, 1000);
    startGame();
  });
});
