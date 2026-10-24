-- Retira exclusivamente las personas ficticias del simulacro del 2026-10-09.
-- No ejecutar el script de inserción otra vez: agregaría otro juego de datos.
USE familia_dembogurski;
DELIMITER $$
CREATE PROCEDURE codex_retirar_simulacro_20261009()
BEGIN
  IF EXISTS (
    SELECT 1 FROM pessoas real_person JOIN pessoas demo
    ON (real_person.padre_id = demo.id OR real_person.madre_id = demo.id
        OR real_person.conyuge_actual_id = demo.id)
    WHERE demo.observacoes = 'SIMULACRO-2026-10-09-codex'
      AND COALESCE(real_person.observacoes, '') <> 'SIMULACRO-2026-10-09-codex'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hay personas ajenas al simulacro vinculadas a los datos de prueba. Revisar antes de retirar.';
  END IF;
  DELETE FROM pessoas WHERE observacoes = 'SIMULACRO-2026-10-09-codex';
END$$
DELIMITER ;
CALL codex_retirar_simulacro_20261009();
DROP PROCEDURE codex_retirar_simulacro_20261009;
