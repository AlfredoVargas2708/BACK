const ExcelJS = require('exceljs');
const pool = require('../Database/db');

function sanitizeColumnName(name) {
    return name
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')   // espacios a guión bajo
        .replace(/[^\w]/g, ''); // elimina caracteres no alfanuméricos (excepto _)
}

async function readExcel(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet(1); // Primera hoja
    const rawColumns = worksheet.getRow(1).values.slice(1); // Encabezados
    let columns = rawColumns.map(sanitizeColumnName);
    columns = columns.slice(1);

    console.log('Columnas:', columns);

    const data = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1 && rowNumber < worksheet.rowCount) { // Saltar encabezados y última fila
            const rowData = {};
            row.eachCell((cell, colNumber) => {
                if (colNumber > 1) { // Omitir la primera columna
                    rowData[columns[colNumber - 2]] = cell.value;
                }
            });
            data.push(rowData);
        }
    });

    const createTableQuery = `
        DROP TABLE IF EXISTS lego;
        CREATE TABLE lego (
            id SERIAL PRIMARY KEY,
            ${columns.map(col => `"${col}" text`).join(',\n')}
        );
    `;

    await pool.query(createTableQuery);

    console.log('Tabla creada exitosamente');

    const insertQuery = `
        INSERT INTO lego (${columns.map(col => `"${col}"`).join(', ')})
        VALUES ${data.map(row => `(${columns.map(col => `'${row[col] || ''}'`).join(', ')})`).join(', ')}
        ON CONFLICT DO NOTHING;
    `;

    try {
        await pool.query(insertQuery);

        console.log('Datos insertados exitosamente');
    } catch (error) {
        console.error('Error al insertar datos:', error);
    } finally {
        await pool.end();
    }
}

async function updateLego() {
    try {
        const selectQuery = `
            SELECT * FROM lego
            WHERE lego = '41092-2'
        `;
        const result = await pool.query(selectQuery);
        console.log('Datos seleccionados exitosamente:', result.rows);
    } catch (error) {
        console.error('Error al actualizar datos:', error);
    }
} 

updateLego();

//readExcel('./Lego.xlsx');
