/**
 * Utilidades de conversión entre unidades
 */

const { getDb } = require('../models/db');

// Unidades base por tipo (inmutables)
let UNIDADES_BASE = null;

/**
 * Obtener unidades base (id < 5)
 * @returns 
 * Arreglo de unidades base ordenadas por id
 */
async function obtenerUnidadesBase() {
  if (UNIDADES_BASE) return UNIDADES_BASE;
  const db = await getDb();
  UNIDADES_BASE = await db.all('SELECT * FROM unidades WHERE id < 5 ORDER BY id');
  return UNIDADES_BASE;
};

/**
 * Obtener todas las unidades activas
 * @returns 
 * Arreglo de unidades activas ordenadas por tipo y coeficiente
 */
async function obtenerUnidades() {
  const db = await getDb();
  const dbUnidades = await db.all('SELECT * FROM unidades WHERE activo = 1 ORDER BY tipo, coeficiente');

  return dbUnidades;
}

/**
 * Obtener una unidad por ID
 * @param {number} id - ID de la unidad
 * @returns {Object} Unidad encontrada o null
 */
async function obtenerUnidad(id) {
  // Si es unidad base (id = 0) buscar por tipo
  if (id <= 0) return null;

  const db = await getDb();
  const unidad = await db.get('SELECT * FROM unidades WHERE id = ?', [id]);
  return unidad[0] || unidad || null;
}

/**
 * Obtener coeficiente de conversion entre unidades
 * @param {number} unidadOrigenId - ID de la unidad de origen
 * @param {number} unidadDestinoId - ID de la unidad de destino
 * @returns {number} Coeficiente de conversión
 */
async function obtenerCoeficienteConversion(unidadOrigenId, unidadDestinoId) {
  if (unidadOrigenId === unidadDestinoId) return 1;

  const db = await getDb();

  const origen = await db.get('SELECT tipo, coeficiente FROM unidades WHERE id = ?', [unidadOrigenId]);
  const destino = await db.get('SELECT tipo, coeficiente FROM unidades WHERE id = ?', [unidadDestinoId]);

  if (!origen || !destino) throw new Error('Unidad no encontrada');
  if (origen.tipo !== destino.tipo) throw new Error('No se pueden convertir unidades de diferente tipo');

  return origen.coeficiente / destino.coeficiente;
}

/**
 * Convierte una cantidad de una unidad a otra del MISMO tipo
 * @param {number} cantidad - Cantidad a convertir
 * @param {number} unidadOrigenId - ID de la unidad de origen
 * @param {number} unidadDestinoId - ID de la unidad de destino
 * @returns {number} Cantidad convertida
 */
async function convertir(cantidad, unidadOrigenId, unidadDestinoId) {
  if (unidadOrigenId === unidadDestinoId) return cantidad;

  const db = await getDb();

  const origen = await db.get('SELECT tipo, coeficiente FROM unidades WHERE id = ?', [unidadOrigenId]);
  const destino = await db.get('SELECT tipo, coeficiente FROM unidades WHERE id = ?', [unidadDestinoId]);

  if (!origen || !destino) throw new Error('Unidad no encontrada');
  if (origen.tipo !== destino.tipo) throw new Error('No se pueden convertir unidades de diferente tipo');

  // Convertir origen → unidad base → destino
  const cantidadEnBase = cantidad * origen.coeficiente;
  const cantidadConvertida = cantidadEnBase / destino.coeficiente;

  return cantidadConvertida;
}

/**
 * Obtiene el tipo de una unidad
 * @param {number} unidadId - ID de la unidad
 * @returns {string} Tipo de unidad ('unidad', 'volumen', 'peso', 'longitud')
 */
async function obtenerTipo(unidadId) {
  const db = await getDb();
  const unidad = await db.get('SELECT tipo FROM unidades WHERE id = ?', [unidadId]);
  return unidad?.tipo || null;
}

/**
 * Verifica si dos unidades son del mismo tipo
 * @param {number} unidadId1 - ID de la primera unidad
 * @param {number} unidadId2 - ID de la segunda unidad
 * @returns {boolean} true si son del mismo tipo
 */
async function mismoTipo(unidadId1, unidadId2) {
  const tipo1 = await obtenerTipo(unidadId1);
  const tipo2 = await obtenerTipo(unidadId2);
  return tipo1 && tipo2 && tipo1 === tipo2;
}

/**
 * Obtiene la unidad base para un tipo dado
 * @param {string} tipo - Tipo de unidad ('unidad', 'volumen', 'peso', 'longitud')
 * @returns {Object|null} Unidad base
 */
async function getUnidadBase(tipo) {
  const bases = await obtenerUnidadesBase();
  return bases.find(u => u.tipo === tipo && u.es_base === 1) || null;
}

module.exports = {
  obtenerUnidadesBase,
  obtenerUnidades,
  obtenerUnidad,
  obtenerCoeficienteConversion,
  convertir,
  obtenerTipo,
  mismoTipo,
  getUnidadBase
};