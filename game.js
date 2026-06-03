(function () {
  const canvas = document.getElementById("game-canvas");
  const context = canvas.getContext("2d");

  function drawShellPreview() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#163849");
    gradient.addColorStop(1, "#07131a");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "#6d8794";
    context.lineWidth = 18;
    context.strokeRect(54, 54, canvas.width - 108, canvas.height - 108);

    context.fillStyle = "#31a8ff";
    context.font = "700 58px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.fillText("IMPOL", canvas.width / 2, 190);

    context.fillStyle = "#edf7fb";
    context.font = "700 34px Arial, Helvetica, sans-serif";
    context.fillText("PINBALL", canvas.width / 2, 242);

    context.fillStyle = "#7bdc6c";
    context.font = "700 28px Arial, Helvetica, sans-serif";
    context.fillText("HUD LAYOUT READY", canvas.width / 2, canvas.height / 2);

    context.fillStyle = "#ff9b3d";
    context.beginPath();
    context.arc(canvas.width / 2, canvas.height / 2 + 110, 36, 0, Math.PI * 2);
    context.fill();
  }

  drawShellPreview();

  window.ImpolPinball = {
    phase: "1.2",
    matterLoaded: Boolean(window.Matter)
  };
})();
