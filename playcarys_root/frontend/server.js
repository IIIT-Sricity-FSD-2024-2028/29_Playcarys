const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'live_database.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health Check
app.get('/', (req, res) => res.send('PlayCarys Flat-File DB Engine is Active'));

// Fetch the Database
app.get('/db', (req, res) => {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            return res.json(JSON.parse(data));
        }
        res.status(404).json({ error: 'Database file not found yet. It will be created on the first save.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to read database' });
    }
});

// Overwrite the Database
app.post('/db', (req, res) => {
    try {
        const payload = req.body;
        if (!payload || Object.keys(payload).length === 0) {
            return res.status(400).json({ error: 'Empty payload rejected' });
        }
        fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf8');
        res.json({ success: true, message: 'Database saved successfully!' });
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).json({ error: 'Failed to write to database' });
    }
});

app.listen(PORT, () => {
    console.log(`\n================================`);
    console.log(`🚀 PlayCarys DB Server Running`);
    console.log(`📂 Mapping to: ${DB_FILE}`);
    console.log(`🔌 Listening on: http://localhost:${PORT}`);
    console.log(`================================\n`);
});
