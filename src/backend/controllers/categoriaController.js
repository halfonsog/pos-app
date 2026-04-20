const { getDb } = require('../models/db');

const categoriaController = {

  // GET /api/categorias
  listar: async (req, res, next) => {
    console.log('en listar categorias');
    try {
      const db = await getDb();

      const categorias = await db.all(`
                SELECT * FROM categorias 
                WHERE activo = 1 
                ORDER BY nombre
            `);

      res.json(categorias);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/categorias/:id
  obtener: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      const categoria = await db.get(
        'SELECT * FROM categorias WHERE id = ?',
        [id]
      );

      if (!categoria) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      res.json(categoria);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/categorias
  crear: async (req, res, next) => {
    try {
      const db = await getDb();
      const { nombre, descripcion } = req.body;

      if (!nombre) {
        return res.status(400).json({ error: 'El nombre es requerido' });
      }

      // Verificar si ya existe
      const existing = await db.get(
        'SELECT id FROM categorias WHERE nombre = ?',
        [nombre]
      );

      if (existing) {
        return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
      }

      const result = await db.run(
        'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
        [nombre, descripcion || null]
      );

      res.status(201).json({
        id: result.lastID,
        nombre,
        descripcion,
        message: 'Categoría creada exitosamente'
      });

    } catch (error) {
      next(error);
    }
  },

  // PUT /api/categorias/:id
  actualizar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { nombre, descripcion, activo } = req.body;

      await db.run(
        'UPDATE categorias SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?',
        [nombre, descripcion, activo !== false ? 1 : 0, id]
      );

      res.json({ message: 'Categoría actualizada exitosamente' });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/categorias/:id
  eliminar: async (req, res, next) => {
    try {
      const db = await getDb();
      const { id } = req.params;

      // Verificar si tiene productos asociados
      const productos = await db.get(
        'SELECT COUNT(*) as count FROM productos WHERE categoria_id = ?',
        [id]
      );

      if (productos.count > 0) {
        return res.status(400).json({
          error: 'No se puede eliminar: Hay productos asociados a esta categoría'
        });
      }

      await db.run('DELETE FROM categorias WHERE id = ?', [id]);

      res.json({ message: 'Categoría eliminada exitosamente' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = categoriaController;