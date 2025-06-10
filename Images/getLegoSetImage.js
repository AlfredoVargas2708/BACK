const axios = require('axios');
const cheerio = require('cheerio');

const setUrl = "https://www.lego.com/es-ar/service/building-instructions/";

async function getLegoSetImage(code) {
    try {
        const response = await axios.get(`${setUrl}${code}`);
        const $ = cheerio.load(response.data);

        // Buscar la imagen dentro del picture con el atributo data-test="set-image"
        const imgSrc = $('picture[data-test="set-image"] img')[0].prev.attribs.srcset.split(',')[0].trim().split(' ')[0];

        if (imgSrc) {
            return imgSrc.startsWith('http') ? imgSrc : `https:${imgSrc}`;
        } else {
            throw new Error('Imagen no encontrada');
        }
    } catch (error) {
        throw new Error(`No se pudo obtener la imagen para el set LEGO ${code}`);
    }
}

module.exports = getLegoSetImage;
