const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pool = require('./Database/db');
const getLegoSetImage = require('./Images/getLegoSetImage');

const app = express();
const PORT = 3000;
const BASE_LEGO_IMAGE_URL = 'https://www.lego.com/cdn/product-assets/element.img.photoreal.192x192';

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Constants for error messages
const ERROR_MESSAGES = {
    LEGO: {
        NOT_FOUND: 'No se encontraron sets de LEGO',
        CREATED: 'Set de LEGO creado exitosamente',
        UPDATED: 'Set de LEGO actualizado exitosamente',
        NOT_FOUND_ID: 'Set de LEGO no encontrado'
    },
    OPTIONS: {
        CATEGORY_REQUIRED: 'Categoría no especificada',
        NOT_FOUND: 'No se encontraron opciones para esta categoría'
    },
    SERVER: {
        ERROR: 'Error al obtener sets de LEGO',
        OPTIONS_ERROR: 'Error al obtener opciones',
        UPDATE_ERROR: 'Error al actualizar set de LEGO'
    }
};

// Helper function to handle database errors
const handleDatabaseError = (res, error, customMessage) => {
    console.error(`${customMessage}:`, error);
    res.status(500).json({ error: customMessage });
};

// Routes
app.get('/lego/options', async (req, res) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({ error: ERROR_MESSAGES.OPTIONS.CATEGORY_REQUIRED });
        }

        const optionsQuery = `SELECT DISTINCT ${category} FROM lego ORDER BY ${category}`;
        const result = await pool.query(optionsQuery);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: ERROR_MESSAGES.OPTIONS.NOT_FOUND });
        }

        const filteredRows = result.rows.filter(row =>
            row[category] !== null && row[category] !== '' && row[category] !== ' '
        );

        res.json(filteredRows);
    } catch (error) {
        handleDatabaseError(res, error, ERROR_MESSAGES.SERVER.OPTIONS_ERROR);
    }
});

app.get('/lego', async (req, res) => {
    try {
        const { searchBy, searchValue } = req.query;
        const query = `
      SELECT * FROM lego
      WHERE ${searchBy} = $1
      ORDER BY ${searchBy} ASC;
    `;

        let result = await pool.query(query, [searchValue]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: ERROR_MESSAGES.LEGO.NOT_FOUND });
        }

        const countOfLegoSets = result.rows.reduce((acc, lego) => {
            acc[lego.lego] = (acc[lego.lego] || 0) + 1;
            return acc;
        }, {})

        if (Object.keys(countOfLegoSets).length === 1) {
            const legoSet = Object.keys(countOfLegoSets)[0];
            if(legoSet === '') {
                res.json(result.rows.map(lego => ({
                    ...lego,
                    imageSet: '',
                    imagePiece: `${BASE_LEGO_IMAGE_URL}/${lego.code}.jpg`
                })));
            }else {
                const legoWithSetImage = await getLegoSetImage(legoSet);
                const legoWithSetImages = result.rows.map(lego => ({
                    ...lego,
                    imageSet: legoWithSetImage,
                    imagePiece: `${BASE_LEGO_IMAGE_URL}/${lego.code}.jpg`
                }));
                res.json(legoWithSetImages);
            }
        } else if (Object.keys(countOfLegoSets).length > 1) {
            let legoSets = Object.keys(countOfLegoSets);
            legoSets = await Promise.all(legoSets.map(async (legoSet) => {
                const legoWithSetImage = legoSet === '' ? '' : await getLegoSetImage(legoSet);
                return {
                    lego: legoSet,
                    imageSet: legoWithSetImage,
                    count: countOfLegoSets[legoSet]
                };
            }));
            result.rows = result.rows.map(lego => ({
                ...lego,
                imageSet: legoSets.find(set => set.lego === lego.lego)?.imageSet || '',
                imagePiece: `${BASE_LEGO_IMAGE_URL}/${lego.code}.jpg`
            }));
            res.json(result.rows);
        }
    } catch (error) {
        handleDatabaseError(res, error, ERROR_MESSAGES.SERVER.ERROR);
    }
});

app.post('/lego', async (req, res) => {
    try {
        const { code, lego, cant, task, pedido, completo, set, reemplazado } = req.body;
        const insertQuery = `
      INSERT INTO lego (code, lego, cant, task, pedido, completo, set, reemplazado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

        const result = await pool.query(insertQuery,
            [code, lego, cant, task, pedido, completo, set, reemplazado]);

        res.status(201).json({
            message: ERROR_MESSAGES.LEGO.CREATED,
            data: result.rows[0]
        });
    } catch (error) {
        handleDatabaseError(res, error, ERROR_MESSAGES.SERVER.ERROR);
    }
});

app.put('/lego/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;

        if (body.isEditSet && body.lego !== '') {
            body.imageSet = await getLegoSetImage(body.lego);
        }

        const updateQuery = `
      UPDATE lego
      SET code = $1, lego = $2, cant = $3, task = $4, pedido = $5, 
          completo = $6, set = $7, reemplazado = $8
      WHERE id = $9
      RETURNING *
    `;

        const values = [
            body.code, body.lego, body.cant, body.task, body.pedido,
            body.completo, body.set, body.reemplazado, id
        ];

        const result = await pool.query(updateQuery, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: ERROR_MESSAGES.LEGO.NOT_FOUND_ID });
        }

        res.json({
            message: ERROR_MESSAGES.LEGO.UPDATED,
            data: body
        });
    } catch (error) {
        handleDatabaseError(res, error, ERROR_MESSAGES.SERVER.UPDATE_ERROR);
    }
});

app.delete('/lego/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const deleteQuery = `
            DELETE FROM lego
            WHERE id = $1`;
        const result = await pool.query(deleteQuery, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: ERROR_MESSAGES.LEGO.NOT_FOUND_ID });
        }
        res.json({ message: 'Set de LEGO eliminado exitosamente' });
    } catch (error) {
        handleDatabaseError(res, error, ERROR_MESSAGES.SERVER.ERROR);
    }
})

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}/lego`);
});