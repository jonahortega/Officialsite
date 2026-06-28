import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3006;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve the roadmap HTML file at the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'greek-life-roadmap.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Roadmap server running at http://localhost:${PORT}`);
    console.log(`📋 Serving: greek-life-roadmap.html`);
    console.log(`🌐 Open your browser and go to: http://localhost:${PORT}`);
}); 