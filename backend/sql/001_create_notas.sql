CREATE TABLE IF NOT EXISTS notas (
  id_nota SERIAL PRIMARY KEY,
  id_cliente INT NOT NULL REFERENCES clientes(id_cliente) ON DELETE CASCADE,
  id_usuario INT NULL,
  contenido TEXT NOT NULL,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notas_cliente ON notas(id_cliente);
CREATE INDEX IF NOT EXISTS idx_notas_fecha ON notas(creada_en DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'id_usuario'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'fk_notas_usuario'
    ) THEN
      ALTER TABLE notas
        ADD CONSTRAINT fk_notas_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;
