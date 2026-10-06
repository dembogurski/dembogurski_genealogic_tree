-- Banco de dados do Encontro da Família Dembogurski.
-- Execute uma vez em um banco MariaDB/MySQL criado previamente.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS pessoas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  sobrenome VARCHAR(150) NOT NULL DEFAULT 'Dembogurski',
  sexo ENUM('M', 'F', 'Outro', 'Nao informado') NOT NULL DEFAULT 'Nao informado',
  ramo TINYINT UNSIGNED NOT NULL DEFAULT 0,
  data_nascimento DATE NULL,
  data_falecimento DATE NULL,
  cidade VARCHAR(160) NULL,
  observacoes TEXT NULL,
  padre_id INT UNSIGNED NULL,
  madre_id INT UNSIGNED NULL,
  conyuge_actual_id INT UNSIGNED NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  foto_url VARCHAR(255) NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pessoas_ramo (ramo),
  KEY idx_pessoas_nome (sobrenome, nome),
  KEY idx_pessoas_pai (padre_id),
  KEY idx_pessoas_mae (madre_id),
  KEY idx_pessoas_location (latitude, longitude),
  CONSTRAINT fk_pessoas_pai FOREIGN KEY (padre_id) REFERENCES pessoas(id) ON DELETE SET NULL,
  CONSTRAINT fk_pessoas_mae FOREIGN KEY (madre_id) REFERENCES pessoas(id) ON DELETE SET NULL,
  CONSTRAINT fk_pessoas_conjuge FOREIGN KEY (conyuge_actual_id) REFERENCES pessoas(id) ON DELETE SET NULL,
  CONSTRAINT chk_pessoas_ramo CHECK (ramo BETWEEN 0 AND 5),
  CONSTRAINT chk_pessoas_pais CHECK (padre_id IS NULL OR madre_id IS NULL OR padre_id <> madre_id),
  CONSTRAINT chk_pessoas_conjuge CHECK (conyuge_actual_id IS NULL OR conyuge_actual_id <> id),
  CONSTRAINT chk_pessoas_coords_pair CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL)),
  CONSTRAINT chk_pessoas_latitude CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_pessoas_longitude CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A tabela precisa existir antes dos relacionamentos circulares serem definidos.
INSERT IGNORE INTO pessoas (id, nome, sobrenome, sexo, ramo, conyuge_actual_id)
VALUES
  (1, 'Matias', 'Dembogurski', 'M', 0, NULL),
  (2, 'Sophia', 'Dembogurski', 'F', 0, NULL);

INSERT IGNORE INTO pessoas (id, nome, sobrenome, sexo, ramo, padre_id, madre_id)
VALUES
  (3, 'Miguel', 'Dembogurski', 'M', 1, 1, 2),
  (4, 'Pedro', 'Dembogurski', 'M', 2, 1, 2),
  (5, 'João', 'Dembogurski', 'M', 3, 1, 2),
  (6, 'Maria', 'Dembogurski', 'F', 4, 1, 2),
  (7, 'Júlia', 'Dembogurski', 'F', 5, 1, 2);

UPDATE pessoas SET conyuge_actual_id = 2 WHERE id = 1 AND conyuge_actual_id IS NULL;
UPDATE pessoas SET conyuge_actual_id = 1 WHERE id = 2 AND conyuge_actual_id IS NULL;

ALTER TABLE pessoas AUTO_INCREMENT = 8;