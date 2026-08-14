-- 034 — Arqueo de caja persistido al cerrar turno (B14)
-- Detalle del conteo por denominaciones de cada turno cerrado (auditoría).

CREATE TABLE arqueos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  turno_id INTEGER NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  valor REAL NOT NULL,
  cantidad REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_arqueos_turno ON arqueos(turno_id);