const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pool = require('./Database/db');
const getLegoSetImage = require('./Images/getLegoSetImage');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.get('/lego', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM lego ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener datos:', error);
        res.status(500).json({ error: 'Error al obtener datos' });
    }
});

app.get('/lego/images', async (req, res) => {
    const legos = await pool.query('SELECT * FROM lego_sets ORDER BY id DESC');

    try {
        res.status(200).json(legos.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la imagen del set de LEGO' });
    }
});

app.get('/lego/images/new/:setId', async (req, res) => {
    try {
        const { setId } = req.params;
        console.log('Obteniendo imagen para el set:', setId);
/*         const imageUrl = await getLegoSetImage(setId);

        const addQuery = await pool.query('INSERT INTO lego_sets (code_sets, image_set) VALUES ($1, $2)', [setId, imageUrl]);
        if (addQuery.rowCount === 0) {
            return res.status(404).json({ error: 'Set no encontrado o ya existe' });
        }

        res.status(200).json({ imageUrl }); */
    } catch (error) {
        console.error('Error al obtener la imagen del set de LEGO:', error);
        res.status(500).json({ error: 'Error al obtener la imagen del set de LEGO' });
    }
});

app.get('/lego/options', async (req, res) => {
    const { category } = req.query;
    try {
        const result = await pool.query('SELECT DISTINCT ' + category + ' FROM lego ORDER BY ' + category);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener opciones:', error);
        res.status(500).json({ error: 'Error al obtener opciones' });
    }
})

app.get('/lego/pieces/category', async (req, res) => {
    try {
        const category = req.query.category;
        const value = req.query.value;
        const result = await pool.query('SELECT * FROM lego WHERE ' + category + ' = $1 ORDER BY id DESC', [value]);

        if (result.rows.length > 0) {
            res.json(result.rows);
        } else {
            res.status(404).json({ error: 'No se encontraron datos para esta categoría' });
        }
    } catch (error) {
        console.error('Error al obtener datos por categoría:', error);
        res.status(500).json({ error: 'Error al obtener datos por categoría' });
    }
})

app.get('/lego/pieces/code', async (req, res) => {
    try {
        const code = req.query.code;
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

app.put('/lego/pieces/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { code, lego, set, task, pedido, cant, completo, reemplazado } = req.body;
        const updateQuery = `
            UPDATE lego
            SET code = $1, lego = $2, set = $3, task = $4, pedido = $5, cant = $6, completo = $7, reemplazado = $8
            WHERE id = $9 RETURNING *
        `;
        const values = [code, lego, set, task, pedido, cant, completo, reemplazado, id];
        const result = await pool.query(updateQuery, values);
        res.json({ message: 'Datos actualizados exitosamente', data: result.rows[0] });
    } catch (error) {
        console.error('Error al actualizar datos:', error);
        res.status(500).json({ error: 'Error al actualizar datos' });
    }
})

app.post('/lego/pieces', async (req, res) => {
    try {
        const { code, lego, set, task, pedido, cant, completo, reemplazado } = req.body;
        const insertQuery = `
            INSERT INTO lego (code, lego, set, task, pedido, cant, completo, reemplazado)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        const values = [code, lego, set, task, pedido, cant, completo, reemplazado];
        await pool.query(insertQuery, values);
        res.status(201).json({ message: 'Datos insertados exitosamente' });
    } catch (error) {
        console.error('Error al insertar datos:', error);
        res.status(500).json({ error: 'Error al insertar datos' });
    }
})

app.delete('/lego/pieces/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleteQuery = 'DELETE FROM lego WHERE id = $1';
        await pool.query(deleteQuery, [id]);

        res.json({ message: 'Datos eliminados exitosamente' });
    } catch (error) {
        console.error('Error al eliminar datos:', error);
        res.status(500).json({ error: 'Error al eliminar datos' });
    }
})

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}/lego`);
});