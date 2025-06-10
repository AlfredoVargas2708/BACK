const express = require('express');
const cors = require('cors');
const pool = require('./Database/db');
const getLegoSetImage = require('./Images/getLegoSetImage');
const NodeCache = require('node-cache');
const pLimit = require('p-limit');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json()); // reemplaza body-parser

// Cache de imágenes por 1 hora
const imageCache = new NodeCache({ stdTTL: 3600 });
const limit = pLimit(5); // Limita concurrencia de peticiones externas

// Obtener opciones únicas por categoría
app.get('/lego/options', async (req, res) => {
    try {
        const { category } = req.query;
        if (!category) {
            return res.status(400).json({ error: 'Categoría no especificada' });
        }

        const optionsQuery = `SELECT DISTINCT ${category} FROM lego ORDER BY ${category}`;
        const result = await pool.query(optionsQuery);
        const filtered = result.rows.filter(row => row[category]?.trim());

        res.json(filtered);
    } catch (error) {
        console.error('Error al obtener opciones:', error);
        res.status(500).json({ error: 'Error al obtener opciones' });
    }
});

// Obtener legos filtrados con imágenes, paginados
app.get('/lego', async (req, res) => {
    try {
        const { searchBy, searchValue, page = 1, limit: limitParam = 20 } = req.query;
        const allowedFields = ['code', 'lego', 'set', 'task', 'pedido', 'completo', 'reemplazado']; // Campos seguros

        if (!allowedFields.includes(searchBy)) {
            return res.status(400).json({ error: 'Campo de búsqueda no válido' });
        }

        const limitVal = parseInt(limitParam, 10);
        const offset = (parseInt(page, 10) - 1) * limitVal;

        const query = `
            SELECT id, code, lego, cant, set FROM lego
            WHERE ${searchBy} = $1
            ORDER BY ${searchBy} ASC
            LIMIT $2 OFFSET $3
        `;
        const values = [searchValue, limitVal, offset];
        const result = await pool.query(query, values);

        const legoWithSetImages = await Promise.all(result.rows.map((lego) =>
            limit(async () => {
                try {
                    const cachedImage = imageCache.get(lego.lego);
                    const imageSet = cachedImage ?? await getLegoSetImage(lego.lego);
                    if (!cachedImage) imageCache.set(lego.lego, imageSet);

                    const imagePiece = `https://www.lego.com/cdn/product-assets/element.img.photoreal.192x192/${lego.code}.jpg`;
                    return { ...lego, imageSet, imagePiece };
                } catch (error) {
                    return { ...lego, imageSet: null, imagePiece: null };
                }
            })
        ));

        res.json(legoWithSetImages);
    } catch (error) {
        console.error('Error al obtener sets de LEGO:', error);
        res.status(500).json({ error: 'Error al obtener sets de LEGO' });
    }
});

// Crear nuevo set
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
        console.error('Error al crear set de LEGO:', error);
        res.status(500).json({ error: 'Error al crear set de LEGO' });
    }
});

// Actualizar set existente
app.put('/lego/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let body = req.body;

        if (body.isEditSet && body.lego) {
            try {
                const imageSet = await getLegoSetImage(body.lego);
                body.imageSet = imageSet;
                imageCache.set(body.lego, imageSet); // opcional: actualiza cache
            } catch {
                body.imageSet = null;
            }
        }

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
            res.json({ message: 'Set de LEGO actualizado exitosamente', data: result.rows[0] });
        } else {
            res.status(404).json({ error: 'Set de LEGO no encontrado' });
        }

    } catch (error) {
        console.error('Error al actualizar set de LEGO:', error);
        res.status(500).json({ error: 'Error al actualizar set de LEGO' });
    }
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}/lego`);
});
