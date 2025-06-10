const axios = require('axios');
const cheerio = require('cheerio');

const url = "https://www.lego.com/es-ar/service/building-instructions/";

async function getLegoSetImage(code) {
    try {
        const response = await axios.get(`${url}${code}`);
        const $ = cheerio.load(response.data);

        // Buscar la imagen dentro del picture con el atributo data-test="set-image"
        const imgSrc = $('picture[data-test="set-image"] img')[0].prev.attribs.srcset.split(',')[0].trim().split(' ')[0];

        if (imgSrc) {
            return imgSrc.startsWith('http') ? imgSrc : `https:${imgSrc}`;
        } else {
            throw new Error('Imagen no encontrada');
        }
    } catch (error) {
        console.error('Error al obtener la imagen del set de LEGO:', error.message);
        throw error;
    }
}

module.exports = getLegoSetImage;
