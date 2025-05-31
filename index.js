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

app.put('/lego/:id', async (req, res) => {
    const { id } = req.params;
    const { code, lego, set, task, pedido, cantidad, completo, reemplazado } = req.body;

    try {
        const updateQuery = `
            UPDATE lego
            SET code = $1, lego = $2, set = $3, task = $4, pedido = $5, cant = $6, completo = $7, reemplazado = $8
            WHERE id = $9
        `;
        const values = [code, lego, set, task, pedido, completo, reemplazado, id];
        await pool.query(updateQuery, values);
        res.json({ message: 'Datos actualizados exitosamente' });
    } catch (error) {
        console.error('Error al actualizar datos:', error);
        res.status(500).json({ error: 'Error al actualizar datos' });
    }
})

app.post('/lego', async (req, res) => {
    try {
        const { code, lego, set, task, pedido, cantidad, completo, reemplazado } = req.body;
        const insertQuery = `
            INSERT INTO lego (code, lego, set, task, pedido, cant, completo, reemplazado)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        const values = [code, lego, set, task, pedido, cantidad, completo, reemplazado];
        await pool.query(insertQuery, values);
        res.status(201).json({ message: 'Datos insertados exitosamente' });
    } catch (error) {
        console.error('Error al insertar datos:', error);
        res.status(500).json({ error: 'Error al insertar datos' });
    }
})

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}/lego`);
});