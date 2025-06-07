const pool = require('../Database/db');
const url = "https://www.lego.com/es-ar/service/building-instructions/";
const axios = require('axios');
const cheerio = require('cheerio');
const http = require('http');
const https = require('https');

// Configuración optimizada de Axios
const axiosInstance = axios.create({
    baseURL: url,
    timeout: 5000,
    maxRedirects: 2,
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true })
});

const imageCache = new Map();

async function getLegoSetImageFromWeb(code) {
    if (imageCache.has(code)) {
        return imageCache.get(code);
    }

    try {
        const response = await axiosInstance.get(code);
        const $ = cheerio.load(response.data);
        const imageElement = $('source');
        if (!imageElement.length) return null;

        const imageUrl = imageElement.attr('srcset')?.split(',')[0]?.trim()?.split(' ')[0];
        if (imageUrl) {
            imageCache.set(code, imageUrl);
        }
        return imageUrl || null;
    } catch (error) {
        console.error(`Error al obtener la imagen del set de LEGO ${code}:`, error.message);
        return null;
    }
}

async function insertImageInDB() {
    const client = await pool.connect();
    try {
        const { rows } = await client.query(
            'SELECT code_sets FROM lego_sets WHERE image_set IS NULL OR image_set = \'\''
        );

        const concurrencyLimit = 10;
        const batches = [];

        for (let i = 0; i < rows.length; i += concurrencyLimit) {
            batches.push(rows.slice(i, i + concurrencyLimit));
        }

        await client.query('BEGIN');

        for (const batch of batches) {
            await Promise.all(batch.map(async (row) => {
                const code = row.code_sets;
                const imageUrl = await getLegoSetImageFromWeb(code);
                console.log(`Procesando set: ${code}, URL de imagen: ${imageUrl}`);
                if (imageUrl) {
                    await client.query(
                        'UPDATE lego_sets SET image_set = $1 WHERE code_sets = $2',
                        [imageUrl, code]
                    );
                }
            }));
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en el proceso:', error);
    } finally {
        client.release();
    }
}

insertImageInDB()
    .then(() => {
        console.log('Proceso completado');
        pool.end();
    })
    .catch(error => {
        console.error('Error en el proceso:', error);
        pool.end();
    });