const pool = require('../Database/db');
const url = "https://www.lego.com/es-ar/service/building-instructions/";
const axios = require('axios');
const cheerio = require('cheerio');

async function getLegoSetImage(code) {
    try {
        const response = await axios.get(`${url}${code}`);
        const $ = cheerio.load(response.data);
        const imageUrl = $('.instruction-image img').attr('src');

        if (imageUrl) {
            return `https:${imageUrl}`;
        } else {
            throw new Error('Imagen no encontrada');
        }
    } catch (error) {
        console.error('Error al obtener la imagen del set de LEGO:', error);
        throw error;
    }
}

module.exports = getLegoSetImage;
