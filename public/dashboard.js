const statsList = document.getElementById('server-stats');
const refreshBtn = document.getElementById('refresh-stats');
const restartBtn = document.getElementById('restart-server');

function fetchStats() {
  fetch('/api/stats')
    .then(res => res.json())
    .then(data => {
      statsList.innerHTML = `
        <li>Uptime: ${data.uptime.toFixed(2)} sec</li>
        <li>Platform: ${data.platform} (${data.arch})</li>
        <li>Node.js version: ${data.node_version}</li>
        <li>Total Memory: ${(data.memory.total / (1024*1024)).toFixed(2)} MB</li>
        <li>Free Memory: ${(data.memory.free / (1024*1024)).toFixed(2)} MB</li>
        <li>CPU Cores: ${data.cpu.length}</li>
        <li>CPU Model: ${data.cpu[0].model}</li>
        <li>CPU Speed: ${data.cpu[0].speed} MHz</li>
      `;
    });
}

// Button events
refreshBtn.addEventListener('click', fetchStats);
restartBtn.addEventListener('click', () => {
  fetch('/api/restart', { method: 'POST' })
    .then(res => res.json())
    .then(data => alert(data.message));
});

// Initial load
fetchStats();
