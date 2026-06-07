const transcript = document.getElementById('transcript');
const composer = document.getElementById('composer');
const messageInput = document.getElementById('message');
const confirmEl = document.getElementById('confirm');
const createGiftButton = document.getElementById('create-gift');
const generatingEl = document.getElementById('generating');

const history = [];
let latestBrief = null;

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = `message message-${role}`;
  div.textContent = text;
  transcript.appendChild(div);
  transcript.scrollTop = transcript.scrollHeight;
}

async function sendToChat() {
  const res = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: history })
  });

  if (!res.ok) {
    appendMessage('assistant', 'Sorry — something went wrong. Please try again.');
    return;
  }

  const { message, brief } = await res.json();
  history.push({ role: 'assistant', content: message });
  appendMessage('assistant', message);

  if (brief) {
    latestBrief = brief;
    confirmEl.hidden = false;
  }
}

composer.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  messageInput.value = '';
  history.push({ role: 'user', content: text });
  appendMessage('user', text);

  await sendToChat();
});

createGiftButton.addEventListener('click', async () => {
  if (!latestBrief) return;

  confirmEl.hidden = true;
  generatingEl.hidden = false;

  const res = await fetch('/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(latestBrief)
  });

  if (!res.ok) {
    generatingEl.hidden = true;
    confirmEl.hidden = false;
    appendMessage('assistant', 'Sorry — I couldn’t start putting that together. Please try again.');
    return;
  }

  const { id } = await res.json();
  location.href = `/gift.html?id=${encodeURIComponent(id)}`;
});

sendToChat();
