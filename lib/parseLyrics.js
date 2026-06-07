function parseLyricsResponse(raw) {
  const tracks = [];
  const blocks = raw.split('---').filter(b => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const titleLine = lines[0];
    const lyrics = lines.slice(1).join('\n').trim();
    const title = titleLine.replace(/^TRACK \[?\d+\]?:\s*/i, '').trim();
    tracks.push({ title, lyrics });
  }

  return tracks;
}

module.exports = { parseLyricsResponse };
