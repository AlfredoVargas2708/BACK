const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pool = require('./Database/db');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.get('/lego', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM lego');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener datos:', error);
        res.status(500).json({ error: 'Error al obtener datos' });
    }
});

app.get('/lego/:code', async (req, res) => {
    const code = req.params.code;
    try {
        const result = await pool.query('SELECT * FROM lego WHERE code LIKE $1', [`%${code}%`]);
        if (result.rows.length > 0) {
            res.json(result.rows);
        } else {
            res.status(404).json({ error: 'Código no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener datos por código:', error);
        res.status(500).json({ error: 'Error al obtener datos por código' });
    }
});

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}/lego`);
});