document.addEventListener('DOMContentLoaded', () => {
  const map1 = document.getElementById('map1');
  const map2 = document.getElementById('map2');
  const button1 = document.getElementById('button1');
  const button2 = document.getElementById('button2');
  const uiText = document.getElementById('uiText');
  const mapLabel = document.getElementById('mapLabel');

  let currentMap = 1;

  function setUIText(message) {
    uiText.setAttribute('text', 'value', message);
  }

  function setMapLabel(label) {
    mapLabel.setAttribute('text', 'value', label);
  }

  function switchToMap(mapNumber) {
    currentMap = mapNumber;
    if (mapNumber === 1) {
      map1.setAttribute('visible', true);
      map2.setAttribute('visible', false);
      setMapLabel('Map 1');
      setUIText('Find the button on Map 1!');
    } else {
      map1.setAttribute('visible', false);
      map2.setAttribute('visible', true);
      setMapLabel('Map 2');
      setUIText('Find the button on Map 2!');
    }
  }

  // When button on Map 1 is found, switch to Map 2
  button1.addEventListener('click', () => {
    setUIText('You found the button on Map 1! Switching to Map 2...');
    setTimeout(() => switchToMap(2), 1500);
  });

  // When button on Map 2 is found, restart at Map 1
  button2.addEventListener('click', () => {
    setUIText('You found the button on Map 2! Restarting...');
    setTimeout(() => switchToMap(1), 1500);
  });

  // Start at Map 1
  switchToMap(1);
});
