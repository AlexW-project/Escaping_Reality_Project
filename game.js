document.addEventListener('DOMContentLoaded', () => {
  const map1 = document.getElementById('map1');
  const map2 = document.getElementById('map2');
  const map3 = document.getElementById('map3');
  const map4 = document.getElementById('map4');

  const button1 = document.getElementById('button1');
  const button2 = document.getElementById('button2');
  const button3 = document.getElementById('button3');
  const button4 = document.getElementById('button4');

  const uiText = document.getElementById('uiText');
  const mapLabel = document.getElementById('mapLabel');

  function setUIText(message) {
    uiText.setAttribute('text', 'value', message);
  }

  function setMapLabel(label) {
    mapLabel.setAttribute('text', 'value', label);
  }

  function switchToMap(map) {
    map1.setAttribute('visible', map === 1);
    map2.setAttribute('visible', map === 2);
    map3.setAttribute('visible', map === 3);
    map4.setAttribute('visible', map === 4);

    setMapLabel(`Map ${map}`);
    setUIText(`Find the button on Map ${map}!`);

    if (map === 4) randomizeMap4Button();
  }

  // Randomize button4 position on platforms/obstacles
  function randomizeMap4Button() {
    const positions = [
      "-2 0.8 -2",
      "3 1.3 -5",
      "-3 1.5 -6",
      "0 2 -4",
      "2 1.5 -3"
    ];
    const randomPos = positions[Math.floor(Math.random() * positions.length)];
    button4.setAttribute('position', randomPos);
  }

  button1.addEventListener('click', () => {
    setUIText('Map 1 complete!');
    setTimeout(() => switchToMap(2), 1200);
  });

  button2.addEventListener('click', () => {
    setUIText('Map 2 complete!');
    setTimeout(() => switchToMap(3), 1200);
  });

  button3.addEventListener('click', () => {
    setUIText('Map 3 complete!');
    setTimeout(() => switchToMap(4), 1200);
  });

  button4.addEventListener('click', () => {
    setUIText('You beat the hardest map!');
    setTimeout(() => switchToMap(1), 1500);
  });

  // Start game at Map 1
  switchToMap(1);
});
