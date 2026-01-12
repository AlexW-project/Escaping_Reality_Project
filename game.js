document.addEventListener('DOMContentLoaded', () => {
  const map1 = document.getElementById('map1');
  const map2 = document.getElementById('map2');
  const map3 = document.getElementById('map3');
  const button1 = document.getElementById('button1');
  const button2 = document.getElementById('button2');
  const button3 = document.getElementById('button3');
  const button4 = document.getElementById('button4');
  const button5 = document.getElementById('button5');
  const button6 = document.getElementById('button6');
  const button7 = document.getElementById('button7');
  const uiText = document.getElementById('uiText');
  const mapLabel = document.getElementById('mapLabel');

  let currentMap = 1;

  // Function to update the text on the UI
  function setUIText(message) {
    uiText.setAttribute('text', 'value', message);
  }

  // Function to update the map label (Map 1, Map 2, Map 3)
  function setMapLabel(label) {
    mapLabel.setAttribute('text', 'value', label);
  }

  // Switch to a specific map (1, 2, or 3)
  function switchToMap(mapNumber) {
    currentMap = mapNumber;
    
    if (mapNumber === 1) {
      map1.setAttribute('visible', true);
      map2.setAttribute('visible', false);
      map3.setAttribute('visible', false);
      setMapLabel('Map 1');
      setUIText('Find the button on Map 1!');
    } else if (mapNumber === 2) {
      map1.setAttribute('visible', false);
      map2.setAttribute('visible', true);
      map3.setAttribute('visible', false);
      setMapLabel('Map 2');
      setUIText('Find the button on Map 2!');
    } else if (mapNumber === 3) {
      map1.setAttribute('visible', false);
      map2.setAttribute('visible', false);
      map3.setAttribute('visible', true);
      setMapLabel('Map 3');
      setUIText('Find the button on Map 3!');
    }
  }

  // Randomly place buttons in Map 3
  function getRandomPosition() {
    const x = (Math.random() - 0.5) * 10;  // Random between -5 and 5
    const y = Math.random() * 3 + 1;       // Random between 1 and 4
    const z = (Math.random() - 0.5) * 10;  // Random between -5 and 5
    return `${x} ${y} ${z}`;
  }

  // Apply random positions to buttons in Map 3
  document.querySelectorAll('#map3 .clickable').forEach(button => {
    button.setAttribute('position', getRandomPosition());
  });

  // Event listener for button on Map 1
  button1.addEventListener('click', () => {
    setUIText('You found the button on Map 1! Switching to Map 2...');
    setTimeout(() => switchToMap(2), 1500); // Wait for the feedback before switching
  });

  // Event listener for button on Map 2
  button2.addEventListener('click', () => {
    setUIText('You found the button on Map 2! Switching to Map 3...');
    setTimeout(() => switchToMap(3), 1500);
  });

  // Event listener for buttons on Map 3
  [button3, button4, button5, button6, button7].forEach(button => {
    button.addEventListener('click', () => {
      setUIText('You found a button on Map 3! Restarting...');
      setTimeout(() => switchToMap(1), 1500); // Restart from Map 1 after finding a button
    });
  });

  // Start the game at Map 1
  switchToMap(1);
});
