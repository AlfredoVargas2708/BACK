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
    const columns = rawColumns.map(sanitizeColumnName);

    console.log('Columnas:', columns);

    const data = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // Saltar encabezados
            const rowData = {};
            row.eachCell((cell, colNumber) => {
                rowData[columns[colNumber - 1]] = cell.value;
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

readExcel('./Lego.xlsx');