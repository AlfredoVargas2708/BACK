const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pool = require('./Database/db');
const getLegoSetImage = require('./Images/getLegoSetImage');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.get('/lego/options', async (req, res) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({ error: 'Categoría no especificada' });
        }

        const optionsQuery = `SELECT DISTINCT ${category} FROM lego ORDER BY ${category}`;
        const result = await pool.query(optionsQuery);
        if (result.rows.length > 0) {
            res.json(result.rows.filter(row => row[category] !== null && row[category] !== '' && row[category] !== ' '));
        } else {
            res.status(404).json({ error: 'No se encontraron opciones para esta categoría' });
        }
    } catch (error) {
        console.error('Error al obtener opciones:', error);
        res.status(500).json({ error: 'Error al obtener opciones' });
    }
})

app.get('/lego', async (req, res) => {
    try {
        const { searchBy, searchValue } = req.query;

        const query = `
            SELECT * FROM lego
            WHERE ${searchBy} = $1
            ORDER BY ${searchBy} ASC;`
        const values = [searchValue];
        const result = await pool.query(query, values);

        if (result.rows.length > 0) {
            const legoWithSetImages = await Promise.all(result.rows.map(async (lego) => {
                try {
                    const imageSet = await getLegoSetImage(lego.lego);
                    const imagePiece = `https://www.lego.com/cdn/product-assets/element.img.photoreal.192x192/${lego.code}.jpg`
                    return { ...lego, imageSet, imagePiece };
                } catch (error) {
                    return { ...lego, imageSet: null, imagePiece: null }; // Si falla, asigna null a las imágenes
                }
            }));
            res.json(legoWithSetImages);
        } else {
            res.status(404).json({ error: 'No se encontraron sets de LEGO' });
        }

    } catch (error) {
        console.error('Error al obtener sets de LEGO:', error);
        res.status(500).json({ error: 'Error al obtener sets de LEGO' });
    }
})

app.post('/lego', async (req, res) => {
    try {
        const { code, lego, cant, task, pedido, completo, set, reemplazado } = req.body;

        const insertQuery = `
            INSERT INTO lego (code, lego, cant, task, pedido, completo, set, reemplazado)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const values = [code, lego, cant, task, pedido, completo, set, reemplazado];
        const result = await pool.query(insertQuery, values);

        res.status(201).json({ message: 'Set de LEGO creado exitosamente', data: result.rows[0] });
    } catch (error) {
        console.error('Error al obtener sets de LEGO:', error);
        res.status(500).json({ error: 'Error al obtener sets de LEGO' });
    }
})

app.put('/lego/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let body = req.body;

        body.imageSet = body.isEditSet ? body.lego !== '' ? await getLegoSetImage(body.lego) : null : body.imageSet;

        const updateQuery = `
                    UPDATE lego
                    SET code = $1, lego = $2, cant = $3, task = $4, pedido = $5, completo = $6, set = $7, reemplazado = $8
                    WHERE id = $9
                    RETURNING *
                `;
        const values = [
            body.code, body.lego, body.cant, body.task, body.pedido,
            body.completo, body.set, body.reemplazado, id
        ];

        const result = await pool.query(updateQuery, values);
        if (result.rows.length > 0) {
            res.json({ message: 'Set de LEGO actualizado exitosamente', data: body });
        } else {
            res.status(404).json({ error: 'Set de LEGO no encontrado' });
        }

    } catch (error) {
        console.error('Error al actualizar set de LEGO:', error);
        res.status(500).json({ error: 'Error al actualizar set de LEGO' });
    }
})

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}/lego`);
});