const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

module.exports = {
  saveState: (state) => {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving window state:', e);
    }
  },
  loadState: () => {
    try {
      if (fs.existsSync(STATE_FILE)) {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      }
    } catch (e) {
      console.error('Error loading window state:', e);
    }
    return { width: 1200, height: 800, lastProjectId: null };
  }
};

