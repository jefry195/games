const squares = document.querySelectorAll(".square");
const timeLeft = document.querySelector("#time-left");
const score = document.querySelector("#score");

let result = 0;
let hitPosition;
let currentTime = 60;
let timerId = null;

function randomSquare() {
  squares.forEach((square) => {
    square.classList.remove("emoji");
  });

  let randomSquare = squares[Math.floor(Math.random() * squares.length)];
  if (randomSquare) {
    randomSquare.classList.add("emoji");
    hitPosition = randomSquare.id;
  }
}

squares.forEach((square) => {
  const handleHit = (e) => {
    if (e.cancelable) e.preventDefault();
    if (square.id == hitPosition) {
      result++;
      score.textContent = result;
      hitPosition = null;
      square.classList.remove("emoji");
    }
  };
  square.addEventListener("pointerdown", handleHit);
});

function moveEmoji() {
  timerId = setInterval(randomSquare, 500);
}

moveEmoji();

function countDown() {
  currentTime--;
  timeLeft.textContent = currentTime;

  if (currentTime == 0) {
    clearInterval(countDownTimerId);
    clearInterval(timerId);
    alert(`Permainan Selesai! Skor akhir Anda adalah ${result}`);
  }
}

let countDownTimerId = setInterval(countDown, 1000);
